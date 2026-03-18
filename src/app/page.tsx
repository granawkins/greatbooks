import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;

  // ── A/B variant assignment ──
  const cookieStore = await cookies();
  let variant: "a" | "b";
  const paramV = typeof params.v === "string" ? params.v : null;
  if (paramV === "a" || paramV === "b") {
    variant = paramV;
  } else {
    const stored = cookieStore.get("ab_home")?.value;
    if (stored === "a" || stored === "b") {
      variant = stored;
    } else {
      variant = crypto.randomBytes(1)[0] % 2 === 0 ? "a" : "b";
    }
  }

  // ── Data fetching ──
  const allBooks = db.getBooks();
  const books = allBooks.filter((b) => b.type !== "course");
  const courses = allBooks.filter((b) => b.type === "course");
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const bookStats = db.getBookStats();

  const progressMap: Record<string, { chapter_number: number; audio_position_ms: number; updated_at: string }> = {};
  const recentBookIds: string[] = [];
  for (const r of progressRows) {
    progressMap[r.book_id] = { chapter_number: r.chapter_number, audio_position_ms: r.audio_position_ms, updated_at: r.updated_at };
    recentBookIds.push(r.book_id);
  }

  const statsMap: Record<string, { chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number }> = {};
  for (const s of bookStats) {
    statsMap[s.book_id] = { chapter_count: s.chapter_count, total_duration_ms: s.total_duration_ms, total_chars: s.total_chars, discussion_count: s.discussion_count };
  }

  const courseForBook: Record<string, { courseId: string; courseTitle: string }> = {};
  if (userId) {
    for (const book of books) {
      const enrolled = db.getEnrolledCourseForBook(userId, book.id);
      if (enrolled) {
        courseForBook[book.id] = { courseId: enrolled.courseId, courseTitle: enrolled.courseTitle };
      }
    }
  }

  const courseBooks: Record<string, string[]> = {};
  for (const course of courses) {
    courseBooks[course.id] = db.getCourseBookIds(course.id);
  }

  return (
    <HomeClient
      variant={variant}
      books={books}
      courses={courses}
      progressMap={progressMap}
      statsMap={statsMap}
      recentBookIds={recentBookIds}
      courseForBook={courseForBook}
      courseBooks={courseBooks}
      isLoggedIn={!!userId}
    />
  );
}
