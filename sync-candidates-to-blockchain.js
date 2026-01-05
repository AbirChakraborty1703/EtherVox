/**
 * Sync MongoDB candidates to blockchain
 * This script reads candidates from MongoDB and adds them to the blockchain contract
 */

const { Web3 } = require('web3');
const votingArtifacts = require('./build/contracts/Voting.json');

async function syncCandidates() {
  try {
    console.log('=== SYNCING MONGODB CANDIDATES TO BLOCKCHAIN ===\n');
    
    // 1. Fetch candidates from MongoDB API
    console.log('Step 1: Fetching candidates from MongoDB API...');
    const response = await fetch('http://127.0.0.1:8001/candidates');
    
    if (!response.ok) {
      throw new Error('MongoDB API not responding. Is it running on port 8001?');
    }
    
    const data = await response.json();
    console.log(`Found ${data.count} candidates in MongoDB\n`);
    
    if (data.count === 0) {
      console.log('No candidates to sync!');
      return;
    }
    
    // 2. Connect to blockchain
    console.log('Step 2: Connecting to Ganache blockchain...');
    const web3 = new Web3('http://127.0.0.1:7545');
    const networkId = await web3.eth.net.getId();
    console.log('Network ID:', networkId);
    
    const deployedNetwork = votingArtifacts.networks[networkId];
    if (!deployedNetwork) {
      throw new Error(`Contract not deployed on network ${networkId}`);
    }
    
    console.log('Contract Address:', deployedNetwork.address);
    
    const contract = new web3.eth.Contract(
      votingArtifacts.abi,
      deployedNetwork.address
    );
    
    // 3. Get contract owner account (first Ganache account)
    const accounts = await web3.eth.getAccounts();
    const ownerAccount = accounts[0];
    console.log('Using account:', ownerAccount);
    
    const contractOwner = await contract.methods.owner().call();
    console.log('Contract owner:', contractOwner);
    
    if (ownerAccount.toLowerCase() !== contractOwner.toLowerCase()) {
      console.log('\n⚠️  WARNING: Account is not contract owner!');
      console.log('Make sure the first Ganache account matches the contract owner.');
    }
    
    // 4. Check current blockchain candidates
    const currentCount = await contract.methods.getCountCandidates().call();
    console.log(`\nCurrent candidates on blockchain: ${currentCount}`);
    
    // 5. Add each MongoDB candidate to blockchain
    console.log('\n=== ADDING CANDIDATES TO BLOCKCHAIN ===\n');
    
    for (let i = 0; i < data.candidates.length; i++) {
      const candidate = data.candidates[i];
      console.log(`\nAdding candidate ${i + 1}/${data.count}:`);
      console.log(`  Name: ${candidate.name}`);
      console.log(`  Party: ${candidate.party}`);
      console.log(`  Date of Birth: ${candidate.dateOfBirth}`);
      console.log(`  Election Center: ${candidate.electionCenter}`);
      console.log(`  Address: ${candidate.candidateAddress}`);
      
      try {
        // Add candidate to blockchain
        // Parameters: name, age, dateOfBirth, electionCenter, party, candidateAddress, email, phoneNumber, candidateId, candidatePassword
        const tx = await contract.methods.addCandidate(
          candidate.name,
          parseInt(candidate.age) || 25,
          candidate.dateOfBirth || '2000-01-01',
          candidate.electionCenter,
          candidate.party,
          candidate.candidateAddress,
          candidate.email || `${candidate.name.replace(/\s+/g, '').toLowerCase()}@example.com`,
          candidate.phoneNumber || '0000000000',
          candidate.candidateId || `CAND${String(i + 1).padStart(6, '0')}`,
          candidate.candidatePassword || 'temp123'
        ).send({
          from: ownerAccount,
          gas: 500000
        });
        
        console.log(`  ✅ Added to blockchain! TX: ${tx.transactionHash}`);
        
        // Update MongoDB with new blockchain address
        try {
          const updateResponse = await fetch(`http://127.0.0.1:8001/candidates/${candidate._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              blockchainAddress: tx.transactionHash,
              blockchainAccount: ownerAccount
            })
          });
          
          if (updateResponse.ok) {
            console.log(`  ✅ Updated MongoDB with new blockchain address`);
          }
        } catch (updateError) {
          console.log(`  ⚠️  MongoDB update failed: ${updateError.message}`);
        }
        
      } catch (txError) {
        console.error(`  ❌ Failed to add to blockchain:`, txError.message);
      }
    }
    
    // 6. Verify final count
    const finalCount = await contract.methods.getCountCandidates().call();
    console.log(`\n=== SYNC COMPLETE ===`);
    console.log(`Total candidates on blockchain: ${finalCount}`);
    console.log(`MongoDB candidates: ${data.count}`);
    
    if (parseInt(finalCount) === data.count) {
      console.log('✅ All candidates synced successfully!');
    } else {
      console.log('⚠️  Some candidates may not have synced. Check errors above.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is Ganache running on port 7545?');
    console.log('2. Is MongoDB API running on port 8001?');
    console.log('3. Is the contract deployed? (Run: npx truffle migrate)');
  }
}

syncCandidates();
