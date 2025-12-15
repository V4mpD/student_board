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
    const { username, password, fullName, college, year, series, groupName } = req.body;

    const checkGroup = db.prepare('SELECT COUNT(*) as count FROM users WHERE college = ? AND group_name = ?');
    const result = checkGroup.get(college, groupName);
    const isFirstUser = result.count === 0;

    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, college, study_year, series, group_name, is_group_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const info = insertUser.run(username, password, fullName, college, year, series, groupName, isFirstUser ? 1 : 0);
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
                college: user.college,
                groupName: user.group_name
            }
        });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});


// === 2. CLASS SCHEDULE ===

app.get('/api/schedule', (req, res) => {
    const { groupName, date, weekType } = req.query; 

    // Logic: Get items that match the group AND (are specific overrides OR are recurring weekly items)
    const query = `
        SELECT * FROM class_schedule 
        WHERE target_group = ? 
        AND (specific_date = ? OR (specific_date IS NULL AND (week_type = 'all' OR week_type = ?)))
    `;
    
    try {
        const schedule = db.prepare(query).all(groupName, date, weekType);
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', (req, res) => {
    const { 
        course_name, day_of_week, start_time, end_time, location, 
        week_type, specific_date, has_assignment, assignment_details,
        target_group, created_by 
    } = req.body;

    const insert = db.prepare(`
        INSERT INTO class_schedule (
            course_name, day_of_week, start_time, end_time, location, 
            week_type, specific_date, has_assignment, assignment_details,
            target_group, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = insert.run(
            course_name, day_of_week, start_time, end_time, location, 
            week_type, specific_date, has_assignment ? 1 : 0, assignment_details,
            target_group, created_by
        );
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// === 3. ANNOUNCEMENTS (New!) ===

// Get announcements (Filtered by filtering logic from Milestone 1)
app.get('/api/announcements', (req, res) => {
    const { college, year, series } = req.query;
    
    // Simple filter: Get global announcements OR specific ones
    const query = `
        SELECT announcements.*, users.full_name as author_name 
        FROM announcements 
        JOIN users ON announcements.posted_by = users.id
        WHERE target_group IS NULL OR target_group = ? OR target_group = ?
        ORDER BY created_at DESC
    `;

    try {
        // Broad search: Matches "Year 1" or specific series tags
        const posts = db.prepare(query).all(`Year ${year}`, series);
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

// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`Student Board Server running on port ${PORT}`);
});