// server/index.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // <--- ADDED THIS MISSING IMPORT

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// DATABASE SETUP (POSTGRESQL)
// ----------------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err) => {
    if (err) console.error('Connection error', err.stack);
    else console.log('Connected to PostgreSQL successfully');
});

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// === 1. USER AUTHENTICATION ===
app.post('/api/register', async (req, res) => {
    const { username, password, fullName, faculty, year, series, groupName } = req.body;
    
    try {
        const checkGroup = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE faculty = $1 AND group_name = $2', 
            [faculty, groupName]
        );
        const isFirstUser = parseInt(checkGroup.rows[0].count) === 0;

        const insertQuery = `
            INSERT INTO users (username, password_hash, full_name, faculty, study_year, series, group_name, is_group_admin) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
        `;

        const result = await pool.query(insertQuery, [
            username, password, fullName, faculty, year, series, groupName, isFirstUser
        ]);

        res.json({ 
            success: true, 
            userId: result.rows[0].id, 
            role: isFirstUser ? 'ADMIN' : 'STUDENT', 
            groupName: groupName 
        });

    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: "Username already taken" });
        } else {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password_hash = $2', 
            [username, password]
        );
        
        const user = result.rows[0];

        if (user) {
            res.json({
                success: true,
                user: {
                    id: user.id, username: user.username, role: user.is_group_admin ? 'ADMIN' : 'STUDENT',
                    faculty: user.faculty, groupName: user.group_name, year: user.study_year, series: user.series
                }
            });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 2. ANNOUNCEMENTS ===
app.get('/api/announcements', async (req, res) => {
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

app.post('/api/announcements', async (req, res) => {
    const { title, content, posted_by, target_group } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO announcements (title, content, posted_by, target_group) VALUES ($1, $2, $3, $4) RETURNING id`,
            [title, content, posted_by, target_group]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 3. CLASS SCHEDULE ===
app.get('/api/schedule', async (req, res) => {
    const { groupName, weekType } = req.query;
    try {
        const query = `
            SELECT * FROM class_schedule 
            WHERE target_group = $1 
            AND (specific_date IS NOT NULL OR (week_type = 'all' OR week_type = $2))
        `;
        const result = await pool.query(query, [groupName, weekType]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', async (req, res) => {
    const { course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO class_schedule (course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
            [course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 4. ASSIGNMENTS ===
app.get('/api/deadlines', async (req, res) => {
    const { groupName } = req.query;
    try {
        const result = await pool.query(
            `SELECT * FROM assignments WHERE target_group = $1 AND due_date >= NOW() ORDER BY due_date ASC`,
            [groupName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assignments', async (req, res) => {
    const { course_name, title, description, due_date, target_group, created_by } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO assignments (course_name, title, description, due_date, target_group, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [course_name, title, description, due_date, target_group, created_by]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 5. CHAT ===
app.get('/api/messages', async (req, res) => {
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
app.delete('/api/schedule/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM class_schedule WHERE id = $1', [id]);
        if (result.rowCount > 0) res.json({ success: true });
        else res.status(404).json({ error: "Item not found" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assignments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
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
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const query = `
                INSERT INTO chat_messages (sender_id, sender_name, content, scope, target)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            const result = await pool.query(query, [
                data.sender_id, data.sender_name, data.content, data.scope, data.target
            ]);

            const messageToBroadcast = {
                ...data,
                id: result.rows[0].id,
                created_at: new Date().toISOString()
            };

            io.to(data.room_id).emit('receive_message', messageToBroadcast);
        } catch (err) {
            console.error("Socket DB Error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

// === SERVE REACT FRONTEND (Production Only) ===
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../build')));

    app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
}

server.listen(PORT, () => {
    console.log(`Student Board Server (Postgres) running on port ${PORT}`);
});