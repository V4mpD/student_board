-- database/init.sql

-- 1. Users Table
-- Now includes academic details to identify their "group"
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    
    -- Academic Grouping
    college TEXT NOT NULL,     -- e.g., "FMI", "Politehnica"
    study_year INTEGER,        -- e.g., 1, 2, 3
    series TEXT,               -- e.g., "Series A"
    group_name TEXT NOT NULL,  -- e.g., "311"
    
    -- Permissions
    is_group_admin BOOLEAN DEFAULT 0 -- 1 if they were the first to join this group
);

-- 2. Class Schedule
-- Now linked to specific groups
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
    
    -- Who is this schedule for?
    target_college TEXT,
    target_group TEXT, -- If NULL, applies to whole series/year. If set, applies to "311"
    
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
);