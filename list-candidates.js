const { Web3 } = require('web3');
const contract = require('./build/contracts/Voting.json');

(async () => {
  const web3 = new Web3('http://localhost:7545');
  const networkId = await web3.eth.net.getId();
  const instance = new web3.eth.Contract(
    contract.abi,
    contract.networks[networkId].address
  );
  
  const count = await instance.methods.getCountCandidates().call();
  console.log('Total candidates in contract:', count);
  
  for (let i = 1; i <= count; i++) {
    const c = await instance.methods.getCandidate(i).call();
    console.log(`${i}. ${c[0]} (Age: ${c[1]}, Party: ${c[2]})`);
  }
})();
