"use client";

import type { Chapter } from "@/data/books";

type ChapterNavProps = {
  chapters: Chapter[];
  activeChapterId: number;
  onSelect: (id: number) => void;
};

export default function ChapterNav({
  chapters,
  activeChapterId,
  onSelect,
}: ChapterNavProps) {
  return (
    <div
      className="flex flex-col gap-1 p-2 rounded-[var(--radius)] border"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <span
        className="text-xs font-medium px-2 py-1 uppercase tracking-wide"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Chapters
      </span>
      {chapters.map((ch) => {
        const isActive = ch.id === activeChapterId;
        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch.id)}
            className="text-left px-2 py-1.5 rounded text-sm transition-colors"
            style={{
              backgroundColor: isActive
                ? "var(--color-bg-secondary)"
                : "transparent",
              color: isActive
                ? "var(--color-text)"
                : "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {ch.title}
          </button>
        );
      })}
    </div>
  );
}
