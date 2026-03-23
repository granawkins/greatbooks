"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { getCoverSmUrl } from "@/lib/assets";
import { useAudioSession } from "@/lib/AudioPlayerContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";

type ProgressMap = Record<string, { chapter_number: number; audio_position_ms: number; updated_at: string }>;
type StatsMap = Record<string, { chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number }>;
type CourseForBook = Record<string, { courseId: string; courseTitle: string }>;

type HomeProps = {
  variant: "a" | "b";
  books: BookRow[];
  courses: BookRow[];
  progressMap: ProgressMap;
  statsMap: StatsMap;
  recentBookIds: string[];
  courseForBook: CourseForBook;
  courseBooks: Record<string, string[]>;
  isLoggedIn: boolean;
};

// Books that are fully ready (have audio) — shown as featured, grouped with headings
const FEATURED_SECTIONS: { heading: string; bookIds: string[] }[] = [
  {
    heading: "The First Stories",
    bookIds: ["homer-iliad", "homer-odyssey"],
  },
  {
    heading: "The Birth of Philosophy",
    bookIds: ["plato-republic", "plato-apology", "plato-phaedo"],
  },
];

export default function HomeClient(props: HomeProps) {
  useEffect(() => {
    document.cookie = `ab_home=${props.variant};path=/;max-age=${60 * 60 * 24 * 90};samesite=lax`;
  }, [props.variant]);

  return (
    <HomeLayout
      hero={props.variant === "a" ? <HeroA /> : <HeroB />}
      progressMap={props.progressMap}
      statsMap={props.statsMap}
      recentBookIds={props.recentBookIds}
      courseForBook={props.courseForBook}
      books={props.books}
    />
  );
}

// ── Shared helpers ──

function getFeaturedSections(books: BookRow[], statsMap: StatsMap) {
  const booksById = Object.fromEntries(books.map((b) => [b.id, b]));
  return FEATURED_SECTIONS.map((section) => ({
    heading: section.heading,
    books: section.bookIds
      .filter((id) => booksById[id] && statsMap[id]?.total_duration_ms)
      .map((id) => booksById[id]),
  })).filter((s) => s.books.length > 0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HERO CONTENT (varies by A/B variant)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function HeroA() {
  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 6vw, 3.25rem)",
          fontWeight: 400,
          color: "var(--color-text)",
          lineHeight: 1.15,
          margin: "0 0 1rem",
          letterSpacing: "-0.01em",
        }}
      >
        Long Walks<br />with Old Books
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1.0625rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          maxWidth: "36ch",
          margin: "0 auto",
          fontStyle: "italic",
        }}
      >
        Listen to Homer, Plato, and Milton — beautifully narrated, with an AI tutor at your side.
      </p>
    </>
  );
}

function HeroB() {
  return (
    <>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--color-accent)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 0.75rem",
        }}
      >
        Homer &middot; Plato &middot; Milton &middot; and more
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 6vw, 3.25rem)",
          fontWeight: 400,
          color: "var(--color-text)",
          lineHeight: 1.15,
          margin: "0 0 1rem",
          letterSpacing: "-0.01em",
        }}
      >
        A Classics Education<br />
        <span style={{ color: "var(--color-accent)" }}>for $1/mo</span>
      </h1>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.9375rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          maxWidth: "42ch",
          margin: "0 auto",
        }}
      >
        Read the great books, listen on the go, and discuss them with an AI tutor who knows every line. Free to start.
      </p>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOME PAGE LAYOUT (shared by both variants)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function HomeLayout({ hero, progressMap, statsMap, recentBookIds, courseForBook, books }: {
  hero: ReactNode;
  progressMap: ProgressMap;
  statsMap: StatsMap;
  recentBookIds: string[];
  courseForBook: CourseForBook;
  books: BookRow[];
}) {
  const { session } = useAudioSession();
  const { setMaps } = useBookDetailsModal();

  useEffect(() => {
    const s: Record<string, { total_chars: number; total_duration_ms: number | null; chapter_count: number }> = {};
    for (const [k, v] of Object.entries(statsMap)) s[k] = { total_chars: v.total_chars, total_duration_ms: v.total_duration_ms, chapter_count: v.chapter_count };
    const p: Record<string, { chapter_number: number }> = {};
    for (const [k, v] of Object.entries(progressMap)) p[k] = { chapter_number: v.chapter_number };
    setMaps(s, p);
  }, [statsMap, progressMap, setMaps]);

  const booksById = Object.fromEntries(books.map((b) => [b.id, b]));
  const lastBookId = recentBookIds.find((id) => booksById[id]) ?? null;
  const lastBook = lastBookId ? booksById[lastBookId] : null;
  const continueProgress = lastBook ? progressMap[lastBook.id] : null;
  const continueStats = lastBook ? statsMap[lastBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = lastBookId ? courseForBook[lastBookId] : null;

  const hasContinue = !!lastBook && !!continueProgress;
  const featuredSections = getFeaturedSections(books, statsMap);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue (above hero when available) ── */}
        {hasContinue && (
          <ContinueSection
            continueBook={lastBook}
            continueProgress={continueProgress!}
            continueStats={continueStats}
            continueChapterCount={continueChapterCount}
            bookCourseInfo={bookCourseInfo}
          />
        )}

        {/* ── Hero (always) ── */}
        <section
          style={{
            padding: hasContinue ? "3rem 0 4rem" : "6rem 0 5rem",
            textAlign: "center",
          }}
        >
          {hero}
        </section>

        {/* ── Featured Books ── */}
        {featuredSections.map((section, si) => (
          <section key={section.heading} style={{ marginTop: si === 0 ? 0 : "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                margin: "0.5rem 0 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, var(--color-border))" }} />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.375rem",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--color-accent)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {section.heading}
              </h2>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, var(--color-border))" }} />
            </div>
            {section.books.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                stats={statsMap[book.id]}
                progress={progressMap[book.id] ?? null}
                isLast={i === section.books.length - 1}
                courseInfo={courseForBook[book.id]}
              />
            ))}
          </section>
        ))}

        {/* ── Library divider ── */}
        <LibraryDivider />

        {/* ── Plans ── */}
        <PricingSection />
      </main>

      <PageFooter />
    </div>
  );
}

function ContinueSection({
  continueBook,
  continueProgress,
  continueStats,
  continueChapterCount,
  bookCourseInfo,
}: {
  continueBook: BookRow;
  continueProgress: { chapter_number: number; audio_position_ms: number };
  continueStats: { total_chars: number; total_duration_ms: number | null; chapter_count: number } | null;
  continueChapterCount: number;
  bookCourseInfo: { courseId: string; courseTitle: string } | null;
}) {
  const CHARS_PER_PAGE = 2200;
  const href = bookCourseInfo
    ? `/${bookCourseInfo.courseId}`
    : `/${continueBook.id}/${continueProgress.chapter_number}`;

  const progressFraction = continueChapterCount > 0
    ? (continueProgress.chapter_number - 1) / continueChapterCount
    : 0;
  const remainingFraction = 1 - progressFraction;

  const totalPages = continueStats ? Math.max(1, Math.round(continueStats.total_chars / CHARS_PER_PAGE)) : 0;
  const displayPages = Math.max(1, Math.round(totalPages * remainingFraction));
  const displayDuration = continueStats?.total_duration_ms
    ? Math.round(continueStats.total_duration_ms * remainingFraction)
    : null;
  const fmtDuration = (ms: number) => {
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <section
      style={{
        marginTop: "2.5rem",
        marginBottom: "2rem",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 0.75rem",
        }}
      >
        Last Read
      </p>
      <Link
        href={href}
        className="book-card-link"
        style={{ textDecoration: "none", display: "block" }}
      >
        {/* Header row: cover + title + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              width: 36,
              flexShrink: 0,
              aspectRatio: "3 / 4",
              borderRadius: "2px",
              overflow: "hidden",
              position: "relative",
              boxShadow:
                "1px 2px 6px rgba(0,0,0,0.1), 1px 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <Image
              src={getCoverSmUrl(continueBook.id)}
              alt={continueBook.title}
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              fontWeight: 400,
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
            }}
          >
            {continueBook.title}
          </h3>
          <span
            className="continue-cta"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "var(--color-accent)",
              padding: "0.375rem 0.875rem",
              borderRadius: "var(--radius)",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            Continue
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
          </span>
        </div>

        {/* Text preview */}
        <TextPreview
          bookId={continueBook.id}
          chapterNumber={continueProgress.chapter_number}
          audioPositionMs={continueProgress.audio_position_ms}
        />

        {/* Progress bar — full width, thin */}
        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 2,
              backgroundColor: "var(--color-border)",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(progressFraction * 100, 1)}%`,
                backgroundColor: "var(--color-accent)",
                borderRadius: 1,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.6875rem",
              color: "var(--color-text-secondary)",
              flexShrink: 0,
            }}
          >
            {displayPages} pages{displayDuration ? ` (${fmtDuration(displayDuration)})` : ""} left
          </span>
        </div>
      </Link>
    </section>
  );
}

function TextPreview({
  bookId,
  chapterNumber,
  audioPositionMs,
}: {
  bookId: string;
  chapterNumber: number;
  audioPositionMs: number;
}) {
  const [preview, setPreview] = useState<{ before: string; word: string; after: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/${bookId}/chapters/${chapterNumber}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const segments: { text: string; segment_type: string; audio_start_ms: number | null; audio_end_ms: number | null; word_timestamps: { start_ms: number; end_ms: number; char_start: number; char_end: number }[] | null }[] = data.segments ?? [];

        const textSegs = segments.filter((s) => s.segment_type === "text" && s.audio_start_ms != null);
        let segIdx = textSegs.findIndex(
          (s) => s.audio_start_ms! <= audioPositionMs && (s.audio_end_ms == null || s.audio_end_ms > audioPositionMs)
        );
        if (segIdx === -1) segIdx = 0;

        const seg = textSegs[segIdx];
        if (!seg) return;

        let wordCharStart = 0;
        let wordCharEnd = 0;
        if (seg.word_timestamps) {
          const wt = seg.word_timestamps.find(
            (w) => w.start_ms <= audioPositionMs && w.end_ms > audioPositionMs
          );
          if (wt) {
            wordCharStart = wt.char_start;
            wordCharEnd = wt.char_end;
          }
        }

        // Gather surrounding text — enough for 3 full lines
        const CONTEXT_CHARS = 300;
        const halfContext = Math.floor(CONTEXT_CHARS / 2);

        let fullText = "";
        const segOffsets: { start: number; end: number; segIdx: number }[] = [];
        for (let i = Math.max(0, segIdx - 8); i < Math.min(textSegs.length, segIdx + 9); i++) {
          const offset = fullText.length;
          fullText += (fullText ? " " : "") + textSegs[i].text;
          segOffsets.push({ start: offset + (offset > 0 ? 1 : 0), end: fullText.length, segIdx: i });
        }

        const curSegOffset = segOffsets.find((o) => o.segIdx === segIdx);
        if (!curSegOffset) return;
        const cursorInFull = curSegOffset.start + wordCharStart;
        const cursorEndInFull = curSegOffset.start + wordCharEnd;

        let windowStart = Math.max(0, cursorInFull - halfContext);
        let windowEnd = Math.min(fullText.length, cursorEndInFull + halfContext);

        // Snap to word boundaries
        if (windowStart > 0) {
          const space = fullText.indexOf(" ", windowStart);
          if (space !== -1 && space < cursorInFull) windowStart = space + 1;
        }
        if (windowEnd < fullText.length) {
          const space = fullText.lastIndexOf(" ", windowEnd);
          if (space > cursorEndInFull) windowEnd = space;
        }

        setPreview({
          before: fullText.slice(windowStart, cursorInFull),
          word: fullText.slice(cursorInFull, cursorEndInFull),
          after: fullText.slice(cursorEndInFull, windowEnd),
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookId, chapterNumber, audioPositionMs]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState<number | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const word = wordRef.current;
    if (!container || !word) return;

    const containerHeight = container.clientHeight;
    const wordTop = word.offsetTop;
    const wordHeight = word.offsetHeight;

    // Center the word vertically in the container
    const wordCenter = wordTop + wordHeight / 2;
    const targetCenter = containerHeight / 2;
    setOffset(wordCenter - targetCenter);
  }, []);

  // Measure after render and on resize
  useEffect(() => {
    if (!preview) return;
    // Wait a frame for layout
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [preview, measure]);

  if (!preview) return null;

  const lineHeight = 1.85;
  const containerHeight = `calc(var(--font-size-body) * ${lineHeight} * 3)`;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height: containerHeight,
        overflow: "hidden",
        marginTop: "0.75rem",
      }}
    >
      {/* Top fade */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2em",
          background: "linear-gradient(to bottom, var(--color-bg), transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "2em",
          background: "linear-gradient(to top, var(--color-bg), transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--font-size-body)",
          lineHeight,
          color: "var(--color-text)",
          margin: 0,
          transform: offset != null ? `translateY(-${offset}px)` : undefined,
        }}
      >
        {preview.before}
        <span
          ref={wordRef}
          style={{
            textDecoration: "underline",
            textDecorationColor: "var(--color-accent)",
            textUnderlineOffset: "3px",
          }}
        >
          {preview.word}
        </span>
        {preview.after}
      </p>
    </div>
  );
}

function LibraryDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        padding: "2.5rem 0 3rem",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to right, var(--color-border), transparent)",
        }}
      />
      <Link
        href="/library"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "#fff",
          textDecoration: "none",
          padding: "0.5rem 1.25rem",
          backgroundColor: "var(--color-accent)",
          borderRadius: "var(--radius)",
          whiteSpace: "nowrap",
          transition: "opacity 0.15s",
        }}
      >
        Browse Full Library
      </Link>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to left, var(--color-border), transparent)",
        }}
      />
    </div>
  );
}

function PricingSection() {
  return (
    <section style={{ marginBottom: "3rem" }}>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 0.75rem",
        }}
      >
        Plans
      </p>
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          fontFamily: "var(--font-ui)",
          fontSize: "0.875rem",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", fontWeight: 500, color: "var(--color-text-secondary)", textAlign: "left" }} />
              <th style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text)", textAlign: "center" }}>Basic</th>
              <th style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text)", textAlign: "center" }}>Plus</th>
              <th style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text)", textAlign: "center" }}>Premium</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>Text</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>Audio</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>5 min</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>AI Tutor</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>50 credits</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>250 credits</td>
              <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>{INF}</td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, color: "var(--color-text)", fontWeight: 500 }}>Price</td>
              <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "var(--color-text)" }}>Free</td>
              <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "var(--color-text)" }}>$1/mo</td>
              <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "var(--color-text)" }}>$6/mo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PageFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg)",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "1.5rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
          width: "100%",
          fontFamily: "var(--font-body)",
        }}
      >
        <span>&copy; 2026 Earmark FM</span>
        <a
          href="mailto:support@greatbooks.fm"
          style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          support@greatbooks.fm
        </a>
      </div>
    </footer>
  );
}

// ── Shared styles ──

const cellStyle = {
  padding: "0.75rem 1rem",
  color: "var(--color-text)",
} as const;

const INF = <span style={{ fontSize: "1.1em" }}>&infin;</span>;
