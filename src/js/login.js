/**
 * EtherVox Decentralized Voting System - User Authentication
 * 
 * @file login.js
 * @author EtherVox Development Team
 * @description Handles user login authentication and role-based redirection
 * @version 1.0.0
 * 
 * Features:
 * - JWT token authentication
 * - Role-based access control (admin/user)
 * - Secure local storage management
 * - API integration with Database_API
 */

// Get login form element from DOM
const loginForm = document.getElementById('loginForm');

// Login form submission handler
loginForm.addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent default form submission

  // Extract user credentials from form inputs
  const voter_id = document.getElementById('voter-id').value.trim();
  const password = document.getElementById('password').value;
  
  // Input validation
  if (!voter_id || !password) {
    alert('Please enter both Voter ID and Password');
    return;
  }
  
  if (voter_id.length < 3) {
    alert('Voter ID must be at least 3 characters long');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters long');
    return;
  }
  
  const token = voter_id; // Use voter_id as initial token

  // Configure headers for API request
  const headers = {
    'method': "GET",
    'Authorization': `Bearer ${token}`, // JWT authentication
  };

  // Make login request to Database API
  fetch(`http://127.0.0.1:8000/login?voter_id=${voter_id}&password=${password}`, { headers })
  .then(response => {
    if (response.ok) {
      return response.json(); // Parse successful response
    } else {
      throw new Error('Login failed'); // Handle authentication failure
    }
  })
  .then(data => {
    // Role-based redirection after successful authentication
    if (data.role === 'admin') {
      console.log(data.role) // Log admin access
      localStorage.setItem('jwtTokenAdmin', data.token); // Store admin token
      // Redirect to admin dashboard with authentication
      window.location.replace(`http://127.0.0.1:8080/admin.html?Authorization=Bearer ${localStorage.getItem('jwtTokenAdmin')}`);
    } else if (data.role === 'user'){
      localStorage.setItem('jwtTokenVoter', data.token); // Store user token
      // Redirect to voting interface with authentication
      window.location.replace(`http://127.0.0.1:8080/index.html?Authorization=Bearer ${localStorage.getItem('jwtTokenVoter')}`);
    }
  })
  .catch(error => {
    // Handle and log authentication errors
    console.error('Login failed:', error.message);
    
    // Check if it's a network error (Database API not running)
    if (error.message === 'Failed to fetch') {
      alert(`🚨 Database API Connection Error!\n\nThe Database API server is not running.\n\nPlease start the Database API by running:\n1. cd Database_API\n2. python main.py\n\nOr use the start-dev.bat script to start all services.`);
    } else {
      alert('Login failed: ' + error.message);
    }
  });
});
