
const { verifyAccessToken } = require('../services/tokenService');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'TOKEN_INVALID'
        });
    }

    
    req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenant_id
    };

    next();
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
}

module.exports = { authenticate, authorize };
