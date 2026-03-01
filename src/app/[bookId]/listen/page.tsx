"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChapterNav from "@/components/ChapterNav";
import AudioPlayer from "@/components/AudioPlayer";

export default function ListenPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = getBook(bookId);

  const [activeChapterId, setActiveChapterId] = useState(
    book?.chapters[0]?.id ?? 1
  );

  if (!book) return null;

  const chapter = book.chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 shrink-0">
        <ChapterNav
          chapters={book.chapters}
          activeChapterId={activeChapterId}
          onSelect={setActiveChapterId}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile chapter selector */}
        <div className="md:hidden">
          <select
            value={activeChapterId}
            onChange={(e) => setActiveChapterId(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-[var(--radius)] border text-sm"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            {book.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.title}
              </option>
            ))}
          </select>
        </div>

        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
        >
          {chapter?.title}
        </h2>

        <AudioPlayer />

        <div
          className="rounded-[var(--radius-lg)] p-6 text-center"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            color: "var(--color-text-secondary)",
          }}
        >
          <p className="text-sm">
            Audio playback coming soon. AI-generated narration via Google Chirp3
            TTS.
          </p>
        </div>
      </div>
    </div>
  );
}
