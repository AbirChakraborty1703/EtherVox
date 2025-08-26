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

/**
 * EtherVox Decentralized Voting System - Truffle Configuration
 * 
 * @file truffle-config.js
 * @author EtherVox Development Team
 * @description Modern Truffle framework configuration for blockchain deployment
 * @version 2.0.0 - Updated for latest Truffle and Solidity versions
 * 
 * This configuration defines network settings, compiler options,
 * and deployment parameters for the voting smart contracts.
 * 
 * See https://trufflesuite.com/docs/truffle/reference/configuration
 * for more about customizing your Truffle configuration!
 */

module.exports = {
  networks: {
    // Local development network (Ganache)
    development: {
      host: "127.0.0.1",     // Localhost
      port: 7545,            // Ganache default port
      network_id: "*",       // Match any network id
      gas: 6721975,          // Gas limit
      gasPrice: 20000000000, // 20 gwei
      websocket: true        // Enable EventEmitter interface for web3
    },
    
    // Alternative local network for testing
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "1337",
      gas: 6721975,
      gasPrice: 20000000000
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.19",    // Latest stable Solidity version
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "paris"  // Latest EVM version
      }
    }
  },

  // Mocha testing framework configuration
  mocha: {
    timeout: 100000,
    reporter: "spec"
  },

  // Configure plugins
  plugins: [
    "truffle-plugin-verify"
  ],

  // API keys for contract verification (if needed)
  api_keys: {
    // etherscan: "YOUR_ETHERSCAN_API_KEY"
  }
}
