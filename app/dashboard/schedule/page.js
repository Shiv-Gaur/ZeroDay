"use client";
import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Toaster, toast } from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SkeletonCard } from "@/components/SkeletonLoader";

const SCHEDULE_OPTIONS = [
  { value: "hourly", label: "Every Hour" },
  { value: "every6h", label: "Every 6 Hours" },
  { value: "every12h", label: "Every 12 Hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const LAYER_COLORS = { surface: "#06b6d4", deep: "#f59e0b", dark: "#ef4444" };

function ScheduleContent() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    url: "", layer: "surface", extractionType: "links", schedule: "daily", notifyEmail: "",
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } catch { toast.error("Failed to load schedules"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.url) { toast.error("URL is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create"); return; }
      toast.success("Schedule created");
      setShowForm(false);
      fetchSchedules();
    } catch { toast.error("Failed to create schedule"); }
    finally { setCreating(false); }
  };

  const toggleSchedule = async (id, current) => {
    try {
      const res = await fetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) { fetchSchedules(); toast.success(current ? "Paused" : "Activated"); }
    } catch { toast.error("Update failed"); }
  };

  const deleteSchedule = async (id) => {
    if (!confirm("Delete this schedule?")) return;
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      if (res.ok) { fetchSchedules(); toast.success("Schedule deleted"); }
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="schedule-page">
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#141420", color: "#e8e8ef", border: "1px solid #1a1a2a" } }} />
      <div className="schedule-header">
        <h1 className="schedule-title">Scheduled Scrapes</h1>
        {schedules.length < 5 && (
          <button className="btn-primary" style={{ borderColor: "#06b6d444", color: "#06b6d4", background: "#06b6d410" }}
            onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Schedule"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="schedule-form">
          <div className="schedule-form-grid">
            <div className="auth-field">
              <label>Target URL</label>
              <input type="url" value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://..." required />
            </div>
            <div className="auth-field">
              <label>Layer</label>
              <select value={form.layer} onChange={e => setForm(f => ({...f, layer: e.target.value}))} className="history-select" style={{width:"100%",padding:"12px 16px"}}>
                <option value="surface">Surface Web</option>
                <option value="deep">Deep Web</option>
                <option value="dark">Dark Web</option>
              </select>
            </div>
            <div className="auth-field">
              <label>Extraction Type</label>
              <select value={form.extractionType} onChange={e => setForm(f => ({...f, extractionType: e.target.value}))} className="history-select" style={{width:"100%",padding:"12px 16px"}}>
                {["links","images","headings","paragraphs","tables","meta"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="auth-field">
              <label>Frequency</label>
              <select value={form.schedule} onChange={e => setForm(f => ({...f, schedule: e.target.value}))} className="history-select" style={{width:"100%",padding:"12px 16px"}}>
                {SCHEDULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="auth-field" style={{gridColumn:"1/-1"}}>
              <label>Notify Email <span className="auth-optional">(optional)</span></label>
              <input type="email" value={form.notifyEmail} onChange={e => setForm(f => ({...f, notifyEmail: e.target.value}))} placeholder="you@example.com" />
            </div>
          </div>
          <button type="submit" className="auth-submit" style={{width:"auto",padding:"10px 28px"}} disabled={creating}>
            {creating ? "Creating..." : "Create Schedule"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="history-grid">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
      ) : schedules.length === 0 ? (
        <div className="history-empty">No schedules yet. Create one to auto-scrape on a schedule.</div>
      ) : (
        <div className="history-grid">
          {schedules.map(s => (
            <div key={s._id} className="history-card" style={{ borderColor: (LAYER_COLORS[s.layer] || "#333") + "30" }}>
              <div className="history-card-top">
                <span className="history-layer" style={{ color: LAYER_COLORS[s.layer], background: (LAYER_COLORS[s.layer] || "#333") + "15" }}>
                  {s.layer?.toUpperCase()}
                </span>
                <span className="history-type">{s.extractionType}</span>
                <span className={`history-status`} style={{ color: s.isActive ? "#4ade80" : "#5a5a75" }}>
                  {s.isActive ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
              <div className="history-url" title={s.url}>{s.url}</div>
              <div className="history-meta">
                <span>{SCHEDULE_OPTIONS.find(o => o.value === s.schedule)?.label}</span>
                {s.lastRun && <span>Last: {new Date(s.lastRun).toLocaleString()}</span>}
                <span>Next: {new Date(s.nextRun).toLocaleString()}</span>
              </div>
              <div className="history-actions">
                <button className="btn-sm-history" onClick={() => toggleSchedule(s._id, s.isActive)}>
                  {s.isActive ? "Pause" : "Resume"}
                </button>
                <button className="btn-sm-history btn-delete" onClick={() => deleteSchedule(s._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {schedules.length >= 5 && <div className="history-empty" style={{marginTop:12}}>Maximum 5 schedules reached.</div>}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <ErrorBoundary>
          <div className="app-root">
            <Navbar />
            <ScheduleContent />
          </div>
        </ErrorBoundary>
      </AuthGuard>
    </SessionProvider>
  );
}
