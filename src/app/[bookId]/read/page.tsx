"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChapterNav from "@/components/ChapterNav";

export default function ReadPage() {
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

        <div className="space-y-4">
          {chapter?.paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base leading-7"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
              }}
            >
              {p}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
