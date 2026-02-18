/**
 * EtherVox Set Voting Information JavaScript
 * 
 * @file set-vote.js
 * @description Handles voting schedule configuration and blockchain interaction
 * @version 1.0.0
 */

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function () {
  checkAuthentication();
  loadCurrentVotingDates();
  setupFormHandlers();
  setupDateTimeUpdates();
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
// LOAD CURRENT VOTING DATES
// ===============================================
async function loadCurrentVotingDates() {
  try {
    showStatusMessage('⏳ Loading current voting information...', 'info');

    // Wait for Web3 to initialize
    if (typeof window.App === 'undefined' || !window.App.contracts.Voting) {
      await waitForWeb3();
    }

    const instance = window.App.contracts.Voting;
    const dates = await instance.methods.getDates().call();

    const startTimestamp = parseInt(dates[0]);
    const endTimestamp = parseInt(dates[1]);

    if (startTimestamp > 0 && endTimestamp > 0) {
      const startDate = new Date(startTimestamp * 1000);
      const endDate = new Date(endTimestamp * 1000);

      // Update current info display
      document.getElementById('currentStartDate').textContent = formatDateTime(startDate);
      document.getElementById('currentEndDate').textContent = formatDateTime(endDate);

      // Calculate duration
      const duration = calculateDuration(startDate, endDate);
      document.getElementById('votingDuration').textContent = duration;

      // Determine and display status
      const status = getVotingStatus(startDate, endDate);
      const statusElement = document.getElementById('currentStatus');
      statusElement.textContent = status.text;
      statusElement.className = `info-value status-badge ${status.class}`;

      clearStatusMessage();
    } else {
      document.getElementById('currentStartDate').textContent = 'Not Set';
      document.getElementById('currentEndDate').textContent = 'Not Set';
      document.getElementById('currentStatus').textContent = 'Not Configured';
      document.getElementById('votingDuration').textContent = '-';
      clearStatusMessage();
    }

  } catch (error) {
    console.error('Error loading current voting dates:', error);
    showStatusMessage('⚠️ Could not load current voting dates. Blockchain may not be connected.', 'error');
  }
}

// Wait for Web3 to be initialized
function waitForWeb3() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;

    const checkWeb3 = setInterval(() => {
      attempts++;

      if (typeof window.App !== 'undefined' && window.App.contracts.Voting) {
        clearInterval(checkWeb3);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkWeb3);
        reject(new Error('Web3 initialization timeout'));
      }
    }, 100);
  });
}

// ===============================================
// SETUP FORM HANDLERS
// ===============================================
function setupFormHandlers() {
  const form = document.getElementById('votingDatesForm');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    await submitVotingDates();
  });

  // Reset button
  form.addEventListener('reset', function () {
    clearStatusMessage();
    document.getElementById('durationDisplay').innerHTML = '<span class="duration-text">Please select start and end dates</span>';
    document.getElementById('startPreview').textContent = 'Select date and time';
    document.getElementById('endPreview').textContent = 'Select date and time';
  });
}

// ===============================================
// SETUP DATE/TIME UPDATES
// ===============================================
function setupDateTimeUpdates() {
  const startDate = document.getElementById('startDate');
  const startTime = document.getElementById('startTime');
  const endDate = document.getElementById('endDate');
  const endTime = document.getElementById('endTime');

  // Update previews when dates/times change
  [startDate, startTime].forEach(input => {
    input.addEventListener('change', updateStartPreview);
  });

  [endDate, endTime].forEach(input => {
    input.addEventListener('change', updateEndPreview);
  });

  // Calculate duration when any date/time changes
  [startDate, startTime, endDate, endTime].forEach(input => {
    input.addEventListener('change', calculateAndDisplayDuration);
  });

  // Set minimum dates
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  startDate.min = todayStr;
  endDate.min = todayStr;
}

function updateStartPreview() {
  const date = document.getElementById('startDate').value;
  const time = document.getElementById('startTime').value;

  if (date && time) {
    const dateTime = new Date(`${date}T${time}`);
    document.getElementById('startPreview').textContent = formatDateTime(dateTime);
  }
}

function updateEndPreview() {
  const date = document.getElementById('endDate').value;
  const time = document.getElementById('endTime').value;

  if (date && time) {
    const dateTime = new Date(`${date}T${time}`);
    document.getElementById('endPreview').textContent = formatDateTime(dateTime);
  }
}

function calculateAndDisplayDuration() {
  const startDate = document.getElementById('startDate').value;
  const startTime = document.getElementById('startTime').value;
  const endDate = document.getElementById('endDate').value;
  const endTime = document.getElementById('endTime').value;

  if (startDate && startTime && endDate && endTime) {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (end > start) {
      const duration = calculateDuration(start, end);
      document.getElementById('durationDisplay').innerHTML = `<span style="color: #4CAF50; font-size: 28px;">${duration}</span>`;
    } else {
      document.getElementById('durationDisplay').innerHTML = '<span style="color: #ff6b6b;">End date must be after start date</span>';
    }
  }
}

// ===============================================
// SUBMIT VOTING DATES TO BLOCKCHAIN
// ===============================================
async function submitVotingDates() {
  const startDate = document.getElementById('startDate').value;
  const startTime = document.getElementById('startTime').value;
  const endDate = document.getElementById('endDate').value;
  const endTime = document.getElementById('endTime').value;

  if (!startDate || !startTime || !endDate || !endTime) {
    showStatusMessage('❌ Please fill in all date and time fields', 'error');
    return;
  }

  const startDateTime = new Date(`${startDate}T${startTime}`);
  const endDateTime = new Date(`${endDate}T${endTime}`);

  if (endDateTime <= startDateTime) {
    showStatusMessage('❌ End date must be after start date', 'error');
    return;
  }

  // Minimum duration check (30 minutes)
  const durationMs = endDateTime.getTime() - startDateTime.getTime();
  if (durationMs < 30 * 60 * 1000) {
    showStatusMessage('❌ Voting period must be at least 30 minutes', 'error');
    return;
  }  // Convert to Unix timestamps (seconds)
  let startTimestamp = Math.floor(startDateTime.getTime() / 1000);
  let endTimestamp = Math.floor(endDateTime.getTime() / 1000);

  const submitButton = document.getElementById('submitDates');
  submitButton.disabled = true;
  submitButton.innerHTML = '<div class="spinner"></div> Saving to Blockchain...';

  showStatusMessage('⏳ Submitting voting dates to blockchain...', 'info');

  try {
    // Wait for Web3
    if (typeof window.App === 'undefined' || !window.App.contracts.Voting) {
      await waitForWeb3();
    }

    const instance = window.App.contracts.Voting;
    const account = window.App.account;

    // Sync Ganache time if needed (App.syncGanacheTime should exist)
    if (typeof window.App.syncGanacheTime === 'function') {
      try {
        await window.App.syncGanacheTime();
        console.log('Ganache time synchronized');
        // Wait a bit for blockchain to stabilize after sync
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (syncError) {
        console.warn('Could not sync Ganache time:', syncError);
      }
    }

    // Get the BLOCKCHAIN's current timestamp (not browser time)
    // Fetch this right before validation to ensure accuracy
    let blockchainTimestamp;
    try {
      const latestBlock = await window.App.web3.eth.getBlock('latest');
      blockchainTimestamp = Number(latestBlock.timestamp);
      console.log('Blockchain timestamp:', blockchainTimestamp, 'Browser timestamp:', Math.floor(Date.now() / 1000));
    } catch (e) {
      console.warn('Could not get blockchain time, using browser time:', e);
      blockchainTimestamp = Math.floor(Date.now() / 1000);
    }

    // Log blockchain vs browser time for debugging
    console.log('Blockchain timestamp:', blockchainTimestamp, 'Start timestamp:', startTimestamp);

    // Check if voting is already initialized
    let votingInitialized = false;
    let isOwner = false;
    try {
      votingInitialized = await instance.methods.votingInitialized().call();
      const contractOwner = await instance.methods.owner().call();
      isOwner = contractOwner.toLowerCase() === account.toLowerCase();
      console.log('Voting initialized:', votingInitialized, 'Is owner:', isOwner);
    } catch (e) {
      console.warn('Could not check votingInitialized or owner:', e);
    }

    console.log('Setting dates - Start:', startTimestamp, 'End:', endTimestamp, 'Blockchain time:', blockchainTimestamp);

    let tx;
    let gasEstimate;

    if (votingInitialized) {
      // Try to reset votes first if owner, then set new dates
      if (isOwner) {
        showStatusMessage('⏳ Voting already initialized. Resetting votes as owner...', 'info');
        
        try {
          // First reset the voting period
          const resetGas = await instance.methods.resetVotes().estimateGas({ from: account });
          await instance.methods.resetVotes().send({
            from: account,
            gas: Math.floor(Number(resetGas) * 1.5)
          });
          console.log('Votes reset successfully');
          
          // Now set new dates
          gasEstimate = await instance.methods.setDates(startTimestamp, endTimestamp).estimateGas({ from: account });
          console.log('Estimated gas for setDates:', gasEstimate);
          
          tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
            from: account,
            gas: Math.floor(Number(gasEstimate) * 1.5)
          });
        } catch (resetError) {
          console.error('Reset failed, trying updateDates:', resetError);
          
          // Try updateDates instead
          gasEstimate = await instance.methods.updateDates(startTimestamp, endTimestamp).estimateGas({ from: account });
          console.log('Estimated gas for updateDates:', gasEstimate);
          
          tx = await instance.methods.updateDates(startTimestamp, endTimestamp).send({
            from: account,
            gas: Math.floor(Number(gasEstimate) * 1.5)
          });
        }
      } else {
        showStatusMessage('❌ Voting dates have already been set. Only the contract owner can update or reset them.', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Save Voting Dates';
        return;
      }
    } else {
      // STEP 1: Call setDates on smart contract with gas estimation
      // Use numeric timestamps (Web3.js handles uint256 conversion)
      // The smart contract itself validates that startDate > block.timestamp
      
      try {
        gasEstimate = await instance.methods.setDates(startTimestamp, endTimestamp).estimateGas({ from: account });
        console.log('Estimated gas:', gasEstimate);
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError);
        
        // Try to get more specific error info
        try {
          // Attempt a static call to get the revert reason
          await instance.methods.setDates(startTimestamp, endTimestamp).call({ from: account });
        } catch (callError) {
          console.error('Call error details:', callError);
          if (callError.message.includes('InvalidTimeRange')) {
            throw new Error('Invalid time range. Start must be in future and at least 30 min before end.');
          } else if (callError.message.includes('VotingAlreadyInitialized')) {
            throw new Error('Voting dates have already been initialized.');
          }
        }
        
        throw new Error('Transaction will fail. Please check your dates and try again.');
      }

      // Convert BigInt to Number and add 50% buffer
      const gasLimit = Math.floor(Number(gasEstimate) * 1.5);

      tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
        from: account,
        gas: gasLimit
      });
    }

    const blockchainTxHash = tx.transactionHash || tx.hash || 'N/A';
    console.log('Blockchain transaction hash:', blockchainTxHash);

    showStatusMessage('⏳ Blockchain OK! Saving to database...', 'info');

    // STEP 2: Save to MongoDB
    const adminToken = localStorage.getItem('jwtTokenAdmin');
    const mongoData = {
      votingStartDate: startDateTime.toISOString(),
      votingEndDate: endDateTime.toISOString(),
      votingStartTimestamp: startTimestamp,
      votingEndTimestamp: endTimestamp,
      blockchainTxHash: blockchainTxHash,
      blockchainAccount: account
    };

    console.log('Saving voting dates to MongoDB:', mongoData);

    const response = await fetch('http://127.0.0.1:8001/voting-dates', {
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
      showStatusMessage('✅ Voting dates saved successfully to blockchain and database!', 'success');
    } else {
      showStatusMessage(`⚠️ Blockchain OK but database save failed: ${data.detail || 'Unknown error'}`, 'warning');
    }

    // Reload current dates
    setTimeout(() => {
      loadCurrentVotingDates();
    }, 2000);

  } catch (error) {
    console.error('Error setting voting dates:', error);

    if (error.message.includes('User denied') || error.message.includes('rejected')) {
      showStatusMessage('❌ Transaction rejected by user', 'error');
    } else if (error.message.includes('VotingAlreadyInitialized') || error.message.includes('already been set')) {
      showStatusMessage('❌ Voting dates have already been set. Use "Update Dates" to modify them.', 'error');
    } else if (error.message.includes('InvalidTimeRange')) {
      showStatusMessage('❌ Invalid date range. Start date must be at least 3-4 minutes in the future and end date must be at least 30 minutes after start.', 'error');
    } else if (error.message.includes('Transaction will fail')) {
      showStatusMessage('❌ Transaction validation failed. Please ensure start date is at least 3-4 minutes in the future.', 'error');
    } else if (error.message.includes('Internal JSON-RPC error') || error.message.includes('revert')) {
      showStatusMessage('❌ Transaction failed. Make sure the start date is at least 3-4 minutes in the future and voting dates haven\'t been set yet.', 'error');
    } else {
      showStatusMessage(`❌ Error: ${error.message}`, 'error');
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Save Voting Dates';
  }
}

// ===============================================
// SYNC WITH BLOCKCHAIN
// ===============================================
async function syncWithBlockchain() {
  showStatusMessage('🔄 Syncing with blockchain...', 'info');
  await loadCurrentVotingDates();
}

// ===============================================
// QUICK PRESETS
// ===============================================
function setPreset(presetType) {
  const now = new Date();
  let startDateTime, endDateTime;

  switch (presetType) {
    case 'quicktest':
      // Quick test: start 4 minutes from now, end 34 minutes from now (30 min voting)
      startDateTime = new Date(now.getTime() + 4 * 60 * 1000);
      startDateTime.setSeconds(0, 0);
      endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
      endDateTime.setSeconds(0, 0);
      break;

    case 'today':
      startDateTime = new Date(now);
      // If 9 AM has already passed, use current time + 4 minutes (to account for blockchain sync)
      const nineAM = new Date(now);
      nineAM.setHours(9, 0, 0, 0);
      if (now > nineAM) {
        // Start voting 4 minutes from now (240 seconds buffer for blockchain)
        startDateTime.setTime(now.getTime() + 4 * 60 * 1000);
        // Round to nearest minute
        startDateTime.setSeconds(0, 0);
      } else {
        startDateTime.setHours(9, 0, 0, 0);
      }
      endDateTime = new Date(now);
      endDateTime.setHours(23, 59, 0, 0); // End at 11:59 PM today
      break;

    case 'tomorrow':
      startDateTime = new Date(now);
      startDateTime.setDate(startDateTime.getDate() + 1);
      startDateTime.setHours(9, 0, 0, 0);
      endDateTime = new Date(now);
      endDateTime.setDate(endDateTime.getDate() + 1);
      endDateTime.setHours(17, 0, 0, 0);
      break;

    case 'week':
      startDateTime = new Date(now);
      startDateTime.setDate(startDateTime.getDate() + 1);
      startDateTime.setHours(9, 0, 0, 0);
      endDateTime = new Date(now);
      endDateTime.setDate(endDateTime.getDate() + 8);
      endDateTime.setHours(17, 0, 0, 0);
      break;

    case 'custom':
      startDateTime = new Date(now);
      startDateTime.setMonth(startDateTime.getMonth() + 1);
      startDateTime.setDate(1);
      startDateTime.setHours(9, 0, 0, 0);
      endDateTime = new Date(startDateTime);
      endDateTime.setDate(endDateTime.getDate() + 7);
      endDateTime.setHours(17, 0, 0, 0);
      break;
  }

  // Set form values
  document.getElementById('startDate').value = startDateTime.toISOString().split('T')[0];
  document.getElementById('startTime').value = startDateTime.toTimeString().slice(0, 5);
  document.getElementById('endDate').value = endDateTime.toISOString().split('T')[0];
  document.getElementById('endTime').value = endDateTime.toTimeString().slice(0, 5);

  // Update previews
  updateStartPreview();
  updateEndPreview();
  calculateAndDisplayDuration();

  showStatusMessage(`📅 Preset "${presetType}" applied`, 'info');
  setTimeout(() => clearStatusMessage(), 2000);
}

// ===============================================
// RESET ELECTION
// ===============================================
async function resetElection() {
  const confirmation = confirm(
    '⚠️ WARNING: This will reset ALL election data!\n\n' +
    'This action will:\n' +
    '✗ Delete all voting dates\n' +
    '✗ Reset votingInitialized flag\n' +
    '✗ Clear all candidate vote counts\n' +
    '✗ Delete all candidates\n\n' +
    'This CANNOT be undone!\n\n' +
    'Are you absolutely sure you want to continue?'
  );

  if (!confirmation) {
    return;
  }

  const doubleCheck = prompt('Type "RESET" to confirm this action:');
  if (doubleCheck !== 'RESET') {
    showStatusMessage('❌ Reset cancelled - confirmation text did not match', 'error');
    return;
  }

  try {
    showStatusMessage('⏳ Resetting election on blockchain...', 'info');

    // Wait for Web3
    if (typeof window.App === 'undefined' || !window.App.contracts.Voting) {
      await waitForWeb3();
    }

    const instance = window.App.contracts.Voting;
    const account = window.App.account;

    // Check if user is contract owner
    const owner = await instance.methods.owner().call();
    if (account.toLowerCase() !== owner.toLowerCase()) {
      showStatusMessage('❌ Only the contract owner can reset the election', 'error');
      return;
    }

    // Call resetElection on smart contract
    const tx = await instance.methods.resetElection().send({
      from: account,
      gas: 500000
    });

    console.log('Reset transaction:', tx);
    showStatusMessage('✅ Election reset successfully! You can now set new voting dates.', 'success');

    // Reload current dates (should show "Not Set")
    setTimeout(() => {
      loadCurrentVotingDates();
    }, 2000);

  } catch (error) {
    console.error('Error resetting election:', error);

    if (error.message.includes('User denied') || error.message.includes('rejected')) {
      showStatusMessage('❌ Reset cancelled by user', 'error');
    } else if (error.message.includes('NotOwner')) {
      showStatusMessage('❌ Only the contract owner can reset the election', 'error');
    } else {
      showStatusMessage(`❌ Error resetting election: ${error.message}`, 'error');
    }
  }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================
function formatDateTime(date) {
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleDateString('en-US', options);
}

function calculateDuration(startDate, endDate) {
  const diff = endDate - startDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let duration = '';
  if (days > 0) duration += `${days} day${days > 1 ? 's' : ''} `;
  if (hours > 0) duration += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) duration += `${minutes} minute${minutes > 1 ? 's' : ''}`;

  return duration.trim() || '0 minutes';
}

function getVotingStatus(startDate, endDate) {
  const now = new Date();

  if (now < startDate) {
    return { text: 'Upcoming', class: 'upcoming' };
  } else if (now >= startDate && now <= endDate) {
    return { text: 'Active', class: 'active' };
  } else {
    return { text: 'Ended', class: 'ended' };
  }
}

function showStatusMessage(message, type = 'info') {
  const statusElement = document.getElementById('statusMessage');
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  statusElement.style.display = 'block';
}

function clearStatusMessage() {
  const statusElement = document.getElementById('statusMessage');
  statusElement.className = 'status-message';
  statusElement.textContent = '';
  statusElement.style.display = 'none';
}

// ===============================================
// SPINNER CSS
// ===============================================
const style = document.createElement('style');
style.textContent = `
  .spinner {
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid #ffffff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// ===============================================
// ERROR HANDLING
// ===============================================
window.addEventListener('error', function (event) {
  console.error('Set Vote page error:', event.error);
});

// ===============================================
// CANDIDATE INFORMATION FUNCTIONS
// ===============================================

// API Base URL for candidate operations
const CANDIDATE_API_URL = 'http://127.0.0.1:8001';

/**
 * Search for a candidate by ID
 */
async function searchCandidate() {
  const candidateId = document.getElementById('candidateId').value.trim();

  if (!candidateId) {
    showCandidateStatus('❌ Please enter a Candidate ID to search', 'error');
    return;
  }

  showCandidateStatus('🔍 Searching for candidate...', 'info');

  try {
    const response = await fetch(`${CANDIDATE_API_URL}/candidates/search/${candidateId}`);

    if (!response.ok) {
      if (response.status === 404) {
        showCandidateStatus('❌ Candidate not found with the given ID', 'error');
        hideCandidateDetails();
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidate;

    // Populate form fields
    document.getElementById('candidateName').value = candidate.name || '';
    document.getElementById('electionArea').value = candidate.electionCenter || '';

    // Display candidate details
    displayCandidateDetails(candidate);

    showCandidateStatus('✅ Candidate found successfully!', 'success');
    setTimeout(() => clearCandidateStatus(), 3000);

  } catch (error) {
    console.error('Error searching candidate:', error);
    showCandidateStatus(`❌ Error: ${error.message}`, 'error');
    hideCandidateDetails();
  }
}

/**
 * Display candidate details in the details section
 */
function displayCandidateDetails(candidate) {
  document.getElementById('displayCandidateId').textContent = candidate.candidateId || '-';
  document.getElementById('displayCandidateName').textContent = candidate.name || '-';
  document.getElementById('displayElectionArea').textContent = candidate.electionCenter || '-';
  document.getElementById('displayParty').textContent = candidate.party || '-';

  const statusElement = document.getElementById('displayStatus');
  if (candidate.isActive) {
    statusElement.textContent = 'Active';
    statusElement.className = 'detail-value status-badge active';
  } else {
    statusElement.textContent = 'Inactive';
    statusElement.className = 'detail-value status-badge ended';
  }

  document.getElementById('candidateDetails').classList.remove('hidden');
}

/**
 * Hide candidate details section
 */
function hideCandidateDetails() {
  document.getElementById('candidateDetails').classList.add('hidden');
}

/**
 * Clear all candidate information fields
 */
function clearCandidateInfo() {
  document.getElementById('candidateId').value = '';
  document.getElementById('candidateName').value = '';
  document.getElementById('electionArea').value = '';
  hideCandidateDetails();
  clearCandidateStatus();
}

/**
 * Show status message for candidate section
 */
function showCandidateStatus(message, type = 'info') {
  const statusElement = document.getElementById('candidateStatusMessage');
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  statusElement.style.display = 'block';
}

/**
 * Clear candidate status message
 */
function clearCandidateStatus() {
  const statusElement = document.getElementById('candidateStatusMessage');
  statusElement.className = 'status-message';
  statusElement.textContent = '';
  statusElement.style.display = 'none';
}

/**
 * Get all candidates for a specific election area
 */
async function getCandidatesByArea(electionArea) {
  try {
    const response = await fetch(`${CANDIDATE_API_URL}/candidates`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Filter candidates by election area
    const filteredCandidates = data.candidates.filter(
      candidate => candidate.electionCenter &&
        candidate.electionCenter.toLowerCase().includes(electionArea.toLowerCase())
    );

    return filteredCandidates;

  } catch (error) {
    console.error('Error fetching candidates by area:', error);
    return [];
  }
}

/**
 * Save candidate information with election details
 */
async function saveCandidateWithElectionInfo() {
  const candidateId = document.getElementById('candidateId').value.trim();
  const candidateName = document.getElementById('candidateName').value.trim();
  const electionArea = document.getElementById('electionArea').value.trim();

  if (!candidateId || !candidateName || !electionArea) {
    showCandidateStatus('❌ Please fill in all candidate fields', 'error');
    return false;
  }

  // This function can be extended to update candidate info in the database
  // For now, it validates and returns the candidate data
  return {
    candidateId,
    candidateName,
    electionArea,
    valid: true
  };
}

// Add event listeners for candidate inputs
document.addEventListener('DOMContentLoaded', function () {
  // Add Enter key listener for candidate ID search
  const candidateIdInput = document.getElementById('candidateId');
  if (candidateIdInput) {
    candidateIdInput.addEventListener('keypress', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchCandidate();
      }
    });
  }
});
