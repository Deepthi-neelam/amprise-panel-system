/**
 * AMPRISE PANELS - Panel Configuration Routes
 * Panel types, BOM rules, component management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { calculateBOM, calculateCosts } = require('../utils/calculator');

/**
 * @route   GET /api/panel-types
 * @desc    Get all active panel types
 */
router.get('/panel-types', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const panels = await db.all(
            'SELECT * FROM panel_types WHERE is_active = 1 ORDER BY name'
        );
        
        res.json(panels);
        
    } catch (error) {
        console.error('Get panel types error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/panel-types/:id
 * @desc    Get panel type by ID with BOM rules
 */
router.get('/panel-types/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;
        
        const panel = await db.get(
            'SELECT * FROM panel_types WHERE id = ?',
            [id]
        );
        
        if (!panel) {
            return res.status(404).json({ error: 'Panel type not found' });
        }
        
        // Get BOM rules for this panel
        const rules = await db.all(`
            SELECT br.*, c.component_code, c.name, c.category, c.brand, 
                   c.specifications, c.unit_price, c.stock_unit
            FROM bom_rules br
            JOIN components c ON br.component_id = c.id
            WHERE br.panel_type_id = ?
        `, [id]);
        
        res.json({
            ...panel,
            bom_rules: rules
        });
        
    } catch (error) {
        console.error('Get panel type error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/panel-types
 * @desc    Create new panel type (admin only)
 */
router.post('/panel-types', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { 
            panel_code, name, description, 
            base_wiring_cost, base_fabrication_cost, 
            base_labor_cost, profit_margin 
        } = req.body;
        
        const db = req.app.locals.db;
        
        const result = await db.run(
            `INSERT INTO panel_types 
             (panel_code, name, description, base_wiring_cost, base_fabrication_cost, base_labor_cost, profit_margin) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [panel_code, name, description, base_wiring_cost, base_fabrication_cost, base_labor_cost, profit_margin || 20]
        );
        
        res.status(201).json({
            success: true,
            message: 'Panel type created successfully',
            panelId: result.lastID
        });
        
    } catch (error) {
        console.error('Create panel type error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/generate-estimation
 * @desc    Generate BOM and cost estimation
 */
router.post('/generate-estimation', authenticateToken, async (req, res) => {
    try {
        const { 
            panelType, feederCount, motorCount, panelSize, 
            busbarType, brandPreference, ipRating,
            panelLevels, customComponents 
        } = req.body;
        
        // Generate BOM
        const bomItems = calculateBOM(
            panelType, 
            parseInt(feederCount) || 4, 
            parseInt(motorCount) || 1, 
            panelSize || '800x800x300',
            busbarType || 'copper',
            brandPreference || 'schneider',
            ipRating || 'IP55',
            panelLevels || [],
            customComponents || []
        );
        
        // Calculate costs
        const costBreakdown = calculateCosts(bomItems);
        
        res.json({
            success: true,
            bomItems,
            costBreakdown
        });
        
    } catch (error) {
        console.error('Generate estimation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate estimation',
            details: error.message 
        });
    }
});

module.exports = router;