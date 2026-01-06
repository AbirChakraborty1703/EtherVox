/**
 * EtherVox Add Candidate JavaScript (Browser Version)
 * 
 * @file add-candidate.js
 * @description Handles candidate registration with blockchain and database integration
 * @version 2.1.0 - Browser compatible (no require/webpack needed)
 */

// ===============================================
// GLOBAL VARIABLES
// ===============================================
let web3 = null;
let account = null;
let votingContract = null;
let votingContractABI = null;
let votingContractAddress = null;

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', async function () {
  console.log('[ADD-CANDIDATE] Initializing...');

  // Check and store authentication
  if (!checkAuthentication()) {
    return;
  }

  setupFormValidation();
  setupFormSubmission();

  // Wait for Web3 to be available from CDN
  await waitForWeb3();

  // Load contract info and initialize Web3
  await loadContractInfo();
  await initWeb3();
});

// ===============================================
// WAIT FOR WEB3 TO LOAD FROM CDN
// ===============================================
function waitForWeb3() {
  return new Promise((resolve) => {
    if (typeof Web3 !== 'undefined') {
      console.log('[WEB3] Web3 library already loaded');
      resolve();
    } else {
      console.log('[WEB3] Waiting for Web3 library to load...');
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (typeof Web3 !== 'undefined') {
          console.log('[WEB3] Web3 library loaded successfully');
          clearInterval(checkInterval);
          resolve();
        } else if (attempts > 50) {
          console.error('[WEB3] Timeout waiting for Web3 library');
          clearInterval(checkInterval);
          resolve(); // Continue anyway, will show error later
        }
      }, 100);
    }
  });
}

// ===============================================
// LOAD CONTRACT INFO FROM BUILD
// ===============================================
async function loadContractInfo() {
  try {
    const response = await fetch('/contracts/Voting.json');
    if (!response.ok) {
      throw new Error('Failed to load contract ABI');
    }
    const contractData = await response.json();
    votingContractABI = contractData.abi;

    // Get the deployed contract address from networks
    if (contractData.networks && contractData.networks['5777']) {
      votingContractAddress = contractData.networks['5777'].address;
    } else {
      throw new Error('Contract not deployed on Ganache network (5777)');
    }
    console.log('[CONTRACT] Loaded contract address:', votingContractAddress);
  } catch (error) {
    console.error('[CONTRACT] Error loading contract info:', error);
    showStatusMessage('⚠️ Could not load smart contract. Blockchain features may not work.', 'warning');
  }
}

// ===============================================
// WEB3 & METAMASK INITIALIZATION
// ===============================================
async function initWeb3() {
  showStatusMessage('🔄 Connecting to MetaMask...', 'info');

  if (typeof Web3 === 'undefined') {
    showStatusMessage('❌ Web3 library not loaded. Please refresh the page.', 'error');
    console.error('[WEB3] Web3 is not defined - library failed to load');
    return false;
  }

  if (typeof window.ethereum === 'undefined') {
    showStatusMessage('⚠️ MetaMask not detected. Please install MetaMask extension.', 'warning');
    console.error('[WEB3] window.ethereum not found - MetaMask not installed');
    return false;
  }

  try {
    console.log('[WEB3] Requesting account access...');

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      showStatusMessage('❌ Please connect your MetaMask wallet.', 'error');
      return false;
    }

    account = accounts[0];
    console.log('[WEB3] Connected account:', account);

    // Initialize Web3
    web3 = new Web3(window.ethereum);

    // Check network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const chainIdDec = parseInt(chainId, 16);
    console.log('[WEB3] Connected to chain ID:', chainIdDec, '(hex:', chainId + ')');

    // Verify we're on Ganache (network 5777 or 1337)
    if (chainIdDec !== 5777 && chainIdDec !== 1337) {
      showStatusMessage(`⚠️ Please switch MetaMask to Ganache network (Chain ID: 5777). Currently on: ${chainIdDec}`, 'warning');
      console.warn('[WEB3] Not on Ganache network!');
    }

    // Initialize contract if we have the ABI and address
    if (votingContractABI && votingContractAddress) {
      votingContract = new web3.eth.Contract(votingContractABI, votingContractAddress);
      console.log('[WEB3] Contract initialized at:', votingContractAddress);
      console.log('[WEB3] Using admin wallet:', account);

      // Show success - admin can use their own wallet
      showStatusMessage(`✅ MetaMask connected!\n🔐 Your admin wallet: ${account}`, 'success');
      setTimeout(clearStatusMessage, 3000);
    }

    // Listen for account changes
    window.ethereum.on('accountsChanged', function (accounts) {
      if (accounts.length === 0) {
        showStatusMessage('❌ MetaMask disconnected.', 'error');
        account = null;
      } else {
        account = accounts[0];
        console.log('[WEB3] Account changed to:', account);
        showStatusMessage(`🔄 Account changed to: ${account.substring(0, 10)}...`, 'info');
        setTimeout(clearStatusMessage, 3000);
      }
    });

    // Listen for network changes
    window.ethereum.on('chainChanged', function (chainId) {
      console.log('[WEB3] Network changed to:', chainId);
      window.location.reload();
    });

    return true;

  } catch (error) {
    console.error('[WEB3] Initialization error:', error);

    if (error.code === 4001) {
      showStatusMessage('❌ MetaMask connection rejected by user.', 'error');
    } else if (error.message.includes('User rejected')) {
      showStatusMessage('❌ Please approve the connection request in MetaMask.', 'error');
    } else {
      showStatusMessage(`❌ MetaMask error: ${error.message}`, 'error');
    }

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
    console.error('[AUTH] No admin token found');
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
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea');

  inputs.forEach(input => {
    input.addEventListener('blur', function () {
      validateField(this);
    });

    input.addEventListener('input', function () {
      this.setCustomValidity('');
    });
  });

  // Password confirmation
  const password = document.getElementById('candidatePassword');
  const confirmPassword = document.getElementById('confirmPassword');

  if (confirmPassword && password) {
    confirmPassword.addEventListener('input', function () {
      if (this.value !== password.value) {
        this.setCustomValidity('Passwords do not match');
      } else {
        this.setCustomValidity('');
      }
    });
  }
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
  if (!form) {
    console.error('[FORM] candidateForm not found!');
    return;
  }

  console.log('[FORM] Setting up form submission handler');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('[FORM] Form submitted - prevented default');

    // Validate form
    if (!form.checkValidity()) {
      showStatusMessage('❌ Please fill in all required fields correctly', 'error');
      return false;
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
      electionCenter: document.getElementById('electionCenter')?.value?.trim() || 'Default Election Center',
      candidateId: document.getElementById('candidateId').value.trim(),
      candidatePassword: document.getElementById('candidatePassword').value
    };

    console.log('[FORM] Form data collected:', formData.name);

    // Validate password match
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (formData.candidatePassword !== confirmPassword) {
      showStatusMessage('❌ Passwords do not match', 'error');
      return false;
    }

    // Submit candidate data
    await submitCandidate(formData);

    return false;
  });

  // Reset button
  const resetButtons = form.querySelectorAll('[type="reset"]');
  resetButtons.forEach(btn => {
    btn.addEventListener('click', function () {
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

  try {
    // ========================================
    // STEP 1: Try to add to blockchain (if available)
    // ========================================
    if (web3 && votingContract && account) {
      showStatusMessage('🦊 Please confirm the transaction in MetaMask...', 'info');
      console.log('[BLOCKCHAIN] Adding candidate to blockchain...');

      try {
        const tx = await votingContract.methods.addCandidate(
          candidateData.name,
          candidateData.age,
          candidateData.dateOfBirth,
          candidateData.electionCenter,
          candidateData.party,
          candidateData.candidateAddress,
          candidateData.email,
          candidateData.phoneNumber,
          candidateData.candidateId,
          candidateData.candidatePassword
        ).send({
          from: account,
          gas: 500000
        });

        blockchainTxHash = tx.transactionHash;
        console.log('[BLOCKCHAIN] Transaction successful:', blockchainTxHash);
        showStatusMessage('✅ Blockchain transaction confirmed! Saving to database...', 'success');
      } catch (blockchainError) {
        console.warn('[BLOCKCHAIN] Error:', blockchainError.message);
        if (blockchainError.message.includes('User denied') || blockchainError.message.includes('User rejected')) {
          showStatusMessage('❌ Transaction cancelled. Candidate not added.', 'error');
          throw blockchainError;
        }
        showStatusMessage('⚠️ Blockchain failed, saving to database only...', 'warning');
      }
    } else {
      showStatusMessage('⏳ Saving candidate to database...', 'info');
    }

    // ========================================
    // STEP 2: Save candidate to MongoDB
    // ========================================
    const mongoData = {
      ...candidateData,
      blockchainAddress: blockchainTxHash || null,
      blockchainAccount: account || null
    };

    console.log('[DATABASE] Saving to MongoDB...');

    const response = await fetch('http://127.0.0.1:8001/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(mongoData)
    });

    const data = await response.json();
    console.log('[DATABASE] Response:', response.status, data);

    if (response.ok) {
      const successMsg = blockchainTxHash
        ? `✅ Candidate added successfully!\n📦 TX: ${blockchainTxHash.substring(0, 20)}...`
        : '✅ Candidate saved to database successfully!';
      showStatusMessage(successMsg, 'success');

      // Reset form after 3 seconds
      setTimeout(() => {
        document.getElementById('candidateForm').reset();
        resetFormStyles();
        clearStatusMessage();
      }, 3000);

    } else {
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
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('[ERROR] Adding candidate:', error);

    if (error.message.includes('User denied') || error.message.includes('User rejected')) {
      // Already handled above
    } else if (error.message.includes('NotOwner')) {
      showStatusMessage('❌ Only the contract owner can add candidates.', 'error');
    } else if (error.message.includes('Failed to fetch')) {
      showStatusMessage('❌ Cannot connect to database server.', 'error');
    } else {
      showStatusMessage(`❌ Error: ${error.message}`, 'error');
    }

  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Add Candidate';
  }
}

// ===============================================
// UI HELPER FUNCTIONS
// ===============================================
function showStatusMessage(message, type = 'info') {
  const statusElement = document.getElementById('candidateStatus');
  if (!statusElement) return;

  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  statusElement.style.display = 'block';

  if (type === 'success') {
    setTimeout(clearStatusMessage, 5000);
  }
}

function clearStatusMessage() {
  const statusElement = document.getElementById('candidateStatus');
  if (!statusElement) return;

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
document.addEventListener('DOMContentLoaded', function () {
  // Auto-capitalize name
  const nameField = document.getElementById('name');
  if (nameField) {
    nameField.addEventListener('blur', function (e) {
      e.target.value = e.target.value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    });
  }

  // Set max date for date of birth
  const dobField = document.getElementById('dateOfBirth');
  if (dobField) {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    dobField.max = maxDate.toISOString().split('T')[0];
  }
});

// Make functions globally available
window.goBackToDashboard = goBackToDashboard;
window.logout = logout;
window.syncCandidatesToBlockchain = syncCandidatesToBlockchain;

// ===============================================
// SYNC CANDIDATES TO BLOCKCHAIN
// ===============================================
async function syncCandidatesToBlockchain() {
  const syncButton = document.getElementById('syncCandidates');

  if (!confirm('🔄 Sync all MongoDB candidates to blockchain?\n\nThis will add candidates from the database to the smart contract.\n\nNote: Candidates already on blockchain will be skipped.')) {
    return;
  }

  syncButton.disabled = true;
  syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
  showStatusMessage('⏳ Fetching candidates from database...', 'info');

  try {
    // Ensure Web3 is initialized
    if (!web3 || !votingContract || !account) {
      await initWeb3();
      if (!web3 || !votingContract || !account) {
        throw new Error('Web3 not initialized. Please refresh and try again.');
      }
    }

    // Verify Web3 and contract are initialized
    if (!web3 || !votingContract || !account) {
      showStatusMessage('❌ Please connect MetaMask first!', 'error');
      syncButton.disabled = false;
      syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync All to Blockchain';
      return;
    }

    // Fetch candidates from MongoDB
    const response = await fetch('http://127.0.0.1:8001/candidates');
    if (!response.ok) {
      throw new Error('Failed to fetch candidates from database');
    }

    const data = await response.json();
    console.log('[SYNC] MongoDB candidates:', data);

    if (!data.candidates || data.candidates.length === 0) {
      showStatusMessage('ℹ️ No candidates found in database to sync', 'info');
      syncButton.disabled = false;
      syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync All to Blockchain';
      return;
    }

    // Get current blockchain candidate count
    let currentCount = 0;
    try {
      const blockchainCount = await votingContract.methods.getCountCandidates().call();
      currentCount = parseInt(blockchainCount);
      console.log('[SYNC] Current blockchain count:', currentCount);
    } catch (error) {
      console.warn('[SYNC] Could not get blockchain count, assuming 0:', error);
      currentCount = 0;
    }

    // Candidates to sync (only those not yet on blockchain)
    const candidatesToSync = data.candidates.slice(currentCount);

    if (candidatesToSync.length === 0) {
      showStatusMessage('✅ All candidates are already synced to blockchain!', 'success');
      syncButton.disabled = false;
      syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync All to Blockchain';
      return;
    }

    showStatusMessage(`⏳ Syncing ${candidatesToSync.length} candidate(s) to blockchain...`, 'info');

    let successCount = 0;
    let failCount = 0;

    // Sync each candidate
    for (let i = 0; i < candidatesToSync.length; i++) {
      const candidate = candidatesToSync[i];

      try {
        showStatusMessage(`⏳ Syncing ${i + 1}/${candidatesToSync.length}: ${candidate.name}...`, 'info');

        // Format date of birth (DD-MM-YYYY)
        const dob = candidate.dateOfBirth || '01-01-2000';

        // Call addCandidate on blockchain
        const tx = await votingContract.methods.addCandidate(
          candidate.name || 'Unknown',
          candidate.age || 18,
          dob,
          candidate.electionCenter || 'Unknown',
          candidate.party || 'Independent',
          candidate.candidateAddress || 'Unknown',
          candidate.email || 'unknown@example.com',
          candidate.phoneNumber || '0000000000',
          candidate.candidateId || `CID-${Date.now()}`,
          candidate.candidatePassword || 'default123'
        ).send({
          from: account,
          gas: 500000
        });

        console.log(`[SYNC] ✅ Synced ${candidate.name}:`, tx.transactionHash);
        successCount++;

      } catch (error) {
        console.error(`[SYNC] ❌ Failed to sync ${candidate.name}:`, error);
        failCount++;
      }
    }

    // Show final result
    if (failCount === 0) {
      showStatusMessage(`✅ Successfully synced all ${successCount} candidate(s) to blockchain!`, 'success');
    } else {
      showStatusMessage(`⚠️ Synced ${successCount} candidate(s), failed ${failCount}. Check console for details.`, 'warning');
    }

  } catch (error) {
    console.error('[SYNC] Error:', error);
    showStatusMessage(`❌ Sync failed: ${error.message}`, 'error');
  } finally {
    syncButton.disabled = false;
    syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync All to Blockchain';
  }
}

console.log('[ADD-CANDIDATE] Script loaded successfully');
