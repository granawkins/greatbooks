"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import ProgressLine from "@/components/ProgressLine";
import { getCoverSmUrl, getCoverLgUrl } from "@/lib/assets";
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
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "2.5rem 1.5rem 1.5rem" }}>
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

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 1.5rem", paddingBottom: session ? 220 : 64 }}>

        {/* ── Continue ── */}
        {continueBook && continueProgress && (
          <section style={{ marginBottom: "3rem" }}>
            <h2 style={sectionHeadingStyle}>Continue</h2>
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
              <div
                className="transition-transform duration-200 group-hover:scale-[1.02]"
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
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {courses.map((course) => {
                const enrolled = !!progressMap[course.id];
                const courseStats = statsMap[course.id];
                const courseProgress = progressMap[course.id];
                const bookIds = courseBooks[course.id] ?? [];
                const courseChapterCount = courseStats?.chapter_count ?? 0;
                return (
                  <Link
                    key={course.id}
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
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.25)",
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        textAlign: "center",
                        padding: "2rem 1.5rem",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.5rem",
                          fontWeight: 400,
                          color: "#fff",
                          margin: 0,
                          textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                        }}
                      >
                        {course.title}
                      </h3>

                      {course.description && (
                        <p
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "0.875rem",
                            color: "rgba(255,255,255,0.85)",
                            margin: "0.5rem 0 1.25rem",
                            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
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

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "1rem",
                        }}
                      >
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
                        <div style={{
                          color: "rgba(255,255,255,0.8)",
                          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                        }}>
                          <ProgressLine
                            totalChars={courseStats?.total_chars ?? 0}
                            totalDurationMs={courseStats?.total_duration_ms ?? null}
                            chapterCount={courseChapterCount}
                            progressChapter={enrolled && courseProgress ? courseProgress.chapter_number : undefined}
                            barTrackColor="rgba(255,255,255,0.3)"
                            barFillColor="rgba(255,255,255,0.9)"
                            barWidth="120px"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Library ── */}
        <section>
          <h2 style={sectionHeadingStyle}>Library</h2>
          <BooksGrid books={books} statsMap={statsMap} />
        </section>
      </main>
    </div>
  );
}

function PagesIcon() {
  return (
    <svg width="0.85em" height="0.85em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-0.05em" }}>
      <rect x="4" y="1" width="9" height="12" rx="1" />
      <rect x="3" y="3" width="9" height="12" rx="1" fill="var(--color-bg, #fff)" />
      <rect x="3" y="3" width="9" height="12" rx="1" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="0.85em" height="0.85em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-0.05em" }}>
      <path d="M2 10V8a6 6 0 1 1 12 0v2" />
      <rect x="1" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatHours(ms: number): string {
  const hours = Math.round(ms / 3600000);
  return hours < 1 ? "<1h" : `${hours}h`;
}

function BooksGrid({ books, statsMap }: { books: BookRow[]; statsMap: StatsMap }) {
  const [search, setSearch] = useState("");
  const query = search.toLowerCase().trim();
  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query)
      )
    : books;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by title or author..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          marginBottom: "1.25rem",
          fontFamily: "var(--font-ui)",
          fontSize: "0.875rem",
          color: "var(--color-text)",
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          outline: "none",
        }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-6">
        {filtered.map((book) => {
          const stats = statsMap[book.id];
          const totalPages = stats ? Math.max(1, Math.round(stats.total_chars / 1500)) : 0;
          const hasDuration = stats?.total_duration_ms != null && stats.total_duration_ms > 0;
          return (
            <Link key={book.id} href={`/${book.id}`} className="block group">
              <div
                className="relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]"
                style={{
                  aspectRatio: "3 / 4",
                  borderRadius: "3px",
                  boxShadow:
                    "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08), inset -1px 0 2px rgba(0,0,0,0.04)",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                <Image
                  src={getCoverSmUrl(book.id)}
                  alt={`${book.title} cover`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              {totalPages > 0 && (
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                    marginTop: "0.375rem",
                  }}
                >
                  <PagesIcon />{totalPages}{hasDuration && <>{" \u00a0 "}<HeadphonesIcon />{formatHours(stats!.total_duration_ms!)}</>}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
