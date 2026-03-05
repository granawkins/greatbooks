"use client";

import { useMemo, useState, useCallback } from "react";
import type { ParagraphBlock } from "./types";
import { buildWordSpans } from "./blockGrouping";
import { WordPopup } from "./WordPopup";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

type SelectedWord = {
  charStart: number;
  startMs: number;
  element: HTMLElement;
};

function flashUnderline(el: HTMLElement) {
  el.style.textDecoration = "underline";
  el.style.textDecorationColor = "var(--color-text-secondary)";
  el.style.textUnderlineOffset = "3px";
  setTimeout(() => {
    el.style.textDecoration = "";
    el.style.textDecorationColor = "";
    el.style.textUnderlineOffset = "";
  }, 1000);
}

export function HighlightedParagraph({
  para,
  idPrefix,
  chapterNum,
}: {
  para: ParagraphBlock;
  idPrefix: string;
  chapterNum: number;
}) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;
  const [selected, setSelected] = useState<SelectedWord | null>(null);
  const { audioRef, session, onChapterSelectRef } = useAudioPlayer();

  const handleClose = useCallback(() => setSelected(null), []);

  const handlePlay = useCallback(() => {
    if (!selected) return;

    if (session && session.chapterId === chapterNum) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = selected.startMs / 1000;
        audio.play().catch(() => {});
      }
    } else {
      onChapterSelectRef.current?.(chapterNum, selected.startMs);
    }
    handleClose();
  }, [selected, session, chapterNum, audioRef, onChapterSelectRef, handleClose]);

  const handleBookmark = useCallback(() => {
    if (!selected) return;
    const el = selected.element;

    if (session && session.chapterId === chapterNum) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = selected.startMs / 1000;
      }
    } else {
      onChapterSelectRef.current?.(chapterNum, selected.startMs, false);
    }

    flashUnderline(el);
    handleClose();
  }, [selected, session, chapterNum, audioRef, onChapterSelectRef, handleClose]);

  if (!spans.length) return <>{text}</>;

  const elements: React.ReactNode[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.charStart > lastEnd) elements.push(text.slice(lastEnd, span.charStart));
    const isSelected = selected?.charStart === span.charStart;
    elements.push(
      <span
        key={span.charStart}
        id={`w-${idPrefix}-${span.charStart}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isSelected) {
            setSelected(null);
          } else {
            setSelected({ charStart: span.charStart, startMs: span.start_ms, element: e.currentTarget });
          }
        }}
        style={{
          cursor: "pointer",
          backgroundColor: isSelected ? "var(--color-highlight)" : undefined,
          borderRadius: isSelected ? "2px" : undefined,
        }}
      >
        {text.slice(span.charStart, span.charEnd)}
      </span>
    );
    lastEnd = span.charEnd;
  }
  if (lastEnd < text.length) elements.push(text.slice(lastEnd));

  return (
    <>
      {elements}
      {selected && (
        <WordPopup
          anchorEl={selected.element}
          onPlay={handlePlay}
          onBookmark={handleBookmark}
          onClose={handleClose}
        />
      )}
    </>
  );
}
