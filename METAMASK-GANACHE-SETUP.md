# 🔗 Bulletproof MetaMask + Ganache Setup Guide

## 🎯 Permanent Connection Configuration

### Step 1: Add Ganache Network to MetaMask

1. **Open MetaMask Extension**
2. **Click Network Dropdown** (top of MetaMask)
3. **Click "Add Network"** → **"Add Network Manually"**

### Step 2: Network Configuration

Fill in these EXACT values (based on your Ganache):

```
Network Name: EtherVox Local Network
New RPC URL: http://127.0.0.1:7545
Chain ID: 1337
Currency Symbol: ETH
Block Explorer URL: (leave blank)
```

### Step 3: Import Ganache Accounts (Permanent Setup)

From your Ganache accounts, import these private keys:

#### Account 1 (Index 0):
- **Address**: `0x46Bfc1AF145720bDb57fe1FCcf3F6dB07B38975`
- **Private Key**: Get from Ganache → Click key icon next to this account
- **Purpose**: Primary testing account

#### Account 2 (Index 1): 
- **Address**: `0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51`
- **Private Key**: Get from Ganache → Click key icon next to this account  
- **Purpose**: Contract owner account (this is your deployed contract owner)

#### Account 3 (Index 2):
- **Address**: `0x7ACb02c2c530Ce7b25c6f8129cf3b02fa341b916`
- **Private Key**: Get from Ganache → Click key icon next to this account
- **Purpose**: Voter/User account

### Step 4: Import Private Keys to MetaMask

1. **In MetaMask**: Click account circle (top right)
2. **Click "Import Account"**
3. **Select "Private Key"**
4. **Paste the private key** from Ganache
5. **Click "Import"**
6. **Repeat for all 3 accounts**

### Step 5: Contract Configuration Update

Your contract is deployed with owner: `0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51`

Make sure you're using **Account 2** (Index 1) when adding candidates.

## 🛡️ Bulletproof Configuration

### Ganache Settings (DO NOT CHANGE):
- **Port**: 7545 ✅
- **Network ID**: 5777 ✅ 
- **Chain ID**: 1337 ✅
- **Automine**: ON ✅
- **Gas Price**: 2 ✅

### MetaMask Network Settings:
- **Network Name**: EtherVox Local Network
- **RPC URL**: http://127.0.0.1:7545
- **Chain ID**: 1337

## 🔧 Troubleshooting

### If MetaMask shows "Internal JSON-RPC Error":
1. Switch to a different account in MetaMask
2. Switch back to EtherVox network
3. Refresh the browser
4. Make sure Ganache is running

### If transactions fail:
1. Reset MetaMask account (Settings → Advanced → Reset Account)
2. Make sure you're using the contract owner account for adding candidates
3. Check gas settings

## 🚀 Quick Start Commands

```bash
# Start all services
cd "d:\Ethereum\EtherVox"
node start-ethervox.js
```

## ✅ Verification Checklist

- [ ] Ganache running on port 7545
- [ ] MetaMask network added with Chain ID 1337
- [ ] 3 accounts imported to MetaMask
- [ ] Using correct owner account (0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51)
- [ ] All services running (MongoDB, FastAPI, Express)
- [ ] Contracts deployed successfully

## 🎯 Account Roles

| Account | Address | Role | Balance |
|---------|---------|------|---------|
| Account 1 | 0x46Bfc1AF145720bDb57fe1FCcf3F6dB07B38975 | Test User | 99.44 ETH |
| Account 2 | 0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51 | Contract Owner | 99.67 ETH |
| Account 3 | 0x7ACb02c2c530Ce7b25c6f8129cf3b02fa341b916 | Voter Account | 100.00 ETH |

Remember: **Always use Account 2 (Contract Owner) for adding candidates!**
