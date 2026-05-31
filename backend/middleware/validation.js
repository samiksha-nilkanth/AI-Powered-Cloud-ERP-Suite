
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}


function isStrongPassword(password) {
    return password.length >= 8;
}


function validateRegistration(req, res, next) {
    const { email, password, fullName, phone } = req.body;
    const errors = [];

    if (!fullName || fullName.trim().length < 2) {
        errors.push('Full name must be at least 2 characters');
    }

    if (!email || !isValidEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!password || !isStrongPassword(password)) {
        errors.push('Password must be at least 8 characters');
    }

    if (phone && !isValidPhone(phone)) {
        errors.push('Invalid phone number format');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
            code: 'VALIDATION_ERROR'
        });
    }

    
    req.body.email = email.toLowerCase().trim();
    req.body.fullName = fullName.trim();
    if (phone) req.body.phone = phone.replace(/[\s\-()]/g, '');

    next();
}


function validateLogin(req, res, next) {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !isValidEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
            code: 'VALIDATION_ERROR'
        });
    }

    req.body.email = email.toLowerCase().trim();
    next();
}

function validatePhone(req, res, next) {
    const { phone } = req.body;

    if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({
            success: false,
            error: 'Valid phone number is required (e.g., +919876543210)',
            code: 'VALIDATION_ERROR'
        });
    }

    req.body.phone = phone.replace(/[\s\-()]/g, '');
    next();
}


function validateOTP(req, res, next) {
    const { phone, code } = req.body;

    if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({
            success: false,
            error: 'Valid phone number is required',
            code: 'VALIDATION_ERROR'
        });
    }

    if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
            success: false,
            error: 'Valid 6-digit OTP code is required',
            code: 'VALIDATION_ERROR'
        });
    }

    req.body.phone = phone.replace(/[\s\-()]/g, '');
    next();
}

module.exports = {
    validateRegistration,
    validateLogin,
    validatePhone,
    validateOTP
};
