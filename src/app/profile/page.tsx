"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";
import LoginButtons from "@/components/auth/LoginButtons";
import BookCover from "@/components/BookCover";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

type UsageSummary = {
  listen_ms: number;
  read_ms: number;
};

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(min)}:${pad(sec)}`;
}

type HistoryItem = {
  book_id: string;
  title: string;
  author: string;
  type: string;
  chapter_number: number;
  audio_position_ms: number;
  updated_at: string;
  stats: {
    total_chars: number;
    total_duration_ms: number | null;
    chapter_count: number;
  } | null;
  course?: { id: string; title: string };
};

function UserIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--color-text-secondary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="24" cy="18" r="8" />
      <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" />
    </svg>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "1rem 0",
  borderBottom: "1px solid var(--color-border)",
} as const;

const labelStyle = {
  fontSize: "0.875rem",
  color: "var(--color-text-secondary)",
  fontFamily: "var(--font-ui)",
} as const;

export default function ProfilePage() {
  const { user, loading, logout, updatePlaybackSpeed } = useAuth();
  const { setPlaybackSpeed } = useAudioPlayer();
  const { openBookDetails } = useBookDetailsModal();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    fetch("/api/user/history", { credentials: "include" })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {});
    fetch("/api/user/usage", { credentials: "include" })
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  const currentSpeed = user?.playback_speed ?? 1;

  const handleSpeedChange = (speed: number) => {
    updatePlaybackSpeed(speed);
    setPlaybackSpeed(speed);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
        }}
      >
        {/* User icon centered */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <UserIcon />
        </div>

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", textAlign: "center" }}>
            Loading...
          </p>
        ) : (
          <>
            {/* Email row */}
            <div style={rowStyle}>
              <span style={labelStyle}>Email</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {user?.email ? (
                  <>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-ui)",
                      }}
                    >
                      {user.email}
                    </span>
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

            {/* Playback speed row */}
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
                        currentSpeed === speed
                          ? "var(--color-text)"
                          : "transparent",
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

            {/* Usage stats */}
            {usage && (usage.listen_ms > 0 || usage.read_ms > 0) && (
              <>
                <div style={rowStyle}>
                  <span style={labelStyle}>Time listened</span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {formatDuration(usage.listen_ms)}
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Time reading</span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {formatDuration(usage.read_ms)}
                  </span>
                </div>
              </>
            )}

            {/* History */}
            {history.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    fontWeight: 400,
                    color: "var(--color-text)",
                    marginBottom: "1rem",
                  }}
                >
                  History
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-6">
                  {history.map((item) => (
                    <div
                      key={item.course ? `${item.course.id}-${item.book_id}` : item.book_id}
                      onClick={() => openBookDetails(item.course?.id ?? item.book_id)}
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      <BookCover
                        bookId={item.book_id}
                        title={item.title}
                        stats={item.stats}
                        progress={{ chapter_number: item.chapter_number }}
                      />
                      {item.course && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 32,
                            left: 0,
                            right: 0,
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "var(--radius)",
                              backgroundColor: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              fontFamily: "var(--font-ui)",
                              fontSize: "0.6875rem",
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "90%",
                            }}
                          >
                            {item.course.title}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
