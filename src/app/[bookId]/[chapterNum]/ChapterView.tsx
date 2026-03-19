"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { type SegmentBoundary, useAudioPlayer } from "@/lib/AudioPlayerContext";
import { getReadingCenterY, scrollToCenter } from "@/lib/readingCenter";
import { useTopBar } from "@/lib/TopBarContext";
import { useBookShell } from "@/app/[bookId]/BookShell";
import { groupIntoBlocks, paraTimeRange, type ChapterData } from "@/components/reader";
import { useWordTimings } from "@/components/reader/useWordTimings";
import { AnnotationLayer } from "@/components/reader/AnnotationLayer";
import { AnnotationProvider } from "@/components/reader/AnnotationContext";
import { applyClassById, removeClassById, findFirstSpanInSegment } from "@/components/reader/wordAnnotator";
import CourseChoiceModal from "@/components/CourseChoiceModal";
import { FloatingControls } from "@/app/[bookId]/FloatingControls";
import type { Annotation } from "@/components/reader/types";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import UpgradeModal, { type UpgradeModalVariant } from "@/components/UpgradeModal";

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
    display: "flex", alignItems: "flex-start", gap: 14,
    padding: "14px 16px", borderRadius: "var(--radius)", border: "1px solid var(--color-border)",
  };
  const iconWrap: React.CSSProperties = {
    flexShrink: 0, width: 28, height: 28, display: "flex",
    alignItems: "center", justifyContent: "center", marginTop: 1,
  };

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", maxWidth: 340, width: "100%", fontFamily: "var(--font-ui)", color: "var(--color-text)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={rowStyle}>
          <div style={{ ...iconWrap, color: "var(--color-cursor)", opacity: 0.7 }}><BookmarkIcon size={18} filled /></div>
          <div>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Tracks your place</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
              Your position updates to the sentence at the center of the screen when you stop scrolling.
            </p>
          </div>
        </div>
        <div style={rowStyle}>
          <div style={{ ...iconWrap, color: "var(--color-cursor)", opacity: 0.3 }}><BookmarkIcon size={18} filled={false} /></div>
          <div>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Tap to pause</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
              Tap the bookmark to browse freely without updating your position. Tap again to resume.
            </p>
          </div>
        </div>
        <button onClick={onClose}
          style={{ marginTop: 4, padding: "10px", border: "none", borderRadius: "var(--radius)", backgroundColor: "var(--color-accent)", color: "var(--color-bg)", fontFamily: "var(--font-ui)", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>
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
  children,
}: {
  chapterNum: number;
  chapterData: ChapterData;
  chapterType?: "text" | "discussion";
  initialAudioPositionMs: number;
  sourceProgress?: { bookTitle: string; chapterNumber: number; audioPositionMs: number } | null;
  initialAnnotations?: Annotation[];
  children?: ReactNode;
}) {
  const { bookId, bookMeta, chapters, setCurrentChapter, cacheChapter, saveProgressNow } = useBookShell();
  const searchParams = useSearchParams();
  const scrollToBottom = searchParams.get("scroll") === "bottom";
  const autoplay = searchParams.get("autoplay") === "1";

  const { session, loadSession, wordTimingsRef, scrollDataRef, audioRef, viewMode, audioGateCheckRef, onAudioBlockedRef, getSessionListenedMs } = useAudioPlayer();
  const { user, loading: authLoading } = useAuth();
  const { setScrolled } = useTopBar();
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalVariant | null>(null);

  const textContainerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef<number | null>(null);
  const lastReadSaveRef = useRef<number>(0);
  const [scrollReady, setScrollReady] = useState(false);

  const segments = chapterData.segments;
  const layout = bookMeta.layout || "prose";

  // ── Restore font size from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("greatbooks-font-size");
      if (stored) document.documentElement.style.setProperty("--font-size-body", `${stored}px`);
    } catch {}
  }, []);

  // ── Audio gate check ─────────────────────────────────────────────────
  useEffect(() => {
    audioGateCheckRef.current = () => {
      // Don't gate while auth is still loading — allow session to load,
      // gate will re-check once auth resolves
      if (authLoading) return null;
      if (!user || user.tier === "anonymous") return "login";
      if (user.audioLimitMs !== Infinity) {
        const totalUsed = user.audioUsedMs + getSessionListenedMs();
        if (totalUsed >= user.audioLimitMs) return "audio_limit";
      }
      return null;
    };
    onAudioBlockedRef.current = (reason: "login" | "audio_limit") => setUpgradeModal(reason);
    return () => { audioGateCheckRef.current = null; onAudioBlockedRef.current = null; };
  }, [user, authLoading, audioGateCheckRef, onAudioBlockedRef, getSessionListenedMs]);

  // Annotations managed via AnnotationProvider (wraps children in render)

  const isFirstChapter = chapterNum === chapters[0]?.id;
  const chapterIdx = chapters.findIndex((c) => c.id === chapterNum);
  const nextChapter = chapterIdx < chapters.length - 1 ? { num: chapters[chapterIdx + 1].id, title: chapters[chapterIdx + 1].title } : null;

  // ── Register with BookShell ───────────────────────────────────────────
  useEffect(() => {
    setCurrentChapter(chapterNum);
    cacheChapter(chapterNum, chapterData);
  }, [chapterNum, chapterData, setCurrentChapter, cacheChapter]);

  useEffect(() => {
    if (!isFirstChapter || bookMeta.type === "course") { setScrolled(true); return; }
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [isFirstChapter, setScrolled, bookMeta.type]);

  // ── Blocks (for scroll data + time ranges) ────────────────────────────
  const blocks = useMemo(() => groupIntoBlocks(segments, layout), [segments, layout]);

  // ── Collect block refs from data-block-idx attributes ─────────────────
  const blockRefsRef = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;
    const els = container.querySelectorAll<HTMLElement>("[data-block-idx]");
    const refs: (HTMLElement | null)[] = new Array(blocks.length).fill(null);
    els.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-block-idx") ?? "");
      if (!isNaN(idx)) refs[idx] = el;
    });
    blockRefsRef.current = refs;
  });

  // ── Lazy word timings ─────────────────────────────────────────────────
  const { allTimings } = useWordTimings(bookId, chapterNum, segments, layout);

  const paraRanges = useMemo(
    () => blocks.map((b) => (b.type === "paragraph" ? paraTimeRange(b) : null)),
    [blocks]
  );

  // ── Scroll position ───────────────────────────────────────────────────
  const [effectiveAudioMs, setEffectiveAudioMs] = useState(initialAudioPositionMs);
  useEffect(() => {
    if (session?.bookId === bookId && session?.chapterId === chapterNum && audioRef.current) {
      const currentMs = Math.floor(audioRef.current.currentTime * 1000);
      if (currentMs > 0) setEffectiveAudioMs(currentMs);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTargetBlockIdx = useMemo(() => {
    if (scrollToBottom || effectiveAudioMs <= 0) return -1;
    let targetSegIdx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].audio_start_ms != null && segments[i].audio_start_ms! <= effectiveAudioMs) targetSegIdx = i;
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
  }, [segments, effectiveAudioMs, blocks, scrollToBottom]);

  useLayoutEffect(() => {
    if (initialScrollDone.current === chapterNum) return;
    initialScrollDone.current = chapterNum;
    if (scrollToBottom) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
    } else if (scrollTargetBlockIdx >= 0) {
      const el = blockRefsRef.current[scrollTargetBlockIdx];
      if (el) scrollToCenter(el, "instant", viewMode === "text");
    }
    setScrollReady(true);
  }, [scrollTargetBlockIdx, chapterNum, scrollToBottom, viewMode]);

  // ── Audio integration ─────────────────────────────────────────────────

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    return segments
      .filter((s) => s.audio_start_ms != null && s.audio_end_ms != null)
      .map((s) => ({ start_ms: s.audio_start_ms!, end_ms: s.audio_end_ms! }))
      .sort((a, b) => a.start_ms - b.start_ms);
  }, [segments]);

  const audioSrc = chapterData.audio_file
    ? `/api/audio/${chapterData.audio_file.replace(/^data\//, "")}`
    : null;

  useEffect(() => {
    if (!chapterData.audio_file || !audioSrc) return;
    if (session?.bookId === bookId && session?.chapterId === chapterNum) return;
    loadSession({
      bookId, bookTitle: bookMeta.title, chapterTitle: chapterData.title,
      chapterId: chapterNum, src: audioSrc, durationMs: chapterData.audio_duration_ms ?? 0,
      segmentBoundaries,
    }, initialAudioPositionMs, autoplay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { saveProgressNow(chapterNum, initialAudioPositionMs); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed word timings to AudioPlayer rAF loop
  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== chapterNum) return;
    wordTimingsRef.current = allTimings.length > 0 ? allTimings : null;
    return () => { wordTimingsRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, chapterNum, allTimings, wordTimingsRef]);

  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== chapterNum) return;
    scrollDataRef.current = { ranges: paraRanges, elements: blockRefsRef.current };
    return () => { scrollDataRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, chapterNum, paraRanges, scrollDataRef]);

  // ── Reading mode: scroll-based progress tracking ─────────────────────

  const [bookmarkActive, setBookmarkActive] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const isTextMode = viewMode === "text";
  const hasScrolledRef = useRef(false);
  const prevViewMode = useRef(viewMode);
  const programmaticScrollRef = useRef(false);

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
  }, [viewMode, audioRef, chapterNum, blocks]);

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

  const applyBookmark = useCallback((ms: number, seg?: { sequence: number; audio_start_ms: number | null }) => {
    const now = Date.now();
    const elapsed = lastReadSaveRef.current > 0 ? now - lastReadSaveRef.current : 0;
    const readDurationMs = Math.min(elapsed, 30000);
    lastReadSaveRef.current = now;
    saveProgressNow(chapterNum, ms, "read", readDurationMs);
    if (audioRef.current) audioRef.current.currentTime = ms / 1000;
    // Flash the first word of the bookmarked segment
    if (seg) {
      const span = findFirstSpanInSegment(chapterNum, seg.sequence);
      console.log("[bookmark]", { seq: seg.sequence, spanId: span?.id, spanText: span?.textContent?.slice(0, 20) });
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

  const updatePositionFromScroll = useCallback(() => {
    const atTop = window.scrollY <= 5;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;

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
  }, [segments, blocks, applyBookmark]);

  const getCenteredParagraph = useCallback((): HTMLElement | null => {
    const centerY = getReadingCenterY(true);
    const refs = blockRefsRef.current;
    let bestEl: HTMLElement | null = null;
    let bestDist = Infinity;
    for (const el of refs) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) return el;
      const dist = Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY));
      if (dist < bestDist) { bestDist = dist; bestEl = el; }
    }
    return bestEl;
  }, []);

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

  // ── Source progress modal ─────────────────────────────────────────────
  const [showSourceModal, setShowSourceModal] = useState(!!sourceProgress);
  const handleCarryOver = useCallback(() => {
    if (!sourceProgress) return;
    setShowSourceModal(false);
    if (audioRef.current && sourceProgress.audioPositionMs > 0)
      audioRef.current.currentTime = sourceProgress.audioPositionMs / 1000;
    saveProgressNow(chapterNum, sourceProgress.audioPositionMs);
  }, [sourceProgress, audioRef, saveProgressNow, chapterNum]);

  // ── Render ────────────────────────────────────────────────────────────
  const [marginEl, setMarginEl] = useState<HTMLDivElement | null>(null);
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
  };

  return (
    <AnnotationProvider initial={initialAnnotations}>
    <div className={scrollReady ? "chapter-layout" : "chapter-layout chapter-layout--positioning"}
      style={{ paddingBottom: isTextMode ? "80px" : "200px" }}>

      {showIntroModal && <ReadingModeIntroModal onClose={() => setShowIntroModal(false)} />}
      <FloatingControls onResize={getCenteredParagraph} />

      {showSourceModal && sourceProgress && (
        <CourseChoiceModal
          title={chapterData.title}
          message={`You were listening to this chapter in ${sourceProgress.bookTitle}. Pick up where you left off?`}
          choices={[
            { label: "Pick up where I left off", sublabel: `At ${formatTime(sourceProgress.audioPositionMs)}`, onClick: handleCarryOver },
            { label: "Start from the beginning", onClick: () => setShowSourceModal(false) },
          ]}
        />
      )}

      {isTextMode && (
        <button aria-label={bookmarkActive ? "Pause scroll tracking" : "Resume scroll tracking"}
          onClick={() => { if (!bookmarkActive) updatePositionFromScroll(); setBookmarkActive((b) => !b); }}
          className="reading-bookmark"
          style={{ position: "fixed", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--color-cursor)", opacity: bookmarkActive ? 0.7 : 0.3, transition: "opacity 0.2s, color 0.2s", padding: 0 }}>
          <BookmarkIcon size={18} filled={bookmarkActive} />
        </button>
      )}

      <article className="chapter-text">
        {isFirstChapter && bookMeta.type !== "course" && (
          <div ref={heroRef} style={{ minHeight: 1 }}>
            <div style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
              {bookMeta.author && <p style={metaLineStyle}>by {bookMeta.author}</p>}
              {bookMeta.original_date && <p style={metaLineStyle}>{bookMeta.original_date}</p>}
              {bookMeta.translator && (
                <p style={metaLineStyle}>Translated by {bookMeta.translator}{bookMeta.translation_date ? ` in ${bookMeta.translation_date}` : ""}</p>
              )}
              {bookMeta.source_url && (
                <p style={metaLineStyle}>
                  <a href={bookMeta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-secondary)" }} className="hover:underline">
                    Source: {sourceName(bookMeta.source_url)}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {chapters.length > 1 && (
          <h2 style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)", fontSize: "1.25rem", fontWeight: 400, textAlign: "center", margin: "2rem 0" }}>
            {chapterData.title}
          </h2>
        )}

        <div ref={textContainerRef}>
          {children ?? (
            <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
              No text available for this chapter.
            </p>
          )}
        </div>

        <div ref={bottomRef} />

        {nextChapter && (
          <nav style={{ display: "flex", alignItems: "center", justifyContent: chapterType === "discussion" ? "center" : "flex-end", padding: "0.75rem 0", borderTop: "1px solid var(--color-border)", margin: "1.5rem 0", fontFamily: "var(--font-ui)", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
            {chapterType === "discussion" ? (
              <Link href={`/${bookId}/${nextChapter.num}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 2rem", backgroundColor: "var(--color-accent)", color: "var(--color-bg)", borderRadius: "var(--radius-lg)", fontFamily: "var(--font-ui)", fontSize: "1rem", fontWeight: 500, textDecoration: "none", transition: "opacity 0.15s" }}
                className="hover:opacity-90">
                Continue to {nextChapter.title}
              </Link>
            ) : (
              <Link href={`/${bookId}/${nextChapter.num}`}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", textDecoration: "none", color: "var(--color-text-secondary)", transition: "color 0.15s" }}
                className="hover:text-[var(--color-text)]">
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextChapter.title}</span>
                <span style={{ flexShrink: 0, fontSize: "0.75rem" }}>&rarr;</span>
              </Link>
            )}
          </nav>
        )}
        <div ref={setMarginEl} className="chapter-margin" />
      </article>

      <AnnotationLayer
        blocks={blocks}
        bookId={bookId}
        chapterNum={chapterNum}
        marginEl={marginEl}
        textContainerRef={textContainerRef}
      />

      {upgradeModal && <UpgradeModal variant={upgradeModal} onClose={() => setUpgradeModal(null)} />}
    </div>
    </AnnotationProvider>
  );
}
