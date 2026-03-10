import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import { getCoverUrl } from "@/lib/assets";

type BookCardProps = {
  book: BookRow;
  progress?: { chapter_number: number } | null;
};

export default function BookCard({ book, progress }: BookCardProps) {
  return (
    <Link href={`/${book.id}`} className="block group">
      <div
        className="rounded-[var(--radius-lg)] border overflow-hidden transition-shadow hover:shadow-lg"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
        }}
      >
        {/* Cover */}
        <div
          className="aspect-[3/4] flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-secondary)" }}
        >
          {book.cover_image ? (
            <Image
              src={getCoverUrl(book.cover_image)}
              alt={`${book.title} cover`}
              fill
              className="object-cover"
            />
          ) : (
            <span
              className="text-4xl font-serif opacity-30"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {book.title[0]}
            </span>
          )}
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
              Chapter {progress.chapter_number}
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
