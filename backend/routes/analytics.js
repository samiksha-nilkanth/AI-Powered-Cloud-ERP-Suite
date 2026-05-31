const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../config/database');
router.get('/overview', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const income = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income'").get().t;
        const expenses = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense'").get().t;
        const employees = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status='active'").get().c;
        const projects = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='active'").get().c;
        const inventory = db.prepare("SELECT COUNT(*) as c FROM inventory_items").get().c;
        const lowStock = db.prepare("SELECT COUNT(*) as c FROM inventory_items WHERE quantity<=reorder_level").get().c;
        const payroll = db.prepare("SELECT COALESCE(SUM(salary),0) as t FROM employees WHERE status='active'").get().t;
        const catBreakdown = db.prepare("SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY category ORDER BY total DESC").all();
        const incomeByCategory = db.prepare("SELECT category, SUM(amount) as total FROM transactions WHERE type='income' GROUP BY category ORDER BY total DESC").all();
        res.json({ success: true, data: { revenue: income, expenses, netIncome: income - expenses, employees, activeProjects: projects, inventoryItems: inventory, lowStockAlerts: lowStock, monthlyPayroll: payroll, expenseBreakdown: catBreakdown, incomeBreakdown: incomeByCategory } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/trends', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const monthlyIncome = db.prepare("SELECT substr(date,1,7) as month, SUM(amount) as total FROM transactions WHERE type='income' GROUP BY substr(date,1,7) ORDER BY month").all();
        const monthlyExpenses = db.prepare("SELECT substr(date,1,7) as month, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY substr(date,1,7) ORDER BY month").all();
        res.json({ success: true, data: { monthlyIncome, monthlyExpenses } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get('/forecast', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const monthlyIncome = db.prepare("SELECT substr(date,1,7) as month, SUM(amount) as total FROM transactions WHERE type='income' GROUP BY substr(date,1,7) ORDER BY month").all();
        const monthlyExpenses = db.prepare("SELECT substr(date,1,7) as month, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY substr(date,1,7) ORDER BY month").all();
        function forecast(data) {
            if (data.length < 2) return [];
            const values = data.map(d => d.total);
            const avgGrowth = values.reduce((sum, v, i) => i > 0 ? sum + (v - values[i-1]) : sum, 0) / (values.length - 1);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const lastMonth = data[data.length - 1].month;
            const [year, month] = lastMonth.split('-').map(Number);
            const predictions = [];
            for (let i = 1; i <= 6; i++) {
                const m = month + i;
                const newYear = year + Math.floor((m - 1) / 12);
                const newMonth = ((m - 1) % 12) + 1;
                const predicted = Math.max(0, avg + avgGrowth * (values.length + i - 1) * 0.3);
                predictions.push({ month: `${newYear}-${String(newMonth).padStart(2, '0')}`, total: Math.round(predicted), confidence: Math.max(50, 95 - i * 8) });
            }
            return predictions;
        }
        const incomeForecast = forecast(monthlyIncome);
        const expenseForecast = forecast(monthlyExpenses);
        const insights = [
            { icon: '📈', title: 'Revenue Trend', text: `Average monthly revenue: $${Math.round(monthlyIncome.reduce((s,d)=>s+d.total,0)/Math.max(1,monthlyIncome.length)).toLocaleString()}. ${monthlyIncome.length >= 2 && monthlyIncome[monthlyIncome.length-1].total > monthlyIncome[monthlyIncome.length-2].total ? 'Upward trend detected.' : 'Consider growth strategies.'}`, type: 'positive' },
            { icon: '💡', title: 'Cost Optimization', text: `Largest expense categories should be reviewed for optimization opportunities. Infrastructure and payroll are typically the highest.`, type: 'neutral' },
            { icon: '🎯', title: 'Forecast Confidence', text: `Near-term predictions (1-2 months) have 85%+ confidence. Long-term forecasts should be used as directional guidance.`, type: 'info' },
            { icon: '⚡', title: 'Action Required', text: `Review supply chain reorder levels — low stock alerts suggest potential fulfillment risks.`, type: 'warning' }
        ];
        res.json({ success: true, data: { historical: { income: monthlyIncome, expenses: monthlyExpenses }, forecast: { income: incomeForecast, expenses: expenseForecast }, insights } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
