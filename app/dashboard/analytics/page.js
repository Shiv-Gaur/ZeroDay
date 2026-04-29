"use client";
import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SkeletonStat, SkeletonChart } from "@/components/SkeletonLoader";

const LAYER_COLORS = { surface: "#06b6d4", deep: "#f59e0b", dark: "#ef4444" };
const EXT_COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899"];

function StatCard({ label, value, unit = "" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value !== undefined ? value : "—"}{unit}</div>
    </div>
  );
}

function AnalyticsContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="analytics-page">
        <h1 className="analytics-title">Analytics</h1>
        <div className="stat-row">{[0,1,2,3].map(i => <SkeletonStat key={i} />)}</div>
        <div className="charts-grid">{[0,1].map(i => <SkeletonChart key={i} />)}</div>
      </div>
    );
  }

  if (!data) return <div className="analytics-page"><div className="analytics-empty">No data yet. Start scraping!</div></div>;

  const layerChartData = data.layerBreakdown.map(l => ({
    name: l._id?.toUpperCase(), count: l.count, success: l.success, failed: l.failed,
  }));

  const extChartData = data.extractionUsage.map(e => ({ name: e._id, count: e.count }));

  return (
    <div className="analytics-page">
      <h1 className="analytics-title">Analytics</h1>

      {/* Stat Cards */}
      <div className="stat-row">
        <StatCard label="Total Scrapes" value={data.totalScrapes} />
        <StatCard label="Success Rate" value={data.successRate} unit="%" />
        <StatCard label="Avg Duration" value={data.avgDuration} unit="ms" />
        <StatCard label="Data Points" value={data.totalDataPoints.toLocaleString()} />
      </div>

      <div className="charts-grid">
        {/* Daily Activity Area Chart */}
        <div className="chart-card">
          <div className="chart-title">Daily Activity (30 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyActivity}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#5a5a75" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5a5a75" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0f0f18", border: "1px solid #1a1a2a", borderRadius: 6 }} />
              <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Layer Distribution Pie */}
        <div className="chart-card">
          <div className="chart-title">Layer Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={layerChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                {layerChartData.map((entry, i) => (
                  <Cell key={i} fill={LAYER_COLORS[entry.name?.toLowerCase()] || "#8b5cf6"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f0f18", border: "1px solid #1a1a2a", borderRadius: 6 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Extraction Type Bar Chart */}
        <div className="chart-card">
          <div className="chart-title">Extraction Type Usage</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={extChartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5a5a75" }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#9d9db5" }} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#0f0f18", border: "1px solid #1a1a2a", borderRadius: 6 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {extChartData.map((_, i) => <Cell key={i} fill={EXT_COLORS[i % EXT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Domains */}
        <div className="chart-card">
          <div className="chart-title">Top Domains</div>
          <div className="domain-list">
            {data.topDomains.length === 0 && <div className="domain-empty">No data</div>}
            {data.topDomains.map((d, i) => {
              const max = data.topDomains[0]?.count || 1;
              return (
                <div key={i} className="domain-row">
                  <span className="domain-name">{d.domain || "unknown"}</span>
                  <div className="domain-bar-wrap">
                    <div className="domain-bar" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                  <span className="domain-count">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Scrapes */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="chart-title">Recent Scrapes</div>
        <div className="recent-table-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                <th>URL</th><th>Layer</th><th>Type</th><th>Status</th><th>Items</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentScrapes.map((r, i) => (
                <tr key={i}>
                  <td title={r.url}>{r.url?.slice(0, 50)}…</td>
                  <td><span className="history-layer" style={{ color: LAYER_COLORS[r.layer], background: (LAYER_COLORS[r.layer] || "#333") + "18" }}>{r.layer?.toUpperCase()}</span></td>
                  <td>{r.extractionType}</td>
                  <td><span className="history-status" data-status={r.status}>{r.status}</span></td>
                  <td>{r.resultCount}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <ErrorBoundary>
          <div className="app-root">
            <Navbar />
            <AnalyticsContent />
          </div>
        </ErrorBoundary>
      </AuthGuard>
    </SessionProvider>
  );
}
