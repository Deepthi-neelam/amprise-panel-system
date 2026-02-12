#!/usr/bin/env node

/**
 * AMPRISE PANELS - Production Starter
 * One-click start script for production deployment
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║     █████╗ ███╗   ███╗██████╗ ██████╗ ██╗███████╗███████╗ ║');
console.log('║    ██╔══██╗████╗ ████║██╔══██╗██╔══██╗██║██╔════╝██╔════╝ ║');
console.log('║    ███████║██╔████╔██║██████╔╝██████╔╝██║███████╗█████╗   ║');
console.log('║    ██╔══██║██║╚██╔╝██║██╔═══╝ ██╔══██╗██║╚════██║██╔══╝   ║');
console.log('║    ██║  ██║██║ ╚═╝ ██║██║     ██║  ██║██║███████║███████╗ ║');
console.log('║    ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝ ║');
console.log('║                                                            ║');
console.log('║               PANEL ESTIMATION SYSTEM                      ║');
console.log('║                    PRODUCTION MODE                         ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

// Check Node.js version
const nodeVersion = process.version;
const requiredVersion = 'v14.0.0';

if (require('semver').lt(nodeVersion, requiredVersion)) {
    console.error(`❌ Node.js ${requiredVersion} or higher is required. Current version: ${nodeVersion}`);
    process.exit(1);
}

console.log(`✅ Node.js ${nodeVersion} detected\n`);

// Check if backend directory exists
const backendDir = path.join(__dirname, 'backend');
if (!fs.existsSync(backendDir)) {
    console.error('❌ Backend directory not found!');
    console.error('   Make sure you are running this script from the project root.');
    process.exit(1);
}

// Install dependencies if node_modules doesn't exist
const nodeModulesDir = path.join(backendDir, 'node_modules');
if (!fs.existsSync(nodeModulesDir)) {
    console.log('📦 Installing dependencies... This may take a few minutes.\n');
    
    const npmInstall = spawn('npm', ['install'], { 
        cwd: backendDir, 
        stdio: 'inherit',
        shell: true
    });
    
    npmInstall.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Dependencies installed successfully!\n');
            startServer();
        } else {
            console.error('\n❌ Failed to install dependencies');
            process.exit(1);
        }
    });
} else {
    startServer();
}

function startServer() {
    console.log('🚀 Starting AMPRISE Panel Estimation Server...\n');
    
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    // Start the server
    const server = spawn('node', ['server.js'], { 
        cwd: backendDir, 
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'production' }
    });
    
    server.on('error', (error) => {
        console.error('❌ Failed to start server:', error);
    });
    
    // Handle process signals
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down server...');
        server.kill('SIGINT');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n\n👋 Shutting down server...');
        server.kill('SIGTERM');
        process.exit(0);
    });
    
    console.log('📋 Server logs will appear below:');
    console.log('───────────────────────────────────────────────\n');
}