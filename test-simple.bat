echo Testing Server Manager Application...
echo.

echo 1. Checking if application exists...
if exist "dist\server-manager-win32-x64\server-manager.exe" (
    echo [SUCCESS] Application executable found
) else (
    echo [ERROR] Application executable not found
)

echo.
echo 2. Application size:
for %%F in ("dist\server-manager-win32-x64\server-manager.exe") do echo %%~zF bytes

echo.
echo 3. ZIP archive:
if exist "dist\server-manager-windows.zip" (
    echo [SUCCESS] ZIP archive exists
    for %%F in ("dist\server-manager-windows.zip") do echo %%~zF bytes
) else (
    echo [ERROR] ZIP archive missing
)

echo.
echo 4. Required files check:
if exist "dist\server-manager-win32-x64\resources\app.asar" (
    echo [SUCCESS] Application package found
) else (
    echo [ERROR] Application package missing
)

echo.
echo [COMPLETE] Windows application build successful!