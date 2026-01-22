// EtherVox - Results Page JavaScript

// MongoDB API Configuration
const API_BASE_URL = 'http://127.0.0.1:8001';

// Smart Contract Configuration
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Update with your deployed contract address
let web3;
let contract;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Results page loaded');
  
  try {
    // Initialize Web3 and load results
    await initializeWeb3();
    await loadElectionResults();
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
      
      // Load contract ABI
      const response = await fetch('/contracts/Voting.json');
      const contractData = await response.json();
      const abi = contractData.abi;
      
      // Initialize contract
      contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
      console.log('Web3 and contract initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Web3:', error);
      throw new Error('Failed to initialize blockchain connection');
    }
  } else {
    throw new Error('MetaMask is not installed. Please install MetaMask to view results.');
  }
}

async function loadElectionResults() {
  const resultsDisplay = document.getElementById('resultsDisplay');
  
  try {
    // Show loading message
    resultsDisplay.innerHTML = `
      <div class="info-message">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading election results from blockchain and database...</p>
      </div>
    `;
    
    // Fetch candidates from MongoDB
    const candidatesResponse = await fetch(`${API_BASE_URL}/candidates`);
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
  }
}

async function fetchVoteCounts(candidates) {
  try {
    // Get total number of candidates from contract
    const countCandidates = await contract.methods.countCandidates().call();
    console.log(`Total candidates in blockchain: ${countCandidates}`);
    
    // Fetch all candidates from blockchain
    const blockchainCandidates = await contract.methods.getAllCandidates().call();
    
    // Match MongoDB candidates with blockchain vote counts
    const candidatesWithVotes = candidates.map(dbCandidate => {
      // Find matching blockchain candidate by candidateId or name
      const blockchainCandidate = blockchainCandidates.find(bc => 
        bc.candidateId === dbCandidate.candidateId || 
        bc.name.toLowerCase() === dbCandidate.name.toLowerCase()
      );
      
      return {
        id: dbCandidate._id,
        name: dbCandidate.name,
        party: dbCandidate.party,
        age: dbCandidate.age,
        electionCenter: dbCandidate.electionCenter,
        email: dbCandidate.email,
        phoneNumber: dbCandidate.phoneNumber,
        votes: blockchainCandidate ? parseInt(blockchainCandidate.voteCount) : 0,
        percentage: 0 // Will be calculated later
      };
    });
    
    return candidatesWithVotes;
    
  } catch (error) {
    console.error('Error fetching vote counts from blockchain:', error);
    // Return candidates with 0 votes if blockchain fetch fails
    return candidates.map(candidate => ({
      id: candidate._id,
      name: candidate.name,
      party: candidate.party,
      age: candidate.age,
      electionCenter: candidate.electionCenter,
      email: candidate.email,
      phoneNumber: candidate.phoneNumber,
      votes: 0,
      percentage: 0
    }));
  }
}

async function displayResults(results, totalVotes) {
  const resultsDisplay = document.getElementById('resultsDisplay');
  resultsDisplay.innerHTML = '';
  
  if (!results || results.length === 0) {
    resultsDisplay.innerHTML = `
      <div class="info-message">
        <i class="fas fa-hourglass-half"></i>
        <p>No results available yet. Voting may still be in progress.</p>
      </div>
    `;
    return;
  }
  
  // Add total votes summary
  const summaryHTML = `
    <div class="total-votes-summary">
      <i class="fas fa-users"></i>
      <span class="total-votes-text">Total Votes Cast: <strong>${totalVotes}</strong></span>
    </div>
  `;
  resultsDisplay.innerHTML = summaryHTML;
  
  // Display each candidate's results
  results.forEach((candidate, index) => {
    const isWinner = index === 0 && candidate.votes > 0;
    const position = index + 1;
    
    const cardHTML = `
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
    
    resultsDisplay.innerHTML += cardHTML;
  });
  
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
