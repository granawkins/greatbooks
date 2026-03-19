"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCoverLgUrl } from "@/lib/assets";

export type BookDetails = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  original_date: string | null;
  translator: string | null;
  translation_date: string | null;
  source_url: string | null;
  layout: "prose" | "verse";
  type: "book" | "course";
  chapters: {
    number: number;
    title: string;
    audio_duration_ms: number | null;
    chapter_type: "text" | "discussion";
  }[];
  stats?: {
    total_chars: number;
    total_duration_ms: number | null;
    chapter_count: number;
  } | null;
  progress?: {
    chapter_number: number;
  } | null;
};

const CHARS_PER_PAGE = 2200;
const READING_WPM = 250;
const CHARS_PER_WORD = 5;

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatReadingTime(chars: number): string {
  const words = chars / CHARS_PER_WORD;
  const minutes = Math.round(words / READING_WPM);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SkeletonBlock({ width, height, style }: { width: string | number; height: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "4px",
        backgroundColor: "var(--color-border)",
        opacity: 0.5,
        animation: "skeletonPulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function SkeletonContent() {
  return (
    <>
      {/* Header with cover placeholder + meta placeholders */}
      <div style={{ display: "flex", gap: "1.25rem", padding: "1.5rem 1.5rem 0" }}>
        {/* Cover placeholder */}
        <SkeletonBlock width={120} height={160} style={{ flexShrink: 0 }} />

        {/* Title + meta placeholders */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkeletonBlock width="80%" height="1.375rem" style={{ marginBottom: "0.5rem" }} />
          <SkeletonBlock width="50%" height="0.875rem" style={{ marginBottom: "1rem" }} />
          <SkeletonBlock width="60%" height="0.75rem" style={{ marginBottom: "0.5rem" }} />
          <SkeletonBlock width="45%" height="0.75rem" />
        </div>
      </div>

      {/* Stats row placeholder */}
      <div style={{ display: "flex", gap: "1.5rem", padding: "1rem 1.5rem" }}>
        <SkeletonBlock width={70} height="0.75rem" />
        <SkeletonBlock width={50} height="0.75rem" />
        <SkeletonBlock width={60} height="0.75rem" />
      </div>

      {/* Description placeholder */}
      <div style={{ padding: "0 1.5rem 1rem" }}>
        <SkeletonBlock width="100%" height="0.875rem" style={{ marginBottom: "0.5rem" }} />
        <SkeletonBlock width="90%" height="0.875rem" style={{ marginBottom: "0.5rem" }} />
        <SkeletonBlock width="70%" height="0.875rem" />
      </div>

      {/* CTA placeholder */}
      <div style={{ padding: "0 1.5rem 1rem" }}>
        <SkeletonBlock width="100%" height="2.75rem" style={{ borderRadius: "var(--radius)" }} />
      </div>

      {/* Chapter list placeholders */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "1rem 1.5rem 1.5rem" }}>
        <SkeletonBlock width={120} height="0.6875rem" style={{ marginBottom: "0.75rem" }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
            <SkeletonBlock width={22} height={22} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <SkeletonBlock width={`${60 + (i * 7) % 30}%`} height="0.8125rem" style={{ flex: "none" }} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function BookDetailsModal({
  bookId,
  book,
  onClose,
}: {
  bookId: string;
  book: BookDetails | null;
  onClose: () => void;
}) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div
        onClick={handleBackdropClick}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "transparent",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            backgroundColor: "var(--color-bg)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
            marginTop: "3rem",
            marginBottom: "3rem",
            overflow: "hidden",
            animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Close button — always visible */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "0.75rem",
              right: "0.75rem",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              borderRadius: "var(--radius)",
              zIndex: 1,
            }}
            className="hover:text-[var(--color-text)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>

          {book === null ? (
            <SkeletonContent />
          ) : (
            <LoadedContent bookId={bookId} book={book} onClose={onClose} />
          )}
        </div>
      </div>
    </>
  );
}

function LoadedContent({
  bookId,
  book,
  onClose,
}: {
  bookId: string;
  book: BookDetails;
  onClose: () => void;
}) {
  const totalPages = book.stats
    ? Math.max(1, Math.round(book.stats.total_chars / CHARS_PER_PAGE))
    : 0;
  const hasDuration =
    book.stats?.total_duration_ms != null && book.stats.total_duration_ms > 0;

  const continueChapter = book.progress?.chapter_number ?? null;
  const targetChapter =
    continueChapter ?? book.chapters[0]?.number ?? 1;
  const ctaLabel = continueChapter ? "Continue Reading" : "Start Reading";
  const ctaHref = `/${book.id}/${targetChapter}`;

  const isBook = book.type === "book";

  // Suppress unused variable warning — bookId used for future extensibility
  void bookId;

  return (
    <>
      {/* Header with cover + meta */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          padding: "1.5rem 1.5rem 0",
        }}
      >
        {/* Cover */}
        <div
          style={{
            width: 120,
            height: 160,
            flexShrink: 0,
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
            boxShadow:
              "4px 6px 16px rgba(0,0,0,0.15), 1px 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Image
            src={getCoverLgUrl(book.id)}
            alt={`${book.title} cover`}
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isBook && (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.65rem",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                margin: "0 0 0.25rem",
              }}
            >
              Course
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.375rem",
              fontWeight: 400,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
              lineHeight: 1.2,
            }}
          >
            {book.title}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              margin: "0 0 0.75rem",
            }}
          >
            {book.author}
          </p>

          {/* Frontmatter details */}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              lineHeight: 1.8,
            }}
          >
            {book.original_date && (
              <div>
                <span style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>Written:</span>{" "}
                {book.original_date}
              </div>
            )}
            {book.translator && (
              <div>
                <span style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>Translator:</span>{" "}
                {book.translator}
                {book.translation_date ? ` (${book.translation_date})` : ""}
              </div>
            )}
            {book.layout === "verse" && (
              <div>
                <span style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>Format:</span>{" "}
                Verse
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      {book.stats && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            padding: "1rem 1.5rem",
            fontFamily: "var(--font-ui)",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>{book.chapters.length} chapters</span>
          {totalPages > 0 && <span>{totalPages} pages</span>}
          {totalPages > 0 && (
            <span>{formatReadingTime(book.stats.total_chars)} read</span>
          )}
          {hasDuration && (
            <span>{formatDuration(book.stats.total_duration_ms!)} audio</span>
          )}
        </div>
      )}

      {/* Description */}
      {book.description && (
        <div style={{ padding: "0 1.5rem 1rem" }}>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {book.description}
          </p>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: "0 1.5rem 1rem" }}>
        <Link
          href={ctaHref}
          onClick={onClose}
          style={{
            display: "block",
            textAlign: "center",
            padding: "0.75rem",
            backgroundColor: "var(--color-text)",
            color: "var(--color-bg)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-ui)",
            fontSize: "0.9375rem",
            fontWeight: 500,
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          className="hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      </div>

      {/* Table of contents */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "1rem 1.5rem 1.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.6875rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            margin: "0 0 0.75rem",
          }}
        >
          Table of Contents
        </h3>
        <div>
          {book.chapters.map((ch) => {
            const isCurrent = ch.number === continueChapter;
            const isPast =
              continueChapter != null && ch.number < continueChapter;
            const isDiscussion = ch.chapter_type === "discussion";

            return (
              <Link
                key={ch.number}
                href={`/${book.id}/${ch.number}`}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5rem 0",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--color-border)",
                  transition: "background-color 0.1s",
                }}
                className="hover:bg-[var(--color-bg-secondary)]"
              >
                {/* Indicator */}
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "50%",
                    backgroundColor: isCurrent
                      ? "var(--color-accent)"
                      : isPast
                        ? "var(--color-border)"
                        : "transparent",
                    border:
                      isCurrent || isPast
                        ? "none"
                        : "1px solid var(--color-border)",
                    color: isCurrent || isPast
                      ? "var(--color-bg)"
                      : "var(--color-text-secondary)",
                    fontSize: "0.625rem",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {isPast ? (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 7l3 3 5-5" />
                    </svg>
                  ) : isDiscussion ? (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M2 3h10v7H5l-3 2V3z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span>{ch.number}</span>
                  )}
                </span>

                {/* Title */}
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    color: isPast
                      ? "var(--color-text-secondary)"
                      : "var(--color-text)",
                    fontWeight: isCurrent ? 500 : 400,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.title}
                </span>

                {/* Duration */}
                {ch.audio_duration_ms != null &&
                  ch.audio_duration_ms > 0 && (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.6875rem",
                        color: "var(--color-text-secondary)",
                        opacity: 0.7,
                        flexShrink: 0,
                      }}
                    >
                      {formatDuration(ch.audio_duration_ms)}
                    </span>
                  )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
