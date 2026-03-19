"use client";

import Link from "next/link";
import { useAudioSession } from "@/lib/AudioPlayerContext";

type CourseChapter = {
  number: number;
  title: string;
  chapterType: "text" | "discussion";
  hasAudio: boolean;
};

export default function CourseContents({
  bookId,
  title,
  author,
  description,
  chapters,
  currentChapter,
}: {
  bookId: string;
  title: string;
  author: string;
  description: string | null;
  chapters: CourseChapter[];
  currentChapter: number | null;
}) {
  const { session } = useAudioSession();

  return (
    <div
      style={{
        paddingBottom: session ? 220 : 64,
      }}
    >
      <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Header */}
        <header style={{ marginBottom: "2.5rem" }}>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              margin: "0 0 0.5rem",
            }}
          >
            Course
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 400,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1rem",
              color: "var(--color-text-secondary)",
              margin: "0 0 1rem",
            }}
          >
            {author}
          </p>
          {description && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {description}
            </p>
          )}
        </header>

        {/* Continue / Start button */}
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href={`/${bookId}/${currentChapter ?? chapters[0]?.number ?? 1}`}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--color-accent)",
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
            {currentChapter ? "Continue Reading" : "Start Course"}
          </Link>
        </div>

        {/* Chapter list */}
        <div>
          {chapters.map((ch) => {
            const isCurrent = ch.number === currentChapter;
            const isPast = currentChapter != null && ch.number < currentChapter;
            const isDiscussion = ch.chapterType === "discussion";

            return (
              <Link
                key={ch.number}
                href={`/${bookId}/${ch.number}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 0",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--color-border)",
                  transition: "background-color 0.1s",
                }}
                className="hover:bg-[var(--color-bg-secondary)]"
              >
                {/* Type indicator */}
                <span
                  style={{
                    width: 28,
                    height: 28,
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
                    border: isCurrent || isPast ? "none" : "1px solid var(--color-border)",
                    color: isCurrent
                      ? "var(--color-bg)"
                      : isPast
                        ? "var(--color-bg)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  {isPast ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7l3 3 5-5" />
                    </svg>
                  ) : isDiscussion ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h10v7H5l-3 2V3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="2" width="8" height="10" rx="1" />
                      <line x1="5" y1="5" x2="9" y2="5" />
                      <line x1="5" y1="7" x2="9" y2="7" />
                      <line x1="5" y1="9" x2="7" y2="9" />
                    </svg>
                  )}
                </span>

                {/* Title */}
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.9375rem",
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

                {/* Audio indicator */}
                {ch.hasAudio && (
                  <span style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" opacity={0.5}>
                      <path d="M3 5v4h2l3 3V2L5 5H3z" />
                    </svg>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
