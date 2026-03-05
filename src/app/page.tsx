"use client";

import { useState, useEffect } from "react";
import type { BookRow } from "@/lib/db";
import BookCard from "@/components/BookCard";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

import { getUserId } from "@/lib/userId";

type ProgressMap = Record<string, { chapter_number: number }>;

export default function Home() {
  const { session } = useAudioPlayer();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});

  useEffect(() => {
    fetch("/api/books")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBooks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;
    fetch(`/api/progress?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { book_id: string; chapter_number: number }[]) => {
        const map: ProgressMap = {};
        for (const r of rows) {
          map[r.book_id] = { chapter_number: r.chapter_number };
        }
        setProgressMap(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
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
