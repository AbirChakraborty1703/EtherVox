/**
 * EtherVox - Auto Initialize Voting Dates
 * Sets voting dates to start now and end in 7 days
 */

const Web3 = require('web3').default || require('web3');
const fs = require('fs');
const path = require('path');

// Connect to Ganache on correct port
const web3 = new Web3('http://127.0.0.1:7545');

async function initializeVoting() {
    try {
        console.log('\n🗳️  Auto-Initializing EtherVox Voting System...\n');
        
        // Load contract
        const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        // Get accounts
        const accounts = await web3.eth.getAccounts();
        
        // Get network ID and contract address
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractJson.networks[networkId];
        
        if (!deployedNetwork) {
            console.error('❌ Contract not deployed!');
            process.exit(1);
        }
        
        const contractAddress = deployedNetwork.address;
        console.log('📄 Contract address:', contractAddress);
        
        // Create contract instance
        const votingContract = new web3.eth.Contract(
            contractJson.abi,
            contractAddress
        );
        
        // Get contract owner
        const owner = await votingContract.methods.owner().call();
        console.log('📋 Contract owner:', owner);
        console.log('📋 Using account:', owner);
        
        // Check voting status
        const votingStatus = await votingContract.methods.getVotingStatus().call();
        console.log('📊 Current status:', votingStatus);
        
        if (votingStatus !== "Not Initialized") {
            console.log('✅ Voting already initialized!');
            const dates = await votingContract.methods.getDates().call();
            const startDate = new Date(parseInt(dates[0]) * 1000);
            const endDate = new Date(parseInt(dates[1]) * 1000);
            console.log('   Start:', startDate.toLocaleString());
            console.log('   End:', endDate.toLocaleString());
            process.exit(0);
        }
        
        // Set dates: Start in 1 minute, end in 7 days
        const now = Math.floor(Date.now() / 1000);
        const startTime = now + 60; // Start in 1 minute
        const sevenDaysLater = startTime + (7 * 24 * 60 * 60); // End 7 days after start
        
        console.log('\n⏰ Setting voting period:');
        console.log('   Start:', new Date(startTime * 1000).toLocaleString());
        console.log('   End:', new Date(sevenDaysLater * 1000).toLocaleString());
        
        // Set dates on contract using owner account
        const tx = await votingContract.methods.setDates(startTime, sevenDaysLater).send({
            from: owner,
            gas: 300000
        });
        
        console.log('\n✅ Voting dates initialized!');
        console.log('   Transaction:', tx.transactionHash);
        console.log('   Block:', tx.blockNumber);
        
        // Verify
        const newStatus = await votingContract.methods.getVotingStatus().call();
        console.log('   Status:', newStatus);
        
        console.log('\n🎉 EtherVox is ready for voting!\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

initializeVoting();
