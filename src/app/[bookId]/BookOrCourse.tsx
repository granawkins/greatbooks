"use client";

import Link from "next/link";

export default function BookOrCourse({
  bookId,
  bookTitle,
  bookChapter,
  courseId,
  courseTitle,
  courseChapter,
}: {
  bookId: string;
  bookTitle: string;
  bookChapter: number;
  courseId: string;
  courseTitle: string;
  courseChapter: number;
}) {
  const cardStyle = {
    display: "block",
    padding: "1.5rem",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    textDecoration: "none",
    transition: "border-color 0.15s",
    width: "100%",
  } as const;

  return (
    <div style={{ maxWidth: "28rem", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          fontWeight: 400,
          color: "var(--color-text)",
          marginBottom: "0.5rem",
        }}
      >
        {bookTitle}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.9375rem",
          color: "var(--color-text-secondary)",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        You&apos;re reading this book as part of a course. How would you like to continue?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Link
          href={`/${courseId}/${courseChapter}`}
          style={cardStyle}
          className="hover:border-[var(--color-accent)]"
        >
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.7rem",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              margin: "0 0 0.25rem",
            }}
          >
            Course
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.125rem",
              fontWeight: 500,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            Continue in {courseTitle}
          </p>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Chapter {courseChapter}
          </p>
        </Link>

        <Link
          href={`/${bookId}/${bookChapter}`}
          style={cardStyle}
          className="hover:border-[var(--color-text-secondary)]"
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.125rem",
              fontWeight: 500,
              color: "var(--color-text)",
              margin: "0 0 0.25rem",
            }}
          >
            Read independently
          </p>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {bookTitle} — Chapter {bookChapter}
          </p>
        </Link>
      </div>
    </div>
  );
}
