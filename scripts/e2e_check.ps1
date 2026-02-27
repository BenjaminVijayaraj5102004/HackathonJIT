$ErrorActionPreference = "Stop"

Write-Host "Retail Fusion E2E validation started..." -ForegroundColor Cyan

Write-Host "[1/3] Python syntax checks" -ForegroundColor Yellow
python -m py_compile api\index.py
python -m py_compile backend\app.py

Write-Host "[2/3] API endpoint smoke tests" -ForegroundColor Yellow
@'
from api.index import app

required = ["project_title", "metrics", "weather", "transactions", "anomalies", "forecast", "recommendations"]
with app.test_client() as client:
    health = client.get("/api/health")
    dashboard = client.get("/api/dashboard")

    if health.status_code != 200:
        raise SystemExit(f"/api/health failed: {health.status_code}")
    if dashboard.status_code != 200:
        raise SystemExit(f"/api/dashboard failed: {dashboard.status_code}")

    payload = dashboard.get_json() or {}
    missing = [k for k in required if k not in payload]
    if missing:
        raise SystemExit(f"Missing dashboard keys: {missing}")

    forecast_days = len(payload.get("forecast", {}).get("forecast", []))
    reco_count = len(payload.get("recommendations", []))
    if forecast_days != 7:
        raise SystemExit(f"Expected 7 forecast days, got {forecast_days}")
    if reco_count == 0:
        raise SystemExit("Expected at least 1 recommendation")

print("API smoke checks passed.")
'@ | python -

Write-Host "[3/3] Frontend production build" -ForegroundColor Yellow
cmd /c npm run build

Write-Host "Retail Fusion E2E validation passed." -ForegroundColor Green
