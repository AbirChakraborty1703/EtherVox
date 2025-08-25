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

// Authorization middleware with enhanced security
const authorizeUser = (req, res, next) => {
  const authHeader = req.query.Authorization;
  
  // Check if authorization header exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send(`
      <html>
        <head><title>Unauthorized Access</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1 style="color: #dc3545;">🔒 Access Denied</h1>
          <p>Please <a href="/" style="color: #007bff;">login</a> to continue</p>
        </body>
      </html>
    `);
  }
  
  const token = authHeader.split('Bearer ')[1];

  if (!token) {
    return res.status(401).send('<h1 align="center">🔒 Authentication Required - Please Login</h1>');
  }
  
  try {
    // Verify and decode the token with proper error handling
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY, { 
      algorithms: ['HS256'],
      maxAge: '24h' // Token expires in 24 hours
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
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send('<h1 align="center">🕐 Session Expired - Please Login Again</h1>');
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).send('<h1 align="center">🚫 Invalid Token - Please Login Again</h1>');
    } else {
      return res.status(401).send('<h1 align="center">❌ Authentication Error - Please Login Again</h1>');
    }
  }
};


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'));
});

app.get('/js/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/login.js'))
});

app.get('/css/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/login.css'))
});

app.get('/css/index.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/index.css'))
});

app.get('/css/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/admin.css'))
});

app.get('/assets/eth5.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/eth5.jpg'))
});

app.get('/js/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/app.js'))
});

app.get('/admin.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/admin.html'));
});

app.get('/index.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'));
});

app.get('/dist/login.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/login.bundle.js'));
});

app.get('/dist/app.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/app.bundle.js'));
});

// Serve the favicon.jpg file
app.get('/favicon.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'));
});

// Start the server
app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});
