/**
 * EtherVox Add Candidate JavaScript
 * 
 * @file add-candidate.js
 * @description Handles candidate registration with blockchain and database integration
 * @version 2.0.0
 */

// Web3 and contract imports
const { Web3 } = require('web3');
const votingArtifacts = require('../../build/contracts/Voting.json');

// ===============================================
// API CONFIGURATION
// ===============================================
const API_BASE_URL = 'http://127.0.0.1:8001';

// ===============================================
// GLOBAL VARIABLES
// ===============================================
let web3 = null;
let account = null;
let votingContract = null;

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', async function() {
  checkAuthentication();
  setupFormValidation();
  setupFormSubmission();
  await initWeb3();
});

// ===============================================
// WEB3 & METAMASK INITIALIZATION
// ===============================================
async function initWeb3() {
  showStatusMessage('🔄 Connecting to MetaMask...', 'info');
  
  if (typeof window.ethereum === 'undefined') {
    showStatusMessage('❌ MetaMask not detected. Please install MetaMask to add candidates.', 'error');
    document.getElementById('addCandidate').disabled = true;
    return false;
  }
  
  try {
    // Initialize Web3
    web3 = new Web3(window.ethereum);
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      showStatusMessage('❌ Please connect your MetaMask wallet.', 'error');
      return false;
    }
    
    account = accounts[0];
    console.log('Connected account:', account);
    
    // Check network - should be Ganache (chain ID 1337 or 5777)
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Connected to chain ID:', chainId);
    
    // Initialize contract
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = votingArtifacts.networks[networkId];
    
    if (!deployedNetwork) {
      showStatusMessage(`❌ Contract not deployed on network ${networkId}. Please deploy the contract first.`, 'error');
      document.getElementById('addCandidate').disabled = true;
      return false;
    }
    
    votingContract = new web3.eth.Contract(
      votingArtifacts.abi,
      deployedNetwork.address
    );
    
    console.log('Contract initialized at:', deployedNetwork.address);
    
    // Verify admin is contract owner
    const contractOwner = await votingContract.methods.owner().call();
    console.log('Contract owner:', contractOwner);
    console.log('Current account:', account);
    
    if (contractOwner.toLowerCase() !== account.toLowerCase()) {
      showStatusMessage('⚠️ Warning: You are not the contract owner. Only the owner can add candidates on the blockchain.', 'warning');
    } else {
      showStatusMessage('✅ MetaMask connected. You are the contract owner.', 'success');
      setTimeout(clearStatusMessage, 3000);
    }
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', function(accounts) {
      if (accounts.length === 0) {
        showStatusMessage('❌ MetaMask disconnected.', 'error');
      } else {
        account = accounts[0];
        console.log('Account changed to:', account);
        showStatusMessage('🔄 Account changed. Please verify you are the contract owner.', 'info');
      }
    });
    
    return true;
    
  } catch (error) {
    console.error('Web3 initialization error:', error);
    showStatusMessage(`❌ MetaMask connection failed: ${error.message}`, 'error');
    return false;
  }
}

// ===============================================
// AUTHENTICATION CHECK
// ===============================================
function checkAuthentication() {
  // First, check if token is in URL (passed from dashboard)
  const urlParams = new URLSearchParams(window.location.search);
  const authHeader = urlParams.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tokenFromUrl = authHeader.replace('Bearer ', '');
    // Store in localStorage for future use
    localStorage.setItem('jwtTokenAdmin', tokenFromUrl);
    console.log('[AUTH] Token stored from URL');
  }
  
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  if (!adminToken) {
    console.error('[AUTH] No admin token found in localStorage or URL');
    alert('⚠️ Unauthorized access. Please login as admin.');
    window.location.replace('/');
    return false;
  }
  
  console.log('[AUTH] Admin token found:', adminToken.substring(0, 30) + '...');
  return true;
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
      panNumber: document.getElementById('panNumber').value.trim().toUpperCase(),
      aadharNumber: document.getElementById('aadharNumber').value.trim(),
      voterEpicNumber: document.getElementById('voterEpicNumber').value.trim().toUpperCase(),
      email: document.getElementById('email').value.trim(),
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      candidateAddress: document.getElementById('candidateAddress').value.trim(),
      party: document.getElementById('party').value.trim(),
      electionCenter: document.getElementById('electionCenter')?.value?.trim() || 'Default Election Center',
      candidateId: document.getElementById('candidateId').value.trim(),
      candidatePassword: document.getElementById('candidatePassword').value
    };
    
    // Debug: Log collected form data
    console.log('=== FORM DATA COLLECTED ===');
    console.log('PAN Number:', formData.panNumber);
    console.log('Aadhar Number:', formData.aadharNumber);
    console.log('Voter EPIC Number:', formData.voterEpicNumber);
    console.log('All fields:', formData);
    
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
// SUBMIT CANDIDATE TO BLOCKCHAIN & DATABASE
// ===============================================
async function submitCandidate(candidateData) {
  const submitButton = document.getElementById('addCandidate');
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  // Show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<div class="spinner"></div> Processing...';
  
  let blockchainTxHash = null;
  let blockchainSuccess = false;
  
  // ========================================
  // STEP 1: Try to add candidate to blockchain (optional)
  // ========================================
  try {
    if (!web3 || !votingContract || !account) {
      showStatusMessage('🔄 Reconnecting to MetaMask...', 'info');
      const connected = await initWeb3();
      if (!connected) {
        console.warn('MetaMask not connected - will save to database only');
        showStatusMessage('⚠️ MetaMask not connected - saving to database only...', 'warning');
      } else {
        // Try blockchain transaction
        showStatusMessage('🦊 Please confirm the transaction in MetaMask...', 'info');
        console.log('Adding candidate to blockchain:', candidateData);
        
        // Call smart contract addCandidate function
        const tx = await votingContract.methods.addCandidate(
          candidateData.name,
          candidateData.age,
          candidateData.dateOfBirth,
          candidateData.panNumber,
          candidateData.aadharNumber,
          candidateData.voterEpicNumber,
          candidateData.electionCenter,
          candidateData.party,
          candidateData.candidateAddress,
          candidateData.email,
          candidateData.phoneNumber,
          candidateData.candidateId,
          candidateData.candidatePassword
        ).send({ 
          from: account,
          gas: 600000
        });
        
        blockchainTxHash = tx.transactionHash;
        blockchainSuccess = true;
        console.log('✅ Blockchain transaction successful:', tx);
        console.log('Transaction hash:', blockchainTxHash);
        showStatusMessage('✅ Blockchain transaction confirmed! Saving to database...', 'success');
      }
    }
  } catch (blockchainError) {
    console.error('⚠️ Blockchain transaction failed:', blockchainError);
    showStatusMessage('⚠️ Blockchain failed - continuing with database save...', 'warning');
  }
  
  // ========================================
  // STEP 2: Save candidate to MongoDB (always attempt)
  // ========================================
  try {
    
    // ========================================
    // STEP 2: Save candidate to MongoDB with blockchain address
    // ========================================
    const mongoData = {
      ...candidateData,
      blockchainAddress: blockchainTxHash || null,
      blockchainAccount: account || null
    };
    
    console.log('Saving to MongoDB:', mongoData);
    console.log('MongoDB data includes:', Object.keys(mongoData));
    
    const response = await fetch(`${API_BASE_URL}/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(mongoData)
    });
    
    const data = await response.json();
    console.log('MongoDB response:', response.status, data);
    
    if (response.ok) {
      let successMessage = '✅ Candidate added successfully to database!';
      if (blockchainSuccess) {
        successMessage += `\n📦 Blockchain TX: ${blockchainTxHash.substring(0, 20)}...`;
      } else {
        successMessage += '\n⚠️ Note: Not yet registered on blockchain';
      }
      showStatusMessage(successMessage, 'success');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        document.getElementById('candidateForm').reset();
        resetFormStyles();
        clearStatusMessage();
      }, 3000);
      
    } else {
      // Database failed - show detailed error
      let errorMessage = 'Database save failed';
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(err => {
            const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        }
      }
      
      if (blockchainSuccess) {
        showStatusMessage(`⚠️ Blockchain OK (TX: ${blockchainTxHash.substring(0, 15)}...) but database failed: ${errorMessage}`, 'warning');
      } else {
        showStatusMessage(`❌ Database save failed: ${errorMessage}`, 'error');
      }
    }
    
  } catch (databaseError) {
    console.error('Error saving to database:', databaseError);
    
    // Determine error type and show appropriate message
    if (databaseError.message && databaseError.message.includes('Failed to fetch')) {
      showStatusMessage('❌ Cannot connect to database server. Please ensure the Database API is running on port 8001.', 'error');
    } else {
      showStatusMessage(`❌ Database error: ${databaseError.message}`, 'error');
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

// Auto-capitalize name
document.getElementById('name')?.addEventListener('blur', function(e) {
  e.target.value = e.target.value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
});

// Set max date for date of birth (must be at least 18 years old)
const today = new Date();
const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const dobField = document.getElementById('dateOfBirth');
if (dobField) {
  dobField.max = maxDate.toISOString().split('T')[0];
}

// Auto-format Aadhar Number with spaces
document.getElementById('aadharNumber')?.addEventListener('input', function(e) {
  let value = e.target.value.replace(/\s/g, ''); // Remove existing spaces
  if (value.length > 12) {
    value = value.substring(0, 12); // Limit to 12 digits
  }
  // Add spaces after every 4 digits
  const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
  e.target.value = formatted;
});

// Auto-uppercase PAN Number
document.getElementById('panNumber')?.addEventListener('input', function(e) {
  e.target.value = e.target.value.toUpperCase();
});

// Auto-uppercase Voter EPIC Number
document.getElementById('voterEpicNumber')?.addEventListener('input', function(e) {
  e.target.value = e.target.value.toUpperCase();
});

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

// Make functions globally available
window.goBackToDashboard = goBackToDashboard;
window.logout = logout;