/**
 * EtherVox Frontend Application Logic
 * Author: Abir Chakraborty
 * Description: Handles Web3 interaction, voting functionality, and UI updates
 */

// Web3 and contract interaction imports
// Web3.js v4 import syntax
const { Web3 } = require('web3');

// Load voting contract artifacts
const votingArtifacts = require('../../build/contracts/Voting.json');

// Main application object with enhanced error handling
window.App = {
  web3: null,
  account: null,
  contracts: {},

  // Initialize the application and Web3 connection
  eventStart: async function() { 
    try {
      return await App.initWeb3();
    } catch (error) {
      console.error('Error initializing app:', error);
      alert('Failed to initialize the application. Please check your connection and try again.');
    }
  },

  // Initialize Web3 with modern MetaMask integration
  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3 = new Web3(window.ethereum);
      try {
        // Request account access if needed
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
          alert('Please connect to MetaMask.');
          return;
        }
        
        App.account = accounts[0];
        console.log('Connected account:', App.account);
        
        // Check network connection
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Connected to chain ID:', chainId);
        
        // Check if connected to Ganache (chain ID 1337 or 5777)
        if (chainId === '0x539' || chainId === '0x1691') { // 1337 or 5777 in hex
          console.log('Connected to Ganache network');
        } else {
          console.warn('Not connected to Ganache. Current chain:', chainId);
          alert('Please connect MetaMask to your local Ganache network (localhost:7545 or localhost:8545)');
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
          if (accounts.length === 0) {
            alert('Please connect to MetaMask.');
          } else {
            App.account = accounts[0];
            console.log('Account changed to:', App.account);
            $("#accountAddress").html("Your Account: " + App.account);
          }
        });
        
        return App.initContract();
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        alert('Error connecting to MetaMask. Please make sure MetaMask is installed and unlocked.');
      }
    } else {
      alert('Please install MetaMask to use this application.');
    }
  },

  // Initialize the smart contract
  initContract: async function() {
    try {
      // Get network ID and check deployment
      const networkId = await App.web3.eth.net.getId();
      console.log('Current network ID:', networkId);
      
      // Check if contract is deployed on this network
      const deployedNetwork = votingArtifacts.networks[networkId];
      if (!deployedNetwork) {
        console.error('Contract not deployed on network:', networkId);
        console.log('Available networks:', Object.keys(votingArtifacts.networks));
        alert(`Contract not deployed on current network (ID: ${networkId}). Please deploy the contract or switch to the correct network.`);
        return;
      }

      // Get the necessary contract artifact file and instantiate it with truffle-contract
      App.contracts.Voting = new App.web3.eth.Contract(
        votingArtifacts.abi,
        deployedNetwork.address
      );

      console.log('Contract initialized:', App.contracts.Voting.options.address);
      console.log('Contract ABI methods:', Object.keys(App.contracts.Voting.methods));

      // Test basic contract connection
      try {
        const owner = await App.contracts.Voting.methods.owner().call();
        console.log('Contract owner:', owner);
        console.log('Current account:', App.account);
      } catch (testError) {
        console.error('Contract connection test failed:', testError);
        alert('Contract connection failed. Please check Ganache is running and contract is deployed.');
        return;
      }

      // Update UI with account
      $("#accountAddress").html("Your Account: " + App.account);
      
      return App.loadVotingData();
      
    } catch (error) {
      console.error('Error initializing contract:', error);
      alert('Failed to load voting contract. Please check if Ganache is running and contract is deployed.');
    }
  },

  // Load voting data from the blockchain
  loadVotingData: async function() {
    try {
      const instance = App.contracts.Voting;
      
      // Get candidate count
      const countCandidates = await instance.methods.getCountCandidates().call();
      window.countCandidates = parseInt(countCandidates);
      
      // Set up event handlers
      App.setupEventHandlers();
      
      // Load voting dates
      try {
        const dates = await instance.methods.getDates().call();
        const startDate = new Date(parseInt(dates[0]) * 1000);
        const endDate = new Date(parseInt(dates[1]) * 1000);
        $("#dates").text(startDate.toDateString() + " - " + endDate.toDateString());
      } catch (error) {
        console.warn('No voting dates set yet:', error.message);
        $("#dates").text("No voting dates set yet");
      }

      // Check if user has already voted
      try {
        const hasVoted = await instance.methods.checkVote().call({ from: App.account });
        if (!hasVoted) {
          $("#voteButton").attr("disabled", false);
        } else {
          $("#voteButton").attr("disabled", true);
          $("#msg").html("<p>You have already voted.</p>");
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
      }
      
      // Load candidates from both blockchain and database
      await App.loadCandidates();
      
    } catch (error) {
      console.error('Error loading voting data:', error);
      alert('Failed to load voting data. Please refresh the page.');
    }
  },

  // Load candidates from database and display them
  loadCandidates: async function() {
    try {
      const response = await fetch('http://127.0.0.1:8001/candidates');
      if (response.ok) {
        const data = await response.json();
        // Check if response has candidates array property
        const candidates = data.candidates || data;
        if (Array.isArray(candidates)) {
          App.displayCandidates(candidates);
        } else {
          console.warn('Candidates data is not an array:', data);
        }
      } else {
        console.warn('Failed to fetch candidates from database');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  },

  // Display candidates in the UI
  displayCandidates: function(candidates) {
    const candidateContainer = $("#candidate table tbody");
    candidateContainer.empty();
    
    // Safety check: ensure candidates is an array
    if (!Array.isArray(candidates)) {
      console.error('displayCandidates: candidates is not an array', candidates);
      return;
    }
    
    candidates.forEach((candidate, index) => {
      const row = `
        <tr>
          <td>
            <input type="radio" name="candidate" value="${index}" id="candidate${index}">
          </td>
          <td>
            <label for="candidate${index}">
              <strong>${candidate.name}</strong><br>
              <small>Age: ${candidate.age} | Party: ${candidate.party}</small>
            </label>
          </td>
        </tr>
      `;
      candidateContainer.append(row);
    });
  },

  // Set up event handlers
  setupEventHandlers: function() {
    // Enhanced Add Candidate Handler
    $('#candidateForm').on('submit', async function(e) {
      e.preventDefault();
      await App.addCandidate();
    });
    
    // Vote Handler
    $('#voteButton').click(async function() {
      await App.vote();
    });
  },

  // Add candidate functionality
  addCandidate: async function() {
    try {
      // Get form data
      const formData = {
        name: document.getElementById('name').value,
        age: parseInt(document.getElementById('age').value),
        dateOfBirth: document.getElementById('dateOfBirth').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        candidateAddress: document.getElementById('candidateAddress').value,
        party: document.getElementById('party').value,
        electionCenter: document.getElementById('electionCenter').value,
        candidateId: document.getElementById('candidateId').value,
        candidatePassword: document.getElementById('candidatePassword').value,
        electionStartDate: document.getElementById('electionStartDate').value,
        electionEndDate: document.getElementById('electionEndDate').value
      };

      // Validate election dates
      const startDate = new Date(formData.electionStartDate);
      const endDate = new Date(formData.electionEndDate);
      const currentDate = new Date();

      if (startDate <= currentDate) {
        App.showStatus('Election start date must be in the future', 'error');
        return;
      }

      if (endDate <= startDate) {
        App.showStatus('Election end date must be after start date', 'error');
        return;
      }

      // Validate password confirmation
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (formData.candidatePassword !== confirmPassword) {
        App.showStatus('Passwords do not match', 'error');
        return;
      }

      // Check Web3 connection before proceeding
      if (!App.contracts.Voting || !App.account) {
        App.showStatus('Web3 connection not initialized. Please connect to MetaMask.', 'error');
        return;
      }

      App.showStatus('Adding candidate to blockchain...', 'info');

      // First add candidate to blockchain (this will deduct ETH)
      const instance = App.contracts.Voting;
      
      try {
        // Add candidate to blockchain with gas estimation
        const gasEstimate = await instance.methods.addCandidate(
          formData.name,
          formData.age,
          formData.dateOfBirth,
          formData.electionCenter,
          formData.party,
          formData.candidateAddress,
          formData.email,
          formData.phoneNumber,
          formData.candidateId,
          formData.candidatePassword
        ).estimateGas({ from: App.account });

        console.log('Estimated gas:', gasEstimate);

        // Convert BigInt to number for gas calculation
        const gasBuffer = Math.ceil(Number(gasEstimate) * 1.2); // Add 20% buffer

        const tx = await instance.methods.addCandidate(
          formData.name,
          formData.age,
          formData.dateOfBirth,
          formData.electionCenter,
          formData.party,
          formData.candidateAddress,
          formData.email,
          formData.phoneNumber,
          formData.candidateId,
          formData.candidatePassword
        ).send({ 
          from: App.account,
          gas: gasBuffer,
          gasPrice: '20000000000' // 20 gwei
        });

        console.log('Blockchain transaction hash:', tx.transactionHash);
        
        // Get the candidate ID from blockchain
        const candidateCount = await instance.methods.getCountCandidates().call();
        formData.blockchainAddress = tx.transactionHash;

        App.showStatus('Candidate added to blockchain! Now saving to database...', 'info');

      } catch (blockchainError) {
        console.error('Blockchain error:', blockchainError);
        
        if (blockchainError.code === 4001) {
          App.showStatus('Transaction rejected by user', 'error');
          return;
        } else if (blockchainError.message && blockchainError.message.includes('NotOwner')) {
          App.showStatus('Error: Only the contract owner can add candidates', 'error');
          return;
        } else {
          App.showStatus('Blockchain error: ' + blockchainError.message, 'error');
          return;
        }
      }

      // Then save to MongoDB database
      const response = await fetch('http://127.0.0.1:8001/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        App.showStatus('Candidate added successfully to blockchain and database! ETH deducted from your wallet.', 'success');
        document.getElementById('candidateForm').reset();
        await App.loadCandidates(); // Refresh candidate list
      } else {
        const error = await response.json();
        App.showStatus('Blockchain success but database error: ' + error.detail, 'warning');
      }
    } catch (error) {
      console.error('Error adding candidate:', error);
      App.showStatus('Error adding candidate: ' + error.message, 'error');
    }
  },

  // Vote for a candidate
  vote: async function() {
    const candidateID = $("input[name='candidate']:checked").val();
    
    if (!candidateID) {
      $("#msg").html("<p>Please select a candidate to vote for.</p>");
      return;
    }

    try {
      const instance = App.contracts.Voting;
      await instance.methods.vote(parseInt(candidateID)).send({ from: App.account });
      $("#msg").html("<p>Your vote has been recorded successfully!</p>");
      $("#voteButton").attr("disabled", true);
    } catch (error) {
      console.error('Error voting:', error);
      $("#msg").html(`<p>Error voting: ${error.message}</p>`);
    }
  },

  // Validate candidate data
  validateCandidateData: function(data) {
    if (!data.name || data.name.length < 2) {
      alert('Please enter a valid name (at least 2 characters).');
      return false;
    }
    
    if (!data.age || data.age < 18 || data.age > 100) {
      alert('Please enter a valid age (18-100).');
      return false;
    }
    
    if (!data.dateOfBirth) {
      alert('Please enter the date of birth.');
      return false;
    }
    
    if (!data.email || !data.email.includes('@')) {
      alert('Please enter a valid email address.');
      return false;
    }
    
    if (!data.phoneNumber || data.phoneNumber.length < 10) {
      alert('Please enter a valid phone number.');
      return false;
    }
    
    if (!data.candidateAddress || data.candidateAddress.length < 10) {
      alert('Please enter a valid address.');
      return false;
    }
    
    if (!data.party || data.party.length < 2) {
      alert('Please enter a valid political party.');
      return false;
    }
    
    if (!data.electionCenter || data.electionCenter.length < 5) {
      alert('Please enter a valid election center address.');
      return false;
    }
    
    if (!data.candidateId || data.candidateId.length < 3) {
      alert('Please enter a valid candidate ID.');
      return false;
    }
    
    if (!data.candidatePassword || data.candidatePassword.length < 8) {
      alert('Please enter a password with at least 8 characters.');
      return false;
    }
    
    if (data.candidatePassword !== data.confirmPassword) {
      alert('Passwords do not match. Please confirm your password.');
      return false;
    }
    
    return true;
  },

  // Show status message
  showStatus: function(message, type = 'info') {
    const statusElement = $('#status');
    if (statusElement.length) {
      statusElement.removeClass('info error success warning')
                  .addClass(type)
                  .text(message)
                  .show();
    } else {
      console.log(`Status (${type}): ${message}`);
    }
  }
};

// Global logout function
window.logout = function() {
  // Clear any stored authentication tokens
  localStorage.removeItem('jwtTokenVoter');
  localStorage.removeItem('jwtTokenAdmin');
  sessionStorage.clear();
  
  // Show confirmation message
  if (confirm('Are you sure you want to logout?')) {
    // Redirect to login page
    window.location.replace('http://localhost:8081/login.html');
  }
};

// Initialize the app when the window loads
$(window).on('load', function() {
  App.eventStart();
});
