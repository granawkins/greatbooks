"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Block, Segment } from "@/components/reader/types";
import { getReadingCenterY, scrollToCenter } from "./readingCenter";
import { applyClassById, removeClassById, findFirstSpanInSegment } from "@/components/reader/wordAnnotator";

/**
 * Scroll-based progress tracking for reading mode.
 * Handles: bookmark active/pause, scroll-to-position on view mode switch,
 * bookmark flash on scroll stop, reading mode intro modal.
 */
export function useScrollTracking({
  chapterNum,
  segments,
  blocks,
  blockRefsRef,
  viewMode,
  audioRef,
  saveProgressNow,
}: {
  chapterNum: number;
  segments: Segment[];
  blocks: Block[];
  blockRefsRef: React.RefObject<(HTMLElement | null)[]>;
  viewMode: "audio" | "text";
  audioRef: React.RefObject<HTMLAudioElement | null>;
  saveProgressNow: (ch: number, ms: number, mode?: "listen" | "read", dur?: number) => void;
}) {
  const [bookmarkActive, setBookmarkActive] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const isTextMode = viewMode === "text";
  const hasScrolledRef = useRef(false);
  const lastReadSaveRef = useRef<number>(0);
  const prevViewMode = useRef(viewMode);
  const programmaticScrollRef = useRef(false);
  const introShownRef = useRef(false);

  // Scroll to audio position when switching to text mode
  useEffect(() => {
    if (prevViewMode.current !== "text" && viewMode === "text") {
      hasScrolledRef.current = false;
      lastReadSaveRef.current = Date.now();
      const audioMs = audioRef.current ? Math.floor(audioRef.current.currentTime * 1000) : 0;
      if (audioMs > 0) {
        const refs = blockRefsRef.current;
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          if (block.type !== "paragraph") continue;
          for (const seg of block.segments) {
            if (seg.audio_start_ms != null && seg.audio_end_ms != null &&
                audioMs >= seg.audio_start_ms && audioMs < seg.audio_end_ms) {
              const el = refs[i];
              if (el) {
                programmaticScrollRef.current = true;
                scrollToCenter(el, "instant", true);
                requestAnimationFrame(() => { programmaticScrollRef.current = false; });
              }
              break;
            }
          }
        }
      }
    }
    prevViewMode.current = viewMode;
  }, [viewMode, audioRef, blocks, blockRefsRef]);

  // Show intro modal on first switch to reading mode
  useEffect(() => {
    if (!isTextMode || introShownRef.current) return;
    try {
      if (!localStorage.getItem("greatbooks-reading-intro-seen")) {
        setShowIntroModal(true);
        localStorage.setItem("greatbooks-reading-intro-seen", "1");
        introShownRef.current = true;
      }
    } catch {}
  }, [isTextMode]);

  // Apply bookmark: save progress, seek audio, flash word
  const applyBookmark = useCallback((ms: number, seg?: { sequence: number }) => {
    const now = Date.now();
    const elapsed = lastReadSaveRef.current > 0 ? now - lastReadSaveRef.current : 0;
    lastReadSaveRef.current = now;
    saveProgressNow(chapterNum, ms, "read", Math.min(elapsed, 30000));
    if (audioRef.current) audioRef.current.currentTime = ms / 1000;
    if (seg) {
      const span = findFirstSpanInSegment(chapterNum, seg.sequence);
      if (span) {
        applyClassById(span.id, "word-bookmark");
        setTimeout(() => {
          applyClassById(span.id, "fading");
          setTimeout(() => {
            removeClassById(span.id, "word-bookmark");
            removeClassById(span.id, "fading");
          }, 600);
        }, 300);
      }
    }
  }, [chapterNum, saveProgressNow, audioRef]);

  // Find centered segment and update position
  const updatePositionFromScroll = useCallback(() => {
    const atTop = window.scrollY <= 5;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const atBottom = window.scrollY + vh >= document.documentElement.scrollHeight - 5;

    if (atTop) {
      const firstSeg = segments.find(s => s.audio_start_ms != null);
      if (firstSeg) applyBookmark(firstSeg.audio_start_ms!, firstSeg);
      return;
    }
    if (atBottom) {
      const lastSeg = [...segments].reverse().find(s => s.audio_end_ms != null);
      if (lastSeg?.audio_end_ms != null) applyBookmark(lastSeg.audio_end_ms, lastSeg);
      return;
    }

    const centerY = getReadingCenterY(true);
    const refs = blockRefsRef.current;
    let bestBlock = -1;
    let bestDist = Infinity;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) { bestBlock = i; break; }
      const dist = Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY));
      if (dist < bestDist) { bestDist = dist; bestBlock = i; }
    }

    if (bestBlock < 0) return;
    const block = blocks[bestBlock];
    if (!block || block.type !== "paragraph") return;
    const el = refs[bestBlock];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (centerY - rect.top) / (rect.bottom - rect.top)));
    const segIdx = Math.min(block.segments.length - 1, Math.floor(ratio * block.segments.length));
    const seg = block.segments[segIdx];
    if (seg?.audio_start_ms != null) applyBookmark(seg.audio_start_ms, seg);
  }, [segments, blocks, applyBookmark, blockRefsRef]);

  // Scroll listener (text mode + bookmark active)
  useEffect(() => {
    if (!isTextMode || !bookmarkActive) return;
    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      hasScrolledRef.current = true;
      clearTimeout(timer);
      timer = setTimeout(updatePositionFromScroll, 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", handleScroll); };
  }, [isTextMode, bookmarkActive, updatePositionFromScroll]);

  return {
    bookmarkActive,
    setBookmarkActive,
    showIntroModal,
    setShowIntroModal,
    updatePositionFromScroll,
    isTextMode,
  };
}
