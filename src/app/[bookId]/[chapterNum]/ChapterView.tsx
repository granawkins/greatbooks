"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { type SegmentBoundary, useAudioPlayer, type WordTiming } from "@/lib/AudioPlayerContext";
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

// ── ChapterView ─────────────────────────────────────────────────────────

export default function ChapterView({
  chapterNum,
  chapterData,
  initialAudioPositionMs,
}: {
  chapterNum: number;
  chapterData: ChapterData;
  initialAudioPositionMs: number;
}) {
  const { bookId, bookMeta, chapters, setCurrentChapter, cacheChapter } = useBookShell();
  const searchParams = useSearchParams();
  const scrollToBottom = searchParams.get("scroll") === "bottom";
  const autoplay = searchParams.get("autoplay") === "1";

  const { session, loadSession, wordTimingsRef, scrollDataRef } = useAudioPlayer();
  const { saveProgressNow } = useProgress(bookId);
  const { setScrolled } = useTopBar();

  const paraRefsMap = useRef<Record<number, (HTMLParagraphElement | null)[]>>({});
  const heroRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

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
    if (!isFirstChapter) { setScrolled(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [isFirstChapter, setScrolled]);

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
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  }, [scrollTargetBlockIdx, chapterNum, scrollToBottom]);

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

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <article
      className="mx-auto"
      style={{
        maxWidth: "68ch",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingBottom: "200px",
        position: "relative",
      }}
    >
      {isFirstChapter && (
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
        <ChapterBlocks blocks={blocks} chapterNum={chapterNum} paraRefsMap={paraRefsMap} verse={layout === "verse"} />
      )}

      <div ref={bottomRef} />
      <ChapterNav bookId={bookId} prevChapter={prevChapter} nextChapter={nextChapter} />
    </article>
  );
}
