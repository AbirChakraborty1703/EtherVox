/**
 * EtherVox Smart Contract Deployment Script
 * Deploy Voting.sol contract to Ganache network
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:8545');

// Load compiled contract
const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

async function deployContract() {
    try {
        console.log('🚀 Starting EtherVox contract deployment...');
        
        // Get accounts from Ganache
        const accounts = await web3.eth.getAccounts();
        console.log('📋 Available accounts:', accounts.length);
        console.log('💼 Deploying from account:', accounts[0]);
        
        // Check account balance
        const balance = await web3.eth.getBalance(accounts[0]);
        console.log('💰 Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // Create contract instance
        const contract = new web3.eth.Contract(contractJson.abi);
        
        // Deploy contract
        console.log('📦 Deploying Voting contract...');
        const deployTransaction = contract.deploy({
            data: contractJson.bytecode
        });
        
        // Estimate gas
        const gasEstimate = await deployTransaction.estimateGas({ from: accounts[0] });
        console.log('⛽ Estimated gas:', gasEstimate);
        
        // Deploy
        const deployedContract = await deployTransaction.send({
            from: accounts[0],
            gas: gasEstimate + 100000, // Add some buffer
            gasPrice: '20000000000' // 20 gwei
        });
        
        console.log('✅ Contract deployed successfully!');
        console.log('📍 Contract address:', deployedContract.options.address);
        console.log('🔗 Transaction hash:', deployedContract.transactionHash);
        
        // Save contract address for frontend
        const deploymentInfo = {
            address: deployedContract.options.address,
            abi: contractJson.abi,
            deployedAt: new Date().toISOString(),
            network: 'ganache',
            networkId: await web3.eth.net.getId()
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'contract-deployment.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('💾 Deployment info saved to contract-deployment.json');
        
        // Test basic contract functions
        console.log('🧪 Testing contract...');
        const owner = await deployedContract.methods.owner().call();
        console.log('👑 Contract owner:', owner);
        
        console.log('🎉 Deployment completed successfully!');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment
deployContract();
