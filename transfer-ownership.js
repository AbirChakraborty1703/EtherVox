/**
 * Transfer Contract Ownership Script (Truffle Exec)
 * Run with: truffle exec transfer-ownership.js --network development
 */

const Voting = artifacts.require("Voting");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const currentOwner = accounts[0];
        const newOwner = '0x4Ff467c89d86Ff5eb2A194823030a6aD83a44987';

        console.log('Current owner:', currentOwner);
        console.log('New owner:', newOwner);

        const votingInstance = await Voting.deployed();
        console.log('Contract address:', votingInstance.address);

        // Check current owner
        const owner = await votingInstance.owner();
        console.log('Current contract owner:', owner);

        if (owner.toLowerCase() !== currentOwner.toLowerCase()) {
            console.log('❌ Error: You are not the current owner!');
            callback();
            return;
        }

        // Transfer ownership
        console.log('\nTransferring ownership...');
        const receipt = await votingInstance.transferOwnership(newOwner, { from: currentOwner });

        console.log('✅ Ownership transferred!');
        console.log('Transaction hash:', receipt.tx);

        // Verify new owner
        const verifyOwner = await votingInstance.owner();
        console.log('\n✅ New contract owner:', verifyOwner);
        console.log('You can now use this account to add candidates!');

        callback();
    } catch (error) {
        console.error('Error:', error);
        callback(error);
    }
};
