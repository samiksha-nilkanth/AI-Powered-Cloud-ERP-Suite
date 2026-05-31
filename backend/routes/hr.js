const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
router.get('/employees', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { department, status, search } = req.query;
        let query = 'SELECT * FROM employees WHERE 1=1';
        const params = [];
        if (department) { query += ' AND department = ?'; params.push(department); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (search) { query += ' AND (full_name LIKE ? OR email LIKE ? OR position LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY full_name ASC';
        res.json({ success: true, data: db.prepare(query).all(...params) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/employees', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { employee_code, full_name, email, phone, department, position, salary, hire_date } = req.body;
        if (!employee_code || !full_name || !email || !department || !position || !hire_date) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }
        const id = uuidv4();
        db.prepare('INSERT INTO employees (id,employee_code,full_name,email,phone,department,position,salary,hire_date) VALUES (?,?,?,?,?,?,?,?,?)')
            .run(id, employee_code, full_name, email, phone || null, department, position, parseFloat(salary) || 0, hire_date);
        res.status(201).json({ success: true, data: db.prepare('SELECT * FROM employees WHERE id=?').get(id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/employees/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { full_name, email, phone, department, position, salary, status } = req.body;
        db.prepare('UPDATE employees SET full_name=COALESCE(?,full_name),email=COALESCE(?,email),phone=COALESCE(?,phone),department=COALESCE(?,department),position=COALESCE(?,position),salary=COALESCE(?,salary),status=COALESCE(?,status) WHERE id=?')
            .run(full_name, email, phone, department, position, salary ? parseFloat(salary) : null, status, req.params.id);
        res.json({ success: true, data: db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/employees/:id', authenticate, (req, res) => {
    try {
        getDatabase().prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
        res.json({ success: true, message: 'Employee deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/summary', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const total = db.prepare("SELECT COUNT(*) as c FROM employees").get().c;
        const active = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status='active'").get().c;
        const depts = db.prepare("SELECT DISTINCT department FROM employees ORDER BY department").all();
        const payroll = db.prepare("SELECT COALESCE(SUM(salary),0) as t FROM employees WHERE status='active'").get().t;
        const deptCounts = db.prepare("SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC").all();
        res.json({ success: true, data: { total, active, onLeave: total - active, departments: depts.map(d => d.department), monthlyPayroll: payroll, departmentBreakdown: deptCounts } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
