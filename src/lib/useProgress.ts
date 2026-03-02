"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type BookProgress = {
  book_id: string;
  chapter_number: number;
  audio_position_ms: number;
  text_position_segment: number;
};

const STORAGE_KEY = "greatbooks:userId";
const SAVE_INTERVAL_MS = 5000;

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function useProgress(bookId: string) {
  const [userId] = useState(getUserId);
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const [allProgress, setAllProgress] = useState<BookProgress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef<BookProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch progress on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/progress?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: BookProgress[]) => {
        setAllProgress(rows);
        const match = rows.find((r) => r.book_id === bookId);
        setProgress(match ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [userId, bookId]);

  // Flush pending save to API
  const flush = useCallback(() => {
    const data = pendingRef.current;
    if (!data || !userId) return;
    pendingRef.current = null;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        bookId: data.book_id,
        chapterNumber: data.chapter_number,
        audioPositionMs: data.audio_position_ms,
        textPositionSegment: data.text_position_segment,
      }),
    }).catch(() => {});
  }, [userId]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  // Debounced save
  const saveProgress = useCallback(
    (chapterNumber: number, audioPositionMs: number, textPositionSegment: number) => {
      const data: BookProgress = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        text_position_segment: textPositionSegment,
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
    (chapterNumber: number, audioPositionMs: number, textPositionSegment: number) => {
      const data: BookProgress = {
        book_id: bookId,
        chapter_number: chapterNumber,
        audio_position_ms: audioPositionMs,
        text_position_segment: textPositionSegment,
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

  return { userId, progress, allProgress, loaded, saveProgress, saveProgressNow };
}
