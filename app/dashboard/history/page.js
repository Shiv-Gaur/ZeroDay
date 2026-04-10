"use client";
import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

function HistoryContent() {
  const { data: session } = useSession();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [layerFilter, setLayerFilter] = useState("");

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (layerFilter) params.set("layer", layerFilter);

      const res = await fetch(`/api/results?${params}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [page, layerFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this result?")) return;
    try {
      const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
      if (res.ok) fetchResults();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleExport = async (id, format) => {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: id, format }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webscope_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const layerColor = { surface: "#06b6d4", deep: "#f59e0b", dark: "#ef4444" };

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Scrape History</h1>
        <div className="history-filters">
          <select
            value={layerFilter}
            onChange={(e) => { setLayerFilter(e.target.value); setPage(1); }}
            className="history-select"
          >
            <option value="">All Layers</option>
            <option value="surface">Surface Web</option>
            <option value="deep">Deep Web</option>
            <option value="dark">Dark Web</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="history-loading">Loading...</div>
      ) : results.length === 0 ? (
        <div className="history-empty">No scrape results found.</div>
      ) : (
        <>
          <div className="history-grid">
            {results.map((r) => (
              <div key={r._id} className="history-card" style={{ borderColor: (layerColor[r.layer] || "#333") + "30" }}>
                <div className="history-card-top">
                  <span className="history-layer" style={{ color: layerColor[r.layer], background: (layerColor[r.layer] || "#333") + "15" }}>
                    {r.layer?.toUpperCase()}
                  </span>
                  <span className="history-type">{r.extractionType}</span>
                  <span className="history-status" data-status={r.status}>{r.status}</span>
                </div>
                <div className="history-url" title={r.url}>{r.url}</div>
                <div className="history-meta">
                  <span>{r.resultCount} items</span>
                  <span>{r.duration}ms</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="history-actions">
                  <button onClick={() => handleExport(r._id, "json")} className="btn-sm-history">JSON</button>
                  <button onClick={() => handleExport(r._id, "csv")} className="btn-sm-history">CSV</button>
                  <button onClick={() => handleDelete(r._id)} className="btn-sm-history btn-delete">DELETE</button>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="history-pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-sm-history">← PREV</button>
              <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="btn-sm-history">NEXT →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <div className="app-root">
          <Navbar />
          <HistoryContent />
        </div>
      </AuthGuard>
    </SessionProvider>
  );
}
