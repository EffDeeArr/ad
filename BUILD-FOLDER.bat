@echo off
setlocal
cd /d "%~dp0"
title Building Arberia Deathmatch (folder version)
echo.
echo === Arberia Deathmatch: building the patchable FOLDER version ===
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
call npm run dist:folder
if errorlevel 1 ( echo Packaging failed. & pause & exit /b 1 )
echo.
echo Done! Your game folder is: %~dp0dist\win-unpacked
echo Zip that whole folder and send it to your friends. Play with "Arberia Deathmatch.exe" inside it.
echo For later updates, make a small patch with:  node tools\make-patch.js ^<old version source folder^>
explorer "%~dp0dist"
pause
