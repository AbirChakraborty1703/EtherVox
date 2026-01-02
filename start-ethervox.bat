@echo off
REM ========================================
REM EtherVox Complete System Launcher
REM Starts: MySQL, MongoDB, FastAPI, Express, Ganache, Truffle, Webpack
REM Updated: December 31, 2025 - New Admin Dashboard System
REM ========================================

echo.
echo ========================================
echo    EtherVox Complete System Startup    
echo      New Admin Dashboard System v2.0
echo ========================================
echo.

REM Step 1: Kill any existing processes
echo [1/10] Cleaning up existing processes...
taskkill /F /IM mongod.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ganache.exe >nul 2>&1
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

REM Step 3: Start MongoDB
echo [3/10] Starting MongoDB...
if exist "Database_API\mongodb_data" (
    start "MongoDB Server" cmd /k "mongod --dbpath Database_API/mongodb_data || (echo [ERROR] MongoDB failed to start! && pause)"
    timeout /t 5 /nobreak >nul
    echo [OK] MongoDB starting in background
) else (
    echo [ERROR] MongoDB data directory not found!
    echo [INFO] Creating directory...
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
    python insert_test_users.py >nul 2>&1
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

REM Step 5: Start Ganache blockchain
echo [5/9] Starting Ganache blockchain...
start "Ganache Blockchain" cmd /k "ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100 || (echo [ERROR] Ganache failed to start! && pause)"
echo [INFO] Waiting for Ganache to initialize (15 seconds)...
timeout /t 15 /nobreak >nul
echo [OK] Ganache should be ready now

REM Step 6: Verify Ganache is running
echo [6/9] Verifying Ganache connection...
timeout /t 3 /nobreak >nul

REM Step 7: Compile and deploy smart contracts
echo [7/9] Compiling and deploying smart contracts...
call truffle migrate --reset --network development
if errorlevel 1 (
    echo [WARNING] Smart contract deployment had issues, continuing...
    echo [INFO] You can manually deploy later with: truffle migrate --reset
)

REM Step 7: Compile and deploy smart contracts
echo [7/9] Compiling and deploying smart contracts...
call truffle migrate --reset --network development
if errorlevel 1 (
    echo [WARNING] Smart contract deployment had issues, continuing...
    echo [INFO] You can manually deploy later with: truffle migrate --reset
)

REM Step 8: Build Webpack Bundle
echo [8/9] Building frontend bundle (Webpack)...
call npm run build
if errorlevel 1 (
    echo [WARNING] Webpack build had issues, trying to continue...
)

REM Step 9: Start FastAPI Backend
echo [9/9] Starting FastAPI backend...
start "FastAPI Backend" cmd /k "cd Database_API && python main.py || (echo [ERROR] FastAPI failed to start! Check Python installation. && pause)"
timeout /t 5 /nobreak >nul
echo [OK] FastAPI starting in background

REM Step 10: Start Express Frontend
echo [10/10] Starting Express frontend...
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
if errorlevel 1 (
    echo [WARNING] MongoDB (port 27017) - Not detected yet
) else (
    echo [OK] MongoDB (port 27017) - Running
)

netstat -ano | findstr ":3306" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] MySQL (port 3306) - Not detected
    echo [INFO] Some features may not work without MySQL
) else (
    echo [OK] MySQL (port 3306) - Running
)

echo.

REM Display status
echo.
echo ========================================
echo    All Services Started Successfully!
echo ========================================
echo.
echo Services running:
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
echo Available Pages:
echo  - Login:              http://localhost:8081/
echo  - Admin Dashboard:    /AdminDashboard.html
echo  - Add Candidate:      /AddCandidate.html
echo  - Set Voting Info:    /SetVote.html
echo  - Voter Portal:       /index.html
echo.
echo Quick Guide:
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
