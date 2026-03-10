"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function SignInWithGoogle() {
  const handleClick = () => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--color-border)",
        backgroundColor: "white",
        color: "#2C2A28",
        fontSize: "14px",
        fontFamily: "var(--font-ui)",
        cursor: "pointer",
      }}
    >
      <GoogleIcon />
      Sign in with Google
    </button>
  );
}

function SignInWithEmail() {
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const returnTo = window.location.pathname + window.location.search;

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, returnTo }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Check your email for a sign-in link!");
        setEmail("");
      } else {
        setError(data.error || "Failed to send sign-in link");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--color-border)",
          backgroundColor: "transparent",
          color: "var(--color-text)",
          fontSize: "14px",
          fontFamily: "var(--font-ui)",
          cursor: "pointer",
        }}
      >
        Sign in with Email
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
          style={{
            padding: "7px 12px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            fontSize: "14px",
            fontFamily: "var(--font-ui)",
            width: "200px",
          }}
        />
        <button
          type="submit"
          disabled={loading || !email}
          style={{
            padding: "7px 14px",
            borderRadius: "var(--radius)",
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "white",
            fontSize: "14px",
            fontFamily: "var(--font-ui)",
            cursor: loading || !email ? "default" : "pointer",
            opacity: loading || !email ? 0.5 : 1,
          }}
        >
          {loading ? "..." : "Send"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowInput(false);
            setEmail("");
            setError(null);
            setMessage(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            padding: "4px 8px",
            fontSize: "16px",
          }}
        >
          x
        </button>
      </div>
      {message && (
        <div style={{ color: "var(--color-accent)", fontSize: "13px" }}>{message}</div>
      )}
      {error && (
        <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>
      )}
    </form>
  );
}

export default function LoginButtons() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;

  if (user?.email) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {user.email}
        </span>
        <button
          onClick={logout}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            fontSize: "13px",
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <SignInWithGoogle />
      <SignInWithEmail />
    </div>
  );
}
