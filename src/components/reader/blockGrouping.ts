import type { Segment, Block, ParagraphBlock, WordSpan } from "./types";

export function groupIntoBlocks(segments: Segment[], layout: "prose" | "verse" = "prose"): Block[] {
  const blocks: Block[] = [];
  let current: Segment[] = [];
  const sep = layout === "verse" ? "\n" : " ";

  const flush = () => {
    if (current.length === 0) return;
    let offset = 0;
    const offsets = current.map((seg) => {
      const o = offset;
      offset += seg.text.length + 1; // +1 for joining char
      return o;
    });
    blocks.push({
      type: "paragraph",
      segments: current,
      text: current.map((s) => s.text).join(sep),
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

export function buildWordSpans(para: ParagraphBlock): WordSpan[] {
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

export function paraTimeRange(para: ParagraphBlock): { start_ms: number; end_ms: number } | null {
  let start = Infinity;
  let end = 0;
  for (const seg of para.segments) {
    if (seg.audio_start_ms != null) start = Math.min(start, seg.audio_start_ms);
    if (seg.audio_end_ms != null) end = Math.max(end, seg.audio_end_ms);
  }
  if (start === Infinity) return null;
  return { start_ms: start, end_ms: end };
}
