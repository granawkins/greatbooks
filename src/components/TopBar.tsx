"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useTopBar, type TopBarBookNav } from "@/lib/TopBarContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";
import { useAuth } from "@/lib/AuthContext";
import { ViewModeToggle, FontSizeControls } from "@/components/audio/PersistentPlayerBar";
import { useAudioSession } from "@/lib/AudioPlayerContext";

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

// ── Chapter selector dropdown ────────────────────────────────────────────

function ChapterSelector({ bookNav }: { bookNav: TopBarBookNav }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeChapter = bookNav.chapters.find((c) => c.id === bookNav.activeChapterId);
  const displayTitle = activeChapter?.sourceBookTitle ?? bookNav.title;

  // Strip book title prefix from chapter title
  let chapterLabel = activeChapter?.title ?? "";
  if (chapterLabel.startsWith(displayTitle + ":")) {
    chapterLabel = chapterLabel.slice(displayTitle.length + 1).trim();
  }

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Scroll to active chapter when opened
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector("[data-active]") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ block: "center" });
    }
  }, [open]);

  // Compute dropdown position from the button
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(260, window.innerWidth - 32);
    // Clamp left so the dropdown doesn't overflow the right edge
    const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 16);
    setDropdownPos({ top: rect.bottom + 4, left: Math.max(16, left) });
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0, flex: 1 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        onTouchEnd={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          background: "none",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          cursor: "pointer",
          padding: "4px 10px 4px 12px",
          transition: "color 0.15s, border-color 0.15s",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        className="hover:text-[var(--color-text)] hover:border-[var(--color-text-secondary)]"
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{chapterLabel}</span>
        <span style={{ flexShrink: 0, display: "flex" }}><ChevronDownIcon /></span>
      </button>

      {open && dropdownPos && createPortal(
        <div
          ref={listRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            minWidth: 260,
            maxWidth: "calc(100vw - 3rem)",
            maxHeight: "min(400px, 60vh)",
            overflowY: "auto",
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 200,
          }}
        >
          {bookNav.chapters.map((ch) => {
            const isActive = ch.id === bookNav.activeChapterId;
            let label = ch.title;
            const prefix = (ch.sourceBookTitle ?? bookNav.title) + ":";
            if (label.startsWith(prefix)) label = label.slice(prefix.length).trim();

            return (
              <button
                key={ch.id}
                data-active={isActive || undefined}
                onClick={() => {
                  bookNav.onChapterSelect(ch.id);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.9375rem",
                  color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "var(--color-bg-secondary)" : "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s, color 0.1s",
                }}
                className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                {label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Hamburger menu ───────────────────────────────────────────────────────

function MenuDropdown({ bookNav }: { bookNav: TopBarBookNav | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { session } = useAudioSession();
  const { openBookDetails } = useBookDetailsModal();
  const onBookPage = !!bookNav;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isLoggedIn = !!user?.email;

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "8px 16px",
    fontFamily: "var(--font-ui)",
    fontSize: "0.9375rem",
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.1s, color 0.1s",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    opacity: 0.7,
    padding: "8px 16px 4px",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          color: "var(--color-text-secondary)",
          transition: "color 0.15s",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        className="hover:text-[var(--color-text)]"
      >
        <HamburgerIcon />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: 220,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          {/* Book controls — only on book pages */}
          {onBookPage && bookNav && (
            <>
              {session && (
                <>
                  <div style={sectionLabelStyle}>Mode</div>
                  <div style={{ padding: "0 16px 8px" }}>
                    <ViewModeToggle showLabels />
                  </div>
                </>
              )}
              <div style={sectionLabelStyle}>Text size</div>
              <div style={{ padding: "0 16px 8px" }}>
                <FontSizeControls />
              </div>
              <button
                onClick={() => { openBookDetails(bookNav.bookId); setOpen(false); }}
                style={itemStyle}
                className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                Book details
              </button>
            </>
          )}

          <Link href="/library" onClick={() => setOpen(false)} style={itemStyle} className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]">
            Library
          </Link>

          {isLoggedIn ? (
            <>
              <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />
              <div style={{ padding: "8px 16px 2px", fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: "var(--color-text-secondary)", opacity: 0.7 }}>
                {user.email}
              </div>
              <Link href="/history" onClick={() => setOpen(false)} style={itemStyle} className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]">
                History
              </Link>
              <Link href="/billing" onClick={() => setOpen(false)} style={itemStyle} className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]">
                Billing
              </Link>
              <Link href="/settings" onClick={() => setOpen(false)} style={itemStyle} className="hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]">
                Settings
              </Link>
            </>
          ) : (
            <Link href="/api/auth/login" onClick={() => setOpen(false)} style={{ ...itemStyle, fontWeight: 500, color: "var(--color-accent)" }} className="hover:bg-[var(--color-bg-secondary)]">
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── TopBar ───────────────────────────────────────────────────────────────

export default function TopBar() {
  const { bookNav, scrolled } = useTopBar();

  const onBookPage = !!bookNav;
  const showBookTitle = onBookPage && scrolled;
  const showChapterSelector = showBookTitle && bookNav.chapters.length > 1;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--topbar-height)",
        zIndex: 100,
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--color-border)",
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Left side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1, overflow: "hidden" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo-v2.png"
              alt="Great Books"
              width={32}
              height={32}
              style={{ display: "block", flexShrink: 0 }}
            />
            {!onBookPage && (
              <span style={{
                fontFamily: "var(--font-ui)",
                fontSize: "1.125rem",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}>
                Greatbooks
              </span>
            )}
          </Link>

          {/* Book title (+ chapter selector if multi-chapter) */}
          {showBookTitle && (
            <>
              <span style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.9375rem",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}>
                {bookNav.chapters.find(c => c.id === bookNav.activeChapterId)?.sourceBookTitle ?? bookNav.title}
              </span>
              {showChapterSelector && <ChapterSelector bookNav={bookNav} />}
            </>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0, marginLeft: "0.75rem" }}>
          <MenuDropdown bookNav={bookNav} />
        </div>
      </div>
    </header>
  );
}
