"use client";
import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Toaster, toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SkeletonTable } from "@/components/SkeletonLoader";

function AdminContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const changeRole = async (id, role) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch { toast.error("Failed to update role"); }
  };

  const deleteUser = async (id, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("User deleted");
      fetchUsers();
    } catch { toast.error("Failed to delete user"); }
  };

  const generateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await fetch("/api/admin/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setInviteCode(data.code);
      toast.success("Invite code generated");
    } catch { toast.error("Failed to generate invite"); }
    finally { setGeneratingInvite(false); }
  };

  return (
    <div className="settings-page" style={{ maxWidth: 900 }}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#141420", color: "#e8e8ef", border: "1px solid #1a1a2a" } }} />
      <h1 className="settings-title">Admin Panel</h1>

      {/* Invite Code */}
      <div className="settings-section">
        <h2>Invite Codes</h2>
        <div className="settings-card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-primary" style={{ borderColor: "#06b6d444", color: "#06b6d4", background: "#06b6d410", padding: "8px 20px" }}
              onClick={generateInvite} disabled={generatingInvite}>
              {generatingInvite ? "Generating..." : "Generate Invite Code"}
            </button>
            {inviteCode && (
              <code style={{ fontFamily: "var(--mono)", fontSize: 15, color: "#06b6d4", letterSpacing: 3, padding: "6px 14px", background: "#06b6d410", borderRadius: 6, border: "1px solid #06b6d430" }}>
                {inviteCode}
              </code>
            )}
          </div>
          <div className="settings-info" style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
            Each code is single-use. Share securely — do not send via email in plaintext.
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="settings-section">
        <h2>Users ({users.length})</h2>
        {loading ? <SkeletonTable rows={4} cols={5} /> : (
          <div className="data-grid-scroll" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={e => changeRole(u._id, e.target.value)}
                        disabled={u._id === session?.user?.id}
                        className="history-select"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-sm-history btn-delete"
                        onClick={() => deleteUser(u._id, u.email)}
                        disabled={u._id === session?.user?.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <ErrorBoundary>
          <div className="app-root">
            <Navbar />
            <AdminContent />
          </div>
        </ErrorBoundary>
      </AuthGuard>
    </SessionProvider>
  );
}
