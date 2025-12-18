const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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
// API ROUTES
// ----------------------------------------------------

// === 1. USER AUTHENTICATION ===

// Register (First user in group becomes Admin)
app.post('/api/register', (req, res) => {
    const { username, password, fullName, faculty, year, series, groupName } = req.body;

    const checkGroup = db.prepare('SELECT COUNT(*) as count FROM users WHERE faculty = ? AND group_name = ?');
    const result = checkGroup.get(faculty, groupName);
    const isFirstUser = result.count === 0;

    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, faculty, study_year, series, group_name, is_group_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const info = insertUser.run(username, password, fullName, faculty, year, series, groupName, isFirstUser ? 1 : 0);
        res.json({
            success: true,
            userId: info.lastInsertRowid,
            role: isFirstUser ? 'ADMIN' : 'STUDENT',
            groupName: groupName
        });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: "Username already taken" });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Login (Check username & password)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // In production: Use bcrypt.compare() here!
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, password);

    if (user) {
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.is_group_admin ? 'ADMIN' : 'STUDENT',
                faculty: user.faculty,
                groupName: user.group_name
            }
        });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});


// === 2. CLASS SCHEDULE ===

app.get('/api/schedule', (req, res) => {
    const { groupName, weekType } = req.query; 

    // Logic: Get items that match the group AND (are specific overrides OR are recurring weekly items)
    const query = `
        SELECT * FROM class_schedule 
        WHERE target_group = ? 
        AND (specific_date IS NOT NULL OR (week_type = 'all' OR week_type = ?))
    `;
    
    try {
        const schedule = db.prepare(query).all(groupName, weekType);
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', (req, res) => {
    const { 
        course_name, day_of_week, start_time, end_time, location, 
        week_type, specific_date, has_assignment, assignment_details,
        is_cancelled, 
        target_group, created_by 
    } = req.body;

    const insert = db.prepare(`
        INSERT INTO class_schedule (
            course_name, day_of_week, start_time, end_time, location, 
            week_type, specific_date, has_assignment, assignment_details,
            is_cancelled, target_group, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = insert.run(
            course_name, day_of_week, start_time, end_time, location, 
            week_type, specific_date, has_assignment ? 1 : 0, assignment_details,
            is_cancelled ? 1 : 0, 
            target_group, created_by
        );
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// === 3. ANNOUNCEMENTS (New!) ===

app.get('/api/announcements', (req, res) => {
    const { faculty } = req.query;   
    
    // Simple filter: Get global announcements OR specific ones
    const query = `
        SELECT announcements.*, users.full_name as author_name 
        FROM announcements 
        JOIN users ON announcements.posted_by = users.id
        WHERE target_group IS NULL OR target_group = ?
        ORDER BY created_at DESC
    `;

    try {
        const posts = db.prepare(query).all(faculty);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/announcements', (req, res) => {
    const { title, content, posted_by, target_group } = req.body;

    const insert = db.prepare(`
        INSERT INTO announcements (title, content, posted_by, target_group)
        VALUES (?, ?, ?, ?)
    `);

    try {
        const result = insert.run(title, content, posted_by, target_group);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 4. CHAT ===

app.get('/api/chat', (req, res) => {
    const { scope, target } = req.query;
    const query = `
        SELECT * FROM chat_messages 
        WHERE scope = ? AND target = ? 
        ORDER BY created_at 
        ASC LIMIT 100`
    
    try {
        const messages = db.prepare(query).all(scope, target);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', (req, res) => {
    const { sender_id, sender_name, content, scope, target } = req.body;
    const insert = db.prepare(`
        INSERT INTO chat_messages (sender_id, sender_name, content, scope, target) 
        VALUES (?, ?, ?, ?, ?)`
    );

    try {
        const result = insert.run(sender_id, sender_name, content, scope, target);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
    
});

// 5. ASSIGNMENTS / DEADLINES (NEW & SEPARATE)
app.get('/api/deadlines', (req, res) => {
    const { groupName } = req.query;
    // Fetches pure assignments, sorted by due date
    const query = `
        SELECT * FROM assignments 
        WHERE target_group = ? 
        AND due_date >= datetime('now')
        ORDER BY due_date ASC
    `;
    res.json(db.prepare(query).all(groupName));
});

app.post('/api/assignments', (req, res) => {
    const { course_name, title, description, due_date, target_group, created_by } = req.body;
    
    const insert = db.prepare(`
        INSERT INTO assignments (course_name, title, description, due_date, target_group, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    try {
        const result = insert.run(course_name, title, description, due_date, target_group, created_by);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`Student Board Server running on port ${PORT}`);
});