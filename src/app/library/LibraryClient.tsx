"use client";

import { useState, useEffect } from "react";
import type { BookRow } from "@/lib/db";
import BookCover from "@/components/BookCover";
import { useAudioSession } from "@/lib/AudioPlayerContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";

type ProgressMap = Record<string, { chapter_number: number }>;
type StatsMap = Record<string, { chapter_count: number; total_duration_ms: number | null; total_chars: number }>;

export default function LibraryClient({
  books,
  statsMap,
  progressMap,
}: {
  books: BookRow[];
  statsMap: StatsMap;
  progressMap: ProgressMap;
}) {
  const { session } = useAudioSession();
  const { openBookDetails, setMaps } = useBookDetailsModal();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMaps(statsMap, progressMap);
  }, [statsMap, progressMap, setMaps]);

  const query = search.toLowerCase().trim();
  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query)
      )
    : books;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "2rem 1.5rem", paddingBottom: session ? 220 : 64 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 400,
            color: "var(--color-text)",
            marginBottom: "1.25rem",
          }}
        >
          Library
        </h1>
        <input
          type="text"
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            marginBottom: "1.25rem",
            fontFamily: "var(--font-ui)",
            fontSize: "0.875rem",
            color: "var(--color-text)",
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            outline: "none",
          }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-6">
          {filtered.map((book) => {
            const stats = statsMap[book.id];
            const progress = progressMap[book.id];
            return (
              <button
                key={book.id}
                onClick={() => openBookDetails(book.id)}
                className="block"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <BookCover
                  bookId={book.id}
                  title={book.title}
                  stats={stats ?? null}
                  progress={progress ?? null}
                />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
