import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {v4 as uuid} from 'uuid';

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// We use port 5000 to match your previous configuration
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// DATABASE SETUP
// ----------------------------------------------------
// Ensure the database folder exists
const dbFolder = path.join(__dirname, 'database');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}

// Connect to SQLite
const dbPath = path.join(dbFolder, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize Tables (Reads from the init.sql file you created)
const initSqlPath = path.join(dbFolder, 'init.sql');
if (fs.existsSync(initSqlPath)) {
    const initSql = fs.readFileSync(initSqlPath, 'utf-8');
    db.exec(initSql);
} else {
    console.error("ERROR: init.sql not found in database folder!");
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. REGISTER USER (First user in a group becomes Admin)
app.post('/api/register', (req, res) => {
    const { username, password, fullName, college, year, series, groupName } = req.body;

    // Check if ANY user already exists in this specific group
    const checkGroup = db.prepare('SELECT COUNT(*) as count FROM users WHERE college = ? AND group_name = ?');
    const result = checkGroup.get(college, groupName);

    // If count is 0, this is the first user -> Make them ADMIN
    const isFirstUser = result.count === 0;

    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, college, study_year, series, group_name, is_group_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        // In a real app, verify you hash passwords here (e.g., using bcrypt)
        const info = insertUser.run(username, password, fullName, college, year, series, groupName, isFirstUser ? 1 : 0);
        
        res.json({
            success: true,
            userId: info.lastInsertRowid,
            role: isFirstUser ? 'ADMIN' : 'STUDENT',
            message: isFirstUser 
                ? "Account created. You are the Group Admin." 
                : "Account created. You are a Student."
        });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: "Username already taken" });
        }
        res.status(500).json({ error: err.message });
    }
});

// 2. GET SCHEDULE (Supports 'Outlook-style' overrides)
app.get('/api/schedule', (req, res) => {
    // We expect query params: ?groupName=311&date=2025-10-12&weekType=odd
    const { groupName, date, weekType } = req.query; 

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

// 3. ADD CLASS (Admin Only)
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

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`Student Board Server running on port ${PORT}`);
});