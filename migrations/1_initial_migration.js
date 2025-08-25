/**
 * EtherVox Decentralized Voting System - Initial Migration
 * 
 * @file 1_initial_migration.js
 * @author EtherVox Development Team
 * @description Truffle migration script for deploying the Voting smart contract
 * @version 1.0.0
 * 
 * This migration deploys the core Voting contract to the blockchain network.
 * The contract handles candidate registration and secure voting functionality.
 */

// Import the Voting contract artifact
var Voting = artifacts.require("Voting")

// Export the migration function for Truffle deployment
module.exports = function(deployer) {
  // Deploy the Voting contract to the blockchain
  deployer.deploy(Voting)
}
