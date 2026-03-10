import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function Home() {
  const books = db.getBooks();
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];

  const progressMap: Record<string, { chapter_number: number }> = {};
  for (const r of progressRows) {
    progressMap[r.book_id] = { chapter_number: r.chapter_number };
  }

  return <HomeClient books={books} progressMap={progressMap} />;
}
