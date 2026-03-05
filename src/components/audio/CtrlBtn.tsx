"use client";

import { useState } from "react";

export function CtrlBtn({
  label,
  disabled = false,
  onClick,
  children,
  accent = false,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 52,
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "none",
        cursor: disabled ? "default" : "pointer",
        borderRadius: "var(--radius)",
        color: disabled
          ? "var(--color-border)"
          : hovered
          ? accent
            ? "var(--color-accent)"
            : "var(--color-text)"
          : "var(--color-text-secondary)",
        opacity: disabled ? 0.35 : 1,
        transition: "color 0.13s",
        padding: 0,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}
