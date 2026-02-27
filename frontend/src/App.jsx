import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const statusStyles = {
  critical: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
  low: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  healthy: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
};

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const payload = await response.json();
      setData(payload);
      setError("");
    } catch {
      setError("Backend unavailable. Start Flask on port 5000.");
    }
  };

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 3500);
    return () => clearInterval(timer);
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      ...data.forecast.historical.map((x) => ({ ...x, type: "Historical" })),
      ...data.forecast.forecast.map((x) => ({ ...x, type: "Forecast" }))
    ];
  }, [data]);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex max-w-[1500px] gap-5 px-4 py-5 lg:px-8">
        <aside className="hidden w-64 shrink-0 rounded-2xl bg-panel/90 p-5 shadow-glow lg:block">
          <h1 className="text-2xl font-semibold text-accent">Retail Fusion</h1>
          <p className="mt-2 text-sm text-slate-400">AI Inventory Command Center</p>
          <nav className="mt-8 space-y-3 text-sm">
            {["Overview", "Transactions", "Forecast", "Reorders"].map((item) => (
              <div key={item} className="rounded-lg bg-panelSoft px-3 py-2 text-slate-300">
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-5">
          <header className="rounded-2xl bg-panel/90 p-5 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{data?.project_title || "Retail Fusion"}</h2>
                <p className="text-sm text-slate-400">
                  Live feed + anomaly detection + demand intelligence
                </p>
              </div>
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm">
                Weather impact: {data?.metrics?.weather_impact_pct ?? 0}%
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300">{error}</div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Stock", value: data?.metrics?.total_stock ?? "--" },
              { label: "Active Anomalies", value: data?.metrics?.active_anomalies ?? "--" },
              { label: "7-Day Forecast", value: data?.metrics?.forecast_7_day ?? "--" },
              { label: "Temperature", value: `${data?.weather?.temperature_c ?? "--"} C` }
            ].map((card) => (
              <article key={card.label} className="card-enter rounded-xl bg-panel/90 p-4 shadow-glow">
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-accent">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <article className="rounded-2xl bg-panel/90 p-4 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">ML Demand Forecast (7 Days)</h3>
                <span className="text-xs text-slate-400">Linear Regression + Weather Influence</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8 }}
                    />
                    <Area type="monotone" dataKey="demand" stroke="#2dd4bf" fill="url(#demandFill)" />
                    <Line type="monotone" dataKey="demand" stroke="#0ea5e9" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl bg-panel/90 p-4">
              <h3 className="text-lg font-semibold">Live Transaction Feed</h3>
              <p className="mb-3 text-xs text-slate-400">Auto-refresh every 3.5 seconds</p>
              <div className="max-h-72 space-y-2 overflow-auto">
                {data?.transactions?.map((tx) => (
                  <div key={tx.id} className="rounded-lg bg-panelSoft p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{tx.product}</span>
                      <span className="text-sm font-semibold">{tx.quantity} units</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{tx.timestamp}</span>
                      {tx.is_anomaly && (
                        <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold uppercase text-white">
                          anomaly z:{tx.z_score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <article className="rounded-2xl bg-panel/90 p-4">
              <h3 className="text-lg font-semibold">Smart Reorder Recommendations</h3>
              <div className="mt-3 space-y-2">
                {data?.recommendations?.map((rec) => (
                  <div key={rec.product} className="rounded-lg bg-panelSoft p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{rec.product}</p>
                      <span className={`rounded-full px-2 py-1 text-xs uppercase ${statusStyles[rec.status]}`}>
                        {rec.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
                      <span>Stock: {rec.current_stock}</span>
                      <span>Reorder: {rec.reorder_qty}</span>
                      <span>Anomalies: {rec.anomaly_hits}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl bg-panel/90 p-4">
              <h3 className="text-lg font-semibold">Anomaly Alerts</h3>
              <div className="mt-3 space-y-2">
                {data?.anomalies?.length ? (
                  data.anomalies.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-rose-500/10 p-3">
                      <div>
                        <p className="font-medium text-rose-300">{item.product}</p>
                        <p className="text-xs text-rose-200/80">Bulk order: {item.quantity} units</p>
                      </div>
                      <span className="rounded-full bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                        z:{item.z_score}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No anomalies detected yet.</p>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
