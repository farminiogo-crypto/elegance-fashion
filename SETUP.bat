@echo off
chcp 65001 >nul
title ELEGANCE Fashion - Auto Setup

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║     🛍️ ELEGANCE Fashion E-Commerce - Auto Setup         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found!

:: Check Python
echo [2/6] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install from: https://python.org/
    pause
    exit /b 1
)
echo ✅ Python found!

:: Install Frontend Dependencies
echo [3/6] Installing Frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed!

:: Setup Backend
echo [4/6] Setting up Backend...
cd backend

:: Create venv if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv and install requirements
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo ✅ Backend dependencies installed!

:: Check .env file
echo [5/6] Checking configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ⚠️ Created .env from template - Please edit backend\.env with your settings!
    ) else (
        echo ❌ No .env file found! Please create backend\.env file
    )
) else (
    echo ✅ Configuration file found!
)

cd ..

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                  ✅ SETUP COMPLETE!                       ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║  To START the project, double-click: START.bat           ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
