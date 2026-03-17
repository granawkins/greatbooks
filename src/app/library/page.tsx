import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import LibraryClient from "./LibraryClient";

export default async function LibraryPage() {
  const allBooks = db.getBooks();
  const books = allBooks.filter((b) => b.type !== "course");
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const bookStats = db.getBookStats();

  const progressMap: Record<string, { chapter_number: number }> = {};
  for (const r of progressRows) {
    progressMap[r.book_id] = { chapter_number: r.chapter_number };
  }

  const statsMap: Record<string, { chapter_count: number; total_duration_ms: number | null; total_chars: number }> = {};
  for (const s of bookStats) {
    statsMap[s.book_id] = { chapter_count: s.chapter_count, total_duration_ms: s.total_duration_ms, total_chars: s.total_chars };
  }

  return <LibraryClient books={books} statsMap={statsMap} progressMap={progressMap} />;
}
