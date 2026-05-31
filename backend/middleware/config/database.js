
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

let db = null;

function getDatabase() {
    if (db) return db;

    const dbPath = process.env.DB_PATH || './database/amdox_erp.db';
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    seedAdminUser();

    console.log(`Database connected: ${dbPath}`);
    return db;
}

function initializeSchema() {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    try {
        db.exec(schema);
        console.log('Database schema initialized');
    } catch (err) {
        if (!err.message.includes('already exists')) {
            console.error(`Schema error: ${err.message}`);
        } else {
            console.log('Database schema already up to date');
        }
    }
}

function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}

function seedAdminUser() {
    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@amdox.in');
        if (!existing) {
            const passwordHash = bcrypt.hashSync('12345', 12);
            db.prepare(`
                INSERT INTO users (id, email, password_hash, full_name, provider, role, is_verified, is_active)
                VALUES (?, ?, ?, ?, 'local', 'super_admin', 1, 1)
            `).run('admin-seed-001', 'admin@amdox.in', passwordHash, 'Amdox Admin');
            console.log('Admin user (admin@amdox.in) seeded successfully.');
        } else {
            console.log('Admin user already exists.');
        }
    } catch (err) {
        console.error('Failed to seed admin user:', err.message);
    }
}

module.exports = { getDatabase, closeDatabase };
