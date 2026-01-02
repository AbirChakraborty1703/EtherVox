@echo off
REM Manual Smart Contract Deployment
REM Use this if start-ethervox.bat failed to deploy contracts

echo.
echo ========================================
echo   EtherVox Smart Contract Deployment
echo ========================================
echo.

echo [1/3] Checking if Ganache is running...
netstat -ano | findstr :7545 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ganache is not running on port 7545
    echo.
    echo Please start Ganache first:
    echo   1. Open a new terminal window
    echo   2. Run: ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100
    echo   3. Wait for "Listening on 127.0.0.1:7545" message
    echo   4. Then run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Ganache is running!
echo.

echo [2/3] Compiling smart contracts...
call truffle compile
if errorlevel 1 (
    echo [ERROR] Compilation failed!
    pause
    exit /b 1
)

echo [OK] Contracts compiled successfully!
echo.

echo [3/3] Deploying to Ganache...
call truffle migrate --reset --network development
if errorlevel 1 (
    echo [ERROR] Deployment failed!
    echo.
    echo Troubleshooting:
    echo   1. Make sure Ganache is fully started
    echo   2. Check truffle-config.js network settings
    echo   3. Try restarting Ganache
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Deployment Successful!
echo ========================================
echo.
echo Smart contracts are now deployed to Ganache.
echo You can now use the voting application.
echo.
pause
