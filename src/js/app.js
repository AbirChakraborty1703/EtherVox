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

  // Sync Ganache blockchain time with current system time
  // This is needed because Ganache's block.timestamp can drift from real time
  syncGanacheTime: async function () {
    try {
      // Get current blockchain timestamp
      const block = await App.web3.eth.getBlock('latest');
      const blockTime = Number(block.timestamp) * 1000;
      const currentTime = Date.now();
      const timeDiff = Math.floor((currentTime - blockTime) / 1000);

      console.log('Blockchain time:', new Date(blockTime).toLocaleString());
      console.log('System time:', new Date(currentTime).toLocaleString());
      console.log('Time difference (seconds):', timeDiff);

      // If blockchain is behind by more than 60 seconds, advance it
      if (timeDiff > 60) {
        console.log('Advancing Ganache time by', timeDiff, 'seconds...');

        // Make direct HTTP request to Ganache (bypassing MetaMask)
        // Ganache typically runs on port 7545 or 8545
        const ganacheUrls = ['http://127.0.0.1:7545', 'http://127.0.0.1:8545'];

        for (const ganacheUrl of ganacheUrls) {
          try {
            // Use evm_increaseTime to advance blockchain time
            const increaseTimeResponse = await fetch(ganacheUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [timeDiff],
                id: Date.now()
              })
            });

            if (increaseTimeResponse.ok) {
              // Mine a new block to apply the time change
              await fetch(ganacheUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'evm_mine',
                  params: [],
                  id: Date.now() + 1
                })
              });

              console.log('✅ Ganache time synced successfully via', ganacheUrl);
              return true;
            }
          } catch (fetchError) {
            console.log('Could not connect to', ganacheUrl);
          }
        }

        console.warn('Could not sync Ganache time - no Ganache endpoint responded');
        return false;
      }
      return true; // No sync needed
    } catch (error) {
      console.warn('Could not sync Ganache time:', error.message);
      return false;
    }
  },

  // Initialize the application and Web3 connection
  eventStart: async function () {
    try {
      return await App.initWeb3();
    } catch (error) {
      console.error('Error initializing app:', error);
      alert('Failed to initialize the application. Please check your connection and try again.');
    }
  },

  // Initialize Web3 with modern MetaMask integration
  initWeb3: async function () {
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
  initContract: async function () {
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
      const shortAddress = App.account.slice(0, 6) + '...' + App.account.slice(-4);
      $("#accountAddress").html(shortAddress);

      return App.loadVotingData();

    } catch (error) {
      console.error('Error initializing contract:', error);
      alert('Failed to load voting contract. Please check if Ganache is running and contract is deployed.');
    }
  },

  // Load voting data from the blockchain
  loadVotingData: async function () {
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
        const startTimestamp = parseInt(dates[0]);
        const endTimestamp = parseInt(dates[1]);

        console.log('Blockchain dates:', {
          startTimestamp,
          endTimestamp,
          startDate: new Date(startTimestamp * 1000),
          endDate: new Date(endTimestamp * 1000)
        });

        // Check if dates are actually set (not 0)
        if (startTimestamp > 0 && endTimestamp > 0) {
          const startDate = new Date(startTimestamp * 1000);
          const endDate = new Date(endTimestamp * 1000);

          // Format dates nicely
          const dateOptions = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          };

          const formattedStart = startDate.toLocaleDateString('en-US', dateOptions);
          const formattedEnd = endDate.toLocaleDateString('en-US', dateOptions);

          $("#dates").text(formattedStart + " - " + formattedEnd);
        } else {
          console.log('Voting dates not initialized yet - please set dates in admin panel');
          $("#dates").text("Voting dates not set yet");
        }
      } catch (error) {
        console.log('Error loading voting dates:', error.message);
        $("#dates").text("Voting dates not set yet");
      }

      // Check voting status and display appropriate message
      try {
        const votingStatus = await instance.methods.getVotingStatus().call();
        console.log('Initial voting status:', votingStatus);

        // Get dates for display
        const dates = await instance.methods.getDates().call();
        const startTimestamp = parseInt(dates[0]);
        const endTimestamp = parseInt(dates[1]);
        const startDate = new Date(startTimestamp * 1000);
        const endDate = new Date(endTimestamp * 1000);
        const now = new Date();

        // Use client-side time comparison as primary check (more accurate than blockchain timestamp)
        // This fixes timezone/time sync issues between client and Ganache blockchain
        const isVotingActive = now >= startDate && now <= endDate;
        const hasVotingStarted = now >= startDate;
        const hasVotingEnded = now > endDate;

        if (votingStatus === "Not Initialized" || (startTimestamp === 0 && endTimestamp === 0)) {
          $("#msg").html("<p style='color: orange;'>⚠️ Voting has not been initialized yet. Admin needs to set voting dates.</p>");
          $("#voteButton").attr("disabled", true);
        } else if (!hasVotingStarted) {
          $("#msg").html(`<p style='color: orange;'>⚠️ Voting hasn't started yet. It will begin on ${startDate.toLocaleString()}.</p>`);
          $("#voteButton").attr("disabled", true);
        } else if (hasVotingEnded) {
          $("#msg").html("<p style='color: red;'>❌ Voting has ended. You can no longer cast votes.</p>");
          $("#voteButton").attr("disabled", true);
          // Hide candidates section when voting period is over
          App.hideCandidatesAfterVotingEnds();
        } else {
          // Voting is active - check if user has already voted
          const hasVoted = await instance.methods.checkVote().call({ from: App.account });
          if (hasVoted) {
            App.hasVoted = true;
            $("#voteButton").attr("disabled", true);
            $("#msg").html("<p style='color: green;'>✅ You have already voted. Thank you for participating!</p>");
          } else {
            App.hasVoted = false;
            $("#voteButton").attr("disabled", false);
            $("#msg").html("<p style='color: green;'>✅ Voting is now active! Select a candidate and cast your vote.</p>");
          }
        }
      } catch (error) {
        console.error('Error checking voting status:', error);
        // Fallback: just check if voted
        try {
          const hasVoted = await instance.methods.checkVote().call({ from: App.account });
          if (!hasVoted) {
            $("#voteButton").attr("disabled", false);
          } else {
            $("#voteButton").attr("disabled", true);
            $("#msg").html("<p>You have already voted.</p>");
          }
        } catch (e) {
          console.error('Error checking vote status:', e);
        }
      }

      // Load candidates from both blockchain and database
      await App.loadCandidates();

      // Start monitoring for voting period end (auto-hide candidates when voting ends)
      App.startVotingPeriodMonitor();

    } catch (error) {
      console.error('Error loading voting data:', error);
      alert('Failed to load voting data. Please refresh the page.');
    }
  },

  // Load candidates from MongoDB API (primary source for voting)
  loadCandidates: async function () {
    const candidateContainer = $("#boxCandidate");

    // Show loading state
    candidateContainer.html(`
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading candidates...</p>
      </div>
    `);

    // Load candidates from MongoDB API
    await App.loadCandidatesFromMongoDB();
  },

  // Load candidates from MongoDB API
  loadCandidatesFromMongoDB: async function () {
    const candidateContainer = $("#boxCandidate");
    try {
      console.log('Fetching candidates from MongoDB API...');
      const response = await fetch('http://127.0.0.1:8001/candidates');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('MongoDB API response:', data);
      
      if (!data.candidates || data.candidates.length === 0) {
        candidateContainer.html(`
          <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <p>No candidates registered yet</p>
          </div>
        `);
        return;
      }

      // Get vote counts from blockchain for each candidate
      const instance = App.contracts.Voting;
      const count = await instance.methods.getCountCandidates().call();
      const blockchainCount = parseInt(count);
      
      console.log('Blockchain candidate count:', blockchainCount);
      
      // Map MongoDB candidates and fetch vote counts from blockchain
      const candidates = [];
      for (let i = 0; i < data.candidates.length && i < blockchainCount; i++) {
        const candidate = data.candidates[i];
        
        // Fetch blockchain data for this candidate (blockchain IDs are 1-indexed)
        try {
          const blockchainCandidate = await instance.methods.getCandidate(i + 1).call();
          const voteCount = parseInt(blockchainCandidate[10] || blockchainCandidate.voteCount || 0);
          
          candidates.push({
            blockchainId: i + 1,
            name: candidate.name || 'Unknown',
            party: candidate.party || 'Independent',
            voteCount: voteCount,
            electionCenter: candidate.electionCenter,
            candidateAddress: candidate.candidateAddress,
            mongoId: candidate._id
          });
          
          console.log(`Candidate ${i + 1}: ${candidate.name} - ${voteCount} votes`);
        } catch (e) {
          console.error(`Error fetching blockchain data for candidate ${i + 1}:`, e);
          // Fallback without vote count
          candidates.push({
            blockchainId: i + 1,
            name: candidate.name || 'Unknown',
            party: candidate.party || 'Independent',
            voteCount: 0,
            electionCenter: candidate.electionCenter,
            candidateAddress: candidate.candidateAddress,
            mongoId: candidate._id
          });
        }
      }

      console.log('Displaying candidates with vote counts:', candidates);
      App.displayCandidates(candidates);
      
    } catch (error) {
      console.error('Error loading candidates from MongoDB:', error);
      // Fallback to blockchain
      console.log('Falling back to blockchain...');
      await App.loadCandidatesFromBlockchain();
    }
  },

  // Load candidates from blockchain (source of truth for voting)
  loadCandidatesFromBlockchain: async function () {
    const candidateContainer = $("#boxCandidate");
    try {
      const instance = App.contracts.Voting;
      const count = await instance.methods.getCountCandidates().call();
      const candidateCount = parseInt(count);

      if (candidateCount === 0) {
        candidateContainer.html(`
          <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <p>No candidates registered yet</p>
          </div>
        `);
        return;
      }

      const candidates = [];
      // Blockchain candidate IDs are 1-indexed (1 to candidateCount)
      for (let i = 1; i <= candidateCount; i++) {
        try {
          const candidate = await instance.methods.getCandidate(i).call();
          console.log('Loaded blockchain candidate', i, ':', candidate);
          candidates.push({
            blockchainId: i, // Store the blockchain ID for voting
            name: candidate[1] || candidate.name || `Candidate ${i}`,
            party: candidate[5] || candidate.party || 'Independent',
            voteCount: candidate[10] || candidate.voteCount || 0
          });
        } catch (e) {
          console.error('Error getting candidate', i, e);
        }
      }

      if (candidates.length > 0) {
        App.displayCandidates(candidates);
      } else {
        candidateContainer.html(`
          <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <p>No candidates available</p>
          </div>
        `);
      }
    } catch (error) {
      console.error('Error loading from blockchain:', error);
      candidateContainer.html(`
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load candidates. Please refresh the page.</p>
        </div>
      `);
    }
  },

  // Display candidates in the UI
  displayCandidates: function (candidates) {
    console.log('displayCandidates called with:', candidates);
    const candidateContainer = $("#boxCandidate");
    candidateContainer.empty();

    // Safety check: ensure candidates is an array
    if (!Array.isArray(candidates)) {
      console.error('displayCandidates: candidates is not an array', candidates);
      return;
    }

    console.log('Rendering', candidates.length, 'candidates');

    candidates.forEach((candidate, index) => {
      // Get first letter for avatar
      const candidateName = candidate.name || 'Unknown';
      const initial = candidateName.charAt(0).toUpperCase();

      // Generate a color based on index
      const colors = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #a18cd1, #fbc2eb)'
      ];
      const avatarColor = colors[index % colors.length];

      const partyName = candidate.party || 'Independent';
      const voteCount = candidate.voteCount || candidate.votes || 0;

      // Use blockchainId if available (from blockchain), otherwise use index + 1
      const candidateId = candidate.blockchainId || (index + 1);
      console.log('Candidate', candidateName, 'has blockchain ID:', candidateId);

      const card = `
        <div class="candidate-card" data-index="${index}" data-blockchain-id="${candidateId}" onclick="App.selectCandidate(${index}, ${candidateId})">
          <div class="candidate-info">
            <div class="candidate-avatar" style="background: ${avatarColor}">
              ${initial}
            </div>
            <div class="candidate-details">
              <h4>${candidateName}</h4>
              <span class="party-name">
                <i class="fas fa-flag"></i> ${partyName}
              </span>
            </div>
          </div>
          <div class="candidate-votes">
            <div class="vote-count">${voteCount}</div>
            <div class="vote-label">Votes</div>
          </div>
          <div class="candidate-select">
            <input type="radio" name="candidate" value="${candidateId}" id="candidate${index}" style="display:none;">
          </div>
        </div>
      `;
      console.log('Appending card for:', candidateName);
      candidateContainer.append(card);
    });

    const containerHtml = candidateContainer.html();
    console.log('Finished rendering candidates. Container HTML length:', containerHtml ? containerHtml.length : 0);
  },

  // Select a candidate
  // index: 0-based display index, candidateId: 1-based blockchain ID (optional for backward compatibility)
  selectCandidate: function (index, candidateId) {
    // Remove selected class from all cards
    $('.candidate-card').removeClass('selected');

    // Add selected class to clicked card
    $(`.candidate-card[data-index="${index}"]`).addClass('selected');

    // Check the radio button (value is already set to candidateId which is 1-indexed)
    $(`#candidate${index}`).prop('checked', true);

    // Enable vote button
    $('#voteButton').attr('disabled', false);
  },

  // Set up event handlers
  setupEventHandlers: function () {
    // Enhanced Add Candidate Handler
    $('#candidateForm').on('submit', async function (e) {
      e.preventDefault();
      await App.addCandidate();
    });

    // Vote Handler
    $('#voteButton').click(async function () {
      await App.vote();
    });
  },

  // Add candidate functionality
  addCandidate: async function () {
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

        // Check if voting dates need to be set or updated on blockchain
        const votingStatus = await instance.methods.getVotingStatus().call();
        console.log('Current voting status:', votingStatus);

        // Sync Ganache blockchain time before setting dates
        await App.syncGanacheTime();

        // Get current blockchain time for validation
        const latestBlock = await App.web3.eth.getBlock('latest');
        const blockchainTime = Number(latestBlock.timestamp);
        console.log('Current blockchain timestamp:', blockchainTime, new Date(blockchainTime * 1000).toLocaleString());

        // Convert dates to Unix timestamps (seconds)
        let startTimestamp = Math.floor(startDate.getTime() / 1000);
        let endTimestamp = Math.floor(endDate.getTime() / 1000);

        // Calculate duration
        let duration = endTimestamp - startTimestamp;
        const minimumDuration = 1800; // 30 minutes in seconds (contract requirement)

        // Ensure minimum duration
        if (duration < minimumDuration) {
          console.log('Duration too short, adjusting to minimum 30 minutes');
          duration = minimumDuration;
          endTimestamp = startTimestamp + duration;
        }

        // Auto-adjust dates if they're in the past relative to blockchain time
        if (startTimestamp <= blockchainTime) {
          console.log('Auto-adjusting dates: Start date is in the past relative to blockchain time');
          // Set start time to blockchain time + 2 minutes buffer
          const bufferSeconds = 120; // 2 minutes
          startTimestamp = blockchainTime + bufferSeconds;
          endTimestamp = startTimestamp + Math.max(duration, minimumDuration);

          console.log('Adjusted voting dates:', {
            originalStart: new Date(Math.floor(startDate.getTime() / 1000) * 1000).toLocaleString(),
            adjustedStart: new Date(startTimestamp * 1000).toLocaleString(),
            adjustedEnd: new Date(endTimestamp * 1000).toLocaleString(),
            duration: Math.round((endTimestamp - startTimestamp) / 60) + ' minutes'
          });

          App.showStatus('Dates auto-adjusted: Voting will start at ' + new Date(startTimestamp * 1000).toLocaleString(), 'info');
        }

        console.log('Setting blockchain dates:', {
          start: startTimestamp,
          end: endTimestamp,
          startDate: new Date(startTimestamp * 1000).toISOString(),
          endDate: new Date(endTimestamp * 1000).toISOString(),
          blockchainTime: blockchainTime,
          startIsInFuture: startTimestamp > blockchainTime
        });

        if (votingStatus === "Not Initialized") {
          App.showStatus('Setting voting dates on blockchain...', 'info');

          try {
            // Set voting dates on blockchain for the first time
            const datesTx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
              from: App.account,
              gas: 200000
            });

            console.log('Voting dates set on blockchain:', datesTx.transactionHash);
            App.showStatus('Voting dates synchronized with blockchain!', 'success');
          } catch (datesError) {
            console.error('Error setting blockchain dates:', datesError);
            // Provide more specific error message
            if (datesError.message && datesError.message.includes('InvalidTimeRange')) {
              App.showStatus('Error: Invalid date range. Start date must be in the future and end date must be at least 30 minutes after start.', 'error');
            } else {
              App.showStatus('Warning: Candidate added but failed to set voting dates. Please set dates manually.', 'warning');
            }
          }
        } else if (votingStatus === "Not Started") {
          // Voting dates already set but voting hasn't started - allow update
          App.showStatus('Updating voting dates on blockchain...', 'info');

          try {
            // Update voting dates on blockchain
            const datesTx = await instance.methods.updateDates(startTimestamp, endTimestamp).send({
              from: App.account,
              gas: 200000
            });

            console.log('Voting dates updated on blockchain:', datesTx.transactionHash);
            App.showStatus('Voting dates updated on blockchain!', 'success');
          } catch (datesError) {
            console.error('Error updating blockchain dates:', datesError);
            App.showStatus('Warning: Candidate added but failed to update voting dates on blockchain', 'warning');
          }
        } else {
          console.log('Voting is active or ended - cannot update dates');
        }

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
  vote: async function () {
    const candidateID = $("input[name='candidate']:checked").val();

    if (!candidateID) {
      $("#msg").html("<p>Please select a candidate to vote for.</p>");
      return;
    }

    try {
      const instance = App.contracts.Voting;

      // Get voting dates and perform client-side time check (more reliable than blockchain timestamp)
      const dates = await instance.methods.getDates().call();
      const startTimestamp = parseInt(dates[0]);
      const endTimestamp = parseInt(dates[1]);
      const startDate = new Date(startTimestamp * 1000);
      const endDate = new Date(endTimestamp * 1000);
      const now = new Date();

      // Check voting status using client-side time (fixes blockchain timestamp sync issues)
      if (startTimestamp === 0 && endTimestamp === 0) {
        $("#msg").html("<p style='color: orange;'>⚠️ Voting has not been initialized yet. Admin needs to set voting dates.</p>");
        return;
      }

      if (now < startDate) {
        $("#msg").html(`<p style='color: orange;'>⚠️ Voting hasn't started yet. It will begin on ${startDate.toLocaleString()}.</p>`);
        return;
      }

      if (now > endDate) {
        $("#msg").html("<p style='color: red;'>❌ Voting has ended. You can no longer cast votes.</p>");
        return;
      }

      // Check if already voted
      const hasVoted = await instance.methods.checkVote().call({ from: App.account });
      if (hasVoted) {
        $("#msg").html("<p style='color: orange;'>⚠️ You have already voted!</p>");
        $("#voteButton").attr("disabled", true);
        return;
      }

      // Log candidate ID for debugging
      console.log('Voting for candidate ID:', candidateID);
      const countCandidates = await instance.methods.getCountCandidates().call();
      console.log('Total candidates on blockchain:', parseInt(countCandidates));

      // Validate candidate ID against blockchain candidate count
      const candidateIdNum = parseInt(candidateID);
      const totalCandidates = parseInt(countCandidates);

      if (totalCandidates === 0) {
        $("#msg").html("<p style='color: red;'>❌ No candidates registered on blockchain. Please contact admin.</p>");
        return;
      }

      if (candidateIdNum < 1 || candidateIdNum > totalCandidates) {
        $("#msg").html(`<p style='color: red;'>❌ Invalid candidate selection. Valid range: 1-${totalCandidates}, got: ${candidateIdNum}</p>`);
        return;
      }

      // Show processing message
      $("#msg").html("<p style='color: blue;'>⏳ Syncing blockchain time and processing your vote...</p>");
      $("#voteButton").attr("disabled", true);

      // Sync Ganache time before voting (fixes blockchain timestamp drift issue)
      await App.syncGanacheTime();

      // Estimate gas first to catch errors early
      try {
        await instance.methods.vote(parseInt(candidateID)).estimateGas({ from: App.account });
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);

        // Check if it's a voting period issue
        const votingStatus = await instance.methods.getVotingStatus().call();
        console.log('Voting status after sync:', votingStatus);

        $("#voteButton").attr("disabled", false);

        if (votingStatus === "Not Started") {
          $("#msg").html("<p style='color: red;'>❌ Voting period has not started on blockchain. Please try again or contact admin.</p>");
        } else if (votingStatus === "Ended") {
          $("#msg").html("<p style='color: red;'>❌ Voting period has ended.</p>");
        } else {
          $("#msg").html("<p style='color: red;'>❌ Transaction would fail. Please ensure you have enough ETH and haven't voted already.</p>");
        }
        return;
      }

      // Send the vote transaction
      try {
        $("#msg").html("<p style='color: blue;'>⏳ Please confirm the transaction in MetaMask...</p>");

        await instance.methods.vote(parseInt(candidateID)).send({
          from: App.account,
          gas: 200000 // Set reasonable gas limit
        });

        $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
        App.hasVoted = true;
        $("#voteButton").attr("disabled", true);
      } catch (txError) {
        console.log('Transaction error (checking if vote went through):', txError);

        // Check if vote actually went through despite the error
        const hasVotedNow = await instance.methods.checkVote().call({ from: App.account });
        if (hasVotedNow) {
          // Vote actually succeeded!
          $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
          App.hasVoted = true;
          $("#voteButton").attr("disabled", true);
        } else {
          throw txError; // Re-throw if vote really failed
        }
      }

      // Refresh candidate list to show updated vote counts
      await App.loadCandidates();

    } catch (error) {
      console.error('Error voting:', error);

      // Check one more time if vote went through
      try {
        const hasVotedFinal = await App.contracts.Voting.methods.checkVote().call({ from: App.account });
        if (hasVotedFinal) {
          $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
          App.hasVoted = true;
          $("#voteButton").attr("disabled", true);
          await App.loadCandidates();
          return;
        }
      } catch (e) {
        // Ignore check error
      }

      $("#voteButton").attr("disabled", false);

      // Parse specific error messages
      let errorMsg = "Unknown error occurred";
      if (error.message.includes("VotingNotActive")) {
        errorMsg = "Voting is not currently active.";
      } else if (error.message.includes("AlreadyVoted")) {
        errorMsg = "You have already voted!";
      } else if (error.message.includes("InvalidCandidate")) {
        errorMsg = "Invalid candidate selection.";
      } else if (error.message.includes("User denied")) {
        errorMsg = "Transaction was rejected.";
      } else if (error.message.includes("insufficient funds")) {
        errorMsg = "Insufficient ETH for gas fees.";
      } else {
        errorMsg = error.message;
      }

      $("#msg").html(`<p style='color: red;'>❌ Error: ${errorMsg}</p>`);
    }
  },

  // Validate candidate data
  validateCandidateData: function (data) {
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
  showStatus: function (message, type = 'info') {
    const statusElement = $('#status');
    if (statusElement.length) {
      statusElement.removeClass('info error success warning')
        .addClass(type)
        .text(message)
        .show();
    } else {
      console.log(`Status (${type}): ${message}`);
    }
  },

  // Hide candidates section when voting period is over
  hideCandidatesAfterVotingEnds: function () {
    console.log('Voting period has ended - hiding candidate names');

    // Hide the candidates grid/section
    const candidateContainer = $("#boxCandidate");
    candidateContainer.html(`
      <div class="voting-ended-state">
        <i class="fas fa-clock" style="font-size: 48px; color: #e74c3c; margin-bottom: 15px;"></i>
        <h3 style="color: #e74c3c; margin-bottom: 10px;">Voting Period Has Ended</h3>
        <p style="color: #666;">Candidate information is no longer available.</p>
        <p style="color: #888; font-size: 14px; margin-top: 10px;">Thank you for your participation in this election.</p>
      </div>
    `);

    // Hide the instructions card
    $(".instructions-card").fadeOut(500);

    // Hide the vote button section
    $(".vote-prompt").fadeOut(500);
    $("#voteButton").hide();

    // Update the section title
    $(".section-title").html('<i class="fas fa-check-double"></i> Voting Completed');
  },

  // Check if voting period has ended (utility function for periodic checks)
  checkVotingPeriodStatus: async function () {
    try {
      const instance = App.contracts.Voting;
      if (!instance) return;

      const dates = await instance.methods.getDates().call();
      const endTimestamp = parseInt(dates[1]);
      const endDate = new Date(endTimestamp * 1000);
      const now = new Date();

      if (endTimestamp > 0 && now > endDate) {
        App.hideCandidatesAfterVotingEnds();
        return true; // Voting has ended
      }
      return false; // Voting still active or not started
    } catch (error) {
      console.error('Error checking voting period:', error);
      return false;
    }
  },

  // Start periodic check for voting period end (checks every minute)
  startVotingPeriodMonitor: function () {
    // Check immediately
    App.checkVotingPeriodStatus();

    // Then check every 60 seconds
    setInterval(async () => {
      const hasEnded = await App.checkVotingPeriodStatus();
      if (hasEnded) {
        console.log('Voting period ended - candidates hidden automatically');
      }
    }, 60000); // Check every minute
  },

  // Reset all votes (admin only)
  resetVotes: async function () {
    if (!confirm('⚠️ WARNING: This will reset all vote counts to zero!\n\nThis action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    try {
      const instance = App.contracts.Voting;
      if (!instance) {
        alert('Contract not initialized. Please refresh the page.');
        return;
      }

      App.showStatus('Resetting votes on blockchain...', 'info');

      // Call the resetVotes function on the smart contract
      const tx = await instance.methods.resetVotes().send({
        from: App.account,
        gas: 500000
      });

      console.log('Reset votes transaction:', tx.transactionHash);
      App.showStatus('✅ All votes have been reset successfully!', 'success');
      alert('✅ All votes have been reset successfully!\n\nVote counts are now zero and voting period has been cleared.');

      // Reload candidates to show updated vote counts
      if (typeof App.loadCandidates === 'function') {
        await App.loadCandidates();
      }

    } catch (error) {
      console.error('Error resetting votes:', error);

      if (error.message && error.message.includes('NotOwner')) {
        App.showStatus('Error: Only the contract owner can reset votes.', 'error');
        alert('❌ Error: Only the contract owner can reset votes.');
      } else if (error.code === 4001) {
        App.showStatus('Transaction rejected by user.', 'error');
      } else {
        App.showStatus('Error resetting votes: ' + error.message, 'error');
        alert('❌ Error resetting votes: ' + error.message);
      }
    }
  },

  // Reset entire election (admin only) - deletes all candidates too
  resetElection: async function () {
    if (!confirm('⚠️ CRITICAL WARNING: This will DELETE ALL CANDIDATES and reset the entire election!\n\nThis action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    // Second confirmation for safety
    if (!confirm('🔴 FINAL CONFIRMATION\n\nType "RESET" mentally and click OK to proceed.\n\nAll candidates and votes will be permanently deleted.')) {
      return;
    }

    try {
      const instance = App.contracts.Voting;
      if (!instance) {
        alert('Contract not initialized. Please refresh the page.');
        return;
      }

      App.showStatus('Resetting entire election on blockchain...', 'info');

      // Call the resetElection function on the smart contract
      const tx = await instance.methods.resetElection().send({
        from: App.account,
        gas: 1000000
      });

      console.log('Reset election transaction:', tx.transactionHash);
      App.showStatus('✅ Election has been completely reset!', 'success');
      alert('✅ Election has been completely reset!\n\nAll candidates and votes have been deleted.');

      // Reload candidates to show empty state
      if (typeof App.loadCandidates === 'function') {
        await App.loadCandidates();
      }

    } catch (error) {
      console.error('Error resetting election:', error);

      if (error.message && error.message.includes('NotOwner')) {
        App.showStatus('Error: Only the contract owner can reset the election.', 'error');
        alert('❌ Error: Only the contract owner can reset the election.');
      } else if (error.code === 4001) {
        App.showStatus('Transaction rejected by user.', 'error');
      } else {
        App.showStatus('Error resetting election: ' + error.message, 'error');
        alert('❌ Error resetting election: ' + error.message);
      }
    }
  },

  // Set voting dates manually (admin only)
  setVotingDates: async function () {
    try {
      const startDateInput = document.getElementById('manualStartDate');
      const endDateInput = document.getElementById('manualEndDate');
      const statusDiv = document.getElementById('votingDatesStatus');

      if (!startDateInput || !endDateInput) {
        alert('Date input fields not found.');
        return;
      }

      if (!startDateInput.value || !endDateInput.value) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ Please select both start and end dates.</span>';
        return;
      }

      const startDate = new Date(startDateInput.value);
      const endDate = new Date(endDateInput.value);
      const now = new Date();

      // Client-side validation
      if (startDate <= now) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ Start date must be in the future.</span>';
        return;
      }

      if (endDate <= startDate) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ End date must be after start date.</span>';
        return;
      }

      // Check minimum 30 minutes duration
      const durationMinutes = (endDate - startDate) / (1000 * 60);
      if (durationMinutes < 30) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ Voting period must be at least 30 minutes.</span>';
        return;
      }

      const instance = App.contracts.Voting;
      if (!instance) {
        alert('Contract not initialized. Please refresh the page.');
        return;
      }

      if (statusDiv) statusDiv.innerHTML = '<span style="color: blue;">⏳ Syncing blockchain time...</span>';

      // Sync Ganache time first
      await App.syncGanacheTime();

      // Get blockchain time
      const latestBlock = await App.web3.eth.getBlock('latest');
      const blockchainTime = Number(latestBlock.timestamp);

      // Convert to timestamps
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      console.log('Setting voting dates:', {
        startTimestamp,
        endTimestamp,
        blockchainTime,
        startIsInFuture: startTimestamp > blockchainTime
      });

      // Validate against blockchain time
      if (startTimestamp <= blockchainTime) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ Start date must be after blockchain time (' + new Date(blockchainTime * 1000).toLocaleString() + ')</span>';
        return;
      }

      if (statusDiv) statusDiv.innerHTML = '<span style="color: blue;">⏳ Setting voting dates on blockchain...</span>';

      // Check current voting status
      const votingStatus = await instance.methods.getVotingStatus().call();

      let tx;
      if (votingStatus === "Not Initialized") {
        tx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
          from: App.account,
          gas: 200000
        });
      } else if (votingStatus === "Not Started") {
        tx = await instance.methods.updateDates(startTimestamp, endTimestamp).send({
          from: App.account,
          gas: 200000
        });
      } else {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">⚠️ Cannot update dates - voting is ' + votingStatus.toLowerCase() + '.</span>';
        return;
      }

      console.log('Voting dates set:', tx.transactionHash);
      if (statusDiv) statusDiv.innerHTML = '<span style="color: green;">✅ Voting dates set successfully! Voting period: ' + startDate.toLocaleString() + ' - ' + endDate.toLocaleString() + '</span>';

      // Reload voting data to update UI
      if (typeof App.loadVotingData === 'function') {
        await App.loadVotingData();
      }

    } catch (error) {
      console.error('Error setting voting dates:', error);
      const statusDiv = document.getElementById('votingDatesStatus');

      if (error.message && error.message.includes('NotOwner')) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">❌ Only the contract owner can set voting dates.</span>';
      } else if (error.code === 4001) {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: orange;">Transaction cancelled by user.</span>';
      } else {
        if (statusDiv) statusDiv.innerHTML = '<span style="color: red;">❌ Error: ' + error.message + '</span>';
      }
    }
  }
};

// Initialize the app when the window loads
$(window).on('load', function () {
  console.log('Window loaded, starting App...');
  App.eventStart();
});
