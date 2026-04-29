"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const requireInvite = process.env.NEXT_PUBLIC_REQUIRE_INVITE_CODE === "true";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, inviteCode: form.inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      router.push("/login");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">WEBSCOPE</div>
        <div className="auth-subtitle">CREATE ACCOUNT</div>
        <form onSubmit={handleSubmit} className="auth-form">
          <h1 className="auth-title">Register</h1>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label htmlFor="register-name">Name</label>
            <input id="register-name" type="text" value={form.name} onChange={set("name")} placeholder="Your name" required autoFocus />
          </div>
          <div className="auth-field">
            <label htmlFor="register-email">Email</label>
            <input id="register-email" type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" required />
          </div>
          <div className="auth-field">
            <label htmlFor="register-password">Password</label>
            <input id="register-password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
          </div>
          <div className="auth-field">
            <label htmlFor="register-confirm">Confirm Password</label>
            <input id="register-confirm" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" required />
          </div>
          <div className="auth-field">
            <label htmlFor="register-invite">
              Invite Code {!requireInvite && <span className="auth-optional">(optional)</span>}
            </label>
            <input id="register-invite" type="text" value={form.inviteCode} onChange={set("inviteCode")} placeholder="XXXXXXXXXXXX" required={requireInvite} style={{ fontFamily: "var(--mono)", letterSpacing: "2px" }} />
          </div>
          <button id="register-submit" type="submit" className="auth-submit" disabled={loading}>
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
          <div className="auth-link">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
