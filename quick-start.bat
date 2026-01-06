@echo off
REM ========================================
REM EtherVox Quick Start (All Services)
REM ========================================

echo.
echo Starting EtherVox System...
echo.

REM Kill existing processes
taskkill /F /IM mongod.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

timeout /t 2 /nobreak >nul

REM Start MongoDB 8.2
echo [1/3] Starting MongoDB...
start "MongoDB" /MIN "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath Database_API/mongodb_data
timeout /t 8 /nobreak >nul

REM Start FastAPI
echo [2/3] Starting FastAPI backend...
start "FastAPI" /MIN cmd /c "cd Database_API && python main.py"
timeout /t 8 /nobreak >nul

REM Start Express
echo [3/3] Starting Express frontend...
start "Express" /MIN cmd /c "node index.js"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ✅ EtherVox System Ready!
echo ========================================
echo.
echo Services:
echo  - MongoDB:  localhost:27017
echo  - FastAPI:  http://127.0.0.1:8001
echo  - Express:  http://localhost:8081
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:8081
echo.
echo Press any key to exit (services will keep running)...
pause >nul
