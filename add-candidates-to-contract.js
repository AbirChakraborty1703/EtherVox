const { Web3 } = require('web3');
const contract = require('./build/contracts/Voting.json');

async function addCandidates() {
  const web3 = new Web3('http://localhost:7545');
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = contract.networks[networkId];
  const instance = new web3.eth.Contract(contract.abi, deployedNetwork.address);
  const accounts = await web3.eth.getAccounts();
  
  console.log('Contract address:', deployedNetwork.address);
  console.log('Owner account:', accounts[0]);
  
  const count = await instance.methods.getCountCandidates().call();
  console.log('Current candidates in contract:', count);
  
  if (count > 0) {
    console.log('✅ Candidates already added!');
    return;
  }
  
  console.log('\n📝 Adding candidates to blockchain...');
  
  const candidates = [
    { name: 'xx', age: 18, party: 'tmc', location: 'Kolkata', education: 'Graduate', experience: '2 years', policies: 'Development', contact: '1234567890', website: 'xx.com', image: 'xx.jpg' },
    { name: 'Abhinava', age: 18, party: 'tmc', location: 'Kolkata', education: 'Graduate', experience: '3 years', policies: 'Education', contact: '9876543210', website: 'abhinava.com', image: 'abhinava.jpg' },
    { name: 'Abhinava Ghosh', age: 18, party: 'tmc', location: 'Kolkata', education: 'Graduate', experience: '5 years', policies: 'Healthcare', contact: '5555555555', website: 'abhinavag.com', image: 'abhinavag.jpg' },
    { name: 'Abhi', age: 120, party: 'tmc', location: 'Kolkata', education: 'Graduate', experience: '10 years', policies: 'Infrastructure', contact: '4444444444', website: 'abhi.com', image: 'abhi.jpg' },
    { name: 'Abhinava Ghosh', age: 120, party: 'tmc', location: 'Kolkata', education: 'Graduate', experience: '15 years', policies: 'Economy', contact: '3333333333', website: 'abhinavag2.com', image: 'abhinavag2.jpg' }
  ];
  
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    console.log(`\nAdding candidate ${i + 1}: ${c.name}`);
    
    try {
      const receipt = await instance.methods.addCandidate(
        c.name, c.age, c.party, c.location, c.education,
        c.experience, c.policies, c.contact, c.website, c.image
      ).send({ from: accounts[0], gas: 500000 });
      
      console.log(`✅ Added ${c.name} - TX: ${receipt.transactionHash}`);
    } catch (error) {
      console.error(`❌ Failed to add ${c.name}:`, error.message);
    }
  }
  
  const newCount = await instance.methods.getCountCandidates().call();
  console.log(`\n🎉 Total candidates now: ${newCount}`);
}

addCandidates().catch(console.error);
