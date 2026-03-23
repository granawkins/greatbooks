"use client";

import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import { getCoverSmUrl } from "@/lib/assets";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";

const CHARS_PER_PAGE = 2200;

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export type BookCardStats = {
  chapter_count: number;
  total_duration_ms: number | null;
  total_chars: number;
};

export type BookCardProgress = {
  chapter_number: number;
  audio_position_ms: number;
};

export default function BookCard({
  book,
  stats,
  progress,
  isLast = false,
  courseInfo,
}: {
  book: BookRow;
  stats: BookCardStats | null;
  progress: BookCardProgress | null;
  isLast?: boolean;
  courseInfo?: { courseId: string; courseTitle: string } | null;
}) {
  const { openBookDetails } = useBookDetailsModal();
  const totalPages = stats ? Math.max(1, Math.round(stats.total_chars / CHARS_PER_PAGE)) : 0;
  const chapterCount = stats?.chapter_count ?? 0;
  const hasDuration = stats?.total_duration_ms != null && stats.total_duration_ms > 0;

  const inProgress = progress != null && chapterCount > 0;
  const progressFraction = inProgress ? (progress.chapter_number - 1) / chapterCount : 0;
  const remainingFraction = inProgress ? 1 - progressFraction : 1;

  const displayPages = inProgress ? Math.max(1, Math.round(totalPages * remainingFraction)) : totalPages;
  const displayDuration = stats?.total_duration_ms
    ? (inProgress ? Math.round(stats.total_duration_ms * remainingFraction) : stats.total_duration_ms)
    : null;

  const href = courseInfo
    ? `/${courseInfo.courseId}`
    : inProgress
      ? `/${book.id}/${progress!.chapter_number}`
      : `/${book.id}/1`;

  return (
    <Link
      href={href}
      className="book-card-link"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          padding: "1.75rem 0",
          borderBottom: isLast ? "none" : "1px solid var(--color-border)",
          alignItems: "center",
        }}
      >
        {/* Cover */}
        <div
          className="book-card-cover"
          style={{
            width: 120,
            flexShrink: 0,
            aspectRatio: "3 / 4",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
            boxShadow:
              "4px 6px 20px rgba(0,0,0,0.14), 1px 2px 4px rgba(0,0,0,0.08), inset -1px 0 2px rgba(0,0,0,0.04)",
          }}
        >
          <Image
            src={getCoverSmUrl(book.id)}
            alt={`${book.title} cover`}
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 0.25rem",
            }}
          >
            {book.author}
          </p>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
              fontWeight: 400,
              color: "var(--color-text)",
              margin: "0 0 0.5rem",
              lineHeight: 1.2,
            }}
          >
            {book.title}
          </h3>
          {book.description && (
            <p
              className="book-card-desc"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.55,
                margin: "0 0 0.75rem",
              }}
            >
              {book.description}
            </p>
          )}

          {/* CTA + Stats/Progress */}
          <div className="book-card-actions">
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "var(--color-accent)",
                padding: "0.375rem 0.875rem",
                borderRadius: "var(--radius)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              Read
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openBookDetails(book.id);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "var(--color-text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                opacity: 0.5,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
              aria-label={`Info about ${book.title}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6.5" />
                <line x1="8" y1="7" x2="8" y2="11" />
                <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {inProgress ? (
              <div>
                <div
                  style={{
                    height: 3,
                    width: "min(200px, 100%)",
                    backgroundColor: "var(--color-border)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(progressFraction * 100, 2)}%`,
                      backgroundColor: "var(--color-accent)",
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    margin: "0.375rem 0 0",
                  }}
                >
                  {displayPages} pages{displayDuration ? ` (${formatDuration(displayDuration)})` : ""} left
                </p>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"><rect x="4" y="1" width="9" height="12" rx="1" /><rect x="3" y="3" width="9" height="12" rx="1" fill="var(--color-bg, #fff)" /><rect x="3" y="3" width="9" height="12" rx="1" /></svg>
                  {totalPages} pages
                </span>
                {hasDuration && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10V8a6 6 0 1 1 12 0v2" /><rect x="1" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" /><rect x="12" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" /></svg>
                    {formatDuration(stats.total_duration_ms!)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
