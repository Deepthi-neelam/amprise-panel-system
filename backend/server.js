/**
 * AMPRISE PANELS - Production Server
 * Complete Backend Implementation with SQLite
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database initialization
const initializeDatabase = require('./database/init');

// Import routes
const authRoutes = require('./routes/auth');
const panelRoutes = require('./routes/panels');
const componentRoutes = require('./routes/components');
const quotationRoutes = require('./routes/quotations');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// =================== SECURITY MIDDLEWARE ===================
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
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

// Apply rate limiting to API routes
app.use('/api/', limiter);

// =================== DATABASE CONNECTION ===================
let db;

/**
 * Initialize database and start server
 */
async function startServer() {
    try {
        console.log('\n========================================');
        console.log('   AMPRISE PANELS - ESTIMATION SYSTEM');
        console.log('========================================\n');
        
        // Initialize database
        console.log('📦 Initializing database...');
        await initializeDatabase();
        
        // Open database connection
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        db = await open({
            filename: path.join(__dirname, 'database', 'panel-estimation.db'),
            driver: sqlite3.Database
        });
        
        // Make db available to routes
        app.locals.db = db;
        
        console.log('✅ Database connected successfully');
        
        // =================== ROUTES ===================
        app.use('/api', authRoutes);
        app.use('/api', panelRoutes);
        app.use('/api', componentRoutes);
        app.use('/api', quotationRoutes);
        
        // Health check endpoint
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: 'Connected',
                server: 'AMPRISE Panel Estimation System v2.0'
            });
        });

        // Serve static files in production
        if (process.env.NODE_ENV === 'production') {
            const frontendPath = path.join(__dirname, '..', 'frontend');
            if (fs.existsSync(frontendPath)) {
                app.use(express.static(frontendPath));
                
                app.get('*', (req, res) => {
                    res.sendFile(path.join(frontendPath, 'index.html'));
                });
            }
        }
        
        // =================== ERROR HANDLING ===================
        // 404 handler
        app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });
        
        // Global error handler
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
            console.log('📊 Available Endpoints:');
            console.log('   POST   /api/login              - Authentication');
            console.log('   GET    /api/panel-types        - Panel types');
            console.log('   GET    /api/components         - Component database');
            console.log('   POST   /api/generate-estimation - Generate BOM');
            console.log('   POST   /api/quotations         - Create quotation');
            console.log('   GET    /api/quotations         - List quotations');
            console.log('   GET    /api/quotations/:id/pdf - Download PDF\n');
            console.log('👤 Demo Credentials:');
            console.log('   admin / admin123');
            console.log('   engineer / admin123');
            console.log('   sales / admin123');
            console.log('   manager / admin123\n');
            console.log('✅ System ready for production use!\n');
        });
        
    } catch (error) {
        console.error('\n❌ Failed to start server:');
        console.error(error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
startServer();

module.exports = app;