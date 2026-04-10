"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav id="navbar" className="topbar">
      <div className="topbar-left">
        <Link href="/dashboard" className="topbar-brand">
          WEBSCOPE
        </Link>
        <span className="topbar-sep">│</span>
        <span className="topbar-info">MULTI-LAYER EXTRACTION</span>
      </div>
      <div className="topbar-nav-links">
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/dashboard/history" className="nav-link">
          History
        </Link>
        <Link href="/dashboard/settings" className="nav-link">
          Settings
        </Link>
      </div>
      <div className="topbar-right">
        {session?.user && (
          <>
            <span className="topbar-user">
              {session.user.name || session.user.email}
            </span>
            {session.user.role === "admin" && (
              <span className="topbar-role">ADMIN</span>
            )}
            <button
              id="logout-btn"
              className="btn-sm logout-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              LOGOUT
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
