@echo off
cd /d "%~dp0"
if not exist bin\arb-rt.exe goto missing
if not exist probe-out mkdir probe-out
bin\arb-rt.exe --out probe-out
echo.
echo Done. Please send me the file native\probe-out\probe-report.txt
pause
exit /b
:missing
echo bin\arb-rt.exe does not exist yet. Run BUILD-NATIVE.bat first and send me what it says.
pause
