/**
 * EtherVox Frontend Application Logic
 * Author: Abir Chakraborty
 * Description: Handles Web3 interaction, voting functionality, and UI updates
 */

//import "../css/style.css"

// Web3 and contract interaction imports
const Web3 = require('web3');
const contract = require('@truffle/contract');

// Load voting contract artifacts
const votingArtifacts = require('../../build/contracts/Voting.json');
var VotingContract = contract(votingArtifacts)

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
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', function(accounts) {
          if (accounts.length === 0) {
            alert('Please connect to MetaMask.');
          } else {
            App.account = accounts[0];
            window.location.reload();
          }
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', function(chainId) {
          console.log('Network changed to:', chainId);
          window.location.reload();
        });

        // Check network
        const networkId = await App.web3.eth.net.getId();
        console.log('Connected to network ID:', networkId);
        
        // Warn if not on local development network
        if (networkId !== 5777 && networkId !== 1337) {
          console.warn('You are not connected to the local development network. Please switch to Ganache (localhost:7545)');
          alert('Please connect MetaMask to your local Ganache network (localhost:7545, Chain ID: 1337 or 5777)');
        }

        return App.initContract();
        
      } catch (error) {
        if (error.code === 4001) {
          alert('Please connect to MetaMask.');
        } else {
          console.error('Error accessing accounts:', error);
          alert('Error connecting to MetaMask. Please try again.');
        }
        return;
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3 = new Web3(window.web3.currentProvider);
      const accounts = await App.web3.eth.getAccounts();
      App.account = accounts[0];
      return App.initContract();
    }
    // Non-dapp browsers...
    else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
      alert('Please install MetaMask to use this DApp.');
      return;
    }
  },

  // Initialize the smart contract
  initContract: async function() {
    try {
      // Set up contract
      VotingContract.setProvider(App.web3.currentProvider);
      
      // Set default account and gas limit
      VotingContract.defaults({
        from: App.account,
        gas: 6654755
      });

      // Store contract reference
      const contractInstance = await VotingContract.deployed();
      App.contracts.Voting = contractInstance;

      // Update UI with account
      $("#accountAddress").html("Your Account: " + App.account);
      
      return App.loadVotingData();
      
    } catch (error) {
      console.error('Error initializing contract:', error);
      alert('Failed to load voting contract. Please check if it is deployed.');
    }
  },

  // Load voting data from the blockchain
  loadVotingData: async function() {
    try {
      const instance = App.contracts.Voting;
      
      // Get candidate count
      const countCandidates = await instance.getCountCandidates();
      window.countCandidates = countCandidates.toNumber();
      
      // Set up event handlers
      $(document).ready(function(){
        $('#addCandidate').click(async function() {
          try {
            const nameCandidate = $('#name').val();
            const partyCandidate = $('#party').val();
            
            if (!nameCandidate || !partyCandidate) {
              alert('Please enter both candidate name and party.');
              return;
            }
            
            const result = await instance.addCandidate(nameCandidate, partyCandidate, {
              from: App.account,
              gas: 300000
            });
            
            console.log('Candidate added successfully:', result);
            alert('Candidate added successfully!');
            window.location.reload();
            
          } catch (error) {
            console.error('Error adding candidate:', error);
            alert('Failed to add candidate. Please try again.');
          }
        });   
        
        $('#addDate').click(async function(){    
          try {
            const startDateValue = document.getElementById("startDate").value;
            const endDateValue = document.getElementById("endDate").value;
            
            console.log('Start date input:', startDateValue);
            console.log('End date input:', endDateValue);
            
            if (!startDateValue || !endDateValue) {
              alert('Please select both start and end dates.');
              return;
            }
            
            // Convert to Unix timestamps
            const startDate = Math.floor(Date.parse(startDateValue) / 1000);
            const endDate = Math.floor(Date.parse(endDateValue) / 1000);
            const currentTime = Math.floor(Date.now() / 1000);
            
            console.log('Start timestamp:', startDate);
            console.log('End timestamp:', endDate);
            console.log('Current timestamp:', currentTime);
            
            // Client-side validation
            if (isNaN(startDate) || isNaN(endDate)) {
              alert('Invalid date format. Please select valid dates.');
              return;
            }
            
            if (startDate <= currentTime) {
              alert('Start date must be in the future. Please select a later start date.');
              return;
            }
            
            if (endDate <= startDate) {
              alert('End date must be after start date.');
              return;
            }
            
            if (endDate - startDate < 3600) {
              alert('Voting period must be at least 1 hour long.');
              return;
            }
            
            // Check if dates are already set
            try {
              const existingDates = await instance.getDates();
              if (existingDates[0].toNumber() > 0 || existingDates[1].toNumber() > 0) {
                alert('Voting dates have already been set for this election.');
                return;
              }
            } catch (dateCheckError) {
              console.log('No existing dates found, proceeding...');
            }
            
            console.log('Calling setDates with:', startDate, endDate);
            
            const result = await instance.setDates(startDate, endDate, {
              from: App.account,
              gas: 500000  // Increased gas limit
            });
            
            console.log('Dates set successfully:', result);
            alert('Voting dates set successfully!');
            
            // Reload dates display
            setTimeout(async () => {
              try {
                const newDates = await instance.getDates();
                const newStartDate = new Date(newDates[0].toNumber() * 1000);
                const newEndDate = new Date(newDates[1].toNumber() * 1000);
                $("#dates").text(newStartDate.toDateString() + " - " + newEndDate.toDateString());
              } catch (reloadError) {
                console.error('Error reloading dates:', reloadError);
              }
            }, 2000);
            
          } catch (error) {
            console.error('Error setting dates:', error);
            
            // Parse the error to give more specific feedback
            let errorMessage = 'Failed to set voting dates. ';
            
            if (error.message.includes('Voting dates already set')) {
              errorMessage += 'Voting dates have already been set for this election.';
            } else if (error.message.includes('Start date must be in the future')) {
              errorMessage += 'Start date must be in the future.';
            } else if (error.message.includes('End date must be after start date')) {
              errorMessage += 'End date must be after start date.';
            } else if (error.message.includes('Voting period must be at least 1 hour')) {
              errorMessage += 'Voting period must be at least 1 hour long.';
            } else if (error.message.includes('Access denied')) {
              errorMessage += 'Only the contract owner can set voting dates.';
            } else if (error.message.includes('revert')) {
              errorMessage += 'Transaction reverted. Please check your inputs and try again.';
            } else {
              errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
          }
        });
      });

      // Load voting dates
      try {
        const dates = await instance.getDates();
        const startDate = new Date(dates[0].toNumber() * 1000);
        const endDate = new Date(dates[1].toNumber() * 1000);
        $("#dates").text(startDate.toDateString() + " - " + endDate.toDateString());
      } catch (error) {
        console.warn('No voting dates set yet:', error.message);
      }
      
      // Load candidates
      for (let i = 0; i < window.countCandidates; i++) {
        try {
          const data = await instance.getCandidate(i + 1);
          const id = data[0].toNumber();
          const name = data[1];
          const party = data[2];
          const voteCount = data[3].toNumber();
          
          const viewCandidates = `<tr><td><input class="form-check-input" type="radio" name="candidate" value="${id}" id="${id}"> ${name}</td><td>${party}</td><td>${voteCount}</td></tr>`;
          $("#boxCandidate").append(viewCandidates);
        } catch (error) {
          console.error(`Error loading candidate ${i + 1}:`, error);
        }
      }

      // Check if user has already voted
      try {
        const hasVoted = await instance.checkVote({ from: App.account });
        if (!hasVoted) {
          $("#voteButton").attr("disabled", false);
        } else {
          $("#voteButton").attr("disabled", true);
          $("#msg").html("<p>You have already voted.</p>");
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
      }
      
    } catch (error) {
      console.error('Error loading voting data:', error);
      alert('Failed to load voting data. Please refresh the page.');
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
      $("#voteButton").attr("disabled", true);
      $("#msg").html("<p>Processing vote...</p>");
      
      const instance = App.contracts.Voting;
      const result = await instance.vote(parseInt(candidateID), {
        from: App.account,
        gas: 300000
      });
      
      console.log('Vote cast successfully:', result);
      $("#msg").html("<p>Vote cast successfully!</p>");
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error voting:', error);
      $("#voteButton").attr("disabled", false);
      
      if (error.message.includes('revert')) {
        $("#msg").html("<p>Voting failed. You may have already voted or voting is not active.</p>");
      } else {
        $("#msg").html("<p>Failed to cast vote. Please try again.</p>");
      }
    }
  }
};// Initialize the application when page loads
window.addEventListener("load", function() {
  App.eventStart();
});
