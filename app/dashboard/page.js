"use client";
import { SessionProvider } from "next-auth/react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ScraperPanel from "@/components/ScraperPanel";

export default function DashboardPage() {
  return (
    <SessionProvider>
      <AuthGuard>
        <div className="app-root">
          <Navbar />
          <ScraperPanel />
          <div className="footer-legal">
            USE RESPONSIBLY — COMPLY WITH ALL APPLICABLE LAWS
          </div>
        </div>
      </AuthGuard>
    </SessionProvider>
  );
}
