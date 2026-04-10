"use client";

export default function ExportButtons({ resultId, color, onExport }) {
  const handleExport = async (format) => {
    if (!resultId) {
      // Fallback: client-side export if no resultId yet
      if (onExport) onExport(format);
      return;
    }

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, format }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webscope_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      // Fallback to client-side
      if (onExport) onExport(format);
    }
  };

  return (
    <>
      <button
        id="export-json-btn"
        className="btn-export"
        onClick={() => handleExport("json")}
        style={{ borderColor: "#222", color: "#666" }}
      >
        JSON
      </button>
      <button
        id="export-csv-btn"
        className="btn-export"
        onClick={() => handleExport("csv")}
        style={{ borderColor: "#222", color: "#666" }}
      >
        CSV
      </button>
    </>
  );
}
