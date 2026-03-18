"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTopBar } from "@/lib/TopBarContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";

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
  const { openBookDetails } = useBookDetailsModal();

  const onBookPage = !!bookNav;
  // For courses, use the source book title if available for the active chapter
  const activeChapter = bookNav?.chapters.find((c) => c.id === bookNav.activeChapterId);
  const displayTitle = activeChapter?.sourceBookTitle ?? bookNav?.title ?? "";
  const showChapterTitle = bookNav && scrolled && bookNav.chapters.length > 1;

  // Build chapter subtitle — strip the book title prefix if the chapter title starts with it
  let chapterSubtitle = activeChapter?.title ?? "";
  if (showChapterTitle && chapterSubtitle.startsWith(displayTitle + ":")) {
    chapterSubtitle = chapterSubtitle.slice(displayTitle.length + 1).trim();
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
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

          {/* Book + chapter title — clickable to open modal */}
          {onBookPage && (
            <button
              onClick={() => openBookDetails(bookNav.bookId)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.15s",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                textDecoration: "underline",
                textDecorationColor: "var(--color-border)",
                textUnderlineOffset: "3px",
              }}
              className="hover:text-[var(--color-text)]"
            >
              {displayTitle}{showChapterTitle ? `: ${chapterSubtitle}` : ""}
            </button>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0, marginLeft: "0.75rem" }}>
          {!onBookPage && (
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
          )}
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
