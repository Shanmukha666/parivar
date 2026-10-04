# Parivar Path - SIH 2026 Startup Script (PowerShell)
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "               PARIVAR PATH - STARTING LOCAL ENVIRONMENT" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\services\api'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Launching Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\web'; npm run dev"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "Both servers launched in independent PowerShell windows!" -ForegroundColor Yellow
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "- API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
