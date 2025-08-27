/**
 * EtherVox - Decentralized Voting Application
 * Main Express Server File
 * Author: Abir Chakraborty
 * Description: Handles server routing, authentication, and static file serving
 */

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables from .env file
require('dotenv').config();

// Initialize Express application
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from public directory (includes js/, favicon, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Serve CSS files from src directory
app.use('/css', express.static(path.join(__dirname, 'src/css')));

// Debug middleware to log static file requests
app.use((req, res, next) => {
  if (req.path.includes('.js') || req.path.includes('.css')) {
    console.log(`Static file request: ${req.method} ${req.path}`);
  }
  next();
});

// Authorization middleware with enhanced security
const authorizeUser = (req, res, next) => {
  const authHeader = req.query.Authorization;
  
  // Check if authorization header exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send(`
      <html>
        <head>
          <title>Unauthorized Access</title>
          <style>
            body { font-family: 'Poppins', sans-serif; text-align: center; margin-top: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px; }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin-bottom: 30px; }
            a { color: #f093fb; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔒 Access Denied</h1>
            <p>You need to be logged in to access this page.</p>
            <p><a href="/">← Return to Login Page</a></p>
          </div>
        </body>
      </html>
    `);
  }
  
  const token = authHeader.split('Bearer ')[1];

  if (!token) {
    return res.status(401).send(`
      <html>
        <head><title>Authentication Required</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1 style="color: #dc3545;">🔒 Authentication Required</h1>
          <p><a href="/" style="color: #007bff;">Please Login</a></p>
        </body>
      </html>
    `);
  }
  
  try {
    // Verify and decode the token with proper error handling
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY, { 
      algorithms: ['HS256']
    });

    // Add user info to request object
    req.user = decodedToken;
    
    // Check if token is about to expire (less than 1 hour left)
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp - now < 3600) {
      console.warn(`Token for user ${decodedToken.voter_id} expires soon`);
    }
    
    next(); // Proceed to the next middleware
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    
    let errorMessage = '';
    if (error.name === 'TokenExpiredError') {
      errorMessage = '🕐 Session Expired - Please Login Again';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = '🚫 Invalid Token - Please Login Again';
    } else {
      errorMessage = '❌ Authentication Error - Please Login Again';
    }
    
    return res.status(401).send(`
      <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1 style="color: #dc3545;">${errorMessage}</h1>
          <p><a href="/" style="color: #007bff;">Return to Login</a></p>
        </body>
      </html>
    `);
  }
};

// ===============================================
// ROUTES - Login Page (Public Access)
// ===============================================

// Main login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'));
});

// Login page assets
app.get('/js/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/login.js'));
});

app.get('/css/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/login.css'));
});

// ===============================================
// ROUTES - Protected Pages (Require Authentication)
// ===============================================

// Admin dashboard
app.get('/admin.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/admin.html'));
});

// Voting interface
app.get('/index.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'));
});

// ===============================================
// ROUTES - Static Assets (CSS, JS, Images)
// ===============================================

// CSS files
app.get('/css/index.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/index.css'));
});

app.get('/css/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/admin.css'));
});

// JavaScript files
app.get('/js/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/app.js'));
});

// Bundle files (try both locations)
app.get('/dist/app.bundle.js', (req, res) => {
  const publicPath = path.join(__dirname, 'public/app.bundle.js');
  const distPath = path.join(__dirname, 'src/dist/app.bundle.js');
  
  // Try public directory first, then dist directory
  res.sendFile(publicPath, (err) => {
    if (err) {
      res.sendFile(distPath);
    }
  });
});

app.get('/app.bundle.js', (req, res) => {
  const publicPath = path.join(__dirname, 'public/app.bundle.js');
  const distPath = path.join(__dirname, 'src/dist/app.bundle.js');
  
  // Try public directory first, then dist directory
  res.sendFile(publicPath, (err) => {
    if (err) {
      res.sendFile(distPath);
    }
  });
});

// Image assets
app.get('/assets/eth5.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/eth5.jpg'));
});

// Favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'));
});

app.get('/favicon.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'));
});

// ===============================================
// ERROR HANDLING
// ===============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>Page Not Found</title>
        <style>
          body { font-family: 'Poppins', sans-serif; text-align: center; margin-top: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px; }
          h1 { font-size: 2.5em; margin-bottom: 20px; }
          p { font-size: 1.2em; margin-bottom: 30px; }
          a { color: #f093fb; text-decoration: none; font-weight: 600; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚫 Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <p><a href="/">← Return to Login Page</a></p>
        </div>
      </body>
    </html>
  `);
});

// ===============================================
// SERVER STARTUP
// ===============================================

// Start the server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`
🚀 EtherVox Server Started Successfully!
   
📍 Server running at: http://localhost:${PORT}
🔐 Login page: http://localhost:${PORT}/
👑 Admin access: http://localhost:${PORT}/admin.html (requires login)
🗳️  Voting page: http://localhost:${PORT}/index.html (requires login)

📊 Status: Ready for connections
🛡️  Security: JWT authentication enabled
🔗 Database API: http://127.0.0.1:8001 (make sure to start separately)

=== STARTUP CHECKLIST ===
1. ✅ Express server running on port ${PORT}
2. ⚠️  Make sure Database API is running: cd Database_API && python main.py
3. ⚠️  Make sure Ganache blockchain is running
4. ⚠️  Make sure smart contracts are deployed

Happy Voting! 🗳️✨
  `);
});
