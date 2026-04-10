"use client";

export default function TerminalLog({ logs, color }) {
  if (!logs.length) return null;
  return (
    <div
      className="log-stream"
      style={{ borderColor: color + "18" }}
      ref={(el) => {
        if (el) el.scrollTop = el.scrollHeight;
      }}
    >
      {logs.map((l, i) => (
        <div key={i} style={{ opacity: 0.3 + (i / logs.length) * 0.7 }}>
          <span className="log-prefix" style={{ color: color + "55" }}>
            {">"}
          </span>
          {l}
        </div>
      ))}
    </div>
  );
}
