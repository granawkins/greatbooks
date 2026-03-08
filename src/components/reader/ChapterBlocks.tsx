"use client";

import type { Block } from "./types";
import { HighlightedParagraph } from "./HighlightedParagraph";

export function ChapterDivider({ title }: { title: string }) {
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

export function ChapterBlocks({
  blocks,
  chapterNum,
  paraRefsMap,
  verse,
}: {
  blocks: Block[];
  chapterNum: number;
  paraRefsMap: React.RefObject<Record<number, (HTMLParagraphElement | null)[]>>;
  verse?: boolean;
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
              whiteSpace: "pre-line",
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
              ...(verse ? { whiteSpace: "pre-line" as const } : {}),
            }}
          >
            <HighlightedParagraph para={block} idPrefix={`${chapterNum}-${i}`} chapterNum={chapterNum} />
          </p>
        )
      )}
    </div>
  );
}
