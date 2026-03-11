"use client";

import { useState, useRef, useCallback } from "react";
import type { Block, NavChapter } from "./types";
import { HighlightedParagraph } from "./HighlightedParagraph";
import { ChapterListIcon } from "@/components/audio/icons";
import { ChapterPicker } from "@/components/ChapterPicker";

function SmallPlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 2.5v11l9-5.5z" />
    </svg>
  );
}

export function ChapterDivider({
  title,
  chapterNum,
  chapters,
  activeChapterId,
  onChapterSelect,
  onPlayChapter,
  hasAudio,
}: {
  title: string;
  chapterNum: number;
  chapters?: NavChapter[];
  activeChapterId?: number;
  onChapterSelect?: (id: number) => void;
  onPlayChapter?: (chapterNum: number) => void;
  hasAudio?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const chapterBtnRef = useRef<HTMLDivElement | null>(null);
  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  const showChapterBtn = chapters && chapters.length > 1 && onChapterSelect;
  const iconBtnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "var(--color-text-secondary)",
    borderRadius: "var(--radius)",
    flexShrink: 0,
    padding: 0,
    transition: "color 0.15s",
  } as const;

  return (
    <div className="flex items-center gap-3 my-16">
      <div className="flex-1" style={{ borderBottom: "1px solid var(--color-border)" }} />

      {/* Chapter list button + picker */}
      {showChapterBtn && (
        <div ref={chapterBtnRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            aria-label="Select chapter"
            onClick={() => setDropdownOpen((o) => !o)}
            style={iconBtnStyle}
            className="hover:text-[var(--color-text)]"
          >
            <ChapterListIcon />
          </button>
          {dropdownOpen && (
            <ChapterPicker
              chapters={chapters}
              activeChapterId={activeChapterId ?? chapterNum}
              onSelect={onChapterSelect}
              onClose={closeDropdown}
              containerRef={chapterBtnRef}
            />
          )}
        </div>
      )}

      {/* Chapter title */}
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

      {/* Play button */}
      {hasAudio && onPlayChapter && (
        <button
          aria-label={`Play ${title}`}
          onClick={() => onPlayChapter(chapterNum)}
          style={iconBtnStyle}
          className="hover:text-[var(--color-text)]"
        >
          <SmallPlayIcon />
        </button>
      )}

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
