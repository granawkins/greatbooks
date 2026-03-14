"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type WordPopupProps = {
  anchorEl: HTMLElement;
  anchorEl2?: HTMLElement; // end of selection for range
  onPlay: () => void;
  onBookmark: () => void;
  onHighlight: () => void;
  onComment: () => void;
  onClose: () => void;
};

export function WordPopup({
  anchorEl,
  anchorEl2,
  onPlay,
  onBookmark,
  onHighlight,
  onComment,
  onClose,
}: WordPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (anchorEl.contains(e.target as Node)) return;
      if (anchorEl2?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [anchorEl, anchorEl2, onClose]);

  const rect1 = anchorEl.getBoundingClientRect();
  const rect2 = anchorEl2?.getBoundingClientRect();

  const top = rect2 ? Math.min(rect1.top, rect2.top) - 8 : rect1.top - 8;
  const left = rect2
    ? (rect1.left + rect1.width / 2 + rect2.left + rect2.width / 2) / 2
    : rect1.left + rect1.width / 2;

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
        position: "fixed",
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

      {/* Bookmark */}
      <button onClick={onBookmark} style={btnStyle} aria-label="Bookmark">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h8v12l-4-3-4 3V2z" />
        </svg>
      </button>

      {/* Highlight */}
      <button onClick={onHighlight} style={btnStyle} aria-label="Highlight">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 2 L14 5.5 L6.5 13 L3 13 L3 9.5 Z" />
          <rect x="2" y="14" width="12" height="1.5" rx="0.5" />
        </svg>
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
