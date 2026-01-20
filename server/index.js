// server/index.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_key_uwu";

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);
app.use(express.json());

// ----------------------------------------------------
// DATABASE SETUP (POSTGRESQL)
// ----------------------------------------------------

const connectionString = process.env.DATABASE_URL;

// Debug
if (!connectionString) {
  console.error("DATABASE_URL is not set in environment variables.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

pool
  .query("SELECT NOW()")
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// ----------------------------------------------------
// AUTHENTICATION SETUP
// ----------------------------------------------------

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403); // Forbidden
    req.user = user;
    next();
  });
};

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// === 1. USER AUTHENTICATION ===
app.post("/api/register", async (req, res) => {
  const { username, password, fullName, faculty, year, series, groupName } =
    req.body;

  try {
    const checkGroup = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE faculty = $1 AND group_name = $2",
      [faculty, groupName],
    );
    const isFirstUser = parseInt(checkGroup.rows[0].count) === 0;

    // Hash the password before storing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertQuery = `
            INSERT INTO users (username, password_hash, full_name, faculty, study_year, series, group_name, is_group_admin) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
        `;

    const result = await pool.query(insertQuery, [
      username,
      passwordHash,
      fullName,
      faculty,
      year,
      series,
      groupName,
      isFirstUser,
    ]);

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: result.rows[0].id,
        username: username,
        role: isFirstUser ? "ADMIN" : "STUDENT",
        groupName: groupName,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      success: true,
      token: token,
      user: {
        username: username,
        role: isFirstUser ? "ADMIN" : "STUDENT",
        groupName: groupName,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      res.status(400).json({ error: "Username already taken" });
    } else {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Secure password comparison
    let isMatch = await bcrypt.compare(password, user.password_hash);

    // If not matched, check for legacy plain text password and migrate
    if (!isMatch && password === user.password_hash) {
      console.log(`Migrating user ${username} to hashed password.`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        hashedPassword,
        user.id,
      ]);
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.is_group_admin ? "ADMIN" : "STUDENT",
        groupName: user.group_name,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.is_group_admin ? "ADMIN" : "STUDENT",
        groupName: user.group_name,
        faculty: user.faculty,
        year: user.study_year,
        series: user.series,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === 2. ANNOUNCEMENTS ===
app.get("/api/announcements", async (req, res) => {
  const { faculty } = req.query;
  try {
    const query = `
            SELECT announcements.*, users.full_name as author_name 
            FROM announcements 
            JOIN users ON announcements.posted_by = users.id 
            WHERE target_group IS NULL OR target_group = $1 
            ORDER BY created_at DESC
        `;
    const result = await pool.query(query, [faculty]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/announcements", async (req, res) => {
  const { title, content, posted_by, target_group } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO announcements (title, content, posted_by, target_group) VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, content, posted_by, target_group],
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === 3. CLASS SCHEDULE ===
app.get("/api/schedule", async (req, res) => {
  const { groupName, weekType } = req.query;
  try {
    let query;
    let params = [groupName];

    // FIX: If Frontend asks for 'everything', return ALL classes for this group
    if (weekType === "everything") {
      query = `SELECT * FROM class_schedule WHERE target_group = $1`;
    } else {
      // Original strict filtering (only used if we want a specific week view)
      query = `
                SELECT * FROM class_schedule 
                WHERE target_group = $1 
                AND (specific_date IS NOT NULL OR (week_type = 'all' OR week_type = $2))
            `;
      params.push(weekType);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/schedule", async (req, res) => {
  const {
    course_name,
    day_of_week,
    start_time,
    end_time,
    location,
    week_type,
    specific_date,
    has_assignment,
    assignment_details,
    is_cancelled,
    target_group,
    created_by,
    semester,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO class_schedule (course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by,semester) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        course_name,
        day_of_week,
        start_time,
        end_time,
        location,
        week_type,
        specific_date,
        has_assignment,
        assignment_details,
        is_cancelled,
        target_group,
        created_by,
        semester || 1,
      ],
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === 4. ASSIGNMENTS ===
app.get("/api/deadlines", async (req, res) => {
  const { groupName } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM assignments WHERE target_group = $1 AND due_date >= NOW() ORDER BY due_date ASC`,
      [groupName],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/assignments", async (req, res) => {
  const {
    course_name,
    title,
    description,
    due_date,
    target_group,
    created_by,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO assignments (course_name, title, description, due_date, target_group, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [course_name, title, description, due_date, target_group, created_by],
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === 5. CHAT ===
app.get("/api/messages", async (req, res) => {
  const { scope, target } = req.query;
  try {
    const query = `
            SELECT cm.*, u.username 
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE scope = $1 AND target = $2
            ORDER BY cm.created_at ASC
        `;
    const result = await pool.query(query, [scope, target]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === DELETE ROUTES (Corrected - Postgres Version) ===
app.delete("/api/schedule/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM class_schedule WHERE id = $1",
      [id],
    );
    if (result.rowCount > 0) res.json({ success: true });
    else res.status(404).json({ error: "Item not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/assignments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM assignments WHERE id = $1", [
      id,
    ]);
    if (result.rowCount > 0) res.json({ success: true });
    else res.status(404).json({ error: "Item not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SOCKET.IO SETUP
// ----------------------------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const query = `
                INSERT INTO chat_messages (sender_id, sender_name, content, scope, target)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
      const result = await pool.query(query, [
        data.sender_id,
        data.sender_name,
        data.content,
        data.scope,
        data.target,
      ]);

      const messageToBroadcast = {
        ...data,
        id: result.rows[0].id,
        created_at: new Date().toISOString(),
      };

      io.to(data.room_id).emit("receive_message", messageToBroadcast);
    } catch (err) {
      console.error("Socket DB Error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// === SERVE REACT FRONTEND (Production Only) ===
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../build", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Student Board Server (Postgres) running on port ${PORT}`);
});
