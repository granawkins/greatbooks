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

  const segments = db.getSegments(chapter.id);

  // Group segments into paragraphs by group_number
  const paragraphs: { text: string; segment_ids: number[] }[] = [];
  let currentGroup: number | null = null;
  let currentSentences: string[] = [];
  let currentIds: number[] = [];

  for (const seg of segments) {
    if (seg.segment_type !== "text") continue;

    if (seg.group_number !== currentGroup) {
      if (currentSentences.length > 0) {
        paragraphs.push({
          text: currentSentences.join(" "),
          segment_ids: currentIds,
        });
      }
      currentGroup = seg.group_number;
      currentSentences = [seg.text];
      currentIds = [seg.id];
    } else {
      currentSentences.push(seg.text);
      currentIds.push(seg.id);
    }
  }
  if (currentSentences.length > 0) {
    paragraphs.push({
      text: currentSentences.join(" "),
      segment_ids: currentIds,
    });
  }

  return NextResponse.json({
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    paragraphs,
    audio_file: chapter.audio_file,
    audio_duration_ms: chapter.audio_duration_ms,
    word_timestamps: chapter.word_timestamps
      ? JSON.parse(chapter.word_timestamps)
      : null,
  });
}
