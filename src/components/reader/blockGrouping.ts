import type { Segment, Block, ParagraphBlock } from "./types";

export function groupIntoBlocks(segments: Segment[], layout: "prose" | "verse" = "prose"): Block[] {
  const blocks: Block[] = [];
  let current: Segment[] = [];
  let listItems: string[] = [];
  const sep = layout === "verse" ? "\n" : " ";

  const flushParagraph = () => {
    if (current.length === 0) return;
    let offset = 0;
    const offsets = current.map((seg) => {
      const o = offset;
      offset += seg.text.length + 1;
      return o;
    });
    blocks.push({
      type: "paragraph",
      segments: current,
      text: current.map((s) => s.text).join(sep),
      charOffsets: offsets,
    });
    current = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: [...listItems] });
    listItems = [];
  };

  for (const seg of segments) {
    if (seg.segment_type === "list_item") {
      flushParagraph();
      listItems.push(seg.text);
      continue;
    }
    flushList();
    if (seg.segment_type === "heading") {
      flushParagraph();
      blocks.push({ type: "heading", text: seg.text });
      continue;
    }
    if (seg.segment_type !== "text") {
      flushParagraph();
      continue;
    }
    current.push(seg);
  }
  flushParagraph();
  flushList();
  return blocks;
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
