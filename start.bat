@echo off
title Fully Bubbled
cd /d "%~dp0"

echo ========================================
echo   Fully Bubbled - Jiggly Bubbler Like No Other
echo ========================================
echo.

echo [1/2] Installing dependencies...
call npm install --silent 2>nul

echo [2/2] Starting servers...
echo.

:: Start the game server in a new window
start "Fully Bubbled Server" cmd /c "node server.js"

:: Start the Vite dev server in a new window
start "Fully Bubbled Game" cmd /c "npx vite --host"

echo.
echo Both servers started!
echo - Game: http://localhost:3000
echo - Server: ws://localhost:7777
echo.
echo Close this window or press any key to stop all servers...
pause >nul

echo Stopping servers...
taskkill /f /fi "windowtitle eq Fully Bubbled Server" 2>nul
taskkill /f /fi "windowtitle eq Fully Bubbled Game" 2>nul
echo Done.
