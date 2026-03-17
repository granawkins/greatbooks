"use client";

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

const sectionHeadingStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 400,
  color: "var(--color-text)",
  marginBottom: "1rem",
} as const;

export default function HomeClient({
  books,
  courses,
  progressMap,
  statsMap,
  recentBookIds,
  courseForBook,
  courseBooks,
}: {
  books: BookRow[];
  courses: BookRow[];
  progressMap: ProgressMap;
  statsMap: StatsMap;
  recentBookIds: string[];
  courseForBook: CourseForBook;
  courseBooks: Record<string, string[]>;
}) {
  const { session } = useAudioPlayer();

  // Find the most recently read item (book or course)
  const allItems = [...books, ...courses];
  const allById = Object.fromEntries(allItems.map((b) => [b.id, b]));
  const lastId = recentBookIds.find((id) => allById[id]) ?? null;
  const lastItem = lastId ? allById[lastId] : null;
  const lastIsCourse = lastItem?.type === "course";

  // For standalone books, find the last non-course book
  const booksById = Object.fromEntries(books.map((b) => [b.id, b]));
  const lastBookId = recentBookIds.find((id) => booksById[id]) ?? null;
  const lastBook = lastBookId ? booksById[lastBookId] : null;

  // Course context for the continue section
  const continueBook = lastIsCourse ? lastItem : lastBook;
  const continueProgress = continueBook ? progressMap[continueBook.id] : null;
  const continueStats = continueBook ? statsMap[continueBook.id] ?? null : null;
  const continueChapterCount = continueStats?.chapter_count ?? 0;
  const bookCourseInfo = !lastIsCourse && lastBookId ? courseForBook[lastBookId] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "2.5rem 1.5rem 1.5rem", width: "100%" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 400,
            color: "var(--color-text-secondary)",
            fontStyle: "italic",
          }}
        >
          Classic literature, reimagined for reading, listening, and exploring.
        </p>
      </header>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64, width: "100%", flex: 1 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <section style={{ marginBottom: "3rem" }}>
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
                  width: lastIsCourse ? "160px" : "100px",
                  height: lastIsCourse ? "107px" : "133px",
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
                  sizes={lastIsCourse ? "160px" : "100px"}
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
                    In: {bookCourseInfo.courseTitle}
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

const cellStyle = {
  padding: "0.75rem 1rem",
  color: "var(--color-text)",
} as const;

const INF = <span style={{ fontSize: "1.1em" }}>&infin;</span>;
