"use client";

import { useState, useEffect } from "react";
import type { Segment, WordTs } from "./types";
import type { WordTiming } from "@/lib/AudioPlayerContext";
import { groupIntoBlocks } from "./blockGrouping";

type TimingsResult = {
  allTimings: WordTiming[];
  loaded: boolean;
};

/** Interpolate runs of words with identical start_ms into evenly spaced intervals */
function interpolate(raw: { start_ms: number; end_ms: number; seq: number; char_start: number }[]): { start_ms: number; end_ms: number; seq: number; char_start: number }[] {
  if (raw.length === 0) return [];
  const out = new Array<typeof raw[0]>(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const runStart = i;
    const timeRef = raw[i].start_ms;
    while (i < raw.length - 1 && raw[i + 1].start_ms === timeRef) i++;
    const runEnd = i;
    const count = runEnd - runStart + 1;
    const tStart = runStart > 0 ? out[runStart - 1].end_ms : raw[runStart].start_ms;
    const tEnd = raw[runEnd].end_ms;
    const duration = tEnd - tStart;
    for (let j = 0; j < count; j++) {
      out[runStart + j] = {
        start_ms: tStart + Math.round((duration * j) / count),
        end_ms: tStart + Math.round((duration * (j + 1)) / count),
        seq: raw[runStart + j].seq,
        char_start: raw[runStart + j].char_start,
      };
    }
  }
  return out;
}

export function useWordTimings(
  bookId: string,
  chapterNum: number,
  segments: Segment[],
  layout: "prose" | "verse",
): TimingsResult {
  const [result, setResult] = useState<TimingsResult>({ allTimings: [], loaded: false });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/books/${bookId}/chapters/${chapterNum}/word-timestamps`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, WordTs[]> | null) => {
        if (cancelled) return;
        if (!data) { setResult({ allTimings: [], loaded: true }); return; }

        const blocks = groupIntoBlocks(segments, layout);
        const allTimings: WordTiming[] = [];

        for (const block of blocks) {
          if (block.type !== "paragraph") continue;

          const raw: { start_ms: number; end_ms: number; seq: number; char_start: number }[] = [];
          for (const seg of block.segments) {
            const wts = data[String(seg.id)];
            if (!wts) continue;
            for (const w of wts) {
              raw.push({ start_ms: w.start_ms, end_ms: w.end_ms, seq: seg.sequence, char_start: w.char_start });
            }
          }

          const interpolated = interpolate(raw);
          for (const w of interpolated) {
            allTimings.push({
              id: `w-${chapterNum}-${w.seq}-${w.char_start}`,
              start_ms: w.start_ms,
              end_ms: w.end_ms,
            });
          }
        }

        setResult({ allTimings, loaded: true });
      })
      .catch(() => {
        if (!cancelled) setResult({ allTimings: [], loaded: true });
      });

    return () => { cancelled = true; };
  }, [bookId, chapterNum, segments, layout]);

  return result;
}
