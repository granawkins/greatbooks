import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { notFound } from "next/navigation";
import BookPageClient from "./BookPageClient";
import type { Segment } from "@/components/reader";

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  const book = db.getBook(bookId);
  if (!book) notFound();

  const chapters = db.getChapters(bookId);
  if (chapters.length === 0) notFound();

  // Get user progress server-side
  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const progress = progressRows.find((p) => p.book_id === bookId) ?? null;

  const initialChapterNum = progress?.chapter_number ?? chapters[0].number;
  const initialChapter = db.getChapter(bookId, initialChapterNum) ?? chapters[0];

  // Fetch segments for the initial chapter, parse word_timestamps
  const rawSegments = db.getSegments(initialChapter.id);
  const segments: Segment[] = rawSegments.map((seg) => ({
    id: seg.id,
    text: seg.text,
    segment_type: seg.segment_type,
    audio_start_ms: seg.audio_start_ms,
    audio_end_ms: seg.audio_end_ms,
    word_timestamps: seg.word_timestamps ? JSON.parse(seg.word_timestamps) : null,
  }));

  return (
    <BookPageClient
      bookId={bookId}
      bookMeta={{
        title: book.title,
        author: book.author,
        original_date: book.original_date,
        translator: book.translator,
        translation_date: book.translation_date,
        source_url: book.source_url,
        layout: book.layout || "prose",
      }}
      chapters={chapters.map((c) => ({ id: c.number, title: c.title }))}
      initialChapterNum={initialChapterNum}
      initialChapterData={{
        title: initialChapter.title,
        segments,
        audio_file: initialChapter.audio_file,
        audio_duration_ms: initialChapter.audio_duration_ms,
      }}
      initialAudioPositionMs={progress?.audio_position_ms ?? 0}
    />
  );
}
