/**
 * EtherVox - Sync Voting Dates from MongoDB to Blockchain
 * Use this script to set blockchain voting dates based on existing candidates in MongoDB
 */

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Connect to Ganache (try 7545 first, common Ganache port)
const web3 = new Web3('http://127.0.0.1:7545');

// MongoDB connection
const MONGODB_URL = 'mongodb://localhost:27017';
const MONGODB_DB = 'ethervox_candidates';
const MONGODB_COLLECTION = 'candidates';

// Load contract
const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

async function syncDatesFromMongoDB() {
    let mongoClient;
    
    try {
        console.log('\n🔄 Syncing Voting Dates from MongoDB to Blockchain\n');
        console.log('═══════════════════════════════════════════════════\n');
        
        // Connect to MongoDB
        console.log('📊 Connecting to MongoDB...');
        mongoClient = await MongoClient.connect(MONGODB_URL);
        const db = mongoClient.db(MONGODB_DB);
        const collection = db.collection(MONGODB_COLLECTION);
        
        // Get all active candidates
        const candidates = await collection.find({ isActive: true }).toArray();
        
        if (candidates.length === 0) {
            console.log('❌ No candidates found in MongoDB!');
            console.log('💡 Add candidates through the admin interface first.');
            return;
        }
        
        console.log(`✅ Found ${candidates.length} candidate(s) in MongoDB`);
        
        // Find the earliest start date and latest end date
        let earliestStart = null;
        let latestEnd = null;
        
        candidates.forEach(candidate => {
            const start = new Date(candidate.electionStartDate);
            const end = new Date(candidate.electionEndDate);
            
            if (!earliestStart || start < earliestStart) {
                earliestStart = start;
            }
            if (!latestEnd || end > latestEnd) {
                latestEnd = end;
            }
        });
        
        console.log('\n📅 Voting Period from MongoDB:');
        console.log('─────────────────────────────────────────────────');
        console.log('Start:', earliestStart.toLocaleString());
        console.log('End:  ', latestEnd.toLocaleString());
        
        // Get blockchain info
        const accounts = await web3.eth.getAccounts();
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractJson.networks[networkId];
        
        if (!deployedNetwork) {
            console.error('\n❌ Contract not deployed on this network!');
            return;
        }
        
        const votingContract = new web3.eth.Contract(
            contractJson.abi,
            deployedNetwork.address
        );
        
        // Check current status
        const votingStatus = await votingContract.methods.getVotingStatus().call();
        console.log('\n📊 Current blockchain status:', votingStatus);
        
        if (votingStatus !== "Not Initialized") {
            console.log('\n⚠️  Voting dates already set on blockchain!');
            const dates = await votingContract.methods.getDates().call();
            const startDate = new Date(parseInt(dates[0]) * 1000);
            const endDate = new Date(parseInt(dates[1]) * 1000);
            console.log('Blockchain Start:', startDate.toLocaleString());
            console.log('Blockchain End:  ', endDate.toLocaleString());
            console.log('\n💡 Dates can only be set once for security.');
            return;
        }
        
        // Check if owner
        const owner = await votingContract.methods.owner().call();
        if (owner.toLowerCase() !== accounts[0].toLowerCase()) {
            console.error('\n❌ You are not the contract owner!');
            console.log('Owner:', owner);
            console.log('Your account:', accounts[0]);
            return;
        }
        
        // Convert to Unix timestamps
        const startTimestamp = Math.floor(earliestStart.getTime() / 1000);
        const endTimestamp = Math.floor(latestEnd.getTime() / 1000);
        
        console.log('\n⏳ Setting voting dates on blockchain...');
        console.log('Timestamps:', { start: startTimestamp, end: endTimestamp });
        
        // Set dates
        const tx = await votingContract.methods.setDates(startTimestamp, endTimestamp).send({
            from: accounts[0],
            gas: 200000
        });
        
        console.log('\n✅ Voting dates synchronized successfully!');
        console.log('Transaction hash:', tx.transactionHash);
        console.log('Gas used:', tx.gasUsed);
        
        // Verify
        const newStatus = await votingContract.methods.getVotingStatus().call();
        console.log('\n📊 New blockchain status:', newStatus);
        
        const verifyDates = await votingContract.methods.getDates().call();
        const verifyStart = new Date(parseInt(verifyDates[0]) * 1000);
        const verifyEnd = new Date(parseInt(verifyDates[1]) * 1000);
        
        console.log('\n✅ Verification:');
        console.log('Blockchain Start:', verifyStart.toLocaleString());
        console.log('Blockchain End:  ', verifyEnd.toLocaleString());
        
        console.log('\n🎉 Synchronization complete!');
        console.log('Refresh your browser to see updated dates.');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } finally {
        if (mongoClient) {
            await mongoClient.close();
        }
    }
}

// Run the script
syncDatesFromMongoDB()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
