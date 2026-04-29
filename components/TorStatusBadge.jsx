"use client";
import { useState, useEffect } from "react";

export default function TorStatusBadge() {
  const [status, setStatus] = useState(null); // null=loading, {connected,latency}

  const check = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setStatus(data.tor || { connected: false, latency: null });
    } catch {
      setStatus({ connected: false, latency: null });
    }
  };

  useEffect(() => {
    check();
    // Poll every 60s — do NOT poll more often, Tor bandwidth is precious
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const { connected, latency } = status;
  const slow = connected && latency > 5000;

  const dot = connected ? (slow ? "#f59e0b" : "#22c55e") : "#ef4444";
  const label = connected ? (slow ? "TOR SLOW" : "TOR OK") : "TOR OFF";

  return (
    <div
      className="tor-badge"
      title={latency ? `Tor latency: ${latency}ms` : "Tor not connected"}
    >
      <span className="tor-dot" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
      <span className="tor-label" style={{ color: dot }}>
        {label}
      </span>
    </div>
  );
}
