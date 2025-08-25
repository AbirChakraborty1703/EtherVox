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
module.exports = function(deployer) {
  // Deploy the Voting contract to the configured network
  deployer.deploy(Voting)
}
