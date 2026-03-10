"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import type { ChapterData, NavChapter } from "./types";

export function useInfiniteScroll(
  bookId: string,
  bookChapters: NavChapter[],
  saveProgressNow: (chapterNumber: number, audioPositionMs: number) => void,
) {
  const [loadedChapters, setLoadedChapters] = useState<Record<number, ChapterData>>({});
  const [activeChapterId, setActiveChapterId] = useState(1);

  const chapterSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const activeChapterRef = useRef(1);
  const loadingRef = useRef<Set<number>>(new Set());
  const scrollAnchorRef = useRef<{ chapterNum: number; top: number } | null>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Keep activeChapterRef in sync
  useEffect(() => { activeChapterRef.current = activeChapterId; }, [activeChapterId]);

  const sortedChapterNums = Object.keys(loadedChapters).map(Number).sort((a, b) => a - b);

  // Fetch a chapter (idempotent)
  const fetchChapter = useCallback(async (chapterNum: number) => {
    if (loadingRef.current.has(chapterNum)) return;
    loadingRef.current.add(chapterNum);
    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapterNum}`);
      if (!res.ok) return;
      const data: ChapterData = await res.json();

      setLoadedChapters(prev => {
        if (prev[chapterNum]) return prev;
        const prevNums = Object.keys(prev).map(Number);
        if (prevNums.length > 0 && chapterNum < Math.min(...prevNums)) {
          const anchorNum = Math.min(...prevNums);
          const el = chapterSectionRefs.current[anchorNum];
          if (el) {
            scrollAnchorRef.current = { chapterNum: anchorNum, top: el.getBoundingClientRect().top };
          }
        }
        return { ...prev, [chapterNum]: data };
      });
    } finally {
      loadingRef.current.delete(chapterNum);
    }
  }, [bookId]);

  // Restore scroll position after prepending a chapter
  useLayoutEffect(() => {
    if (!scrollAnchorRef.current) return;
    const { chapterNum, top } = scrollAnchorRef.current;
    const el = chapterSectionRefs.current[chapterNum];
    if (el) {
      const newTop = el.getBoundingClientRect().top;
      window.scrollBy(0, newTop - top);
    }
    scrollAnchorRef.current = null;
  });

  // IntersectionObserver for loading adjacent chapters
  useEffect(() => {
    if (sortedChapterNums.length === 0 || bookChapters.length === 0) return;

    const chapterIds = bookChapters.map(c => c.id);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target === topSentinelRef.current) {
          const minChapter = Math.min(...sortedChapterNums);
          const idx = chapterIds.indexOf(minChapter);
          if (idx > 0) fetchChapter(chapterIds[idx - 1]);
        }
        if (entry.target === bottomSentinelRef.current) {
          const maxChapter = Math.max(...sortedChapterNums);
          const idx = chapterIds.indexOf(maxChapter);
          if (idx >= 0 && idx < chapterIds.length - 1) fetchChapter(chapterIds[idx + 1]);
        }
      }
    }, { rootMargin: "400px" });

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

    return () => observer.disconnect();
  }, [sortedChapterNums, bookChapters, fetchChapter]);

  // Track which chapter is in the viewport
  useEffect(() => {
    if (sortedChapterNums.length === 0) return;

    const handleScroll = () => {
      const viewportTop = window.scrollY + 200;
      for (let i = sortedChapterNums.length - 1; i >= 0; i--) {
        const el = chapterSectionRefs.current[sortedChapterNums[i]];
        if (el && el.offsetTop <= viewportTop) {
          const num = sortedChapterNums[i];
          if (num !== activeChapterRef.current) {
            activeChapterRef.current = num;
            setActiveChapterId(num);
            saveProgressNow(num, 0);
          }
          return;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sortedChapterNums, saveProgressNow]);

  // Jump to a specific chapter
  const handleChapterJump = useCallback(
    (chapterId: number) => {
      const el = chapterSectionRefs.current[chapterId];
      if (el) {
        el.scrollIntoView({ behavior: "instant" });
        window.scrollBy(0, -80);
        setActiveChapterId(chapterId);
        activeChapterRef.current = chapterId;
        saveProgressNow(chapterId, 0);
        return;
      }
      setLoadedChapters({});
      chapterSectionRefs.current = {};
      setActiveChapterId(chapterId);
      activeChapterRef.current = chapterId;
      window.scrollTo({ top: 0, behavior: "instant" });
      fetchChapter(chapterId);
      saveProgressNow(chapterId, 0);
    },
    [fetchChapter, saveProgressNow]
  );

  return {
    loadedChapters,
    activeChapterId,
    setActiveChapterId,
    sortedChapterNums,
    chapterSectionRefs,
    topSentinelRef,
    bottomSentinelRef,
    fetchChapter,
    handleChapterJump,
  };
}
