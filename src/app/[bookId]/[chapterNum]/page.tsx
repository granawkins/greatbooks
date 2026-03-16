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

  // Resolve source chapter for segments/audio (course reference chapters)
  const resolved = db.getResolvedChapter(chapter.id);
  const rawSegments = db.getSegments(chapter.id);
  const segments: Segment[] = rawSegments.map((seg) => ({
    id: seg.id,
    sequence: seg.sequence,
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

  // For course reference chapters with no course progress, check source book progress
  let sourceProgress: { bookTitle: string; chapterNumber: number; audioPositionMs: number } | null = null;
  if (chapter.source_chapter_id && audioPositionMs === 0) {
    const sourceInfo = db.getSourceBookInfo(bookId, chapterNum);
    if (sourceInfo) {
      const sourceBookProgress = progressRows.find((p) => p.book_id === sourceInfo.bookId);
      if (sourceBookProgress && sourceBookProgress.chapter_number === sourceInfo.chapterNumber && sourceBookProgress.audio_position_ms > 0) {
        const sourceBook = db.getBook(sourceInfo.bookId);
        sourceProgress = {
          bookTitle: sourceBook?.title ?? sourceInfo.bookId,
          chapterNumber: sourceInfo.chapterNumber,
          audioPositionMs: sourceBookProgress.audio_position_ms,
        };
      }
    }
  }

  return (
    <ChapterView
      chapterNum={chapterNum}
      chapterData={{
        title: chapter.title,
        segments,
        audio_file: resolved?.audio_file ?? chapter.audio_file,
        audio_duration_ms: resolved?.audio_duration_ms ?? chapter.audio_duration_ms,
      }}
      chapterType={chapter.chapter_type ?? "text"}
      initialAudioPositionMs={audioPositionMs}
      sourceProgress={sourceProgress}
    />
  );
}
