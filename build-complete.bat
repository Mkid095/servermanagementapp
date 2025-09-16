@echo off
title Server Manager Complete Builder
color 0A
mode con:cols=80 lines=25
cls

echo    ╔══════════════════════════════════════════════════════════════╗
echo    ║          SERVER MANAGER COMPLETE BUILDER v1.0.0             ║
echo    ╚══════════════════════════════════════════════════════════════╝
echo    ═════════════════════════════════════════════════════════════════════════════
echo.
echo    Building Complete Server Manager Package...
echo    ═════════════════════════════════════════════════════════════════════════════
echo.

REM Clean previous builds
if exist "Server-Manager-Complete" rmdir /s /q "Server-Manager-Complete"
if exist "dist" rmdir /s /q "dist"

REM Create directories
mkdir "Server-Manager-Complete"
mkdir "Server-Manager-Complete\node_modules"

echo Step 1: Copying application files...
xcopy "src" "Server-Manager-Complete\src\" /E /I /H /Y /Q >nul 2>&1
copy "package.json" "Server-Manager-Complete\" >nul 2>&1
copy "package-lock.json" "Server-Manager-Complete\" >nul 2>&1

echo Step 2: Copying Node.js dependencies...
xcopy "node_modules" "Server-Manager-Complete\node_modules\" /E /I /H /Y /Q >nul 2>&1

echo Step 3: Creating professional launcher...
(
    echo @echo off
    echo title Server Manager v1.0.0
    echo color 0A
    echo mode con:cols=80 lines=25
    echo cls
    echo echo    ╔══════════════════════════════════════════════════════════════╗
    echo echo    ║                 SERVER MANAGER v1.0.0                    ║
    echo echo    ║          Development Server Management Tool            ║
    echo echo    ║                  by Next Mavens                        ║
    echo echo    ╚══════════════════════════════════════════════════════════════╝
    echo echo.
    echo echo    Starting Server Manager...
    echo echo    Please wait while the application loads...
    echo echo.
    echo echo    System Requirements Check:
    echo echo    ═════════════════════════════════════════════════════════════════════════════
    echo echo.
    echo echo    Checking Node.js installation...
    echo node --version ^>nul 2^>^&1
    echo if errorlevel 1 ^
    echo     echo    ❌ Node.js is not installed!
    echo     echo.
    echo     echo    Please install Node.js from https://nodejs.org/
    echo     echo.
    echo     echo    Press any key to exit...
    echo     pause ^>nul
    echo     exit /b 1
    echo ^
    echo for /f "tokens=*" %%%%i in ^('node --version'^) do set NODE_VERSION=%%%%i
    echo echo    ✅ Node.js is installed ^(version: !NODE_VERSION!^)
    echo echo.
    echo echo    Checking application files...
    echo if not exist "src\main.js" ^
    echo     echo    ❌ Application files are missing!
    echo     pause ^>nul
    echo     exit /b 1
    echo echo    ✅ Application files found
    echo echo.
    echo echo    ═════════════════════════════════════════════════════════════════════════════
    echo echo.
    echo echo    🚀 Launching Server Manager Application...
    echo echo    The application will start and minimize to system tray.
    echo echo.
    echo echo    Press Ctrl+C in this window to stop Server Manager.
    echo echo.
    echo echo    ═════════════════════════════════════════════════════════════════════════════
    echo echo.
    echo timeout /t 2 /nobreak ^>nul
    echo node src/main.js
    echo echo.
    echo echo    Server Manager has stopped.
    echo echo    Press any key to exit...
    echo pause ^>nul
) > "Server-Manager-Complete\Server-Manager.bat"

echo Step 4: Creating installation guide...
echo # Server Manager v1.0.0 - Complete Installation Package > "Server-Manager-Complete\README.md"
echo ================================================================ >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo ## 🎯 READY TO INSTALL PACKAGE >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo This complete package includes: >> "Server-Manager-Complete\README.md"
echo - ✅ Full application source code >> "Server-Manager-Complete\README.md"
echo - ✅ All Node.js dependencies ^(~200MB+^) >> "Server-Manager-Complete\README.md"
echo - ✅ Professional launcher with error handling >> "Server-Manager-Complete\README.md"
echo - ✅ System tray integration and server detection >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo ## 📦 Installation Instructions >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo 1. **Copy the entire "Server-Manager-Complete" folder** >> "Server-Manager-Complete\README.md"
echo 2. **Paste it into:** `C:\Program Files\Server Manager\` >> "Server-Manager-Complete\README.md"
echo 3. **Run:** `Server-Manager.bat` >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo ## 🚀 Features Included >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo - 🔍 Automatic detection of development servers >> "Server-Manager-Complete\README.md"
echo - 🌐 Real port detection and localhost URL display >> "Server-Manager-Complete\README.md"
echo - 🛡️ System process filtering for safety >> "Server-Manager-Complete\README.md"
echo - 📊 Server categorization and organization >> "Server-Manager-Complete\README.md"
echo - 🔄 Server restart and management capabilities >> "Server-Manager-Complete\README.md"
echo - 📋 Error logging and monitoring >> "Server-Manager-Complete\README.md"
echo - 🖱️ System tray integration with confirmation >> "Server-Manager-Complete\README.md"
echo - ⚡ Quick server management actions >> "Server-Manager-Complete\README.md"
echo - 📝 Copy server logs to clipboard >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo ## 💾 Package Size >> "Server-Manager-Complete\README.md"
echo This package is large ^(200MB+^) because it includes: >> "Server-Manager-Complete\README.md"
echo - Complete Electron framework >> "Server-Manager-Complete\README.md"
echo - All Node.js modules and dependencies >> "Server-Manager-Complete\README.md"
echo - Complete application source code >> "Server-Manager-Complete\README.md"
echo - No internet connection required for installation >> "Server-Manager-Complete\README.md"
echo. >> "Server-Manager-Complete\README.md"
echo ---
echo **Created by Next Mavens** >> "Server-Manager-Complete\README.md"
echo **Professional Server Management Tool** >> "Server-Manager-Complete\README.md"

echo Step 5: Calculating package size...
for /f %%A in ('dir /s /b "Server-Manager-Complete" ^| find /c /v ""') do set file_count=%%A
for /f "tokens=3" %%A in ('dir "Server-Manager-Complete" /s ^| findstr "bytes"') do set size_info=%%A

echo Step 6: Finalizing package...
echo.
echo    ═════════════════════════════════════════════════════════════════════════════
echo.
echo    🎉 COMPLETE PACKAGE CREATED SUCCESSFULLY!
echo.
echo    Package Statistics:
echo    ═════════════════════════════════════════════════════════════════════════════
echo    • Files: %file_count%
echo    • Size: %size_info%
echo    • Location: Server-Manager-Complete\
echo.
echo    Installation:
echo    ═════════════════════════════════════════════════════════════════════════════
echo    1. Copy entire "Server-Manager-Complete" folder
echo    2. Paste into: C:\Program Files\Server Manager\
echo    3. Run Server-Manager.bat
echo.
echo    ═════════════════════════════════════════════════════════════════════════════
echo.
echo    🚀 READY FOR DISTRIBUTION!
echo.
pause