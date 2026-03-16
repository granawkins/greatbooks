"use client";

import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { getCoverSmUrl, getCoverLgUrl } from "@/lib/assets";
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
          const bookIds = courseBooks[course.id] ?? [];
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
                {/* Cover image with overlay */}
                <div style={{ position: "relative", width: "100%" }}>
                  {/* Desktop: fixed aspect ratio. Mobile: auto height cropped */}
                  <div
                    className="course-hero-img"
                    style={{ position: "relative", width: "100%", aspectRatio: "3 / 2" }}
                  >
                    <Image
                      src={getCoverLgUrl(course.id)}
                      alt={course.title}
                      fill
                      sizes="68ch"
                      className="object-cover"
                      priority
                    />
                    {/* Gradient overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)",
                      }}
                    />
                  </div>

                  {/* Content overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      padding: "1.5rem",
                    }}
                  >
                    {/* Text — left side */}
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                          }}
                        >
                          {course.description}
                        </p>
                      )}

                      {/* Mobile: book covers inline */}
                      {bookIds.length > 0 && (
                        <div
                          className="sm:hidden"
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginBottom: "1rem",
                          }}
                        >
                          {bookIds.map((bid) => (
                            <div
                              key={bid}
                              style={{
                                width: 48,
                                height: 64,
                                borderRadius: "3px",
                                overflow: "hidden",
                                position: "relative",
                                flexShrink: 0,
                                boxShadow: "2px 3px 8px rgba(0,0,0,0.3)",
                              }}
                            >
                              <Image
                                src={getCoverSmUrl(bid)}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
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

                    {/* Desktop: book covers stacked on right */}
                    {bookIds.length > 0 && (
                      <div
                        className="hidden sm:flex"
                        style={{
                          flexDirection: "column",
                          gap: "0.625rem",
                          marginLeft: "1.5rem",
                          flexShrink: 0,
                        }}
                      >
                        {bookIds.map((bid) => (
                          <div
                            key={bid}
                            style={{
                              width: 80,
                              height: 107,
                              borderRadius: "3px",
                              overflow: "hidden",
                              position: "relative",
                              boxShadow: "4px 6px 16px rgba(0,0,0,0.3)",
                            }}
                          >
                            <Image
                              src={getCoverSmUrl(bid)}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
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
