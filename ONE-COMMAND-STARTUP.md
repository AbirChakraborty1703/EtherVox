# ✅ EtherVox - Complete One-Command Startup Guide

## 🎯 What's Been Fixed

Your `start-ethervox.bat` file is now **fully automated** and will start **EVERYTHING** with a single command!

### 🚀 New Features:

1. **✅ Automatic MySQL Detection & Startup**
   - Tries MySQL as Windows service (MySQL80, MySQL)
   - Detects and starts XAMPP MySQL automatically
   - Detects and starts WAMP MySQL automatically  
   - Detects and starts standalone MySQL Server
   - No manual intervention needed!

2. **✅ Service Window Management**
   - All services open in separate windows (cmd /k)
   - Windows stay open even if service fails
   - Easy to see logs and errors for each service
   - Automatic error messages if startup fails

3. **✅ Service Verification**
   - Automatically checks if all ports are listening
   - Shows ✓ or ⚠️ for each service
   - Immediate feedback on what's running

4. **✅ Improved Timing**
   - 15-second wait for Ganache (prevents contract deployment failures)
   - Proper delays between service startups
   - Services have time to fully initialize

5. **✅ Better Error Handling**
   - Each service shows clear error messages
   - Windows pause if errors occur
   - Easy troubleshooting with visible logs

---

## 🎬 How to Use - Single Command!

### Just run this ONE command:

```cmd
start-ethervox.bat
```

**That's it!** The batch file will:

1. ✅ Stop any existing processes
2. ✅ Start MySQL (auto-detects installation)
3. ✅ Start MongoDB
4. ✅ Setup MySQL database & test users
5. ✅ Start Ganache blockchain (with 15-sec initialization)
6. ✅ Verify Ganache is ready
7. ✅ Compile & deploy smart contracts
8. ✅ Build frontend bundle (Webpack)
9. ✅ Start FastAPI backend
10. ✅ Start Express frontend
11. ✅ Verify all services are running
12. ✅ Auto-open browser to http://localhost:8081/

---

## 📊 Service Windows

After running, you'll see **5 separate terminal windows**:

1. **MongoDB Server** - Database for candidates
2. **MySQL** - Database for voters (if auto-started)
3. **Ganache Blockchain** - Ethereum test network
4. **FastAPI Backend** - Python API on port 8001
5. **Express Frontend** - Node.js server on port 8081

**Main window** stays open - press any key to **stop all services** at once!

---

## ✅ What Services Run Where

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Express** | 8081 | http://localhost:8081/ | Frontend server |
| **FastAPI** | 8001 | http://127.0.0.1:8001/docs | Backend API |
| **Ganache** | 7545 | http://127.0.0.1:7545 | Blockchain |
| **MongoDB** | 27017 | localhost:27017 | Candidates DB |
| **MySQL** | 3306 | localhost:3306 | Voters DB |

---

## 🔐 Default Login Credentials

After startup completes, login at: http://localhost:8081/

### Admin Account:
- **ID:** `A001`
- **Password:** `admin123`
- **Access:** Admin Dashboard, Add Candidate, Set Voting Dates

### Voter Accounts:
- **ID:** `V001` or `V002`
- **Password:** `voter123`
- **Access:** Voting page

---

## 🎯 Service Verification

The batch file automatically verifies all services:

```
[OK] Express (port 8081) - Running
[OK] FastAPI (port 8001) - Running
[OK] Ganache (port 7545) - Running
[OK] MongoDB (port 27017) - Running
[OK] MySQL (port 3306) - Running
```

If you see **[WARNING]**, check that service's window for error messages.

---

## 🛑 How to Stop All Services

Just press **ANY KEY** in the main terminal window!

This will automatically:
- Stop MongoDB
- Stop MySQL (if started by script)
- Stop Python/FastAPI
- Stop Node.js/Express
- Stop Ganache
- Clean shutdown of all services

---

## 📁 Helper Files Created

| File | Purpose |
|------|---------|
| **start-ethervox.bat** | Main startup script (ONE COMMAND!) |
| **deploy-contracts-manual.bat** | Manually deploy contracts if needed |
| **test-ganache.bat** | Test if Ganache is responding |
| **insert_test_users.py** | Create MySQL test users |
| **TROUBLESHOOTING.md** | Detailed troubleshooting guide |
| **QUICK-FIX.md** | Quick fix instructions |
| **.env.example** | Environment configuration template |

---

## 🔧 MySQL Installation Detection

The script automatically detects MySQL from:

1. **Windows Service** (MySQL80 or MySQL)
2. **XAMPP** - `C:\xampp\mysql\`
3. **WAMP** - `C:\wamp64\bin\mysql\`
4. **Standalone** - `C:\Program Files\MySQL\MySQL Server 8.0\`

If your MySQL is in a different location, it will show a warning but continue with other services.

---

## ⚙️ Advanced: Manual Service Control

If you need to start services individually:

```cmd
# MongoDB
mongod --dbpath Database_API/mongodb_data

# Ganache
ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100

# Deploy contracts
truffle migrate --reset --network development

# FastAPI
cd Database_API && python main.py

# Express
node index.js
```

---

## 📝 Logs and Debugging

Each service runs in its own window, so you can:

1. **View real-time logs** - Each window shows live output
2. **Check for errors** - Error messages appear in respective windows
3. **Monitor activity** - See requests, database operations, blockchain transactions
4. **Debug issues** - Logs help identify problems quickly

---

## 🎊 Success Indicators

When everything works correctly, you'll see:

1. ✅ **5 service windows** open and running
2. ✅ **Verification section** shows all [OK]
3. ✅ **Browser auto-opens** to login page
4. ✅ **Login page loads** with purple gradient background
5. ✅ **Can login** with test credentials
6. ✅ **Admin dashboard** loads with two option cards

---

## 🚨 If Something Goes Wrong

1. **Check service windows** - Look for red error messages
2. **Check ports** - Run: `netstat -ano | findstr ":8081 :8001 :7545 :3306 :27017"`
3. **Re-run script** - Often fixes timing issues: `start-ethervox.bat`
4. **Check TROUBLESHOOTING.md** - Detailed solutions for common issues
5. **Manual deployment** - If contracts fail: `deploy-contracts-manual.bat`

---

## 🎯 Quick Reference

**Start everything:**
```cmd
start-ethervox.bat
```

**Stop everything:**
```
Press any key in main window
```

**Check if running:**
```cmd
netstat -ano | findstr ":8081 :8001 :7545 :3306 :27017"
```

**Deploy contracts manually:**
```cmd
truffle migrate --reset --network development
```

**Access application:**
```
http://localhost:8081/
```

---

## 🌟 What Makes This Special

Unlike typical multi-service projects that require:
- ❌ 10+ terminal windows
- ❌ Manual startup of each service
- ❌ Remembering complex commands
- ❌ Checking if each service started
- ❌ Different shutdown procedures

**EtherVox now offers:**
- ✅ **ONE command** to start everything
- ✅ **Automatic service detection** (MySQL, MongoDB, Ganache)
- ✅ **Smart error handling** with clear messages
- ✅ **Service verification** shows what's running
- ✅ **One-click shutdown** (any key stops all)
- ✅ **Auto-browser opening** to login page
- ✅ **Organized windows** - one per service
- ✅ **Comprehensive logging** in each window

---

## 💡 Pro Tips

1. **Keep service windows minimized** - They'll show in taskbar
2. **Don't close service windows manually** - Use main window to stop all
3. **Check verification section** - Confirms all services started
4. **Wait for browser to open** - Means startup is complete
5. **If contracts fail** - Re-run script or use deploy-contracts-manual.bat

---

## 🎉 You're All Set!

Everything is now configured for **one-command startup**!

Just run: `start-ethervox.bat`

Your complete blockchain voting system with admin dashboard will start automatically! 🚀
