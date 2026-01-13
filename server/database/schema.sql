-- database/init.sql

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    
    -- Academic Grouping
    faculty TEXT NOT NULL,     -- e.g., "FMI", "Automatica"
    study_year INTEGER,        -- e.g., 1
    series TEXT,               -- e.g., "Series B"
    group_name TEXT NOT NULL,  -- e.g., "311"
    
    -- Permissions
    is_group_admin BOOLEAN DEFAULT FALSE
);

-- 2. Class Schedule Table (UPDATED)
CREATE TABLE IF NOT EXISTS class_schedule (
    id SERIAL PRIMARY KEY,
    course_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    week_type TEXT CHECK(week_type IN ('all', 'odd', 'even')) DEFAULT 'all',
    specific_date DATE,
    
    -- Assignment Tracking
    has_assignment BOOLEAN DEFAULT FALSE,
    assignment_details TEXT,
    
    -- NEW: Cancellation Flag
    is_cancelled BOOLEAN DEFAULT FALSE,

    -- Targeting
    target_college TEXT,
    target_group TEXT,
    created_by INTEGER REFERENCES users(id)
);

-- 3. Announcements Table (THIS WAS MISSING)
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    posted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_group TEXT
);

-- 4. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- Scope: 'university', 'faculty', or 'group'
    scope TEXT CHECK(scope IN ('university', 'faculty', 'group')) NOT NULL,
    
    -- Target: "MAIN" (for Uni), "FMI" (for Faculty), "311" (for Group)
    target TEXT NOT NULL, 
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Assignments Table (NEW)
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_name TEXT NOT NULL, -- e.g., "Data Structures"
    title TEXT NOT NULL,       -- e.g., "Homework 1"
    description TEXT,          -- e.g., "Upload PDF to Moodle"
    due_date TIMESTAMP NOT NULL, -- Full timestamp: YYYY-MM-DD HH:MM
    
    target_group TEXT,         -- Who is this for?
    created_by INTEGER,
    created_by INTEGER REFERENCES users(id)
    );
