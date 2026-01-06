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
      showMessage('🎉 Admin authentication successful! Welcome to the control panel...', 'success');
      
      // Store admin token
      localStorage.setItem('jwtTokenAdmin', response.data.token);
      
      // Redirect to admin panel
      setTimeout(() => {
        window.location.replace(`http://localhost:8081/admin.html?Authorization=Bearer ${response.data.token}`);
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
      showMessage('✅ Password verified!', 'success');
      
      // Store user token and voter ID temporarily
      localStorage.setItem('tempToken', response.data.token);
      localStorage.setItem('currentVoterId', voterId);
      
      // Check if face is registered
      const faceRegistered = await checkFaceRegistered(voterId);
      
      if (!faceRegistered) {
        // First time login - require face registration
        showMessage('⚠️ Face registration required!', 'warning');
        setTimeout(() => {
          if (confirm('🔐 Enhanced Security Required!\n\nYou must register your face before voting.\n\nThis enables:\n✓ Three-factor authentication (ID + Password + Face)\n✓ Fraud prevention\n✓ Secure voting access\n\nProceed to face registration?')) {
            localStorage.setItem('jwtTokenVoter', response.data.token);
            window.location.replace('/face-register.html');
          } else {
            // Logout if they decline
            localStorage.removeItem('tempToken');
            localStorage.removeItem('currentVoterId');
            showMessage('Face registration is mandatory. Please login again when ready.', 'error');
            setLoadingState(submitButton, false);
          }
        }, 1500);
      } else {
        // Face registered - now require face authentication
        showMessage('🔐 Now verify your face...', 'info');
        setLoadingState(submitButton, false);
        
        setTimeout(() => {
          // Open face authentication modal
          showFaceAuthenticationModal();
        }, 1000);
      }
      
    } else {
      throw new Error('Invalid voter credentials');
    }
    
  } catch (error) {
    console.error('User login failed:', error);
    showMessage(`❌ Voter Login Failed: ${error.message}`, 'error');
    setLoadingState(submitButton, false);
  }
}

// Show face authentication modal after password verification
async function showFaceAuthenticationModal() {
  const modal = document.getElementById('faceLoginModal');
  if (modal) {
    // Load face models first if not already loaded
    if (!faceAuthModels) {
      const modelsLoaded = await loadFaceModels();
      if (!modelsLoaded) {
        showMessage('⚠️ Face recognition models could not be loaded', 'error');
        return;
      }
    }
    // Open the face authentication modal
    await openFaceAuthModal();
  } else {
    // Fallback: redirect to face login
    alert('🔐 Face Authentication Required\n\nPlease authenticate your face to complete login.');
    const faceLoginBtn = document.getElementById('faceLoginBtn');
    if (faceLoginBtn) {
      faceLoginBtn.click();
    }
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
// ===============================================
// Face Authentication Integration
// ===============================================
let faceAuthStream = null;
let faceAuthModels = null;

async function loadFaceModels() {
  if (faceAuthModels) return true;
  
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    faceAuthModels = true;
    return true;
  } catch (error) {
    console.error('Error loading face models:', error);
    showMessage('⚠️ Face recognition models could not be loaded', 'error');
    return false;
  }
}

function setupFaceAuthListeners() {
  const faceLoginBtn = document.getElementById('faceLoginBtn');
  const faceModal = document.getElementById('faceLoginModal');
  const closeModal = document.querySelector('.close-modal');
  const captureFaceBtn = document.getElementById('captureFaceBtn');
  
  if (faceLoginBtn) {
    faceLoginBtn.addEventListener('click', async () => {
      const modelsLoaded = await loadFaceModels();
      if (modelsLoaded) {
        openFaceAuthModal();
      }
    });
  }
  
  if (closeModal) {
    closeModal.addEventListener('click', closeFaceAuthModal);
  }
  
  if (faceModal) {
    faceModal.addEventListener('click', (e) => {
      if (e.target === faceModal) {
        closeFaceAuthModal();
      }
    });
  }
  
  if (captureFaceBtn) {
    captureFaceBtn.addEventListener('click', captureFaceForAuth);
  }
}

async function openFaceAuthModal() {
  const modal = document.getElementById('faceLoginModal');
  const video = document.getElementById('faceVideo');
  const status = document.getElementById('faceStatus');
  
  try {
    modal.classList.add('active');
    status.textContent = 'Initializing camera...';
    status.className = 'status-message';
    
    faceAuthStream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    video.srcObject = faceAuthStream;
    
    video.addEventListener('loadedmetadata', () => {
      status.textContent = 'Camera ready! Position your face in the frame.';
      status.className = 'status-message';
      startFaceDetection();
    });
  } catch (error) {
    console.error('Camera error:', error);
    status.textContent = '⚠️ Could not access camera. Please check permissions.';
    status.className = 'status-message error';
  }
}

function closeFaceAuthModal() {
  const modal = document.getElementById('faceLoginModal');
  const video = document.getElementById('faceVideo');
  
  modal.classList.remove('active');
  
  if (faceAuthStream) {
    faceAuthStream.getTracks().forEach(track => track.stop());
    faceAuthStream = null;
  }
  
  video.srcObject = null;
}

async function startFaceDetection() {
  const video = document.getElementById('faceVideo');
  const canvas = document.getElementById('faceCanvas');
  
  if (!video || !canvas) return;
  
  const detectFace = async () => {
    if (!video.srcObject) return;
    
    const detection = await faceapi.detectSingleFace(
      video, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks();
    
    if (detection) {
      const dims = faceapi.matchDimensions(canvas, video, true);
      const resizedDetection = faceapi.resizeResults(detection, dims);
      
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetection);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
    }
    
    if (video.srcObject) {
      requestAnimationFrame(detectFace);
    }
  };
  
  detectFace();
}

async function captureFaceForAuth() {
  const video = document.getElementById('faceVideo');
  const status = document.getElementById('faceStatus');
  const captureBtn = document.getElementById('captureFaceBtn');
  
  try {
    captureBtn.disabled = true;
    status.textContent = 'Capturing face data...';
    status.className = 'status-message';
    
    const detection = await faceapi.detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
      status.textContent = '⚠️ No face detected. Please position your face clearly.';
      status.className = 'status-message error';
      captureBtn.disabled = false;
      return;
    }
    
    status.textContent = 'Authenticating...';
    
    const faceDescriptor = Array.from(detection.descriptor);
    
    const response = await fetch('http://localhost:8001/login-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ face_descriptor: faceDescriptor })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      status.textContent = `✅ Welcome, ${data.voter_id}!`;
      status.className = 'status-message success';
      
      // Store JWT token (use correct key based on role)
      if (data.role === 'admin') {
        localStorage.setItem('jwtTokenAdmin', data.token);
      } else {
        localStorage.setItem('jwtTokenVoter', data.token);
      }
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userId', data.voter_id);
      
      // Close modal and redirect
      setTimeout(() => {
        closeFaceAuthModal();
        
        if (data.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          window.location.href = `/index.html?Authorization=Bearer ${data.token}`;
        }
      }, 1500);
    } else {
      status.textContent = '⚠️ ' + (data.error || 'Face not recognized. Please try again.');
      status.className = 'status-message error';
      captureBtn.disabled = false;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    status.textContent = '⚠️ Authentication failed. Please try again.';
    status.className = 'status-message error';
    captureBtn.disabled = false;
  }
}

// Initialize face auth listeners
document.addEventListener('DOMContentLoaded', setupFaceAuthListeners);

// ==========================================
// CHECK FACE REGISTRATION STATUS
// ==========================================

async function checkFaceRegistered(voterId) {
  try {
    const response = await fetch(`http://127.0.0.1:8001/face-registered/${voterId}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.registered === true;
    }
    
    // If endpoint doesn't exist or error, assume not registered
    return false;
  } catch (error) {
    console.log('Face registration check failed:', error);
    // On error, assume not registered (safer default)
    return false;
  }
}

// ==========================================
// MOBILE FINGERPRINT AUTHENTICATION
// ==========================================
