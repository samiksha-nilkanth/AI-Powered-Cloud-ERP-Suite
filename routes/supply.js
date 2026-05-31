const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
router.get('/items', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { category, stock, search } = req.query;
        let query = 'SELECT * FROM inventory_items WHERE 1=1';
        const params = [];
        if (category) { query += ' AND category = ?'; params.push(category); }
        if (stock === 'low') query += ' AND quantity <= reorder_level';
        if (search) { query += ' AND (name LIKE ? OR sku LIKE ? OR supplier LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY name ASC';
        res.json({ success: true, data: db.prepare(query).all(...params) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/items', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { name, sku, category, quantity, reorder_level, unit_price, supplier, location } = req.body;
        if (!name || !sku || !category) return res.status(400).json({ success: false, error: 'Name, SKU and category required' });
        const id = uuidv4();
        db.prepare('INSERT INTO inventory_items (id,name,sku,category,quantity,reorder_level,unit_price,supplier,location) VALUES (?,?,?,?,?,?,?,?,?)')
            .run(id, name, sku, category, parseInt(quantity)||0, parseInt(reorder_level)||10, parseFloat(unit_price)||0, supplier||null, location||null);
        res.status(201).json({ success: true, data: db.prepare('SELECT * FROM inventory_items WHERE id=?').get(id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/items/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { name, category, quantity, reorder_level, unit_price, supplier, location } = req.body;
        db.prepare('UPDATE inventory_items SET name=COALESCE(?,name),category=COALESCE(?,category),quantity=COALESCE(?,quantity),reorder_level=COALESCE(?,reorder_level),unit_price=COALESCE(?,unit_price),supplier=COALESCE(?,supplier),location=COALESCE(?,location) WHERE id=?')
            .run(name, category, quantity!=null?parseInt(quantity):null, reorder_level!=null?parseInt(reorder_level):null, unit_price!=null?parseFloat(unit_price):null, supplier, location, req.params.id);
        res.json({ success: true, data: db.prepare('SELECT * FROM inventory_items WHERE id=?').get(req.params.id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/items/:id', authenticate, (req, res) => {
    try {
        getDatabase().prepare('DELETE FROM inventory_items WHERE id=?').run(req.params.id);
        res.json({ success: true, message: 'Item deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/summary', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const total = db.prepare("SELECT COUNT(*) as c FROM inventory_items").get().c;
        const lowStock = db.prepare("SELECT COUNT(*) as c FROM inventory_items WHERE quantity <= reorder_level").get().c;
        const totalValue = db.prepare("SELECT COALESCE(SUM(quantity * unit_price),0) as v FROM inventory_items").get().v;
        const categories = db.prepare("SELECT DISTINCT category FROM inventory_items ORDER BY category").all();
        res.json({ success: true, data: { totalItems: total, lowStockAlerts: lowStock, totalValue, categories: categories.map(c=>c.category) } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
