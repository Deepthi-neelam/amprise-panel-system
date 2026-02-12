/**
 * AMPRISE PANELS - Production Server
 * Complete Backend Implementation with SQLite
 */

// =================== REQUIRE MODULES (ALL AT TOP) ===================
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

// Import routes - NO AUTH MIDDLEWARE IMPORT HERE
const authRoutes = require('./routes/auth');
const panelRoutes = require('./routes/panels');
const componentRoutes = require('./routes/components');
const quotationRoutes = require('./routes/quotations');

// =================== DATABASE PATH CONFIGURATION ===================
const IS_RENDER = !!process.env.RENDER;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let DB_PATH;
if (IS_RENDER) {
    DB_PATH = '/var/data/panel-estimation.db';
    const dbDir = '/var/data';
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
} else {
    DB_PATH = path.join(__dirname, 'database', 'panel-estimation.db');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

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
        
        console.log('📦 Initializing database...');
        console.log(`📁 Database path: ${DB_PATH}`);
        await initializeDatabase();
        
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        
        await db.exec('PRAGMA journal_mode = WAL;');
        app.locals.db = db;
        console.log('✅ Database connected successfully');
        
        // =================== ROUTES ===================
        app.use('/api', authRoutes);
        app.use('/api', panelRoutes);
        app.use('/api', componentRoutes);
        app.use('/api', quotationRoutes);
        
        // =================== HEALTH CHECK ENDPOINTS ===================
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: app.locals.db ? 'connected' : 'initializing'
            });
        });

        app.get('/api/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK',
                service: 'AMPRISE PANELS API',
                version: '2.0.0',
                timestamp: new Date().toISOString()
            });
        });
        
        // =================== STATIC FILES ===================
        if (process.env.NODE_ENV === 'production') {
            const frontendPath = path.join(__dirname, '..', 'frontend');
            if (fs.existsSync(frontendPath)) {
                console.log(`📁 Serving static files from: ${frontendPath}`);
                app.use(express.static(frontendPath));
                
                app.get('*', (req, res) => {
                    if (!req.path.startsWith('/api')) {
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
            console.log('✅ System ready for production use!\n');
        });
        
    } catch (error) {
        console.error('\n❌ Failed to start server:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer();

module.exports = app;