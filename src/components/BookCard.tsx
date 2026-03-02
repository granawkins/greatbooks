import Link from "next/link";
import type { Book } from "@/data/books";

type BookCardProps = {
  book: Book;
  progress?: { chapter_number: number } | null;
};

export default function BookCard({ book, progress }: BookCardProps) {
  const totalChapters = book.chapters.length;

  return (
    <Link href={`/${book.id}`} className="block group">
      <div
        className="rounded-[var(--radius-lg)] border overflow-hidden transition-shadow hover:shadow-lg"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
        }}
      >
        {/* Cover placeholder */}
        <div
          className="aspect-[3/4] flex items-center justify-center relative"
          style={{ backgroundColor: "var(--color-bg-secondary)" }}
        >
          <span
            className="text-4xl font-serif opacity-30"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {book.title[0]}
          </span>
        </div>

        <div className="p-4">
          <h2
            className="text-lg font-semibold group-hover:underline"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
          >
            {book.title}
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {book.author}
          </p>
          {progress ? (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--color-accent)" }}
            >
              Chapter {progress.chapter_number} of {totalChapters}
            </p>
          ) : (
            <p
              className="text-sm mt-2 line-clamp-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {book.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
