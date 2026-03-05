"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type SegmentBoundary } from "@/lib/AudioPlayerContext";
import ChatView from "@/components/ChatView";
import { useProgress } from "@/lib/useProgress";
import { useAudioPlayer, type WordTiming } from "@/lib/AudioPlayerContext";

type WordTs = {
  start_ms: number;
  end_ms: number;
  char_start: number;
  char_end: number;
};

type Segment = {
  id: number;
  text: string;
  segment_type: "heading" | "text" | "paragraph_break";
  audio_start_ms: number | null;
  audio_end_ms: number | null;
  word_timestamps: WordTs[] | null;
};

type ChapterData = {
  title: string;
  segments: Segment[];
  audio_file: string | null;
  audio_duration_ms: number | null;
};

// A block is either a paragraph (consecutive text segments) or a heading
type ParagraphBlock = {
  type: "paragraph";
  segments: Segment[];
  text: string; // joined segment texts
  charOffsets: number[]; // where each segment starts in `text`
};

type HeadingBlock = {
  type: "heading";
  text: string;
};

type Block = ParagraphBlock | HeadingBlock;

function groupIntoBlocks(segments: Segment[]): Block[] {
  const blocks: Block[] = [];
  let current: Segment[] = [];

  const flush = () => {
    if (current.length === 0) return;
    let offset = 0;
    const offsets = current.map((seg) => {
      const o = offset;
      offset += seg.text.length + 1; // +1 for joining space
      return o;
    });
    blocks.push({
      type: "paragraph",
      segments: current,
      text: current.map((s) => s.text).join(" "),
      charOffsets: offsets,
    });
  };

  for (const seg of segments) {
    if (seg.segment_type === "heading") {
      flush();
      current = [];
      blocks.push({ type: "heading", text: seg.text });
      continue;
    }
    if (seg.segment_type !== "text") {
      flush();
      current = [];
      continue;
    }
    current.push(seg);
  }
  flush();
  return blocks;
}

// Build a flat list of word spans for a paragraph with interpolated timestamps.
// Raw STT has 1-second resolution, so we distribute words evenly within time buckets.
type WordSpan = { start_ms: number; end_ms: number; charStart: number; charEnd: number };

function buildWordSpans(para: ParagraphBlock): WordSpan[] {
  const raw: WordSpan[] = [];
  for (let si = 0; si < para.segments.length; si++) {
    const seg = para.segments[si];
    if (!seg.word_timestamps) continue;
    const offset = para.charOffsets[si];
    for (const w of seg.word_timestamps) {
      raw.push({
        start_ms: w.start_ms,
        end_ms: w.end_ms,
        charStart: offset + w.char_start,
        charEnd: offset + w.char_end,
      });
    }
  }
  if (raw.length === 0) return raw;

  // Interpolate: evenly space words between time boundaries
  const spans: WordSpan[] = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const runStart = i;
    const timeRef = raw[i].start_ms;
    while (i < raw.length - 1 && raw[i + 1].start_ms === timeRef) i++;
    const runEnd = i;
    const count = runEnd - runStart + 1;

    const tStart = runStart > 0 ? raw[runStart - 1].end_ms : raw[runStart].start_ms;
    const tEnd = raw[runEnd].end_ms;
    const duration = tEnd - tStart;

    for (let j = 0; j < count; j++) {
      const idx = runStart + j;
      spans[idx] = {
        start_ms: tStart + Math.round((duration * j) / count),
        end_ms: tStart + Math.round((duration * (j + 1)) / count),
        charStart: raw[idx].charStart,
        charEnd: raw[idx].charEnd,
      };
    }
  }

  return spans;
}

function paraTimeRange(para: ParagraphBlock): { start_ms: number; end_ms: number } | null {
  let start = Infinity;
  let end = 0;
  for (const seg of para.segments) {
    if (seg.audio_start_ms != null) start = Math.min(start, seg.audio_start_ms);
    if (seg.audio_end_ms != null) end = Math.max(end, seg.audio_end_ms);
  }
  if (start === Infinity) return null;
  return { start_ms: start, end_ms: end };
}

// Renders paragraph text with stable word-span IDs.
// Highlighting is applied imperatively via document.getElementById.
function HighlightedParagraph({ para, idPrefix }: { para: ParagraphBlock; idPrefix: string }) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;

  if (!spans.length) return <>{text}</>;

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.charStart > lastEnd) elements.push(text.slice(lastEnd, span.charStart));
    elements.push(
      <span key={span.charStart} id={`w-${idPrefix}-${span.charStart}`}>
        {text.slice(span.charStart, span.charEnd)}
      </span>
    );
    lastEnd = span.charEnd;
  }
  if (lastEnd < text.length) elements.push(text.slice(lastEnd));

  return <>{elements}</>;
}

// Flat sorted list of every word span across all paragraph blocks, for the player's rAF loop.
function buildWordTimings(blocks: Block[], chapterNum: number): WordTiming[] {
  const result: WordTiming[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== "paragraph") continue;
    for (const s of buildWordSpans(block)) {
      result.push({ id: `w-${chapterNum}-${i}-${s.charStart}`, start_ms: s.start_ms, end_ms: s.end_ms });
    }
  }
  return result;
}

type NavChapter = { id: number; title: string };
type BookMeta = { title: string; author: string };

// Inline divider between chapters in the infinite scroll
function ChapterDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-6 my-16">
      <div className="flex-1" style={{ borderBottom: "1px solid var(--color-border)" }} />
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: "1.25rem",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <div className="flex-1" style={{ borderBottom: "1px solid var(--color-border)" }} />
    </div>
  );
}

// Renders a single chapter's blocks
function ChapterBlocks({
  blocks,
  chapterNum,
  paraRefsMap,
}: {
  blocks: Block[];
  chapterNum: number;
  paraRefsMap: React.RefObject<Record<number, (HTMLParagraphElement | null)[]>>;
}) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) =>
        block.type === "heading" ? (
          <p
            key={i}
            ref={(el) => {
              if (!paraRefsMap.current[chapterNum]) paraRefsMap.current[chapterNum] = [];
              paraRefsMap.current[chapterNum][i] = el;
            }}
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginTop: "2rem",
            }}
          >
            {block.text}
          </p>
        ) : (
          <p
            key={i}
            ref={(el) => {
              if (!paraRefsMap.current[chapterNum]) paraRefsMap.current[chapterNum] = [];
              paraRefsMap.current[chapterNum][i] = el;
            }}
            style={{
              color: "var(--color-text)",
              fontFamily: "var(--font-body)",
              fontSize: "1.125rem",
              lineHeight: "1.85",
            }}
          >
            <HighlightedParagraph para={block} idPrefix={`${chapterNum}-${i}`} />
          </p>
        )
      )}
    </div>
  );
}

export default function BookPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { progress, loaded: progressLoaded, saveProgressNow } = useProgress(bookId);
  const {
    session,
    loadSession,
    wordTimingsRef,
    scrollDataRef,
    viewingChapterRef,
    navigateToChapterRef,
    onPauseRef,
    onChatClickRef,
    onChapterSelectRef,
  } = useAudioPlayer();

  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [bookChapters, setBookChapters] = useState<NavChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [loadedChapters, setLoadedChapters] = useState<Record<number, ChapterData>>({});
  const [chatOpen, setChatOpen] = useState(false);

  const paraRefsMap = useRef<Record<number, (HTMLParagraphElement | null)[]>>({});
  const chapterSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const restoredRef = useRef(false);
  const initialAudioMsRef = useRef(0);
  const activeChapterRef = useRef(1);
  const loadingRef = useRef<Set<number>>(new Set());
  const scrollAnchorRef = useRef<{ chapterNum: number; top: number } | null>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Keep activeChapterRef in sync (for the progress timer closure)
  useEffect(() => { activeChapterRef.current = activeChapterId; }, [activeChapterId]);

  // Sorted list of loaded chapter numbers
  const sortedChapterNums = useMemo(
    () => Object.keys(loadedChapters).map(Number).sort((a, b) => a - b),
    [loadedChapters]
  );

  const initialLoading = sortedChapterNums.length === 0;

  // Blocks per chapter
  const allChapterBlocks = useMemo(() => {
    const result: Record<number, Block[]> = {};
    for (const [num, data] of Object.entries(loadedChapters)) {
      result[Number(num)] = groupIntoBlocks(data.segments);
    }
    return result;
  }, [loadedChapters]);

  // Push a history entry when chat opens so the browser back button closes it
  useEffect(() => {
    if (chatOpen) window.history.pushState({ chat: true }, "");
  }, [chatOpen]);

  // Browser back button: close chat
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setChatOpen(false);
      if (e.state?.chapter !== undefined) {
        // Jump to chapter (from old history entries)
        handleChapterJump(e.state.chapter);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chapter list for navigation
  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.chapters) {
          setBookMeta({ title: data.title, author: data.author });
          setBookChapters(
            data.chapters.map((c: { number: number; title: string }) => ({
              id: c.number,
              title: c.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, [bookId]);

  // Restore saved chapter on first load
  useEffect(() => {
    if (!progressLoaded || restoredRef.current) return;
    restoredRef.current = true;
    if (progress) {
      setActiveChapterId(progress.chapter_number);
      initialAudioMsRef.current = progress.audio_position_ms;
      fetchChapter(progress.chapter_number);
      window.history.replaceState({ chapter: progress.chapter_number }, "");
    } else {
      fetchChapter(1);
      window.history.replaceState({ chapter: 1 }, "");
    }
  }, [progressLoaded, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a chapter (idempotent)
  const fetchChapter = useCallback(async (chapterNum: number) => {
    if (loadingRef.current.has(chapterNum)) return;
    loadingRef.current.add(chapterNum);
    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapterNum}`);
      if (!res.ok) return;
      const data: ChapterData = await res.json();

      // If prepending, save scroll anchor for position restoration
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

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target === topSentinelRef.current) {
          const minChapter = Math.min(...sortedChapterNums);
          if (minChapter > 1) fetchChapter(minChapter - 1);
        }
        if (entry.target === bottomSentinelRef.current) {
          const maxChapter = Math.max(...sortedChapterNums);
          if (maxChapter < bookChapters.length) fetchChapter(maxChapter + 1);
        }
      }
    }, { rootMargin: "400px" });

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

    return () => observer.disconnect();
  }, [sortedChapterNums, bookChapters, fetchChapter]);

  // Track which chapter is in the viewport (for heading + progress)
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

  // Jump to a specific chapter (from dropdown or history)
  const handleChapterJump = useCallback(
    (chapterId: number) => {
      // If already loaded, scroll to it
      const el = chapterSectionRefs.current[chapterId];
      if (el) {
        el.scrollIntoView({ behavior: "instant" });
        window.scrollBy(0, -80); // offset for header
        setActiveChapterId(chapterId);
        activeChapterRef.current = chapterId;
        saveProgressNow(chapterId, 0);
        return;
      }
      // Otherwise, reset and load the new chapter
      setLoadedChapters({});
      paraRefsMap.current = {};
      chapterSectionRefs.current = {};
      setActiveChapterId(chapterId);
      activeChapterRef.current = chapterId;
      initialAudioMsRef.current = 0;
      window.scrollTo({ top: 0, behavior: "instant" });
      fetchChapter(chapterId);
      saveProgressNow(chapterId, 0);
    },
    [fetchChapter, saveProgressNow]
  );


  // ── Audio integration ─────────────────────────────────────────────────────

  // Build word timings + para ranges for the session's chapter
  const sessionChapterId = session?.chapterId;
  const sessionBlocks = sessionChapterId != null ? allChapterBlocks[sessionChapterId] : null;

  const wordTimings = useMemo(
    () => (sessionBlocks && sessionChapterId != null ? buildWordTimings(sessionBlocks, sessionChapterId) : []),
    [sessionBlocks, sessionChapterId]
  );

  const paraRanges = useMemo(
    () => sessionBlocks?.map((b) => (b.type === "paragraph" ? paraTimeRange(b) : null)) ?? [],
    [sessionBlocks]
  );

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    if (!sessionChapterId || !loadedChapters[sessionChapterId]) return [];
    const result: SegmentBoundary[] = [];
    for (const seg of loadedChapters[sessionChapterId].segments) {
      if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
        result.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
      }
    }
    return result.sort((a, b) => a.start_ms - b.start_ms);
  }, [sessionChapterId, loadedChapters]);

  // Find audio source for the active chapter (used for initial session load)
  const initialChapterData = loadedChapters[activeChapterId];
  const audioSrc = initialChapterData?.audio_file
    ? `/api/audio/${initialChapterData.audio_file.replace(/^data\//, "")}`
    : null;

  // Load audio session into global player (only when no session exists)
  useEffect(() => {
    if (!progressLoaded) return;
    if (!initialChapterData?.audio_file || !audioSrc || !bookMeta) return;
    if (session) return;

    loadSession(
      {
        bookId,
        bookTitle: bookMeta.title,
        chapterTitle: initialChapterData.title,
        chapterId: activeChapterId,
        src: audioSrc,
        durationMs: initialChapterData.audio_duration_ms ?? 0,
        segmentBoundaries,
      },
      initialAudioMsRef.current
    );
    initialAudioMsRef.current = 0;
  }, [progressLoaded, initialChapterData, audioSrc, bookMeta, bookId, activeChapterId, session, segmentBoundaries, loadSession]);

  // Tell the player what chapter we're viewing
  useEffect(() => {
    viewingChapterRef.current = { bookId, chapterId: activeChapterId };
    return () => { viewingChapterRef.current = null; };
  }, [bookId, activeChapterId, viewingChapterRef]);

  // Let the audio player navigate back to the session's chapter
  useEffect(() => {
    navigateToChapterRef.current = (chapterId: number) => {
      handleChapterJump(chapterId);
    };
    return () => { navigateToChapterRef.current = null; };
  }, [navigateToChapterRef, handleChapterJump]);

  // Populate data refs for the player's imperative rAF loop
  useEffect(() => {
    if (session?.bookId !== bookId || !sessionChapterId || !loadedChapters[sessionChapterId]) return;
    wordTimingsRef.current = wordTimings;
    return () => { wordTimingsRef.current = null; };
  }, [session?.bookId, bookId, sessionChapterId, wordTimings, wordTimingsRef, loadedChapters]);

  useEffect(() => {
    if (session?.bookId !== bookId || !sessionChapterId || !loadedChapters[sessionChapterId]) return;
    scrollDataRef.current = { ranges: paraRanges, elements: paraRefsMap.current[sessionChapterId] || [] };
    return () => { scrollDataRef.current = null; };
  }, [session?.bookId, bookId, sessionChapterId, paraRanges, scrollDataRef, loadedChapters]);

  // Register pause callback
  useEffect(() => {
    if (!session || session.bookId !== bookId) return;
    const chapterId = session.chapterId;
    onPauseRef.current = (timeMs: number) => {
      saveProgressNow(chapterId, timeMs);
    };
    return () => { onPauseRef.current = null; };
  }, [session, bookId, saveProgressNow, onPauseRef]);

  // Register chat callback
  useEffect(() => {
    onChatClickRef.current = () => setChatOpen((o) => !o);
    return () => { onChatClickRef.current = null; };
  }, [onChatClickRef]);

  // Register chapter select callback (from audio player dropdown)
  useEffect(() => {
    onChapterSelectRef.current = (chapterId: number) => {
      // Navigate to the chapter
      handleChapterJump(chapterId);
      // Load a new audio session for the selected chapter
      const chapterData = loadedChapters[chapterId];
      if (chapterData?.audio_file && bookMeta) {
        const src = `/api/audio/${chapterData.audio_file.replace(/^data\//, "")}`;
        const boundaries: SegmentBoundary[] = [];
        for (const seg of chapterData.segments) {
          if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
            boundaries.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
          }
        }
        boundaries.sort((a, b) => a.start_ms - b.start_ms);
        loadSession({
          bookId,
          bookTitle: bookMeta.title,
          chapterTitle: chapterData.title,
          chapterId,
          src,
          durationMs: chapterData.audio_duration_ms ?? 0,
          segmentBoundaries: boundaries,
        });
      }
    };
    return () => { onChapterSelectRef.current = null; };
  }, [onChapterSelectRef, handleChapterJump, loadedChapters, bookMeta, bookId, loadSession]);

  if (chatOpen) {
    return (
      <ChatView
        bookId={bookId}
        bookTitle={bookMeta?.title ?? ""}
        authorName={bookMeta?.author ?? ""}
        onClose={() => window.history.back()}
      />
    );
  }

  return (
    <article
      className="mx-auto"
      style={{
        maxWidth: "68ch",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingBottom: "200px",
      }}
    >
      {/* Book header */}
      <div className="flex items-center mb-8 mt-6">
        <Link
          href="/"
          className="flex items-center gap-2 -ml-1 px-1 py-1 rounded-[var(--radius)] transition-opacity hover:opacity-60"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Back to library"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4L6 9l5 5" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.9375rem",
            }}
          >
            {bookMeta ? `${bookMeta.title}, ${bookMeta.author}` : ""}
          </span>
        </Link>
      </div>

      {/* Top sentinel for loading previous chapters */}
      <div ref={topSentinelRef} style={{ height: 1 }} />

      {initialLoading ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          Loading...
        </p>
      ) : (
        sortedChapterNums.map((chapterNum) => {
          const blocks = allChapterBlocks[chapterNum] || [];
          const chapterMeta = bookChapters.find((c) => c.id === chapterNum);
          return (
            <div
              key={chapterNum}
              ref={(el) => { chapterSectionRefs.current[chapterNum] = el; }}
              data-chapter={chapterNum}
            >
              {chapterMeta && (
                <ChapterDivider title={chapterMeta.title} />
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
                />
              )}
            </div>
          );
        })
      )}

      {/* Bottom sentinel for loading next chapters */}
      <div ref={bottomSentinelRef} style={{ height: 1 }} />
    </article>
  );
}
