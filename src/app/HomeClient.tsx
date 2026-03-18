"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import BookCover from "@/components/BookCover";
import ProgressLine from "@/components/ProgressLine";
import { getCoverSmUrl } from "@/lib/assets";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

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

export default function HomeClient(props: HomeProps) {
  // Persist variant to cookie on mount
  useEffect(() => {
    document.cookie = `ab_home=${props.variant};path=/;max-age=${60 * 60 * 24 * 90};samesite=lax`;
  }, [props.variant]);

  return props.variant === "a" ? <VariantA {...props} /> : <VariantB {...props} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VARIANT A — "Long Walks with Old Books"
// Persona: 30-45, podcast listener, walker/commuter. Values beauty & contemplation.
// Tone: Warm, literary, lifestyle. Emphasis on the listening experience.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VariantA({ courses, progressMap, statsMap, courseBooks, recentBookIds, courseForBook, books, isLoggedIn }: HomeProps) {
  const { session } = useAudioPlayer();

  // Continue reading logic — always prefer the book (not the course)
  const booksById = Object.fromEntries(books.map((b) => [b.id, b]));
  const lastBookId = recentBookIds.find((id) => booksById[id]) ?? null;
  const lastBook = lastBookId ? booksById[lastBookId] : null;
  const continueBook = lastBook;
  const continueProgress = continueBook ? progressMap[continueBook.id] : null;
  const continueStats = continueBook ? statsMap[continueBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = lastBookId ? courseForBook[lastBookId] : null;

  const showHero = !isLoggedIn || !continueBook || !continueProgress;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Hero (hidden for logged-in users with progress) ── */}
      {showHero && (
        <>
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
                margin: "0 auto 2rem",
                fontStyle: "italic",
              }}
            >
              Listen to Homer, Plato, and Milton — beautifully narrated, with an AI tutor at your side.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href={courses[0] ? `/${courses[0].id}/contents` : "/library"}
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  backgroundColor: "var(--color-text)",
                  color: "var(--color-bg)",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                Start Listening
              </Link>
              <Link
                href="/library"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Browse Library
              </Link>
            </div>
          </section>

          {/* ── How it works ── */}
          <section
            style={{
              maxWidth: "var(--content-max-width)",
              margin: "0 auto",
              padding: "0 1.5rem 3rem",
              width: "100%",
            }}
          >
            {/* Desktop: 3-col grid */}
            <div className="feature-grid-desktop" style={{ textAlign: "center" }}>
              {[
                { num: "1", title: "Read", desc: "Clean, distraction-free text of the world's greatest books." },
                { num: "2", title: "Listen", desc: "AI-narrated audio that syncs with the page as you walk." },
                { num: "3", title: "Ask", desc: "An AI tutor who knows the text and answers your questions." },
              ].map((step) => (
                <div key={step.num}>
                  <div
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      border: "1.5px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 0.625rem",
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9375rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.125rem",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <section style={{ marginBottom: "3rem", marginTop: !showHero ? "2.5rem" : undefined }}>
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
        )}

        {/* ── Courses ── */}
        {courses.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <h2 style={sectionHeadingStyle}>Courses</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {courses.map((course) => {
                const enrolled = !!progressMap[course.id];
                const bookIds = courseBooks[course.id] ?? [];
                return (
                  <Link
                    key={course.id}
                    href={enrolled ? `/${course.id}` : `/${course.id}/contents`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--color-bg-secondary)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                      padding: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.25rem",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        margin: 0,
                      }}
                    >
                      {course.title}
                    </h3>

                    {course.description && (
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: "var(--color-text-secondary)",
                          margin: "0.375rem 0 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {course.description}
                      </p>
                    )}

                    {bookIds.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "0.75rem",
                          marginTop: "1rem",
                        }}
                      >
                        {bookIds.map((bid) => {
                          const bookStats = statsMap[bid];
                          const bookProgress = progressMap[bid];
                          return (
                            <div key={bid} style={{ width: "140px" }}>
                              <BookCover
                                bookId={bid}
                                stats={bookStats ? {
                                  total_chars: bookStats.total_chars,
                                  total_duration_ms: bookStats.total_duration_ms,
                                  chapter_count: bookStats.chapter_count,
                                } : null}
                                progress={bookProgress ? { chapter_number: bookProgress.chapter_number } : null}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.5rem 1.25rem",
                          backgroundColor: "var(--color-text)",
                          color: "var(--color-bg)",
                          borderRadius: "var(--radius)",
                          fontFamily: "var(--font-ui)",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                        }}
                      >
                        {enrolled ? "Continue" : "Read with AI Tutor"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Pricing ── */}
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
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>5 min</td>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>5 min</td>
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
      </main>

      {/* ── Footer ── */}
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
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VARIANT B — "A Classics Education for $1/mo"
// Persona: 25-40, ambitious, self-improvement. Wants to be well-read.
// Tone: Direct, confident, value-anchored. The price is the hook.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VariantB({ courses, progressMap, statsMap, courseBooks, recentBookIds, courseForBook, books, isLoggedIn }: HomeProps) {
  const { session } = useAudioPlayer();

  // Continue reading logic — always prefer the book (not the course)
  const booksById = Object.fromEntries(books.map((b) => [b.id, b]));
  const lastBookId = recentBookIds.find((id) => booksById[id]) ?? null;
  const lastBook = lastBookId ? booksById[lastBookId] : null;
  const continueBook = lastBook;
  const continueProgress = continueBook ? progressMap[continueBook.id] : null;
  const continueStats = continueBook ? statsMap[continueBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = lastBookId ? courseForBook[lastBookId] : null;

  const showHero = !isLoggedIn || !continueBook || !continueProgress;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Hero (hidden for logged-in users with progress) ── */}
      {showHero && (
        <>
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
                margin: "0 auto 2rem",
              }}
            >
              Read the great books, listen on the go, and discuss them with an AI tutor who knows every line. Free to start.
            </p>
            <Link
              href={courses[0] ? `/${courses[0].id}/contents` : "/library"}
              style={{
                display: "inline-block",
                padding: "0.75rem 2.5rem",
                backgroundColor: "var(--color-text)",
                color: "var(--color-bg)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-ui)",
                fontSize: "0.9375rem",
                fontWeight: 500,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              Start Reading — Free
            </Link>
          </section>

          {/* ── What you get ── */}
          <section
            style={{
              maxWidth: "var(--content-max-width)",
              margin: "0 auto",
              padding: "1.5rem 1.5rem 3rem",
              width: "100%",
            }}
          >
            {/* Desktop: 3-col grid with icons */}
            <div
              className="feature-grid-desktop"
              style={{
                backgroundColor: "var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                gap: "1px",
              }}
            >
              {[
                { icon: "book", title: "Every Text, Free", desc: "Full public-domain texts — Iliad, Republic, Paradise Lost — clean and ad-free." },
                { icon: "headphones", title: "Audio Narration", desc: "AI-narrated chapters with word-level sync. Read along or just listen." },
                { icon: "chat", title: "AI Tutor", desc: "Ask questions about any passage. Get context, analysis, connections." },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    padding: "1.25rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                    {item.icon === "book" && <BookIcon />}
                    {item.icon === "headphones" && <HeadphonesIconLg />}
                    {item.icon === "chat" && <ChatIconLg />}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.0625rem",
                      fontWeight: 500,
                      color: "var(--color-text)",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <section style={{ marginBottom: "3rem", marginTop: !showHero ? "2.5rem" : undefined }}>
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
        )}

        {/* ── Courses ── */}
        {courses.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <h2 style={sectionHeadingStyle}>Courses</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {courses.map((course) => {
                const enrolled = !!progressMap[course.id];
                const bookIds = courseBooks[course.id] ?? [];
                return (
                  <Link
                    key={course.id}
                    href={enrolled ? `/${course.id}` : `/${course.id}/contents`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--color-bg-secondary)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                      padding: "1.5rem",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.25rem",
                        fontWeight: 500,
                        color: "var(--color-text)",
                        margin: 0,
                      }}
                    >
                      {course.title}
                    </h3>

                    {course.description && (
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: "var(--color-text-secondary)",
                          margin: "0.375rem 0 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {course.description}
                      </p>
                    )}

                    {bookIds.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "0.75rem",
                          marginTop: "1rem",
                        }}
                      >
                        {bookIds.map((bid) => {
                          const bookStats = statsMap[bid];
                          const bookProgress = progressMap[bid];
                          return (
                            <div key={bid} style={{ width: "140px" }}>
                              <BookCover
                                bookId={bid}
                                stats={bookStats ? {
                                  total_chars: bookStats.total_chars,
                                  total_duration_ms: bookStats.total_duration_ms,
                                  chapter_count: bookStats.chapter_count,
                                } : null}
                                progress={bookProgress ? { chapter_number: bookProgress.chapter_number } : null}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.5rem 1.25rem",
                          backgroundColor: "var(--color-text)",
                          color: "var(--color-bg)",
                          borderRadius: "var(--radius)",
                          fontFamily: "var(--font-ui)",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                        }}
                      >
                        {enrolled ? "Continue" : "Read with AI Tutor"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Pricing ── */}
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
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>5 min</td>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-text-secondary)" }}>5 min</td>
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
      </main>

      {/* ── Footer ── */}
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
    </div>
  );
}

// ── Shared ──

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

// ── Icons for Variant B ──

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function HeadphonesIconLg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function ChatIconLg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
