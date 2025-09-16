@echo off
title Server Manager v1.0.0
color 0A
mode con:cols=80 lines=25
cls
echo    ╔══════════════════════════════════════════════════════════════╗
echo    ║                 SERVER MANAGER v1.0.0                    ║
echo    ║          Development Server Management Tool            ║
echo    ║                  by Next Mavens                        ║
echo    ╚══════════════════════════════════════════════════════════════╝
echo.
echo    Starting Server Manager...
echo    Please wait while the application loads...
echo.
echo    System Requirements Check:
echo    ═════════════════════════════════════════════════════════════════════════════
echo.
echo    Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo    ❌ Node.js is not installed!
    echo.
    echo    Please install Node.js from https://nodejs.org/
    echo.
    echo    Press any key to exit...
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo    ✅ Node.js is installed ^(version: !NODE_VERSION!^)
echo.

echo    Checking application files...
if not exist "src\main.js" (
    echo    ❌ Application files are missing!
    pause >nul
    exit /b 1
)
echo    ✅ Application files found
echo.

echo    ═════════════════════════════════════════════════════════════════════════════
echo.
echo    🚀 Launching Server Manager Application...
echo    The application will start and minimize to system tray.
echo.
echo    Press Ctrl+C in this window to stop Server Manager.
echo.
echo    ═════════════════════════════════════════════════════════════════════════════
echo.
timeout /t 2 /nobreak >nul
npx electron src/main.js
echo.
echo    Server Manager has stopped.
echo    Press any key to exit...
pause >nul