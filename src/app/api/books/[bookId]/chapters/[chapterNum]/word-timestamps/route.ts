import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Returns word-level timestamps for a chapter, keyed by segment id.
 * Loaded lazily by ChapterView after initial render to keep the SSR payload small.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; chapterNum: string }> }
) {
  const { bookId, chapterNum } = await params;
  const chapter = db.getChapter(bookId, Number(chapterNum));
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const segments = db.getSegments(chapter.id);
  const result: Record<number, unknown[]> = {};
  for (const seg of segments) {
    if (seg.word_timestamps) {
      result[seg.id] = JSON.parse(seg.word_timestamps);
    }
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
