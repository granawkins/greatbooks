import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BookShell from "./BookShell";

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = db.getBook(bookId);
  if (!book) notFound();
  const chapters = db.getChapters(bookId);
  if (chapters.length === 0) notFound();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <BookShell
        bookId={bookId}
        bookMeta={{
          title: book.title,
          author: book.author,
          original_date: book.original_date,
          translator: book.translator,
          translation_date: book.translation_date,
          source_url: book.source_url,
          layout: book.layout || "prose",
          type: book.type || "book",
        }}
        chapters={chapters.map((c) => ({ id: c.number, title: c.title }))}
      >
        {children}
      </BookShell>
    </div>
  );
}
