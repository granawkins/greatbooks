"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChapterNav from "@/components/ChapterNav";
import AudioPlayer from "@/components/AudioPlayer";
import ChatBubble from "@/components/ChatBubble";

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

// Render paragraph text with word-level highlighting — just a colored
// background on the currently-spoken word, nothing else changes.
function HighlightedParagraph({
  para,
  currentMs,
  isPlaying,
}: {
  para: Paragraph;
  currentMs: number;
  isPlaying: boolean;
}) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;

  // If no timestamps or not playing, render plain text
  if (spans.length === 0 || !isPlaying) {
    return <>{text}</>;
  }

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    // Gap text before this word (spaces, punctuation between tokens)
    if (span.charStart > lastEnd) {
      elements.push(text.slice(lastEnd, span.charStart));
    }

    const isActiveWord = currentMs >= span.start_ms && currentMs < span.end_ms;
    const wordText = text.slice(span.charStart, span.charEnd);

    if (isActiveWord) {
      elements.push(
        <mark
          key={`w-${span.charStart}`}
          style={{
            backgroundColor: "var(--color-highlight, #fef08a)",
            color: "inherit",
            borderRadius: "2px",
            padding: "0 1px",
          }}
        >
          {wordText}
        </mark>
      );
    } else {
      elements.push(wordText);
    }

    lastEnd = span.charEnd;
  }

  // Trailing text
  if (lastEnd < text.length) {
    elements.push(text.slice(lastEnd));
  }

  return <>{elements}</>;
}

export default function BookPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = getBook(bookId);

  const [activeChapterId, setActiveChapterId] = useState(
    book?.chapters[0]?.id ?? 1
  );
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const activeParaRef = useRef<number | null>(null);

  // Fetch chapter data
  useEffect(() => {
    setLoading(true);
    activeParaRef.current = null;
    setCurrentMs(0);
    setIsPlaying(false);
    fetch(`/api/books/${bookId}/chapters/${activeChapterId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChapter(data))
      .finally(() => setLoading(false));
  }, [bookId, activeChapterId]);

  // Build paragraph time ranges
  const paraRanges = useMemo(() => {
    if (!chapter?.paragraphs) return null;
    return chapter.paragraphs.map((p) => paraTimeRange(p));
  }, [chapter]);

  const handleTimeUpdate = useCallback(
    (timeMs: number) => {
      setCurrentMs(timeMs);
      setIsPlaying(true);
      if (!paraRanges) return;

      // Auto-scroll to active paragraph
      let active: number | null = null;
      for (let i = 0; i < paraRanges.length; i++) {
        const range = paraRanges[i];
        if (range && timeMs >= range.start_ms && timeMs < range.end_ms) {
          active = i;
          break;
        }
      }

      if (active !== null && active !== activeParaRef.current) {
        activeParaRef.current = active;
        paraRefs.current[active]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [paraRanges]
  );

  if (!book) return null;

  const bookChapter = book.chapters.find((c) => c.id === activeChapterId);
  const audioSrc = chapter?.audio_file
    ? `/api/audio/${chapter.audio_file.replace(/^data\//, "")}`
    : null;

  return (
    <>
      <div className="flex gap-6 pb-28">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <ChapterNav
            chapters={book.chapters}
            activeChapterId={activeChapterId}
            onSelect={setActiveChapterId}
          />
        </aside>

        {/* Text */}
        <article className="flex-1 min-w-0">
          {/* Mobile chapter selector */}
          <div className="md:hidden mb-4">
            <select
              value={activeChapterId}
              onChange={(e) => setActiveChapterId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-[var(--radius)] border text-sm"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            >
              {book.chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
          </div>

          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
          >
            {bookChapter?.title}
          </h2>

          {loading ? (
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Loading...
            </p>
          ) : !chapter?.paragraphs?.length ? (
            <div
              className="rounded-[var(--radius-lg)] p-6 text-center"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
              }}
            >
              <p className="text-sm">No text available for this chapter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chapter.paragraphs.map((p, i) => (
                <p
                  key={i}
                  ref={(el) => {
                    paraRefs.current[i] = el;
                  }}
                  className="text-base leading-7"
                  style={{
                    color: "var(--color-text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <HighlightedParagraph
                    para={p}
                    currentMs={currentMs}
                    isPlaying={isPlaying}
                  />
                </p>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* Sticky audio player at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-3">
          <AudioPlayer
            src={audioSrc}
            durationMs={chapter?.audio_duration_ms ?? null}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      </div>

      {/* Chat bubble */}
      <ChatBubble bookTitle={book.title} authorName={book.author} />
    </>
  );
}
