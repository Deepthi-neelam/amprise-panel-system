/**
 * AMPRISE PANELS - Component Database Routes
 * CRUD operations for components
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/components
 * @desc    Get all components with optional filtering
 */
router.get('/components', authenticateToken, async (req, res) => {
    try {
        const { category, brand } = req.query;
        const db = req.app.locals.db;
        
        let query = 'SELECT * FROM components';
        const params = [];
        
        if (category || brand) {
            query += ' WHERE';
            if (category) {
                query += ' category = ?';
                params.push(category);
            }
            if (brand) {
                if (category) query += ' AND';
                query += ' brand = ?';
                params.push(brand);
            }
        }
        
        query += ' ORDER BY category, name';
        
        const components = await db.all(query, params);
        res.json(components);
        
    } catch (error) {
        console.error('Get components error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/components/:id
 * @desc    Get component by ID
 */
router.get('/components/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;
        
        const component = await db.get(
            'SELECT * FROM components WHERE id = ?',
            [id]
        );
        
        if (!component) {
            return res.status(404).json({ error: 'Component not found' });
        }
        
        res.json(component);
        
    } catch (error) {
        console.error('Get component error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/components
 * @desc    Add new component (admin/engineer)
 */
router.post('/components', authenticateToken, authorize(['admin', 'engineer']), async (req, res) => {
    try {
        const { 
            component_code, name, category, brand, 
            specifications, unit_price, stock_unit 
        } = req.body;
        
        const db = req.app.locals.db;
        
        // Check if component code exists
        const existing = await db.get(
            'SELECT id FROM components WHERE component_code = ?',
            [component_code]
        );
        
        if (existing) {
            return res.status(400).json({ error: 'Component code already exists' });
        }
        
        const result = await db.run(
            `INSERT INTO components 
             (component_code, name, category, brand, specifications, unit_price, stock_unit) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [component_code, name, category, brand, specifications, unit_price, stock_unit]
        );
        
        res.status(201).json({
            success: true,
            message: 'Component added successfully',
            componentId: result.lastID
        });
        
    } catch (error) {
        console.error('Add component error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   PUT /api/components/:id
 * @desc    Update component (admin/engineer)
 */
router.put('/components/:id', authenticateToken, authorize(['admin', 'engineer']), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, category, brand, specifications, 
            unit_price, stock_unit 
        } = req.body;
        
        const db = req.app.locals.db;
        
        await db.run(
            `UPDATE components 
             SET name = ?, category = ?, brand = ?, 
                 specifications = ?, unit_price = ?, 
                 stock_unit = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, category, brand, specifications, unit_price, stock_unit, id]
        );
        
        res.json({
            success: true,
            message: 'Component updated successfully'
        });
        
    } catch (error) {
        console.error('Update component error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   DELETE /api/components/:id
 * @desc    Delete component (admin only)
 */
router.delete('/components/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;
        
        await db.run('DELETE FROM components WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Component deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete component error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/categories
 * @desc    Get all component categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const categories = await db.all(
            'SELECT DISTINCT category FROM components WHERE category IS NOT NULL ORDER BY category'
        );
        
        res.json(categories.map(c => c.category));
        
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;