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
  faceModelsLoaded: false,

  // Initialize the application and Web3 connection
  eventStart: async function() { 
    try {
      // Load face recognition models in parallel with Web3 initialization
      App.loadFaceModels();
      return await App.initWeb3();
    } catch (error) {
      console.error('Error initializing app:', error);
      alert('Failed to initialize the application. Please check your connection and try again.');
    }
  },

  // Load face-api.js models for face verification
  loadFaceModels: async function() {
    try {
      // Check if face-api is available
      if (typeof faceapi === 'undefined') {
        console.warn('face-api.js not loaded yet, waiting...');
        // Wait for face-api.js to load (increased timeout to 30 seconds)
        await new Promise((resolve) => {
          const checkFaceApi = setInterval(() => {
            if (typeof faceapi !== 'undefined') {
              clearInterval(checkFaceApi);
              console.log('✅ face-api.js loaded successfully');
              resolve();
            }
          }, 200);
          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkFaceApi);
            resolve();
          }, 30000);
        });
      }

      if (typeof faceapi === 'undefined') {
        console.error('❌ face-api.js failed to load - face verification will not work');
        console.error('Please check your internet connection and refresh the page');
        return false;
      }

      console.log('📦 Loading face recognition models...');
      
      const MODEL_URL = '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      App.faceModelsLoaded = true;
      console.log('✅ Face recognition models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading face models:', error);
      App.faceModelsLoaded = false;
      return false;
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
          console.warn('Voting dates not initialized (timestamps are 0)');
          $("#dates").text("Voting dates not set yet");
        }
      } catch (error) {
        console.warn('Error loading voting dates:', error.message);
        $("#dates").text("Voting dates not set yet");
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

        // Check if voting dates need to be set on blockchain
        const votingStatus = await instance.methods.getVotingStatus().call();
        console.log('Current voting status:', votingStatus);
        
        if (votingStatus === "Not Initialized") {
          App.showStatus('Setting voting dates on blockchain...', 'info');
          
          try {
            // Convert dates to Unix timestamps (seconds)
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(endDate.getTime() / 1000);
            
            console.log('Setting blockchain dates:', {
              start: startTimestamp,
              end: endTimestamp,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            });
            
            // Set voting dates on blockchain
            const datesTx = await instance.methods.setDates(startTimestamp, endTimestamp).send({
              from: App.account,
              gas: 200000
            });
            
            console.log('Voting dates set on blockchain:', datesTx.transactionHash);
            App.showStatus('Voting dates synchronized with blockchain!', 'success');
          } catch (datesError) {
            console.error('Error setting blockchain dates:', datesError);
            App.showStatus('Warning: Candidate added but failed to set voting dates on blockchain', 'warning');
          }
        } else {
          console.log('Voting dates already initialized on blockchain');
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
  vote: async function() {
    const candidateID = $("input[name='candidate']:checked").val();
    
    if (!candidateID) {
      $("#msg").html("<p>Please select a candidate to vote for.</p>");
      return;
    }

    // MANDATORY: Verify face before allowing vote
    const faceVerified = await App.verifyFaceBeforeVoting();
    if (!faceVerified) {
      $("#msg").html("<p style='color: red;'>❌ Face verification failed. You must verify your identity to vote.</p>");
      return;
    }

    try {
      const instance = App.contracts.Voting;
      
      // Check voting status first
      const votingStatus = await instance.methods.getVotingStatus().call();
      console.log('Voting status:', votingStatus);
      
      if (votingStatus === "Not Initialized") {
        $("#msg").html("<p style='color: orange;'>⚠️ Voting has not been initialized yet. Admin needs to set voting dates.</p>");
        return;
      }
      
      if (votingStatus === "Not Started") {
        const dates = await instance.methods.getDates().call();
        const startDate = new Date(parseInt(dates[0]) * 1000);
        $("#msg").html(`<p style='color: orange;'>⚠️ Voting hasn't started yet. It will begin on ${startDate.toLocaleString()}.</p>`);
        return;
      }
      
      if (votingStatus === "Ended") {
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
      
      // Validate candidate ID
      const countCandidates = await instance.methods.getCountCandidates().call();
      if (parseInt(candidateID) > parseInt(countCandidates) || parseInt(candidateID) < 1) {
        $("#msg").html("<p style='color: red;'>❌ Invalid candidate selection.</p>");
        return;
      }
      
      // Show processing message
      $("#msg").html("<p style='color: blue;'>⏳ Processing your vote... Please confirm in MetaMask.</p>");
      $("#voteButton").attr("disabled", true);
      
      // Estimate gas first to catch errors early
      try {
        await instance.methods.vote(parseInt(candidateID)).estimateGas({ from: App.account });
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        $("#voteButton").attr("disabled", false);
        $("#msg").html("<p style='color: red;'>❌ Transaction would fail. Please ensure you have enough ETH and haven't voted already.</p>");
        return;
      }
      
      // Send the vote transaction
      await instance.methods.vote(parseInt(candidateID)).send({ 
        from: App.account,
        gas: 200000 // Set reasonable gas limit
      });
      
      $("#msg").html("<p style='color: green;'>✅ Your vote has been recorded successfully!</p>");
      $("#voteButton").attr("disabled", true);
      
      // Refresh candidate list to show updated vote counts
      await App.loadCandidates();
      
    } catch (error) {
      console.error('Error voting:', error);
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
  },

  // ==========================================
  // FACE VERIFICATION BEFORE VOTING
  // ==========================================
  verifyFaceBeforeVoting: async function() {
    return new Promise((resolve) => {
      // Show face verification dialog
      const confirmVerify = confirm(
        '🔐 Face Verification Required\n\n' +
        'To ensure secure voting and prevent fraud, you must verify your identity using face recognition.\n\n' +
        'Click OK to open the camera and verify your face.'
      );
      
      if (!confirmVerify) {
        resolve(false);
        return;
      }
      
      // Create modal for face verification
      App.showFaceVerificationModal(resolve);
    });
  },

  showFaceVerificationModal: function(resolveCallback) {
    // Create modal HTML
    const modalHTML = `
      <div id="voteFaceVerificationModal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 15px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
          <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
            🔐 Verify Your Face to Vote
          </h2>
          <p style="color: #666; text-align: center; margin-bottom: 20px;">
            Position your face clearly in the camera
          </p>
          <div style="text-align: center;">
            <video id="voteVerifyVideo" autoplay style="
              width: 100%;
              max-width: 400px;
              border-radius: 10px;
              border: 3px solid #4CAF50;
              margin-bottom: 20px;
            "></video>
            <canvas id="voteVerifyCanvas" style="display: none;"></canvas>
            <div id="voteVerifyStatus" style="
              margin: 15px 0;
              padding: 10px;
              border-radius: 5px;
              font-weight: bold;
            "></div>
            <button id="captureVoteFaceBtn" style="
              background: #4CAF50;
              color: white;
              border: none;
              padding: 12px 30px;
              font-size: 16px;
              border-radius: 25px;
              cursor: pointer;
              margin-right: 10px;
            ">Verify Face</button>
            <button id="cancelVoteFaceBtn" style="
              background: #f44336;
              color: white;
              border: none;
              padding: 12px 30px;
              font-size: 16px;
              border-radius: 25px;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    $('body').append(modalHTML);
    
    // Initialize face verification after DOM update
    setTimeout(() => {
      App.initializeFaceVerification(resolveCallback);
    }, 100);
  },

  initializeFaceVerification: async function(resolveCallback) {
    console.log('🔧 Initializing face verification...');
    
    const video = document.getElementById('voteVerifyVideo');
    const canvas = document.getElementById('voteVerifyCanvas');
    const status = document.getElementById('voteVerifyStatus');
    const captureBtn = document.getElementById('captureVoteFaceBtn');
    const cancelBtn = document.getElementById('cancelVoteFaceBtn');
    
    console.log('📋 Elements found:', {video, canvas, status, captureBtn, cancelBtn});
    
    if (!video || !canvas || !status || !captureBtn || !cancelBtn) {
      console.error('❌ Required elements not found!');
      alert('Error: Modal elements not loaded properly. Please try again.');
      resolveCallback(false);
      return;
    }
    
    let stream = null;
    
    // Setup cancel button first (always works)
    cancelBtn.onclick = () => {
      console.log('❌ User cancelled face verification');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      $('#voteFaceVerificationModal').remove();
      resolveCallback(false);
    };
    
    try {
      // Load face models if not already loaded
      if (!App.faceModelsLoaded) {
        status.textContent = '📦 Loading face recognition models...';
        status.style.background = '#fff3cd';
        status.style.color = '#856404';
        console.log('📦 Loading face models...');
        
        const modelsLoaded = await App.loadFaceModels();
        if (!modelsLoaded) {
          throw new Error('Failed to load face recognition models');
        }
        console.log('✅ Face models loaded');
      }
      
      status.textContent = '📹 Requesting camera access...';
      status.style.background = '#fff3cd';
      status.style.color = '#856404';
      console.log('📹 Requesting camera access...');
      
      // Start camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('✅ Camera access granted, setting stream...');
      video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video loading timeout')), 5000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('✅ Video metadata loaded, playing...');
          video.play()
            .then(() => {
              console.log('✅ Video playing');
              resolve();
            })
            .catch(err => {
              console.error('❌ Video play error:', err);
              reject(err);
            });
        };
      });
      
      status.textContent = '✅ Camera ready! Click "Verify Face" when ready';
      status.style.background = '#d4edda';
      status.style.color = '#155724';
      console.log('✅ Camera ready!');
      
      // Capture button handler
      captureBtn.onclick = async () => {
        try {
          captureBtn.disabled = true;
          captureBtn.textContent = 'Verifying...';
          status.textContent = '🔍 Detecting face...';
          status.style.background = '#cfe2ff';
          status.style.color = '#084298';
          
          // Draw video frame to canvas
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Check if face-api.js is loaded
          if (typeof faceapi === 'undefined') {
            throw new Error('Face recognition library not loaded');
          }
          
          // Detect face in captured image
          const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
          
          if (!detection) {
            throw new Error('No face detected. Please ensure your face is clearly visible.');
          }
          
          status.textContent = '📤 Verifying with server...';
          
          // Get voter ID
          const voterId = localStorage.getItem('currentVoterId');
          const token = localStorage.getItem('jwtTokenVoter');
          
          if (!voterId || !token) {
            throw new Error('Please log in again');
          }
          
          // Send face descriptor to backend for verification
          const descriptor = Array.from(detection.descriptor);
          
          const response = await fetch('http://127.0.0.1:8001/login-face', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              voter_id: voterId,
              descriptor: descriptor
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Verification failed' }));
            throw new Error(errorData.detail || 'Face verification failed');
          }
          
          const result = await response.json();
          
          if (result.match || result.success) {
            status.textContent = '✅ Face verified! Proceeding to vote...';
            status.style.background = '#d4edda';
            status.style.color = '#155724';
            
            // Stop camera
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            
            // Close modal and resolve
            setTimeout(() => {
              $('#voteFaceVerificationModal').remove();
              resolveCallback(true);
            }, 1000);
          } else {
            throw new Error('Face does not match registered face');
          }
          
        } catch (error) {
          console.error('Face verification error:', error);
          status.textContent = '❌ ' + error.message;
          status.style.background = '#f8d7da';
          status.style.color = '#721c24';
          captureBtn.disabled = false;
          captureBtn.textContent = 'Verify Face';
        }
      };
      
      // Cancel button handler
      cancelBtn.onclick = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        $('#voteFaceVerificationModal').remove();
        resolveCallback(false);
      };
      
    } catch (error) {
      console.error('Camera initialization error:', error);
      status.textContent = '❌ Camera access denied. Please allow camera access and try again.';
      status.style.background = '#f8d7da';
      status.style.color = '#721c24';
      
      // Update cancel button to close modal
      cancelBtn.onclick = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        $('#voteFaceVerificationModal').remove();
        resolveCallback(false);
      };
    }
  }
};

// Initialize the app when the window loads
$(window).on('load', function() {
  App.eventStart();
});
