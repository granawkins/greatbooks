import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { notFound } from "next/navigation";
import ChapterView from "./ChapterView";
import ChapterContent from "@/components/reader/ChapterContent";
import type { Segment } from "@/components/reader";
import type { WordBoundary } from "@/components/reader/types";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterNum: string }>;
}) {
  const { bookId, chapterNum: chapterNumStr } = await params;
  const chapterNum = Number(chapterNumStr);

  const book = db.getBook(bookId);
  const chapter = db.getChapter(bookId, chapterNum);
  if (!book || !chapter) notFound();

  // Resolve source chapter for segments/audio (course reference chapters)
  const resolved = db.getResolvedChapter(chapter.id);
  const rawSegments = db.getSegments(chapter.id);

  // Parse word boundaries from DB (char positions only — no timing data in payload)
  const wordBoundaries: Record<number, WordBoundary[]> = {};
  const segments: Segment[] = rawSegments.map((seg) => {
    if (seg.word_timestamps) {
      const parsed = JSON.parse(seg.word_timestamps) as { char_start: number; char_end: number }[];
      wordBoundaries[seg.id] = parsed.map((w) => ({ char_start: w.char_start, char_end: w.char_end }));
    }
    return {
      id: seg.id,
      sequence: seg.sequence,
      text: seg.text,
      segment_type: seg.segment_type,
      audio_start_ms: seg.audio_start_ms,
      audio_end_ms: seg.audio_end_ms,
      word_timestamps: null, // timing loaded lazily client-side
    };
  });

  // Fetch user-specific data
  const userId = await getAuthUserId();

  // Annotations (resolve source chapter for course reference chapters)
  let initialAnnotations: import("@/components/reader/types").Annotation[] = [];
  if (userId) {
    const source = db.getSourceBookInfo(bookId, chapterNum);
    const resolvedBookId = source?.bookId ?? bookId;
    const resolvedChapterNum = source?.chapterNumber ?? chapterNum;
    initialAnnotations = db.getAnnotations(userId, resolvedBookId, resolvedChapterNum);
  }

  // Audio position only if progress matches this chapter
  const progressRows = userId ? db.getProgress(userId) : [];
  const progress = progressRows.find((p) => p.book_id === bookId) ?? null;
  const audioPositionMs =
    progress?.chapter_number === chapterNum ? (progress.audio_position_ms ?? 0) : 0;

  // Compute the exact word span ID for initial scroll position
  let initialWordSpanId: string | null = null;
  if (audioPositionMs > 0) {
    for (const seg of rawSegments) {
      if (seg.audio_start_ms != null && seg.audio_end_ms != null &&
          audioPositionMs >= seg.audio_start_ms && audioPositionMs < seg.audio_end_ms &&
          seg.word_timestamps) {
        const words = JSON.parse(seg.word_timestamps) as { start_ms: number; end_ms: number; char_start: number; char_end: number }[];
        // Find the word containing the audio position, or fall back to the first word
        const word = words.find(w => audioPositionMs >= w.start_ms && audioPositionMs < w.end_ms) ?? words[0];
        if (word) {
          initialWordSpanId = `w-${chapterNum}-${seg.sequence}-${word.char_start}`;
        }
        break;
      }
    }
    // Fallback: if we couldn't find an exact word, find the segment that starts closest
    if (!initialWordSpanId) {
      for (let i = rawSegments.length - 1; i >= 0; i--) {
        const seg = rawSegments[i];
        if (seg.audio_start_ms != null && seg.audio_start_ms <= audioPositionMs && seg.word_timestamps) {
          const words = JSON.parse(seg.word_timestamps) as { char_start: number }[];
          if (words.length > 0) {
            initialWordSpanId = `w-${chapterNum}-${seg.sequence}-${words[0].char_start}`;
          }
          break;
        }
      }
    }
  }

  // Playback speed from user record (avoids race with auth fetch on client)
  const userRow = userId ? db.getUser(userId) : null;
  const playbackSpeed = userRow?.playback_speed ?? 1;

  // For course reference chapters with no course progress on this chapter,
  // check if the source book has independent progress that's newer than the course progress.
  // Only prompt if the user made independent progress AFTER their last course activity.
  let sourceProgress: { bookTitle: string; chapterNumber: number; audioPositionMs: number } | null = null;
  if (chapter.source_chapter_id && audioPositionMs === 0) {
    const sourceInfo = db.getSourceBookInfo(bookId, chapterNum);
    if (sourceInfo) {
      const sourceBookProgress = progressRows.find((p) => p.book_id === sourceInfo.bookId);
      const courseProgress = progressRows.find((p) => p.book_id === bookId);
      if (
        sourceBookProgress &&
        sourceBookProgress.chapter_number === sourceInfo.chapterNumber &&
        sourceBookProgress.audio_position_ms > 0
      ) {
        // Only show if source book progress is newer than course progress
        // (i.e., the user read independently AFTER their last course session)
        const sourceIsNewer = !courseProgress ||
          sourceBookProgress.updated_at > courseProgress.updated_at;
        if (sourceIsNewer) {
          const sourceBook = db.getBook(sourceInfo.bookId);
          sourceProgress = {
            bookTitle: sourceBook?.title ?? sourceInfo.bookId,
            chapterNumber: sourceInfo.chapterNumber,
            audioPositionMs: sourceBookProgress.audio_position_ms,
          };
        }
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
      initialWordSpanId={initialWordSpanId}
      sourceProgress={sourceProgress}
      initialAnnotations={initialAnnotations}
      playbackSpeed={playbackSpeed}
    >
      <ChapterContent
        segments={segments}
        wordBoundaries={wordBoundaries}
        chapterNum={chapterNum}
        layout={book.layout === "verse" ? "verse" : "prose"}
        bookId={bookId}
      />
    </ChapterView>
  );
}
