"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAudioSession, useAudioView } from "@/lib/AudioPlayerContext";
import AudioPlayer from "./AudioPlayer";
import { CloseIcon } from "./icons";

function HeadphonesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 13V10a7 7 0 0 1 14 0v3" />
      <rect x="2" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
      <rect x="15" y="13" width="3" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 2.5h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z" />
      <path d="M7 2.5v15" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 8h10" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function ViewModeToggle({ showLabels }: { showLabels?: boolean } = {}) {
  const { session, audioRef } = useAudioSession();
  const { viewMode, setViewMode } = useAudioView();
  if (!session) return null;

  const handleSetMode = (mode: typeof viewMode) => {
    if (mode === "text") audioRef.current?.pause();
    setViewMode(mode);
  };

  const labels: Record<string, string> = { text: "Read", audio: "Listen" };

  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 20,
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {(["text", "audio"] as const).map((mode) => (
        <button
          key={mode}
          aria-label={mode === "audio" ? "Audio mode" : "Reading mode"}
          onClick={() => handleSetMode(mode)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: showLabels ? 6 : 0,
            height: 38,
            padding: showLabels ? "0 14px" : "0",
            width: showLabels ? "auto" : 42,
            border: "none",
            cursor: "pointer",
            backgroundColor: viewMode === mode ? "var(--color-bg-secondary)" : "transparent",
            color: viewMode === mode ? "var(--color-text)" : "var(--color-text-secondary)",
            transition: "background-color 0.15s, color 0.15s",
            fontFamily: "var(--font-ui)",
            fontSize: "0.8125rem",
            fontWeight: 500,
          }}
        >
          {mode === "audio" ? <HeadphonesIcon /> : <BookIcon />}
          {showLabels && labels[mode]}
        </button>
      ))}
    </div>
  );
}

const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const DEFAULT_FONT_SIZE = 18;

/**
 * onResize: called BEFORE the font size change. Should return an element
 * to keep anchored at the reading center, or null.
 */
export function FontSizeControls({ onResize, label }: { onResize?: () => HTMLElement | null; label?: string }) {
  const { session } = useAudioSession();
  if (!session) return null;

  const getCurrent = (): number => {
    try {
      const stored = localStorage.getItem("greatbooks-font-size");
      if (stored) {
        const n = parseInt(stored, 10);
        if (FONT_SIZES.includes(n)) return n;
      }
    } catch {}
    return DEFAULT_FONT_SIZE;
  };

  const apply = (size: number) => {
    // 1. Find anchor element + its offset from reading center BEFORE resize
    const anchor = onResize?.() ?? null;
    let anchorOffsetFromCenter = 0;
    if (anchor) {
      const centerY = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--topbar-height") || "52"
      );
      const readingCenter = centerY + (window.innerHeight - centerY) / 2;
      const rect = anchor.getBoundingClientRect();
      anchorOffsetFromCenter = rect.top - readingCenter;
    }

    // 2. Apply new font size (causes reflow)
    document.documentElement.style.setProperty("--font-size-body", `${size}px`);
    try { localStorage.setItem("greatbooks-font-size", String(size)); } catch {}

    // 3. Scroll so anchor is back at the same offset from center
    if (anchor) {
      const centerY = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--topbar-height") || "52"
      );
      const readingCenter = centerY + (window.innerHeight - centerY) / 2;
      const newRect = anchor.getBoundingClientRect();
      const drift = newRect.top - readingCenter - anchorOffsetFromCenter;
      if (Math.abs(drift) > 1) {
        window.scrollBy({ top: drift, behavior: "instant" });
      }
    }
  };

  const adjust = (delta: number) => {
    const cur = getCurrent();
    const idx = FONT_SIZES.indexOf(cur);
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))];
    if (next !== cur) apply(next);
  };

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    border: "none",
    cursor: "pointer",
    padding: 0,
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    transition: "color 0.15s",
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label && (
        <span style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
        }}>
          {label}
        </span>
      )}
      <div
        style={{
          display: "inline-flex",
          borderRadius: 20,
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          backgroundColor: "var(--color-surface)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <button aria-label="Decrease font size" onClick={() => adjust(-1)} style={btnStyle}>
          <MinusIcon />
        </button>
        <button aria-label="Increase font size" onClick={() => adjust(1)} style={btnStyle}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

export default function PersistentPlayerBar() {
  const { session, dismiss } = useAudioSession();
  const { viewMode } = useAudioView();
  const pathname = usePathname();
  if (!session) return null;

  const sessionPath = `/${session.bookId}/${session.chapterId}`;
  const isOnSessionPage = pathname === sessionPath;
  const isTextMode = viewMode === "text";

  return (
    <div
      data-player-bar
      className="fixed left-0 right-0 z-50"
      style={{
        bottom: 0,
        transform: isTextMode ? "translateY(100%)" : "translateY(0)",
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--color-border)",
        padding: "8px 24px 16px",
        minHeight: "var(--player-height)",
        boxSizing: "border-box",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "28rem" }}>
        {!isOnSessionPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <Link
              href={sessionPath}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
              className="hover:text-[var(--color-text)]"
            >
              {session.bookTitle}
              <span style={{ margin: "0 6px", opacity: 0.5 }}>|</span>
              {session.chapterTitle}
            </Link>
            <button
              aria-label="Close player"
              onClick={dismiss}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                borderRadius: 4,
                marginLeft: 8,
              }}
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <AudioPlayer />
      </div>
    </div>
  );
}
