$ErrorActionPreference = "Stop"

Write-Host "Building frontend..." -ForegroundColor Yellow
cmd /c npm run build --prefix frontend

Write-Host "Starting full web app on http://localhost:5000 ..." -ForegroundColor Cyan
python backend\app.py
