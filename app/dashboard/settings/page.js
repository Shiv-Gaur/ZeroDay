"use client";
import { SessionProvider, useSession } from "next-auth/react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

function SettingsContent() {
  const { data: session } = useSession();

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>

      <div className="settings-section">
        <h2>Profile</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Name</span>
            <span className="settings-value">{session?.user?.name || "—"}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{session?.user?.email || "—"}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Role</span>
            <span className="settings-value settings-role" data-role={session?.user?.role}>
              {session?.user?.role?.toUpperCase() || "USER"}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Dark Web Access</h2>
        <div className="settings-card">
          {session?.user?.role === "admin" ? (
            <div className="settings-info settings-info-success">
              ✓ You have admin privileges. Dark web scraping is enabled.
            </div>
          ) : (
            <div className="settings-info settings-info-warn">
              ⚠ Dark web scraping requires admin role. To enable, set your role to 'admin' in MongoDB.
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Version</span>
            <span className="settings-value">0.1.0</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Platform</span>
            <span className="settings-value">WEBSCOPE Multi-Layer Intelligence</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Supported Layers</span>
            <span className="settings-value">Surface Web, Deep Web, Dark Web (Tor)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <div className="app-root">
          <Navbar />
          <SettingsContent />
        </div>
      </AuthGuard>
    </SessionProvider>
  );
}
