/**
 * EtherVox - Set Voting Dates Script
 * Use this script to initialize voting dates for your election
 */

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:7545');

// Load contract ABI and get deployed address
const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setVotingDates() {
    try {
        console.log('\n🗳️  EtherVox - Voting Date Configuration\n');
        console.log('═══════════════════════════════════════════════════\n');
        
        // Get accounts
        const accounts = await web3.eth.getAccounts();
        console.log('📋 Admin account:', accounts[0]);
        
        // Get network ID and contract address
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractJson.networks[networkId];
        
        if (!deployedNetwork) {
            console.error('❌ Contract not deployed on this network!');
            console.log('Please run: truffle migrate --reset');
            process.exit(1);
        }
        
        const contractAddress = deployedNetwork.address;
        console.log('📄 Contract address:', contractAddress);
        
        // Create contract instance
        const votingContract = new web3.eth.Contract(
            contractJson.abi,
            contractAddress
        );
        
        // Check if owner
        const owner = await votingContract.methods.owner().call();
        if (owner.toLowerCase() !== accounts[0].toLowerCase()) {
            console.error('❌ You are not the contract owner!');
            console.log('Owner:', owner);
            console.log('Your account:', accounts[0]);
            process.exit(1);
        }
        
        // Check current voting status
        const votingStatus = await votingContract.methods.getVotingStatus().call();
        console.log('📊 Current voting status:', votingStatus);
        
        if (votingStatus !== "Not Initialized") {
            console.log('\n⚠️  Voting dates have already been set!');
            const dates = await votingContract.methods.getDates().call();
            const startDate = new Date(parseInt(dates[0]) * 1000);
            const endDate = new Date(parseInt(dates[1]) * 1000);
            console.log('Start:', startDate.toLocaleString());
            console.log('End:', endDate.toLocaleString());
            console.log('\n💡 Note: Dates can only be set once for security reasons.');
            rl.close();
            return;
        }
        
        console.log('\n📅 Set Voting Period\n');
        console.log('Enter dates in format: YYYY-MM-DD HH:MM');
        console.log('Example: 2025-12-25 10:00\n');
        
        // Get start date
        const startInput = await question('⏰ Enter START date and time: ');
        const startDate = new Date(startInput);
        
        if (isNaN(startDate.getTime())) {
            console.error('❌ Invalid start date format!');
            rl.close();
            return;
        }
        
        // Get end date
        const endInput = await question('⏰ Enter END date and time: ');
        const endDate = new Date(endInput);
        
        if (isNaN(endDate.getTime())) {
            console.error('❌ Invalid end date format!');
            rl.close();
            return;
        }
        
        // Convert to Unix timestamps
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        const endTimestamp = Math.floor(endDate.getTime() / 1000);
        const nowTimestamp = Math.floor(Date.now() / 1000);
        
        // Validation
        if (startTimestamp <= nowTimestamp) {
            console.error('❌ Start date must be in the future!');
            rl.close();
            return;
        }
        
        if (endTimestamp <= startTimestamp) {
            console.error('❌ End date must be after start date!');
            rl.close();
            return;
        }
        
        const durationMinutes = (endTimestamp - startTimestamp) / 60;
        if (durationMinutes < 30) {
            console.error('❌ Voting period must be at least 30 minutes!');
            rl.close();
            return;
        }
        
        // Display summary
        console.log('\n📋 Summary:');
        console.log('─────────────────────────────────────────────────');
        console.log('Start:', startDate.toLocaleString());
        console.log('End:  ', endDate.toLocaleString());
        console.log('Duration:', Math.floor(durationMinutes / 60), 'hours', Math.floor(durationMinutes % 60), 'minutes');
        console.log('─────────────────────────────────────────────────\n');
        
        const confirm = await question('✅ Confirm and set these dates? (yes/no): ');
        
        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log('❌ Cancelled.');
            rl.close();
            return;
        }
        
        console.log('\n⏳ Setting voting dates...');
        
        // Set dates on blockchain
        const receipt = await votingContract.methods.setDates(startTimestamp, endTimestamp).send({
            from: accounts[0],
            gas: 200000
        });
        
        console.log('✅ Voting dates set successfully!');
        console.log('Transaction hash:', receipt.transactionHash);
        console.log('Gas used:', receipt.gasUsed);
        
        // Verify
        const newStatus = await votingContract.methods.getVotingStatus().call();
        console.log('\n📊 New voting status:', newStatus);
        
        console.log('\n🎉 Configuration complete!');
        console.log('Users can now vote between:');
        console.log('  ', startDate.toLocaleString(), '-', endDate.toLocaleString());
        
        rl.close();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Run the script
setVotingDates();
