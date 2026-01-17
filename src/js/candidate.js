/**
 * EtherVox Candidate Dashboard
 * 
 * @file candidate.js
 * @author EtherVox Development Team
 * @description Frontend logic for candidate dashboard with profile display and password reset
 * @version 1.0.0
 * 
 * Features:
 * - JWT token authentication
 * - Fetch candidate profile from MongoDB
 * - Display candidate information
 * - Password reset functionality
 * - Real-time UI updates
 */

// ===============================================
// CONFIGURATION
// ===============================================
const API_BASE_URL = 'http://127.0.0.1:8001';

// ===============================================
// DOM READY INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
  initializeDashboard();
  setupEventListeners();
});

// ===============================================
// DASHBOARD INITIALIZATION
// ===============================================
async function initializeDashboard() {
  // Check if user is authenticated
  const token = getAuthToken();
  
  if (!token) {
    showMessage('Authentication required. Please login.', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return;
  }

  // Fetch and display candidate profile
  await fetchCandidateProfile(token);
  
  // Initialize password toggle functionality
  setupPasswordToggle();
}

// ===============================================
// EVENT LISTENERS
// ===============================================
function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Password reset form
  const passwordForm = document.getElementById('password-reset-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordReset);
  }
}

// ===============================================
// AUTHENTICATION UTILITIES
// ===============================================
function getAuthToken() {
  // Get token from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('Authorization');
  
  if (token && token.startsWith('Bearer ')) {
    return token.split('Bearer ')[1];
  }
  
  return null;
}

function handleLogout() {
  showMessage('Logging out...', 'info');
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// ===============================================
// FETCH CANDIDATE PROFILE
// ===============================================
async function fetchCandidateProfile(token) {
  try {
    showMessage('Loading your profile...', 'info');

    const response = await fetch(`${API_BASE_URL}/api/candidate/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to fetch profile data');
    }

    const data = await response.json();
    console.log('Profile data:', data);

    // Display the candidate information
    displayCandidateInfo(data);
    
    // Clear loading message
    clearMessages();

  } catch (error) {
    console.error('Error fetching profile:', error);
    showMessage(error.message, 'error');
    
    if (error.message.includes('Session expired')) {
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }
}

// ===============================================
// DISPLAY CANDIDATE INFORMATION
// ===============================================
function displayCandidateInfo(candidate) {
  // Personal Information
  setElementText('candidate-name-header', candidate.name);
  setElementText('candidate-name-welcome', candidate.name);
  setElementText('candidate-name', candidate.name);
  setElementText('candidate-id', candidate.candidateId);
  setElementText('candidate-age', candidate.age);
  setElementText('candidate-dob', formatDate(candidate.dateOfBirth));
  setElementText('candidate-email', candidate.email);
  setElementText('candidate-phone', candidate.phoneNumber);

  // Election & Party Information
  setElementText('candidate-party', candidate.party);
  setElementText('candidate-center', candidate.electionCenter || 'Not specified');
  setElementText('candidate-address', candidate.candidateAddress);
  setElementText('election-start', candidate.electionStartDate ? formatDate(candidate.electionStartDate) : 'Not set');
  setElementText('election-end', candidate.electionEndDate ? formatDate(candidate.electionEndDate) : 'Not set');

  // Status
  const statusElement = document.getElementById('candidate-status');
  if (statusElement) {
    const statusText = candidate.isActive ? 'Active' : 'Inactive';
    const statusClass = candidate.isActive ? 'active' : 'inactive';
    statusElement.innerHTML = `
      <span class="status-indicator ${statusClass}"></span>
      <span>${statusText}</span>
    `;
    
    if (!candidate.isActive) {
      statusElement.style.background = 'rgba(239, 68, 68, 0.1)';
      statusElement.style.borderColor = '#ef4444';
      statusElement.style.color = '#ef4444';
    }
  }

  // Blockchain Information
  if (candidate.blockchainAddress) {
    setElementText('blockchain-address', candidate.blockchainAddress);
  } else {
    const blockchainAddressEl = document.getElementById('blockchain-address');
    if (blockchainAddressEl) {
      blockchainAddressEl.innerHTML = '<span style="color: var(--text-muted);">Not yet registered on blockchain</span>';
    }
  }

  if (candidate.blockchainAccount) {
    setElementText('blockchain-account', candidate.blockchainAccount);
  } else {
    const blockchainAccountEl = document.getElementById('blockchain-account');
    if (blockchainAccountEl) {
      blockchainAccountEl.innerHTML = '<span style="color: var(--text-muted);">Not available</span>';
    }
  }

  setElementText('created-at', formatDate(candidate.createdAt));
}

// ===============================================
// PASSWORD RESET
// ===============================================
async function handlePasswordReset(event) {
  event.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Validation
  if (newPassword !== confirmPassword) {
    showMessage('New passwords do not match!', 'error');
    return;
  }

  if (newPassword.length < 8) {
    showMessage('Password must be at least 8 characters long!', 'error');
    return;
  }

  if (currentPassword === newPassword) {
    showMessage('New password must be different from current password!', 'error');
    return;
  }

  const token = getAuthToken();
  if (!token) {
    showMessage('Authentication error. Please login again.', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    return;
  }

  try {
    showMessage('Updating password...', 'info');

    const response = await fetch(`${API_BASE_URL}/api/candidate/reset-password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to reset password');
    }

    showMessage('Password updated successfully!', 'success');
    
    // Clear form
    document.getElementById('password-reset-form').reset();
    
    // Optionally redirect to login after success
    setTimeout(() => {
      showMessage('Please login with your new password', 'info');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }, 2000);

  } catch (error) {
    console.error('Password reset error:', error);
    showMessage(error.message, 'error');
  }
}

// ===============================================
// PASSWORD TOGGLE FUNCTIONALITY
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
// UTILITY FUNCTIONS
// ===============================================
function setElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text || 'N/A';
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Not specified';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

function showMessage(message, type = 'info') {
  const container = document.getElementById('message-container');
  if (!container) return;

  // Clear existing messages
  container.innerHTML = '';

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' :
               type === 'error' ? 'fa-exclamation-circle' :
               'fa-info-circle';
  
  messageDiv.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(messageDiv);

  // Auto-remove after 5 seconds (except for errors and success which stay longer)
  const timeout = type === 'info' ? 3000 : 5000;
  setTimeout(() => {
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (messageDiv.parentNode === container) {
        container.removeChild(messageDiv);
      }
    }, 300);
  }, timeout);
}

function clearMessages() {
  const container = document.getElementById('message-container');
  if (container) {
    container.innerHTML = '';
  }
}

// ===============================================
// ERROR HANDLING
// ===============================================
window.addEventListener('error', function(event) {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});
