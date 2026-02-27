from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta
import random
from typing import Any

import numpy as np
import pandas as pd
import requests
from flask import Flask, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression


app = Flask(__name__)
CORS(app)

PROJECT_TITLE = "Retail Fusion"

PRODUCTS = [
    {"id": 1, "name": "Wireless Earbuds", "stock": 220, "reorder_point": 140},
    {"id": 2, "name": "Smart Watches", "stock": 160, "reorder_point": 110},
    {"id": 3, "name": "Gaming Mice", "stock": 300, "reorder_point": 180},
    {"id": 4, "name": "Portable SSDs", "stock": 140, "reorder_point": 100},
    {"id": 5, "name": "Bluetooth Speakers", "stock": 190, "reorder_point": 130},
]

TRANSACTION_FEED: deque[dict[str, Any]] = deque(maxlen=24)
ANOMALY_FEED: deque[dict[str, Any]] = deque(maxlen=12)
QTY_HISTORY: dict[int, deque[int]] = defaultdict(lambda: deque(maxlen=80))
HISTORICAL_DAYS = 28


def _seed_qty_history() -> None:
    for product in PRODUCTS:
        for _ in range(40):
            QTY_HISTORY[product["id"]].append(random.randint(6, 28))


def _ensure_seeded() -> None:
    if not QTY_HISTORY:
        _seed_qty_history()


def _z_score(quantity: int, history: deque[int]) -> float:
    values = np.array(history, dtype=float)
    if values.size < 5:
        return 0.0
    std = float(np.std(values))
    if std == 0:
        return 0.0
    mean = float(np.mean(values))
    return (quantity - mean) / std


def _simulate_transaction() -> dict[str, Any]:
    product = random.choice(PRODUCTS)
    quantity = random.randint(51, 95) if random.random() < 0.18 else random.randint(3, 36)

    z = _z_score(quantity, QTY_HISTORY[product["id"]])
    is_anomaly = quantity > 50 and z >= 1.0
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    product["stock"] = max(0, product["stock"] - quantity)
    QTY_HISTORY[product["id"]].append(quantity)

    tx = {
        "id": f"TX-{random.randint(10000, 99999)}",
        "product_id": product["id"],
        "product": product["name"],
        "quantity": quantity,
        "z_score": round(float(z), 2),
        "is_anomaly": is_anomaly,
        "timestamp": timestamp,
    }
    TRANSACTION_FEED.appendleft(tx)
    if is_anomaly:
        ANOMALY_FEED.appendleft(tx)
    return tx


def _weather_signal() -> dict[str, Any]:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=40.7128&longitude=-74.0060&current=temperature_2m,wind_speed_10m,precipitation"
    )
    try:
        data = requests.get(url, timeout=5).json().get("current", {})
        temp = float(data.get("temperature_2m", 22.0))
        wind = float(data.get("wind_speed_10m", 8.0))
        rain = float(data.get("precipitation", 0.0))
    except Exception:
        temp, wind, rain = 22.0, 8.0, 0.0

    influence = 1.0
    if temp > 30:
        influence += 0.10
    if temp < 8:
        influence += 0.12
    if rain > 2:
        influence += 0.08
    if wind > 25:
        influence += 0.05

    return {
        "location": "New York",
        "temperature_c": round(temp, 1),
        "wind_kph": round(wind, 1),
        "precipitation_mm": round(rain, 2),
        "influence_factor": round(influence, 2),
        "last_updated": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
    }


def _build_sales_history() -> pd.DataFrame:
    days = pd.date_range(end=datetime.utcnow().date(), periods=HISTORICAL_DAYS)
    trend = np.linspace(160, 245, HISTORICAL_DAYS)
    seasonality = 10 * np.sin(np.linspace(0, 4.2, HISTORICAL_DAYS))
    noise = np.random.normal(0, 7, HISTORICAL_DAYS)
    demand = np.clip(trend + seasonality + noise, 90, None).round(0)

    return pd.DataFrame(
        {"day": [d.strftime("%m-%d") for d in days], "idx": np.arange(HISTORICAL_DAYS), "demand": demand}
    )


def _forecast_demand(weather_factor: float) -> dict[str, list[dict[str, Any]]]:
    df = _build_sales_history()
    model = LinearRegression()
    model.fit(df[["idx"]], df["demand"])

    future_idx = np.arange(HISTORICAL_DAYS, HISTORICAL_DAYS + 7).reshape(-1, 1)
    raw_forecast = model.predict(future_idx)
    adjusted = np.clip(raw_forecast * weather_factor, 50, None).round(0)

    start = datetime.utcnow().date() + timedelta(days=1)
    forecast_dates = [(start + timedelta(days=i)).strftime("%m-%d") for i in range(7)]

    historical = [{"day": row["day"], "demand": int(row["demand"])} for _, row in df.tail(14).iterrows()]
    predicted = [{"day": d, "demand": int(v)} for d, v in zip(forecast_dates, adjusted)]
    return {"historical": historical, "forecast": predicted}


def _reorder_recommendations(forecast: list[dict[str, Any]]) -> list[dict[str, Any]]:
    next_week_total = sum(p["demand"] for p in forecast)
    avg_daily = next_week_total / 7
    anomalies_recent = list(ANOMALY_FEED)[:6]

    recs = []
    for product in PRODUCTS:
        anomaly_hits = sum(1 for item in anomalies_recent if item["product_id"] == product["id"])
        product_demand = avg_daily / len(PRODUCTS)
        target_stock = int(product_demand * 7 * 1.25)
        if anomaly_hits:
            target_stock += 35 * anomaly_hits

        reorder_qty = max(0, target_stock - product["stock"])
        coverage_days = product["stock"] / max(product_demand, 1)

        if coverage_days < 3 or product["stock"] < product["reorder_point"] * 0.65:
            status = "critical"
        elif coverage_days < 6 or product["stock"] < product["reorder_point"]:
            status = "low"
        else:
            status = "healthy"

        recs.append(
            {
                "product": product["name"],
                "current_stock": product["stock"],
                "reorder_qty": reorder_qty,
                "status": status,
                "anomaly_hits": anomaly_hits,
            }
        )

    return sorted(recs, key=lambda x: {"critical": 0, "low": 1, "healthy": 2}[x["status"]])


@app.get("/api/health")
def health() -> Any:
    return jsonify({"status": "ok", "project": PROJECT_TITLE})


@app.get("/api/dashboard")
def dashboard() -> Any:
    _ensure_seeded()
    for _ in range(random.randint(1, 3)):
        _simulate_transaction()

    weather = _weather_signal()
    forecast_data = _forecast_demand(weather["influence_factor"])
    recommendations = _reorder_recommendations(forecast_data["forecast"])

    payload = {
        "project_title": PROJECT_TITLE,
        "metrics": {
            "total_stock": int(sum(p["stock"] for p in PRODUCTS)),
            "active_anomalies": len(
                [a for a in ANOMALY_FEED if a["timestamp"].startswith(datetime.utcnow().strftime("%Y-%m-%d"))]
            ),
            "forecast_7_day": int(sum(item["demand"] for item in forecast_data["forecast"])),
            "weather_impact_pct": int((weather["influence_factor"] - 1) * 100),
        },
        "weather": weather,
        "transactions": list(TRANSACTION_FEED)[:12],
        "anomalies": list(ANOMALY_FEED)[:8],
        "forecast": forecast_data,
        "recommendations": recommendations,
    }
    return jsonify(payload)
