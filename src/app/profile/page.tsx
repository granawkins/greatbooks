"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAudioSession } from "@/lib/AudioPlayerContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";
import LoginButtons from "@/components/auth/LoginButtons";
import BookCover from "@/components/BookCover";
import type { Tier } from "@/lib/tiers";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatMinSec(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
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

const TIER_LABELS: Record<Tier, string> = {
  anonymous: "Not signed in",
  basic: "Basic",
  plus: "Plus",
  premium: "Premium",
};

const TIER_PRICES: Record<Tier, string> = {
  anonymous: "",
  basic: "Free",
  plus: "$1/mo",
  premium: "$6/mo",
};

function UsageMeter({ label, used, limit, formatUsed, formatLimit }: {
  label: string;
  used: number;
  limit: number;
  formatUsed: string;
  formatLimit: string;
}) {
  const pct = limit === Infinity ? 0 : Math.min(used / limit, 1) * 100;
  const isUnlimited = limit === Infinity;
  return (
    <div style={{ padding: "0.875rem 0", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: isUnlimited ? 0 : "0.5rem" }}>
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>
          {isUnlimited ? (
            <>{formatUsed} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>/ unlimited</span></>
          ) : (
            <>{formatUsed} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>/ {formatLimit}</span></>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 3, borderRadius: 2, backgroundColor: "var(--color-border)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 2,
              backgroundColor: pct >= 100 ? "var(--color-accent)" : "var(--color-text-secondary)",
              transition: "width 0.3s",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, logout, updatePlaybackSpeed } = useAuth();
  const { setPlaybackSpeed } = useAudioSession();
  const { openBookDetails } = useBookDetailsModal();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const { refreshUsage } = useAuth();

  useEffect(() => {
    refreshUsage();
    fetch("/api/user/history", { credentials: "include" })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {});
  }, [refreshUsage]);

  const currentSpeed = user?.playback_speed ?? 1;
  const tier = user?.tier ?? "anonymous";

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
        <h1 style={{ ...sectionHeadingStyle, marginBottom: "1.5rem" }}>Profile</h1>

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Loading...
          </p>
        ) : (
          <>
            {/* ── Account ─────────────────────────────────── */}

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

            {/* Plan */}
            <div style={rowStyle}>
              <span style={labelStyle}>Plan</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ ...valueStyle, fontWeight: 500 }}>
                  {TIER_LABELS[tier]}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)" }}>
                  {TIER_PRICES[tier]}
                </span>
                {user?.tierExpiresAt && (tier === "plus" || tier === "premium") && (
                  <span style={{ fontSize: "0.6875rem", color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)" }}>
                    &middot; until {new Date(user.tierExpiresAt + "Z").toLocaleDateString()}
                  </span>
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
                        currentSpeed === speed ? "var(--color-bg)" : "var(--color-text-secondary)",
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

            {/* ── Usage ────────────────────────────────────── */}
            {user?.email && (
              <>
                <UsageMeter
                  label="Audio this month"
                  used={user.audioUsedMs}
                  limit={user.audioLimitMs}
                  formatUsed={formatMinSec(user.audioUsedMs)}
                  formatLimit={formatMinSec(user.audioLimitMs)}
                />
                <UsageMeter
                  label="AI credits this month"
                  used={user.creditsUsed}
                  limit={user.creditsLimit}
                  formatUsed={`${Math.round(user.creditsUsed)}`}
                  formatLimit={`${user.creditsLimit}`}
                />
              </>
            )}

            {/* ── Upgrade ─────────────────────────────────── */}
            {user?.email && tier !== "premium" && (
              <div style={{ padding: "1.25rem 0", borderBottom: "1px solid var(--color-border)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {tier === "basic" && (
                  <>
                    <button
                      onClick={() => router.push("/upgrade?tier=plus")}
                      style={{
                        padding: "0.625rem 1.25rem",
                        backgroundColor: "var(--color-text)",
                        color: "var(--color-bg)",
                        border: "none",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Upgrade to Plus ($1/mo)
                    </button>
                    <button
                      onClick={() => router.push("/upgrade?tier=premium")}
                      style={{
                        padding: "0.625rem 1.25rem",
                        backgroundColor: "transparent",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Upgrade to Premium ($6/mo)
                    </button>
                  </>
                )}
                {tier === "plus" && (
                  <button
                    onClick={() => router.push("/upgrade?tier=premium")}
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "var(--color-text)",
                      color: "var(--color-bg)",
                      border: "none",
                      borderRadius: "var(--radius)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Upgrade to Premium ($6/mo)
                  </button>
                )}
              </div>
            )}

            {/* ── History ─────────────────────────────────── */}
            {history.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <h2 style={sectionHeadingStyle}>History</h2>
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
