"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTopBar } from "@/lib/TopBarContext";
import { ChapterListIcon } from "@/components/audio/icons";
import { ChapterPicker } from "@/components/ChapterPicker";

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3.5 17.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5z" />
    </svg>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const isProfile = pathname === "/profile";
  const { bookNav, scrolled } = useTopBar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const chapterBtnRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  // Close dropdown when scroll state changes
  useEffect(() => { setDropdownOpen(false); }, [scrolled]);

  const showBookTitle = !!bookNav;
  const showChapterNav = bookNav && scrolled && bookNav.chapters.length > 1;
  const activeChapterTitle = showChapterNav
    ? bookNav.chapters.find((c) => c.id === bookNav.activeChapterId)?.title ?? ""
    : "";

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
      }}
    >
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Left side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.125rem", minWidth: 0, flex: 1 }}>
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
              width={showBookTitle ? 26 : 32}
              height={showBookTitle ? 26 : 32}
              style={{ display: "block", flexShrink: 0 }}
            />
            {!showBookTitle && (
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

          {/* Book title — always visible on book/course pages */}
          {showBookTitle && (
            <>
              <span style={{ color: "var(--color-border)", margin: "0 0.25rem", fontSize: "0.875rem", flexShrink: 0 }}>/</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                {bookNav.title}
              </span>
            </>
          )}

          {/* Chapter nav — appears when chapter title has scrolled out of view */}
          {showChapterNav && (
            <>
              <span style={{ color: "var(--color-border)", margin: "0 0.25rem", fontSize: "0.875rem", flexShrink: 0 }}>/</span>
              <div ref={chapterBtnRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  aria-label="Select chapter"
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    borderRadius: "var(--radius)",
                    padding: 0,
                  }}
                  className="hover:text-[var(--color-text)]"
                >
                  <ChapterListIcon />
                </button>
                {dropdownOpen && (
                  <ChapterPicker
                    chapters={bookNav.chapters}
                    activeChapterId={bookNav.activeChapterId}
                    onSelect={bookNav.onChapterSelect}
                    onClose={closeDropdown}
                    containerRef={chapterBtnRef}
                  />
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  marginLeft: "0.125rem",
                }}
              >
                {activeChapterTitle}
              </span>
            </>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0, marginLeft: "0.75rem" }}>
          <Link
            href="/library"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              padding: "0.25rem 0.5rem",
              transition: "color 0.15s",
            }}
            className="hover:text-[var(--color-text)]"
          >
            Library
          </Link>
          {!isProfile && (
            <Link
              href="/profile"
              aria-label="Profile"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                color: "var(--color-text-secondary)",
                transition: "color 0.15s",
              }}
              className="hover:text-[var(--color-text)]"
            >
              <ProfileIcon />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
