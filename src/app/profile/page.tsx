"use client";

import { useAuth } from "@/lib/AuthContext";
import LoginButtons from "@/components/auth/LoginButtons";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        style={{
          maxWidth: "28rem",
          margin: "0 auto",
          padding: "3rem 1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "2rem",
          }}
        >
          Profile
        </h1>

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Loading...
          </p>
        ) : user?.email ? (
          <div>
            {/* Signed in state */}
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-text-secondary)",
                  marginBottom: "0.375rem",
                  fontFamily: "var(--font-ui)",
                }}
              >
                Email
              </label>
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {user.email}
              </p>
            </div>

            <button
              onClick={logout}
              style={{
                marginTop: "1.5rem",
                padding: "0.5rem 1.25rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              className="hover:text-[var(--color-text)] hover:border-[var(--color-text-secondary)]"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div>
            {/* Signed out state */}
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                marginBottom: "1.5rem",
                fontFamily: "var(--font-ui)",
                lineHeight: 1.6,
              }}
            >
              Sign in to save your reading progress across devices.
            </p>
            <LoginButtons />
          </div>
        )}
      </div>
    </div>
  );
}
