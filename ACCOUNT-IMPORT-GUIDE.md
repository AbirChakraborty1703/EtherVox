# 🔑 EtherVox Account Import Guide

## Step-by-Step Account Import for MetaMask

### 🎯 Critical Setup Instructions

Based on your Ganache configuration, follow these exact steps:

## Step 1: Add EtherVox Network to MetaMask

1. **Open MetaMask Extension**
2. **Click Network Dropdown** (currently showing "Ethereum Mainnet")
3. **Click "Add Network"** → **"Add Network Manually"**
4. **Enter these EXACT values:**

```
Network Name: EtherVox Local Network
New RPC URL: http://127.0.0.1:7545
Chain ID: 1337
Currency Symbol: ETH
Block Explorer URL: (leave empty)
```

5. **Click "Save"**

## Step 2: Import Ganache Accounts

### 🔴 IMPORTANT: Get Private Keys from Ganache

1. **Open Ganache Desktop**
2. **Click the KEY icon** next to each account to reveal private key
3. **Copy each private key** (64 characters long)

### Account Import Process:

#### Account 1 - Contract Owner (MOST IMPORTANT)
- **Address**: `0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51`
- **Role**: Contract Owner (can add candidates)
- **Import Steps**:
  1. In MetaMask → Click account circle → "Import Account"
  2. Select "Private Key" 
  3. Paste private key from Ganache (click key icon next to this address)
  4. Click "Import"
  5. **Rename account to "EtherVox Owner"**

#### Account 2 - Voter Account  
- **Address**: `0x7ACb02c2c530Ce7b25c6f8129cf3b02fa341b916`
- **Role**: Voter (can vote in elections)
- **Import same way as above**
- **Rename to "EtherVox Voter"**

#### Account 3 - Test Account
- **Address**: `0x46Bfc1AF145720bDb57fe1FCcf3F6dB07B38975`
- **Role**: Additional testing
- **Import same way as above** 
- **Rename to "EtherVox Tester"**

## Step 3: Verification Checklist

✅ **Network Setup:**
- [ ] EtherVox Local Network added to MetaMask
- [ ] Chain ID shows as 1337
- [ ] RPC URL is http://127.0.0.1:7545

✅ **Account Setup:**
- [ ] 3 accounts imported successfully  
- [ ] Each account shows ~100 ETH balance
- [ ] Accounts renamed for easy identification

✅ **Contract Deployment:**
- [ ] Smart contracts deployed successfully
- [ ] Using correct owner account (0x996d2...)

## Step 4: Testing the Setup

1. **Switch to "EtherVox Owner" account**
2. **Go to Admin page**: http://localhost:8081/admin.html
3. **Try adding a test candidate**
4. **MetaMask should prompt for transaction confirmation**
5. **After confirmation, check MongoDB for saved data**

## 🚨 Troubleshooting

### "Internal JSON-RPC Error"
- ✅ Make sure Ganache is running on port 7545
- ✅ Switch MetaMask network to "EtherVox Local Network"
- ✅ Use the Contract Owner account for adding candidates

### "Transaction Failed"
- ✅ Check you're using the owner account
- ✅ Make sure gas limit is sufficient
- ✅ Reset MetaMask account if needed (Settings → Advanced → Reset Account)

### "MetaMask not connecting"
- ✅ Refresh the browser page
- ✅ Disconnect and reconnect MetaMask
- ✅ Check network settings

## 🎯 Quick Reference

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:8081 | ✅ Running |
| Admin | http://localhost:8081/admin.html | ✅ Ready |
| API | http://localhost:8001 | ✅ Active |
| Ganache | 127.0.0.1:7545 | ✅ Connected |

## 🔐 Security Notes

- ⚠️ These are test accounts - never use on mainnet
- ⚠️ Private keys are for local development only  
- ⚠️ Always verify you're on the test network before transactions

---

**🎉 Once setup is complete, you'll have a bulletproof MetaMask + Ganache connection that works perfectly with EtherVox!**
