@echo off
set "STARTUP_BAT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\stock-app-start.bat"

if exist "%STARTUP_BAT%" (
  del "%STARTUP_BAT%"
  echo  Removed Stock App from Windows startup.
) else (
  echo  Stock App was not in startup.
)

echo.
pause
