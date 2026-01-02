# 🚀 EtherVox One-Command Startup Guide

## 📋 What `start-ethervox.bat` Does

The **start-ethervox.bat** file is your one-command launcher that starts the entire EtherVox system with all services, including the new Admin Dashboard system.

## ⚡ Quick Start

### **Single Command to Start Everything:**

```bash
start-ethervox.bat
```

That's it! This single command will:

1. ✅ Clean up any existing processes
2. ✅ Start MongoDB (candidate storage)
3. ✅ Setup MySQL database (voter authentication)
4. ✅ Start Ganache blockchain (Ethereum local network)
5. ✅ Deploy smart contracts to blockchain
6. ✅ Build frontend bundle (Webpack)
7. ✅ Start FastAPI backend (Database API)
8. ✅ Start Express server (Web server)
9. ✅ Open browser to login page

## 🔧 What Gets Started

### **Services (8 Steps):**

| Step | Service | Port/Path | Purpose |
|------|---------|-----------|---------|
| 1 | Process Cleanup | - | Kill existing processes |
| 2 | MongoDB | 27017 | Candidate data storage |
| 3 | MySQL Setup | 3306 | Voter authentication |
| 4 | Ganache | 7545 | Local Ethereum blockchain |
| 5 | Truffle | - | Deploy smart contracts |
| 6 | Webpack | - | Build frontend bundle |
| 7 | FastAPI | 8001 | Database API backend |
| 8 | Express | 8081 | Web server frontend |

## 🌐 Accessible URLs

After startup, you can access:

```
✅ Main Login:          http://localhost:8081/
✅ Admin Dashboard:     http://localhost:8081/AdminDashboard.html
✅ Add Candidate:       http://localhost:8081/AddCandidate.html  
✅ Set Voting Info:     http://localhost:8081/SetVote.html
✅ Voter Portal:        http://localhost:8081/index.html
✅ Database API Docs:   http://127.0.0.1:8001/docs
```

## 📊 Terminal Windows

You'll see these command windows open:

1. **Main Control** - The batch script itself (stays open)
2. **MongoDB Server** - Database running
3. **FastAPI Backend** - Python API server
4. **Express Frontend** - Node.js web server

**Important:** Keep all these windows open! Closing them will stop those services.

## 🛑 How to Stop

### **Method 1: From Main Window**
Press any key in the main batch script window, and it will:
- Stop all services
- Clean up processes
- Close automatically

### **Method 2: Manual Stop**
Close all the terminal windows, or run:
```bash
taskkill /F /IM mongod.exe
taskkill /F /IM python.exe
taskkill /F /IM node.exe
taskkill /F /IM ganache.exe
```

## ✅ Verify Everything Started

After running `start-ethervox.bat`, check:

- [ ] Browser opened to `http://localhost:8081/`
- [ ] You see 4 terminal windows (Main + MongoDB + FastAPI + Express)
- [ ] Login page loads successfully
- [ ] No red error messages in terminals
- [ ] Ganache blockchain is running

## 📝 Expected Output

```
========================================
   EtherVox Complete System Startup    
     New Admin Dashboard System v2.0
========================================

[1/8] Cleaning up existing processes...
[2/8] Starting MongoDB...
[3/8] Setting up MySQL database...
[4/8] Starting Ganache blockchain...
[5/8] Compiling and deploying smart contracts...
[6/8] Building frontend bundle (Webpack)...
[7/8] Starting FastAPI backend...
[8/8] Starting Express frontend...

========================================
   All Services Started Successfully!
========================================

Services running:
 - MongoDB:       localhost:27017
 - MySQL:         localhost:3306
 - Ganache:       localhost:7545
 - FastAPI:       http://127.0.0.1:8001
 - Express:       http://localhost:8081

========================================
   NEW ADMIN DASHBOARD SYSTEM v2.0
========================================

Available Pages:
 - Login:              http://localhost:8081/
 - Admin Dashboard:    /AdminDashboard.html
 - Add Candidate:      /AddCandidate.html
 - Set Voting Info:    /SetVote.html
 - Voter Portal:       /index.html

Quick Guide:
 1. Login with admin credentials (ID starts with 'A')
 2. You'll land on the new Admin Dashboard
 3. Choose: Add Candidate OR Set Voting Information
 4. All pages have Back to Dashboard button

========================================

Opening EtherVox in your browser...

Press any key to STOP all services...
```

## 🐛 Troubleshooting

### **Issue: "npm not found" error**
**Solution:** Install Node.js and npm first
```bash
npm --version  # Check if installed
```

### **Issue: "python not found" error**
**Solution:** Install Python 3.x and add to PATH
```bash
python --version  # Check if installed
```

### **Issue: "ganache not found" error**
**Solution:** Install Ganache CLI globally
```bash
npm install -g ganache
```

### **Issue: "truffle not found" error**
**Solution:** Install Truffle globally
```bash
npm install -g truffle
```

### **Issue: MongoDB won't start**
**Solution:** Check if MongoDB is installed and port 27017 is free
```bash
# Check if port is in use
netstat -ano | findstr :27017

# Kill process using port if needed
taskkill /F /PID <process_id>
```

### **Issue: Port already in use**
**Solution:** Kill existing processes first
```bash
# Run the cleanup manually
taskkill /F /IM mongod.exe
taskkill /F /IM python.exe
taskkill /F /IM node.exe
taskkill /F /IM ganache.exe
```

### **Issue: Smart contracts fail to deploy**
**Solution:** 
1. Ensure Ganache is running
2. Check `truffle-config.js` settings
3. Try deploying manually: `truffle migrate --reset`

### **Issue: Webpack build fails**
**Solution:** 
1. Install dependencies: `npm install`
2. Check webpack.config.js
3. Try manual build: `npm run build`

## 📦 Prerequisites

Before running `start-ethervox.bat`, ensure you have:

- [x] **Node.js** (v14 or higher) - `node --version`
- [x] **Python** (v3.8 or higher) - `python --version`
- [x] **MongoDB** installed - `mongod --version`
- [x] **MySQL** installed and configured
- [x] **Ganache CLI** - `npm install -g ganache`
- [x] **Truffle** - `npm install -g truffle`
- [x] **npm packages** installed - `npm install`
- [x] **Python packages** installed - `pip install -r Database_API/requirements.txt`

## 🎯 First Time Setup

If this is your first time running EtherVox:

1. **Install all prerequisites** (see above)
2. **Install npm dependencies:**
   ```bash
   npm install
   ```
3. **Install Python dependencies:**
   ```bash
   cd Database_API
   pip install -r requirements.txt
   cd ..
   ```
4. **Configure MySQL:**
   - Create database: `ethervox_voting`
   - Update `.env` file with credentials
5. **Run the batch file:**
   ```bash
   start-ethervox.bat
   ```

## 🔄 Daily Usage

For regular use:

1. **Start:** Double-click `start-ethervox.bat`
2. **Wait:** ~30 seconds for all services to start
3. **Login:** Browser opens automatically
4. **Work:** Use the admin dashboard or voting portal
5. **Stop:** Press any key in the main window when done

## 💡 Pro Tips

1. **Keep terminals open:** Don't close the terminal windows while working
2. **Check logs:** If something fails, check the terminal outputs for errors
3. **Fresh start:** If things get weird, stop and restart all services
4. **MetaMask:** Make sure MetaMask is connected to Ganache (localhost:7545)
5. **Clear cache:** If frontend doesn't update, clear browser cache

## 📊 What Each Service Does

### **MongoDB (Port 27017)**
- Stores candidate information
- Handles candidate CRUD operations
- Used by AddCandidate page

### **MySQL (Port 3306)**
- Stores voter credentials
- Handles authentication
- Used by login system

### **Ganache (Port 7545)**
- Local Ethereum blockchain
- Stores voting dates
- Handles vote transactions
- Network ID: 5777

### **FastAPI (Port 8001)**
- Database API backend
- MongoDB integration
- MySQL integration
- Candidate management endpoints
- Authentication endpoints

### **Express (Port 8081)**
- Web server
- Serves HTML/CSS/JS files
- JWT authentication
- Route protection
- Static file serving

### **Webpack**
- Bundles JavaScript files
- Optimizes frontend code
- Creates `app.bundle.js`
- Handles Web3 dependencies

### **Truffle**
- Compiles Solidity contracts
- Deploys to Ganache
- Manages contract ABIs
- Handles migrations

## 🎉 You're Ready!

Your EtherVox system is now fully automated. Just run:

```bash
start-ethervox.bat
```

And everything starts with one command! 🚀

---

**Last Updated:** December 31, 2025
**Version:** 2.0.0 - New Admin Dashboard System
