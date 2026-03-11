"use client";

import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

type ProgressMap = Record<string, { chapter_number: number; audio_position_ms: number }>;
type StatsMap = Record<string, { chapter_count: number; total_duration_ms: number | null }>;

export default function HomeClient({
  books,
  progressMap,
  statsMap,
}: {
  books: BookRow[];
  progressMap: ProgressMap;
  statsMap: StatsMap;
}) {
  const { session } = useAudioPlayer();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 400,
            color: "var(--color-text-secondary)",
            fontStyle: "italic",
          }}
        >
          Classic literature, reimagined for reading, listening, and exploring.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6" style={{ paddingBottom: session ? 220 : 64 }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progress={progressMap[book.id] ?? null}
              stats={statsMap[book.id] ?? null}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
