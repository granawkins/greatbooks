"use client";

import { useMemo } from "react";
import type { ParagraphBlock } from "./types";
import { buildWordSpans } from "./blockGrouping";

export function HighlightedParagraph({ para, idPrefix }: { para: ParagraphBlock; idPrefix: string }) {
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
