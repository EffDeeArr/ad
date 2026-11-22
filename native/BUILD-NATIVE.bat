@echo off
setlocal
cd /d "%~dp0"
echo Building the optional native renderer. Output is also saved to build-log.txt
echo.
call :main > build-log.txt 2>&1
type build-log.txt
echo.
echo ---- finished. ----
if not defined ARB_NOPAUSE pause
exit /b

:main
where git
if errorlevel 1 goto nogit
where cmake
if errorlevel 1 goto nocmake
if not exist third_party mkdir third_party
if not exist third_party\Vulkan-Headers\include\vulkan\vulkan.h git clone --depth 1 https://github.com/KhronosGroup/Vulkan-Headers third_party\Vulkan-Headers
if not exist third_party\DLSS\include\nvsdk_ngx.h git clone --depth 1 https://github.com/NVIDIA/DLSS third_party\DLSS
if exist build rmdir /s /q build
cmake -S . -B build -A x64
if errorlevel 1 goto fail
cmake --build build --config Release
if errorlevel 1 goto fail
if not exist bin mkdir bin
copy /y build\Release\*.exe bin\
copy /y build\Release\*.dll bin\
if exist third_party\DLSS\LICENSE.txt copy /y third_party\DLSS\LICENSE.txt bin\NVIDIA-DLSS-LICENSE.txt
echo.
echo SUCCESS: native\bin\arb-rt.exe was built. Publish with PUBLISH.bat (it builds this by itself, you do not need to run this first), or to try it here: start the game, Settings, Native renderer On, restart, then DLSS. (RUN-PROBE.bat tests your card for DLSS and ray tracing.)
exit /b 0
:nogit
echo PROBLEM: Git is not installed. Get it from https://git-scm.com then run this again.
exit /b 1
:nocmake
echo PROBLEM: CMake is not installed. Get it from https://cmake.org/download then run this again.
exit /b 1
:fail
echo PROBLEM: the build failed. Send me this whole text.
exit /b 1
