"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type { Tier } from "@/lib/tiers";

function formatMinSec(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

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

function UsageMeter({
  label,
  used,
  limit,
  formatUsed,
  formatLimit,
}: {
  label: string;
  used: number;
  limit: number;
  formatUsed: string;
  formatLimit: string;
}) {
  const pct = limit === Infinity ? 0 : Math.min(used / limit, 1) * 100;
  const isUnlimited = limit === Infinity;
  return (
    <div
      style={{ padding: "0.875rem 0", borderBottom: "1px solid var(--color-border)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: isUnlimited ? 0 : "0.5rem",
        }}
      >
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>
          {isUnlimited ? (
            <>
              {formatUsed}{" "}
              <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>
                / unlimited
              </span>
            </>
          ) : (
            <>
              {formatUsed}{" "}
              <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>
                / {formatLimit}
              </span>
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: "var(--color-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 2,
              backgroundColor:
                pct >= 100 ? "var(--color-accent)" : "var(--color-text-secondary)",
              transition: "width 0.3s",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { user, loading, refreshUsage } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const tier = user?.tier ?? "anonymous";

  return (
    <>
      <h1 style={sectionHeadingStyle}>Billing</h1>

      {loading ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Loading...
        </p>
      ) : (
        <>
          {/* Plan */}
          <div style={rowStyle}>
            <span style={labelStyle}>Plan</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ ...valueStyle, fontWeight: 500 }}>
                {TIER_LABELS[tier]}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {TIER_PRICES[tier]}
              </span>
              {user?.tierExpiresAt && (tier === "plus" || tier === "premium") && (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  &middot; until{" "}
                  {new Date(user.tierExpiresAt + "Z").toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Usage meters */}
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

          {/* Upgrade buttons */}
          {user?.email && tier !== "premium" && (
            <div
              style={{
                padding: "1.25rem 0",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
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
        </>
      )}
    </>
  );
}
