/**
 * EtherVox Decentralized Voting System - Contract Deployment Migration
 * 
 * @file 2_deploy_contracts.js
 * @author EtherVox Development Team
 * @description Truffle migration script for deploying voting contracts to blockchain
 * @version 1.0.0
 * 
 * This migration deploys the Voting smart contract with all necessary
 * configurations for the decentralized voting system.
 */

// Import the Voting contract from the contracts directory
var Voting = artifacts.require("./Voting.sol")

// Export the deployment function for Truffle framework
module.exports = async function(deployer, network, accounts) {
  // Deploy from the second account (your MetaMask account)
  const deployerAccount = accounts[1]; // 0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51
  
  console.log('Deploying from account:', deployerAccount);
  
  // Deploy the Voting contract to the configured network
  await deployer.deploy(Voting, { from: deployerAccount });
  
  console.log('Voting contract deployed from:', deployerAccount);
}
