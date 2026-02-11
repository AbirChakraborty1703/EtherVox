// EtherVox - Results Page JavaScript
// Fetches LIVE voting results from the blockchain and MongoDB

// MongoDB API Configuration
const API_BASE_URL = 'http://127.0.0.1:8001';

// Ganache RPC endpoints (direct connection for reliable read-only access)
const GANACHE_URLS = ['http://127.0.0.1:7545', 'http://localhost:7545', 'http://127.0.0.1:8545'];

// Auto-refresh interval (in milliseconds) - refresh every 5 seconds
const REFRESH_INTERVAL = 5000;
let refreshTimer = null;

// Smart Contract Configuration
let web3;
let contract;
let contractABI;
let contractAddress;

document.addEventListener('DOMContentLoaded', async function () {
  console.log('[RESULT] Results page loaded');

  try {
    // Initialize Web3 and load results
    await initializeWeb3();
    await loadElectionResults();

    // Start auto-refresh for live updates
    startAutoRefresh();
  } catch (error) {
    console.error('[RESULT] Error loading results:', error);
    displayError('Failed to load election results. Please ensure Ganache is running and contract is deployed.');
  }
});

// Auto-refresh functionality
function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(async () => {
    try {
      await loadElectionResults();
    } catch (error) {
      console.error('[RESULT] Error during auto-refresh:', error);
    }
  }, REFRESH_INTERVAL);

  console.log(`[RESULT] Auto-refresh enabled (every ${REFRESH_INTERVAL / 1000} seconds)`);
}

// ===============================================
// WEB3 INITIALIZATION
// ===============================================

async function initializeWeb3() {
  try {
    // Load contract ABI and deployment info first
    const response = await fetch('/contracts/Voting.json');
    if (!response.ok) throw new Error('Failed to load Voting.json');
    const contractData = await response.json();
    contractABI = contractData.abi;

    // Strategy: Try direct Ganache connection FIRST (more reliable for public read-only page)
    // Then fall back to MetaMask if direct connection fails
    let connected = false;

    // Attempt 1: Direct Ganache HTTP connection (preferred for result page)
    for (const ganacheUrl of GANACHE_URLS) {
      try {
        const testWeb3 = new Web3(ganacheUrl);
        // Test connection with a simple call
        await testWeb3.eth.getBlockNumber();

        web3 = testWeb3;
        console.log('[RESULT] Connected directly to Ganache at', ganacheUrl);
        connected = true;
        break;
      } catch (e) {
        console.log('[RESULT] Could not connect to', ganacheUrl);
      }
    }

    // Attempt 2: MetaMask provider (fallback)
    if (!connected && typeof window.ethereum !== 'undefined') {
      try {
        web3 = new Web3(window.ethereum);
        await web3.eth.getBlockNumber();
        console.log('[RESULT] Connected via MetaMask provider');
        connected = true;
      } catch (e) {
        console.warn('[RESULT] MetaMask connection failed:', e.message);
      }
    }

    if (!connected) {
      throw new Error('No blockchain connection available. Please ensure Ganache is running.');
    }

    // Find the deployed contract address
    // Try multiple network lookup strategies (matching app.js behavior)
    let deployedNetwork = null;

    // Strategy 1: Hardcoded '5777' (Ganache default, matches app.js)
    deployedNetwork = contractData.networks['5777'];
    if (deployedNetwork && deployedNetwork.address) {
      console.log('[RESULT] Found contract on network 5777:', deployedNetwork.address);
    }

    // Strategy 2: Try detected network ID
    if (!deployedNetwork || !deployedNetwork.address) {
      try {
        const networkId = await web3.eth.net.getId();
        const networkIdStr = networkId.toString(); // Handle BigInt/BN/Number
        console.log('[RESULT] Detected network ID:', networkIdStr);
        deployedNetwork = contractData.networks[networkIdStr];
        if (deployedNetwork) {
          console.log('[RESULT] Found contract on network', networkIdStr, ':', deployedNetwork.address);
        }
      } catch (e) {
        console.warn('[RESULT] Could not detect network ID:', e.message);
      }
    }

    // Strategy 3: Try first available network in the JSON
    if (!deployedNetwork || !deployedNetwork.address) {
      const availableNetworks = Object.keys(contractData.networks);
      console.log('[RESULT] Available networks in contract JSON:', availableNetworks);
      for (const netId of availableNetworks) {
        if (contractData.networks[netId] && contractData.networks[netId].address) {
          deployedNetwork = contractData.networks[netId];
          console.log('[RESULT] Using first available network', netId, ':', deployedNetwork.address);
          break;
        }
      }
    }

    if (!deployedNetwork || !deployedNetwork.address) {
      throw new Error('Contract not deployed. Please deploy the contract first using: truffle migrate --reset');
    }

    contractAddress = deployedNetwork.address;

    // Initialize contract instance
    contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log('[RESULT] Contract initialized at:', contractAddress);

    // Verify contract is accessible
    const candidateCount = await contract.methods.getCountCandidates().call();
    console.log('[RESULT] Contract verified - candidates on chain:', candidateCount.toString());

  } catch (error) {
    console.error('[RESULT] Error initializing Web3:', error);
    throw new Error('Failed to initialize blockchain connection: ' + error.message);
  }
}

// ===============================================
// LOAD ELECTION RESULTS
// ===============================================

async function loadElectionResults() {
  const resultsDisplay = document.getElementById('resultsDisplay');

  try {
    // Show loading on first load only
    if (!resultsDisplay.hasAttribute('data-loaded')) {
      resultsDisplay.innerHTML = `
        <div class="info-message">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading live election results from blockchain...</p>
        </div>
      `;
    }

    // Determine voting status using BOTH blockchain and client-side time
    // (client-side is more reliable, matches app.js approach)
    let votingStatus = 'Unknown';
    let isVotingActive = false;
    let startDate = null;
    let endDate = null;

    try {
      // Get blockchain voting status
      votingStatus = await contract.methods.getVotingStatus().call();
      console.log('[RESULT] Blockchain voting status:', votingStatus);

      // Also get dates for client-side comparison (more accurate like app.js)
      const dates = await contract.methods.getDates().call();
      const startTimestamp = safeToInt(dates[0]);
      const endTimestamp = safeToInt(dates[1]);

      if (startTimestamp > 0 && endTimestamp > 0) {
        startDate = new Date(startTimestamp * 1000);
        endDate = new Date(endTimestamp * 1000);
        const now = new Date();

        // Use client-side time comparison (matches app.js behavior)
        const clientNotStarted = now < startDate;
        const clientEnded = now > endDate;
        const clientActive = now >= startDate && now <= endDate;

        if (clientNotStarted) {
          votingStatus = 'Not Started';
          isVotingActive = false;
        } else if (clientEnded) {
          votingStatus = 'Ended';
          isVotingActive = false;
        } else if (clientActive) {
          votingStatus = 'Active';
          isVotingActive = true;
        }

        console.log('[RESULT] Client-side voting status:', votingStatus,
          '| Start:', startDate.toLocaleString(),
          '| End:', endDate.toLocaleString(),
          '| Now:', now.toLocaleString());
      } else if (startTimestamp === 0 && endTimestamp === 0) {
        votingStatus = 'Not Initialized';
        isVotingActive = false;
      }
    } catch (error) {
      console.warn('[RESULT] Could not fetch voting status:', error.message);
    }

    // -----------------------------------------------
    // STEP 1: Get candidates from MongoDB (ONLY source for which candidates to show)
    // MongoDB is the SINGLE SOURCE OF TRUTH for candidate list.
    // If a candidate was deleted from MongoDB, it should NOT appear here,
    // even if it still exists on the blockchain.
    // -----------------------------------------------
    let mongoCandidates = [];
    try {
      const candidatesResponse = await fetch(`${API_BASE_URL}/candidates`);
      if (candidatesResponse.ok) {
        const candidatesData = await candidatesResponse.json();
        mongoCandidates = candidatesData.candidates || [];
        console.log('[RESULT] MongoDB candidates (active):', mongoCandidates.length);
      } else {
        console.error('[RESULT] MongoDB API returned status:', candidatesResponse.status);
      }
    } catch (mongoError) {
      console.warn('[RESULT] MongoDB API not available:', mongoError.message);
    }

    if (mongoCandidates.length === 0) {
      resultsDisplay.innerHTML = `
        <div class="info-message">
          <i class="fas fa-hourglass-half"></i>
          <p>No candidates found in database. Please ensure candidates are added by admin.</p>
        </div>
      `;
      return;
    }

    // -----------------------------------------------
    // STEP 2: Get vote counts from blockchain ONLY for MongoDB candidates
    // Blockchain is the source of truth ONLY for vote counts.
    // We never show blockchain-only candidates (deleted from MongoDB = hidden).
    // -----------------------------------------------
    const mergedCandidates = await fetchVoteCountsForMongoCandidates(mongoCandidates);

    // Calculate total votes
    const totalVotes = mergedCandidates.reduce((sum, c) => sum + c.votes, 0);

    // Calculate percentages
    mergedCandidates.forEach(candidate => {
      candidate.percentage = totalVotes > 0
        ? Math.round((candidate.votes / totalVotes) * 1000) / 10
        : 0;
    });

    // Sort by votes (descending)
    mergedCandidates.sort((a, b) => b.votes - a.votes);

    // Cross-verify with contract's getTotalVotes()
    try {
      const contractTotal = await contract.methods.getTotalVotes().call();
      const contractTotalNum = safeToInt(contractTotal);
      if (contractTotalNum !== totalVotes) {
        console.warn(`[RESULT] Vote total mismatch! Summed: ${totalVotes}, Contract: ${contractTotalNum}`);
      } else {
        console.log(`[RESULT] Vote totals verified: ${totalVotes}`);
      }
    } catch (e) {
      // getTotalVotes might not exist in older contracts
    }

    // Display results
    displayResults(mergedCandidates, totalVotes, isVotingActive, votingStatus, startDate, endDate);
    resultsDisplay.setAttribute('data-loaded', 'true');

  } catch (error) {
    console.error('[RESULT] Error fetching results:', error);
    displayError(`Unable to fetch election results: ${error.message}`);
  }
}

// ===============================================
// FETCH VOTE COUNTS FROM BLOCKCHAIN FOR MONGODB CANDIDATES
// MongoDB = source of truth for candidate LIST
// Blockchain = source of truth for VOTE COUNTS only
// Candidates deleted from MongoDB are NEVER shown, even if on blockchain
// ===============================================

async function fetchVoteCountsForMongoCandidates(mongoCandidates) {
  const results = [];

  // Build a map of blockchain candidates (candidateId/name -> aggregated vote count)
  const blockchainAggregates = new Map();

  try {
    // Try getAllCandidates() first (single call, efficient)
    try {
      const allCandidates = await contract.methods.getAllCandidates().call();
      console.log('[RESULT] getAllCandidates() returned', allCandidates.length, 'entries');

      // getAllCandidates returns full Candidate structs (15 fields, index 0-14):
      // 0:id, 1:name, ..., 12:candidateId, 13:candidatePassword, 14:voteCount
      for (let i = 0; i < allCandidates.length; i++) {
        const c = allCandidates[i];
        const candidateId = safeToString(c.candidateId || c[12]);
        const name = safeToString(c.name || c[1]);
        const voteCount = safeToInt(c.voteCount || c[14]);
        const key = normalizeKey(candidateId, name);

        if (!blockchainAggregates.has(key)) {
          blockchainAggregates.set(key, { voteCount: 0, ids: [] });
        }
        const agg = blockchainAggregates.get(key);
        agg.voteCount += voteCount;
        agg.ids.push(i + 1);
      }

      if (allCandidates.length > 0) {
        console.log('[RESULT] Loaded blockchain data via getAllCandidates()');
      }
    } catch (e) {
      console.log('[RESULT] getAllCandidates() not available, using individual calls:', e.message);

      // Fallback: Individual getCandidate() calls
      const countRaw = await contract.methods.getCountCandidates().call();
      const count = safeToInt(countRaw);
      console.log('[RESULT] Total candidates on blockchain:', count);

      for (let i = 1; i <= count; i++) {
        try {
          const bc = await contract.methods.getCandidate(i).call();
          // getCandidate returns 14 values (index 0-13), WITHOUT candidatePassword:
          // 0:id, 1:name, ..., 12:candidateId, 13:voteCount
          const candidateId = safeToString(bc.candidateId || bc[12]);
          const name = safeToString(bc.name || bc[1]);
          const voteCount = safeToInt(bc.voteCount || bc[13]);
          const key = normalizeKey(candidateId, name);

          if (!blockchainAggregates.has(key)) {
            blockchainAggregates.set(key, { voteCount: 0, ids: [] });
          }
          const agg = blockchainAggregates.get(key);
          agg.voteCount += voteCount;
          agg.ids.push(i);
        } catch (err) {
          console.warn('[RESULT] Error fetching blockchain candidate #' + i + ':', err.message);
        }
      }
    }
  } catch (bcError) {
    console.error('[RESULT] Error fetching blockchain data:', bcError.message);
  }

  console.log('[RESULT] Blockchain aggregates:', blockchainAggregates.size, 'unique entries');

  // Match ONLY MongoDB candidates with blockchain vote counts
  // Candidates NOT in MongoDB are IGNORED (even if they exist on blockchain)
  for (const mc of mongoCandidates) {
    const key = normalizeKey(mc.candidateId, mc.name);
    const bcMatch = blockchainAggregates.get(key);
    const voteCount = bcMatch ? bcMatch.voteCount : 0;

    if (bcMatch) {
      console.log('[RESULT] Matched "' + mc.name + '" (' + (mc.candidateId || 'no id') + ') -> ' + voteCount + ' votes (blockchain IDs: ' + bcMatch.ids.join(',') + ')');
    } else {
      console.warn('[RESULT] "' + mc.name + '" not on blockchain yet - showing 0 votes');
    }

    results.push({
      name: mc.name || 'Unknown',
      party: mc.party || 'Independent',
      electionCenter: mc.electionCenter || '',
      email: mc.email || '',
      phoneNumber: mc.phoneNumber || '',
      candidateId: mc.candidateId || '',
      votes: voteCount,
      percentage: 0,
      source: bcMatch ? 'merged' : 'mongodb-only'
    });
  }

  logCandidateSummary(results);
  return results;
}

// ===============================================
// DISPLAY RESULTS
// ===============================================

function displayResults(results, totalVotes, isVotingActive, votingStatus, startDate, endDate) {
  const resultsDisplay = document.getElementById('resultsDisplay');
  resultsDisplay.innerHTML = '';

  if (!results || results.length === 0) {
    resultsDisplay.innerHTML = `
      <div class="info-message">
        <i class="fas fa-hourglass-half"></i>
        <p>No results available yet.</p>
      </div>
    `;
    return;
  }

  // Get current time for last updated
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Status badge
  var statusBadge;
  if (isVotingActive) {
    statusBadge = '<span class="live-badge"><i class="fas fa-circle" style="animation: pulse 1.5s infinite;"></i> LIVE</span>';
  } else if (votingStatus === 'Ended') {
    statusBadge = '<span class="final-badge"><i class="fas fa-check-circle"></i> FINAL RESULTS</span>';
  } else {
    statusBadge = '<span class="status-badge"><i class="fas fa-info-circle"></i> ' + escapeHtml(votingStatus) + '</span>';
  }

  // Date info
  var dateInfo = '';
  if (startDate && endDate) {
    var dateOpts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateInfo = '<div class="date-info"><i class="fas fa-calendar-alt"></i> ' +
      startDate.toLocaleDateString('en-US', dateOpts) + ' &mdash; ' +
      endDate.toLocaleDateString('en-US', dateOpts) + '</div>';
  }

  var summaryHTML = `
    <div class="results-header">
      <div class="status-section">
        ${statusBadge}
        <span class="voting-status-text">${escapeHtml(votingStatus)}</span>
      </div>
      <div class="total-votes-summary">
        <i class="fas fa-users"></i>
        <span class="total-votes-text">Total Votes: <strong>${totalVotes}</strong></span>
      </div>
      <div class="last-updated">
        <i class="fas fa-clock"></i>
        <span>Updated: ${timeString}</span>
      </div>
    </div>
    ${dateInfo}
    ${isVotingActive ? '<div class="info-banner"><i class="fas fa-info-circle"></i> Results are updating in real-time as votes are cast</div>' : ''}
  `;
  resultsDisplay.innerHTML = summaryHTML;

  // Display each candidate's results
  results.forEach(function(candidate, index) {
    var isWinner = index === 0 && candidate.votes > 0 && !isVotingActive && votingStatus === 'Ended';
    var position = index + 1;

    var cardHTML = `
      <div class="candidate-card ${isWinner ? 'winner-card' : ''}">
        <div class="position-badge">#${position}</div>
        <div class="candidate-info">
          <div>
            <span class="candidate-name">${escapeHtml(candidate.name)}</span>
            ${isWinner ? '<span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span>' : ''}
            <div class="candidate-details">
              <span class="party-name"><i class="fas fa-flag"></i> ${escapeHtml(candidate.party || 'Independent')}</span>
              ${candidate.electionCenter ? '<span class="election-center"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(candidate.electionCenter) + '</span>' : ''}
            </div>
          </div>
          <div>
            <span class="vote-count">${candidate.votes}</span>
            <span class="vote-label">votes</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${candidate.percentage}%;" data-width="${candidate.percentage}"></div>
        </div>
        <div class="percentage">${candidate.percentage}%</div>
      </div>
    `;

    resultsDisplay.innerHTML += cardHTML;
  });

  // Smooth animation for progress bars on first load
  if (!resultsDisplay.hasAttribute('data-animated')) {
    setTimeout(function() {
      document.querySelectorAll('.progress-fill').forEach(function(bar) {
        bar.style.transition = 'width 1s ease-out';
      });
      resultsDisplay.setAttribute('data-animated', 'true');
    }, 100);
  }
}

function displayError(message) {
  var resultsDisplay = document.getElementById('resultsDisplay');
  resultsDisplay.innerHTML = `
    <div class="info-message" style="border-left-color: #f44336; background: #f4433615;">
      <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
      <p style="color: #f44336;">${escapeHtml(message)}</p>
    </div>
  `;
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function normalizeKey(candidateId, name) {
  if (candidateId && String(candidateId).trim().length > 0) {
    return String(candidateId).toLowerCase().trim();
  }
  return (name ? String(name) : '').toLowerCase().trim();
}

/**
 * Safely convert any value (BigInt, BN, String, Number) to integer
 */
function safeToInt(value) {
  if (value === null || value === undefined) return 0;
  // Handle BigInt
  if (typeof value === 'bigint') return Number(value);
  // Handle BN objects (web3 v1.x)
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    return parseInt(value.toString(10), 10) || 0;
  }
  // Handle string
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  // Handle number
  if (typeof value === 'number') return Math.floor(value);
  return 0;
}

/**
 * Safely convert any value to string
 */
function safeToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value.toString === 'function') return value.toString();
  return String(value);
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function logCandidateSummary(candidates) {
  console.log('[RESULT] === CANDIDATE SUMMARY ===');
  candidates.forEach(function(c) {
    console.log('  ' + c.name + ' (' + (c.candidateId || 'no id') + '): ' + c.votes + ' votes');
  });
  console.log('[RESULT] ========================');
}
