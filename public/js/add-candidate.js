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

    // Get the deployed contract address from networks (prefer 5777, then 1337)
    if (contractData.networks && contractData.networks['5777']) {
      votingContractAddress = contractData.networks['5777'].address;
      console.log('[CONTRACT] Using network 5777 (Ganache)');
    } else if (contractData.networks && contractData.networks['1337']) {
      votingContractAddress = contractData.networks['1337'].address;
      console.log('[CONTRACT] Using network 1337 (Ganache)');
    } else {
      throw new Error('Contract not deployed on Ganache network (1337 or 5777)');
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
      showStatusMessage(`⚠️ Please switch MetaMask to Ganache network (Chain ID: 1337 or 5777). Currently on: ${chainIdDec}`, 'warning');
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

    console.log('[FORM] Form data collected:', formData.name);
    console.log('[DEBUG] PAN:', formData.panNumber);
    console.log('[DEBUG] Aadhar:', formData.aadharNumber);
    console.log('[DEBUG] EPIC:', formData.voterEpicNumber);

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
      console.log('[BLOCKCHAIN] All Parameters:', {
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
        candidatePassword: candidateData.candidatePassword ? '***HIDDEN***' : 'MISSING'
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
        showStatusMessage(`❌ ${errorMsg}`, 'error');
        return;
      }

      if (candidateData.age < 18) {
        const errorMsg = `Age must be at least 18 (received: ${candidateData.age})`;
        console.error('[BLOCKCHAIN] Validation failed:', errorMsg);
        showStatusMessage(`❌ ${errorMsg}`, 'error');
        return;
      }

      console.log('[BLOCKCHAIN] ✅ All required fields validated');

      try {
        // First, try to call (simulate) the transaction to check for errors
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
          console.log('[BLOCKCHAIN] Call simulation successful ✅');
        } catch (callError) {
          console.error('[BLOCKCHAIN] Call simulation failed:', callError);
          console.error('[BLOCKCHAIN] Error details:', {
            message: callError.message,
            code: callError.code,
            data: callError.data
          });
          throw new Error(`Contract will revert: ${callError.message}`);
        }

        // Now send the actual transaction
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
        console.log('[BLOCKCHAIN] Transaction successful:', blockchainTxHash);
        showStatusMessage('✅ Blockchain transaction confirmed! Saving to database...', 'success');
      } catch (blockchainError) {
        console.error('[BLOCKCHAIN] Full Error Object:', blockchainError);
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
      blockchainAddress: votingContractAddress || null,
      blockchainAccount: account || null,
      blockchainTxHash: blockchainTxHash || null
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

        // Prepare candidate data with defaults for missing fields
        // (MongoDB candidates might not have all blockchain-required fields)
        const syncData = {
          name: candidate.name || 'Unknown',
          age: candidate.age || 25,
          dateOfBirth: candidate.dateOfBirth || '01-01-2000',
          panNumber: candidate.panNumber || 'XXXXX0000X',
          aadharNumber: candidate.aadharNumber || '0000 0000 0000',
          voterEpicNumber: candidate.voterEpicNumber || 'XXX0000000',
          electionCenter: candidate.electionCenter || 'Default Center',
          party: candidate.party || 'Independent',
          candidateAddress: candidate.candidateAddress || 'Not Provided',
          email: candidate.email || 'noemail@example.com',
          phoneNumber: candidate.phoneNumber || '0000000000',
          candidateId: candidate.candidateId || `CID-${Date.now()}`,
          candidatePassword: candidate.candidatePassword || 'default123' // Default for legacy candidates
        };

        console.log(`[SYNC] Candidate data for ${candidate.name}:`, {
          name: syncData.name,
          age: syncData.age,
          dateOfBirth: syncData.dateOfBirth,
          panNumber: syncData.panNumber,
          hasPassword: !!candidate.candidatePassword ? 'YES' : 'NO (using default)',
          usingDefaults: !candidate.candidatePassword || !candidate.electionCenter || !candidate.candidateAddress
        });

        // Basic validation
        if (!syncData.name || syncData.name === 'Unknown') {
          throw new Error(`Missing candidate name`);
        }

        if (syncData.age < 18) {
          throw new Error(`Invalid age: ${syncData.age} (must be at least 18)`);
        }
        
        console.log(`[SYNC] ✅ Validation passed for ${candidate.name}`);
        
        // Log exact values being sent (for debugging)
        console.log(`[SYNC] EXACT VALUES being sent to contract:`);
        console.table({
          '1_name': { value: syncData.name, type: typeof syncData.name, empty: !syncData.name },
          '2_age': { value: syncData.age, type: typeof syncData.age, zero: syncData.age === 0 },
          '3_dateOfBirth': { value: syncData.dateOfBirth, type: typeof syncData.dateOfBirth, empty: !syncData.dateOfBirth },
          '4_panNumber': { value: syncData.panNumber, type: typeof syncData.panNumber, empty: !syncData.panNumber },
          '5_aadharNumber': { value: syncData.aadharNumber, type: typeof syncData.aadharNumber, empty: !syncData.aadharNumber },
          '6_voterEpicNumber': { value: syncData.voterEpicNumber, type: typeof syncData.voterEpicNumber, empty: !syncData.voterEpicNumber },
          '7_electionCenter': { value: syncData.electionCenter, type: typeof syncData.electionCenter, empty: !syncData.electionCenter },
          '8_party': { value: syncData.party, type: typeof syncData.party, empty: !syncData.party },
          '9_candidateAddress': { value: syncData.candidateAddress, type: typeof syncData.candidateAddress, empty: !syncData.candidateAddress },
          '10_email': { value: syncData.email, type: typeof syncData.email, empty: !syncData.email },
          '11_phoneNumber': { value: syncData.phoneNumber, type: typeof syncData.phoneNumber, empty: !syncData.phoneNumber },
          '12_candidateId': { value: syncData.candidateId, type: typeof syncData.candidateId, empty: !syncData.candidateId },
          '13_candidatePassword': { value: '***HIDDEN***', type: typeof syncData.candidatePassword, empty: !syncData.candidatePassword }
        });

        // First, simulate the transaction to check for errors
        try {
          await votingContract.methods.addCandidate(
            syncData.name,
            syncData.age,
            syncData.dateOfBirth,
            syncData.panNumber,
            syncData.aadharNumber,
            syncData.voterEpicNumber,
            syncData.electionCenter,
            syncData.party,
            syncData.candidateAddress,
            syncData.email,
            syncData.phoneNumber,
            syncData.candidateId,
            syncData.candidatePassword
          ).call({ from: account });
          console.log(`[SYNC] Call simulation successful for ${candidate.name} ✅`);
        } catch (callError) {
          console.error(`[SYNC] Call simulation failed for ${candidate.name}:`, callError);
          console.error(`[SYNC] Error message:`, callError.message);
          console.error(`[SYNC] Error data:`, callError.data);
          throw new Error(`Contract will revert for ${candidate.name}: ${callError.message}`);
        }

        // Now send the actual transaction
        const tx = await votingContract.methods.addCandidate(
          syncData.name,
          syncData.age,
          syncData.dateOfBirth,
          syncData.panNumber,
          syncData.aadharNumber,
          syncData.voterEpicNumber,
          syncData.electionCenter,
          syncData.party,
          syncData.candidateAddress,
          syncData.email,
          syncData.phoneNumber,
          syncData.candidateId,
          syncData.candidatePassword
        ).send({
          from: account,
          gas: 3000000
        });

        console.log(`[SYNC] ✅ Synced ${candidate.name}:`, tx.transactionHash);
        successCount++;

      } catch (error) {
        console.error(`[SYNC] ❌ Failed to sync ${candidate.name}:`, error);
        console.error(`[SYNC] Error message:`, error.message);
        console.error(`[SYNC] Full error details:`, JSON.stringify(error, null, 2));
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
