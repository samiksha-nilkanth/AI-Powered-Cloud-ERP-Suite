
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { getDatabase, closeDatabase } = require('./config/database');
const { cleanupExpiredSessions } = require('./services/tokenService');
const { cleanupExpiredOTPs } = require('./services/otpService');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));


app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (process.env.NODE_ENV !== 'production' || duration > 300) {
            console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});


getDatabase();


app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/supply', require('./routes/supply'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/analytics', require('./routes/analytics'));


app.get('/health/live', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('SELECT 1').get();
        res.json({ status: 'ready', database: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'not_ready', database: 'disconnected' });
    }
});

app.get('/health/db', (req, res) => {
    try {
        const db = getDatabase();
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        res.json({ status: 'ok', tables: tables.map(t => t.name) });
    } catch (err) {
        res.status(503).json({ status: 'error', message: err.message });
    }
});


app.get('/', (req, res) => {
    res.json({
        name: 'Amdox ERP Suite API',
        version: '1.0.0',
        status: 'running',
        docs: '/api-docs',
        health: '/health/live',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                google: 'POST /api/auth/google',
                sendOTP: 'POST /api/auth/phone/send-otp',
                verifyOTP: 'POST /api/auth/phone/verify-otp',
                refresh: 'POST /api/auth/refresh',
                logout: 'POST /api/auth/logout'
            },
            user: {
                profile: 'GET /api/user/profile',
                dashboard: 'GET /api/user/dashboard'
            }
        }
    });
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        code: 'INTERNAL_ERROR'
    });
});


app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND'
    });
});


setInterval(() => {
    cleanupExpiredSessions();
    cleanupExpiredOTPs();
}, 60 * 60 * 1000); 


app.listen(PORT, () => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  🚀 AMDOX ERP Suite API`);
    console.log(`  📡 Server running on http://localhost:${PORT}`);
    console.log(`  🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📋 API docs: http://localhost:${PORT}/`);
    console.log(`  💚 Health: http://localhost:${PORT}/health/live`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});


process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down...');
    closeDatabase();
    process.exit(0);
});

module.exports = app;
