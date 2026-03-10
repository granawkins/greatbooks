import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; chapterNum: string }> }
) {
  const { bookId, chapterNum } = await params;
  const chapter = db.getChapter(bookId, Number(chapterNum));
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const segments = db.getSegments(chapter.id).map((seg) => ({
    id: seg.id,
    text: seg.text,
    segment_type: seg.segment_type,
    audio_start_ms: seg.audio_start_ms,
    audio_end_ms: seg.audio_end_ms,
    word_timestamps: seg.word_timestamps ? JSON.parse(seg.word_timestamps) : null,
  }));

  return NextResponse.json(
    {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      segments,
      audio_file: chapter.audio_file,
      audio_duration_ms: chapter.audio_duration_ms,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
