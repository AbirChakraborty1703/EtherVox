/**
 * EtherVox Add Candidate JavaScript
 * 
 * @file add-candidate.js
 * @description Handles candidate registration with blockchain and database integration
 * @version 2.0.0
 */

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
let votingArtifacts = null;

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
  
  if (typeof Web3 === 'undefined') {
    showStatusMessage('❌ Web3 not loaded. Please refresh the page.', 'error');
    document.getElementById('addCandidate').disabled = true;
    return false;
  }
  
  if (typeof window.ethereum === 'undefined') {
    showStatusMessage('❌ MetaMask not detected. Please install MetaMask to add candidates.', 'error');
    document.getElementById('addCandidate').disabled = true;
    return false;
  }
  
  try {
    // Initialize Web3 using the globally available Web3
    // Note: MetaMask's SES (Secure EcmaScript) may show "Removing unpermitted intrinsics" warnings
    // This is a normal security feature and does not affect functionality
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
    
    // Load contract artifacts
    if (!votingArtifacts) {
      console.log('Loading contract artifacts...');
      const response = await fetch('/contracts/Voting.json');
      if (!response.ok) {
        throw new Error('Failed to load contract artifacts');
      }
      votingArtifacts = await response.json();
      console.log('Contract artifacts loaded');
    }
    
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
        console.log('[BLOCKCHAIN] Adding candidate to blockchain:', {
          name: candidateData.name,
          age: candidateData.age,
          dateOfBirth: candidateData.dateOfBirth,
          panNumber: candidateData.panNumber,
          aadharNumber: candidateData.aadharNumber,
          voterEpicNumber: candidateData.voterEpicNumber,
          electionCenter: candidateData.electionCenter,
          party: candidateData.party,
          candidateAddress: candidateData.candidateAddress,
          email: candidateData.email,
          phoneNumber: candidateData.phoneNumber,
          candidateId: candidateData.candidateId,
          hasPassword: !!candidateData.candidatePassword
        });

        // Validate all required fields before calling blockchain
        const requiredFields = [
          'name', 'age', 'dateOfBirth', 'panNumber', 'aadharNumber', 
          'voterEpicNumber', 'electionCenter', 'party', 'candidateAddress', 
          'email', 'phoneNumber', 'candidateId', 'candidatePassword'
        ];
        
        const missingFields = [];
        for (const field of requiredFields) {
          if (!candidateData[field] || (typeof candidateData[field] === 'string' && candidateData[field].trim() === '')) {
            missingFields.push(field);
          }
        }

        if (missingFields.length > 0) {
          const errorMsg = `Missing or empty required fields: ${missingFields.join(', ')}`;
          console.error('[BLOCKCHAIN] Validation failed:', errorMsg);
          throw new Error(errorMsg);
        }

        if (candidateData.age < 18) {
          const errorMsg = `Age must be at least 18 (received: ${candidateData.age})`;
          console.error('[BLOCKCHAIN] Validation failed:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[BLOCKCHAIN] ✅ All required fields validated');
        
        // Log actual values with types for debugging
        console.log('[BLOCKCHAIN] Detailed parameter inspection:');
        console.table({
          name: { value: candidateData.name, type: typeof candidateData.name, length: candidateData.name?.length },
          age: { value: candidateData.age, type: typeof candidateData.age, isEmpty: candidateData.age === 0 },
          dateOfBirth: { value: candidateData.dateOfBirth, type: typeof candidateData.dateOfBirth, length: candidateData.dateOfBirth?.length },
          panNumber: { value: candidateData.panNumber, type: typeof candidateData.panNumber, length: candidateData.panNumber?.length },
          aadharNumber: { value: candidateData.aadharNumber, type: typeof candidateData.aadharNumber, length: candidateData.aadharNumber?.length },
          voterEpicNumber: { value: candidateData.voterEpicNumber, type: typeof candidateData.voterEpicNumber, length: candidateData.voterEpicNumber?.length },
          electionCenter: { value: candidateData.electionCenter, type: typeof candidateData.electionCenter, length: candidateData.electionCenter?.length },
          party: { value: candidateData.party, type: typeof candidateData.party, length: candidateData.party?.length },
          candidateAddress: { value: candidateData.candidateAddress, type: typeof candidateData.candidateAddress, length: candidateData.candidateAddress?.length },
          email: { value: candidateData.email, type: typeof candidateData.email, length: candidateData.email?.length },
          phoneNumber: { value: candidateData.phoneNumber, type: typeof candidateData.phoneNumber, length: candidateData.phoneNumber?.length },
          candidateId: { value: candidateData.candidateId, type: typeof candidateData.candidateId, length: candidateData.candidateId?.length },
          candidatePassword: { value: '***HIDDEN***', type: typeof candidateData.candidatePassword, length: candidateData.candidatePassword?.length }
        });

        // First simulate the transaction to check for errors
        try {
          await votingContract.methods.addCandidate(
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
          ).call({ from: account });
          console.log('[BLOCKCHAIN] ✅ Call simulation successful');
        } catch (callError) {
          console.error('[BLOCKCHAIN] ❌ Call simulation failed:', callError);
          console.error('[BLOCKCHAIN] Error details:', {
            message: callError.message,
            code: callError.code,
            data: callError.data
          });
          throw new Error(`Contract will revert: ${callError.message}`);
        }
        
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
          gas: 3000000
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

// ===============================================
// SYNC ALL CANDIDATES TO BLOCKCHAIN
// ===============================================
async function syncCandidatesToBlockchain() {
  const syncButton = document.getElementById('syncCandidates');
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  // Confirm before syncing
  if (!confirm('🔗 Sync all MongoDB candidates to blockchain?\n\nThis may take a few minutes and require multiple MetaMask confirmations.')) {
    return;
  }
  
  try {
    // Disable button and show loading
    syncButton.disabled = true;
    syncButton.innerHTML = '<div class="spinner"></div> Syncing...';
    showStatusMessage('🔄 Starting sync process...', 'info');
    
    // Step 1: Ensure Web3 is connected
    if (!web3 || !votingContract || !account) {
      showStatusMessage('🔄 Connecting to MetaMask...', 'info');
      const connected = await initWeb3();
      if (!connected) {
        throw new Error('MetaMask connection failed. Please connect MetaMask.');
      }
    }
    
    // Verify admin is contract owner
    const contractOwner = await votingContract.methods.owner().call();
    if (contractOwner.toLowerCase() !== account.toLowerCase()) {
      throw new Error('Only the contract owner can sync candidates to blockchain.');
    }
    
    // Step 2: Fetch all candidates from MongoDB
    showStatusMessage('📥 Fetching candidates from database...', 'info');
    const response = await fetch(`${API_BASE_URL}/candidates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch candidates: ${response.status}`);
    }
    
    const data = await response.json();
    const candidates = data.candidates || [];
    
    if (candidates.length === 0) {
      showStatusMessage('⚠️ No candidates found in database.', 'warning');
      return;
    }
    
    console.log(`Found ${candidates.length} candidates in MongoDB`);
    
    // Step 3: Get current blockchain candidate count
    const blockchainCount = await votingContract.methods.getCountCandidates().call();
    console.log(`Current blockchain candidates: ${blockchainCount}`);
    
    // Step 4: Determine which candidates need syncing
    const candidatesToSync = candidates.filter((candidate, index) => {
      // Sync if: not marked as synced OR index >= blockchain count
      return !candidate.syncedToBlockchain || index >= parseInt(blockchainCount);
    });
    
    if (candidatesToSync.length === 0) {
      showStatusMessage('✅ All candidates are already synced to blockchain!', 'success');
      return;
    }
    
    console.log(`Need to sync ${candidatesToSync.length} candidates`);
    showStatusMessage(`⏳ Syncing ${candidatesToSync.length} candidates... Please confirm in MetaMask.`, 'info');
    
    // Step 5: Sync each candidate
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < candidatesToSync.length; i++) {
      const candidate = candidatesToSync[i];
      const progress = `[${i + 1}/${candidatesToSync.length}]`;
      
      try {
        console.log(`${progress} Syncing candidate: ${candidate.name}`);
        showStatusMessage(`${progress} Syncing ${candidate.name}... Please confirm in MetaMask.`, 'info');
        
        // Add candidate to blockchain
        const tx = await votingContract.methods.addCandidate(
          candidate.name || 'Unknown',
          parseInt(candidate.age) || 18,
          candidate.dateOfBirth || '01-01-2000',
          candidate.panNumber || 'XXXXX0000X',
          candidate.aadharNumber || '000000000000',
          candidate.voterEpicNumber || 'XXX0000000',
          candidate.electionCenter || 'Default Center',
          candidate.party || 'Independent',
          candidate.candidateAddress || 'Not Provided',
          candidate.email || 'not@provided.com',
          candidate.phoneNumber || '0000000000',
          candidate.candidateId || `CAND${i + 1}`,
          candidate.candidatePassword || 'default_password'
        ).send({ 
          from: account, 
          gas: 3000000 
        });
        
        console.log(`✅ ${progress} Blockchain TX: ${tx.transactionHash}`);
        
        // Update MongoDB record
        const updateResponse = await fetch(`${API_BASE_URL}/candidates/${candidate._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            blockchainAddress: tx.transactionHash,
            blockchainAccount: account,
            syncedToBlockchain: true,
            syncedAt: new Date().toISOString()
          })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ ${progress} MongoDB updated for ${candidate.name}`);
        } else {
          console.warn(`⚠️ ${progress} MongoDB update failed for ${candidate.name}`);
        }
        
        successCount++;
        showStatusMessage(`✅ ${progress} ${candidate.name} synced successfully!`, 'success');
        
      } catch (error) {
        errorCount++;
        const errorMsg = `${candidate.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${progress} Error syncing ${candidate.name}:`, error);
        showStatusMessage(`❌ ${progress} Failed: ${candidate.name}`, 'error');
      }
    }
    
    // Step 6: Show final results
    const finalBlockchainCount = await votingContract.methods.getCountCandidates().call();
    let finalMessage = `\n📊 Sync Complete!\n\n`;
    finalMessage += `✅ Successfully synced: ${successCount}\n`;
    if (errorCount > 0) {
      finalMessage += `❌ Failed: ${errorCount}\n\n`;
      finalMessage += `Errors:\n${errors.join('\n')}`;
    }
    finalMessage += `\n\n📦 Total on blockchain: ${finalBlockchainCount}`;
    
    if (errorCount === 0) {
      showStatusMessage(finalMessage, 'success');
      alert(finalMessage);
    } else {
      showStatusMessage(finalMessage, 'warning');
      alert(finalMessage);
    }
    
    console.log('='.repeat(60));
    console.log('Sync Summary:');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Blockchain Count: ${finalBlockchainCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Sync process failed:', error);
    showStatusMessage(`❌ Sync failed: ${error.message}`, 'error');
    alert(`❌ Sync failed:\n\n${error.message}`);
    
  } finally {
    // Restore button
    syncButton.disabled = false;
    syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync All to Blockchain';
  }
}

// Make functions globally available
window.goBackToDashboard = goBackToDashboard;
window.logout = logout;
window.syncCandidatesToBlockchain = syncCandidatesToBlockchain;