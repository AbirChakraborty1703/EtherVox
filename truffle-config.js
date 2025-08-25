/**
 * EtherVox Decentralized Voting System - Truffle Configuration
 * 
 * @file truffle-config.js
 * @author EtherVox Development Team
 * @description Truffle framework configuration for blockchain deployment
 * @version 1.0.0
 * 
 * This configuration defines network settings, compiler options,
 * and deployment parameters for the voting smart contracts.
 * 
 * See http://truffleframework.com/docs/advanced/configuration
 * for more about customizing your Truffle configuration!
 */

module.exports = {
  networks: {
    // Local development network (Ganache)
    development: {
      host: "127.0.0.1",     // Localhost
      port: 7545,            // Ganache default port
      network_id: "*"        // Match any network id
    }
  },
  
  // Configure compiler
  compilers: {
    solc: {
      version: "0.5.16",    // Use specific Solidity version
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
}
