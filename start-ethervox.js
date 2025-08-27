#!/usr/bin/env node

/**
 * EtherVox Multi-Database Startup Script
 * 
 * This script starts all required services for the EtherVox voting system:
 * 1. MongoDB Server
 * 2. FastAPI Backend (MySQL + MongoDB)
 * 3. Express Frontend Server
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log(`
[STARTUP] EtherVox Multi-Database Voting System Startup
===============================================

[INFO] Database Architecture:
   MySQL     -> User authentication & voting records
   MongoDB   -> Candidate profiles & unstructured data
   
[INFO] Blockchain: Ethereum smart contracts
[INFO] Frontend:   Express.js + Web3.js
[INFO] Backend:    FastAPI with dual database support

===============================================
`);

// Configuration
const MONGODB_DATA_PATH = path.join(__dirname, 'Database_API', 'mongodb_data');
const DATABASE_API_PATH = path.join(__dirname, 'Database_API');

// Ensure MongoDB data directory exists
if (!fs.existsSync(MONGODB_DATA_PATH)) {
    fs.mkdirSync(MONGODB_DATA_PATH, { recursive: true });
    console.log('[OK] Created MongoDB data directory');
}

let mongoProcess, apiProcess, frontendProcess;

// Start MongoDB
function startMongoDB() {
    return new Promise((resolve, reject) => {
        console.log('[STARTUP] Starting MongoDB server...');
        
        mongoProcess = spawn('mongod', ['--dbpath', MONGODB_DATA_PATH], {
            stdio: 'pipe'
        });

        let mongoStarted = false;

    mongoProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
            console.log(`[MongoDB]: ${output}`);
            
            // Check if MongoDB is ready
            if (output.includes('Waiting for connections') || output.includes('waiting for connections')) {
                console.log('[OK] MongoDB server is ready!');
                if (!mongoStarted) {
                    mongoStarted = true;
                    resolve();
                }
            }
        }
    });        mongoProcess.stderr.on('data', (data) => {
            console.error('MongoDB Error:', data.toString());
        });

        mongoProcess.on('close', (code) => {
            console.log(`[ERROR] MongoDB process exited with code ${code}`);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!mongoStarted) {
                reject(new Error('MongoDB startup timeout'));
            }
        }, 30000);
    });
}

// Start FastAPI Backend
function startBackend() {
    return new Promise((resolve, reject) => {
        console.log('[STARTUP] Starting FastAPI backend with multi-database support...');
        
        apiProcess = spawn('python', ['main.py'], {
            cwd: DATABASE_API_PATH,
            stdio: 'pipe'
        });

        let backendStarted = false;

        apiProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Backend:', output.trim());
            
            if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
                if (!backendStarted) {
                    backendStarted = true;
                    console.log('[OK] FastAPI backend started successfully');
                    resolve();
                }
            }
        });

        apiProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.log('Backend:', output.trim());
            
            if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
                if (!backendStarted) {
                    backendStarted = true;
                    console.log('[OK] FastAPI backend started successfully');
                    resolve();
                }
            }
        });

        apiProcess.on('close', (code) => {
            console.log(`[ERROR] Backend process exited with code ${code}`);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!backendStarted) {
                reject(new Error('Backend startup timeout'));
            }
        }, 30000);
    });
}

// Start Express Frontend
function startFrontend() {
    return new Promise((resolve, reject) => {
        console.log('[STARTUP] Starting Express frontend server...');
        
        frontendProcess = spawn('node', ['index.js'], {
            env: { ...process.env, PORT: '8081' },
            stdio: 'pipe'
        });

        let frontendStarted = false;

        frontendProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Frontend:', output.trim());
            
            if (output.includes('EtherVox Server Started Successfully')) {
                if (!frontendStarted) {
                    frontendStarted = true;
                    console.log('[OK] Express frontend started successfully');
                    resolve();
                }
            }
        });

        frontendProcess.stderr.on('data', (data) => {
            console.error('Frontend Error:', data.toString());
        });

        frontendProcess.on('close', (code) => {
            console.log(`[ERROR] Frontend process exited with code ${code}`);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!frontendStarted) {
                reject(new Error('Frontend startup timeout'));
            }
        }, 30000);
    });
}

// Main startup sequence
async function startAllServices() {
    try {
        await startMongoDB();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for MongoDB to stabilize
        
        await startBackend();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for backend to stabilize
        
        await startFrontend();

        console.log(`
[SUCCESS] All services started successfully!

[URLS] Application URLs:
   • Frontend:     http://localhost:8081
   • Backend API:  http://localhost:8001
   • API Docs:     http://localhost:8001/docs
   
[STATUS] Database Status:
   • MongoDB:      Running on port 27017
   • MySQL:        Connected to voter_db
   
[SERVICES] Services Running:
   • MongoDB Server
   • FastAPI Backend (Multi-Database)
   • Express Frontend
   
Press Ctrl+C to stop all services
        `);

    } catch (error) {
        console.error('[ERROR] Startup failed:', error.message);
        process.exit(1);
    }
}

// Cleanup function
function cleanup() {
    console.log('\n[SHUTDOWN] Shutting down services...');
    
    if (frontendProcess) {
        frontendProcess.kill();
        console.log('[STOP] Frontend server stopped');
    }
    
    if (apiProcess) {
        apiProcess.kill();
        console.log('[STOP] Backend API stopped');
    }
    
    if (mongoProcess) {
        mongoProcess.kill();
        console.log('[STOP] MongoDB server stopped');
    }
    
    console.log('[OK] All services stopped');
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the application
startAllServices().catch(console.error);
