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
