/**
 * EtherVox Add Candidate JavaScript
 * 
 * @file add-candidate.js
 * @description Handles candidate registration functionality
 * @version 1.0.0
 */

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
  setupFormValidation();
  setupFormSubmission();
});

// ===============================================
// AUTHENTICATION CHECK
// ===============================================
function checkAuthentication() {
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  if (!adminToken) {
    alert('⚠️ Unauthorized access. Please login as admin.');
    window.location.replace('/');
    return;
  }
}

// ===============================================
// NAVIGATION FUNCTIONS
// ===============================================
function goBackToDashboard() {
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  window.location.href = `/AdminDashboard.html?Authorization=Bearer ${adminToken}`;
}

function logout() {
  if (confirm('🔐 Are you sure you want to logout?')) {
    localStorage.removeItem('jwtTokenAdmin');
    localStorage.removeItem('jwtTokenVoter');
    sessionStorage.clear();
    window.location.replace('/');
  }
}

// ===============================================
// FORM VALIDATION
// ===============================================
function setupFormValidation() {
  const form = document.getElementById('candidateForm');
  const inputs = form.querySelectorAll('input, textarea');
  
  // Real-time validation
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      validateField(this);
    });
    
    input.addEventListener('input', function() {
      // Clear error state on input
      this.setCustomValidity('');
    });
  });
  
  // Password confirmation validation
  const password = document.getElementById('candidatePassword');
  const confirmPassword = document.getElementById('confirmPassword');
  
  confirmPassword.addEventListener('input', function() {
    if (this.value !== password.value) {
      this.setCustomValidity('Passwords do not match');
    } else {
      this.setCustomValidity('');
    }
  });
}

function validateField(field) {
  if (field.validity.valid) {
    field.style.borderColor = '#4CAF50';
  } else {
    field.style.borderColor = '#ff6b6b';
  }
}

// ===============================================
// FORM SUBMISSION
// ===============================================
function setupFormSubmission() {
  const form = document.getElementById('candidateForm');
  
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Validate form
    if (!form.checkValidity()) {
      showStatusMessage('❌ Please fill in all required fields correctly', 'error');
      return;
    }
    
    // Get form data
    const formData = {
      name: document.getElementById('name').value.trim(),
      age: parseInt(document.getElementById('age').value),
      dateOfBirth: document.getElementById('dateOfBirth').value,
      email: document.getElementById('email').value.trim(),
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      candidateAddress: document.getElementById('candidateAddress').value.trim(),
      party: document.getElementById('party').value.trim(),
      candidateId: document.getElementById('candidateId').value.trim(),
      candidatePassword: document.getElementById('candidatePassword').value
    };
    
    // Validate password match
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (formData.candidatePassword !== confirmPassword) {
      showStatusMessage('❌ Passwords do not match', 'error');
      return;
    }
    
    // Submit candidate data
    await submitCandidate(formData);
  });
  
  // Reset button
  const resetButtons = form.querySelectorAll('[type="reset"]');
  resetButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      setTimeout(() => {
        clearStatusMessage();
        resetFormStyles();
      }, 100);
    });
  });
}

// ===============================================
// SUBMIT CANDIDATE TO BACKEND
// ===============================================
async function submitCandidate(candidateData) {
  const submitButton = document.getElementById('addCandidate');
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<div class="spinner"></div> Adding Candidate...';
  
  showStatusMessage('⏳ Submitting candidate data...', 'info');
  
  try {
    const response = await fetch('http://127.0.0.1:8001/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(candidateData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showStatusMessage('✅ Candidate added successfully!', 'success');
      
      // Reset form after 2 seconds
      setTimeout(() => {
        document.getElementById('candidateForm').reset();
        resetFormStyles();
        clearStatusMessage();
      }, 2000);
      
    } else {
      throw new Error(data.detail || 'Failed to add candidate');
    }
    
  } catch (error) {
    console.error('Error adding candidate:', error);
    
    if (error.message.includes('Failed to fetch')) {
      showStatusMessage('❌ Cannot connect to server. Please ensure the Database API is running.', 'error');
    } else {
      showStatusMessage(`❌ Error: ${error.message}`, 'error');
    }
    
  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Add Candidate';
  }
}

// ===============================================
// UI HELPER FUNCTIONS
// ===============================================
function showStatusMessage(message, type = 'info') {
  const statusElement = document.getElementById('candidateStatus');
  
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      clearStatusMessage();
    }, 5000);
  }
}

function clearStatusMessage() {
  const statusElement = document.getElementById('candidateStatus');
  statusElement.className = 'status-message';
  statusElement.textContent = '';
  statusElement.style.display = 'none';
}

function resetFormStyles() {
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  });
}

// ===============================================
// FORM ENHANCEMENTS
// ===============================================

// Auto-format phone number
document.getElementById('phoneNumber').addEventListener('input', function(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 0 && !value.startsWith('+')) {
    // Add default country code if not present
    // This is just an example, adjust as needed
  }
});

// Auto-capitalize name
document.getElementById('name').addEventListener('blur', function(e) {
  e.target.value = e.target.value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
});

// Set max date for date of birth (must be at least 18 years old)
const today = new Date();
const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
document.getElementById('dateOfBirth').max = maxDate.toISOString().split('T')[0];

// ===============================================
// ERROR HANDLING
// ===============================================
window.addEventListener('error', function(event) {
  console.error('Add Candidate page error:', event.error);
  showStatusMessage('⚠️ An unexpected error occurred.', 'error');
});

// Prevent form submission on Enter key (except in textarea)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    if (e.target.form) {
      e.preventDefault();
    }
  }
});
