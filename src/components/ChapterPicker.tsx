"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type Chapter = { id: number; title: string };

/**
 * Chapter picker that renders as:
 * - Desktop: dropdown anchored to left edge of trigger, extending right
 * - Mobile (<640px): bottom drawer overlay
 */
export function ChapterPicker({
  chapters,
  activeChapterId,
  onSelect,
  onClose,
  containerRef,
}: {
  chapters: Chapter[];
  activeChapterId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Close on outside click (desktop) or backdrop tap (mobile)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, containerRef]);

  // Prevent body scroll on mobile when drawer is open
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    if (mq.matches) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, []);

  const handleSelect = useCallback((id: number) => {
    onClose();
    onSelect(id);
  }, [onClose, onSelect]);

  const listContent = (
    <>
      {chapters.map((ch, i) => {
        const isActive = ch.id === activeChapterId;
        return (
          <button
            key={ch.id}
            onClick={() => handleSelect(ch.id)}
            className="flex items-baseline gap-4 w-full text-left px-5 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
            style={{
              backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
              borderBottom: i < chapters.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <span
              className="text-xs tabular-nums shrink-0"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-ui)",
                opacity: 0.5,
                minWidth: "1.5rem",
                textAlign: "right",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                fontFamily: "var(--font-ui)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {ch.title}
            </span>
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop dropdown */}
      <div
        className="hidden sm:block overflow-auto"
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: 8,
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
          maxHeight: "50vh",
          minWidth: "22rem",
          zIndex: 110,
        }}
      >
        {listContent}
      </div>

      {/* Mobile bottom drawer — portaled to body to escape header's backdropFilter containing block */}
      {createPortal(
        <div className="sm:hidden" style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          {/* Backdrop */}
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          />
          {/* Drawer */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "70vh",
              backgroundColor: "var(--color-bg)",
              borderTopLeftRadius: "var(--radius-lg)",
              borderTopRightRadius: "var(--radius-lg)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
              overflow: "auto",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 0 0.25rem" }}>
              <div style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: "var(--color-border)" }} />
            </div>
            {listContent}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
