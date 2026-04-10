"use client";
import { useState } from "react";

export default function ResultsTable({ data, color }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (!data?.length) return null;

  const keys = Object.keys(data[0]);
  let rows = [...data];
  if (sortKey) {
    rows.sort((a, b) => {
      const c = String(a[sortKey] ?? "").localeCompare(
        String(b[sortKey] ?? ""),
        undefined,
        { numeric: true }
      );
      return sortAsc ? c : -c;
    });
  }

  return (
    <div className="data-grid-wrap">
      <div className="data-count" style={{ color: color + "88" }}>
        {data.length} records
      </div>
      <div className="data-grid-scroll">
        <table className="data-grid">
          <thead>
            <tr>
              {keys.map((k) => (
                <th
                  key={k}
                  onClick={() => {
                    sortKey === k ? setSortAsc(!sortAsc) : (setSortKey(k), setSortAsc(true));
                  }}
                  style={{ color: sortKey === k ? color : color + "99" }}
                >
                  {k}
                  {sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "even" : "odd"}>
                {keys.map((k) => (
                  <td key={k} title={String(row[k] ?? "")}>
                    {String(row[k] ?? "").slice(0, 120)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
