"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type BookProgress = {
  book_id: string;
  chapter_number: number;
  audio_position_ms: number;
};

export type ProgressMode = "listen" | "read";

const SAVE_INTERVAL_MS = 5000;

export function useProgress(bookId: string) {
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const [allProgress, setAllProgress] = useState<BookProgress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef<(BookProgress & { mode?: ProgressMode; durationMs?: number }) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch progress on mount
  useEffect(() => {
    fetch("/api/progress", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: BookProgress[]) => {
        setAllProgress(rows);
        const match = rows.find((r) => r.book_id === bookId);
        setProgress(match ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [bookId]);

  // Flush pending save to API
  const flush = useCallback(() => {
    const data = pendingRef.current;
    if (!data) return;
    pendingRef.current = null;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        bookId: data.book_id,
        chapterNumber: data.chapter_number,
        audioPositionMs: data.audio_position_ms,
        mode: data.mode,
        durationMs: data.durationMs,
      }),
    }).catch(() => {});
  }, []);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  // Debounced save
  const saveProgress = useCallback(
    (chapterNumber: number, audioPositionMs: number, mode?: ProgressMode, durationMs?: number) => {
      const data = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        mode,
        durationMs,
      };
      setProgress(data);
      pendingRef.current = data;

      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flush();
        }, SAVE_INTERVAL_MS);
      }
    },
    [bookId, flush]
  );

  // Immediate save (for pause, chapter change)
  const saveProgressNow = useCallback(
    (chapterNumber: number, audioPositionMs: number, mode?: ProgressMode, durationMs?: number) => {
      const data = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        mode,
        durationMs,
      };
      setProgress(data);
      pendingRef.current = data;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    },
    [bookId, flush]
  );

  return { progress, allProgress, loaded, saveProgress, saveProgressNow };
}
