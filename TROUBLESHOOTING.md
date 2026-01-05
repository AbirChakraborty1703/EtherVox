# EtherVox Troubleshooting Guide

## Recent Fixes Applied

### ✅ Fixed Issues (January 5, 2026)

1. **Background Image 404 Error** - FIXED

   - Changed path from `/assets/eth5.jpeg` to `/eth5.jpeg`
   - Image now loads correctly from public folder
   - Changed `background-size` from `100% 100%` to `cover` for better display

2. **MetaMask RPC Error: Internal JSON-RPC error** - FIXED

   - Added timestamp validation (start date must be in future)
   - Added check for already initialized voting dates
   - Added gas estimation before transaction
   - Improved error messages for better user feedback

3. **Candidates Not Loading** - FIXED
   - Fixed CORS configuration in Database API
   - Added better error handling in frontend
   - Shows helpful messages when backend is not running

---

## Issue: Candidates Not Loading from Backend

### Quick Fix Checklist

1. **Ensure Database API is Running**

   ```bash
   cd Database_API
   python main.py
   ```

   - Should see: `[OK] MongoDB Database connection established successfully!`
   - Should see: `API Documentation: http://127.0.0.1:8001/docs`

2. **Verify MongoDB is Running**

   ```bash
   mongod --dbpath Database_API/mongodb_data
   ```

   - Keep this terminal open while using the app

3. **Test Backend API Directly**
   Open browser and visit: `http://127.0.0.1:8001/candidates`

   Expected response:

   ```json
   {
     "message": "Candidates retrieved successfully",
     "count": 0,
     "candidates": []
   }
   ```

4. **Add Test Candidates**

   - Login as admin at: `http://localhost:8081/`
   - Navigate to Admin Dashboard
   - Click "Add Candidate"
   - Fill in candidate details and submit

5. **Check Browser Console**
   - Press F12 in browser
   - Go to Console tab
   - Look for messages like:
     - `Fetching candidates from MongoDB API...`
     - `MongoDB API response:` (should show candidate data)

### Common Issues

#### MetaMask RPC Error: Internal JSON-RPC error (SetVote Page)

**Symptoms:** Error when trying to set voting dates: "Internal JSON-RPC error"

**Common Causes:**

1. Start date is in the past or current time (must be in future)
2. Voting dates already initialized (can only set once)
3. End date is not at least 30 minutes after start date
4. Not connected to correct Ganache network

**Solutions:**

1. **Ensure Start Date is in Future:**

   - Select a date/time that is at least a few minutes in the future
   - The contract requires: `startDate > current blockchain time`

2. **Check if Dates Already Set:**

   - If voting dates were already set, use the "Update Dates" function instead
   - Or deploy a new contract with `truffle migrate --reset`

3. **Verify Date Range:**

   - End date must be at least 30 minutes after start date
   - Both dates must be in the future

4. **Check Ganache Connection:**
   - Make sure you're connected to the correct network (port 7545)
   - Account in MetaMask should match Ganache accounts

**Quick Test:**

```javascript
// In browser console:
const currentTime = Math.floor(Date.now() / 1000);
console.log("Current timestamp:", currentTime);
console.log("Your start timestamp should be greater than:", currentTime);
```

#### Backend API Not Running

**Symptoms:** Browser console shows "Failed to fetch" or "Cannot connect to backend API"

**Solution:**

```bash
cd Database_API
python main.py
```

#### CORS Error

**Symptoms:** Browser shows "blocked by CORS policy"

**Solution:** Already fixed in `Database_API/main.py` - CORS now allows all origins

#### No Candidates in Database

**Symptoms:** API returns `"count": 0, "candidates": []`

**Solution:** Add candidates through Admin Dashboard:

1. Go to `http://localhost:8081/AdminDashboard.html`
2. Click "Add Candidate"
3. Fill in details and submit

#### MongoDB Not Running

**Symptoms:** Backend shows `[ERROR] MongoDB connection error`

**Solution:**

```bash
mongod --dbpath Database_API/mongodb_data
```

### Service Startup Order

1. **Start MongoDB** (Terminal 1)

   ```bash
   mongod --dbpath Database_API/mongodb_data
   ```

2. **Start Database API** (Terminal 2)

   ```bash
   cd Database_API
   python main.py
   ```

3. **Start Ganache** (GUI Application)

   - Open Ganache GUI
   - Create/Open workspace on port 7545

4. **Deploy Smart Contracts** (Terminal 3)

   ```bash
   truffle migrate --reset
   ```

5. **Build Frontend** (Terminal 3)

   ```bash
   npm run build
   ```

6. **Start Express Server** (Terminal 3)
   ```bash
   node index.js
   ```

### Verify Everything is Working

1. **Check API Health:**

   ```bash
   curl http://127.0.0.1:8001
   ```

   Should return: `{"message":"EtherVox Database API is running!","status":"healthy"}`

2. **Check Candidates Endpoint:**

   ```bash
   curl http://127.0.0.1:8001/candidates
   ```

3. **Open Voting Page:**
   Navigate to: `http://localhost:8081/index.html`

   - If candidates exist: They will be displayed
   - If no candidates: "No candidates registered yet" message
   - If backend is down: "Cannot connect to backend API" error

### Files Modified to Fix the Issue

1. **Database_API/main.py**

   - Added wildcard CORS origin `"*"` to allow all connections
   - Added localhost origins without ports

2. **src/js/app.js**
   - Improved error handling for MongoDB API connection
   - Added detailed error messages for connection failures
   - Added helpful instructions in error states

### Getting Help

If candidates still don't load:

1. Check browser console (F12) for errors
2. Check Database API terminal for errors
3. Verify all services are running
4. Test API endpoint directly in browser: `http://127.0.0.1:8001/candidates`
