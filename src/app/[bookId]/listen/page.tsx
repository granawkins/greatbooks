"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChapterNav from "@/components/ChapterNav";
import AudioPlayer from "@/components/AudioPlayer";

type SegmentTimestamps = {
  segment_id: number;
  words: { text: string; start_ms: number; end_ms: number }[];
};

type Paragraph = {
  text: string;
  segment_ids: number[];
};

type ChapterData = {
  title: string;
  paragraphs: Paragraph[];
  audio_file: string | null;
  audio_duration_ms: number | null;
  word_timestamps: SegmentTimestamps[] | null;
};

export default function ListenPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = getBook(bookId);

  const [activeChapterId, setActiveChapterId] = useState(
    book?.chapters[0]?.id ?? 1
  );
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeParaIdx, setActiveParaIdx] = useState<number | null>(null);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // Fetch chapter data
  useEffect(() => {
    setLoading(true);
    setActiveParaIdx(null);
    fetch(`/api/books/${bookId}/chapters/${activeChapterId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChapter(data))
      .finally(() => setLoading(false));
  }, [bookId, activeChapterId]);

  // Build lookup: segment_id -> { paraIdx, time range }
  // Each paragraph knows its segment_ids, and word_timestamps maps segment_id -> timing
  const segmentTimeMap = useMemo(() => {
    if (!chapter?.word_timestamps || !chapter.paragraphs) return null;

    // Map segment_id -> its time range from word_timestamps
    const segTimes = new Map<number, { start_ms: number; end_ms: number }>();
    for (const seg of chapter.word_timestamps) {
      if (seg.words.length > 0) {
        segTimes.set(seg.segment_id, {
          start_ms: seg.words[0].start_ms,
          end_ms: seg.words[seg.words.length - 1].end_ms,
        });
      }
    }

    // Build paragraph time ranges from their segment_ids
    const paraRanges: { start_ms: number; end_ms: number }[] = [];
    for (const para of chapter.paragraphs) {
      let start = Infinity;
      let end = 0;
      for (const sid of para.segment_ids) {
        const t = segTimes.get(sid);
        if (t) {
          start = Math.min(start, t.start_ms);
          end = Math.max(end, t.end_ms);
        }
      }
      paraRanges.push({
        start_ms: start === Infinity ? 0 : start,
        end_ms: end,
      });
    }

    return paraRanges;
  }, [chapter]);

  const handleTimeUpdate = useCallback(
    (timeMs: number) => {
      if (!segmentTimeMap) return;

      let active: number | null = null;
      for (let i = 0; i < segmentTimeMap.length; i++) {
        if (
          timeMs >= segmentTimeMap[i].start_ms &&
          timeMs < segmentTimeMap[i].end_ms
        ) {
          active = i;
          break;
        }
      }

      if (active !== null && active !== activeParaIdx) {
        setActiveParaIdx(active);
        paraRefs.current[active]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [segmentTimeMap, activeParaIdx]
  );

  if (!book) return null;

  const bookChapter = book.chapters.find((c) => c.id === activeChapterId);
  const audioSrc = chapter?.audio_file
    ? `/api/audio/${chapter.audio_file.replace(/^data\//, "")}`
    : null;

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 shrink-0">
        <ChapterNav
          chapters={book.chapters}
          activeChapterId={activeChapterId}
          onSelect={setActiveChapterId}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile chapter selector */}
        <div className="md:hidden">
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
          className="text-xl font-semibold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
        >
          {bookChapter?.title}
        </h2>

        <AudioPlayer
          src={audioSrc}
          durationMs={chapter?.audio_duration_ms ?? null}
          onTimeUpdate={handleTimeUpdate}
        />

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
                ref={(el) => { paraRefs.current[i] = el; }}
                className="text-base leading-7 transition-colors duration-300"
                style={{
                  color:
                    activeParaIdx === i
                      ? "var(--color-text)"
                      : "var(--color-text-secondary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {p.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
