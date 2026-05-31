
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const authService = require('../services/authService');

router.get('/profile', authenticate, (req, res) => {
    try {
        const user = authService.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            code: 'PROFILE_ERROR'
        });
    }
});

router.get('/dashboard', authenticate, (req, res) => {
    res.json({
        success: true,
        data: {
            message: 'Welcome to Amdox ERP Dashboard',
            modules: [
                { id: 'dashboard', name: 'Dashboard', icon: '🏠', status: 'active', url: 'dashboard.html', desc: 'General Overview & Management' },
                { id: 'hr', name: 'HR & Payroll', icon: '👥', status: 'active', url: 'hr.html', desc: 'Human Resources & Compensation' },
                { id: 'finance', name: 'Financial Ledger', icon: '💰', status: 'active', url: 'finance.html', desc: 'Ledger, AP/AR & Accounting' },
                { id: 'scm', name: 'Supply Chain', icon: '📦', status: 'active', url: 'supply.html', desc: 'Inventory, Vendors & Logistics' },
                { id: 'project', name: 'Project Management', icon: '📋', status: 'active', url: 'projects.html', desc: 'Resource Allocation & Tracking' },
                { id: 'ai', name: 'AI Forecast', icon: '📈', status: 'active', url: 'forecast.html', desc: 'Predictive Demand Planning' },
                { id: 'bi', name: 'Analytics', icon: '📉', status: 'active', url: 'analytics.html', desc: 'Business Intelligence & Reports' }
            ]
        }
    });
});

module.exports = router;
