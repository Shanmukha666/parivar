@echo off
title Parivar Path - SIH 2026 Startup
echo ===============================================================================
echo                PARIVAR PATH - STARTING LOCAL ENVIRONMENT
echo ===============================================================================
echo.

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "Parivar Path - Backend (FastAPI :8000)" cmd /k "cd /d "%~dp0services\api" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Next.js Frontend on http://localhost:3000 ...
start "Parivar Path - Frontend (Next.js :3000)" cmd /k "cd /d "%~dp0apps\web" && npm run dev"

echo.
echo ===============================================================================
echo Both servers have been launched in separate terminal windows!
echo - Frontend:  http://localhost:3000
echo - Backend:   http://127.0.0.1:8000
echo - API Docs:  http://127.0.0.1:8000/docs
echo ===============================================================================
echo Keep the launched terminal windows open while testing or presenting.
timeout /t 5
