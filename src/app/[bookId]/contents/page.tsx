import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import CourseContents from "./CourseContents";

export default async function ContentsPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = db.getBook(bookId);
  if (!book || book.type !== "course") notFound();

  const chapters = db.getChapters(bookId);
  if (chapters.length === 0) redirect("/");

  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const progress = progressRows.find((p) => p.book_id === bookId) ?? null;

  return (
    <CourseContents
      bookId={bookId}
      title={book.title}
      author={book.author}
      description={book.description}
      chapters={chapters.map((c) => ({
        number: c.number,
        title: c.title,
        chapterType: c.chapter_type ?? "text",
        hasAudio: !!(c.source_chapter_id
          ? db.getResolvedChapter(c.id)?.audio_file
          : c.audio_file),
      }))}
      currentChapter={progress?.chapter_number ?? null}
    />
  );
}
