/**
 * AMPRISE PANELS - BOM Generation Engine
 * Professional BOM generation with database integration
 */

const { calculateBOM, calculateCosts } = require('./calculator');

/**
 * Generate BOM from database components
 */
async function generateBOMFromDatabase(db, panelTypeId, feederCount, motorCount, panelSize, busbarType, brandPreference, ipRating) {
    try {
        // Get panel type details
        const panel = await db.get('SELECT * FROM panel_types WHERE id = ?', [panelTypeId]);
        
        if (!panel) {
            throw new Error('Panel type not found');
        }
        
        // Get BOM rules for this panel type
        const rules = await db.all(`
            SELECT br.*, c.component_code, c.name, c.category, c.brand, c.specifications, c.unit_price, c.stock_unit
            FROM bom_rules br
            JOIN components c ON br.component_id = c.id
            WHERE br.panel_type_id = ?
        `, [panelTypeId]);
        
        const bomItems = [];
        
        // Process each rule
        for (const rule of rules) {
            let quantity = rule.default_quantity;
            
            if (rule.quantity_rule === 'per_feeder') {
                quantity = feederCount * rule.default_quantity;
            } else if (rule.quantity_rule === 'per_motor') {
                quantity = motorCount * rule.default_quantity;
            } else if (rule.quantity_rule === 'per_capacitor') {
                quantity = Math.ceil(feederCount / 2) * rule.default_quantity;
            }
            
            bomItems.push({
                component_id: rule.component_id,
                component_code: rule.component_code,
                name: rule.name,
                category: rule.category,
                brand: brandPreference || rule.brand,
                specifications: rule.specifications,
                quantity: quantity,
                unit_price: rule.unit_price,
                unit: rule.stock_unit
            });
        }
        
        // Add common components
        await addCommonComponentsFromDB(db, bomItems, panelSize, ipRating, feederCount, motorCount);
        
        return bomItems;
        
    } catch (error) {
        console.error('BOM Generation Error:', error);
        throw error;
    }
}

/**
 * Add common components from database
 */
async function addCommonComponentsFromDB(db, bomItems, panelSize, ipRating, feederCount, motorCount) {
    try {
        // Get terminal blocks
        const terminalBlocks = await db.get('SELECT * FROM components WHERE component_code = ?', ['TB-10']);
        if (terminalBlocks) {
            const quantity = (feederCount * 6) + (motorCount * 8) + 20;
            bomItems.push({
                component_id: terminalBlocks.id,
                component_code: terminalBlocks.component_code,
                name: terminalBlocks.name,
                category: terminalBlocks.category,
                brand: terminalBlocks.brand,
                specifications: terminalBlocks.specifications,
                quantity: quantity,
                unit_price: terminalBlocks.unit_price,
                unit: terminalBlocks.stock_unit
            });
        }
        
        // Get wires
        let wireCode = 'WIRE-1.5';
        if (panelSize === '1600x1700x600') {
            wireCode = 'WIRE-2.5';
        } else if (panelSize === '2100x2900x1000') {
            wireCode = 'WIRE-4.0';
        }
        
        const powerWire = await db.get('SELECT * FROM components WHERE component_code = ?', [wireCode]);
        if (powerWire) {
            const wiringLength = 150 + (feederCount * 10) + (motorCount * 15);
            bomItems.push({
                component_id: powerWire.id,
                component_code: powerWire.component_code,
                name: powerWire.name,
                category: powerWire.category,
                brand: powerWire.brand,
                specifications: powerWire.specifications,
                quantity: wiringLength,
                unit_price: powerWire.unit_price,
                unit: powerWire.stock_unit
            });
        }
        
        // Get control wire
        const controlWire = await db.get('SELECT * FROM components WHERE component_code = ?', ['WIRE-1.5']);
        if (controlWire) {
            const controlWiringLength = 50 + (feederCount * 5) + (motorCount * 10);
            bomItems.push({
                component_id: controlWire.id,
                component_code: controlWire.component_code,
                name: controlWire.name,
                category: controlWire.category,
                brand: controlWire.brand,
                specifications: controlWire.specifications,
                quantity: controlWiringLength,
                unit_price: controlWire.unit_price,
                unit: controlWire.stock_unit
            });
        }
        
        // Get indication lamps
        const lamps = await db.get('SELECT * FROM components WHERE component_code = ?', ['LAMP-LED']);
        if (lamps) {
            const lampCount = 6 + Math.ceil(feederCount/4) + motorCount;
            bomItems.push({
                component_id: lamps.id,
                component_code: lamps.component_code,
                name: lamps.name,
                category: lamps.category,
                brand: lamps.brand,
                specifications: lamps.specifications,
                quantity: lampCount,
                unit_price: lamps.unit_price,
                unit: lamps.stock_unit
            });
        }
        
        // Get push buttons
        const pushButtons = await db.get('SELECT * FROM components WHERE component_code = ?', ['PB-22']);
        if (pushButtons) {
            const pbCount = motorCount * 2 + 2;
            bomItems.push({
                component_id: pushButtons.id,
                component_code: pushButtons.component_code,
                name: pushButtons.name,
                category: pushButtons.category,
                brand: pushButtons.brand,
                specifications: pushButtons.specifications,
                quantity: pbCount,
                unit_price: pushButtons.unit_price,
                unit: pushButtons.stock_unit
            });
        }
        
    } catch (error) {
        console.error('Error adding common components:', error);
    }
}

module.exports = {
    generateBOMFromDatabase,
    calculateCosts
};