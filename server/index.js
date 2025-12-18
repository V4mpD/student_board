// server/index.js
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http'); // 1. Import HTTP
const { Server } = require('socket.io'); // 2. Import Socket.IO

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// DATABASE SETUP
// ----------------------------------------------------
const dbFolder = path.join(__dirname, 'database');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}
const dbPath = path.join(dbFolder, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

const initSqlPath = path.join(dbFolder, 'init.sql');
if (fs.existsSync(initSqlPath)) {
    const initSql = fs.readFileSync(initSqlPath, 'utf-8');
    db.exec(initSql);
} else {
    console.error("ERROR: init.sql not found!");
}

// ----------------------------------------------------
// API ROUTES (REST APIs remain active!)
// ----------------------------------------------------

// === 1. USER AUTHENTICATION ===
app.post('/api/register', (req, res) => {
    const { username, password, fullName, faculty, year, series, groupName } = req.body;
    const checkGroup = db.prepare('SELECT COUNT(*) as count FROM users WHERE faculty = ? AND group_name = ?');
    const result = checkGroup.get(faculty, groupName);
    const isFirstUser = result.count === 0;
    const insertUser = db.prepare(`INSERT INTO users (username, password_hash, full_name, faculty, study_year, series, group_name, is_group_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    try {
        const info = insertUser.run(username, password, fullName, faculty, year, series, groupName, isFirstUser ? 1 : 0);
        res.json({ success: true, userId: info.lastInsertRowid, role: isFirstUser ? 'ADMIN' : 'STUDENT', groupName: groupName });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') res.status(400).json({ error: "Username already taken" });
        else res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, password);
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
});

// === 2. ANNOUNCEMENTS ===
app.get('/api/announcements', (req, res) => {
    const { faculty } = req.query;
    const query = `SELECT announcements.*, users.full_name as author_name FROM announcements JOIN users ON announcements.posted_by = users.id WHERE target_group IS NULL OR target_group = ? ORDER BY created_at DESC`;
    res.json(db.prepare(query).all(faculty));
});
app.post('/api/announcements', (req, res) => {
    const { title, content, posted_by, target_group } = req.body;
    const result = db.prepare(`INSERT INTO announcements (title, content, posted_by, target_group) VALUES (?, ?, ?, ?)`).run(title, content, posted_by, target_group);
    res.json({ success: true, id: result.lastInsertRowid });
});

// === 3. CLASS SCHEDULE ===
app.get('/api/schedule', (req, res) => {
    const { groupName, weekType } = req.query; 
    const query = `SELECT * FROM class_schedule WHERE target_group = ? AND (specific_date IS NOT NULL OR (week_type = 'all' OR week_type = ?))`;
    res.json(db.prepare(query).all(groupName, weekType));
});
app.post('/api/schedule', (req, res) => {
    const { course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by } = req.body;
    const result = db.prepare(`INSERT INTO class_schedule (course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment, assignment_details, is_cancelled, target_group, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(course_name, day_of_week, start_time, end_time, location, week_type, specific_date, has_assignment ? 1 : 0, assignment_details, is_cancelled ? 1 : 0, target_group, created_by);
    res.json({ success: true, id: result.lastInsertRowid });
});

// === 4. ASSIGNMENTS ===
app.get('/api/deadlines', (req, res) => {
    const { groupName } = req.query;
    res.json(db.prepare(`SELECT * FROM assignments WHERE target_group = ? AND due_date >= datetime('now') ORDER BY due_date ASC`).all(groupName));
});
app.post('/api/assignments', (req, res) => {
    const { course_name, title, description, due_date, target_group, created_by } = req.body;
    const result = db.prepare(`INSERT INTO assignments (course_name, title, description, due_date, target_group, created_by) VALUES (?, ?, ?, ?, ?, ?)`).run(course_name, title, description, due_date, target_group, created_by);
    res.json({ success: true, id: result.lastInsertRowid });
});

// === 5. CHAT (HYBRID: REST for History, Sockets for Live) ===

// A. REST Route: Get History (Client calls this when opening a room)
app.get('/api/messages', (req, res) => {
    const { scope, target } = req.query;
    const query = `
        SELECT cm.*, u.username 
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE scope = ? AND target = ?
        ORDER BY cm.created_at ASC
    `;
    res.json(db.prepare(query).all(scope, target));
});

// ----------------------------------------------------
// SOCKET.IO SETUP 
// ----------------------------------------------------

// 1. Create HTTP Server wrapping Express
const server = http.createServer(app);

// 2. Initialize Socket.io on that server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Allow React Frontend
        methods: ["GET", "POST"]
    }
});

// 3. Listen for Connections
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Event: User Joins a specific chat room (e.g., "group_621")
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Event: User Sends a Message
    socket.on('send_message', (data) => {
        // data = { sender_id, sender_name, content, scope, target, room_id }
        
        // A. Save to Database (So it's there when you refresh)
        const insert = db.prepare(`
            INSERT INTO chat_messages (sender_id, sender_name, content, scope, target)
            VALUES (?, ?, ?, ?, ?)
        `);
        const info = insert.run(data.sender_id, data.sender_name, data.content, data.scope, data.target);
        
        // B. Add the Timestamp/ID for the client
        const messageToBroadcast = {
            ...data,
            id: info.lastInsertRowid,
            created_at: new Date().toISOString()
        };

        // C. Broadcast to everyone in that room (including sender)
        // 'io.to(room)' sends to everyone. 'socket.to(room)' sends to everyone EXCEPT sender.
        // We use io.to so the sender sees their own message confirm instantly.
        io.to(data.room_id).emit('receive_message', messageToBroadcast);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

// 4. CHANGE: app.listen -> server.listen
server.listen(PORT, () => {
    console.log(`Student Board Server (HTTP+Socket) running on port ${PORT}`);
});