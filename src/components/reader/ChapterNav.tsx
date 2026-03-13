"use client";

import Link from "next/link";

function LeftChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function RightChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export function ChapterNav({
  bookId,
  prevChapter,
  nextChapter,
}: {
  bookId: string;
  prevChapter: { num: number; title: string } | null;
  nextChapter: { num: number; title: string } | null;
}) {
  const btnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    fontFamily: "var(--font-ui)",
    fontSize: "0.875rem",
    lineHeight: 1.4,
    transition: "border-color 0.15s, color 0.15s",
    minWidth: 0,
  } as const;

  const placeholderStyle = {
    ...btnStyle,
    visibility: "hidden" as const,
  };

  return (
    <nav
      className="flex flex-col sm:flex-row gap-3 my-8"
      style={{ width: "100%" }}
    >
      {prevChapter ? (
        <Link
          href={`/${bookId}/${prevChapter.num}?scroll=bottom`}
          style={{ ...btnStyle, flex: 1 }}
          className="hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <span style={{ flexShrink: 0 }}><LeftChevron /></span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prevChapter.title}
          </span>
        </Link>
      ) : (
        <div style={{ ...placeholderStyle, flex: 1 }} />
      )}
      {nextChapter ? (
        <Link
          href={`/${bookId}/${nextChapter.num}`}
          style={{ ...btnStyle, flex: 1, justifyContent: "flex-end" }}
          className="hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextChapter.title}
          </span>
          <span style={{ flexShrink: 0 }}><RightChevron /></span>
        </Link>
      ) : (
        <div style={{ ...placeholderStyle, flex: 1 }} />
      )}
    </nav>
  );
}
