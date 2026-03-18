"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import BookDetailsModal, { type BookDetails } from "@/components/BookDetailsModal";

type StatsMap = Record<string, { total_chars: number; total_duration_ms: number | null; chapter_count: number }>;
type ProgressMap = Record<string, { chapter_number: number }>;

type BookDetailsModalContextType = {
  openBookDetails: (bookId: string) => void;
  /** Pre-supply stats/progress so the modal can show them without extra fetches */
  setMaps: (stats: StatsMap, progress: ProgressMap) => void;
};

const BookDetailsModalContext = createContext<BookDetailsModalContextType>({
  openBookDetails: () => {},
  setMaps: () => {},
});

export function BookDetailsModalProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<BookDetails | null>(null);
  const [statsMap, setStatsMap] = useState<StatsMap>({});
  const [progressMap, setProgressMap] = useState<ProgressMap>({});

  const setMaps = useCallback((stats: StatsMap, progress: ProgressMap) => {
    setStatsMap(stats);
    setProgressMap(progress);
  }, []);

  const openBookDetails = useCallback(
    async (bookId: string) => {
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) return;
        const data = await res.json();
        const details: BookDetails = {
          id: data.id,
          title: data.title,
          author: data.author,
          description: data.description,
          original_date: data.original_date,
          translator: data.translator,
          translation_date: data.translation_date,
          source_url: data.source_url,
          layout: data.layout,
          type: data.type,
          chapters: (data.chapters ?? []).map((c: Record<string, unknown>) => ({
            number: c.number,
            title: c.title,
            audio_duration_ms: c.audio_duration_ms,
            chapter_type: c.chapter_type ?? "text",
          })),
          stats: statsMap[bookId] ?? null,
          progress: progressMap[bookId] ?? null,
        };
        setBook(details);
      } catch {
        // silently fail
      }
    },
    [statsMap, progressMap]
  );

  return (
    <BookDetailsModalContext.Provider value={{ openBookDetails, setMaps }}>
      {children}
      {book && (
        <BookDetailsModal book={book} onClose={() => setBook(null)} />
      )}
    </BookDetailsModalContext.Provider>
  );
}

export function useBookDetailsModal() {
  return useContext(BookDetailsModalContext);
}
