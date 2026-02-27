# Retail Fusion

AI-powered inventory management MVP built with React (Vite) + Flask.

## Features

- Live Transaction Feed + Anomaly Detection
  - Simulates incoming sales orders in real-time.
  - Flags bulk purchases (`>50` units) with a Z-score anomaly check.
  - Shows anomaly alerts with red badges.
- ML Demand Forecast Chart
  - Uses `scikit-learn` linear regression on mock historical sales.
  - Forecasts next 7 days.
  - Visualized in `Recharts` with gradient area styling.
- Smart Reorder Recommendations
  - Uses current stock + forecast + recent anomaly signal.
  - Suggests reorder quantity per product.
  - Status indicators: `critical`, `low`, `healthy`.
- Weather Demand Influence (Open-Meteo)
  - Pulls current local weather (New York default) with no API key.
  - Displays weather impact signal on dashboard.

## Project Structure

```text
SCM_tool/
  backend/
    app.py
    requirements.txt
  frontend/
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
    index.html
    src/
      main.jsx
      App.jsx
      index.css
```

## Run Backend (Flask)

```powershell
cd C:\Users\benju\Desktop\SCM_tool\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`.

## Run Frontend (Vite)

```powershell
cd C:\Users\benju\Desktop\SCM_tool\frontend
cmd /c npm install
cmd /c npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to Flask.

## Demo Note

The dashboard title is set to **Retail Fusion** in both frontend and backend responses.
