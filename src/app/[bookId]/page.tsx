"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
function HighlightedParagraph({ para, paraIndex }: { para: ParagraphBlock; paraIndex: number }) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;

  if (!spans.length) return <>{text}</>;

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.charStart > lastEnd) elements.push(text.slice(lastEnd, span.charStart));
    elements.push(
      <span key={span.charStart} id={`w-${paraIndex}-${span.charStart}`}>
        {text.slice(span.charStart, span.charEnd)}
      </span>
    );
    lastEnd = span.charEnd;
  }
  if (lastEnd < text.length) elements.push(text.slice(lastEnd));

  return <>{elements}</>;
}

// Flat sorted list of every word span across all paragraph blocks, for the player's rAF loop.
function buildWordTimings(blocks: Block[]): WordTiming[] {
  const result: WordTiming[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== "paragraph") continue;
    for (const s of buildWordSpans(block)) {
      result.push({ id: `w-${i}-${s.charStart}`, start_ms: s.start_ms, end_ms: s.end_ms });
    }
  }
  return result;
}

type NavChapter = { id: number; title: string };
type BookMeta = { title: string; author: string };

// Top: left-aligned serif heading that opens a chapter dropdown
function ChapterHeading({
  chapters,
  activeChapterId,
  onSelect,
}: {
  chapters: NavChapter[];
  activeChapterId: number;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = chapters.find((c) => c.id === activeChapterId);

  return (
    <div ref={ref} className="relative mb-10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="group text-left"
        aria-expanded={open}
      >
        <h2
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "1.75rem",
            fontWeight: 400,
            lineHeight: 1.25,
            color: "var(--color-text)",
          }}
        >
          {current?.title}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 transition-all"
            style={{
              color: "var(--color-text-secondary)",
              opacity: open ? 0.7 : 0.3,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              marginTop: "0.1em",
            }}
            aria-hidden
          >
            <path d="M3 6l6 6 6-6" />
          </svg>
        </h2>
      </button>

      <div style={{ borderBottom: "1px solid var(--color-border)", marginTop: "1.25rem" }} />

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 overflow-auto"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
            maxHeight: "60vh",
            minWidth: "22rem",
          }}
        >
          {chapters.map((ch, i) => {
            const isActive = ch.id === activeChapterId;
            return (
              <button
                key={ch.id}
                onClick={() => { onSelect(ch.id); setOpen(false); }}
                className="flex items-baseline gap-4 w-full text-left px-5 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
                style={{
                  backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                  borderBottom: i < chapters.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span
                  className="text-xs tabular-nums shrink-0"
                  style={{
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                    opacity: 0.5,
                    minWidth: "1.5rem",
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {ch.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bottom: centered title with prev/next arrows
function ChapterFooterNav({
  chapters,
  activeChapterId,
  onSelect,
}: {
  chapters: NavChapter[];
  activeChapterId: number;
  onSelect: (id: number) => void;
}) {
  const idx = chapters.findIndex((c) => c.id === activeChapterId);
  const current = chapters[idx];
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <div
      className="flex items-center justify-center gap-6 py-4"
      style={{ marginTop: "2rem" }}
    >
      <button
        onClick={() => prev && onSelect(prev.id)}
        aria-label="Previous chapter"
        style={{ visibility: prev ? "visible" : "hidden", color: "var(--color-text-secondary)" }}
        className="p-1 transition-opacity hover:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4L6 9l5 5" />
        </svg>
      </button>

      <span
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-ui)",
          fontSize: "0.8125rem",
        }}
      >
        {current?.title}
      </span>

      <button
        onClick={() => next && onSelect(next.id)}
        aria-label="Next chapter"
        style={{ visibility: next ? "visible" : "hidden", color: "var(--color-text-secondary)" }}
        className="p-1 transition-opacity hover:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4l5 5-5 5" />
        </svg>
      </button>
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
  } = useAudioPlayer();

  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [bookChapters, setBookChapters] = useState<NavChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const restoredRef = useRef(false);
  const initialAudioMsRef = useRef(0);
  const activeChapterRef = useRef(1);

  // Keep activeChapterRef in sync (for the progress timer closure)
  useEffect(() => { activeChapterRef.current = activeChapterId; }, [activeChapterId]);

  // Push a history entry when chat opens so the browser back button closes it
  useEffect(() => {
    if (chatOpen) window.history.pushState({ chat: true }, "");
  }, [chatOpen]);

  // Browser back button: close chat or navigate to previous chapter
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setChatOpen(false);
      if (e.state?.chapter !== undefined) {
        setActiveChapterId(e.state.chapter);
        initialAudioMsRef.current = 0;
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  // Restore saved chapter on first load; seed the history entry with the chapter
  useEffect(() => {
    if (!progressLoaded || restoredRef.current || !progress) return;
    restoredRef.current = true;
    setActiveChapterId(progress.chapter_number);
    initialAudioMsRef.current = progress.audio_position_ms;
    window.history.replaceState({ chapter: progress.chapter_number }, "");
  }, [progressLoaded, progress]);

  // Fetch chapter data (abort stale requests to avoid race conditions)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/books/${bookId}/chapters/${activeChapterId}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setChapter(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") throw e;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [bookId, activeChapterId]);

  // Save progress on chapter change (after initial restore)
  const handleChapterSelect = useCallback(
    (chapterId: number) => {
      window.scrollTo({ top: 0, behavior: "instant" });
      window.history.pushState({ chapter: chapterId }, "");
      setActiveChapterId(chapterId);
      initialAudioMsRef.current = 0;
      if (restoredRef.current) {
        saveProgressNow(chapterId, 0);
      }
    },
    [saveProgressNow]
  );

  // Group raw segments into blocks (paragraphs + headings) for rendering
  const blocks = useMemo(
    () => (chapter?.segments ? groupIntoBlocks(chapter.segments) : []),
    [chapter]
  );

  // Word timings + paragraph ranges, rebuilt only when chapter changes
  const wordTimings = useMemo(
    () => buildWordTimings(blocks),
    [blocks]
  );
  const paraRanges = useMemo(
    () => blocks.map((b) => b.type === "paragraph" ? paraTimeRange(b) : null),
    [blocks]
  );

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    if (!chapter?.segments) return [];
    const result: SegmentBoundary[] = [];
    for (const seg of chapter.segments) {
      if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
        result.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
      }
    }
    return result.sort((a, b) => a.start_ms - b.start_ms);
  }, [chapter]);

  const audioSrc = chapter?.audio_file
    ? `/api/audio/${chapter.audio_file.replace(/^data\//, "")}`
    : null;

  // ── Load audio session into global player (only when no session exists) ─────
  useEffect(() => {
    if (!progressLoaded) return;
    if (!chapter?.audio_file || !audioSrc || !bookMeta) return;
    if (session) return; // keep existing session (even if different chapter/book)

    loadSession(
      {
        bookId,
        bookTitle: bookMeta.title,
        chapterTitle: chapter.title,
        chapterId: activeChapterId,
        src: audioSrc,
        durationMs: chapter.audio_duration_ms ?? 0,
        segmentBoundaries,
      },
      initialAudioMsRef.current
    );
    initialAudioMsRef.current = 0;
  }, [progressLoaded, chapter, audioSrc, bookMeta, bookId, activeChapterId, session, segmentBoundaries, loadSession]);

  // ── Tell the player what chapter we're viewing (immediate, no async deps) ───
  useEffect(() => {
    viewingChapterRef.current = { bookId, chapterId: activeChapterId };
    return () => { viewingChapterRef.current = null; };
  }, [bookId, activeChapterId, viewingChapterRef]);

  // ── Let the audio player navigate back to the session's chapter ────────────
  useEffect(() => {
    navigateToChapterRef.current = (chapterId: number) => {
      window.scrollTo({ top: 0, behavior: "instant" });
      window.history.pushState({ chapter: chapterId }, "");
      setActiveChapterId(chapterId);
    };
    return () => { navigateToChapterRef.current = null; };
  }, [navigateToChapterRef]);

  // ── Populate data refs for the player's imperative rAF loop ────────────────

  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== activeChapterId) return;
    wordTimingsRef.current = wordTimings;
    return () => { wordTimingsRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, activeChapterId, wordTimings, wordTimingsRef]);

  useEffect(() => {
    if (session?.bookId !== bookId || session?.chapterId !== activeChapterId || !paraRanges) return;
    scrollDataRef.current = { ranges: paraRanges, elements: paraRefs.current };
    return () => { scrollDataRef.current = null; };
  }, [session?.bookId, session?.chapterId, bookId, activeChapterId, paraRanges, scrollDataRef]);

  // ── Register pause callback (saves progress for the session's chapter) ─────

  useEffect(() => {
    if (!session || session.bookId !== bookId) return;
    const chapterId = session.chapterId;
    onPauseRef.current = (timeMs: number) => {
      saveProgressNow(chapterId, timeMs);
    };
    return () => { onPauseRef.current = null; };
  }, [session, bookId, saveProgressNow, onPauseRef]);

  // ── Register chat callback (always available on book page) ────────────────

  useEffect(() => {
    onChatClickRef.current = () => setChatOpen((o) => !o);
    return () => { onChatClickRef.current = null; };
  }, [onChatClickRef]);

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

      {bookChapters.length > 0 && (
        <ChapterHeading
          chapters={bookChapters}
          activeChapterId={activeChapterId}
          onSelect={handleChapterSelect}
        />
      )}

      {loading ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          Loading…
        </p>
      ) : !blocks.length ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          No text available for this chapter.
        </p>
      ) : (
        <div className="space-y-5">
          {blocks.map((block, i) =>
            block.type === "heading" ? (
              <p
                key={i}
                ref={(el) => { paraRefs.current[i] = el; }}
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
                ref={(el) => { paraRefs.current[i] = el; }}
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "1.125rem",
                  lineHeight: "1.85",
                }}
              >
                <HighlightedParagraph para={block} paraIndex={i} />
              </p>
            )
          )}
        </div>
      )}

      {!loading && bookChapters.length > 0 && (
        <ChapterFooterNav
          chapters={bookChapters}
          activeChapterId={activeChapterId}
          onSelect={handleChapterSelect}
        />
      )}
    </article>
  );
}
