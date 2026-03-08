"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChapterListIcon } from "@/components/audio/icons";
import type { BookMeta, NavChapter } from "./types";

function ChapterDropdown({
  chapters,
  activeChapterId,
  onSelect,
  onClose,
  containerRef,
  position,
  align = "center",
}: {
  chapters: NavChapter[];
  activeChapterId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  position: "below" | "above";
  align?: "center" | "right";
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, containerRef]);

  return (
    <div
      className="overflow-auto"
      style={{
        position: "absolute",
        ...(position === "below"
          ? { top: "100%", marginTop: 8 }
          : { bottom: "100%", marginBottom: 8 }),
        ...(align === "right"
          ? { right: 0 }
          : { left: "50%", transform: "translateX(-50%)" }),
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
        maxHeight: "50vh",
        minWidth: "22rem",
        zIndex: 60,
      }}
    >
      {chapters.map((ch, i) => {
        const isActive = ch.id === activeChapterId;
        return (
          <button
            key={ch.id}
            onClick={() => {
              onClose();
              onSelect(ch.id);
            }}
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
    </div>
  );
}

export function BookHeader({
  bookMeta,
  chapters,
  activeChapterId,
  onChapterSelect,
}: {
  bookMeta: BookMeta | null;
  chapters: NavChapter[];
  activeChapterId: number;
  onChapterSelect: (id: number) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const heroContainerRef = useRef<HTMLDivElement | null>(null);
  const stickyContainerRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when scroll state changes
  useEffect(() => {
    setDropdownOpen(false);
  }, [scrolled]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  const metaLine = bookMeta
    ? [
        bookMeta.author,
        bookMeta.original_date,
        bookMeta.translator ? `tr. ${bookMeta.translator}` : null,
      ]
        .filter(Boolean)
        .join(" \u00b7 ")
    : "";

  return (
    <>
      {/* Hero header — visible at top */}
      <div ref={heroRef} style={{ minHeight: 1 }}>
        {bookMeta && (
          <div
            style={{
              textAlign: "center",
              paddingTop: "2.5rem",
              paddingBottom: "2rem",
            }}
          >
            {chapters.length > 1 ? (
              <div
                ref={heroContainerRef}
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                  className="hover:opacity-70"
                >
                  <h1
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "2rem",
                      fontWeight: 400,
                      color: "var(--color-text)",
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {bookMeta.title}
                  </h1>
                  <ChapterListIcon />
                </button>
                {dropdownOpen && !scrolled && (
                  <ChapterDropdown
                    chapters={chapters}
                    activeChapterId={activeChapterId}
                    onSelect={onChapterSelect}
                    onClose={closeDropdown}
                    containerRef={heroContainerRef}
                    position="below"
                  />
                )}
              </div>
            ) : (
              <h1
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "2rem",
                  fontWeight: 400,
                  color: "var(--color-text)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {bookMeta.title}
              </h1>
            )}
            {metaLine && (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.875rem",
                  color: "var(--color-text-secondary)",
                  marginTop: "0.5rem",
                }}
              >
                {metaLine}
                {bookMeta.source_url && (
                  <>
                    {" \u00b7 "}
                    <a
                      href={bookMeta.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-text-secondary)" }}
                      className="hover:underline"
                    >
                      source
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sticky compact header — appears on scroll */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: "var(--color-bg)",
          borderBottom: scrolled ? "1px solid var(--color-border)" : "1px solid transparent",
          transform: scrolled ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.2s ease, border-color 0.2s ease",
        }}
      >
        <div
          ref={stickyContainerRef}
          style={{
            maxWidth: "68ch",
            margin: "0 auto",
            padding: "0.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            position: "relative",
          }}
        >
          <Link
            href="/"
            className="hover:opacity-60"
            style={{
              color: "var(--color-text-secondary)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
            }}
            aria-label="Back to library"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>

          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.9375rem",
              color: "var(--color-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {bookMeta?.title}
          </span>

          {chapters.length > 1 && (
            <>
              <button
                aria-label="Select chapter"
                onClick={() => setDropdownOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--radius)",
                  flexShrink: 0,
                  padding: 0,
                }}
                className="hover:opacity-60"
              >
                <ChapterListIcon />
              </button>

              {dropdownOpen && scrolled && (
                <ChapterDropdown
                  chapters={chapters}
                  activeChapterId={activeChapterId}
                  onSelect={onChapterSelect}
                  onClose={closeDropdown}
                  containerRef={stickyContainerRef}
                  position="below"
                  align="right"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Back button — visible when hero is visible (not scrolled) */}
      {!scrolled && (
        <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem" }}>
          <Link
            href="/"
            className="hover:opacity-60"
            style={{
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
            }}
            aria-label="Back to library"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>
        </div>
      )}
    </>
  );
}
