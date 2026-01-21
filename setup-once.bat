@echo off
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo.
echo  ============================================
echo   Stock App - One-time setup
echo  ============================================
echo.

node -v >nul 2>&1 || (
  echo  [ERROR] Node.js is not installed or not in PATH.
  echo  Install from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

echo  [1/4] Installing dependencies...
call npm install
if errorlevel 1 (echo  [ERROR] npm install failed. & pause & exit /b 1)

echo.
echo  [2/4] Building the app...
call npm run build
if errorlevel 1 (echo  [ERROR] npm run build failed. & pause & exit /b 1)

echo.
echo  [3/4] Enabling start at Windows sign-in...

set "STARTUP_BAT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\stock-app-start.bat"

(
  echo @echo off
  echo call "%PROJECT_DIR%\start-app.bat"
) > "%STARTUP_BAT%"

echo.
echo  [4/4] Starting the app...
start "Stock App" "%PROJECT_DIR%\start-app.bat"

echo.
echo  ============================================
echo   Done.
echo  ============================================
echo.
echo  The app is at:  http://localhost:5173
echo.
echo  It will start automatically every time you
echo  sign in to Windows. No need to run anything.
echo.
echo  To stop auto-start: run  remove-startup.bat
echo.
pause
