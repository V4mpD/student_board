-- database/init.sql

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    
    -- Academic Grouping
    college TEXT NOT NULL,
    study_year INTEGER,
    series TEXT,
    group_name TEXT NOT NULL,
    
    -- Permissions
    is_group_admin BOOLEAN DEFAULT 0
);

-- 2. Class Schedule Table
CREATE TABLE IF NOT EXISTS class_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    week_type TEXT CHECK(week_type IN ('all', 'odd', 'even')) DEFAULT 'all',
    specific_date DATE,
    
    -- Assignment Tracking
    has_assignment BOOLEAN DEFAULT 0,
    assignment_details TEXT,
    
    -- Targeting
    target_college TEXT,
    target_group TEXT,
    
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

-- 3. Announcements Table (THIS WAS MISSING)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    posted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    target_group TEXT, -- e.g., "Year 1", "Series B"
    FOREIGN KEY(posted_by) REFERENCES users(id)
);