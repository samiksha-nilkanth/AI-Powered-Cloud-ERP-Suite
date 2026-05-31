const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
router.get('/transactions', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { type, category, search } = req.query;
        let query = 'SELECT * FROM transactions WHERE 1=1';
        const params = [];
        if (type) { query += ' AND type = ?'; params.push(type); }
        if (category) { query += ' AND category = ?'; params.push(category); }
        if (search) { query += ' AND (description LIKE ? OR category LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        query += ' ORDER BY date DESC, created_at DESC';
        const transactions = db.prepare(query).all(...params);
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.post('/transactions', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { type, category, description, amount, date } = req.body;
        if (!type || !category || !description || !amount || !date) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        const id = uuidv4();
        db.prepare('INSERT INTO transactions (id, type, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)').run(id, type, category, description, parseFloat(amount), date);
        const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
        res.status(201).json({ success: true, data: txn });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.delete('/transactions/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Transaction deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.get('/summary', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const income = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income'").get();
        const expenses = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense'").get();
        const count = db.prepare("SELECT COUNT(*) as count FROM transactions").get();
        const categories = db.prepare("SELECT DISTINCT category FROM transactions ORDER BY category").all();
        res.json({
            success: true,
            data: {
                totalIncome: income.total,
                totalExpenses: expenses.total,
                netBalance: income.total - expenses.total,
                transactionCount: count.count,
                categories: categories.map(c => c.category)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
module.exports = router;
