import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import BookOrCourseChoice from "./BookOrCourseChoice";

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = db.getBook(bookId);
  if (!book) redirect("/");
  const chapters = db.getChapters(bookId);
  if (chapters.length === 0) redirect("/");

  const userId = await getAuthUserId();
  const progressRows = userId ? db.getProgress(userId) : [];
  const progress = progressRows.find((p) => p.book_id === bookId) ?? null;
  const chapterNum = progress?.chapter_number ?? chapters[0].number;

  // For courses, auto-redirect
  if (book.type === "course") {
    redirect(`/${bookId}/${chapterNum}`);
  }

  // Check if user is enrolled in a course containing this book
  const courseInfo = userId ? db.getEnrolledCourseForBook(userId, bookId) : null;
  if (!courseInfo) {
    redirect(`/${bookId}/${chapterNum}`);
  }

  // Show choice modal: course vs independent reading
  return (
    <BookOrCourseChoice
      bookId={bookId}
      bookTitle={book.title}
      bookChapter={chapterNum}
      courseId={courseInfo.courseId}
      courseTitle={courseInfo.courseTitle}
      courseChapter={courseInfo.currentCourseChapter}
    />
  );
}
