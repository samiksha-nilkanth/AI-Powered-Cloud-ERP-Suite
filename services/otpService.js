
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

function generateOTPCode() {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
}

async function sendOTP(phone) {
    const db = getDatabase();

    
    db.prepare(`
        UPDATE otp_codes SET is_used = 1 
        WHERE phone = ? AND is_used = 0
    `).run(phone);

    
    const code = generateOTPCode();
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    
    db.prepare(`
        INSERT INTO otp_codes (id, phone, code, expires_at)
        VALUES (?, ?, ?, ?)
    `).run(id, phone, code, expiresAt.toISOString());

    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📱 ============================================`);
        console.log(`   OTP for ${phone}: ${code}`);
        console.log(`   Expires in ${OTP_EXPIRY_MINUTES} minutes`);
        console.log(`   ============================================\n`);
        return { success: true, expiresIn: OTP_EXPIRY_MINUTES * 60, devOtp: code };
    } else {
        
        await sendViaTwilio(phone, code);
        return { success: true, expiresIn: OTP_EXPIRY_MINUTES * 60 };
    }
}

function verifyOTP(phone, code) {
    const db = getDatabase();

    const otp = db.prepare(`
        SELECT * FROM otp_codes 
        WHERE phone = ? AND is_used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
    `).get(phone);

    if (!otp) {
        return { valid: false, error: 'No valid OTP found. Please request a new one.' };
    }

    
    if (otp.attempts >= MAX_ATTEMPTS) {
        db.prepare('UPDATE otp_codes SET is_used = 1 WHERE id = ?').run(otp.id);
        return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otp.id);

    if (otp.code !== code) {
        return { valid: false, error: `Invalid OTP. ${MAX_ATTEMPTS - otp.attempts - 1} attempts remaining.` };
    }

    
    db.prepare('UPDATE otp_codes SET is_used = 1 WHERE id = ?').run(otp.id);

    return { valid: true };
}

async function sendViaTwilio(phone, code) {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            console.warn('⚠️  Twilio credentials not configured. OTP not sent.');
            return;
        }

        
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);

        await client.messages.create({
            body: `Your Amdox ERP verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
            from: fromNumber,
            to: phone
        });

        console.log(`✅ OTP sent to ${phone}`);
    } catch (err) {
        console.error(`❌ Failed to send OTP: ${err.message}`);
        throw new Error('Failed to send OTP');
    }
}

function cleanupExpiredOTPs() {
    const db = getDatabase();
    db.prepare("DELETE FROM otp_codes WHERE expires_at < datetime('now')").run();
}

module.exports = {
    sendOTP,
    verifyOTP,
    cleanupExpiredOTPs
};
