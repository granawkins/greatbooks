"use client";

import { useCallback, useEffect, useRef } from "react";

export type ProgressMode = "listen" | "read";

type PendingSave = {
  book_id: string;
  chapter_number: number;
  audio_position_ms: number;
  mode?: ProgressMode;
  durationMs?: number;
};

const SAVE_INTERVAL_MS = 5000;

export function useProgress(bookId: string) {
  const pendingRef = useRef<PendingSave | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      pendingRef.current = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        mode,
        durationMs,
      };

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
      pendingRef.current = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        mode,
        durationMs,
      };
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    },
    [bookId, flush]
  );

  return { saveProgress, saveProgressNow };
}
