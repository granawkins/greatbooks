"use client";

import IconButton from "./IconButton";

export default function AudioPlayer() {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <IconButton label="Play" disabled>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2l10 6-10 6V2z" />
        </svg>
      </IconButton>

      <div className="flex-1">
        {/* Progress bar */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-secondary)" }}
        >
          <div
            className="h-full rounded-full w-0"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
        </div>
        <div
          className="flex justify-between text-xs mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>0:00</span>
          <span>--:--</span>
        </div>
      </div>

      <span
        className="text-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        1.0x
      </span>
    </div>
  );
}
