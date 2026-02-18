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
    // Track used blockchain indices to prevent duplicate matching (e.g. when candidateId is shared)
    const usedBlockchainIndices = new Set();
    
    const candidatesWithVotes = candidates.map(dbCandidate => {
      // Find matching blockchain candidate - try candidateId+name first, then candidateId, then name
      let blockchainCandidate = null;
      
      // Pass 1: Match by BOTH candidateId AND name (most precise)
      for (let i = 0; i < blockchainCandidates.length; i++) {
        if (usedBlockchainIndices.has(i)) continue;
        const bc = blockchainCandidates[i];
        const bcCandidateId = bc.candidateId || '';
        const bcName = (bc.name || '').toLowerCase().trim();
        const dbName = (dbCandidate.name || '').toLowerCase().trim();
        
        if (bcCandidateId && dbCandidate.candidateId && bcCandidateId === dbCandidate.candidateId
            && bcName && dbName && bcName === dbName) {
          blockchainCandidate = bc;
          usedBlockchainIndices.add(i);
          console.log(`✓ Matched by candidateId+name: ${dbCandidate.name}`);
          break;
        }
      }
      
      // Pass 2: Match by candidateId only
      if (!blockchainCandidate) {
        for (let i = 0; i < blockchainCandidates.length; i++) {
          if (usedBlockchainIndices.has(i)) continue;
          const bc = blockchainCandidates[i];
          if (bc.candidateId && dbCandidate.candidateId && bc.candidateId === dbCandidate.candidateId) {
            blockchainCandidate = bc;
            usedBlockchainIndices.add(i);
            console.log(`✓ Matched by candidateId: ${dbCandidate.name}`);
            break;
          }
        }
      }
      
      // Pass 3: Match by name only
      if (!blockchainCandidate) {
        for (let i = 0; i < blockchainCandidates.length; i++) {
          if (usedBlockchainIndices.has(i)) continue;
          const bc = blockchainCandidates[i];
          const bcName = (bc.name || '').toLowerCase().trim();
          const dbName = (dbCandidate.name || '').toLowerCase().trim();
          if (bcName && dbName && bcName === dbName) {
            blockchainCandidate = bc;
            usedBlockchainIndices.add(i);
            console.log(`✓ Matched by name: ${dbCandidate.name}`);
            break;
          }
        }
      }
      
      // voteCount is at index 11 in the struct (not 10!)
      let voteCount = 0;
      if (blockchainCandidate) {
        // Use nullish check: 0 and 0n are valid vote counts, don't skip them with ||
        const rawVoteCount = (blockchainCandidate.voteCount != null) ? blockchainCandidate.voteCount : 0;
        voteCount = typeof rawVoteCount === 'bigint' ? Number(rawVoteCount) : (parseInt(rawVoteCount) || 0);
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
      <span class="live-text">Live Results - Auto-refreshing</span>
    </div>
  `;
  
  // Stats row
  const highestVotes = results.length > 0 ? results[0].votes : 0;
  const winnersCount = results.filter(c => c.votes === highestVotes && c.votes > 0).length;
  const winnerName = winnersCount === 1 ? results[0].name : (winnersCount > 1 ? 'Tie' : 'N/A');
  
  htmlContent += `
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">${totalVotes}</span>
        <span class="stat-label">Total Votes</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${results.length}</span>
        <span class="stat-label">Candidates</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${highestVotes > 0 ? escapeHtml(winnerName) : '---'}</span>
        <span class="stat-label">${winnersCount > 1 ? 'Leading (Tied)' : 'Leading'}</span>
      </div>
    </div>
  `;
  
  // Avatar colors for candidates
  const avatarColors = [
    'linear-gradient(135deg, #00c8ff, #0080ff)',
    'linear-gradient(135deg, #ff0080, #ff4060)',
    'linear-gradient(135deg, #7b2ff7, #b24bf3)',
    'linear-gradient(135deg, #00ff88, #00cc6a)',
    'linear-gradient(135deg, #ff8c00, #ffb300)',
    'linear-gradient(135deg, #e91e63, #9c27b0)',
    'linear-gradient(135deg, #00bcd4, #009688)',
    'linear-gradient(135deg, #ff5722, #f44336)'
  ];
  
  // Build all candidate cards
  results.forEach((candidate, index) => {
    const isWinner = candidate.votes > 0 && candidate.votes === highestVotes && winnersCount === 1;
    const isTied = candidate.votes > 0 && candidate.votes === highestVotes && winnersCount > 1;
    const hasNoVotes = candidate.votes === 0;
    const position = index + 1;
    const initial = (candidate.name || '?').charAt(0).toUpperCase();
    const avatarColor = avatarColors[index % avatarColors.length];
    
    let cardClass = 'candidate-card';
    if (isWinner) cardClass += ' winner-card';
    if (isTied) cardClass += ' tied-card';
    if (hasNoVotes) cardClass += ' no-votes';
    
    htmlContent += `
      <div class="${cardClass}">
        <div class="position-badge">#${position}</div>
        <div class="candidate-info">
          <div>
            <div class="candidate-avatar" style="background: ${avatarColor}">${initial}</div>
            <span class="candidate-name">
              ${isWinner ? '<span class="crown-icon">&#x1F451;</span>' : ''}
              ${escapeHtml(candidate.name)}
            </span>
            ${isWinner ? '<span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span>' : ''}
            ${isTied ? '<span class="tied-badge"><i class="fas fa-handshake"></i> Tied</span>' : ''}
            <div class="candidate-details">
              <span class="party-name"><i class="fas fa-flag"></i> ${escapeHtml(candidate.party)}</span>
              <span class="election-center"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(candidate.electionCenter)}</span>
            </div>
            ${candidate.candidateId ? `<div class="candidate-id-tag"><i class="fas fa-id-badge"></i> ${escapeHtml(candidate.candidateId)}</div>` : ''}
          </div>
          <div class="vote-count-wrapper">
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
  
  // Animate progress bars with staggered delay
  results.forEach((candidate, index) => {
    setTimeout(() => {
      const bars = document.querySelectorAll('.progress-fill');
      if (bars[index]) {
        const targetWidth = bars[index].getAttribute('data-width');
        bars[index].style.width = targetWidth + '%';
      }
    }, 150 + index * 100);
  });
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
