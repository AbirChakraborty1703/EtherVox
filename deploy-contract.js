/**
 * Deploy Smart Contract
 * 
 * This script deploys the Voting smart contract to the Ganache blockchain
 */

const { Web3 } = require('web3');
const contract = require('@truffle/contract');
const fs = require('fs');
const path = require('path');

// Connect to Ganache
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

// Load contract JSON
const VotingJSON = require('./build/contracts/Voting.json');

async function deployContract() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('Deploying Voting Smart Contract');
    console.log('='.repeat(60) + '\n');

    // Get accounts
    console.log('[1/4] Getting blockchain accounts...');
    const accounts = await web3.eth.getAccounts();
    console.log(`✅ Deployer account: ${accounts[0]}\n`);

    // Create contract instance
    console.log('[2/4] Creating contract instance...');
    const VotingContract = contract(VotingJSON);
    VotingContract.setProvider(web3.currentProvider);
    console.log('✅ Contract loaded\n');

    // Deploy contract
    console.log('[3/4] Deploying contract to blockchain...');
    console.log('   This may take a few moments...');
    
    const votingInstance = await VotingContract.new({
      from: accounts[0],
      gas: 6721975,
      gasPrice: '20000000000'
    });

    console.log(`✅ Contract deployed at: ${votingInstance.address}\n`);

    // Save deployment info
    console.log('[4/4] Saving deployment information...');
    const deploymentInfo = {
      contractAddress: votingInstance.address,
      deployedBy: accounts[0],
      deployedAt: new Date().toISOString(),
      network: 'development',
      networkId: await web3.eth.net.getId()
    };

    const deploymentPath = path.join(__dirname, 'deployment-info.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info saved to: deployment-info.json\n`);

    // Copy updated contract artifact to public/contracts/ so the AddCandidate page
    // (which loads the artifact at runtime via fetch) uses the same contract address
    // as the webpack-bundled voting app
    const buildArtifact = path.join(__dirname, 'build', 'contracts', 'Voting.json');
    const publicArtifact = path.join(__dirname, 'public', 'contracts', 'Voting.json');
    if (fs.existsSync(buildArtifact)) {
      fs.copyFileSync(buildArtifact, publicArtifact);
      console.log(`✅ Contract artifact synced to: public/contracts/Voting.json\n`);
    }

    console.log('='.repeat(60));
    console.log('Deployment Summary');
    console.log('='.repeat(60));
    console.log(`Contract Address: ${votingInstance.address}`);
    console.log(`Deployed By: ${accounts[0]}`);
    console.log(`Network: ${deploymentInfo.network}`);
    console.log(`Network ID: ${deploymentInfo.networkId}`);
    console.log('='.repeat(60) + '\n');

    return votingInstance;

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployContract()
    .then(() => {
      console.log('✅ Deployment completed successfully!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Deployment error:', error);
      process.exit(1);
    });
}

module.exports = deployContract;
