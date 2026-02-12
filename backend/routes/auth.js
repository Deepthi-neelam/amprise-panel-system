/**
 * AMPRISE PANELS - Authentication Routes
 * Login, Register, Profile Management
 */
// At the VERY TOP of auth.js, add this import:
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { authenticateToken, authorize, JWT_SECRET } = require('../middleware/auth');

/**
 * @route   POST /api/login
 * @desc    Authenticate user and return token
 */
router.post('/login', [
    body('username').notEmpty().trim().escape(),
    body('password').notEmpty()
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { username, password } = req.body;
        const db = req.app.locals.db;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not initialized' });
        }
        
        // Find user
        const user = await db.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                full_name: user.full_name
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        // Update last login (would need a last_login column)
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/register
 * @desc    Register new user (admin only)
 */
router.post('/register', 
    authenticateToken,
    authorize(['admin']),
    [
        body('username').isLength({ min: 3 }).trim().escape(),
        body('password').isLength({ min: 6 }),
        body('role').isIn(['admin', 'engineer', 'sales', 'manager']),
        body('full_name').notEmpty().trim().escape(),
        body('email').isEmail().normalizeEmail()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        try {
            const { username, password, role, full_name, email } = req.body;
            const db = req.app.locals.db;
            
            // Check if user exists
            const existingUser = await db.get(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
            
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Insert user
            const result = await db.run(
                `INSERT INTO users (username, password, role, full_name, email) 
                 VALUES (?, ?, ?, ?, ?)`,
                [username, hashedPassword, role, full_name, email]
            );
            
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                userId: result.lastID
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const user = await db.get(
            'SELECT id, username, role, full_name, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;    
