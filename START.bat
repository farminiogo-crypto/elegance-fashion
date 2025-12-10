@echo off
chcp 65001 >nul
title ELEGANCE Fashion - Running...

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║        🚀 ELEGANCE Fashion E-Commerce - Starting         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Start Backend in new window
echo Starting Backend Server...
start "ELEGANCE Backend" cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend in new window
echo Starting Frontend Server...
start "ELEGANCE Frontend" cmd /k "npm run dev"

:: Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                   ✅ SERVERS RUNNING!                     ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║                                                          ║
echo ║   🌐 Website:  http://localhost:3000                     ║
echo ║   ⚙️  API:      http://localhost:8000                     ║
echo ║                                                          ║
echo ║   📧 Admin Login:                                        ║
echo ║      Email: admin@elegance.com                           ║
echo ║      Password: admin123                                  ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to STOP all servers...
pause >nul

:: Kill the servers
taskkill /FI "WINDOWTITLE eq ELEGANCE Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ELEGANCE Frontend*" /F >nul 2>&1
echo Servers stopped.
