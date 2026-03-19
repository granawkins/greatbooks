"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import BookDetailsModal, { type BookDetails } from "@/components/BookDetailsModal";

type StatsMap = Record<string, { total_chars: number; total_duration_ms: number | null; chapter_count: number }>;
type ProgressMap = Record<string, { chapter_number: number }>;

type ModalState = { bookId: string; data: BookDetails | null } | null;

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
  const [modal, setModal] = useState<ModalState>(null);
  const statsMapRef = useRef<StatsMap>({});
  const progressMapRef = useRef<ProgressMap>({});

  const setMaps = useCallback((stats: StatsMap, progress: ProgressMap) => {
    statsMapRef.current = stats;
    progressMapRef.current = progress;
  }, []);

  const openBookDetails = useCallback(
    async (bookId: string) => {
      // Show modal immediately with skeleton
      setModal({ bookId, data: null });

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
          stats: statsMapRef.current[bookId] ?? null,
          progress: progressMapRef.current[bookId] ?? null,
        };
        setModal({ bookId, data: details });
      } catch {
        // silently fail — modal stays open with skeleton
      }
    },
    []
  );

  const contextValue = useMemo(() => ({ openBookDetails, setMaps }), [openBookDetails, setMaps]);

  return (
    <BookDetailsModalContext.Provider value={contextValue}>
      {children}
      {modal && (
        <BookDetailsModal
          bookId={modal.bookId}
          book={modal.data}
          onClose={() => setModal(null)}
        />
      )}
    </BookDetailsModalContext.Provider>
  );
}

export function useBookDetailsModal() {
  return useContext(BookDetailsModalContext);
}
