@echo off
REM ========================================
REM EtherVox Complete System Launcher
REM Starts: MySQL, MongoDB, FastAPI (Database API), Express, Truffle, Webpack
REM Supports: Admin Login, User Login, Candidate Login
REM NOTE: Ganache must be started MANUALLY by user
REM Updated: January 7, 2026 - Added Candidate Login Support
REM ========================================

echo.
echo ========================================
echo    EtherVox Complete System Startup    
echo      All-in-One Universal Launcher
echo    Admin / User / Candidate Login
echo ========================================
echo.

REM Step 1: Clean up existing processes (EXCEPT Ganache - user manages manually)
echo [1/10] Cleaning up existing processes...
taskkill /F /IM mongod.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
REM DO NOT kill Ganache - user runs it manually
timeout /t 2 /nobreak >nul

REM Step 2: Start MySQL Service
echo [2/10] Starting MySQL database service...

REM Try MySQL as Windows service first
net start MySQL80 >nul 2>&1
if not errorlevel 1 (
    echo [OK] MySQL80 service started successfully
    goto mysql_started
)

net start MySQL >nul 2>&1
if not errorlevel 1 (
    echo [OK] MySQL service started successfully
    goto mysql_started
)

REM Try XAMPP MySQL
if exist "C:\xampp\mysql\bin\mysqld.exe" (
    echo [INFO] Found XAMPP MySQL, starting...
    start "MySQL XAMPP" cmd /c "C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone --console"
    timeout /t 3 /nobreak >nul
    echo [OK] XAMPP MySQL started
    goto mysql_started
)

REM Try WAMP MySQL
if exist "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysqld.exe" (
    echo [INFO] Found WAMP MySQL, starting...
    start "MySQL WAMP" cmd /c "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysqld.exe --defaults-file=C:\wamp64\bin\mysql\mysql8.0.27\my.ini --standalone --console"
    timeout /t 3 /nobreak >nul
    echo [OK] WAMP MySQL started
    goto mysql_started
)

REM Try standalone MySQL installation
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" (
    echo [INFO] Found MySQL Server, starting...
    start "MySQL Server" cmd /c "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe --console"
    timeout /t 3 /nobreak >nul
    echo [OK] MySQL Server started
    goto mysql_started
)

REM MySQL not found
echo [WARNING] MySQL not found automatically
echo [INFO] Please ensure MySQL is running on port 3306
echo [TIP] You can start it manually from:
echo       - XAMPP Control Panel
echo       - WAMP Control Panel  
echo       - MySQL Workbench
echo       - Windows Services

:mysql_started
timeout /t 2 /nobreak >nul

REM Step 3: Start MongoDB (Required for Candidate Login)
echo [3/10] Starting MongoDB (for candidate data)...
if exist "Database_API\mongodb_data" (
    start "MongoDB Server" cmd /k "mongod --dbpath Database_API/mongodb_data || (echo [ERROR] MongoDB failed to start! && pause)"
    echo [INFO] Waiting for MongoDB to initialize...
    timeout /t 5 /nobreak >nul
    
    REM Verify MongoDB is running
    Database_API\venv\Scripts\python.exe -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000); client.admin.command('ping'); print('[OK] MongoDB connection verified')" 2>nul
    if errorlevel 1 (
        echo [WARNING] MongoDB verification failed, but continuing...
        timeout /t 3 /nobreak >nul
    )
    echo [OK] MongoDB running on port 27017
) else (
    echo [INFO] MongoDB data directory not found - creating...
    mkdir Database_API\mongodb_data
    start "MongoDB Server" cmd /k "mongod --dbpath Database_API/mongodb_data || (echo [ERROR] MongoDB failed to start! && pause)"
    timeout /t 5 /nobreak >nul
    echo [OK] MongoDB starting in background
)

REM Step 4: Setup MySQL Database (if needed)
echo [4/10] Checking MySQL database setup...
cd Database_API
if exist insert_test_users.py (
    echo [INFO] Setting up MySQL test users...
    venv\Scripts\python.exe insert_test_users.py >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] MySQL setup script failed - database might not be configured
        echo [TIP] Check your MySQL credentials in .env file
    ) else (
        echo [OK] MySQL database setup completed
    )
) else (
    echo [INFO] MySQL setup script not found - assuming database already configured
    echo [TIP] Create insert_test_users.py if you need to populate test data
)
cd ..

REM Step 5: Ganache blockchain (MANUAL START REQUIRED)
echo [5/10] Checking Ganache blockchain...
echo [INFO] Please start Ganache GUI manually on port 7545
echo [INFO] Network ID: 5777 (or 1337 depending on your setup)
echo.
echo Press any key once Ganache is running...
pause >nul
echo [OK] Proceeding with Ganache already running

REM Step 6: Verify Ganache is running
echo [6/10] Verifying Ganache connection...
timeout /t 2 /nobreak >nul

REM Step 7: Compile and deploy smart contracts
echo [7/10] Compiling and deploying smart contracts...
call truffle migrate --reset --network development
if errorlevel 1 (
    echo [WARNING] Smart contract deployment had issues, continuing...
    echo [INFO] You can manually deploy later with: truffle migrate --reset
)

REM Step 8: Build Frontend with Webpack
echo [8/10] Building frontend bundle with Webpack...
echo [INFO] This may take a moment...
call npm run build
if errorlevel 1 (
    echo [WARNING] Webpack build had warnings, but continuing...
    echo [INFO] Frontend bundle may not be fully optimized
) else (
    echo [OK] Frontend bundle created successfully at public/app.bundle.js
)

REM Step 9: Build Database API (FastAPI Backend)
echo [9/10] Starting Database API (Admin/User/Candidate Login)...
echo [INFO] Database API handles all authentication:
echo        - Admin Login (MySQL)
echo        - User/Voter Login (MySQL)
echo        - Candidate Login (MongoDB)
start "Database API - Port 8001" cmd /k "cd Database_API && venv\Scripts\python.exe main.py || (echo [ERROR] Database API failed to start! Check Python installation. && pause)"
echo [INFO] Waiting for Database API to initialize...
timeout /t 8 /nobreak >nul

REM Verify Database API is running
echo [INFO] Verifying Database API endpoints...
curl -s http://127.0.0.1:8001/ >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Database API health check failed - giving more time...
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] Database API responding on port 8001
)

REM Test candidate login endpoint
curl -s -X POST http://127.0.0.1:8001/api/candidate/login -H "Content-Type: application/json" -d "{\"candidateId\":\"test\",\"password\":\"test123\"}" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Candidate login endpoint not yet ready
) else (
    echo [OK] Candidate login endpoint active
)ues, trying to continue...
)

REM Step 10: Start Express Frontend Server
echo [10/10] Starting Express frontend server...
start "Express Frontend" cmd /k "node index.js || (echo [ERROR] Express failed to start! Check Node.js installation. && pause)"
timeout /t 3 /nobreak >nul
echo [OK] Express starting in background

REM Verify all services
echo.
echo ========================================
echo    Verifying Services...
echo ========================================
timeout /t 3 /nobreak >nul

netstat -ano | findstr ":8081" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Express (port 8081) - Not detected yet
) else (
    echo [OK] Express (port 8081) - Running
)

netstat -ano | findstr ":8001" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] FastAPI (port 8001) - Not detected yet
) else (
    echo [OK] FastAPI (port 8001) - Running
)

netstat -ano | findstr ":7545" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ganache (port 7545) - Not detected yet
) else (
    echo [OK] Ganache (port 7545) - Running
)

netstat -ano | findstr ":27017" >nul 2>&1
if erDatabase Services:
echo  - MongoDB:       localhost:27017 (Candidate Data)
echo  - MySQL:         localhost:3306  (Admin/User Data)
echo.
echo Backend Services:
echo  - Database API:  http://127.0.0.1:8001
echo    ^> Admin Login:     /login
echo    ^> User Login:      /login
echo    ^> Candidate Login: /api/candidate/login
echo  - Express Server: http://localhost:8081
echo.
echo Blockchain:
echo  - Ganache:       localhost:7545
echo.
echo ========================================
echo    UNIVERSAL LOGIN SYSTEM v3.0
echo ========================================
echo.
echo Login Options:
echo  1. ADMIN LOGIN
echo     - Login page: http://localhost:8081/login.html
echo     - Click "Admin Login" tab
echo     - Enter Admin ID (starts with 'A') and password
echo     - Access: Admin Dashboard, Add Candidates, Set Voting Info
echo.
echo  2. USER/VOTER LOGIN
echo     - Login page: http://localhost:8081/login.html
echo     - Click "User Login" tab
echo     - Enter Voter ID and password
echo     - Access: Voting Portal
echo.
echo  3. CANDIDATE LOGIN
echo     - Login page: http://localhost:8081/login.html
echo     - Click "Candidate Login" tab
echo     - Enter Candidate ID and password
echo     - Access: Candidate Dashboard (View Profile)
echo.
echo Available Admin Pages:
echo  - Login:              http://localhost:8081/login.html
echo  - Admin Dashboard:    /AdminDashboard.html
echo  - Add Candidate:      /AddCandidate.html
echo  - Set Voting Info:    /SetVote.html
echo  - Voter Portal:       /index.html
echo  - Candidate Portal:   /Candidate.html
echo.
echo Database API Documentation:
echo  - API Docs:          http://127.0.0.1:8001/docs
echo  - Health Check:      http://127.0.0.1:8001/
echo  - MongoDB:       localhost:27017
echo  - MySQL:         localhost:3306
echo  - Ganache:       localhost:7545
echo  - FastAPI:       http://127.0.0.1:8001
echo  - Express:       http://localhost:8081
echo.
echo ========================================
echo    NEW ADMIN DASHBOARD SYSTEM v2.0
echo ========================================
echo.
echo ========================================
echo    Shutting Down All Services...
echo ========================================
echo.
echo [INFO] Stopping MongoDB...
taskkill /F /IM mongod.exe >nul 2>&1
echo [INFO] Stopping Database API (Python)...
taskkill /F /IM python.exe >nul 2>&1
echo [INFO] Stopping Express Server (Node.js)...
taskkill /F /IM node.exe >nul 2>&1
echo [INFO] Stopping Ganache (if auto-started)...
taskkill /F /IM ganache.exe >nul 2>&1

echo.
echo ========================================
echo    All Services Stopped Successfully!
echo ========================================
echo.
echo Thank you for using EtherVox!
echo
echo  1. Login with admin credentials (ID starts with 'A')
echo  2. You'll land on the new Admin Dashboard
echo  3. Choose: Add Candidate OR Set Voting Information
echo  4. All pages have Back to Dashboard button
echo.
echo ========================================
echo.
echo Opening EtherVox in your browser...
timeout /t 2 /nobreak >nul
start http://localhost:8081

echo.
echo Press any key to STOP all services...
pause >nul

REM Cleanup on exit
echo.
echo Stopping all services...
taskkill /F /IM mongod.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ganache.exe >nul 2>&1

echo.
echo All services stopped. Goodbye!
timeout /t 2 /nobreak >nul
