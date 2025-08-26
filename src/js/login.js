/**
 * EtherVox Modern Authentication System
 * 
 * @file login.js
 * @author EtherVox Development Team
 * @description Enhanced login interface with admin/user role separation
 * @version 2.0.0
 * 
 * Features:
 * - Modern tabbed interface (Admin/User)
 * - Enhanced UI interactions and animations
 * - JWT token authentication
 * - Role-based access control
 * - Password visibility toggle
 * - Comprehensive error handling
 * - Beautiful message notifications
 */

// ===============================================
// DOM Elements and Initialization
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
  initializeLoginInterface();
  setupEventListeners();
});

function initializeLoginInterface() {
  // Initialize tab switching functionality
  setupTabSwitching();
  
  // Initialize password toggle functionality
  setupPasswordToggle();
  
  // Initialize form animations
  setupFormAnimations();
}

// ===============================================
// Tab Switching Functionality
// ===============================================
function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      
      // Show corresponding tab content
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Clear any previous messages
      clearMessages();
      
      // Add ripple effect
      createRippleEffect(button);
    });
  });
}

// ===============================================
// Password Toggle Functionality
// ===============================================
function setupPasswordToggle() {
  const toggleButtons = document.querySelectorAll('.toggle-password');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const icon = button.querySelector('i');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

// ===============================================
// Form Animations and Interactions
// ===============================================
function setupFormAnimations() {
  const inputs = document.querySelectorAll('input');
  
  inputs.forEach(input => {
    // Focus animations
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      if (!input.value) {
        input.parentElement.classList.remove('focused');
      }
    });
    
    // Real-time validation feedback
    input.addEventListener('input', () => {
      validateField(input);
    });
  });
}

// ===============================================
// Event Listeners Setup
// ===============================================
function setupEventListeners() {
  // Admin login form
  const adminForm = document.getElementById('adminLoginForm');
  if (adminForm) {
    adminForm.addEventListener('submit', handleAdminLogin);
  }
  
  // User login form
  const userForm = document.getElementById('userLoginForm');
  if (userForm) {
    userForm.addEventListener('submit', handleUserLogin);
  }
}

// ===============================================
// Admin Login Handler
// ===============================================
async function handleAdminLogin(event) {
  event.preventDefault();
  
  const adminId = document.getElementById('admin-id').value.trim();
  const password = document.getElementById('admin-password').value;
  const submitButton = event.target.querySelector('.login-btn');
  
  // Input validation
  if (!validateAdminInputs(adminId, password)) {
    return;
  }
  
  // Show loading state
  setLoadingState(submitButton, true, 'Authenticating...');
  
  try {
    const response = await authenticateUser(adminId, password, 'admin');
    
    if (response.success && response.data.role === 'admin') {
      showMessage('🎉 Admin authentication successful! Redirecting...', 'success');
      
      // Store admin token
      localStorage.setItem('jwtTokenAdmin', response.data.token);
      
      // Redirect to admin panel
      setTimeout(() => {
        window.location.replace(`http://localhost:8080/admin.html?Authorization=Bearer ${response.data.token}`);
      }, 1500);
      
    } else {
      throw new Error('Invalid admin credentials or insufficient privileges');
    }
    
  } catch (error) {
    console.error('Admin login failed:', error);
    showMessage(`❌ Admin Login Failed: ${error.message}`, 'error');
    setLoadingState(submitButton, false);
  }
}

// ===============================================
// User Login Handler
// ===============================================
async function handleUserLogin(event) {
  event.preventDefault();
  
  const voterId = document.getElementById('voter-id').value.trim();
  const password = document.getElementById('user-password').value;
  const submitButton = event.target.querySelector('.login-btn');
  
  // Input validation
  if (!validateUserInputs(voterId, password)) {
    return;
  }
  
  // Show loading state
  setLoadingState(submitButton, true, 'Verifying...');
  
  try {
    const response = await authenticateUser(voterId, password, 'user');
    
    if (response.success) {
      showMessage('🎉 Voter authentication successful! Entering voting portal...', 'success');
      
      // Store user token
      localStorage.setItem('jwtTokenVoter', response.data.token);
      
      // Redirect to voting interface
      setTimeout(() => {
        window.location.replace(`http://localhost:8080/index.html?Authorization=Bearer ${response.data.token}`);
      }, 1500);
      
    } else {
      throw new Error('Invalid voter credentials');
    }
    
  } catch (error) {
    console.error('User login failed:', error);
    showMessage(`❌ Voter Login Failed: ${error.message}`, 'error');
    setLoadingState(submitButton, false);
  }
}

// ===============================================
// Authentication API Function
// ===============================================
async function authenticateUser(userId, password, expectedRole) {
  const token = userId; // Use userId as initial token
  
  const headers = {
    'method': 'GET',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await fetch(
      `http://127.0.0.1:8001/login?voter_id=${encodeURIComponent(userId)}&password=${encodeURIComponent(password)}`,
      { headers }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid credentials');
      } else if (response.status === 403) {
        throw new Error('Access denied');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`Authentication failed (${response.status})`);
      }
    }
    
    const data = await response.json();
    
    // Validate role if specified
    if (expectedRole && data.role !== expectedRole) {
      throw new Error(`Access denied. ${expectedRole === 'admin' ? 'Administrator' : 'Voter'} privileges required.`);
    }
    
    return {
      success: true,
      data: data
    };
    
  } catch (fetchError) {
    if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
      throw new Error('🚨 Database API server is not running. Please start the Database API service.');
    }
    throw fetchError;
  }
}

// ===============================================
// Input Validation Functions
// ===============================================
function validateAdminInputs(adminId, password) {
  if (!adminId || !password) {
    showMessage('❌ Please enter both Administrator ID and Password', 'error');
    return false;
  }
  
  if (adminId.length < 3) {
    showMessage('❌ Administrator ID must be at least 3 characters long', 'error');
    return false;
  }
  
  if (password.length < 6) {
    showMessage('❌ Password must be at least 6 characters long', 'error');
    return false;
  }
  
  return true;
}

function validateUserInputs(voterId, password) {
  if (!voterId || !password) {
    showMessage('❌ Please enter both Voter ID and Password', 'error');
    return false;
  }
  
  if (voterId.length < 3) {
    showMessage('❌ Voter ID must be at least 3 characters long', 'error');
    return false;
  }
  
  if (password.length < 6) {
    showMessage('❌ Password must be at least 6 characters long', 'error');
    return false;
  }
  
  return true;
}

function validateField(input) {
  const value = input.value.trim();
  const inputWrapper = input.parentElement;
  
  // Remove previous validation classes
  inputWrapper.classList.remove('error', 'success');
  
  if (value.length > 0) {
    if (input.type === 'password' && value.length >= 6) {
      inputWrapper.classList.add('success');
    } else if (input.type !== 'password' && value.length >= 3) {
      inputWrapper.classList.add('success');
    } else {
      inputWrapper.classList.add('error');
    }
  }
}

// ===============================================
// UI Helper Functions
// ===============================================
function setLoadingState(button, isLoading, loadingText = 'Loading...') {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <span>${loadingText}</span>
    `;
    button.style.opacity = '0.8';
  } else {
    button.disabled = false;
    const isAdmin = button.classList.contains('admin-btn');
    button.innerHTML = `
      <i class="fas ${isAdmin ? 'fa-sign-in-alt' : 'fa-vote-yea'}"></i>
      <span>${isAdmin ? 'Access Admin Panel' : 'Enter Voting Portal'}</span>
      <div class="btn-glow"></div>
    `;
    button.style.opacity = '1';
  }
}

function showMessage(message, type = 'info') {
  const messageContainer = document.getElementById('message-container');
  
  messageContainer.className = `message-container ${type} show`;
  messageContainer.textContent = message;
  messageContainer.style.display = 'block';
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      clearMessages();
    }, 3000);
  }
}

function clearMessages() {
  const messageContainer = document.getElementById('message-container');
  messageContainer.className = 'message-container';
  messageContainer.style.display = 'none';
  messageContainer.textContent = '';
}

function createRippleEffect(element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
  ripple.classList.add('ripple');
  
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// ===============================================
// Enhanced Error Handling
// ===============================================
window.addEventListener('error', function(event) {
  console.error('Login page error:', event.error);
  showMessage('⚠️ An unexpected error occurred. Please refresh the page and try again.', 'error');
});

// ===============================================
// Security: Clear sensitive data on page unload
// ===============================================
window.addEventListener('beforeunload', function() {
  // Clear any temporary authentication data
  const sensitiveInputs = document.querySelectorAll('input[type="password"]');
  sensitiveInputs.forEach(input => {
    input.value = '';
  });
});
