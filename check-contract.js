const Web3 = require('web3').default || require('web3');
const fs = require('fs');
const path = require('path');

const web3 = new Web3('http://127.0.0.1:7545');

async function checkContract() {
    const contractPath = path.join(__dirname, 'build', 'contracts', 'Voting.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    const networkId = await web3.eth.net.getId();
    const contractAddress = contractJson.networks[networkId].address;
    
    const contract = new web3.eth.Contract(contractJson.abi, contractAddress);
    
    console.log('\n📋 Contract Address:', contractAddress);
    
    const dates = await contract.methods.getDates().call();
    const status = await contract.methods.getVotingStatus().call();
    
    const now = Math.floor(Date.now() / 1000);
    
    console.log('📅 Voting Dates:');
    console.log('   Start:', new Date(Number(dates[0]) * 1000).toLocaleString());
    console.log('   End:', new Date(Number(dates[1]) * 1000).toLocaleString());
    console.log('⏰ Current Time:', new Date(now * 1000).toLocaleString());
    console.log('📊 Status:', status);
    console.log();
}

checkContract();
