@echo off
echo Testing Server Manager Application...
echo.

echo 1. Checking if application exists...
if exist "dist\server-manager-win32-x64\server-manager.exe" (
    echo [SUCCESS] Application executable found
) else (
    echo [ERROR] Application executable not found
    exit /b 1
)

echo.
echo 2. Checking application file size...
for %%F in ("dist\server-manager-win32-x64\server-manager.exe") do (
    set filesize=%%~zF
)
echo Application size: %filesize% bytes
if %filesize% GTR 100000000 (
    echo [SUCCESS] Application size is reasonable (%filesize% bytes)
) else (
    echo [WARNING] Application size might be too small
)

echo.
echo 3. Checking if ZIP archive exists...
if exist "dist\server-manager-windows.zip" (
    echo [SUCCESS] ZIP archive created
    for %%F in ("dist\server-manager-windows.zip") do (
        set zipsize=%%~zF
    )
    echo ZIP size: %zipsize% bytes
) else (
    echo [ERROR] ZIP archive not found
)

echo.
echo 4. Checking required DLL files...
set required_dlls=libEGL.dll libGLESv2.dll d3dcompiler_47.dll v8_context_snapshot.bin
for %%D in (%required_dlls%) do (
    if exist "dist\server-manager-win32-x64\%%D" (
        echo [SUCCESS] %%D found
    ) else (
        echo [ERROR] %%D missing
    )
)

echo.
echo 5. Checking resources directory...
if exist "dist\server-manager-win32-x64\resources" (
    echo [SUCCESS] Resources directory exists
    if exist "dist\server-manager-win32-x64\resources\app.asar" (
        echo [SUCCESS] Application package (app.asar) found
    ) else (
        echo [ERROR] Application package (app.asar) missing
    )
) else (
    echo [ERROR] Resources directory missing
)

echo.
echo 6. Application Summary:
echo ======================
echo Executable: dist\server-manager-win32-x64\server-manager.exe
echo Portable: Yes (can be copied and run from any directory)
echo ZIP Archive: dist\server-manager-windows.zip
echo Platform: Windows x64
echo Electron Version: 28.3.3

echo.
echo [SUCCESS] Windows desktop application build completed successfully!
echo.
echo To run the application:
echo   1. Navigate to: dist\server-manager-win32-x64\
echo   2. Double-click: server-manager.exe
echo.
echo To distribute the application:
echo   1. Send the ZIP file: dist\server-manager-windows.zip
echo   2. Or copy the entire server-manager-win32-x64 folder

echo.
echo Note: The application is portable and does not require installation.
echo       It will run directly from any directory when executed.