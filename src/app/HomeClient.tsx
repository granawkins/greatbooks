"use client";

import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { getCoverSmUrl } from "@/lib/assets";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

type ProgressMap = Record<string, { chapter_number: number; audio_position_ms: number; updated_at: string }>;
type StatsMap = Record<string, { chapter_count: number; total_duration_ms: number | null }>;

type CourseForBook = Record<string, { courseId: string; courseTitle: string }>;

export default function HomeClient({
  books,
  courses,
  progressMap,
  statsMap,
  recentBookIds,
  courseForBook,
}: {
  books: BookRow[];
  courses: BookRow[];
  progressMap: ProgressMap;
  statsMap: StatsMap;
  recentBookIds: string[];
  courseForBook: CourseForBook;
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="max-w-5xl mx-auto px-6 pt-10 pb-6">
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

      <main className="max-w-5xl mx-auto px-6" style={{ paddingBottom: session ? 220 : 64 }}>
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
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    margin: "4px 0 10px",
                  }}
                >
                  Ch. {continueProgress.chapter_number} of {continueChapterCount}
                </p>
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
                  transition: "transform 0.15s",
                }}
                className="group hover:scale-[1.005]"
              >
                {/* Background cover image */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2" }}>
                  <Image
                    src={getCoverSmUrl(course.id)}
                    alt={course.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 64rem"
                    className="object-cover"
                    priority
                  />
                  {/* Gradient overlay for text readability */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
                    }}
                  />
                  {/* Text overlay */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "1.5rem",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.7)",
                        margin: "0 0 0.25rem",
                      }}
                    >
                      Course
                    </p>
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        fontWeight: 400,
                        color: "#fff",
                        margin: "0 0 0.25rem",
                      }}
                    >
                      {course.title}
                    </h2>
                    {course.description && (
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.875rem",
                          color: "rgba(255,255,255,0.75)",
                          margin: "0 0 1rem",
                          lineHeight: 1.5,
                          maxWidth: "36em",
                        }}
                      >
                        {course.description}
                      </p>
                    )}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.5rem 1.25rem",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius)",
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {enrolled ? "Continue" : "Start Course"}
                    </span>
                    {enrolled && courseStats && courseProgress && (
                      <span
                        style={{
                          marginLeft: "1rem",
                          fontFamily: "var(--font-ui)",
                          fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        Chapter {courseProgress.chapter_number} of {courseStats.chapter_count}
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
