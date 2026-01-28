@echo off
echo Starting StockFlow Application...
echo.
echo Choose your setup:
echo 1. Frontend only (uses hosted Supabase) - Recommended
echo 2. Full stack (local Supabase + Frontend)
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting frontend-only setup...
    echo This will run the app at: http://localhost:5173
    echo.
    docker compose -f docker-compose.standalone-frontend.yml up -d --build
    echo.
    echo ✅ Application started successfully!
    echo 🌐 Open your browser to: http://localhost:5173
    echo.
    echo To stop the application, run: npm run docker:standalone:stop
) else if "%choice%"=="2" (
    echo.
    echo Starting full stack setup...
    echo This will run the app at: http://localhost:5173
    echo Supabase Studio at: http://localhost:3003
    echo.
    docker compose up -d --build
    echo.
    echo ✅ Application started successfully!
    echo 🌐 App: http://localhost:5173
    echo 🛠️ Supabase Studio: http://localhost:3003
    echo.
    echo To stop the application, run: docker compose down
) else (
    echo Invalid choice. Please run the script again and choose 1 or 2.
)

pause