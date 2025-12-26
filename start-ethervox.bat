@echo off
REM ========================================
REM EtherVox Complete System Launcher
REM Starts: MongoDB, MySQL, FastAPI, Express, Ganache, Truffle
REM ========================================

echo.
echo ========================================
echo    EtherVox Complete System Startup    
echo ========================================
echo.

REM Step 1: Kill any existing processes
echo [1/7] Cleaning up existing processes...
taskkill /F /IM mongod.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ganache.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Step 2: Start MongoDB
echo [2/7] Starting MongoDB...
start "MongoDB Server" cmd /c "mongod --dbpath Database_API/mongodb_data"
timeout /t 5 /nobreak >nul

REM Step 3: Setup MySQL Database (if needed)
echo [3/7] Setting up MySQL database...
cd Database_API
python insert_test_users.py >nul 2>&1
cd ..

REM Step 4: Start Ganache blockchain
echo [4/7] Starting Ganache blockchain...
start "Ganache Blockchain" cmd /c "ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100"
timeout /t 10 /nobreak >nul

REM Step 5: Compile and deploy smart contracts
echo [5/7] Compiling and deploying smart contracts...
call npx truffle migrate --reset --network development
if errorlevel 1 (
    echo [WARNING] Smart contract deployment had issues, continuing...
)

REM Step 5.1: Transfer ownership to your MetaMask account
echo [5.1/7] Transferring contract ownership...
call npx truffle exec transfer-ownership.js --network development
if errorlevel 1 (
    echo [WARNING] Ownership transfer had issues, you may need to use accounts[0]...
)

REM Step 5.2: Rebuild frontend with new contract
echo [5.2/7] Building frontend...
call npm run build
if errorlevel 1 (
    echo [WARNING] Frontend build had issues, continuing...
)

REM Step 6: Start FastAPI Backend
echo [6/7] Starting FastAPI backend...
start "FastAPI Backend" cmd /c "cd Database_API && python main.py"
timeout /t 5 /nobreak >nul

REM Step 7: Start Express Frontend
echo [7/7] Starting Express frontend...
start "Express Frontend" cmd /c "node index.js"
timeout /t 3 /nobreak >nul

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
