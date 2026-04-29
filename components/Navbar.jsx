"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";

const TorStatusBadge = dynamic(() => import("./TorStatusBadge"), { ssr: false });

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = session?.user?.role === "admin";

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/analytics", label: "Analytics" },
    { href: "/dashboard/schedule", label: "Schedule" },
    { href: "/dashboard/history", label: "History" },
    { href: "/dashboard/settings", label: "Settings" },
    ...(isAdmin ? [{ href: "/dashboard/admin", label: "Admin" }] : []),
  ];

  return (
    <nav id="navbar" className="topbar">
      <div className="topbar-left">
        <Link href="/dashboard" className="topbar-brand">
          WEBSCOPE
        </Link>
        <TorStatusBadge />
      </div>

      {/* Desktop nav */}
      <div className="topbar-nav-links">
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href} className="nav-link">
            {l.label}
          </Link>
        ))}
      </div>

      <div className="topbar-right">
        {session?.user && (
          <>
            <span className="topbar-user">{session.user.name || session.user.email}</span>
            {isAdmin && <span className="topbar-role">ADMIN</span>}
            <button
              id="logout-btn"
              className="logout-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Logout
            </button>
          </>
        )}
        {/* Hamburger (mobile) */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-drawer" onClick={() => setMenuOpen(false)}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="mobile-nav-link">
              {l.label}
            </Link>
          ))}
          {session?.user && (
            <button
              className="mobile-nav-link mobile-logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
