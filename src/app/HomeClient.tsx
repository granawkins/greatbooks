"use client";

import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import LoginButtons from "@/components/auth/LoginButtons";

type ProgressMap = Record<string, { chapter_number: number }>;

export default function HomeClient({
  books,
  progressMap,
}: {
  books: BookRow[];
  progressMap: ProgressMap;
}) {
  const { session } = useAudioPlayer();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
            >
              Great Books
            </h1>
            <p
              className="mt-2 text-lg"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Classic literature, reimagined for reading, listening, and exploring.
            </p>
          </div>
          <LoginButtons />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6" style={{ paddingBottom: session ? 220 : 64 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progress={progressMap[book.id] ?? null}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
