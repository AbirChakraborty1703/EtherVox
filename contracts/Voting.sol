
// SPDX-License-Identifier: MIT

/**
 * EtherVox Voting Smart Contract
 * Author: Abir Chakraborty
 * Description: Decentralized voting system with candidate management
 * Version: 1.0.0
 * 
 * Security Features:
 * - Access control for admin functions
 * - Voting period restrictions
 * - Single vote per address enforcement
 * - Input validation for all functions
 */

pragma solidity ^0.5.16;

// Main voting contract for EtherVox DApp
contract Voting {
    // Contract owner for administrative functions
    address public owner;
    
    // Structure to store candidate information
    struct Candidate {
        uint id;
        string name;
        string party; 
        uint voteCount;
    }

    mapping (uint => Candidate) public candidates;
    mapping (address => bool) public voters;

    uint public countCandidates;
    uint256 public votingEnd;
    uint256 public votingStart;

    // Access control modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Access denied: Only owner can perform this action");
        _;
    }

    // Voting period modifier
    modifier duringVotingPeriod() {
        require(votingStart <= block.timestamp && votingEnd > block.timestamp, "Voting is not active");
        _;
    }

    // Constructor sets the contract deployer as owner
    constructor() public {
        owner = msg.sender;
    }

    // Admin function to add candidates (only owner)
    function addCandidate(string memory name, string memory party) public onlyOwner returns(uint) {
        require(bytes(name).length > 0, "Candidate name cannot be empty");
        require(bytes(party).length > 0, "Party name cannot be empty");
        
        countCandidates++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, 0);
        return countCandidates;
    }
   
    // Public voting function with security checks
    function vote(uint candidateID) public duringVotingPeriod {
        require(candidateID > 0 && candidateID <= countCandidates, "Invalid candidate ID");
        require(!voters[msg.sender], "You have already voted");
              
        voters[msg.sender] = true;
        candidates[candidateID].voteCount++;      
    }
    
    // Check if current address has voted
    function checkVote() public view returns(bool){
        return voters[msg.sender];
    }
       
    // Get total number of candidates
    function getCountCandidates() public view returns(uint) {
        return countCandidates;
    }

    // Get candidate details by ID
    function getCandidate(uint candidateID) public view returns (uint,string memory, string memory,uint) {
        require(candidateID > 0 && candidateID <= countCandidates, "Invalid candidate ID");
        return (candidateID,candidates[candidateID].name,candidates[candidateID].party,candidates[candidateID].voteCount);
    }

    // Admin function to set voting dates (only owner, only before voting starts)
    function setDates(uint256 _startDate, uint256 _endDate) public onlyOwner {
        require(votingEnd == 0 && votingStart == 0, "Voting dates already set");
        require(_startDate > block.timestamp, "Start date must be in the future");
        require(_endDate > _startDate, "End date must be after start date");
        require(_endDate >= _startDate + 1800, "Voting period must be at least 30 minutes"); // Reduced to 30 minutes for testing
        
        votingEnd = _endDate;
        votingStart = _startDate;
    }

    // Get voting period dates
    function getDates() public view returns (uint256,uint256) {
        return (votingStart,votingEnd);
    }

    // Transfer ownership (security feature)
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
