# EtherVox Troubleshooting Guide

## Common Issues and Solutions

### 1. MySQL Connection Issues

**Problem:** `MySQL service not found` or connection errors

**Solutions:**
- **Option A:** Install MySQL as a Windows service
  - Download MySQL Community Server from https://dev.mysql.com/downloads/mysql/
  - Install and configure as Windows service
  
- **Option B:** Use XAMPP/WAMP
  - Start MySQL from XAMPP/WAMP control panel
  - Default credentials: user=`root`, password=`` (empty)
  
- **Option C:** Start MySQL manually
  - If MySQL is installed but not as service, start it from MySQL Workbench

**Verify MySQL is running:**
```cmd
netstat -ano | findstr :3306
```

### 2. Ganache Connection Failed

**Problem:** `Couldn't connect to node http://127.0.0.1:7545`

**Cause:** Ganache takes 10-15 seconds to fully initialize

**Solutions:**
1. **Recommended:** Re-run `start-ethervox.bat` - it now waits 15 seconds
2. **Manual deployment:**
   ```cmd
   truffle migrate --reset --network development
   ```
3. **Verify Ganache is running:**
   ```cmd
   netstat -ano | findstr :7545
   ```

### 3. Smart Contract Deployment Issues

**Problem:** `Something went wrong while attempting to connect to the network`

**Step-by-step fix:**
1. **Wait for Ganache to fully start** (check if window shows "Listening on 127.0.0.1:7545")
2. **Manually deploy contracts:**
   ```cmd
   cd D:\Ethereum\EtherVox
   truffle migrate --reset --network development
   ```
3. **Check truffle-config.js** settings:
   ```javascript
   networks: {
     development: {
       host: "127.0.0.1",
       port: 7545,
       network_id: "5777"
     }
   }
   ```

### 4. Port Already in Use

**Problem:** Services fail to start because ports are busy

**Check ports:**
```cmd
netstat -ano | findstr :8081  # Express
netstat -ano | findstr :8001  # FastAPI
netstat -ano | findstr :7545  # Ganache
netstat -ano | findstr :3306  # MySQL
netstat -ano | findstr :27017 # MongoDB
```

**Kill processes:**
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
taskkill /F /IM ganache.exe
taskkill /F /IM mongod.exe
```

### 5. MongoDB Fails to Start

**Problem:** `mongod --dbpath Database_API/mongodb_data` fails

**Solutions:**
1. **Check if data directory exists:**
   ```cmd
   dir Database_API\mongodb_data
   ```
2. **Create directory if missing:**
   ```cmd
   mkdir Database_API\mongodb_data
   ```
3. **Check if MongoDB is installed:**
   ```cmd
   mongod --version
   ```
   
### 6. Frontend Not Loading (404 Errors)

**Problem:** Pages show 404 or blank screen

**Verify services are running:**
1. Express server: http://localhost:8081/
2. FastAPI backend: http://127.0.0.1:8001/docs

**Check terminal windows:**
- Look for "Express Frontend" window - should show startup message
- Look for "FastAPI Backend" window - should show Uvicorn running

### 7. Webpack Build Warnings

**Problem:** `asset size limit` warnings

**Note:** These are just warnings, not errors. The app will work fine.

**To reduce bundle size (optional):**
- Use code splitting (advanced)
- Remove unused dependencies
- These warnings don't affect functionality

### 8. Test User Login Issues

**Default Test Credentials:**

**Admin:**
- ID: `A001`
- Password: `admin123`

**Voters:**
- ID: `V001` or `V002`
- Password: `voter123`

**If login fails:**
1. Run MySQL setup script:
   ```cmd
   cd Database_API
   python insert_test_users.py
   ```
2. Check MySQL is running
3. Verify database connection in FastAPI logs

### 9. Environment Variables Not Loaded

**Problem:** Services can't find configuration

**Solution:**
1. Check if `.env` file exists in project root
2. Copy from template:
   ```cmd
   copy .env.example .env
   ```
3. Update with your MySQL password if needed

## Quick Diagnostic Commands

```cmd
# Check all service ports
netstat -ano | findstr ":8081 :8001 :7545 :3306 :27017"

# Test Ganache connection
test-ganache.bat

# Manual startup (step by step)
# 1. Start Ganache
start ganache --port 7545 --networkId 5777

# 2. Start MongoDB
start mongod --dbpath Database_API/mongodb_data

# 3. Start FastAPI
cd Database_API && python main.py

# 4. Start Express
node index.js
```

## Getting Help

1. **Check terminal windows** - Each service runs in its own window with detailed logs
2. **Check browser console** (F12) - For frontend errors
3. **Review logs** - Each service window shows real-time logs
4. **Re-run start-ethervox.bat** - Often fixes timing issues

## Manual Step-by-Step Startup

If automated script fails, start services manually:

1. **Start Ganache (wait for "Listening" message):**
   ```cmd
   ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100
   ```

2. **Start MongoDB:**
   ```cmd
   mongod --dbpath Database_API/mongodb_data
   ```

3. **Deploy Smart Contracts:**
   ```cmd
   truffle migrate --reset --network development
   ```

4. **Build Frontend:**
   ```cmd
   npm run build
   ```

5. **Start FastAPI:**
   ```cmd
   cd Database_API
   python main.py
   ```

6. **Start Express:**
   ```cmd
   node index.js
   ```

7. **Open browser:** http://localhost:8081/
