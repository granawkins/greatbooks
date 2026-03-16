"use client";

import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { getCoverSmUrl, getCoverLgUrl } from "@/lib/assets";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

type ProgressMap = Record<string, { chapter_number: number; audio_position_ms: number; updated_at: string }>;
type StatsMap = Record<string, { chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number }>;

type CourseForBook = Record<string, { courseId: string; courseTitle: string }>;

function fmtDur(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function HeadphonesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-1px", flexShrink: 0 }}>
      <path d="M2 10V8a6 6 0 1 1 12 0v2" />
      <rect x="1" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
  const continueProgressFraction =
    continueProgress && continueChapterCount > 0
      ? (continueProgress.chapter_number - 1) / continueChapterCount
      : 0;
  const bookCourseInfo = !lastIsCourse && lastBookId ? courseForBook[lastBookId] : null;

  // Stats for continue section
  const continueRemaining = (() => {
    if (!continueStats || !continueProgress || continueChapterCount === 0) return null;
    const totalPages = Math.max(1, Math.round(continueStats.total_chars / 1500));
    const remainFrac = 1 - (continueProgress.chapter_number - 1) / continueChapterCount;
    const remPages = Math.max(1, Math.round(totalPages * remainFrac));
    const remDurationMs = continueStats.total_duration_ms ? Math.round(continueStats.total_duration_ms * remainFrac) : null;
    return { pages: remPages, durationMs: remDurationMs };
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header style={{ maxWidth: "68ch", margin: "0 auto", padding: "2.5rem 1.5rem 1.5rem" }}>
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

      <main style={{ maxWidth: "68ch", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64 }}>
        {/* Continue — most recently read item (book or course) */}
        {continueBook && continueProgress && (
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 400,
                color: "var(--color-text)",
                marginBottom: "1rem",
              }}
            >
              Continue
            </h2>
            <Link
              href={bookCourseInfo
                ? `/${bookCourseInfo.courseId}`
                : `/${continueBook.id}/${continueProgress.chapter_number}`
              }
              className="group"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                textDecoration: "none",
              }}
            >
              {/* Cover */}
              <div
                className="transition-transform duration-200 group-hover:scale-[1.02]"
                style={{
                  width: lastIsCourse ? "160px" : "100px",
                  height: lastIsCourse ? "107px" : "133px",
                  flexShrink: 0,
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow:
                    "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08)",
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

              {/* Info */}
              <div>
                {lastIsCourse && (
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
                )}
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
                {continueRemaining && (
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                      margin: "4px 0 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <span style={{ fontStyle: "italic", opacity: 0.7 }}>Remaining</span>
                    <span>{continueRemaining.pages} pages</span>
                    {continueRemaining.durationMs != null && continueRemaining.durationMs > 0 && (
                      <>
                        <HeadphonesIcon />
                        <span>{fmtDur(continueRemaining.durationMs)}</span>
                      </>
                    )}
                  </p>
                )}
                {/* Progress bar */}
                <div
                  style={{
                    width: "140px",
                    height: "3px",
                    backgroundColor: "var(--color-border)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(continueProgressFraction * 100, 2)}%`,
                      backgroundColor: "var(--color-accent)",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Courses */}
        {courses.map((course) => {
          const enrolled = !!progressMap[course.id];
          const courseStats = statsMap[course.id];
          const courseProgress = progressMap[course.id];
          const bookIds = courseBooks[course.id] ?? [];
          const courseChapterCount = courseStats?.chapter_count ?? 0;
          const courseProgressFraction =
            enrolled && courseProgress && courseChapterCount > 0
              ? (courseProgress.chapter_number - 1) / courseChapterCount
              : 0;
          return (
            <section key={course.id} style={{ marginBottom: "3rem" }}>
              <Link
                href={enrolled ? `/${course.id}` : `/${course.id}/contents`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  position: "relative",
                  backgroundImage: `url(${getCoverLgUrl(course.id)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className="group hover:scale-[1.005]"
              >
                {/* Subtle overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.25)",
                  }}
                />

                {/* Content — centered */}
                <div
                  style={{
                    position: "relative",
                    textAlign: "center",
                    padding: "2rem 1.5rem",
                  }}
                >
                  {/* Course label */}
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      margin: "0 0 0.25rem",
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    Course
                  </p>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.5rem",
                      fontWeight: 400,
                      color: "#fff",
                      margin: "0 0 1.25rem",
                      textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                    }}
                  >
                    {course.title}
                  </h2>

                  {/* Book covers — side by side, centered, shrink on mobile */}
                  {bookIds.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "1rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      {bookIds.map((bid) => (
                        <div
                          key={bid}
                          className="transition-transform duration-200 group-hover:scale-[1.02]"
                          style={{
                            width: "min(140px, calc((100% - " + (bookIds.length - 1) + "rem) / " + bookIds.length + "))",
                            aspectRatio: "3 / 4",
                            borderRadius: "3px",
                            overflow: "hidden",
                            position: "relative",
                            flexShrink: 1,
                            boxShadow: "4px 6px 16px rgba(0,0,0,0.3)",
                          }}
                        >
                          <Image
                            src={getCoverSmUrl(bid)}
                            alt=""
                            fill
                            sizes="140px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom row: CTA button left, progress right */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "1rem",
                    }}
                  >
                    {/* CTA button */}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.5rem 1.25rem",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        color: "#1a1a1a",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      {enrolled ? "Continue" : "Join"}
                    </span>

                    {/* Progress info */}
                    {enrolled && courseProgress ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: "0.75rem",
                            color: "rgba(255,255,255,0.8)",
                            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                          }}
                        >
                          {(() => {
                            const cs = courseStats;
                            if (!cs) return null;
                            const totalPages = Math.max(1, Math.round(cs.total_chars / 1500));
                            const remFrac = 1 - (courseProgress.chapter_number - 1) / courseChapterCount;
                            const remPages = Math.max(1, Math.round(totalPages * remFrac));
                            const remDur = cs.total_duration_ms ? Math.round(cs.total_duration_ms * remFrac) : null;
                            return (
                              <>
                                <span style={{ fontStyle: "italic", opacity: 0.7 }}>Remaining</span>
                                <span>{remPages} pages</span>
                                {remDur != null && remDur > 0 && (
                                  <>
                                    <HeadphonesIcon />
                                    <span>{fmtDur(remDur)}</span>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </span>
                        <div
                          style={{
                            width: "120px",
                            height: "3px",
                            backgroundColor: "rgba(255,255,255,0.3)",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.max(courseProgressFraction * 100, 2)}%`,
                              backgroundColor: "rgba(255,255,255,0.9)",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.8)",
                          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        {(() => {
                          const cs = courseStats;
                          if (!cs) return `${courseChapterCount} chapters`;
                          const totalPages = Math.max(1, Math.round(cs.total_chars / 1500));
                          return (
                            <>
                              <span>{totalPages} pages</span>
                              {cs.total_duration_ms != null && cs.total_duration_ms > 0 && (
                                <>
                                  <HeadphonesIcon />
                                  <span>{fmtDur(cs.total_duration_ms)}</span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </section>
          );
        })}

        {/* All books */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progress={progressMap[book.id] ?? null}
              stats={statsMap[book.id] ?? null}
              courseInfo={courseForBook[book.id] ?? null}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
