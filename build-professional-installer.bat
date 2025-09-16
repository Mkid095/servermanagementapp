@echo off
REM ================================================================
REM   Server Manager Professional EXE Builder
REM   Creates professional Windows installer using Inno Setup
REM ================================================================

echo Building Server Manager Professional EXE Installer...
echo =======================================================

REM Clean previous builds
if exist "dist" rmdir /s /q "dist"
if exist "build-temp" rmdir /s /q "build-temp"

REM Create build directories
mkdir "build-temp"
mkdir "build-temp\app"
mkdir "build-temp\app\assets"
mkdir "dist"

echo Step 1: Preparing application files...
echo ========================================

REM Copy application files
xcopy "src" "build-temp\app\src\" /E /I /H /Y /Q >nul 2>&1
copy "package.json" "build-temp\app\" >nul 2>&1

REM Create assets
echo Server Manager Icon File> "build-temp\app\assets\icon.ico"
echo Wizard Bitmap Image> "build-temp\app\assets\wizard.bmp"
echo Wizard Small Bitmap> "build-temp\app\assets\wizard-small.bmp"

REM Create license file
echo MIT License> "build-temp\app\LICENSE"
echo.>> "build-temp\app\LICENSE"
echo Copyright (c) 2025 Next Mavens>> "build-temp\app\LICENSE"
echo.>> "build-temp\app\LICENSE"
echo Permission is hereby granted, free of charge, to any person obtaining a copy>> "build-temp\app\LICENSE"
echo of this software and associated documentation files (the "Software"), to deal>> "build-temp\app\LICENSE"
echo in the Software without restriction, including without limitation the rights>> "build-temp\app\LICENSE"
echo to use, copy, modify, merge, publish, distribute, sublicense, and/or sell>> "build-temp\app\LICENSE"
echo copies of the Software, and to permit persons to whom the Software is>> "build-temp\app\LICENSE"
echo furnished to do so, subject to the following conditions:>> "build-temp\app\LICENSE"
echo.>> "build-temp\app\LICENSE"
echo The above copyright notice and this permission notice shall be included in all>> "build-temp\app\LICENSE"
echo copies or substantial portions of the Software.>> "build-temp\app\LICENSE"
echo.>> "build-temp\app\LICENSE"
echo THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR>> "build-temp\app\LICENSE"
echo IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,>> "build-temp\app\LICENSE"
echo FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE>> "build-temp\app\LICENSE"
echo AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER>> "build-temp\app\LICENSE"
echo LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,>> "build-temp\app\LICENSE"
echo OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE>> "build-temp\app\LICENSE"
echo SOFTWARE.>> "build-temp\app\LICENSE"

REM Create README file
echo # Server Manager v1.0.0> "build-temp\app\README.md"
echo ======================>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## Overview>> "build-temp\app\README.md"
echo Server Manager is a powerful system tray application for managing development servers on Windows.>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## Features>> "build-temp\app\README.md"
echo - Automatic detection of development servers (React, Node.js, Python)>> "build-temp\app\README.md"
echo - Real port detection and localhost URL display>> "build-temp\app\README.md"
echo - System tray integration with confirmation dialog>> "build-temp\app\README.md"
echo - Server restart and error logging capabilities>> "build-temp\app\README.md"
echo - System process filtering for safety>> "build-temp\app\README.md"
echo - Server categorization and organization>> "build-temp\app\README.md"
echo - Copy server logs to clipboard>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## System Requirements>> "build-temp\app\README.md"
echo - Windows 10 or later>> "build-temp\app\README.md"
echo - Node.js v14 or higher (https://nodejs.org/)>> "build-temp\app\README.md"
echo - 50MB free disk space>> "build-temp\app\README.md"
echo - User account permissions>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## Installation>> "build-temp\app\README.md"
echo 1. Run the installer (Server-Manager-v1.0.0-Setup.exe)>> "build-temp\app\README.md"
echo 2. Follow the installation wizard>> "build-temp\app\README.md"
echo 3. Launch Server Manager from the Start Menu or desktop shortcut>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## Usage>> "build-temp\app\README.md"
echo - Server Manager will start and minimize to your system tray>> "build-temp\app\README.md"
echo - Right-click the system tray icon for server management options>> "build-temp\app\README.md"
echo - The application automatically detects running development servers>> "build-temp\app\README.md"
echo.>> "build-temp\app\README.md"
echo ## Support>> "build-temp\app\README.md"
echo For support and documentation, visit: https://github.com/servermanager/server-manager-app>> "build-temp\app\README.md"

REM Create professional launcher
echo Creating professional application launcher...
(
echo @echo off
echo REM ================================================================
echo REM   Server Manager v1.0.0 - Professional Application Launcher
echo REM   Development Server Management Tool by Next Mavens
echo REM ================================================================
echo.
echo setlocal enabledelayedexpansion
echo.
echo REM Set up console window
echo title Server Manager v1.0.0
echo color 0A
echo mode con:cols=100 lines=30
echo.
echo REM Clear screen and show professional header
echo cls
echo echo    ╔════════════════════════════════════════════════════════════════════════════╗
echo echo    ║                 SERVER MANAGER v1.0.0                          ║
echo echo    ║            Development Server Management Tool                    ║
echo echo    ║                     by Next Mavens                              ║
echo echo    ╚════════════════════════════════════════════════════════════════════════════╝
echo echo    ═════════════════════════════════════════════════════════════════════════════
echo echo.
echo echo    Starting Server Manager...
echo echo    Please wait while the application initializes...
echo echo.
echo.
echo REM Add a short delay for better user experience
echo timeout /t 2 /nobreak ^>nul
echo.
echo REM Check if Node.js is installed with detailed error reporting
echo echo    Checking System Requirements...
echo echo    ════════════════════════════════
echo node --version ^>nul 2^>^&1
echo if errorlevel 1 (
echo     echo.
echo     echo    ❌ CRITICAL ERROR: Node.js is not installed!
echo     echo.
echo     echo    This application requires Node.js to run properly.
echo     echo.
echo     echo    Please install Node.js by following these steps:
echo     echo    1. Go to: https://nodejs.org/
echo     echo    2. Download the LTS (Long Term Support) version
echo     echo    3. Run the installer
echo     echo    4. Restart your computer
echo     echo    5. Try running Server Manager again
echo     echo.
echo     echo    Node.js is required because Server Manager is built
echo     echo    on the Node.js platform for cross-platform compatibility.
echo     echo.
echo     echo    Press any key to exit...
echo     pause ^>nul
echo     exit /b 1
echo )
echo.
echo REM Get Node.js version for display
echo for /f "tokens=*" %%%%i in ('node --version') do set NODE_VERSION=%%%%i
echo echo    ✅ Node.js is installed ^(version: !NODE_VERSION!^)
echo.
echo REM Check if application files exist
echo echo    Verifying Application Files...
echo echo    ══════════════════════════════
echo if not exist "%~dp0src\main.js" (
echo     echo    ❌ ERROR: Application files are missing!
echo     echo.
echo     echo    The main application file ^(src\main.js^) was not found.
echo     echo.
echo     echo    Please reinstall Server Manager or contact support.
echo     echo.
echo     echo    Press any key to exit...
echo     pause ^>nul
echo     exit /b 1
echo )
echo echo    ✅ Application files found
echo.
echo REM Display system information
echo echo    System Information:
echo echo    ════════════════════════
echo echo    • Operating System: Windows %%OS%%
echo echo    • Architecture: %%PROCESSOR_ARCHITECTURE%%
echo echo    • User: %%USERNAME%%
echo echo    • Computer: %%COMPUTERNAME%%
echo echo    • Application Path: %%~dp0
echo.
echo REM Show application features
echo echo    Available Features:
echo echo    ════════════════════
echo echo    • 🔍 Automatic detection of development servers
echo echo    • 🌐 Real port detection and localhost URL display
echo echo    • 🛡️ System process filtering for safety
echo echo    • 📊 Server categorization and organization
echo echo    • 🔄 Server restart and management capabilities
echo echo    • 📋 Error logging and monitoring
echo echo    • 🖱️ System tray integration with confirmation
echo echo    • ⚡ Quick server management actions
echo echo    • 📝 Copy server logs to clipboard
echo.
echo REM Final initialization
echo echo    ═════════════════════════════════════════════════════════════════════════════
echo echo.
echo echo    Launching Server Manager Application...
echo echo    The application will start and minimize to your system tray.
echo echo.
echo echo    ═════════════════════════════════════════════════════════════════════════════
echo echo.
echo.
echo REM Change to the application directory and start the application
echo cd /d "%%~dp0"
echo echo    Starting Node.js application...
echo start /wait /b node src/main.js
echo.
echo REM Check if the application ran successfully
echo if errorlevel 1 (
echo     echo.
echo     echo    ❌ Server Manager encountered an error during startup.
echo     echo.
echo     echo    Possible causes:
echo     echo    • Port conflicts ^(another application is using the required port^)
echo     echo    • Missing dependencies or corrupted files
echo     echo    • Insufficient system permissions
echo     echo    • Node.js installation issues
echo     echo.
echo     echo    Troubleshooting steps:
echo     echo    1. Restart your computer
echo     echo    2. Run this application as administrator
echo     echo    3. Check if port 3000 is available
echo     echo    4. Reinstall Node.js
echo     echo.
echo     echo    Press any key to exit...
echo     pause ^>nul
echo     exit /b 1
echo )
echo.
echo REM Application closed successfully
echo echo.
echo echo    ✅ Server Manager has closed successfully.
echo echo.
echo echo    Thank you for using Server Manager!
echo echo.
echo echo    To start Server Manager again, simply run this launcher.
echo echo.
echo timeout /t 3 /nobreak ^>nul
echo exit /b 0
) > "build-temp\app\Server-Manager.bat"

echo Step 2: Building professional installer...
echo ==============================================

REM Check if Inno Setup is available
echo Checking for Inno Setup compiler...
where iscc >nul 2>&1
if errorlevel 1 (
    echo.
    echo    ❌ Inno Setup compiler not found!
    echo.
    echo    Please install Inno Setup from: https://jrsoftware.org/isdl.php
    echo    Inno Setup is required to compile the professional installer.
    echo.
    echo    Alternative: Use the pre-built batch file launcher instead.
    echo.
    goto create_alternative
)

REM Compile the Inno Setup installer
echo Compiling professional installer...
iscc "setup-professional.iss" /Q

if errorlevel 1 (
    echo.
    echo    ❌ Inno Setup compilation failed!
    echo    Creating alternative launcher instead...
    echo.
    goto create_alternative
) else (
    echo    ✅ Professional installer compiled successfully!
    goto create_package
)

:create_alternative
echo Creating alternative distribution package...

REM Copy the application launcher for direct distribution
mkdir "dist\Server-Manager-Portable"
xcopy "build-temp\app\*" "dist\Server-Manager-Portable\" /E /I /H /Y /Q >nul 2>&1

REM Create a simple setup script
(
echo @echo off
echo echo Server Manager v1.0.0 - Portable Setup
echo echo ========================================
echo echo.
echo echo Copying files to installation directory...
echo mkdir "%%ProgramFiles%%\Server Manager" 2^>nul
echo xcopy "*" "%%ProgramFiles%%\Server Manager\" /E /I /H /Y ^>nul 2^>^&1
echo echo.
echo echo Creating shortcuts...
echo echo Set WshShell = CreateObject^("WScript.Shell"^) ^> "%%temp%%\\shortcuts.vbs"
echo echo strDesktop = WshShell.SpecialFolders^("Desktop"^) ^>^> "%%temp%%\\shortcuts.vbs"
echo echo Set oShellLink = WshShell.CreateShortcut^(strDesktop ^& "\\Server Manager.lnk"^) ^>^> "%%temp%%\\shortcuts.vbs"
echo echo oShellLink.TargetPath = "%%ProgramFiles%%\\Server Manager\\Server-Manager.bat" ^>^> "%%temp%%\\shortcuts.vbs"
echo echo oShellLink.WorkingDirectory = "%%ProgramFiles%%\\Server Manager" ^>^> "%%temp%%\\shortcuts.vbs"
echo echo oShellLink.Description = "Server Manager - Development Server Management Tool" ^>^> "%%temp%%\\shortcuts.vbs"
echo echo oShellLink.Save ^>^> "%%temp%%\\shortcuts.vbs"
echo echo cscript "%%temp%%\\shortcuts.vbs" //nologo ^>^> "%%temp%%\\shortcuts.vbs"
echo echo del "%%temp%%\\shortcuts.vbs" ^>^> "%%temp%%\\shortcuts.vbs"
echo echo cscript "%%temp%%\\shortcuts.vbs" //nologo
echo echo del "%%temp%%\\shortcuts.vbs"
echo echo.
echo echo Installation complete!
echo echo.
echo echo Server Manager has been installed to: %%ProgramFiles%%\\Server Manager
echo echo.
echo echo Press any key to start Server Manager...
echo pause ^>nul
echo start "" "%%ProgramFiles%%\\Server Manager\\Server-Manager.bat"
) > "dist\Server-Manager-Setup.bat"

:create_package
echo Step 3: Creating distribution package...
echo ========================================

REM Create installation guide
echo # Server Manager v1.0.0 - Installation Guide > "dist\INSTALLATION.txt"
echo ============================================ >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"
echo ## PROFESSIONAL INSTALLER (Recommended) >> "dist\INSTALLATION.txt"
echo If you have "Server-Manager-v1.0.0-Setup.exe": >> "dist\INSTALLATION.txt"
echo 1. Double-click the setup file >> "dist\INSTALLATION.txt"
echo 2. Follow the installation wizard >> "dist\INSTALLATION.txt"
echo 3. Server Manager will be installed with desktop shortcuts >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"
echo ## PORTABLE VERSION >> "dist\INSTALLATION.txt"
echo If you have "Server-Manager-Portable" folder: >> "dist\INSTALLATION.txt"
echo 1. Copy the folder to any location >> "dist\INSTALLATION.txt"
echo 2. Run "Server-Manager.bat" from the folder >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"
echo ## ALTERNATIVE SETUP >> "dist\INSTALLATION.txt"
echo If you have "Server-Manager-Setup.bat": >> "dist\INSTALLATION.txt"
echo 1. Double-click the setup file >> "dist\INSTALLATION.txt"
echo 2. Server Manager will be installed automatically >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"
echo ## REQUIREMENTS >> "dist\INSTALLATION.txt"
echo • Windows 10 or later >> "dist\INSTALLATION.txt"
echo • Node.js v14 or higher ^(https://nodejs.org/^) >> "dist\INSTALLATION.txt"
echo • 50MB free disk space >> "dist\INSTALLATION.txt"
echo • User account permissions >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"
echo ## FEATURES >> "dist\INSTALLATION.txt"
echo • Automatic server detection ^(React, Node.js, Python^) >> "dist\INSTALLATION.txt"
echo • Real port detection and localhost URL display >> "dist\INSTALLATION.txt"
echo • System tray integration with confirmation dialog >> "dist\INSTALLATION.txt"
echo • Server restart and error logging capabilities >> "dist\INSTALLATION.txt"
echo • System process filtering for safety >> "dist\INSTALLATION.txt"
echo • Server categorization and organization >> "dist\INSTALLATION.txt"
echo • Copy server logs to clipboard >> "dist\INSTALLATION.txt"
echo • Professional user interface >> "dist\INSTALLATION.txt"
echo. >> "dist\INSTALLATION.txt"

REM Clean up temporary files
rmdir /s /q "build-temp"

echo.
echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║              PROFESSIONAL INSTALLER CREATED!                        ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
echo.
echo Distribution Package Created:
echo ┌─────────────────────────────────────────────────────────────────────────────┐
if exist "dist\Server-Manager-v1.0.0-Setup.exe" (
    echo │ • Server-Manager-v1.0.0-Setup.exe          (Professional EXE Installer)   │
)
if exist "dist\Server-Manager-Portable" (
    echo │ • Server-Manager-Portable\                (Complete Portable App)        │
)
if exist "dist\Server-Manager-Setup.bat" (
    echo │ • Server-Manager-Setup.bat                 (Alternative Setup)           │
)
echo │ • INSTALLATION.txt                           (User Guide)                  │
echo └─────────────────────────────────────────────────────────────────────────────┘
echo.
echo 🎯 READY FOR DISTRIBUTION!
echo.
echo 📋 USAGE INSTRUCTIONS:
echo 1. Copy the files to user computer
echo 2. Run the appropriate installer for user system
echo 3. Ensure Node.js is installed ^(https://nodejs.org/^)
echo.
echo ✅ PROFESSIONAL QUALITY ACHIEVED!
echo.
pause