"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type WordPopupProps = {
  anchorEl: HTMLElement;
  onPlay: () => void;
  onBookmark: () => void;
  onClose: () => void;
};

export function WordPopup({ anchorEl, onPlay, onBookmark, onClose }: WordPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (anchorEl.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [anchorEl, onClose]);

  const rect = anchorEl.getBoundingClientRect();
  const top = rect.top - 8;
  const left = rect.left + rect.width / 2;

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
      <button
        onClick={onPlay}
        style={{
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
        }}
        aria-label="Play from here"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2.5v11l9-5.5z" />
        </svg>
      </button>
      <button
        onClick={onBookmark}
        style={{
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
        }}
        aria-label="Bookmark"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h8v12l-4-3-4 3V2z" />
        </svg>
      </button>
    </div>,
    document.body
  );
}
