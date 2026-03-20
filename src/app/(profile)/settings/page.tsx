"use client";

import { useAuth } from "@/lib/AuthContext";
import { useAudioSession } from "@/lib/AudioPlayerContext";
import LoginButtons from "@/components/auth/LoginButtons";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const sectionHeadingStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 400,
  color: "var(--color-text)",
  marginBottom: "1rem",
} as const;

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.875rem 0",
  borderBottom: "1px solid var(--color-border)",
} as const;

const labelStyle = {
  fontSize: "0.875rem",
  color: "var(--color-text-secondary)",
  fontFamily: "var(--font-ui)",
} as const;

const valueStyle = {
  fontSize: "0.875rem",
  color: "var(--color-text)",
  fontFamily: "var(--font-ui)",
} as const;

export default function SettingsPage() {
  const { user, loading, logout, updatePlaybackSpeed } = useAuth();
  const { setPlaybackSpeed } = useAudioSession();

  const currentSpeed = user?.playback_speed ?? 1;

  const handleSpeedChange = (speed: number) => {
    updatePlaybackSpeed(speed);
    setPlaybackSpeed(speed);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={sectionHeadingStyle}>Settings</h1>

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Loading...
          </p>
        ) : (
          <>
          {/* Email */}
          <div style={rowStyle}>
            <span style={labelStyle}>Email</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {user?.email ? (
                <>
                  <span style={valueStyle}>{user.email}</span>
                  <button
                    onClick={logout}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "transparent",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-ui)",
                      cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <LoginButtons />
              )}
            </div>
          </div>

          {/* Playback speed */}
          <div style={rowStyle}>
            <span style={labelStyle}>Playback speed</span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "var(--radius)",
                    border: "none",
                    backgroundColor:
                      currentSpeed === speed ? "var(--color-text)" : "transparent",
                    color:
                      currentSpeed === speed
                        ? "var(--color-bg)"
                        : "var(--color-text-secondary)",
                    fontSize: "0.8125rem",
                    fontFamily: "var(--font-ui)",
                    fontWeight: currentSpeed === speed ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {speed === 1 ? "1x" : `${speed}x`}
                </button>
              ))}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
