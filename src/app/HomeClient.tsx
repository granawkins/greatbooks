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
              {/* Cover (only for non-course items) */}
              {!lastIsCourse && (
                <div
                  className="transition-transform duration-200 group-hover:scale-[1.02]"
                  style={{
                    width: "100px",
                    height: "133px",
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
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              )}

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
                  border: "1px solid var(--color-border)",
                  padding: "2rem",
                  transition: "border-color 0.15s",
                  background: "var(--color-bg-secondary)",
                }}
                className="group hover:border-[var(--color-text-secondary)]"
              >
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
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.75rem",
                    fontWeight: 400,
                    color: "var(--color-text)",
                    margin: "0 0 0.5rem",
                  }}
                >
                  {course.title}
                </h2>
                {course.description && (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "1rem",
                      color: "var(--color-text-secondary)",
                      margin: "0 0 1.25rem",
                      lineHeight: 1.6,
                      maxWidth: "40em",
                    }}
                  >
                    {course.description}
                  </p>
                )}
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1.25rem",
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-bg)",
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
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Chapter {courseProgress.chapter_number} of {courseStats.chapter_count}
                  </span>
                )}
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
