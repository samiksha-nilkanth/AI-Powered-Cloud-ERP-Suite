
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');

const SALT_ROUNDS = 12;

async function registerWithEmail({ email, password, fullName, phone }) {
    const db = getDatabase();

    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        throw new Error('An account with this email already exists');
    }

    
    if (phone) {
        const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
        if (existingPhone) {
            throw new Error('An account with this phone number already exists');
        }
    }

    
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    
    const userId = uuidv4();
    const stmt = db.prepare(`
        INSERT INTO users (id, email, phone, password_hash, full_name, provider, is_verified)
        VALUES (?, ?, ?, ?, ?, 'local', 0)
    `);
    stmt.run(userId, email, phone || null, passwordHash, fullName);

    
    logAudit(userId, 'USER_REGISTERED', { provider: 'local', email });

    return getUserById(userId);
}

async function loginWithEmail(email, password) {
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    if (user.provider !== 'local') {
        throw new Error(`This account uses ${user.provider} login. Please use that method instead.`);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        throw new Error('Invalid email or password');
    }

    
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    
    logAudit(user.id, 'USER_LOGIN', { provider: 'local' });

    return sanitizeUser(user);
}

function handleGoogleAuth(googleProfile) {
    const db = getDatabase();

    
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleProfile.id);

    if (user) {
        
        db.prepare(`
            UPDATE users SET 
                last_login_at = CURRENT_TIMESTAMP,
                avatar_url = ?,
                full_name = ?
            WHERE id = ?
        `).run(googleProfile.picture || null, googleProfile.name, user.id);

        logAudit(user.id, 'USER_LOGIN', { provider: 'google' });
        return sanitizeUser({ ...user, avatar_url: googleProfile.picture, full_name: googleProfile.name });
    }

    
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(googleProfile.email);
    if (user) {
        
        db.prepare(`
            UPDATE users SET 
                google_id = ?, 
                avatar_url = COALESCE(avatar_url, ?),
                is_verified = 1,
                last_login_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(googleProfile.id, googleProfile.picture || null, user.id);

        logAudit(user.id, 'GOOGLE_ACCOUNT_LINKED', { google_id: googleProfile.id });
        return sanitizeUser({ ...user, google_id: googleProfile.id, is_verified: 1 });
    }

    
    const userId = uuidv4();
    db.prepare(`
        INSERT INTO users (id, email, full_name, provider, google_id, avatar_url, is_verified)
        VALUES (?, ?, ?, 'google', ?, ?, 1)
    `).run(userId, googleProfile.email, googleProfile.name, googleProfile.id, googleProfile.picture || null);

    logAudit(userId, 'USER_REGISTERED', { provider: 'google' });
    return getUserById(userId);
}

function handlePhoneAuth(phone) {
    const db = getDatabase();

    
    let user = db.prepare('SELECT * FROM users WHERE phone = ? AND is_active = 1').get(phone);

    if (user) {
        
        db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
        logAudit(user.id, 'USER_LOGIN', { provider: 'phone' });
        return { user: sanitizeUser(user), isNewUser: false };
    }

    
    const userId = uuidv4();
    db.prepare(`
        INSERT INTO users (id, phone, full_name, provider, is_verified)
        VALUES (?, ?, ?, 'phone', 1)
    `).run(userId, phone, `User ${phone.slice(-4)}`, 'phone');

    logAudit(userId, 'USER_REGISTERED', { provider: 'phone' });
    user = getUserById(userId);
    return { user, isNewUser: true };
}

function getUserById(userId) {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId);
    return user ? sanitizeUser(user) : null;
}

function sanitizeUser(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
}

function logAudit(userId, action, details = {}, ipAddress = '', userAgent = '') {
    const db = getDatabase();
    db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, action, JSON.stringify(details), ipAddress, userAgent);
}

module.exports = {
    registerWithEmail,
    loginWithEmail,
    handleGoogleAuth,
    handlePhoneAuth,
    getUserById,
    logAudit
};
