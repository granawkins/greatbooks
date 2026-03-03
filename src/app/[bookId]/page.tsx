"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AudioPlayer, { SegmentBoundary } from "@/components/AudioPlayer";
import ChatBubble from "@/components/ChatBubble";
import { useProgress } from "@/lib/useProgress";

type WordTs = {
  start_ms: number;
  end_ms: number;
  char_start: number;
  char_end: number;
};

type SegmentInfo = {
  id: number;
  audio_start_ms: number | null;
  audio_end_ms: number | null;
  word_timestamps: WordTs[] | null;
  char_offset: number;
};

type Paragraph = {
  text: string;
  segments: SegmentInfo[];
};

type ChapterData = {
  title: string;
  paragraphs: Paragraph[];
  audio_file: string | null;
  audio_duration_ms: number | null;
};

// Build a flat list of word spans for a paragraph, with global char positions
// and interpolated sub-second timestamps. The raw STT data has 1-second
// resolution, so multiple words share the same start/end. We evenly distribute
// words between known time boundaries so highlighting moves smoothly.
type WordSpan = { start_ms: number; end_ms: number; charStart: number; charEnd: number };

function buildWordSpans(para: Paragraph): WordSpan[] {
  // Collect raw spans
  const raw: WordSpan[] = [];
  for (const seg of para.segments) {
    if (!seg.word_timestamps) continue;
    for (const w of seg.word_timestamps) {
      raw.push({
        start_ms: w.start_ms,
        end_ms: w.end_ms,
        charStart: seg.char_offset + w.char_start,
        charEnd: seg.char_offset + w.char_end,
      });
    }
  }
  if (raw.length === 0) return raw;

  // Interpolate: evenly space words between time boundaries.
  // Walk through words and find runs that share the same time bucket,
  // then distribute them evenly within [prevEnd, nextStart].
  const spans: WordSpan[] = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    // Find the run of words at this time position
    const runStart = i;
    const timeRef = raw[i].start_ms;
    while (i < raw.length - 1 && raw[i + 1].start_ms === timeRef) i++;
    const runEnd = i; // inclusive
    const count = runEnd - runStart + 1;

    // Time boundaries: start of first word in run, end of last word in run
    // Use the previous word's end as the actual start if available
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

// Build paragraph time range from its segments
function paraTimeRange(para: Paragraph): { start_ms: number; end_ms: number } | null {
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
// Highlighting is applied imperatively via document.getElementById —
// React never re-renders this component during playback.
function HighlightedParagraph({ para, paraIndex }: { para: Paragraph; paraIndex: number }) {
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

// Flat sorted list of every word span across all paragraphs, for binary search.
type FlatSpan = { id: string; start_ms: number; end_ms: number; paraIdx: number };

function buildFlatSpans(paragraphs: Paragraph[]): FlatSpan[] {
  const result: FlatSpan[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    for (const s of buildWordSpans(paragraphs[i])) {
      result.push({ id: `w-${i}-${s.charStart}`, start_ms: s.start_ms, end_ms: s.end_ms, paraIdx: i });
    }
  }
  return result;
}

function highlightWord(el: HTMLElement | null) {
  if (!el) return;
  el.style.textDecorationLine = "underline";
  el.style.textDecorationColor = "#2563eb";
  el.style.textDecorationThickness = "2px";
  el.style.textUnderlineOffset = "3px";
}

function clearWord(el: HTMLElement | null) {
  if (!el) return;
  el.style.textDecorationLine = "";
  el.style.textDecorationColor = "";
  el.style.textDecorationThickness = "";
  el.style.textUnderlineOffset = "";
}

function findActiveSpanIdx(spans: FlatSpan[], ms: number): number {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid];
    if (ms >= s.start_ms && ms < s.end_ms) return mid;
    if (ms < s.start_ms) hi = mid - 1;
    else lo = mid + 1;
  }
  return -1;
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
      className="flex items-center justify-center gap-6 py-10"
      style={{ borderTop: "1px solid var(--color-border)", marginTop: "4rem" }}
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
  const { progress, loaded: progressLoaded, saveProgress, saveProgressNow } = useProgress(bookId);

  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [bookChapters, setBookChapters] = useState<NavChapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState(1);
  const [initialAudioMs, setInitialAudioMs] = useState(0);
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const activeParaRef = useRef<number | null>(null);
  const activeWordIdRef = useRef<string | null>(null);
  const restoredRef = useRef(false);

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
    if (!progressLoaded || restoredRef.current || !progress) return;
    restoredRef.current = true;
    setActiveChapterId(progress.chapter_number);
    setInitialAudioMs(progress.audio_position_ms);
  }, [progressLoaded, progress]);

  // Fetch chapter data (abort stale requests to avoid race conditions)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    activeParaRef.current = null;
    if (activeWordIdRef.current) {
      const el = document.getElementById(activeWordIdRef.current);
      clearWord(el);
      activeWordIdRef.current = null;
    }
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
      setActiveChapterId(chapterId);
      setInitialAudioMs(0);
      if (restoredRef.current) {
        saveProgressNow(chapterId, 0, 0);
      }
    },
    [saveProgressNow]
  );

  // Flat sorted word spans + paragraph ranges, rebuilt only when chapter changes
  const flatSpans = useMemo(
    () => (chapter?.paragraphs ? buildFlatSpans(chapter.paragraphs) : []),
    [chapter]
  );
  const paraRanges = useMemo(
    () => chapter?.paragraphs?.map((p) => paraTimeRange(p)) ?? null,
    [chapter]
  );

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    if (!chapter?.paragraphs) return [];
    const result: SegmentBoundary[] = [];
    for (const para of chapter.paragraphs) {
      for (const seg of para.segments) {
        if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
          result.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
        }
      }
    }
    return result.sort((a, b) => a.start_ms - b.start_ms);
  }, [chapter]);

  const handleTimeUpdate = useCallback(
    (timeMs: number) => {
      saveProgress(activeChapterId, timeMs, 0);

      // Highlight active word — pure DOM, no React re-render
      const idx = findActiveSpanIdx(flatSpans, timeMs);
      const newId = idx >= 0 ? flatSpans[idx].id : null;
      if (newId !== activeWordIdRef.current) {
        if (activeWordIdRef.current) {
          clearWord(document.getElementById(activeWordIdRef.current));
        }
        if (newId) {
          highlightWord(document.getElementById(newId));
        }
        activeWordIdRef.current = newId;
      }

      // Auto-scroll to active paragraph
      if (!paraRanges) return;
      let activePara: number | null = null;
      for (let i = 0; i < paraRanges.length; i++) {
        const r = paraRanges[i];
        if (r && timeMs >= r.start_ms && timeMs < r.end_ms) { activePara = i; break; }
      }
      if (activePara !== null && activePara !== activeParaRef.current) {
        activeParaRef.current = activePara;
        paraRefs.current[activePara]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [flatSpans, paraRanges, activeChapterId, saveProgress]
  );

  const handlePause = useCallback(
    (timeMs: number) => {
      if (activeWordIdRef.current) {
        const el = document.getElementById(activeWordIdRef.current);
        clearWord(el);
        activeWordIdRef.current = null;
      }
      saveProgressNow(activeChapterId, timeMs, 0);
    },
    [activeChapterId, saveProgressNow]
  );

  const audioSrc = chapter?.audio_file
    ? `/api/audio/${chapter.audio_file.replace(/^data\//, "")}`
    : null;

  return (
    <>
      <article
        className="mx-auto"
        style={{
          maxWidth: "68ch",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          paddingBottom: "var(--player-height)",
        }}
      >
        {/* Book header */}
        <div className="flex items-center gap-2 mb-8 mt-6">
          <Link
            href="/"
            className="p-1 -ml-1 transition-opacity hover:opacity-60"
            style={{ color: "var(--color-text-secondary)" }}
            aria-label="Back to library"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
              fontSize: "0.9375rem",
            }}
          >
            {bookMeta ? `${bookMeta.title}, ${bookMeta.author}` : ""}
          </span>
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
        ) : !chapter?.paragraphs?.length ? (
          <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
            No text available for this chapter.
          </p>
        ) : (
          <div className="space-y-5">
            {chapter.paragraphs.map((p, i) => (
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
                <HighlightedParagraph para={p} paraIndex={i} />
              </p>
            ))}
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

      {/* Sticky audio player at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div className="mx-auto px-6 py-4" style={{ maxWidth: "68ch" }}>
          <AudioPlayer
            src={audioSrc}
            durationMs={chapter?.audio_duration_ms ?? null}
            initialPositionMs={initialAudioMs}
            segmentBoundaries={segmentBoundaries}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            onChatClick={() => setChatOpen((o) => !o)}
          />
        </div>
      </div>

      {/* Full-screen chat overlay — sits above article, below player bar */}
      {chatOpen && (
        <ChatBubble
          bookId={bookId}
          bookTitle={bookMeta?.title ?? ""}
          authorName={bookMeta?.author ?? ""}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
