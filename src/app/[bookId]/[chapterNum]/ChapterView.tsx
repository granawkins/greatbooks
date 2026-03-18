"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import Image from "next/image";
import { type SegmentBoundary, useAudioPlayer, type WordTiming } from "@/lib/AudioPlayerContext";
import { getReadingCenterY, scrollToCenter } from "@/lib/readingCenter";
import { useProgress } from "@/lib/useProgress";
import { useTopBar } from "@/lib/TopBarContext";
import { getCoverSmUrl, getCoverLgUrl } from "@/lib/assets";
import { useBookShell } from "@/app/[bookId]/BookShell";
import {
  ChapterBlocks,
  groupIntoBlocks,
  buildWordSpans,
  paraTimeRange,
  type ChapterData,
} from "@/components/reader";
import CourseChoiceModal from "@/components/CourseChoiceModal";
import { FloatingControls } from "@/app/[bookId]/FloatingControls";
import type { Annotation } from "@/components/reader/types";
import { ChapterNav } from "@/components/reader/ChapterNav";

// ── Cover image (chapter 1 only) ────────────────────────────────────────

function CoverImage({ bookId, title }: { bookId: string; title: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0 1.5rem" }}>
        <div
          onClick={() => setModalOpen(true)}
          style={{
            cursor: "pointer",
            borderRadius: "3px",
            overflow: "hidden",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Image
            src={getCoverSmUrl(bookId)}
            alt={`${title} cover`}
            width={200}
            height={267}
            style={{ display: "block" }}
            priority
          />
        </div>
      </div>
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.7)", cursor: "pointer", padding: "2rem",
          }}
        >
          <Image
            src={getCoverLgUrl(bookId)}
            alt={`${title} cover`}
            width={800}
            height={1067}
            style={{ maxWidth: "100%", maxHeight: "90vh", width: "auto", height: "auto", borderRadius: "4px", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}
          />
        </div>
      )}
    </>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────

function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("classics.mit.edu")) return "Internet Classics Archive";
    if (host.includes("gutenberg.org")) return "Project Gutenberg";
    if (host.includes("perseus.tufts.edu")) return "Perseus Digital Library";
    return host;
  } catch { return "Source"; }
}

const metaLineStyle = {
  fontFamily: "var(--font-body)", fontSize: "1.125rem",
  color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.85,
} as const;

// ── Reading mode intro modal ──────────────────────────────────────────

function BookmarkIcon({ size = 20, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2.5} aria-hidden>
      <path d="M2 0h12a2 2 0 0 1 2 2v18l-8-4-8 4V2a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function ReadingModeIntroModal({ onClose }: { onClose: () => void }) {
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "14px 16px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
  };
  const iconWrap: React.CSSProperties = {
    flexShrink: 0,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)", padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          maxWidth: 340,
          width: "100%",
          fontFamily: "var(--font-ui)",
          color: "var(--color-text)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={rowStyle}>
          <div style={{ ...iconWrap, color: "var(--color-cursor)", opacity: 0.7 }}>
            <BookmarkIcon size={18} filled />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Tracks your place</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
              Your position updates to the sentence at the center of the screen when you stop scrolling.
            </p>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={{ ...iconWrap, color: "var(--color-cursor)", opacity: 0.3 }}>
            <BookmarkIcon size={18} filled={false} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Tap to pause</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
              Tap the bookmark to browse freely without updating your position. Tap again to resume.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 4,
            padding: "10px",
            border: "none",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--color-accent)",
            color: "var(--color-bg)",
            fontFamily: "var(--font-ui)",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── ChapterView ─────────────────────────────────────────────────────────

export default function ChapterView({
  chapterNum,
  chapterData,
  chapterType = "text",
  initialAudioPositionMs,
  sourceProgress,
  initialAnnotations = [],
}: {
  chapterNum: number;
  chapterData: ChapterData;
  chapterType?: "text" | "discussion";
  initialAudioPositionMs: number;
  sourceProgress?: { bookTitle: string; chapterNumber: number; audioPositionMs: number } | null;
  initialAnnotations?: Annotation[];
}) {
  const { bookId, bookMeta, chapters, setCurrentChapter, cacheChapter } = useBookShell();
  const searchParams = useSearchParams();
  const scrollToBottom = searchParams.get("scroll") === "bottom";
  const autoplay = searchParams.get("autoplay") === "1";

  const { session, loadSession, wordTimingsRef, scrollDataRef, audioRef, viewMode } = useAudioPlayer();
  const { saveProgressNow } = useProgress(bookId);
  const { setScrolled } = useTopBar();

  const paraRefsMap = useRef<Record<number, (HTMLElement | null)[]>>({});
  const heroRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const lastReadSaveRef = useRef<number>(0); // timestamp of last read-mode save

  // ── Restore font size from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("greatbooks-font-size");
      if (stored) {
        document.documentElement.style.setProperty("--font-size-body", `${stored}px`);
      }
    } catch {}
  }, []);

  // ── Annotations ───────────────────────────────────────────────────────

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);

  const fetchAnnotations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/annotations?bookId=${encodeURIComponent(bookId)}&chapterNum=${chapterNum}`,
        { credentials: "include" }
      );
      if (res.ok) setAnnotations(await res.json());
    } catch { /* ignore */ }
  }, [bookId, chapterNum]);

  const isFirstChapter = chapterNum === chapters[0]?.id;
  const layout = bookMeta.layout || "prose";

  // Prev/next
  const chapterIdx = chapters.findIndex((c) => c.id === chapterNum);
  const prevChapter = chapterIdx > 0 ? { num: chapters[chapterIdx - 1].id, title: chapters[chapterIdx - 1].title } : null;
  const nextChapter = chapterIdx < chapters.length - 1 ? { num: chapters[chapterIdx + 1].id, title: chapters[chapterIdx + 1].title } : null;

  // ── Register with BookShell ───────────────────────────────────────────

  useEffect(() => {
    setCurrentChapter(chapterNum);
    cacheChapter(chapterNum, chapterData);
  }, [chapterNum, chapterData, setCurrentChapter, cacheChapter]);

  // Hero scroll tracking (first chapter only)
  useEffect(() => {
    if (!isFirstChapter || bookMeta.type === "course") { setScrolled(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [isFirstChapter, setScrolled, bookMeta.type]);

  // ── Blocks ────────────────────────────────────────────────────────────

  const blocks = useMemo(
    () => groupIntoBlocks(chapterData.segments, layout),
    [chapterData.segments, layout]
  );

  // ── Scroll position ───────────────────────────────────────────────────

  const scrollTargetBlockIdx = useMemo(() => {
    if (scrollToBottom || initialAudioPositionMs <= 0) return -1;
    const segments = chapterData.segments;
    let targetSegIdx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].audio_start_ms != null && segments[i].audio_start_ms! <= initialAudioPositionMs) {
        targetSegIdx = i;
      }
    }
    let segCount = 0;
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (block.type === "paragraph") {
        if (segCount + block.segments.length > targetSegIdx) return bi;
        segCount += block.segments.length;
      }
    }
    return blocks.length - 1;
  }, [chapterData.segments, initialAudioPositionMs, blocks, scrollToBottom]);

  useLayoutEffect(() => {
    if (initialScrollDone.current) return;
    initialScrollDone.current = true;
    if (scrollToBottom) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
      return;
    }
    if (scrollTargetBlockIdx < 0) return;
    const el = paraRefsMap.current[chapterNum]?.[scrollTargetBlockIdx];
    if (el) scrollToCenter(el, "instant", viewMode === "text");
  }, [scrollTargetBlockIdx, chapterNum, scrollToBottom, viewMode]);

  // ── Audio integration ─────────────────────────────────────────────────

  const wordTimings = useMemo((): WordTiming[] => {
    const result: WordTiming[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.type !== "paragraph") continue;
      for (const s of buildWordSpans(block)) {
        result.push({ id: `w-${chapterNum}-${i}-${s.charStart}`, start_ms: s.start_ms, end_ms: s.end_ms });
      }
    }
    return result;
  }, [blocks, chapterNum]);

  const paraRanges = useMemo(
    () => blocks.map((b) => (b.type === "paragraph" ? paraTimeRange(b) : null)),
    [blocks]
  );

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    return chapterData.segments
      .filter((s) => s.audio_start_ms != null && s.audio_end_ms != null)
      .map((s) => ({ start_ms: s.audio_start_ms!, end_ms: s.audio_end_ms! }))
      .sort((a, b) => a.start_ms - b.start_ms);
  }, [chapterData.segments]);

  const audioSrc = chapterData.audio_file
    ? `/api/audio/${chapterData.audio_file.replace(/^data\//, "")}`
    : null;

  // Load audio session on mount (skip if this chapter's audio is already loaded)
  useEffect(() => {
    if (!chapterData.audio_file || !audioSrc) return;
    if (session?.bookId === bookId && session?.chapterId === chapterNum) return;
    loadSession(
      {
        bookId,
        bookTitle: bookMeta.title,
        chapterTitle: chapterData.title,
        chapterId: chapterNum,
        src: audioSrc,
        durationMs: chapterData.audio_duration_ms ?? 0,
        segmentBoundaries,
      },
      initialAudioPositionMs,
      autoplay,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save reading progress on mount
  useEffect(() => {
    saveProgressNow(chapterNum, initialAudioPositionMs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Word timings + scroll data refs (only when this chapter's audio is active)
  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== chapterNum) return;
    wordTimingsRef.current = wordTimings;
    return () => { wordTimingsRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, chapterNum, wordTimings, wordTimingsRef]);

  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== chapterNum) return;
    scrollDataRef.current = { ranges: paraRanges, elements: paraRefsMap.current[chapterNum] || [] };
    return () => { scrollDataRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, chapterNum, paraRanges, scrollDataRef]);

  // ── Reading mode: scroll-based progress tracking ─────────────────────

  const [bookmarkActive, setBookmarkActive] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const isTextMode = viewMode === "text";
  // Don't bookmark until the user has scrolled at least once in reading mode
  const hasScrolledRef = useRef(false);

  // When switching to text mode, scroll to the current audio position
  const prevViewMode = useRef(viewMode);
  const programmaticScrollRef = useRef(false);
  useEffect(() => {
    if (prevViewMode.current !== "text" && viewMode === "text") {
      hasScrolledRef.current = false; // reset on each switch
      lastReadSaveRef.current = Date.now(); // start tracking read time
      const audioMs = audioRef.current ? Math.floor(audioRef.current.currentTime * 1000) : 0;
      if (audioMs > 0) {
        const refs = paraRefsMap.current[chapterNum];
        if (refs) {
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
    }
    prevViewMode.current = viewMode;
  }, [viewMode, audioRef, chapterNum, blocks]);

  // Show intro modal on first switch to reading mode
  const introShownRef = useRef(false);
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

  // Helper: set progress + seek audio to a given ms, flash the bookmark word
  const applyBookmark = useCallback((ms: number, blockIdx?: number, segIdx?: number) => {
    const now = Date.now();
    const elapsed = lastReadSaveRef.current > 0 ? now - lastReadSaveRef.current : 0;
    // Cap at 30s to avoid counting idle time if bookmark was stale
    const readDurationMs = Math.min(elapsed, 30000);
    lastReadSaveRef.current = now;
    saveProgressNow(chapterNum, ms, "read", readDurationMs);
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
    // Flash the first word of the bookmarked segment
    if (blockIdx != null && segIdx != null) {
      const block = blocks[blockIdx];
      if (block?.type === "paragraph") {
        const seg = block.segments[segIdx];
        const firstTs = seg?.word_timestamps?.[0];
        if (firstTs) {
          const charStart = block.charOffsets[segIdx] + firstTs.char_start;
          const wordEl = document.getElementById(`w-${chapterNum}-${blockIdx}-${charStart}`);
          if (wordEl) {
            const cursorColor = getComputedStyle(document.documentElement).getPropertyValue("--color-cursor").trim();
            wordEl.style.transition = "text-decoration-color 0.15s";
            wordEl.style.textDecorationLine = "underline";
            wordEl.style.textDecorationColor = cursorColor;
            wordEl.style.textDecorationThickness = "3px";
            wordEl.style.textUnderlineOffset = "3px";
            setTimeout(() => {
              wordEl.style.transition = "text-decoration-color 0.6s";
              wordEl.style.textDecorationColor = "transparent";
              setTimeout(() => {
                wordEl.style.textDecorationLine = "";
                wordEl.style.textDecorationColor = "";
                wordEl.style.textDecorationThickness = "";
                wordEl.style.textUnderlineOffset = "";
                wordEl.style.transition = "";
              }, 600);
            }, 300);
          }
        }
      }
    }
  }, [chapterNum, blocks, saveProgressNow, audioRef]);

  // Shared: find the centered segment and update progress + audio position
  const updatePositionFromScroll = useCallback(() => {
    // Check top/bottom edges first
    const atTop = window.scrollY <= 5;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;

    if (atTop) {
      // Set to beginning of chapter
      const firstSeg = chapterData.segments.find(s => s.audio_start_ms != null);
      if (firstSeg) applyBookmark(firstSeg.audio_start_ms!, 0, 0);
      return;
    }
    if (atBottom) {
      // Set to end of chapter
      const lastSeg = [...chapterData.segments].reverse().find(s => s.audio_end_ms != null);
      if (lastSeg?.audio_end_ms != null) {
        applyBookmark(lastSeg.audio_end_ms);
      }
      return;
    }

    const centerY = getReadingCenterY(true);
    const refs = paraRefsMap.current[chapterNum];
    if (!refs) return;

    let bestBlock = -1;
    let bestDist = Infinity;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) {
        bestBlock = i;
        break;
      }
      const dist = Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY));
      if (dist < bestDist) {
        bestDist = dist;
        bestBlock = i;
      }
    }

    if (bestBlock < 0) return;
    const block = blocks[bestBlock];
    if (!block || block.type !== "paragraph") return;

    const el = refs[bestBlock];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (centerY - rect.top) / (rect.bottom - rect.top)));
    const segIdx = Math.min(
      block.segments.length - 1,
      Math.floor(ratio * block.segments.length)
    );
    const seg = block.segments[segIdx];
    if (seg?.audio_start_ms != null) {
      applyBookmark(seg.audio_start_ms, bestBlock, segIdx);
    }
  }, [chapterNum, chapterData.segments, blocks, applyBookmark]);

  // Return the paragraph element currently at the reading center (for font resize anchoring)
  const getCenteredParagraph = useCallback((): HTMLElement | null => {
    const centerY = getReadingCenterY(true);
    const refs = paraRefsMap.current[chapterNum];
    if (!refs) return null;
    let bestEl: HTMLElement | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) return el;
      const dist = Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY));
      if (dist < bestDist) { bestDist = dist; bestEl = el; }
    }
    return bestEl;
  }, [chapterNum]);

  // On scroll stop, update position (text mode + bookmark active, skip programmatic scrolls)
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
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isTextMode, bookmarkActive, updatePositionFromScroll]);

  // ── Source progress modal ─────────────────────────────────────────────

  const [showSourceModal, setShowSourceModal] = useState(!!sourceProgress);

  const handleCarryOver = useCallback(() => {
    if (!sourceProgress) return;
    setShowSourceModal(false);
    // Seek audio to the carried-over position
    const posMs = sourceProgress.audioPositionMs;
    if (audioRef.current && posMs > 0) {
      audioRef.current.currentTime = posMs / 1000;
    }
    saveProgressNow(chapterNum, posMs);
  }, [sourceProgress, audioRef, saveProgressNow, chapterNum]);

  const handleStartFresh = useCallback(() => {
    setShowSourceModal(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const [marginEl, setMarginEl] = useState<HTMLDivElement | null>(null);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="chapter-layout"
      style={{ paddingBottom: isTextMode ? "80px" : "200px" }}
    >
      {showIntroModal && (
        <ReadingModeIntroModal onClose={() => setShowIntroModal(false)} />
      )}

      <FloatingControls onResize={getCenteredParagraph} />

      {showSourceModal && sourceProgress && (
        <CourseChoiceModal
          title={chapterData.title}
          message={`You were listening to this chapter in ${sourceProgress.bookTitle}. Pick up where you left off?`}
          choices={[
            {
              label: "Pick up where I left off",
              sublabel: `At ${formatTime(sourceProgress.audioPositionMs)}`,
              onClick: handleCarryOver,
            },
            {
              label: "Start from the beginning",
              onClick: handleStartFresh,
            },
          ]}
        />
      )}
      {/* Bookmark indicator — fixed at vertical center, adjacent to text */}
      {isTextMode && (
        <button
          aria-label={bookmarkActive ? "Pause scroll tracking" : "Resume scroll tracking"}
          onClick={() => {
            if (!bookmarkActive) {
              // Re-enable: immediately update position to current scroll
              updatePositionFromScroll();
            }
            setBookmarkActive((b) => !b);
          }}
          className="reading-bookmark"
          style={{
            position: "fixed",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--color-cursor)",
            opacity: bookmarkActive ? 0.7 : 0.3,
            transition: "opacity 0.2s, color 0.2s",
            padding: 0,
          }}
        >
          <BookmarkIcon size={18} filled={bookmarkActive} />
        </button>
      )}

      <article className="chapter-text">
        {isFirstChapter && bookMeta.type !== "course" && (
          <div ref={heroRef} style={{ minHeight: 1 }}>
            <CoverImage bookId={bookId} title={bookMeta.title} />
            <div style={{ textAlign: "center", paddingBottom: "1.5rem" }}>
              {bookMeta.author && <p style={metaLineStyle}>by {bookMeta.author}</p>}
              {bookMeta.original_date && <p style={metaLineStyle}>{bookMeta.original_date}</p>}
              {bookMeta.translator && (
                <p style={metaLineStyle}>
                  Translated by {bookMeta.translator}
                  {bookMeta.translation_date ? ` in ${bookMeta.translation_date}` : ""}
                </p>
              )}
              {bookMeta.source_url && (
                <p style={metaLineStyle}>
                  <a href={bookMeta.source_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--color-text-secondary)" }} className="hover:underline">
                    Source: {sourceName(bookMeta.source_url)}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        <ChapterNav bookId={bookId} prevChapter={prevChapter} nextChapter={nextChapter} />

        {chapters.length > 1 && (
          <h2 style={{
            color: "var(--color-text-secondary)", fontFamily: "var(--font-body)",
            fontSize: "1.25rem", fontWeight: 400, textAlign: "center", margin: "2rem 0",
          }}>
            {chapterData.title}
          </h2>
        )}

        {blocks.length === 0 ? (
          <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
            No text available for this chapter.
          </p>
        ) : (
          <ChapterBlocks
            blocks={blocks}
            chapterNum={chapterNum}
            paraRefsMap={paraRefsMap}
            verse={layout === "verse"}
            annotations={annotations}
            bookId={bookId}
            onAnnotationSaved={fetchAnnotations}
            marginEl={marginEl}
          />
        )}

        <div ref={bottomRef} />

        {chapterType === "discussion" && nextChapter && (
          <div style={{ display: "flex", justifyContent: "center", margin: "2rem 0" }}>
            <a
              href={`/${bookId}/${nextChapter.num}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.875rem 2rem",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-bg)",
                borderRadius: "var(--radius-lg)",
                fontFamily: "var(--font-ui)",
                fontSize: "1rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
              className="hover:opacity-90"
            >
              Continue to {nextChapter.title}
            </a>
          </div>
        )}

        <ChapterNav bookId={bookId} prevChapter={prevChapter} nextChapter={nextChapter} />
        <div ref={setMarginEl} className="chapter-margin" />
      </article>
    </div>
  );
}
