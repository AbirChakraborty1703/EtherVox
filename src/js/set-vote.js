/**
 * EtherVox Set Voting Information JavaScript
 * 
 * @file set-vote.js
 * @description Handles voting schedule configuration and blockchain interaction
 * @version 1.0.0
 */

// ===============================================
// API CONFIGURATION
// ===============================================
const API_BASE_URL = 'http://127.0.0.1:8001';

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
// EXTRACT REVERT REASON FROM RPC ERROR
// ===============================================
function extractRevertReason(error) {
  try {
    // MetaMask wraps errors: error.data.data or error.data.message
    if (error && error.data) {
      if (typeof error.data === 'object') {
        if (error.data.message) return error.data.message;
        if (error.data.reason) return error.data.reason;
        // Ganache format: error.data.data might contain the revert reason
        if (error.data.data && typeof error.data.data === 'string') return error.data.data;
        // Some Ganache versions nest deeper
        const keys = Object.keys(error.data);
        for (const key of keys) {
          const val = error.data[key];
          if (val && typeof val === 'object' && val.reason) return val.reason;
          if (val && typeof val === 'object' && val.error) return val.error;
        }
      }
      if (typeof error.data === 'string') return error.data;
    }
    // Check inner error
    if (error && error.innerError) return extractRevertReason(error.innerError);
    if (error && error.cause) return extractRevertReason(error.cause);
  } catch (e) {
    // ignore extraction errors
  }
  return null;
}

// ===============================================
// SUBMIT VOTING DATES TO BLOCKCHAIN
// Uses intelligent method selection:
//   - setDates() when votingInitialized is false
//   - updateDates() when votingInitialized is true but voting hasn't started
//   - resetVotes() + setDates() as last resort
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

  // Convert to Unix timestamps (seconds)
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

    // -----------------------------------------------
    // DIAGNOSTIC: Read ACTUAL blockchain time (Ganache's block.timestamp)
    // This detects clock drift between browser and blockchain
    // -----------------------------------------------
    let blockTimestamp;
    try {
      const latestBlock = await window.App.web3.eth.getBlock('latest');
      blockTimestamp = Number(latestBlock.timestamp);
    } catch (e) {
      console.warn('Could not read block timestamp, using JS time:', e.message);
      blockTimestamp = Math.floor(Date.now() / 1000);
    }

    const jsTimestamp = Math.floor(Date.now() / 1000);
    const timeDrift = blockTimestamp - jsTimestamp;

    console.log('[SET-VOTE] Time comparison:', {
      blockchainTime: blockTimestamp,
      browserTime: jsTimestamp,
      drift: timeDrift + 's (' + (timeDrift > 0 ? 'blockchain AHEAD' : 'blockchain BEHIND') + ')',
      startTimestamp: startTimestamp,
      endTimestamp: endTimestamp,
      startMinusBlockchain: (startTimestamp - blockTimestamp) + 's ahead of blockchain'
    });

    // Validate: start must be AFTER blockchain time (not just browser time)
    // The smart contract checks: _startDate > block.timestamp
    // AUTO-ADJUST: If clock drift detected, shift timestamps to be relative to blockchain time
    if (startTimestamp <= blockTimestamp) {
      const votingDuration = endTimestamp - startTimestamp; // preserve user's intended duration
      const newStart = blockTimestamp + 180; // 3 minutes ahead of blockchain time
      const newEnd = newStart + votingDuration;

      console.warn('[SET-VOTE] Start time is NOT in the future relative to BLOCKCHAIN time!');
      console.warn('[SET-VOTE] Blockchain time:', new Date(blockTimestamp * 1000).toLocaleString());
      console.warn('[SET-VOTE] Your start time:', new Date(startTimestamp * 1000).toLocaleString());
      console.warn('[SET-VOTE] AUTO-ADJUSTING: start=' + newStart + ' (' + new Date(newStart * 1000).toLocaleString() + '), end=' + newEnd + ' (' + new Date(newEnd * 1000).toLocaleString() + ')');

      startTimestamp = newStart;
      endTimestamp = newEnd;

      showStatusMessage(
        '⏳ Clock drift detected (' + Math.abs(timeDrift) + 's). ' +
        'Auto-adjusted: start → ' + new Date(newStart * 1000).toLocaleTimeString() +
        ', end → ' + new Date(newEnd * 1000).toLocaleTimeString() +
        ' (blockchain time). Submitting...',
        'info'
      );
    }

    // Validate: minimum 30 minute duration (contract requires _endDate >= _startDate + 1800)
    if (endTimestamp < startTimestamp + 1800) {
      const minEnd = new Date((startTimestamp + 1800) * 1000);
      showStatusMessage(
        '❌ Voting duration must be at least 30 minutes. End time must be after ' +
        minEnd.toLocaleTimeString(),
        'error'
      );
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-save"></i> Save Voting Dates';
      return;
    }

    // -----------------------------------------------
    // CHECK votingInitialized STATE
    // -----------------------------------------------
    let isInitialized = false;
    let currentVotingStart = 0;
    let currentVotingEnd = 0;

    try {
      isInitialized = await instance.methods.votingInitialized().call();
      // Handle Web3 v4 BigInt return: convert to boolean
      if (typeof isInitialized !== 'boolean') {
        isInitialized = Boolean(isInitialized);
      }
      console.log('[SET-VOTE] votingInitialized:', isInitialized);
    } catch (e) {
      console.warn('[SET-VOTE] Could not check votingInitialized:', e.message);
    }

    if (isInitialized) {
      try {
        const dates = await instance.methods.getDates().call();
        currentVotingStart = Number(dates[0]);
        currentVotingEnd = Number(dates[1]);
        console.log('[SET-VOTE] Current voting dates:', {
          start: new Date(currentVotingStart * 1000).toLocaleString(),
          end: new Date(currentVotingEnd * 1000).toLocaleString()
        });
      } catch (e) {
        console.warn('[SET-VOTE] Could not get current dates:', e.message);
      }
    }

    console.log('[SET-VOTE] Setting dates - Start:', startTimestamp, 'End:', endTimestamp,
      'BlockchainTime:', blockTimestamp, 'Initialized:', isInitialized);

    // -----------------------------------------------
    // INTELLIGENT METHOD SELECTION
    // 1. Not initialized → setDates()
    // 2. Initialized but voting not started → updateDates()
    // 3. Initialized and started/ended → resetVotes() then setDates()
    // -----------------------------------------------
    let tx;
    let methodUsed = '';

    if (!isInitialized) {
      // Normal path: first time setting dates
      console.log('[SET-VOTE] Using setDates() (first time)');
      methodUsed = 'setDates';

      try {
        const gasEstimate = await instance.methods.setDates(startTimestamp, endTimestamp)
          .estimateGas({ from: account });
        const gasLimit = Math.floor(Number(gasEstimate) * 1.5);
        console.log('[SET-VOTE] Gas estimate:', Number(gasEstimate), '→ limit:', gasLimit);

        tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
          from: account,
          gas: gasLimit
        });
      } catch (setError) {
        const revertReason = extractRevertReason(setError);
        console.error('[SET-VOTE] setDates() failed:', setError);
        console.error('[SET-VOTE] Revert reason:', revertReason);

        // If setDates fails with VotingAlreadyInitialized, try updateDates automatically
        const errorStr = (setError.message || '') + ' ' + (revertReason || '');
        if (errorStr.includes('VotingAlreadyInitialized') || errorStr.includes('already')) {
          console.log('[SET-VOTE] votingInitialized was true on-chain, falling back to updateDates()');
          isInitialized = true; // Force the update path below
        } else {
          throw setError; // Re-throw other errors
        }
      }
    }

    if (isInitialized && !tx) {
      // Voting dates were already set - try updateDates or reset+setDates
      const votingHasStarted = blockTimestamp >= currentVotingStart && currentVotingStart > 0;

      if (!votingHasStarted) {
        // Voting hasn't started yet → use updateDates()
        console.log('[SET-VOTE] Using updateDates() (dates already set, voting not started)');
        showStatusMessage('⏳ Updating existing voting dates...', 'info');
        methodUsed = 'updateDates';

        try {
          const gasEstimate = await instance.methods.updateDates(startTimestamp, endTimestamp)
            .estimateGas({ from: account });
          const gasLimit = Math.floor(Number(gasEstimate) * 1.5);

          tx = await instance.methods.updateDates(startTimestamp, endTimestamp).send({
            from: account,
            gas: gasLimit
          });
        } catch (updateError) {
          const revertReason = extractRevertReason(updateError);
          console.error('[SET-VOTE] updateDates() failed:', updateError);
          console.error('[SET-VOTE] Revert reason:', revertReason);

          // If updateDates also fails, try reset + set
          console.log('[SET-VOTE] Attempting resetVotes() + setDates()...');
          showStatusMessage('⏳ Resetting and re-setting voting dates...', 'info');
          methodUsed = 'resetVotes+setDates';

          try {
            await instance.methods.resetVotes().send({ from: account, gas: 500000 });
            console.log('[SET-VOTE] resetVotes() succeeded');

            const gasEstimate2 = await instance.methods.setDates(startTimestamp, endTimestamp)
              .estimateGas({ from: account });
            const gasLimit2 = Math.floor(Number(gasEstimate2) * 1.5);

            tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
              from: account,
              gas: gasLimit2
            });
          } catch (resetError) {
            const resetReason = extractRevertReason(resetError);
            console.error('[SET-VOTE] resetVotes+setDates failed:', resetError);
            console.error('[SET-VOTE] Revert reason:', resetReason);
            throw new Error(
              'Could not set voting dates. ' +
              (resetReason || resetError.message || 'Only the contract owner can reset dates.')
            );
          }
        }
      } else {
        // Voting has already started - need full reset
        console.log('[SET-VOTE] Voting already started, attempting resetVotes() + setDates()');
        showStatusMessage('⏳ Voting was active - resetting and setting new dates...', 'info');
        methodUsed = 'resetVotes+setDates';

        try {
          await instance.methods.resetVotes().send({ from: account, gas: 500000 });
          console.log('[SET-VOTE] resetVotes() succeeded');

          const gasEstimate = await instance.methods.setDates(startTimestamp, endTimestamp)
            .estimateGas({ from: account });
          const gasLimit = Math.floor(Number(gasEstimate) * 1.5);

          tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
            from: account,
            gas: gasLimit
          });
        } catch (resetError) {
          const resetReason = extractRevertReason(resetError);
          console.error('[SET-VOTE] resetVotes+setDates failed:', resetError);
          throw new Error(
            'Could not reset and set dates. Only the contract owner can perform this action. ' +
            (resetReason || '')
          );
        }
      }
    }

    if (!tx) {
      throw new Error('No transaction was executed. Please try again.');
    }

    const blockchainTxHash = tx.transactionHash || tx.hash || 'N/A';
    console.log('[SET-VOTE] Success! Method:', methodUsed, 'TxHash:', blockchainTxHash);

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

    console.log('[SET-VOTE] Saving voting dates to MongoDB:', mongoData);

    try {
      const response = await fetch(`${API_BASE_URL}/voting-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(mongoData)
      });

      const data = await response.json();
      console.log('[SET-VOTE] MongoDB response:', response.status, data);

      if (response.ok) {
        showStatusMessage('✅ Voting dates saved successfully! (method: ' + methodUsed + ')', 'success');
      } else {
        showStatusMessage('⚠️ Blockchain OK but database save failed: ' + (data.detail || 'Unknown error'), 'warning');
      }
    } catch (mongoErr) {
      console.warn('[SET-VOTE] MongoDB save failed:', mongoErr.message);
      showStatusMessage('⚠️ Blockchain OK but could not save to database: ' + mongoErr.message, 'warning');
    }

    // Reload current dates
    setTimeout(function () {
      loadCurrentVotingDates();
    }, 2000);

  } catch (error) {
    console.error('[SET-VOTE] Error setting voting dates:', error);
    const revertReason = extractRevertReason(error);
    if (revertReason) {
      console.error('[SET-VOTE] Contract revert reason:', revertReason);
    }

    const fullMsg = (error.message || '') + ' ' + (revertReason || '');

    if (fullMsg.includes('User denied') || fullMsg.includes('rejected')) {
      showStatusMessage('❌ Transaction rejected by user', 'error');
    } else if (fullMsg.includes('VotingAlreadyInitialized')) {
      showStatusMessage('❌ Voting dates already set and could not be automatically updated. Please use "Reset Election" first.', 'error');
    } else if (fullMsg.includes('NotOwner')) {
      showStatusMessage('❌ Only the contract owner can update/reset voting dates. Please use the owner account.', 'error');
    } else if (fullMsg.includes('InvalidTimeRange')) {
      showStatusMessage('❌ Invalid date range. Start must be in the future, end must be at least 30 minutes after start.', 'error');
    } else if (fullMsg.includes('Internal JSON-RPC')) {
      showStatusMessage(
        '❌ Blockchain transaction failed. Revert reason: ' +
        (revertReason || 'Unknown - check Ganache console for details.') +
        ' Try: Reset Election → then set new dates.',
        'error'
      );
    } else {
      showStatusMessage('❌ Error: ' + error.message, 'error');
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
      // Quick test: start in 3 minutes, end in 33 minutes (30 min minimum duration)
      startDateTime = new Date(now.getTime() + 3 * 60 * 1000);
      endDateTime = new Date(now.getTime() + 33 * 60 * 1000);
      break;

    case 'today':
      startDateTime = new Date(now);
      startDateTime.setHours(9, 0, 0, 0);
      endDateTime = new Date(now);
      endDateTime.setHours(17, 0, 0, 0);
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
    const response = await fetch(`${API_BASE_URL}/candidates/search/${candidateId}`);

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
    const response = await fetch(`${API_BASE_URL}/candidates`);

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
