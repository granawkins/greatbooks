"use client";

import { useRouter } from "next/navigation";
import LoginButtons from "@/components/auth/LoginButtons";

export type UpgradeModalVariant = "login" | "audio_limit" | "credits_exhausted";

type Props = {
  variant: UpgradeModalVariant;
  onClose: () => void;
};

const CONTENT: Record<UpgradeModalVariant, { title: string; description: string; cta?: string; tier?: string }> = {
  login: {
    title: "Sign up to unlock",
    description: "Create a free account to save your progress, bookmark your place, and get 5 minutes of audio each month.",
  },
  audio_limit: {
    title: "Audio limit reached",
    description: "You've used your 5 free minutes of audio this month. Upgrade to Plus for unlimited listening.",
    cta: "Upgrade to Plus - $1/mo",
    tier: "plus",
  },
  credits_exhausted: {
    title: "AI credits used up",
    description: "You've used all your AI tutor credits this month. Upgrade for more.",
    cta: "Upgrade to Plus",
    tier: "plus",
  },
};

export default function UpgradeModal({ variant, onClose }: Props) {
  const router = useRouter();
  const { title, description, cta, tier } = CONTENT[variant];

  const handleUpgrade = () => {
    if (tier) {
      router.push(`/upgrade?tier=${tier}`);
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "var(--color-text)",
            margin: "0 0 0.5rem",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            margin: "0 0 1.5rem",
          }}
        >
          {description}
        </p>

        {variant === "login" ? (
          <LoginButtons />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {cta && (
              <button
                onClick={handleUpgrade}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "var(--color-text)",
                  color: "var(--color-bg)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {cta}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "0.5rem",
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
