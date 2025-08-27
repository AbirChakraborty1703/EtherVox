/**
 * EtherVox Manual Contract Deployment with Artifacts Update
 * This script deploys the contract and updates the build artifacts
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:8545');

async function deployAndUpdateArtifacts() {
    try {
        console.log('🚀 Starting EtherVox contract deployment with artifacts update...');
        
        // Load compiled contract
        const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
        const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        // Get accounts from Ganache
        const accounts = await web3.eth.getAccounts();
        console.log('📋 Available accounts:', accounts.length);
        console.log('💼 Deploying from account:', accounts[0]);
        
        // Check account balance
        const balance = await web3.eth.getBalance(accounts[0]);
        console.log('💰 Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // Get network ID
        const networkId = await web3.eth.net.getId();
        console.log('🌐 Network ID:', networkId);
        
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
        
        // Update the artifacts file with network deployment info
        contractJson.networks = contractJson.networks || {};
        contractJson.networks[networkId] = {
            events: {},
            links: {},
            address: deployedContract.options.address,
            transactionHash: deployedContract.transactionHash
        };
        
        // Write updated artifacts back to file
        fs.writeFileSync(contractPath, JSON.stringify(contractJson, null, 2));
        console.log('📝 Updated artifacts file with deployment information');
        
        // Also create a separate deployment info file
        const deploymentInfo = {
            address: deployedContract.options.address,
            abi: contractJson.abi,
            deployedAt: new Date().toISOString(),
            network: 'ganache',
            networkId: networkId,
            transactionHash: deployedContract.transactionHash,
            deployedFrom: accounts[0]
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
        
        // Test if contract is working
        const candidateCount = await deployedContract.methods.candidatesCount().call();
        console.log('🗳️ Initial candidate count:', candidateCount);
        
        console.log('🎉 Deployment and artifacts update completed successfully!');
        console.log('📋 Summary:');
        console.log('   - Contract Address:', deployedContract.options.address);
        console.log('   - Network ID:', networkId);
        console.log('   - Owner Account:', owner);
        console.log('   - Deployment Status: SUCCESS');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        if (error.message.includes('revert')) {
            console.error('🔍 Contract execution reverted. Check constructor logic.');
        } else if (error.message.includes('gas')) {
            console.error('⛽ Gas-related error. Try increasing gas limit.');
        } else if (error.message.includes('connection')) {
            console.error('🔌 Connection error. Make sure Ganache is running on port 8545.');
        }
        process.exit(1);
    }
}

// Run deployment
deployAndUpdateArtifacts();
