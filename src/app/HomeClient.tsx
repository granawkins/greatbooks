"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import ProgressLine from "@/components/ProgressLine";
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

  return props.variant === "a" ? <VariantA {...props} /> : <VariantB {...props} />;
}

// ── Shared helpers ──

const CHARS_PER_PAGE = 2200;

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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
// VARIANT A — "Long Walks with Old Books"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VariantA({ courses, progressMap, statsMap, recentBookIds, courseForBook, books, isLoggedIn }: HomeProps) {
  const { session } = useAudioSession();
  const { openBookDetails, setMaps } = useBookDetailsModal();

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
  const continueBook = lastBook;
  const continueProgress = continueBook ? progressMap[continueBook.id] : null;
  const continueStats = continueBook ? statsMap[continueBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = lastBookId ? courseForBook[lastBookId] : null;

  const showHero = !isLoggedIn || !continueBook || !continueProgress;
  const featuredSections = getFeaturedSections(books, statsMap);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Hero ── */}
      {showHero && (
        <section
          style={{
            padding: "4rem 1.5rem 3rem",
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
          }}
        >
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
        </section>
      )}

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <ContinueSection
            continueBook={continueBook}
            continueProgress={continueProgress}
            continueStats={continueStats}
            continueChapterCount={continueChapterCount}
            bookCourseInfo={bookCourseInfo}
            showHero={showHero}
          />
        )}

        {/* ── Featured Books ── */}
        {featuredSections.map((section, si) => (
          <section key={section.heading} style={{ marginTop: si === 0 && showHero && !continueProgress ? 0 : "2rem" }}>
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
              <FeaturedBookCard
                key={book.id}
                book={book}
                stats={statsMap[book.id]}
                progress={progressMap[book.id] ?? null}
                isLast={i === section.books.length - 1}
                courseForBook={courseForBook}
              />
            ))}
          </section>
        ))}

        {/* ── Library divider ── */}
        <LibraryDivider />

        {/* ── Pricing ── */}
        <PricingSection />
      </main>

      <PageFooter />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VARIANT B — "A Classics Education for $1/mo"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VariantB({ courses, progressMap, statsMap, recentBookIds, courseForBook, books, isLoggedIn }: HomeProps) {
  const { session } = useAudioSession();
  const { openBookDetails, setMaps } = useBookDetailsModal();

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
  const continueBook = lastBook;
  const continueProgress = continueBook ? progressMap[continueBook.id] : null;
  const continueStats = continueBook ? statsMap[continueBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = lastBookId ? courseForBook[lastBookId] : null;

  const showHero = !isLoggedIn || !continueBook || !continueProgress;
  const featuredSections = getFeaturedSections(books, statsMap);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Hero ── */}
      {showHero && (
        <section
          style={{
            padding: "4rem 1.5rem 2rem",
            maxWidth: "var(--content-max-width)",
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
          }}
        >
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
        </section>
      )}

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <ContinueSection
            continueBook={continueBook}
            continueProgress={continueProgress}
            continueStats={continueStats}
            continueChapterCount={continueChapterCount}
            bookCourseInfo={bookCourseInfo}
            showHero={showHero}
          />
        )}

        {/* ── Featured Books ── */}
        {featuredSections.map((section, si) => (
          <section key={section.heading} style={{ marginTop: si === 0 && showHero && !continueProgress ? "1rem" : "2rem" }}>
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
              <FeaturedBookCard
                key={book.id}
                book={book}
                stats={statsMap[book.id]}
                progress={progressMap[book.id] ?? null}
                isLast={i === section.books.length - 1}
                courseForBook={courseForBook}
              />
            ))}
          </section>
        ))}

        {/* ── Library divider ── */}
        <LibraryDivider />

        {/* ── Pricing ── */}
        <PricingSection />
      </main>

      <PageFooter />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ContinueSection({
  continueBook,
  continueProgress,
  continueStats,
  continueChapterCount,
  bookCourseInfo,
  showHero,
}: {
  continueBook: BookRow;
  continueProgress: { chapter_number: number; audio_position_ms: number };
  continueStats: { total_chars: number; total_duration_ms: number | null; chapter_count: number } | null;
  continueChapterCount: number;
  bookCourseInfo: { courseId: string; courseTitle: string } | null;
  showHero: boolean;
}) {
  return (
    <section style={{ marginBottom: "2.5rem", marginTop: !showHero ? "2.5rem" : undefined }}>
      <h2 style={sectionHeadingStyle}>Continue</h2>
      <Link
        href={bookCourseInfo
          ? `/${bookCourseInfo.courseId}`
          : `/${continueBook.id}/${continueProgress.chapter_number}`
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "133px",
            flexShrink: 0,
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Image
            src={getCoverSmUrl(continueBook.id)}
            alt={continueBook.title}
            fill
            sizes="100px"
            className="object-cover"
          />
        </div>
        <div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.1rem",
              fontWeight: 500,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            {continueBook.title}
          </p>
          {bookCourseInfo && (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.75rem",
                color: "var(--color-accent)",
                margin: "2px 0 0",
              }}
            >
              {bookCourseInfo.courseTitle}
            </p>
          )}
          <div style={{ color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            <ProgressLine
              totalChars={continueStats?.total_chars ?? 0}
              totalDurationMs={continueStats?.total_duration_ms ?? null}
              chapterCount={continueChapterCount}
              progressChapter={continueProgress?.chapter_number}
              barWidth="140px"
            />
          </div>
        </div>
      </Link>
    </section>
  );
}

function FeaturedBookCard({
  book,
  stats,
  progress,
  isLast,
  courseForBook,
}: {
  book: BookRow;
  stats: StatsMap[string];
  progress: ProgressMap[string] | null;
  isLast: boolean;
  courseForBook: CourseForBook;
}) {
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

  const courseInfo = courseForBook[book.id];
  const href = courseInfo
    ? `/${courseInfo.courseId}`
    : inProgress
      ? `/${book.id}/${progress!.chapter_number}`
      : `/${book.id}/1`;

  return (
    <Link
      href={href}
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

          {/* Stats/Progress + Open button */}
          <div className="book-card-actions">
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
              {inProgress ? "Continue" : "Open"}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
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
      <h2 style={sectionHeadingStyle}>Pricing</h2>
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
          padding: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
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

const sectionHeadingStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 400,
  color: "var(--color-text)",
  marginBottom: "1rem",
} as const;

const cellStyle = {
  padding: "0.75rem 1rem",
  color: "var(--color-text)",
} as const;

const INF = <span style={{ fontSize: "1.1em" }}>&infin;</span>;
