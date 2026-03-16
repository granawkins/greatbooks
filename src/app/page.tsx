import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function Home() {
  const allBooks = db.getBooks();
  const books = allBooks.filter((b) => b.type !== "course");
  const courses = allBooks.filter((b) => b.type === "course");
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const bookStats = db.getBookStats();

  const progressMap: Record<string, { chapter_number: number; audio_position_ms: number; updated_at: string }> = {};
  // progressRows are already ordered by updated_at DESC
  const recentBookIds: string[] = [];
  for (const r of progressRows) {
    progressMap[r.book_id] = { chapter_number: r.chapter_number, audio_position_ms: r.audio_position_ms, updated_at: r.updated_at };
    recentBookIds.push(r.book_id);
  }

  const statsMap: Record<string, { chapter_count: number; total_duration_ms: number | null }> = {};
  for (const s of bookStats) {
    statsMap[s.book_id] = { chapter_count: s.chapter_count, total_duration_ms: s.total_duration_ms };
  }

  return <HomeClient books={books} courses={courses} progressMap={progressMap} statsMap={statsMap} recentBookIds={recentBookIds} />;
}
