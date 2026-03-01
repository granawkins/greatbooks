import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook } from "@/data/books";
import TabBar from "@/components/TabBar";

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = getBook(bookId);
  if (!book) notFound();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <header className="max-w-3xl w-full mx-auto px-6 pt-6">
        <Link
          href="/"
          className="text-sm inline-flex items-center gap-1 mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M10 13L5 8l5-5v10z" />
          </svg>
          All Books
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
        >
          {book.title}
        </h1>
        <p
          className="text-sm mt-0.5 mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {book.author}
        </p>
        <TabBar bookId={bookId} />
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
