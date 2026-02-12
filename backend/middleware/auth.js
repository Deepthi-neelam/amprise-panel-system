const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'amprise-panel-secret-key-2024-industrial-grade';

/**
 * Verify JWT Token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ 
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(403).json({ 
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
};

/**
 * Role-Based Access Control
 * @param {Array|String} allowedRoles - Array or single role allowed
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_AUTH'
            });
        }
        
        // Convert single role to array
        if (typeof allowedRoles === 'string') {
            allowedRoles = [allowedRoles];
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Access denied. Insufficient permissions.',
                code: 'INSUFFICIENT_ROLE',
                required: allowedRoles,
                current: req.user.role
            });
        }
        
        next();
    };
};

module.exports = {
    authenticateToken,
    authorize,
    JWT_SECRET
};
