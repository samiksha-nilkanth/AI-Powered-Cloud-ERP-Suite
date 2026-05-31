
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'amdox-erp-dev-access';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'amdox-erp-dev-refresh';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function generateTokenPair(user, ipAddress, userAgent) {
    const db = getDatabase();

    
    const accessPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        type: 'access'
    };

    
    const sessionId = uuidv4();
    const refreshPayload = {
        sub: user.id,
        sid: sessionId,
        type: 'refresh'
    };

    const accessToken = jwt.sign(accessPayload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
    const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    
    const stmt = db.prepare(`
        INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, user.id, refreshToken, ipAddress || '', userAgent || '', expiresAt.toISOString());

    return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_EXPIRY
    };
}


function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_SECRET);
    } catch (err) {
        return null;
    }
}


function refreshTokenPair(refreshToken, ipAddress, userAgent) {
    const db = getDatabase();

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

        const session = db.prepare(`
            SELECT * FROM sessions 
            WHERE id = ? AND refresh_token = ? AND is_revoked = 0 AND expires_at > datetime('now')
        `).get(decoded.sid, refreshToken);

        if (!session) {
            return null;
        }

        
        db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(session.id);

        
        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(session.user_id);
        if (!user) return null;

        
        return generateTokenPair(user, ipAddress, userAgent);

    } catch (err) {
        return null;
    }
}

function revokeAllSessions(userId) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);
}

function revokeSession(refreshToken) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE refresh_token = ?').run(refreshToken);
}

function cleanupExpiredSessions() {
    const db = getDatabase();
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now') OR is_revoked = 1").run();
}

module.exports = {
    generateTokenPair,
    verifyAccessToken,
    refreshTokenPair,
    revokeAllSessions,
    revokeSession,
    cleanupExpiredSessions
};
