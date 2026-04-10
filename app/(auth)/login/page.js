"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">WEBSCOPE</div>
        <div className="auth-subtitle">MULTI-LAYER WEB INTELLIGENCE</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h1 className="auth-title">Sign In</h1>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label>Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </button>

          <button
            type="button"
            className="auth-google"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <span className="google-icon">G</span>
            Sign in with Google
          </button>

          <div className="auth-link">
            No account?{" "}
            <Link href="/register">Create one</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
