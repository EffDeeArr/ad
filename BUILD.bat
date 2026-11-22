@echo off
setlocal
cd /d "%~dp0"
title Building Arberia Deathmatch
echo.
echo === Arberia Deathmatch: building ArberiaDeathmatch.exe ===
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org , then run this file again.
  pause
  exit /b 1
)
echo [1/2] Installing build tools (needs internet, takes a few minutes the first time)...
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
echo.
echo [2/2] Packaging the game into a single .exe ...
call npm run dist
if errorlevel 1 ( echo Packaging failed. & pause & exit /b 1 )
echo.
echo Done! Your game is: %~dp0dist\ArberiaDeathmatch.exe
echo You can copy that single file anywhere and double-click it.
explorer "%~dp0dist"
pause
