/**
 * EtherVox Decentralized Voting System - Migration Contract
 * 
 * @title Migrations
 * @author EtherVox Development Team
 * @description Truffle framework migration tracking contract
 * @version 1.0.0
 * 
 * This contract helps Truffle keep track of deployed contracts
 * and manage migration state across different deployments.
 */

pragma solidity ^0.5.15;

contract Migrations {
  address public owner;                    // Contract owner address
  uint public last_completed_migration;   // Track last migration number

  // Modifier to restrict access to contract owner only
  modifier restricted() {
    require(msg.sender == owner, "Access restricted to owner");
    _;
  }

  // Constructor sets the deployer as the contract owner
  constructor() public {
    owner = msg.sender;
  }

  // Function to set the completed migration number
  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  // Function to upgrade to a new migration contract
  function upgrade(address new_address) public restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
