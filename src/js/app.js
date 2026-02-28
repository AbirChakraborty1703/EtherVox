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
  isLoading: false,

  // Lock to prevent concurrent time sync calls (race condition protection)
  _syncLock: null,

  syncGanacheTime: async function () {
    // If a sync is already in progress, wait for it instead of starting another.
    // This prevents race conditions where two concurrent vote() calls both read
    // the same stale drift and both call evm_increaseTime, doubling the offset.
    if (App._syncLock) {
      console.log('⏳ Time sync already in progress, waiting...');
      return App._syncLock;
    }
    App._syncLock = App._doSyncGanacheTime();
    try {
      return await App._syncLock;
    } finally {
      App._syncLock = null;
    }
  },

  _doSyncGanacheTime: async function () {
    try {
      // Get current blockchain timestamp from the latest mined block
      const block = await App.web3.eth.getBlock('latest');
      const blockTimestamp = Number(block.timestamp);       // seconds
      const systemTimestamp = Math.floor(Date.now() / 1000); // seconds
      const drift = systemTimestamp - blockTimestamp;         // positive = blockchain is behind, negative = blockchain is ahead

      console.log('Blockchain time:', new Date(blockTimestamp * 1000).toLocaleString());
      console.log('System time:', new Date(systemTimestamp * 1000).toLocaleString());
      console.log('Time difference (seconds):', drift);

      // Only sync if drift exceeds 5 seconds (tight threshold for voting accuracy)
      if (Math.abs(drift) <= 5) {
        console.log('✅ Blockchain time is in sync (drift: ' + drift + 's)');
        return true;
      }

      console.log('Blockchain time is off by', drift, 'seconds — syncing to system time...');


      const ganacheUrls = ['http://127.0.0.1:7545', 'http://127.0.0.1:8545'];

      for (const ganacheUrl of ganacheUrls) {
        try {
          // ===== PRIMARY METHOD: evm_setTime (absolute, works both forward and backward) =====
          // IMPORTANT: Ganache's evm_setTime expects MILLISECONDS (like Date.now()), NOT seconds.
          // This sets the blockchain clock to the exact current system time regardless of direction.
          const nowMs = Date.now(); // milliseconds since epoch
          console.log('Calling evm_setTime with', nowMs, 'ms (' + new Date(nowMs).toLocaleString() + ')');

          const setTimeResponse = await fetch(ganacheUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'evm_setTime',
              params: [nowMs],
              id: Date.now()
            })
          });

          if (!setTimeResponse.ok) {
            console.warn('evm_setTime returned non-OK status, trying next URL...');
            continue;
          }

          // Mine a block so the new timestamp takes effect
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

          // Verify the sync actually worked
          const verifyBlock = await App.web3.eth.getBlock('latest');
          const newBlockTimestamp = Number(verifyBlock.timestamp);
          const newSystemTimestamp = Math.floor(Date.now() / 1000);
          const remainingDrift = Math.abs(newSystemTimestamp - newBlockTimestamp);

          console.log('After evm_setTime: blockchain =', new Date(newBlockTimestamp * 1000).toLocaleString(),
            '| Remaining drift:', remainingDrift + 's');

          // If evm_setTime worked (drift now < 30s), we're good
          if (remainingDrift <= 30) {
            // Fine-tune with evm_increaseTime if still off by more than 5s
            if (remainingDrift > 5) {
              const fineDrift = newSystemTimestamp - newBlockTimestamp;
              if (fineDrift > 0) {
                await fetch(ganacheUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'evm_increaseTime',
                    params: [fineDrift],
                    id: Date.now() + 2
                  })
                });
                await fetch(ganacheUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'evm_mine',
                    params: [],
                    id: Date.now() + 3
                  })
                });
              }
            }

            const finalBlock = await App.web3.eth.getBlock('latest');
            const finalDrift = Math.abs(Math.floor(Date.now() / 1000) - Number(finalBlock.timestamp));
            console.log('✅ Ganache time synced via', ganacheUrl,
              '| Final blockchain time:', new Date(Number(finalBlock.timestamp) * 1000).toLocaleString(),
              '| Final drift:', finalDrift + 's');
            return true;
          }

          // ===== FALLBACK: evm_setTime didn't work, try evm_increaseTime =====
          // evm_increaseTime only works for FORWARD adjustment (positive values)
          console.warn('evm_setTime did not reduce drift sufficiently (still', remainingDrift + 's). Trying evm_increaseTime...');

          const freshDrift = Math.floor(Date.now() / 1000) - newBlockTimestamp;
          if (freshDrift > 0) {
            // Blockchain is behind — we can push it forward
            await fetch(ganacheUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [freshDrift],
                id: Date.now() + 4
              })
            });
            await fetch(ganacheUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'evm_mine',
                params: [],
                id: Date.now() + 5
              })
            });

            const afterBlock = await App.web3.eth.getBlock('latest');
            const afterDrift = Math.abs(Math.floor(Date.now() / 1000) - Number(afterBlock.timestamp));
            console.log('✅ Ganache time synced via evm_increaseTime',
              '| Blockchain time:', new Date(Number(afterBlock.timestamp) * 1000).toLocaleString(),
              '| Remaining drift:', afterDrift + 's');
          } else {
            // Blockchain is AHEAD of system — evm_increaseTime can't go backwards
            // evm_setTime with milliseconds is the only way; if it failed, we must restart Ganache
            console.error('❌ Blockchain is', Math.abs(freshDrift), 's AHEAD of system time.',
              'evm_setTime did not work. Please RESTART Ganache to reset the blockchain clock.');
          }

          return true;
        } catch (fetchError) {
          console.log('Could not connect to', ganacheUrl);
        }
                const newBlock = await App.web3.eth.getBlock('latest');
                console.log('✅ Ganache time reset successfully. New blockchain time:', new Date(Number(newBlock.timestamp) * 1000).toLocaleString());
                return true;
              }
            }
          } catch (fetchError) {
          return true;
        } catch (fetchError) {
          console.log('Could not connect to', ganacheUrl);
        }
      }

      console.warn('Could not sync Ganache time - no Ganache endpoint responded');
      return false;
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
      const apiUrl = 'http://127.0.0.1:8001/candidates';
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        timeout: 5000 // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MongoDB API response:', data);

      if (!data.candidates || data.candidates.length === 0) {
        console.warn('No candidates found in MongoDB');
        candidateContainer.html(`
          <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <p>No candidates registered yet</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.6);">Please add candidates from the Admin Dashboard</p>
          </div>
        `);
        return;
      }

      // Get ALL candidates from blockchain for matching
      const instance = App.contracts.Voting;
      const count = await instance.methods.getCountCandidates().call();
      const blockchainCount = parseInt(count);

      console.log('\n=== LOADING CANDIDATES FROM BLOCKCHAIN ===');
      console.log('Blockchain candidate count:', blockchainCount);

      // Fetch all blockchain candidates at once
      let blockchainCandidates = [];
      if (blockchainCount > 0) {
        try {
          const allCandidates = await instance.methods.getAllCandidates().call();
          blockchainCandidates = allCandidates;
          console.log('\nFetched all blockchain candidates:');
          blockchainCandidates.forEach((bc, idx) => {
            // Use nullish check: 0 and 0n are valid vote counts (falsy but not null/undefined)
            const rawVotes = (bc.voteCount != null) ? bc.voteCount : 0;
            const votes = typeof rawVotes === 'bigint' ? Number(rawVotes) : (parseInt(rawVotes) || 0);
            const name = bc.name || bc[1] || 'Unknown';
            console.log(`  [Blockchain ID: ${idx + 1}] ${name} - ${votes} votes (raw: ${rawVotes})`);
          });
        } catch (e) {
          console.warn('Could not fetch all candidates, falling back to individual fetch:', e);
          // Fallback: fetch individually
          for (let i = 1; i <= blockchainCount; i++) {
            try {
              const bc = await instance.methods.getCandidate(i).call();
              blockchainCandidates.push(bc);
            } catch (err) {
              console.warn(`Error fetching candidate ${i}:`, err);
            }
          }
        }
      }

      // Map MongoDB candidates and match with blockchain by candidateId or name
      const candidates = [];
      const usedBlockchainIds = new Set(); // Track already-matched blockchain candidates

      for (let i = 0; i < data.candidates.length; i++) {
        const dbCandidate = data.candidates[i];

        // Find matching blockchain candidate by candidateId or name
        let matchedBlockchainCandidate = null;
        let blockchainId = null;
        
        for (let j = 0; j < blockchainCandidates.length; j++) {
          // Skip blockchain candidates already matched to a previous MongoDB candidate
          if (usedBlockchainIds.has(j)) continue;
          
          const bc = blockchainCandidates[j];
          const bcCandidateId = bc.candidateId || bc[12]; // index 12 is candidateId in the Candidate struct
          const bcName = bc.name || bc[1]; // index 1 is name
          
          // Match by BOTH candidateId AND name for uniqueness
          if (bcCandidateId && dbCandidate.candidateId && bcCandidateId === dbCandidate.candidateId
              && bcName && dbCandidate.name && bcName.toLowerCase() === dbCandidate.name.toLowerCase()) {
            matchedBlockchainCandidate = bc;
            blockchainId = j + 1; // Blockchain IDs are 1-indexed
            usedBlockchainIds.add(j);
            console.log(`Matched by candidateId+name: ${dbCandidate.name} -> Blockchain ID ${blockchainId}`);
            break;
          }
        }
        
        // Fallback: match by candidateId only (if not yet matched)
        if (!matchedBlockchainCandidate) {
          for (let j = 0; j < blockchainCandidates.length; j++) {
            if (usedBlockchainIds.has(j)) continue;
            const bc = blockchainCandidates[j];
            const bcCandidateId = bc.candidateId || bc[12];
            
            if (bcCandidateId && dbCandidate.candidateId && bcCandidateId === dbCandidate.candidateId) {
              matchedBlockchainCandidate = bc;
              blockchainId = j + 1;
              usedBlockchainIds.add(j);
              console.log(`Matched by candidateId: ${dbCandidate.name} -> Blockchain ID ${blockchainId}`);
              break;
            }
          }
        }
        
        // Fallback: match by name only (if not yet matched)
        if (!matchedBlockchainCandidate) {
          for (let j = 0; j < blockchainCandidates.length; j++) {
            if (usedBlockchainIds.has(j)) continue;
            const bc = blockchainCandidates[j];
            const bcName = bc.name || bc[1];
            
            if (bcName && dbCandidate.name && bcName.toLowerCase() === dbCandidate.name.toLowerCase()) {
              matchedBlockchainCandidate = bc;
              blockchainId = j + 1;
              usedBlockchainIds.add(j);
              console.log(`Matched by name: ${dbCandidate.name} -> Blockchain ID ${blockchainId}`);
              break;
            }
          }
        }

        // Get vote count from matched blockchain candidate
        let voteCount = 0;
        if (matchedBlockchainCandidate) {
          // Use nullish check: 0 and 0n are valid vote counts, don't skip them with ||
          const rawVoteCount = (matchedBlockchainCandidate.voteCount != null) ? matchedBlockchainCandidate.voteCount : 0;
          // Handle BigInt conversion properly
          voteCount = typeof rawVoteCount === 'bigint' ? Number(rawVoteCount) : (parseInt(rawVoteCount) || 0);
          console.log(`  ✓ Vote count for ${dbCandidate.name}: ${voteCount} (type: ${typeof rawVoteCount})`);
        } else {
          console.log(`  ✗ No blockchain match for ${dbCandidate.name}`);
        }

        candidates.push({
          blockchainId: blockchainId, // This is the CORRECT blockchain ID for voting
          name: dbCandidate.name || 'Unknown',
          party: dbCandidate.party || 'Independent',
          voteCount: voteCount,
          electionCenter: dbCandidate.electionCenter,
          candidateAddress: dbCandidate.candidateAddress,
          candidateId: dbCandidate.candidateId,
          mongoId: dbCandidate._id,
          onBlockchain: matchedBlockchainCandidate !== null
        });

        console.log(`Candidate: ${dbCandidate.name} - Blockchain ID: ${blockchainId} - ${voteCount} votes - On Blockchain: ${matchedBlockchainCandidate !== null}`);
      }

      console.log('Displaying candidates with vote counts:', candidates);
      App.displayCandidates(candidates);

    } catch (error) {
      console.error('Error loading candidates from MongoDB:', error);
      console.log('Falling back to blockchain...');

      // Show specific error message for connection issues
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        console.error('MongoDB API connection failed - Backend may not be running');
      }
      
      // Always fallback to blockchain if MongoDB fails
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
      console.log('\n=== LOADING FROM BLOCKCHAIN (Fallback Mode) ===');
      // Blockchain candidate IDs are 1-indexed (1 to candidateCount)
      for (let i = 1; i <= candidateCount; i++) {
        try {
          const candidate = await instance.methods.getCandidate(i).call();
          console.log(`\nLoading blockchain candidate ${i}:`);
          // Use nullish check: 0 is a valid vote count
          const rawVoteCount = (candidate.voteCount != null) ? candidate.voteCount : 0;
          const voteCount = typeof rawVoteCount === 'bigint' ? Number(rawVoteCount) : (parseInt(rawVoteCount) || 0);
          const name = candidate[1] || candidate.name || `Candidate ${i}`;
          const party = candidate[8] || candidate.party || 'Independent';
          
          console.log(`  Name: ${name}`);
          console.log(`  Party: ${party}`);
          console.log(`  Vote Count: ${voteCount} (raw: ${rawVoteCount}, type: ${typeof rawVoteCount})`);
          
          candidates.push({
            blockchainId: i, // Store the blockchain ID for voting
            name: name,
            party: party,
            voteCount: voteCount,
            onBlockchain: true, // Mark as synced with blockchain
            candidateId: candidate.candidateId || candidate[12] || `BC-${i}` // candidateId is at index 12 in getCandidate return
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
    
    // Debug: Log each candidate's blockchain status
    candidates.forEach((c, idx) => {
      console.log(`Candidate ${idx}: ${c.name}, blockchainId: ${c.blockchainId}, onBlockchain: ${c.onBlockchain}`);
    });

    // Filter out candidates not on blockchain (can't vote for them)
    const votableCandidates = candidates.filter(c => c.blockchainId !== null && c.onBlockchain);
    
    console.log(`Filtered to ${votableCandidates.length} votable candidates out of ${candidates.length} total`);
    
    if (votableCandidates.length === 0) {
      console.warn('No votable candidates found!');
      candidateContainer.html(`
        <div class="empty-state">
          <i class="fas fa-user-slash"></i>
          <p>No candidates available for voting</p>
          <p style="font-size: 14px; color: rgba(255,255,255,0.6);">Candidates need to be synced with blockchain</p>
        </div>
      `);
      return;
    }

    votableCandidates.forEach((candidate, index) => {
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
      // Use nullish check: 0 is a valid vote count, don't treat it as falsy
      const voteCount = (candidate.voteCount != null) ? candidate.voteCount : ((candidate.votes != null) ? candidate.votes : 0);

      // CRITICAL: Use the matched blockchainId from our matching logic
      const candidateId = candidate.blockchainId;
      console.log('Displaying candidate:', candidateName, '- Blockchain ID:', candidateId, '- Votes:', voteCount);

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
      console.log('Appending card for:', candidateName, 'with blockchain ID:', candidateId);
      candidateContainer.append(card);
    });

    const containerHtml = candidateContainer.html();
    console.log('Finished rendering candidates. Container HTML length:', containerHtml ? containerHtml.length : 0);
  },

  // Select a candidate
  // index: 0-based display index, candidateId: 1-based blockchain ID (optional for backward compatibility)
  selectCandidate: function (index, candidateId) {
    console.log('Selecting candidate:', { index, candidateId });
    
    // First, uncheck ALL radio buttons to ensure only one is selected
    $('input[name="candidate"]').prop('checked', false);
    
    // Remove selected class from all cards
    $('.candidate-card').removeClass('selected');

    // Add selected class to clicked card
    $(`.candidate-card[data-index="${index}"]`).addClass('selected');

    // Check ONLY the specific radio button for this candidate
    const radioButton = $(`#candidate${index}`);
    radioButton.prop('checked', true);
    
    // Verify the selection
    const selectedValue = $('input[name="candidate"]:checked').val();
    console.log('Radio button checked. Selected value:', selectedValue);
    
    // Ensure only one radio button is checked
    const checkedCount = $('input[name="candidate"]:checked').length;
    if (checkedCount !== 1) {
      console.error('ERROR: Multiple or no radio buttons checked!', checkedCount);
      return;
    }

    // Enable vote button
    $('#voteButton').attr('disabled', false);
  },

  // Set up event handlers
  setupEventHandlers: function () {
    // Enhanced Add Candidate Handler - use .off().on() to prevent duplicate bindings
    $('#candidateForm').off('submit').on('submit', async function (e) {
      e.preventDefault();
      await App.addCandidate();
    });

    // Vote Handler - use .off().on() to ensure only ONE handler is bound
    $('#voteButton').off('click').on('click', async function () {
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
        panNumber: document.getElementById('panNumber') ? document.getElementById('panNumber').value : '',
        aadharNumber: document.getElementById('aadharNumber') ? document.getElementById('aadharNumber').value : '',
        voterEpicNumber: document.getElementById('voterEpicNumber') ? document.getElementById('voterEpicNumber').value : '',
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
          formData.panNumber,
          formData.aadharNumber,
          formData.voterEpicNumber,
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
          formData.panNumber,
          formData.aadharNumber,
          formData.voterEpicNumber,
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
    // Prevent double-clicking/multiple submissions - set flag IMMEDIATELY
    if (App.isLoading) {
      console.log('Vote already in progress, ignoring...');
      return;
    }
    App.isLoading = true; // Set immediately to block any duplicate calls
    
    const candidateID = $("input[name='candidate']:checked").val();

    if (!candidateID) {
      $("#msg").html("<p>Please select a candidate to vote for.</p>");
      App.isLoading = false;
      return;
    }
    
    // Verify only ONE candidate is selected
    const checkedCount = $('input[name="candidate"]:checked').length;
    if (checkedCount !== 1) {
      $("#msg").html("<p style='color: red;'>❌ Error: Please select exactly one candidate.</p>");
      console.error('Multiple candidates selected:', checkedCount);
      App.isLoading = false;
      return;
    }
    
    console.log('Voting for candidate ID:', candidateID, '(Type:', typeof candidateID, ')');

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
        App.isLoading = false;
        return;
      }

      if (candidateIdNum < 1 || candidateIdNum > totalCandidates) {
        $("#msg").html(`<p style='color: red;'>❌ Invalid candidate selection. Valid range: 1-${totalCandidates}, got: ${candidateIdNum}</p>`);
        App.isLoading = false;
        return;
      }

      // Disable button immediately to prevent any further clicks
      $("#voteButton").attr("disabled", true);
      
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

        App.isLoading = false;
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
        App.isLoading = false;
        $("#voteButton").attr("disabled", true);
        // Disable all candidate card click handlers to prevent further selection
        $('.candidate-card').css('pointer-events', 'none').css('opacity', '0.7');

        // Log vote to anomaly detection system
        App.logVoteToAnomalyDetection(candidateID);
      } catch (txError) {
        console.log('Transaction error (checking if vote went through):', txError);

        // Check if vote actually went through despite the error
        const hasVotedNow = await instance.methods.checkVote().call({ from: App.account });
        if (hasVotedNow) {
          // Vote actually succeeded!
          $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
          App.hasVoted = true;
          App.isLoading = false;
          $("#voteButton").attr("disabled", true);
          // Disable all candidate card click handlers to prevent further selection
          $('.candidate-card').css('pointer-events', 'none').css('opacity', '0.7');

          // Log vote to anomaly detection system
          App.logVoteToAnomalyDetection(candidateID);
        } else {
          throw txError; // Re-throw if vote really failed
        }
      }

      // Refresh candidate list to show updated vote counts
      console.log('\n=== VOTE SUCCESSFUL - REFRESHING CANDIDATE LIST ===');
      
      // Small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await App.loadCandidates();

    } catch (error) {
      console.error('Error voting:', error);

      // Check one more time if vote went through
      try {
        const hasVotedFinal = await App.contracts.Voting.methods.checkVote().call({ from: App.account });
        if (hasVotedFinal) {
          $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
          App.hasVoted = true;
          App.isLoading = false;
          $("#voteButton").attr("disabled", true);
          await App.loadCandidates();
          return;
        }
      } catch (e) {
        // Ignore check error
      }

      // Reset loading state on error
      App.isLoading = false;
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

  // Log vote to AI anomaly detection system
  logVoteToAnomalyDetection: async function(candidateID) {
    try {
      const voterId = App.account || 'unknown';
      const response = await fetch('http://127.0.0.1:8001/anomaly/log-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: voterId,
          candidate_id: parseInt(candidateID),
          screen_resolution: window.screen.width + 'x' + window.screen.height,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });
      if (response.ok) {
        const result = await response.json();
        console.log('🤖 Anomaly detection result:', result);
        if (result.status === 'WARNING') {
          console.warn('⚠️ Suspicious activity detected:', result.message);
        }
      }
    } catch (err) {
      // Non-blocking — anomaly logging should never break voting
      console.log('Anomaly detection unavailable:', err.message);
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
