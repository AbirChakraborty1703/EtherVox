/**
 * Sync Candidates to Blockchain
 * 
 * This script syncs candidate data from MongoDB to the Ethereum blockchain
 * by calling the smart contract's addCandidate function for each candidate.
 */

const { Web3 } = require('web3');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB configuration
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'ethervox_candidates';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'candidates';

// Web3 and contract setup
const web3 = new Web3('http://localhost:7545');
const VotingJSON = require('./build/contracts/Voting.json');

/**
 * Sync candidates from MongoDB to blockchain
 */
async function syncCandidatesToBlockchain() {
  let mongoClient;
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('Syncing Candidates to Blockchain');
    console.log('='.repeat(60) + '\n');

    // Connect to MongoDB
    console.log('[1/5] Connecting to MongoDB...');
    mongoClient = await MongoClient.connect(MONGODB_URL);
    const db = mongoClient.db(MONGODB_DB);
    const candidatesCollection = db.collection(MONGODB_COLLECTION);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all active candidates
    console.log('[2/5] Fetching candidates from MongoDB...');
    const candidates = await candidatesCollection.find({ isActive: true }).toArray();
    console.log(`✅ Found ${candidates.length} active candidates\n`);

    if (candidates.length === 0) {
      console.log('⚠️  No candidates to sync. Please add candidates first.');
      return;
    }

    // Get accounts from Ganache
    console.log('[3/5] Getting blockchain accounts...');
    const accounts = await web3.eth.getAccounts();
    console.log(`✅ Using account: ${accounts[0]}\n`);

    // Deploy or get voting contract instance
    console.log('[4/5] Getting voting contract instance...');
    const networkId = await web3.eth.net.getId();
    console.log(`Network ID: ${networkId}`);
    
    const deployedNetwork = VotingJSON.networks[networkId] || VotingJSON.networks['5777'];
    
    if (!deployedNetwork) {
      console.error(`❌ Contract not deployed on network ${networkId}`);
      console.log('Available networks:', Object.keys(VotingJSON.networks));
      process.exit(1);
    }
    
    const votingInstance = new web3.eth.Contract(
      VotingJSON.abi,
      deployedNetwork.address
    );
    console.log(`✅ Voting contract at: ${deployedNetwork.address}\n`);

    // Sync each candidate to blockchain
    console.log('[5/5] Syncing candidates to blockchain...');
    console.log('-'.repeat(60));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      try {
        console.log(`\n[${i + 1}/${candidates.length}] Syncing candidate:`);
        console.log(`   ID: ${candidate.candidateId}`);
        console.log(`   Name: ${candidate.name}`);
        console.log(`   Party: ${candidate.party}`);

        // Add candidate to blockchain with all required parameters
        const receipt = await votingInstance.methods.addCandidate(
          candidate.name || 'Unknown',
          parseInt(candidate.age) || 18,
          candidate.dateOfBirth || '01-01-2000',
          candidate.panNumber || 'XXXXX0000X',
          candidate.aadharNumber || '000000000000',
          candidate.voterEpicNumber || 'XXX0000000',
          candidate.electionCenter || 'Default Center',
          candidate.party || 'Independent',
          candidate.candidateAddress || 'Not Provided',
          candidate.email || 'not@provided.com',
          candidate.phoneNumber || '0000000000',
          candidate.candidateId || `CAND${i + 1}`,
          candidate.candidatePassword || 'hashed_password'
        ).send({ 
          from: accounts[0], 
          gas: 3000000 
        });

        console.log(`   ✅ Transaction hash: ${receipt.transactionHash}`);
        
        // Update MongoDB with blockchain info
        await candidatesCollection.updateOne(
          { _id: candidate._id },
          {
            $set: {
              blockchainAddress: receipt.transactionHash,
              blockchainAccount: accounts[0],
              syncedToBlockchain: true,
              syncedAt: new Date().toISOString()
            }
          }
        );

        successCount++;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '-'.repeat(60));
    console.log('\n' + '='.repeat(60));
    console.log('Sync Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully synced: ${successCount} candidates`);
    if (errorCount > 0) {
      console.log(`❌ Failed to sync: ${errorCount} candidates`);
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error during sync:');
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB connection closed.');
    }
  }
}

// Run the sync
if (require.main === module) {
  syncCandidatesToBlockchain()
    .then(() => {
      console.log('\n✅ Sync process completed successfully!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Sync process failed:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = syncCandidatesToBlockchain;
