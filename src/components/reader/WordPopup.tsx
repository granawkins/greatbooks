"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type WordPopupProps = {
  anchorEl: HTMLElement;
  anchorEl2?: HTMLElement; // end of selection for range
  containerEl?: HTMLElement | null; // paragraph container — clicks inside extend selection
  isHighlighted?: boolean;
  onPlay: () => void;
  onHighlight: () => void;
  onComment: () => void;
  onClose: () => void;
};

export function WordPopup({
  anchorEl,
  anchorEl2,
  containerEl,
  isHighlighted,
  onPlay,
  onHighlight,
  onComment,
  onClose,
}: WordPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      // Allow clicks on any word span (supports cross-paragraph selection)
      const target = e.target as HTMLElement;
      if (target.closest?.("[id^='w-']")) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const rect1 = anchorEl.getBoundingClientRect();
  const rect2 = anchorEl2?.getBoundingClientRect();

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const top = (rect2 ? Math.min(rect1.top, rect2.top) : rect1.top) - 8 + scrollY;
  const left = (rect2
    ? (rect1.left + rect1.width / 2 + rect2.left + rect2.width / 2) / 2
    : rect1.left + rect1.width / 2) + scrollX;

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    background: "transparent",
    color: "var(--color-bg)",
    cursor: "pointer",
    borderRadius: "var(--radius)",
  };

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        top,
        left,
        transform: "translate(-50%, -100%)",
        display: "flex",
        gap: "2px",
        padding: "4px",
        borderRadius: "var(--radius)",
        background: "var(--color-text)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        zIndex: 1000,
      }}
    >
      {/* Play */}
      <button onClick={onPlay} style={btnStyle} aria-label="Play from here">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2.5v11l9-5.5z" />
        </svg>
      </button>

      {/* Highlight (toggle) */}
      <button
        onClick={onHighlight}
        style={{
          ...btnStyle,
          position: "relative" as const,
          background: isHighlighted ? "rgba(255,255,255,0.25)" : "transparent",
        }}
        aria-label={isHighlighted ? "Remove highlight" : "Highlight"}
      >
        <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor">
          <path d="M347 379L505.4 163.9L476.1 134.6L261 293L347 379zM160 384L160 384L160 312.3C160 297 167.2 282.7 179.5 273.7L452.6 72.4C460 66.9 469 64 478.2 64C489.6 64 500.5 68.5 508.6 76.6L563.4 131.4C571.5 139.5 576 150.4 576 161.9C576 171.1 573.1 180.1 567.6 187.5L366.4 460.5C357.4 472.8 343 480 327.8 480L256.1 480L230.7 505.4C218.2 517.9 197.9 517.9 185.4 505.4L134.7 454.7C122.2 442.2 122.2 421.9 134.7 409.4L160 384zM39 530.3L90.7 478.6L161.3 549.2L141.6 568.9C137.1 573.4 131 575.9 124.6 575.9L56 576C42.7 576 32 565.3 32 552L32 547.3C32 540.9 34.5 534.8 39 530.3z" />
        </svg>
        {isHighlighted && (
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: "absolute" }} stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="3" x2="13" y2="13" />
          </svg>
        )}
      </button>

      {/* Comment */}
      <button onClick={onComment} style={btnStyle} aria-label="Add comment">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h12a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
        </svg>
      </button>
    </div>,
    document.body
  );
}
