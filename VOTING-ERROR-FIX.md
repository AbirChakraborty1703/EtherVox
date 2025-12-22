# Voting Error Fix Guide

## Problem
Users were getting **"Internal JSON-RPC error"** when trying to vote because the voting period was not initialized.

## Root Cause
The smart contract's `vote()` function has a `duringVotingPeriod` modifier that checks:
- `votingStart <= current time <= votingEnd`

If voting dates aren't set, or voting hasn't started/has ended, the transaction **reverts before being sent**, causing MetaMask to show "Internal JSON-RPC error".

## Solution Applied

### 1. ✅ Enhanced Vote Function (app.js)
Added comprehensive checks **before** sending the transaction:
- ✅ Check voting status (Not Initialized, Not Started, Active, Ended)
- ✅ Check if user already voted
- ✅ Validate candidate selection
- ✅ Estimate gas to catch errors early
- ✅ Better error messages with clear feedback

### 2. ✅ Created Set Voting Dates Script
A new script `set-voting-dates.js` to easily configure voting periods.

## How to Fix the Current Error

### Step 1: Set Voting Dates (REQUIRED)
Run this command to configure when voting should be active:

```bash
node set-voting-dates.js
```

Example interaction:
```
⏰ Enter START date and time: 2025-12-22 15:00
⏰ Enter END date and time: 2025-12-23 15:00
✅ Confirm and set these dates? (yes/no): yes
```

**Important:** 
- Start date must be in the **future**
- End date must be **after** start date
- Minimum duration: **30 minutes**
- Dates can only be set **once** (for security)

### Step 2: Rebuild Frontend (if you manually edited app.js)
```bash
npm run build
```

### Step 3: Test Voting
1. Open your browser and refresh the page
2. Select a candidate
3. Click "Vote"
4. You should now see clear status messages:
   - ⚠️ "Voting hasn't started yet..." (if before start time)
   - ✅ "Your vote has been recorded successfully!" (if during voting period)
   - ❌ "Voting has ended..." (if after end time)

## New Error Messages

Users will now see helpful messages instead of generic errors:

| Scenario | Message |
|----------|---------|
| Dates not set | ⚠️ Voting has not been initialized yet. Admin needs to set voting dates. |
| Too early | ⚠️ Voting hasn't started yet. It will begin on [DATE]. |
| Too late | ❌ Voting has ended. You can no longer cast votes. |
| Already voted | ⚠️ You have already voted! |
| Invalid candidate | ❌ Invalid candidate selection. |
| MetaMask rejection | ❌ Transaction was rejected. |
| Low gas | ❌ Insufficient ETH for gas fees. |

## Quick Test Checklist

- [ ] Run `node set-voting-dates.js` with dates that span current time
- [ ] Rebuild: `npm run build`
- [ ] Restart your web server
- [ ] Open browser DevTools console
- [ ] Try to vote - should see clear status messages
- [ ] Check for "Voting status: Active" in console

## For Testing Immediately

If you want to test voting **right now**, set:
- Start: 1 minute in the future
- End: 1 hour from now

Example:
```
Current time: 2025-12-22 14:30
Start: 2025-12-22 14:31
End: 2025-12-22 15:31
```

## Emergency: End Voting Early

If you need to stop voting, the contract owner can run:
```javascript
const contract = new web3.eth.Contract(abi, address);
await contract.methods.emergencyStop().send({ from: ownerAddress });
```

## Verification Commands

Check voting status in browser console:
```javascript
const status = await App.contracts.Voting.methods.getVotingStatus().call();
console.log('Status:', status);

const dates = await App.contracts.Voting.methods.getDates().call();
console.log('Start:', new Date(parseInt(dates[0]) * 1000));
console.log('End:', new Date(parseInt(dates[1]) * 1000));
```

## Files Changed

1. **src/js/app.js** - Enhanced vote function with validation
2. **set-voting-dates.js** - New script to configure voting period
3. **public/app.bundle.js** - Rebuilt webpack bundle

---

**Need Help?** 
- Check console for detailed error messages
- Verify Ganache is running on port 8545
- Ensure contract is deployed: `truffle migrate --reset`
- Verify you're connected to the correct network in MetaMask
