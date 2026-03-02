"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChapterNav from "@/components/ChapterNav";

export default function ReadPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = getBook(bookId);

  const [activeChapterId, setActiveChapterId] = useState(
    book?.chapters[0]?.id ?? 1
  );
  const [paragraphs, setParagraphs] = useState<{ text: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/books/${bookId}/chapters/${activeChapterId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.paragraphs) {
          setParagraphs(data.paragraphs);
        }
      })
      .finally(() => setLoading(false));
  }, [bookId, activeChapterId]);

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

      {/* Text */}
      <article className="flex-1 min-w-0">
        {/* Mobile chapter selector */}
        <div className="md:hidden mb-4">
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
          className="text-xl font-semibold mb-6"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
        >
          {chapter?.title}
        </h2>

        {loading ? (
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Loading...
          </p>
        ) : (
          <div className="space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-base leading-7"
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {p.text}
              </p>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
