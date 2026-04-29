"use client";

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line sk-w-40" />
      <div className="skeleton-line sk-w-full" />
      <div className="skeleton-line sk-w-70" />
      <div className="skeleton-line sk-w-50" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-thead">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-th" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton-td" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="skeleton-stat">
      <div className="skeleton-line sk-w-40" />
      <div className="skeleton-line sk-w-60 sk-h-8" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart">
      <div className="skeleton-line sk-w-40 sk-mb" />
      <div className="skeleton-chart-bars">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton-bar" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}
