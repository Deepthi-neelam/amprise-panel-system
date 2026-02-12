/**
 * AMPRISE PANELS - Quotation Management Routes
 * Create, Read, Update, Delete quotations
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const generateQuotationPDF = require('../templates/quotation-template');

/**
 * @route   POST /api/quotations
 * @desc    Create new quotation
 */
router.post('/quotations', authenticateToken, async (req, res) => {
    try {
        const {
            customerName, customerAddress, customerPhone,
            customerEmail, gstNumber,
            panelType, panelName, panelSize, busbarType,
            brandPreference, incomingSupply, ipRating,
            feederCount, motorCount, specialRequirements,
            bomItems, costBreakdown
        } = req.body;

        const db = req.app.locals.db;

        // Get panel type ID
        const panelTypeResult = await db.get(
            'SELECT id FROM panel_types WHERE panel_code = ? OR name LIKE ?',
            [panelType, `%${panelType}%`]
        );

        const panelTypeId = panelTypeResult ? panelTypeResult.id : null;

        // Generate quotation number
        const now = new Date();
        const year = now.getFullYear();
        
        // Get last quotation number for this year
        const lastQuotation = await db.get(
            `SELECT quotation_number FROM quotations 
             WHERE quotation_number LIKE ? 
             ORDER BY id DESC LIMIT 1`,
            [`${year}/QUO/%`]
        );

        let counter = 1;
        if (lastQuotation) {
            const parts = lastQuotation.quotation_number.split('/');
            if (parts.length === 3) {
                counter = parseInt(parts[2]) + 1;
            }
        }

        const quotationNumber = `${year}/QUO/${counter.toString().padStart(3, '0')}`;

        // Calculate totals
        let totalMaterialCost = 0;
        bomItems.forEach(item => {
            totalMaterialCost += (item.quantity || 0) * (item.unit_price || 0);
        });

        const totalProductionCost = costBreakdown?.productionCost || totalMaterialCost * 1.43;
        const profitMargin = costBreakdown?.profitMargin || 20;
        const gstPercentage = costBreakdown?.gstPercentage || 18;
        const finalAmount = costBreakdown?.finalAmount || 
            (totalProductionCost * (1 + profitMargin/100) * (1 + gstPercentage/100));

        // Insert quotation
        const result = await db.run(
            `INSERT INTO quotations (
                quotation_number, customer_name, customer_address, 
                customer_email, customer_phone, gst_number,
                panel_type_id, panel_size, busbar_type,
                brand_preference, incoming_supply, ip_rating,
                number_of_feeders, motor_count, special_requirements,
                total_material_cost, total_production_cost, 
                profit_margin, gst_percentage, final_amount,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                quotationNumber, customerName, customerAddress,
                customerEmail || '', customerPhone || '', gstNumber || '',
                panelTypeId, panelSize, busbarType,
                brandPreference, incomingSupply, ipRating,
                feederCount || 0, motorCount || 0, specialRequirements || '',
                totalMaterialCost, totalProductionCost,
                profitMargin, gstPercentage, finalAmount,
                req.user.id
            ]
        );

        const quotationId = result.lastID;

        // Insert quotation items
        for (const item of bomItems) {
            await db.run(
                `INSERT INTO quotation_items (
                    quotation_id, component_id, quantity,
                    unit_price, total_price
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    quotationId,
                    item.component_id || null,
                    item.quantity || 1,
                    item.unit_price || 0,
                    (item.quantity || 0) * (item.unit_price || 0)
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Quotation created successfully',
            quotationId,
            quotationNumber
        });

    } catch (error) {
        console.error('Create quotation error:', error);
        res.status(500).json({ 
            error: 'Failed to create quotation',
            details: error.message 
        });
    }
});

/**
 * @route   GET /api/quotations
 * @desc    Get all quotations for current user
 */
router.get('/quotations', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        let query = `
            SELECT q.*, pt.name as panel_type_name, u.full_name as created_by_name
            FROM quotations q
            LEFT JOIN panel_types pt ON q.panel_type_id = pt.id
            LEFT JOIN users u ON q.created_by = u.id
        `;
        
        // Non-admin users see only their own quotations
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            query += ' WHERE q.created_by = ?';
        }
        
        query += ' ORDER BY q.created_at DESC LIMIT 100';
        
        const params = (req.user.role !== 'admin' && req.user.role !== 'manager') ? [req.user.id] : [];
        
        const quotations = await db.all(query, params);
        res.json(quotations);
        
    } catch (error) {
        console.error('Get quotations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/quotations/:id
 * @desc    Get quotation by ID with items
 */
router.get('/quotations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;
        
        // Get quotation
        const quotation = await db.get(`
            SELECT q.*, pt.name as panel_type_name, u.full_name as created_by_name
            FROM quotations q
            LEFT JOIN panel_types pt ON q.panel_type_id = pt.id
            LEFT JOIN users u ON q.created_by = u.id
            WHERE q.id = ?
        `, [id]);
        
        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
            quotation.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get quotation items
        const items = await db.all(`
            SELECT qi.*, c.component_code, c.name, c.category, c.brand, c.specifications
            FROM quotation_items qi
            LEFT JOIN components c ON qi.component_id = c.id
            WHERE qi.quotation_id = ?
            ORDER BY qi.id
        `, [id]);
        
        res.json({
            ...quotation,
            items
        });
        
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   PUT /api/quotations/:id/status
 * @desc    Update quotation status
 */
router.put('/quotations/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = req.app.locals.db;
        
        // Check if quotation exists
        const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
        
        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }
        
        // Update status
        await db.run(
            'UPDATE quotations SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.json({
            success: true,
            message: 'Quotation status updated successfully'
        });
        
    } catch (error) {
        console.error('Update quotation status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/quotations/:id/pdf
 * @desc    Generate PDF for quotation
 */
router.get('/quotations/:id/pdf', async (req, res) => {
    try {
        // Get token from query parameter
        const token = req.query.token || req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }
        
        // Verify token
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            
            try {
                const { id } = req.params;
                const db = req.app.locals.db;
                
                // Get quotation
                const quotation = await db.get(`
                    SELECT q.*, pt.name as panel_type_name, u.full_name as created_by_name
                    FROM quotations q
                    LEFT JOIN panel_types pt ON q.panel_type_id = pt.id
                    LEFT JOIN users u ON q.created_by = u.id
                    WHERE q.id = ?
                `, [id]);
                
                if (!quotation) {
                    return res.status(404).json({ error: 'Quotation not found' });
                }
                
                // Get quotation items
                const items = await db.all(`
                    SELECT qi.*, c.component_code, c.name, c.category, c.brand, c.specifications, c.stock_unit
                    FROM quotation_items qi
                    LEFT JOIN components c ON qi.component_id = c.id
                    WHERE qi.quotation_id = ?
                    ORDER BY c.category, qi.id
                `, [id]);
                
                // Generate PDF
                generateQuotationPDF(quotation, items, res);
                
            } catch (error) {
                console.error('PDF generation error:', error);
                res.status(500).json({ error: 'Failed to generate PDF' });
            }
        });
        
    } catch (error) {
        console.error('PDF route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   DELETE /api/quotations/:id
 * @desc    Delete quotation (admin only)
 */
router.delete('/quotations/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;
        
        await db.run('DELETE FROM quotations WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Quotation deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete quotation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;