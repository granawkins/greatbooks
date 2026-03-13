import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { notFound } from "next/navigation";
import ChapterView from "./ChapterView";
import type { Segment } from "@/components/reader";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterNum: string }>;
}) {
  const { bookId, chapterNum: chapterNumStr } = await params;
  const chapterNum = Number(chapterNumStr);

  const chapter = db.getChapter(bookId, chapterNum);
  if (!chapter) notFound();

  const rawSegments = db.getSegments(chapter.id);
  const segments: Segment[] = rawSegments.map((seg) => ({
    id: seg.id,
    text: seg.text,
    segment_type: seg.segment_type,
    audio_start_ms: seg.audio_start_ms,
    audio_end_ms: seg.audio_end_ms,
    word_timestamps: seg.word_timestamps ? JSON.parse(seg.word_timestamps) : null,
  }));

  // Audio position only if progress matches this chapter
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const progress = progressRows.find((p) => p.book_id === bookId) ?? null;
  const audioPositionMs =
    progress?.chapter_number === chapterNum ? (progress.audio_position_ms ?? 0) : 0;

  return (
    <ChapterView
      chapterNum={chapterNum}
      chapterData={{
        title: chapter.title,
        segments,
        audio_file: chapter.audio_file,
        audio_duration_ms: chapter.audio_duration_ms,
      }}
      initialAudioPositionMs={audioPositionMs}
    />
  );
}
