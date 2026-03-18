"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradePageInner />
    </Suspense>
  );
}

function UpgradePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const tier = searchParams.get("tier") as "plus" | "premium" | null;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tier || (tier !== "plus" && tier !== "premium")) {
      setStatus("error");
      setError("Invalid tier");
      return;
    }

    if (!user?.email) {
      setStatus("error");
      setError("You must be signed in to upgrade.");
      return;
    }

    fetch("/api/user/tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tier }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          await refreshUser();
        } else {
          const data = await res.json();
          setStatus("error");
          setError(data.error || "Upgrade failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong");
      });
  }, [tier, user?.email, refreshUser]);

  const tierLabel = tier === "premium" ? "Premium" : "Plus";
  const tierPrice = tier === "premium" ? "$6/mo" : "$1/mo";

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--color-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        {status === "loading" && (
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: "0.875rem" }}>
            Processing...
          </p>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--color-text)",
                margin: "0 0 0.5rem",
              }}
            >
              Welcome to {tierLabel}!
            </h1>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
                margin: "0 0 2rem",
              }}
            >
              We&apos;ve gifted you 1 month of {tierLabel} ({tierPrice}).
              {tier === "plus"
                ? " Enjoy unlimited audio and 250 AI credits."
                : " Enjoy unlimited audio and unlimited AI."}
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "var(--color-text)",
                color: "var(--color-bg)",
                border: "none",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-ui)",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Start reading
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--color-text)",
                margin: "0 0 0.5rem",
              }}
            >
              Oops
            </h1>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                margin: "0 0 1.5rem",
              }}
            >
              {error}
            </p>
            <button
              onClick={() => router.push("/profile")}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "var(--color-text)",
                color: "var(--color-bg)",
                border: "none",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-ui)",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Go to profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
