// EtherVox - Results Page JavaScript

// MongoDB API Configuration
const API_BASE_URL = 'http://127.0.0.1:8001';

// Smart Contract Configuration - will be set dynamically
let CONTRACT_ADDRESS = null;
let web3;
let contract;
let refreshInterval;
let contractABI = null;
let isLoading = false; // Flag to prevent concurrent loads

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Results page loaded');
  
  try {
    // Initialize Web3 and load results
    await initializeWeb3();
    await loadElectionResults();
    
    // Start auto-refresh for live voting results (every 5 seconds)
    startAutoRefresh();
  } catch (error) {
    console.error('Error loading results:', error);
    displayError('Failed to load election results. Please try again later.');
  }
});

async function initializeWeb3() {
  // Check if Web3 is available
  if (typeof window.ethereum !== 'undefined') {
    try {
      web3 = new Web3(window.ethereum);
      
      // Load contract ABI and get deployed address
      const response = await fetch('/contracts/Voting.json');
      if (!response.ok) {
        throw new Error('Failed to load contract ABI file');
      }
      const contractData = await response.json();
      contractABI = contractData.abi;
      
      // Get network ID and find deployed contract address
      const networkId = await web3.eth.net.getId();
      console.log('Network ID:', networkId);
      
      const deployedNetwork = contractData.networks[networkId];
      if (!deployedNetwork) {
        console.warn('Contract not deployed on network:', networkId);
        console.log('Available networks:', Object.keys(contractData.networks || {}));
        throw new Error(`Contract not deployed on current network (ID: ${networkId})`);
      }
      
      CONTRACT_ADDRESS = deployedNetwork.address;
      console.log('Contract address from network:', CONTRACT_ADDRESS);
      
      // Initialize contract
      contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
      console.log('Web3 and contract initialized successfully with MetaMask');
      
    } catch (error) {
      console.error('Error initializing Web3 with MetaMask:', error);
      console.log('Falling back to Ganache provider...');
      await initializeWithGanache();
    }
  } else {
    console.warn('MetaMask not detected. Attempting to use local Ganache provider...');
    await initializeWithGanache();
  }
}

async function initializeWithGanache() {
  try {
    // Fallback to local Ganache
    web3 = new Web3('http://127.0.0.1:7545');
    
    // Load contract ABI and get deployed address
    const response = await fetch('/contracts/Voting.json');
    if (!response.ok) {
      throw new Error('Failed to load contract ABI file');
    }
    const contractData = await response.json();
    contractABI = contractData.abi;
    
    // Get network ID from Ganache (usually 5777 or 1337)
    const networkId = await web3.eth.net.getId();
    console.log('Ganache Network ID:', networkId);
    
    const deployedNetwork = contractData.networks[networkId];
    if (!deployedNetwork) {
      console.warn('Contract not deployed on Ganache network:', networkId);
      console.log('Available networks:', Object.keys(contractData.networks || {}));
      throw new Error(`Contract not deployed. Please run 'truffle migrate' first.`);
    }
    
    CONTRACT_ADDRESS = deployedNetwork.address;
    console.log('Contract address from Ganache:', CONTRACT_ADDRESS);
    
    // Initialize contract
    contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
    console.log('Web3 initialized with Ganache provider');
  } catch (err) {
    console.error('Error initializing Web3 with Ganache:', err);
    throw new Error('Failed to initialize blockchain connection. Please ensure MetaMask is installed or Ganache is running.');
  }
}

async function loadElectionResults() {
  // Prevent concurrent calls
  if (isLoading) {
    console.log('Already loading results, skipping duplicate call');
    return;
  }
  
  isLoading = true;
  const resultsDisplay = document.getElementById('resultsDisplay');
  
  try {
    // Show loading message
    resultsDisplay.innerHTML = `
      <div class="info-message">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading live election results from blockchain and database...</p>
      </div>
    `;
    
    // Try the new endpoint first, fall back to the existing one
    let candidatesResponse = await fetch(`${API_BASE_URL}/api/voting-results`);
    
    // Fallback to existing /candidates endpoint if new one doesn't exist
    if (!candidatesResponse.ok) {
      console.log('Trying fallback endpoint /candidates...');
      candidatesResponse = await fetch(`${API_BASE_URL}/candidates`);
    }
    
    if (!candidatesResponse.ok) {
      throw new Error('Failed to fetch candidates from database');
    }
    
    const candidatesData = await candidatesResponse.json();
    const candidates = candidatesData.candidates;
    
    if (!candidates || candidates.length === 0) {
      displayError('No candidates found in the database.');
      return;
    }
    
    console.log(`Found ${candidates.length} candidates in database`);
    
    // Fetch vote counts from blockchain
    const candidatesWithVotes = await fetchVoteCounts(candidates);
    
    // Calculate total votes
    const totalVotes = candidatesWithVotes.reduce((sum, c) => sum + c.votes, 0);
    
    // Calculate percentages
    candidatesWithVotes.forEach(candidate => {
      candidate.percentage = totalVotes > 0 
        ? Math.round((candidate.votes / totalVotes) * 100 * 10) / 10 
        : 0;
    });
    
    // Sort by votes (descending)
    candidatesWithVotes.sort((a, b) => b.votes - a.votes);
    
    // Display results
    displayResults(candidatesWithVotes, totalVotes);
    
  } catch (error) {
    console.error('Error fetching results:', error);
    displayError(`Unable to fetch election results: ${error.message}`);
  } finally {
    // Always reset loading flag
    isLoading = false;
  }
}

async function fetchVoteCounts(candidates) {
  try {
    // Get total number of candidates from contract
    const countCandidates = await contract.methods.countCandidates().call();
    console.log(`Total candidates in blockchain: ${countCandidates}`);
    
    // Fetch all candidates from blockchain
    const blockchainCandidates = await contract.methods.getAllCandidates().call();
    
    console.log('Blockchain candidates:', blockchainCandidates);
    
    // Match MongoDB candidates with blockchain vote counts
    const candidatesWithVotes = candidates.map(dbCandidate => {
      // Find matching blockchain candidate by candidateId (most reliable)
      const blockchainCandidate = blockchainCandidates.find(bc => {
        // Primary match: by candidateId (exact match)
        if (bc.candidateId && dbCandidate.candidateId && bc.candidateId === dbCandidate.candidateId) {
          console.log(`✓ Matched by candidateId: ${dbCandidate.name} (${dbCandidate.candidateId})`);
          return true;
        }
        // Fallback: try to match by name (case-insensitive, trimmed)
        const bcName = (bc.name || '').toLowerCase().trim();
        const dbName = (dbCandidate.name || '').toLowerCase().trim();
        if (bcName && dbName && bcName === dbName) {
          console.log(`✓ Matched by name: ${dbCandidate.name}`);
          return true;
        }
        return false;
      });
      
      // voteCount is at index 11 in the struct (not 10!)
      let voteCount = 0;
      if (blockchainCandidate) {
        const rawVoteCount = blockchainCandidate.voteCount || blockchainCandidate[11] || 0;
        voteCount = typeof rawVoteCount === 'bigint' ? Number(rawVoteCount) : parseInt(rawVoteCount || 0);
      }
      
      console.log(`Candidate: ${dbCandidate.name} (ID: ${dbCandidate.candidateId}) - Votes: ${voteCount}${blockchainCandidate ? ' [Matched]' : ' [No Match]'}`);
      
      return {
        id: dbCandidate._id,
        name: dbCandidate.name,
        party: dbCandidate.party,
        age: dbCandidate.age,
        electionCenter: dbCandidate.electionCenter || 'Default Center',
        email: dbCandidate.email,
        phoneNumber: dbCandidate.phoneNumber,
        candidateId: dbCandidate.candidateId,
        votes: voteCount,
        percentage: 0, // Will be calculated later
        matched: !!blockchainCandidate // Track if candidate was found on blockchain
      };
    });
    
    // Log summary
    const matchedCount = candidatesWithVotes.filter(c => c.matched).length;
    const totalVotes = candidatesWithVotes.reduce((sum, c) => sum + c.votes, 0);
    console.log(`✓ Matched ${matchedCount}/${candidates.length} candidates with blockchain`);
    console.log(`✓ Total votes counted: ${totalVotes}`);
    
    return candidatesWithVotes;
    
  } catch (error) {
    console.error('Error fetching vote counts from blockchain:', error);
    console.error('Error details:', error.message);
    
    // Return candidates with 0 votes if blockchain fetch fails
    return candidates.map(candidate => ({
      id: candidate._id,
      name: candidate.name,
      party: candidate.party,
      age: candidate.age,
      electionCenter: candidate.electionCenter || 'Default Center',
      email: candidate.email,
      phoneNumber: candidate.phoneNumber,
      candidateId: candidate.candidateId,
      votes: 0,
      percentage: 0,
      matched: false
    }));
  }
}

async function displayResults(results, totalVotes) {
  const resultsDisplay = document.getElementById('resultsDisplay');
  
  if (!results || results.length === 0) {
    resultsDisplay.innerHTML = `
      <div class="info-message">
        <i class="fas fa-hourglass-half"></i>
        <p>No results available yet. Voting may still be in progress.</p>
      </div>
    `;
    return;
  }
  
  // Build complete HTML string first (prevents race condition issues)
  let htmlContent = '';
  
  // Add live indicator
  htmlContent += `
    <div class="live-indicator">
      <span class="live-dot"></span>
      <span class="live-text">LIVE RESULTS - Auto-refreshing every 5 seconds</span>
    </div>
  `;
  
  // Add total votes summary
  htmlContent += `
    <div class="total-votes-summary">
      <i class="fas fa-users"></i>
      <span class="total-votes-text">Total Votes Cast: <strong>${totalVotes}</strong></span>
    </div>
  `;
  
  // Build all candidate cards
  results.forEach((candidate, index) => {
    // Winner detection: first place with votes > 0, handles ties
    const isWinner = candidate.votes > 0 && candidate.votes === results[0].votes;
    const position = index + 1;
    
    htmlContent += `
      <div class="candidate-card ${isWinner ? 'winner-card' : ''}">
        <div class="position-badge">#${position}</div>
        <div class="candidate-info">
          <div>
            <span class="candidate-name">${escapeHtml(candidate.name)}</span>
            ${isWinner ? '<span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span>' : ''}
            <div class="candidate-details">
              <span class="party-name"><i class="fas fa-flag"></i> ${escapeHtml(candidate.party)}</span>
              <span class="election-center"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(candidate.electionCenter)}</span>
            </div>
          </div>
          <div>
            <span class="vote-count">${candidate.votes}</span>
            <span class="vote-label">votes</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%;" data-width="${candidate.percentage}"></div>
        </div>
        <div class="percentage">${candidate.percentage}%</div>
      </div>
    `;
  });
  
  // Set innerHTML once with complete content (atomic operation)
  resultsDisplay.innerHTML = htmlContent;
  
  // Animate progress bars
  setTimeout(() => {
    document.querySelectorAll('.progress-fill').forEach((bar) => {
      const targetWidth = bar.getAttribute('data-width');
      bar.style.width = targetWidth + '%';
    });
  }, 100);
}

function displayError(message) {
  const resultsDisplay = document.getElementById('resultsDisplay');
  resultsDisplay.innerHTML = `
    <div class="info-message" style="border-left-color: #f44336; background: #f4433615;">
      <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
      <p style="color: #f44336;">${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-refresh functionality for live voting results
function startAutoRefresh() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Refresh results every 5 seconds
  refreshInterval = setInterval(async () => {
    console.log('Auto-refreshing election results...');
    try {
      await loadElectionResults();
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    }
  }, 5000); // 5 seconds
  
  console.log('Auto-refresh started - updating every 5 seconds');
}

// Stop auto-refresh when page is unloaded
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
