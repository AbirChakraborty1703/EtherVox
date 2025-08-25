@echo off
echo Starting EtherVox Development Environment...
echo.

echo Step 1: Starting Database API (Python FastAPI)...
echo Make sure you have Python and the requirements installed
echo.
cd Database_API
start "Database API" cmd /k "python main.py"
cd ..

echo.
echo Step 2: Starting Node.js Express Server...
echo.
start "Express Server" cmd /k "npm start"

echo.
echo Step 3: Opening browser...
timeout /t 3 /nobreak > nul
start http://localhost:8080

echo.
echo ======================================
echo EtherVox Development Environment Ready!
echo ======================================
echo Database API: http://127.0.0.1:8000
echo Express Server: http://localhost:8080
echo.
echo Press any key to close this window...
pause > nul
