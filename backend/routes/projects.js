const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
router.get('/', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { status, priority, search } = req.query;
        let query = 'SELECT * FROM projects WHERE 1=1';
        const params = [];
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (priority) { query += ' AND priority = ?'; params.push(priority); }
        if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        query += ' ORDER BY created_at DESC';
        const projects = db.prepare(query).all(...params);
        projects.forEach(p => {
            const tasks = db.prepare('SELECT status, COUNT(*) as c FROM tasks WHERE project_id=? GROUP BY status').all(p.id);
            p.taskCounts = { total: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
            tasks.forEach(t => { p.taskCounts[t.status] = t.c; p.taskCounts.total += t.c; });
        });
        res.json({ success: true, data: projects });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { name, description, status, priority, start_date, end_date, budget } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Project name required' });
        const id = uuidv4();
        db.prepare('INSERT INTO projects (id,name,description,status,priority,start_date,end_date,budget) VALUES (?,?,?,?,?,?,?,?)')
            .run(id, name, description||null, status||'planning', priority||'medium', start_date||null, end_date||null, parseFloat(budget)||0);
        res.status(201).json({ success: true, data: db.prepare('SELECT * FROM projects WHERE id=?').get(id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { name, description, status, priority, start_date, end_date, budget, progress } = req.body;
        db.prepare('UPDATE projects SET name=COALESCE(?,name),description=COALESCE(?,description),status=COALESCE(?,status),priority=COALESCE(?,priority),start_date=COALESCE(?,start_date),end_date=COALESCE(?,end_date),budget=COALESCE(?,budget),progress=COALESCE(?,progress) WHERE id=?')
            .run(name, description, status, priority, start_date, end_date, budget!=null?parseFloat(budget):null, progress!=null?parseInt(progress):null, req.params.id);
        res.json({ success: true, data: db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM tasks WHERE project_id=?').run(req.params.id);
        db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/:id/tasks', authenticate, (req, res) => {
    try {
        res.json({ success: true, data: getDatabase().prepare('SELECT * FROM tasks WHERE project_id=? ORDER BY created_at DESC').all(req.params.id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/:id/tasks', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { title, description, status, priority, assignee, due_date } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'Task title required' });
        const id = uuidv4();
        db.prepare('INSERT INTO tasks (id,project_id,title,description,status,priority,assignee,due_date) VALUES (?,?,?,?,?,?,?,?)')
            .run(id, req.params.id, title, description||null, status||'todo', priority||'medium', assignee||null, due_date||null);
        res.status(201).json({ success: true, data: db.prepare('SELECT * FROM tasks WHERE id=?').get(id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/tasks/:taskId', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { title, status, priority, assignee, due_date } = req.body;
        db.prepare('UPDATE tasks SET title=COALESCE(?,title),status=COALESCE(?,status),priority=COALESCE(?,priority),assignee=COALESCE(?,assignee),due_date=COALESCE(?,due_date) WHERE id=?')
            .run(title, status, priority, assignee, due_date, req.params.taskId);
        res.json({ success: true, data: db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.taskId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/tasks/:taskId', authenticate, (req, res) => {
    try {
        getDatabase().prepare('DELETE FROM tasks WHERE id=?').run(req.params.taskId);
        res.json({ success: true, message: 'Task deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/data/summary', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const total = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
        const active = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='active'").get().c;
        const completed = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='completed'").get().c;
        const totalTasks = db.prepare("SELECT COUNT(*) as c FROM tasks").get().c;
        const totalBudget = db.prepare("SELECT COALESCE(SUM(budget),0) as b FROM projects").get().b;
        res.json({ success: true, data: { total, active, completed, planning: total-active-completed, totalTasks, totalBudget } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
