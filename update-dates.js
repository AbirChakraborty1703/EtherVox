/**
 * Update voting dates - Force reset to current time
 */

const Web3 = require('web3').default || require('web3');
const fs = require('fs');
const path = require('path');

const web3 = new Web3('http://127.0.0.1:7545');

async function updateDates() {
    try {
        console.log('\n📅 Updating Voting Dates...\n');
        
        // Load contract
        const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        const accounts = await web3.eth.getAccounts();
        const networkId = await web3.eth.net.getId();
        const contractAddress = contractJson.networks[networkId].address;
        
        const votingContract = new web3.eth.Contract(
            contractJson.abi,
            contractAddress
        );
        
        const owner = await votingContract.methods.owner().call();
        console.log('💰 Checking owner balance...');
        const balance = await web3.eth.getBalance(owner);
        console.log('   Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // Set new dates: Start in 1 minute, end in 7 days
        const now = Math.floor(Date.now() / 1000);
        const startTime = now + 120; // Start in 2 minutes (must be > block.timestamp)
        const endTime = startTime + (7 * 24 * 60 * 60);
        
        console.log('⏰ New voting period:');
        console.log('   Start:', new Date(startTime * 1000).toLocaleString());
        console.log('   End:', new Date(endTime * 1000).toLocaleString());
        console.log();
        
        // Get current dates
        const currentDates = await votingContract.methods.getDates().call();
        console.log('📊 Current dates:', {
            start: new Date(Number(currentDates[0]) * 1000).toLocaleString(),
            end: new Date(Number(currentDates[1]) * 1000).toLocaleString()
        });
        
        // Update dates
        console.log('📝 Sending transaction from:', owner);
        try {
            const gasEstimate = await votingContract.methods.setDates(startTime, endTime).estimateGas({ from: owner });
            console.log('⛽ Estimated gas:', gasEstimate);
            
            const tx = await votingContract.methods.setDates(startTime, endTime).send({
                from: owner,
                gas: Math.floor(gasEstimate * 1.5)
            });
            
            console.log('✅ Transaction successful!');
            return tx;
        } catch (err) {
            console.error('Transaction error:', err.message);
            if (err.innerError) console.error('Inner error:', err.innerError);
            throw err;
        }
        
        console.log('   TX:', tx.transactionHash);
        
        // Verify
        const status = await votingContract.methods.getVotingStatus().call();
        console.log('   Status:', status);
        console.log('\n🎉 Voting is now active!\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

updateDates();
