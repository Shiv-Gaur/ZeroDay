"use client";
import { useState } from "react";

export default function SiteList({ sites, color, custom, onSelectSite, onToggleCustom, onCustomUrl, picked, isDark }) {
  const [filter, setFilter] = useState("");

  const filtered = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.tag.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-head" style={{ color }}>
        TARGETS
      </div>
      <input
        className="site-filter"
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ borderColor: color + "20", color: color }}
      />
      <div className="site-list">
        {filtered.map((s, i) => (
          <button
            key={i}
            className={`site-row ${!custom && picked?.url === s.url ? "active" : ""}`}
            onClick={() => onSelectSite(s)}
            style={{ "--ac": color }}
          >
            <span
              className="site-tag"
              style={{ background: color + "18", color }}
            >
              {s.tag}
            </span>
            <span className="site-name">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="custom-toggle-area">
        <button
          className={`custom-toggle ${custom ? "on" : ""}`}
          onClick={onToggleCustom}
          style={{
            borderColor: custom ? color + "55" : "#222",
            color: custom ? color : "#555",
          }}
        >
          {custom ? "× CUSTOM URL" : "+ CUSTOM URL"}
        </button>
        {custom && (
          <input
            className="custom-input"
            onChange={(e) => onCustomUrl(e.target.value)}
            placeholder={isDark ? "http://xxxx.onion" : "https://..."}
            style={{ borderColor: color + "30", color }}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
