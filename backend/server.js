/**
 * AMPRISE PANELS - Production Server
 * RENDER FREE TIER OPTIMIZED VERSION
 */

// =================== REQUIRE MODULES ===================
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database initialization
const initializeDatabase = require('./database/init');

// Import routes
const authRoutes = require('./routes/auth');
const panelRoutes = require('./routes/panels');
const componentRoutes = require('./routes/components');
const quotationRoutes = require('./routes/quotations');

// =================== DATABASE PATH CONFIGURATION ===================
// ✅ FIXED FOR RENDER FREE TIER
const IS_RENDER = !!process.env.RENDER;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let DB_PATH;
if (IS_RENDER) {
    // ✅ RENDER FREE TIER - Use /opt/render/project/src (writable directory)
    DB_PATH = path.join('/opt/render/project/src', 'panel-estimation.db');
    console.log(`📁 Render free tier DB path: ${DB_PATH}`);
} else {
    // Local development
    DB_PATH = path.join(__dirname, 'database', 'panel-estimation.db');
    
    // Ensure local database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

// Make DB_PATH available to other modules
process.env.DB_PATH = DB_PATH;

// =================== INITIALIZE EXPRESS APP ===================
const app = express();
const PORT = process.env.PORT || 3000;

// =================== SECURITY MIDDLEWARE ===================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

const corsOptions = {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'file://'],
    credentials: true,
    optionsSuccessStatus: 200
};

// =================== APPLICATION MIDDLEWARE ===================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));
app.use('/api/', limiter);

// =================== DATABASE CONNECTION ===================
let db;

async function startServer() {
    try {
        console.log('\n========================================');
        console.log('   AMPRISE PANELS - ESTIMATION SYSTEM');
        console.log('========================================\n');
        
        // Initialize database
        console.log('📦 Initializing database...');
        console.log(`📁 Database path: ${DB_PATH}`);
        
        // Check if we have write permission
        try {
            if (!IS_RENDER || DB_PATH !== ':memory:') {
                // Test write permission
                fs.accessSync(path.dirname(DB_PATH), fs.constants.W_OK);
                console.log('✅ Directory is writable');
            }
        } catch (err) {
            console.log('⚠️ Directory not writable, using in-memory database');
            DB_PATH = ':memory:';
            process.env.DB_PATH = DB_PATH;
        }
        
        await initializeDatabase();
        
        // Open database connection
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        
        // Enable WAL mode for better concurrency (skip for in-memory)
        if (DB_PATH !== ':memory:') {
            await db.exec('PRAGMA journal_mode = WAL;');
        }
        
        app.locals.db = db;
        console.log('✅ Database connected successfully');
        
        // =================== ROUTES ===================
        app.use('/api', authRoutes);
        app.use('/api', panelRoutes);
        app.use('/api', componentRoutes);
        app.use('/api', quotationRoutes);
        
        // =================== HEALTH CHECK ===================
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: app.locals.db ? 'connected' : 'initializing',
                environment: process.env.NODE_ENV || 'development',
                platform: IS_RENDER ? 'render-free' : 'local',
                db_mode: DB_PATH === ':memory:' ? 'in-memory' : 'persistent'
            });
        });

        app.get('/api/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK',
                service: 'AMPRISE PANELS API',
                version: '2.0.0'
            });
        });
        
        // =================== STATIC FILES ===================
        if (process.env.NODE_ENV === 'production') {
            const frontendPath = path.join(__dirname, '..', 'frontend');
            if (fs.existsSync(frontendPath)) {
                app.use(express.static(frontendPath));
                
                app.get('*', (req, res) => {
                    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
                        res.sendFile(path.join(frontendPath, 'index.html'));
                    }
                });
            }
        }
        
        // =================== ERROR HANDLING ===================
        app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });
        
        app.use((err, req, res, next) => {
            console.error('Server Error:', err.stack);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        });
        
        // =================== START SERVER ===================
        app.listen(PORT, () => {
            console.log('\n========================================');
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('========================================\n');
            console.log(`💾 Database: ${DB_PATH}`);
            console.log(`📊 Mode: ${DB_PATH === ':memory:' ? 'IN-MEMORY (data resets on restart)' : 'PERSISTENT'}`);
            console.log('✅ System ready for production use!\n');
        });
        
    } catch (error) {
        console.error('\n❌ Failed to start server:');
        console.error(error);
        process.exit(1);
    }
}

// Handle process events
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
startServer();

module.exports = app;