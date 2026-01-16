/**
 * Sync Candidates to Blockchain
 * 
 * This script syncs candidate data from MongoDB to the Ethereum blockchain
 * by calling the smart contract's addCandidate function for each candidate.
 */

const Web3 = require('web3');
const contract = require('@truffle/contract');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB configuration
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'ethervox_candidates';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'candidates';

// Web3 and contract setup
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
const VotingJSON = require('./build/contracts/Voting.json');
const VotingContract = contract(VotingJSON);
VotingContract.setProvider(web3.currentProvider);

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
    mongoClient = await MongoClient.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
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
    const votingInstance = await VotingContract.deployed();
    console.log(`✅ Voting contract at: ${votingInstance.address}\n`);

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

        // Add candidate to blockchain
        const result = await votingInstance.addCandidate(
          candidate.candidateId,
          candidate.name,
          candidate.party,
          candidate.electionCenter || 'Default Center',
          { from: accounts[0], gas: 3000000 }
        );

        console.log(`   ✅ Transaction hash: ${result.tx}`);
        
        // Update MongoDB with blockchain info
        await candidatesCollection.updateOne(
          { _id: candidate._id },
          {
            $set: {
              blockchainAddress: result.tx,
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
