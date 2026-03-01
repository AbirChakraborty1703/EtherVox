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
  
  // Initialize project info modal
  setupProjectInfoModal();
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
  
  // Candidate login form
  const candidateForm = document.getElementById('candidateLoginForm');
  if (candidateForm) {
    candidateForm.addEventListener('submit', handleCandidateLogin);
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
      
      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.replace(`AdminDashboard.html?Authorization=Bearer ${response.data.token}`);
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
  setLoadingState(submitButton, true, 'Verifying credentials...');
  
  try {
    // STEP 1: Authenticate with ID and Password
    const response = await authenticateUser(voterId, password, 'user');
    
    if (response.success) {
      showMessage('✅ Step 1/2: Password verified! Checking face authentication...', 'success');
      
      // Store temporary user data
      const userData = {
        voterId: voterId,
        token: response.data.token,
        role: response.data.role
      };
      
      // STEP 2: Check if user has face data registered
      const hasFaceData = await checkFaceRegistration(voterId);
      
      if (hasFaceData) {
        // User has face data - proceed to face verification
        showMessage('🔐 Step 2/2: Please verify your face to complete login', 'info');
        setLoadingState(submitButton, false);
        
        // Show face verification modal
        await showFaceVerificationModal(userData);
      } else {
        // No face data - redirect to registration page
        showMessage('⚠️ Face authentication required! Redirecting to face registration...', 'info');
        
        // Store user data for face registration page
        localStorage.setItem('pendingVoterLogin', JSON.stringify(userData));
        
        setTimeout(() => {
          window.location.href = 'face-register.html?voter_id=' + encodeURIComponent(voterId);
        }, 2000);
      }
      
    } else {
      throw new Error('Invalid voter credentials');
    }
    
  } catch (error) {
    console.error('User login failed:', error);
    showMessage(`❌ Login Failed: ${error.message}`, 'error');
    setLoadingState(submitButton, false);
  }
}

// ===============================================
// Two-Step Verification Helper Functions
// ===============================================

/**
 * Check if voter has face authentication registered
 */
async function checkFaceRegistration(voterId) {
  try {
    const response = await fetch(`http://127.0.0.1:8001/face-auth/face-registered/${encodeURIComponent(voterId)}`);
    
    if (!response.ok) {
      console.warn('Could not check face registration status');
      return false;
    }
    
    const data = await response.json();
    console.log('Face registration check:', data);
    return data.registered === true;
    
  } catch (error) {
    console.error('Error checking face registration:', error);
    return false;
  }
}

/**
 * Show face verification modal for two-step authentication
 */
async function showFaceVerificationModal(userData) {
  return new Promise((resolve, reject) => {
    // Create modal HTML
    const modalHTML = `
      <div id="faceVerificationModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="background:white;border-radius:16px;padding:30px;max-width:520px;width:90%;text-align:center;">
          <h3 style="margin:0 0 15px;font-family:Poppins,sans-serif;color:#333;">
            <i class="fas fa-shield-alt" style="color:#667eea;"></i> Step 2: Face Verification
          </h3>
          <p style="color:#666;font-size:14px;margin-bottom:15px;">Position your face in the center and look at the camera</p>
          <div id="faceVideoContainer" style="position:relative;display:inline-block;width:100%;max-width:480px;">
            <video id="faceVideo" autoplay muted playsinline style="width:100%;border-radius:10px;background:#000;display:block;"></video>
            <canvas id="faceCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:10px;pointer-events:none;"></canvas>
          </div>
          <div id="faceStatus" style="margin:15px 0;font-family:Poppins,sans-serif;font-size:14px;color:#666;">Initializing camera...</div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button id="faceVerifyBtn" disabled style="padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-shield-alt"></i> Verify Face
            </button>
            <button id="faceCancelBtn" style="padding:12px 30px;background:#6c757d;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to page
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
    
    const modal = document.getElementById('faceVerificationModal');
    const video = document.getElementById('faceVideo');
    const canvas = document.getElementById('faceCanvas');
    const status = document.getElementById('faceStatus');
    const verifyBtn = document.getElementById('faceVerifyBtn');
    const cancelBtn = document.getElementById('faceCancelBtn');
    
    let statusInterval = null;
    
    // Initialize face authentication
    (async () => {
      try {
        // Load face-api.js models
        await window.faceAuth.loadModels();
        
        // Initialize camera
        await window.faceAuth.initializeCamera(video, canvas);
        
        status.textContent = '✅ Camera ready — position your face in view';
        status.style.color = '#28a745';
        verifyBtn.disabled = false;
        
        // Monitor face detection
        statusInterval = setInterval(() => {
          if (window.faceAuth.faceDetected) {
            status.textContent = '✅ Face detected! Click Verify Face to continue.';
            status.style.color = '#28a745';
            verifyBtn.disabled = false;
          } else {
            status.textContent = '⚠️ No face detected — look at the camera';
            status.style.color = '#ff9800';
            verifyBtn.disabled = true;
          }
        }, 500);
        
      } catch (error) {
        console.error('Face verification initialization error:', error);
        status.textContent = '❌ Camera initialization failed: ' + error.message;
        status.style.color = '#dc3545';
      }
    })();
    
    // Verify button handler
    verifyBtn.onclick = async () => {
      try {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        status.textContent = '🔍 Verifying your face...';
        status.style.color = '#667eea';
        
        const result = await window.faceAuth.authenticateByFace();
        
        if (result.success && result.voter_id === userData.voterId) {
          // Face verification successful
          clearInterval(statusInterval);
          status.textContent = '✅ Face verified! Logging you in...';
          status.style.color = '#28a745';
          
          window.faceAuth.stopCamera();
          
          // Store token and redirect
          localStorage.setItem('jwtTokenVoter', userData.token);
          
          setTimeout(() => {
            modal.remove();
            window.location.replace(`index.html?Authorization=Bearer ${userData.token}`);
            resolve(true);
          }, 1500);
          
        } else if (result.success && result.voter_id !== userData.voterId) {
          // Face verified but wrong person
          throw new Error('Face verification failed: This face is registered to a different voter ID');
        } else {
          throw new Error('Face not recognized. Please try again.');
        }
        
      } catch (error) {
        console.error('Face verification error:', error);
        status.textContent = '❌ ' + error.message;
        status.style.color = '#dc3545';
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Verify Face';
      }
    };
    
    // Cancel button handler
    cancelBtn.onclick = () => {
      if (statusInterval) clearInterval(statusInterval);
      window.faceAuth.stopCamera();
      modal.remove();
      showMessage('Face verification cancelled. Please try logging in again.', 'info');
      reject(new Error('Face verification cancelled'));
    };
  });
}

// ===============================================
// Candidate Login Handler
// ===============================================
async function handleCandidateLogin(event) {
  event.preventDefault();
  
  const candidateId = document.getElementById('candidate-id').value.trim();
  const password = document.getElementById('candidate-password').value;
  const submitButton = event.target.querySelector('.login-btn');
  
  // Input validation
  if (!validateCandidateInputs(candidateId, password)) {
    return;
  }
  
  // Show loading state
  setLoadingState(submitButton, true, 'Authenticating...', 'candidate');
  
  try {
    const response = await authenticateCandidate(candidateId, password);
    
    if (response.success) {
      showMessage('🎉 Candidate authentication successful! Loading your dashboard...', 'success');
      
      // Store candidate token
      localStorage.setItem('jwtTokenCandidate', response.data.token);
      
      // Redirect to candidate dashboard
      setTimeout(() => {
        window.location.replace(`Candidate.html?Authorization=Bearer ${response.data.token}`);
      }, 1500);
      
    } else {
      throw new Error('Invalid candidate credentials');
    }
    
  } catch (error) {
    console.error('Candidate login failed:', error);
    showMessage(`❌ Candidate Login Failed: ${error.message}`, 'error');
    setLoadingState(submitButton, false, '', 'candidate');
  }
}

// ===============================================
// Authentication API Function
// ===============================================
async function authenticateUser(userId, password, expectedRole) {
  const token = userId; // Use userId as initial token
  
  const headers = {
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
// Candidate Authentication API Function
// ===============================================
async function authenticateCandidate(candidateId, password) {
  try {
    const response = await fetch(
      `http://127.0.0.1:8001/api/candidate/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: candidateId,
          password: password
        })
      }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid candidate ID or password');
      } else if (response.status === 403) {
        throw new Error('Candidate account is inactive');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Authentication failed (${response.status})`);
      }
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: {
        token: data.token,
        candidateId: data.candidateId,
        name: data.name
      }
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

function validateCandidateInputs(candidateId, password) {
  if (!candidateId || !password) {
    showMessage('❌ Please enter both Candidate ID and Password', 'error');
    return false;
  }
  
  if (candidateId.length < 3) {
    showMessage('❌ Candidate ID must be at least 3 characters long', 'error');
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
function setLoadingState(button, isLoading, loadingText = 'Loading...', buttonType = 'user') {
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
    const isCandidate = button.classList.contains('candidate-btn');
    
    let icon, text;
    if (isAdmin) {
      icon = 'fa-sign-in-alt';
      text = 'Access Admin Panel';
    } else if (isCandidate) {
      icon = 'fa-sign-in-alt';
      text = 'Access Candidate Portal';
    } else {
      icon = 'fa-vote-yea';
      text = 'Enter Voting Portal';
    }
    
    button.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${text}</span>
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

function createRippleEffect(element, event) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.width = ripple.style.height = size + 'px';
  if (event && event.clientX !== undefined) {
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
  } else {
    ripple.style.left = (rect.width / 2 - size / 2) + 'px';
    ripple.style.top = (rect.height / 2 - size / 2) + 'px';
  }
  ripple.classList.add('ripple');
  
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// ===============================================
// Project Info Modal Functionality
// ===============================================
function setupProjectInfoModal() {
  const projectInfoBtn = document.getElementById('projectInfoBtn');
  const projectModal = document.getElementById('projectModal');
  const modalClose = document.getElementById('modalClose');
  
  if (projectInfoBtn && projectModal && modalClose) {
    // Open modal on eye icon click
    projectInfoBtn.addEventListener('click', function(e) {
      e.preventDefault();
      projectModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      
      // Add click sound effect (optional)
      playClickSound();
    });
    
    // Close modal on close button click
    modalClose.addEventListener('click', function() {
      closeModal();
    });
    
    // Close modal when clicking outside the modal content
    projectModal.addEventListener('click', function(e) {
      if (e.target === projectModal) {
        closeModal();
      }
    });
    
    // Close modal on ESC key press
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && projectModal.classList.contains('active')) {
        closeModal();
      }
    });
  }
}

function closeModal() {
  const projectModal = document.getElementById('projectModal');
  if (projectModal) {
    projectModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }
}

function playClickSound() {
  // Optional: Add a subtle click sound effect
  // You can implement this if you have audio assets
  console.log('Project info modal opened');
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
