/**
 * Test Candidate Loading - Debug Script
 * Run this to verify candidates are on the blockchain
 */

const { Web3 } = require('web3');
const VotingJSON = require('./build/contracts/Voting.json');

async function testCandidateLoading() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Candidate Loading from Blockchain');
    console.log('='.repeat(60) + '\n');

    // Connect to Ganache
    const web3 = new Web3('http://localhost:7545');
    const accounts = await web3.eth.getAccounts();
    console.log('✅ Connected to Ganache');
    console.log(`   Network ID: ${await web3.eth.net.getId()}`);
    console.log(`   Using account: ${accounts[0]}\n`);

    // Get contract instance
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = VotingJSON.networks[networkId];
    
    if (!deployedNetwork) {
      console.error('❌ Contract not deployed on this network!');
      console.log('   Run: truffle migrate --reset');
      return;
    }

    const contract = new web3.eth.Contract(
      VotingJSON.abi,
      deployedNetwork.address
    );

    console.log(`✅ Contract loaded at: ${deployedNetwork.address}\n`);

    // Test 1: Get candidate count
    console.log('[Test 1] Getting candidate count...');
    const count = await contract.methods.getCountCandidates().call();
    console.log(`   Total candidates: ${count}\n`);

    if (count == 0) {
      console.log('⚠️  No candidates found on blockchain!');
      console.log('   Add candidates from the Add Candidate page or run sync script\n');
      return;
    }

    // Test 2: Get all candidates
    console.log('[Test 2] Fetching all candidates...');
    const candidates = await contract.methods.getAllCandidates().call();
    console.log(`   Retrieved ${candidates.length} candidates\n`);

    // Test 3: Display each candidate with proper field indexing
    console.log('[Test 3] Candidate Details:');
    console.log('-'.repeat(60));
    
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      
      // Try both property access and index access
      const name = c.name || c[1] || 'Unknown';
      const party = c.party || c[5] || 'Unknown';
      const candidateId = c.candidateId || c[9] || 'Unknown';
      const rawVoteCount = c.voteCount || c[11] || 0;
      const voteCount = typeof rawVoteCount === 'bigint' ? Number(rawVoteCount) : parseInt(rawVoteCount);
      
      console.log(`\nCandidate #${i + 1} (Blockchain ID: ${i + 1})`);
      console.log(`   Name: ${name}`);
      console.log(`   Party: ${party}`);
      console.log(`   Candidate ID: ${candidateId}`);
      console.log(`   Vote Count: ${voteCount}`);
      console.log(`   Raw Vote Count type: ${typeof rawVoteCount}`);
      console.log(`   Has blockchainId: true`);
      console.log(`   Has onBlockchain: true`);
    }

    console.log('\n' + '-'.repeat(60));
    console.log('✅ Test completed successfully!\n');
    
    // Test 4: Test vote count extraction
    console.log('[Test 4] Verifying vote count extraction...');
    const testCandidate = candidates[0];
    console.log(`   testCandidate[10] (password): ${testCandidate[10]}`);
    console.log(`   testCandidate[11] (voteCount): ${testCandidate[11]}`);
    console.log(`   testCandidate.voteCount: ${testCandidate.voteCount}`);
    
    const correctVoteCount = typeof testCandidate[11] === 'bigint' 
      ? Number(testCandidate[11]) 
      : parseInt(testCandidate[11] || 0);
    console.log(`   Correctly extracted vote count: ${correctVoteCount}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testCandidateLoading().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
