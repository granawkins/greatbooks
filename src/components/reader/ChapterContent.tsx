import { groupIntoBlocks } from "./blockGrouping";
import { renderInlineMarkdown } from "./InlineMarkdown";
import InteractiveParagraph from "./InteractiveParagraph";

type SegmentInput = {
  id: number;
  sequence: number;
  text: string;
  segment_type: "heading" | "text" | "paragraph_break" | "list_item";
  audio_start_ms: number | null;
  audio_end_ms: number | null;
};

type WordBoundary = { char_start: number; char_end: number };

type Props = {
  segments: SegmentInput[];
  wordBoundaries: Record<number, WordBoundary[]>;
  chapterNum: number;
  layout?: "prose" | "verse";
  bookId: string;
};

/**
 * Render word spans using STT char boundaries.
 * Each span includes everything from its char_start up to the next word's char_start
 * (trailing punctuation, spaces, etc.) so CSS classes cover the full gap.
 */
function renderSegmentWithBoundaries(
  seg: SegmentInput, bounds: WordBoundary[], chapterNum: number, trailingSep: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  if (bounds.length > 0 && bounds[0].char_start > 0) {
    nodes.push(seg.text.slice(0, bounds[0].char_start));
  }
  for (let i = 0; i < bounds.length; i++) {
    const { char_start } = bounds[i];
    const spanEnd = i < bounds.length - 1 ? bounds[i + 1].char_start : seg.text.length;
    let text = seg.text.slice(char_start, spanEnd);
    // Last word: trim trailing whitespace, then append segment separator
    if (i === bounds.length - 1) text = text.trimEnd() + trailingSep;
    const id = `w-${chapterNum}-${seg.sequence}-${char_start}`;
    nodes.push(<span key={id} id={id}>{text}</span>);
  }
  return nodes;
}

/**
 * Render word spans using whitespace splitting.
 * Each span includes the word + trailing whitespace/punctuation up to the next word.
 */
function renderSegmentWithWhitespace(
  seg: SegmentInput, chapterNum: number, trailingSep: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const matches: { index: number }[] = [];
  const regex = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(seg.text)) !== null) {
    matches.push({ index: m.index });
  }
  if (matches.length > 0 && matches[0].index > 0) {
    nodes.push(seg.text.slice(0, matches[0].index));
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const spanEnd = i < matches.length - 1 ? matches[i + 1].index : seg.text.length;
    let text = seg.text.slice(start, spanEnd);
    if (i === matches.length - 1) text = text.trimEnd() + trailingSep;
    const id = `w-${chapterNum}-${seg.sequence}-${start}`;
    nodes.push(<span key={id} id={id}>{text}</span>);
  }
  return nodes;
}

export default function ChapterContent({
  segments, wordBoundaries, chapterNum, layout = "prose", bookId,
}: Props) {
  const fullSegments = segments.map((s) => ({ ...s, word_timestamps: null }));
  const blocks = groupIntoBlocks(fullSegments, layout);
  const verse = layout === "verse";
  const separator = verse ? "\n" : " ";

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <p key={i} data-block-idx={i} style={{
              color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)",
              fontSize: "0.8125rem", fontWeight: 500, letterSpacing: "0.04em",
              textTransform: "uppercase", whiteSpace: "pre-line", marginTop: "2rem",
            }}>
              {block.text}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={i} data-block-idx={i} style={{
              color: "var(--color-text)", fontFamily: "var(--font-body)",
              fontSize: "var(--font-size-body)", lineHeight: "1.85",
              paddingLeft: "1.5em", margin: 0, listStyleType: "disc",
            }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: "0.5em" }}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        // Paragraph block
        const joinedText = block.segments.map((s) => s.text).join(separator);
        const hasMarkdown = block.segments.every((s) => !wordBoundaries[s.id]?.length) && joinedText.includes("*");

        if (hasMarkdown) {
          return (
            <p key={i} data-block-idx={i} style={{
              color: "var(--color-text)", fontFamily: "var(--font-body)",
              fontSize: "var(--font-size-body)", lineHeight: "1.85",
              ...(verse ? { whiteSpace: "pre-line" as const } : {}),
            }}>
              {renderInlineMarkdown(joinedText)}
            </p>
          );
        }

        // Render word spans — each span includes trailing whitespace/punctuation.
        // Between segments, append the separator to the last span so there's
        // no unstyled text node between sentences.
        const wordSpanNodes: React.ReactNode[] = [];
        for (let si = 0; si < block.segments.length; si++) {
          const seg = block.segments[si];
          const isLastSeg = si === block.segments.length - 1;
          const trailingSep = isLastSeg ? "" : separator;
          const bounds = wordBoundaries[seg.id];
          if (bounds && bounds.length > 0) {
            wordSpanNodes.push(...renderSegmentWithBoundaries(seg, bounds, chapterNum, trailingSep));
          } else {
            wordSpanNodes.push(...renderSegmentWithWhitespace(seg, chapterNum, trailingSep));
          }
        }

        return (
          <p key={i} data-block-idx={i} style={{
            color: "var(--color-text)", fontFamily: "var(--font-body)",
            fontSize: "var(--font-size-body)", lineHeight: "1.85",
            ...(verse ? { whiteSpace: "pre-line" as const } : {}),
          }}>
            <InteractiveParagraph
              chapterNum={chapterNum}
              bookId={bookId}
            >
              {wordSpanNodes}
            </InteractiveParagraph>
          </p>
        );
      })}
    </div>
  );
}
