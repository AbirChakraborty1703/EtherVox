/**
 * EtherVox - Quick Status Checker
 * Check the current state of your voting system
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:8545');

// Load contract
const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

async function checkStatus() {
    try {
        console.log('\n🔍 EtherVox System Status Check\n');
        console.log('═══════════════════════════════════════════════════\n');
        
        // Get network info
        const networkId = await web3.eth.net.getId();
        const accounts = await web3.eth.getAccounts();
        
        console.log('🌐 Network ID:', networkId);
        console.log('📋 Available accounts:', accounts.length);
        
        if (accounts.length === 0) {
            console.error('❌ No accounts found! Is Ganache running?');
            return;
        }
        
        // Get contract instance
        const deployedNetwork = contractJson.networks[networkId];
        if (!deployedNetwork) {
            console.error('❌ Contract not deployed on this network!');
            console.log('\n💡 Run: truffle migrate --reset');
            return;
        }
        
        const contractAddress = deployedNetwork.address;
        console.log('📄 Contract address:', contractAddress);
        
        const votingContract = new web3.eth.Contract(
            contractJson.abi,
            contractAddress
        );
        
        // Get contract owner
        const owner = await votingContract.methods.owner().call();
        console.log('👤 Contract owner:', owner);
        console.log('🔑 Your account:', accounts[0]);
        console.log('🛡️  You are owner:', owner.toLowerCase() === accounts[0].toLowerCase() ? '✅ Yes' : '❌ No');
        
        console.log('\n📊 VOTING STATUS');
        console.log('─────────────────────────────────────────────────');
        
        // Get voting status
        const votingStatus = await votingContract.methods.getVotingStatus().call();
        console.log('Status:', votingStatus);
        
        // Get dates if initialized
        try {
            const dates = await votingContract.methods.getDates().call();
            const startDate = new Date(parseInt(dates[0]) * 1000);
            const endDate = new Date(parseInt(dates[1]) * 1000);
            const now = new Date();
            
            console.log('\n📅 Voting Period:');
            console.log('Start:', startDate.toLocaleString());
            console.log('End:  ', endDate.toLocaleString());
            console.log('Now:  ', now.toLocaleString());
            
            if (votingStatus === "Not Started") {
                const minutesUntilStart = Math.floor((startDate - now) / 60000);
                console.log('⏰ Starts in:', minutesUntilStart, 'minutes');
            } else if (votingStatus === "Active") {
                const minutesRemaining = Math.floor((endDate - now) / 60000);
                console.log('⏰ Time remaining:', minutesRemaining, 'minutes');
            }
        } catch (err) {
            console.log('⚠️  No voting dates set yet');
            console.log('\n💡 Run: node set-voting-dates.js');
        }
        
        console.log('\n📈 CANDIDATES & VOTES');
        console.log('─────────────────────────────────────────────────');
        
        // Get candidate count
        const candidateCount = await votingContract.methods.getCountCandidates().call();
        console.log('Total candidates:', candidateCount);
        
        if (parseInt(candidateCount) > 0) {
            // Get total votes
            const totalVotes = await votingContract.methods.getTotalVotes().call();
            console.log('Total votes cast:', totalVotes);
            
            console.log('\n🏆 Candidate Details:');
            for (let i = 1; i <= parseInt(candidateCount); i++) {
                const candidate = await votingContract.methods.getCandidate(i).call();
                console.log(`\n  ${i}. ${candidate.name}`);
                console.log(`     Party: ${candidate.party}`);
                console.log(`     Votes: ${candidate.voteCount}`);
                console.log(`     Age: ${candidate.age}`);
            }
        } else {
            console.log('⚠️  No candidates added yet');
            console.log('\n💡 Add candidates through the admin interface');
        }
        
        console.log('\n🔐 YOUR ACCOUNT STATUS');
        console.log('─────────────────────────────────────────────────');
        
        const balance = await web3.eth.getBalance(accounts[0]);
        console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        const hasVoted = await votingContract.methods.checkVote().call({ from: accounts[0] });
        console.log('Has voted:', hasVoted ? '✅ Yes' : '❌ No');
        
        if (hasVoted) {
            try {
                const myVote = await votingContract.methods.getMyVote().call({ from: accounts[0] });
                const candidate = await votingContract.methods.getCandidate(myVote).call();
                console.log('Voted for:', candidate.name, `(Candidate #${myVote})`);
            } catch (err) {
                console.log('Could not retrieve vote details');
            }
        }
        
        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ Status check complete!\n');
        
        // Action recommendations
        console.log('📋 NEXT STEPS:');
        if (votingStatus === "Not Initialized") {
            console.log('  1. Run: node set-voting-dates.js');
            console.log('  2. Add candidates via admin interface');
            console.log('  3. Start voting when period begins');
        } else if (votingStatus === "Not Started") {
            console.log('  • Waiting for voting to start');
            console.log('  • Candidates can still be added');
        } else if (votingStatus === "Active") {
            console.log('  • Voting is LIVE! Users can vote now');
            console.log('  • Monitor vote counts in real-time');
        } else if (votingStatus === "Ended") {
            console.log('  • Voting has concluded');
            console.log('  • Review final results above');
        }
        console.log();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n🔍 Troubleshooting:');
        console.log('  • Is Ganache running on http://127.0.0.1:8545?');
        console.log('  • Is the contract deployed? (truffle migrate)');
        console.log('  • Check your network configuration');
    }
}

// Run the status check
checkStatus().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
