
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const otpService = require('../services/otpService');
const tokenService = require('../services/tokenService');
const { validateRegistration, validateLogin, validatePhone, validateOTP } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        const user = await authService.registerWithEmail({ email, password, fullName, phone });
        const tokens = tokenService.generateTokenPair(user, req.ip, req.headers['user-agent']);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user,
                ...tokens
            }
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message,
            code: 'REGISTRATION_FAILED'
        });
    }
});

router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await authService.loginWithEmail(email, password);
        const tokens = tokenService.generateTokenPair(user, req.ip, req.headers['user-agent']);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                ...tokens
            }
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            error: err.message,
            code: 'LOGIN_FAILED'
        });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { credential, profile } = req.body;

        let googleProfile;

        if (profile) {
            
            googleProfile = {
                id: profile.sub || profile.id,
                email: profile.email,
                name: profile.name,
                picture: profile.picture
            };
        } else if (credential) {
            
            
            const parts = credential.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                googleProfile = {
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture
                };
            } else {
                throw new Error('Invalid Google credential');
            }
        } else {
            throw new Error('Google credential or profile is required');
        }

        if (!googleProfile.email) {
            throw new Error('Email is required from Google account');
        }

        const user = authService.handleGoogleAuth(googleProfile);
        const tokens = tokenService.generateTokenPair(user, req.ip, req.headers['user-agent']);

        res.json({
            success: true,
            message: 'Google login successful',
            data: {
                user,
                ...tokens
            }
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message,
            code: 'GOOGLE_AUTH_FAILED'
        });
    }
});

router.post('/phone/send-otp', validatePhone, async (req, res) => {
    try {
        const { phone } = req.body;
        const result = await otpService.sendOTP(phone);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                expiresIn: result.expiresIn,
                
                ...(result.devOtp ? { devOtp: result.devOtp } : {})
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to send OTP. Please try again.',
            code: 'OTP_SEND_FAILED'
        });
    }
});

router.post('/phone/verify-otp', validateOTP, async (req, res) => {
    try {
        const { phone, code } = req.body;

        const verification = otpService.verifyOTP(phone, code);
        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                error: verification.error,
                code: 'OTP_INVALID'
            });
        }

        
        const { user, isNewUser } = authService.handlePhoneAuth(phone);
        const tokens = tokenService.generateTokenPair(user, req.ip, req.headers['user-agent']);

        res.json({
            success: true,
            message: isNewUser ? 'Account created successfully' : 'Login successful',
            data: {
                user,
                isNewUser,
                ...tokens
            }
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message,
            code: 'PHONE_AUTH_FAILED'
        });
    }
});

router.post('/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required',
                code: 'MISSING_TOKEN'
            });
        }

        const tokens = tokenService.refreshTokenPair(refreshToken, req.ip, req.headers['user-agent']);

        if (!tokens) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token',
                code: 'TOKEN_EXPIRED'
            });
        }

        res.json({
            success: true,
            message: 'Token refreshed',
            data: tokens
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            error: 'Token refresh failed',
            code: 'REFRESH_FAILED'
        });
    }
});

router.post('/logout', authenticate, (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            tokenService.revokeSession(refreshToken);
        } else {
            
            tokenService.revokeAllSessions(req.user.id);
        }

        authService.logAudit(req.user.id, 'USER_LOGOUT');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            code: 'LOGOUT_FAILED'
        });
    }
});

module.exports = router;
