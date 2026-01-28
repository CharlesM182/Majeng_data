@echo off
TITLE Majeng System Launcher

echo ==================================================
echo      STARTING MAJENG LIFE SYSTEM
echo ==================================================

:: 1. Start the Backend Server
echo.
echo [1/2] Launching Backend Server...
cd server
:: Opens a new window named "Majeng Backend" and runs the server
start "Majeng Backend API" cmd /k "node server.js"
cd ..

:: 2. Wait 3 seconds to ensure the server is ready
timeout /t 3 /nobreak >nul

:: 3. Start the Frontend App
echo.
echo [2/2] Launching Frontend Application...
cd client
:: Starts the Electron Development mode
start "Majeng Client" cmd /k "npm run electron:dev"
cd ..

echo.
echo ==================================================
echo      SYSTEM IS RUNNING
echo ==================================================
echo.
echo NOTE: Do not close the 'Majeng Backend API' window, 
echo or the database connection will stop.
echo.
pause