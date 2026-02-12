/**
 * AMPRISE PANELS - Database Initialization
 * FIXED FOR RENDER FREE TIER - Uses DB_PATH from environment
 * FIXED: Preserves existing users, only creates if none exist
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

/**
 * Initialize Database with Complete Schema
 * Uses DB_PATH from environment variables (set in server.js)
 */
async function initializeDatabase() {
    console.log('🔧 AMPRISE PANELS - Database Initialization');
    console.log('============================================');
    
    // ✅ CRITICAL FIX: Use DB_PATH from environment, fallback to local path
    const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'panel-estimation.db');
    console.log(`📁 Database path: ${DB_PATH}`);
    
    try {
        // For in-memory database, skip directory creation
        if (DB_PATH !== ':memory:') {
            // ✅ FIX: Ensure directory exists for the database file
            const dbDir = path.dirname(DB_PATH);
            if (!fs.existsSync(dbDir)) {
                console.log(`📁 Creating directory: ${dbDir}`);
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // ✅ FIX: Check if directory is writable
            try {
                fs.accessSync(dbDir, fs.constants.W_OK);
                console.log('✅ Directory is writable');
            } catch (err) {
                console.error('❌ Directory is NOT writable:', dbDir);
                console.log('⚠️ Falling back to in-memory database');
                process.env.DB_PATH = ':memory:';
                return initializeDatabase(); // Recursive call with memory DB
            }
        }

        // Open database connection
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        console.log('✅ Database connection established');

        // Enable foreign keys and WAL mode (skip for in-memory)
        await db.exec('PRAGMA foreign_keys = ON;');
        if (DB_PATH !== ':memory:') {
            await db.exec('PRAGMA journal_mode = WAL;');
            console.log('✅ WAL mode enabled');
        }

        // ============= CREATE TABLES =============
        console.log('\n📦 Creating tables...');

        // Users table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role TEXT CHECK(role IN ('admin', 'engineer', 'sales', 'manager')) DEFAULT 'engineer',
                full_name VARCHAR(100),
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✓ users table');

        // Components table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS components (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                component_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100),
                brand VARCHAR(100),
                specifications TEXT,
                unit_price DECIMAL(10,2) NOT NULL,
                stock_unit VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  ✓ components table');

        // Panel types table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS panel_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                panel_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                base_wiring_cost DECIMAL(10,2),
                base_fabrication_cost DECIMAL(10,2),
                base_labor_cost DECIMAL(10,2),
                profit_margin DECIMAL(5,2) DEFAULT 20.00,
                is_active BOOLEAN DEFAULT 1
            );
        `);
        console.log('  ✓ panel_types table');

        // BOM rules table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS bom_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                panel_type_id INTEGER,
                component_id INTEGER,
                quantity_rule VARCHAR(100),
                default_quantity INTEGER DEFAULT 1,
                is_mandatory BOOLEAN DEFAULT 1,
                FOREIGN KEY (panel_type_id) REFERENCES panel_types(id) ON DELETE CASCADE,
                FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
            );
        `);
        console.log('  ✓ bom_rules table');

        // Quotations table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS quotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(200) NOT NULL,
                customer_address TEXT,
                customer_email VARCHAR(100),
                customer_phone VARCHAR(20),
                gst_number VARCHAR(50),
                panel_type_id INTEGER,
                panel_size VARCHAR(50),
                busbar_type VARCHAR(50),
                brand_preference VARCHAR(100),
                incoming_supply VARCHAR(50),
                ip_rating VARCHAR(20),
                number_of_feeders INTEGER,
                motor_count INTEGER,
                special_requirements TEXT,
                total_material_cost DECIMAL(12,2),
                total_production_cost DECIMAL(12,2),
                profit_margin DECIMAL(5,2),
                gst_percentage DECIMAL(5,2) DEFAULT 18.00,
                final_amount DECIMAL(12,2),
                status TEXT CHECK(status IN ('draft', 'sent', 'accepted', 'rejected')) DEFAULT 'draft',
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (panel_type_id) REFERENCES panel_types(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        console.log('  ✓ quotations table');

        // Quotation items table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS quotation_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_id INTEGER,
                component_id INTEGER,
                component_name VARCHAR(200),
                component_code VARCHAR(50),
                category VARCHAR(100),
                brand VARCHAR(100),
                specifications TEXT,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                unit VARCHAR(20),
                FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
                FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
            );
        `);
        console.log('  ✓ quotation_items table');

        // ============= INSERT DEFAULT DATA =============
        console.log('\n📊 Checking and inserting default data...');

        // ✅ FIX: DO NOT DELETE USERS! Only create if none exist
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        
        if (userCount.count === 0) {
            console.log('  ⚠️  No users found. Creating default users...');
            
            // Hash password for ALL users - using 'admin123'
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            console.log('  🔐 Using password: admin123 for all users');

            // Insert users
            await db.run(`
                INSERT INTO users (username, password, role, full_name, email) VALUES
                (?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?)
            `, [
                'admin', hashedPassword, 'admin', 'System Administrator', 'admin@amprise.com',
                'engineer', hashedPassword, 'engineer', 'Estimation Engineer', 'engineer@amprise.com',
                'sales', hashedPassword, 'sales', 'Sales Executive', 'sales@amprise.com',
                'manager', hashedPassword, 'manager', 'Operations Manager', 'manager@amprise.com'
            ]);
            console.log('  ✅ Default users created successfully');
            console.log('     ├─ admin / admin123');
            console.log('     ├─ engineer / admin123');
            console.log('     ├─ sales / admin123');
            console.log('     └─ manager / admin123');
        } else {
            console.log(`  ✅ Users already exist (${userCount.count} users found) - preserving existing data`);
            
            // ✅ FIX: Optionally verify admin password and update if needed
            const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
            if (adminUser) {
                try {
                    // Test if password works with 'admin123'
                    const testPassword = await bcrypt.compare('admin123', adminUser.password);
                    if (!testPassword) {
                        console.log('  ⚠️  Admin password is not set to admin123 - updating...');
                        const salt = await bcrypt.genSalt(10);
                        const newHashedPassword = await bcrypt.hash('admin123', salt);
                        await db.run('UPDATE users SET password = ? WHERE username = ?', [newHashedPassword, 'admin']);
                        console.log('  ✅ Admin password updated to admin123');
                    }
                } catch (err) {
                    console.log('  ⚠️  Could not verify admin password');
                }
            }
        }

        // Check if panel types exist
        const panelCount = await db.get('SELECT COUNT(*) as count FROM panel_types');
        
        if (panelCount.count === 0) {
            console.log('  ⚠️  No panel types found. Creating default panel types...');
            
            await db.run(`
                INSERT INTO panel_types (panel_code, name, description, base_wiring_cost, base_fabrication_cost, base_labor_cost, profit_margin) VALUES
                ('MCC', 'MCC Panel', 'Motor Control Center', 15000.00, 20000.00, 10000.00, 20.00),
                ('PCC', 'PCC Panel', 'Power Control Center', 20000.00, 25000.00, 15000.00, 20.00),
                ('LT', 'LT Panel', 'Low Tension Panel', 12000.00, 15000.00, 8000.00, 20.00),
                ('VFD', 'VFD Panel', 'Variable Frequency Drive Panel', 18000.00, 22000.00, 12000.00, 20.00),
                ('APFC', 'APFC Panel', 'Automatic Power Factor Correction', 10000.00, 12000.00, 6000.00, 20.00),
                ('PLC', 'PLC Panel', 'Programmable Logic Controller Panel', 15000.00, 18000.00, 10000.00, 20.00)
            `);
            console.log('  ✅ Default panel types created');
        } else {
            console.log(`  ✅ Panel types already exist (${panelCount.count} types)`);
        }

        // Check if components exist
        const componentCount = await db.get('SELECT COUNT(*) as count FROM components');
        
        if (componentCount.count === 0) {
            console.log('  ⚠️  No components found. Creating default components...');
            
            await db.run(`
                INSERT INTO components (component_code, name, category, brand, specifications, unit_price, stock_unit) VALUES
                ('MCCB-100A', 'MCCB 100A', 'Circuit Breaker', 'Schneider', '100A, 3P, 35kA', 4500.00, 'Pcs'),
                ('MCCB-250A', 'MCCB 250A', 'Circuit Breaker', 'Schneider', '250A, 3P, 35kA', 8500.00, 'Pcs'),
                ('CONT-25A', 'Contactor 25A', 'Contactor', 'ABB', '25A, 3P, AC3', 1800.00, 'Pcs'),
                ('CONT-40A', 'Contactor 40A', 'Contactor', 'ABB', '40A, 3P, AC3', 2500.00, 'Pcs'),
                ('OLR-25A', 'Overload Relay 25A', 'Relay', 'Siemens', '25A, Adjustable', 1200.00, 'Pcs'),
                ('BUS-630A', 'Copper Busbar 630A', 'Busbar', 'Custom', '630A, 6mmx50mm', 500.00, 'Meter'),
                ('CAP-25kVAR', 'Capacitor 25kVAR', 'Capacitor', 'Cromptron', '25kVAR, 440V', 7500.00, 'Pcs'),
                ('PLC-DVP', 'Delta PLC DVP', 'PLC', 'Delta', 'DVP Series, 24V', 15000.00, 'Set'),
                ('SMPS-24V', 'SMPS 24V 10A', 'Power Supply', 'Meanwell', '24V DC, 10A', 3500.00, 'Pcs'),
                ('WIRE-2.5', 'Cable 2.5 Sq.mm', 'Wiring', 'Polycab', '2.5 Sq.mm, FR PVC', 120.00, 'Meter'),
                ('ENCL-IP55', 'Enclosure IP55 600x800', 'Enclosure', 'Amtek', '600x800x200mm, IP55', 8500.00, 'Pcs'),
                ('MCB-32A', 'MCB 32A', 'Circuit Breaker', 'Legrand', '32A, SPN, 10kA', 850.00, 'Pcs'),
                ('MCB-63A', 'MCB 63A', 'Circuit Breaker', 'Schneider', '63A, 3P, 10kA', 3200.00, 'Pcs'),
                ('APFC-CTRL', 'APFC Controller', 'Controller', 'Schneider', 'Digital, 12 Step, RS485', 12000.00, 'Pcs'),
                ('VFD-22KW', 'VFD 22kW', 'Controller', 'ABB', '22kW, 415V, 3P, IP55', 25000.00, 'Pcs'),
                ('TB-10', 'Terminal Block', 'Accessory', 'Phoenix', '10A, 600V, Screw Type', 45.00, 'Pcs'),
                ('LAMP-LED', 'Indication Lamp LED', 'Accessory', 'Legrand', 'LED, 220V, 22mm', 280.00, 'Pcs'),
                ('PB-22', 'Push Button 22mm', 'Accessory', 'Legrand', '22mm, IP55, Red/Green', 320.00, 'Pcs'),
                ('MTR-MULTI', 'Multi-function Meter', 'Meter', 'ABB', '3 Phase, 4 Wire, RS485', 8500.00, 'Pcs'),
                ('CT-SET', 'CT Set (3P+1N)', 'Instrument', 'Standard', '3 Phase + Neutral, 600/5A', 7500.00, 'Set')
            `);
            console.log('  ✅ Default components created');
        } else {
            console.log(`  ✅ Components already exist (${componentCount.count} components)`);
        }

        // Check if BOM rules exist
        const ruleCount = await db.get('SELECT COUNT(*) as count FROM bom_rules');
        
        if (ruleCount.count === 0) {
            console.log('  ⚠️  No BOM rules found. Creating default rules...');
            
            // Get panel IDs
            const panels = await db.all('SELECT id, panel_code FROM panel_types');
            const panelMap = {};
            panels.forEach(p => { panelMap[p.panel_code] = p.id; });
            
            // Get component IDs
            const components = await db.all('SELECT id, component_code FROM components');
            const compMap = {};
            components.forEach(c => { compMap[c.component_code] = c.id; });

            // Insert BOM rules for MCC Panel
            if (panelMap['MCC'] && compMap['MCCB-100A']) {
                await db.run(`
                    INSERT INTO bom_rules (panel_type_id, component_id, quantity_rule, default_quantity, is_mandatory) VALUES
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?)
                `, [
                    panelMap['MCC'], compMap['MCCB-100A'], 'per_feeder', 1, 1,
                    panelMap['MCC'], compMap['CONT-25A'], 'per_feeder', 1, 1,
                    panelMap['MCC'], compMap['OLR-25A'], 'per_feeder', 1, 1,
                    panelMap['MCC'], compMap['BUS-630A'], 'fixed', 5, 1
                ]);
            }
            
            console.log('  ✅ Default BOM rules created');
        } else {
            console.log(`  ✅ BOM rules already exist (${ruleCount.count} rules)`);
        }

        console.log('\n🎉 Database initialization complete!');
        console.log(`📁 Database location: ${DB_PATH}`);
        console.log(`💾 Database mode: ${DB_PATH === ':memory:' ? 'IN-MEMORY' : 'PERSISTENT'}`);
        console.log('============================================\n');
        
        await db.close();
        return true;

    } catch (error) {
        console.error('\n❌ Database initialization failed:');
        console.error(error.message);
        
        // ✅ FIX: Fallback to in-memory database on error
        if (DB_PATH !== ':memory:' && !DB_PATH.includes(':memory:')) {
            console.log('⚠️ Attempting fallback to in-memory database...');
            process.env.DB_PATH = ':memory:';
            return initializeDatabase();
        }
        
        throw error;
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;