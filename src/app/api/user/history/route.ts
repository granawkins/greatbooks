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

  const items = progress.map((p) => {
    const stats = statsMap[p.book_id];
    return {
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
    };
  });

  return NextResponse.json(items);
}
