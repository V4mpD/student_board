import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {v4 as uuid} from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

let todos = [];

app.get("/api/todos", (req, res) => {res.json(todos)});

app.post("/api/todos",
        (req, res) => {
            const {title} = req.body;
            const todo = {
                id: uuid(),
                title: title,
                completed: false,
                createdAt: Date.now()
            };
            todos.push(todo);
            res.status(201).json(todo);
        }
);

app.delete("/api/todos/:id",
    (req, res) => {
        const id = req.params;
        todos = todos.filter((t) => t.id != id);
        res.status(204).send();
    }
);

app.listen(5000, () => console.log("App started on port 5000 ..."));

app.post('/api/register', async (req, res) => {
    const { username, password, fullName, college, year, series, groupName } = req.body;

    // 1. Check if ANY user already exists in this specific group
    const checkGroupQuery = db.prepare(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE college = ? AND group_name = ?
    `);
    
    const result = checkGroupQuery.get(college, groupName);
    
    // 2. Determine Role: If count is 0, this user becomes the Admin (is_group_admin = 1)
    const isFirstUser = result.count === 0;

    // 3. Insert the new user
    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, college, study_year, series, group_name, is_group_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        // Note: In production, hash the password with bcrypt!
        const info = insertUser.run(username, password, fullName, college, year, series, groupName, isFirstUser ? 1 : 0);
        
        res.json({
            success: true,
            userId: info.lastInsertRowid,
            role: isFirstUser ? 'ADMIN' : 'STUDENT',
            message: isFirstUser 
                ? "Account created. You are the first user, so you are the Group Admin." 
                : "Account created. You have joined as a Student."
        });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: "Username already taken" });
        }
        res.status(500).json({ error: err.message });
    }
});

// API: Grant Admin Rights (Only for existing Admins)
app.post('/api/promote-user', (req, res) => {
    const { currentUserId, targetUserId } = req.body;

    // 1. Verify the requester is actually an admin
    const requester = db.prepare('SELECT is_group_admin, group_name FROM users WHERE id = ?').get(currentUserId);
    
    if (!requester || requester.is_group_admin !== 1) {
        return res.status(403).json({ error: "Unauthorized. Only admins can promote users." });
    }

    // 2. Verify the target is in the same group
    const target = db.prepare('SELECT group_name FROM users WHERE id = ?').get(targetUserId);

    if (requester.group_name !== target.group_name) {
        return res.status(400).json({ error: "You can only promote users in your own group." });
    }

    // 3. Update the target user
    const updateRole = db.prepare('UPDATE users SET is_group_admin = 1 WHERE id = ?');
    updateRole.run(targetUserId);

    res.json({ success: true, message: "User promoted to Admin." });
});
