import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json([]);
  }

  const progress = db.getProgressWithBooks(userId);
  const allStats = db.getBookStats();
  const statsMap = Object.fromEntries(allStats.map((s) => [s.book_id, s]));

  const items: {
    book_id: string;
    title: string;
    author: string;
    type: string;
    chapter_number: number;
    audio_position_ms: number;
    updated_at: string;
    stats: { total_chars: number; total_duration_ms: number | null; chapter_count: number } | null;
    course?: { id: string; title: string };
  }[] = [];

  for (const p of progress) {
    if (p.type === "course") {
      // Expand course into individual source book entries
      const courseSourceBooks = db.getCourseSourceBooksUpTo(p.book_id, p.chapter_number);
      for (const sb of courseSourceBooks) {
        const stats = statsMap[sb.book_id];
        items.push({
          book_id: sb.book_id,
          title: sb.title,
          author: sb.author,
          type: "book",
          chapter_number: p.chapter_number,
          audio_position_ms: p.audio_position_ms,
          updated_at: p.updated_at,
          stats: stats ? {
            total_chars: stats.total_chars,
            total_duration_ms: stats.total_duration_ms,
            chapter_count: stats.chapter_count,
          } : null,
          course: { id: p.book_id, title: p.title },
        });
      }
    } else {
      const stats = statsMap[p.book_id];
      items.push({
        book_id: p.book_id,
        title: p.title,
        author: p.author,
        type: p.type,
        chapter_number: p.chapter_number,
        audio_position_ms: p.audio_position_ms,
        updated_at: p.updated_at,
        stats: stats ? {
          total_chars: stats.total_chars,
          total_duration_ms: stats.total_duration_ms,
          chapter_count: stats.chapter_count,
        } : null,
      });
    }
  }

  return NextResponse.json(items);
}
