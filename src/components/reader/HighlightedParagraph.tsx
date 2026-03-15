"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ParagraphBlock, Annotation, WordSpan } from "./types";
import { buildWordSpans } from "./blockGrouping";
import { WordPopup } from "./WordPopup";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

// ── Types ────────────────────────────────────────────────────────────────

type SelectionAnchor = {
  spanIdx: number;
  charStart: number;
  startMs: number;
  element: HTMLElement;
};

type SelectionEnd = {
  spanIdx: number;
  charEnd: number;
  element: HTMLElement;
};

type CommentPopover = {
  annotationId: number;
  commentText: string;
  element: HTMLElement;
};

// ── Annotation range helper ──────────────────────────────────────────────

function toParaRange(ann: Annotation, para: ParagraphBlock): { start: number; end: number } | null {
  let start: number | null = null;
  let end: number | null = null;
  for (let si = 0; si < para.segments.length; si++) {
    const seg = para.segments[si];
    if (seg.sequence === ann.start_segment_seq) start = para.charOffsets[si] + ann.start_char;
    if (seg.sequence === ann.end_segment_seq) end = para.charOffsets[si] + ann.end_char;
  }
  if (start === null || end === null) return null;
  return { start, end };
}

// ── Comment popover portal ───────────────────────────────────────────────

function CommentPopoverUI({
  popover,
  onDelete,
  onClose,
}: {
  popover: CommentPopover;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const rect = popover.element.getBoundingClientRect();
  const top = rect.bottom + 8;
  const left = rect.left + rect.width / 2;

  return createPortal(
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateX(-50%)",
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "10px 12px",
        maxWidth: 280,
        zIndex: 1001,
      }}
    >
      <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--color-text)" }}>
        {popover.commentText}
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{ fontSize: "0.8rem", border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
        >
          Close
        </button>
        <button
          onClick={() => { onDelete(popover.annotationId); onClose(); }}
          style={{ fontSize: "0.8rem", border: "none", background: "none", cursor: "pointer", color: "var(--color-danger, #c0392b)" }}
        >
          Delete
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Comment input portal ─────────────────────────────────────────────────

// Breakpoint for mobile vs desktop layout
const DESKTOP_MIN_WIDTH = 768;
// Extra width needed beyond reader column to show margin panel
// Reader is 68ch ≈ ~680px + padding; panel is 260px + 16px gap
const MARGIN_MIN_VIEWPORT = 1000;

function CommentInputUI({
  anchorEl,
  anchorEl2,
  onSave,
  onCancel,
}: {
  anchorEl: HTMLElement;
  anchorEl2?: HTMLElement;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const isMobile = vw < DESKTOP_MIN_WIDTH;
  const hasMarginSpace = vw >= MARGIN_MIN_VIEWPORT;

  const rect1 = anchorEl.getBoundingClientRect();
  const rect2 = anchorEl2?.getBoundingClientRect();

  // For desktop margin mode: anchor to the right of the selection
  const anchorTop = rect2
    ? (rect1.top + rect2.bottom) / 2 - 40
    : rect1.top;
  // Right edge of the reader column (take anchorEl's parent or just the rect right edge)
  // We position relative to viewport: after the rightmost of anchor rects
  const anchorRight = Math.max(rect1.right, rect2?.right ?? 0);

  const cardStyle: React.CSSProperties = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    padding: "12px",
    width: 260,
  };

  const textarea = (
    <textarea
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Add a comment…"
      style={{
        width: "100%",
        minHeight: 80,
        resize: "vertical",
        fontFamily: "var(--font-body)",
        fontSize: "0.9rem",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        padding: "6px 8px",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        boxSizing: "border-box",
      }}
    />
  );

  const buttons = (
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: 8 }}>
      <button
        onClick={onCancel}
        style={{ fontSize: "0.85rem", border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
      >
        Cancel
      </button>
      <button
        onClick={() => text.trim() && onSave(text.trim())}
        style={{
          fontSize: "0.85rem",
          border: "none",
          background: "var(--color-text)",
          color: "var(--color-bg)",
          cursor: "pointer",
          borderRadius: "var(--radius)",
          padding: "4px 10px",
        }}
      >
        Save
      </button>
    </div>
  );

  if (!isMobile && hasMarginSpace) {
    // Desktop: position in right margin next to the text
    return createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: Math.max(anchorTop, 8),
          left: anchorRight + 16,
          zIndex: 1001,
          ...cardStyle,
        }}
      >
        {textarea}
        {buttons}
      </div>,
      document.body
    );
  }

  // Mobile (or narrow desktop): full modal overlay
  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001,
        padding: "1rem",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ ...cardStyle, width: "min(320px, 100%)" }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)" }}>
          Add a comment
        </p>
        {textarea}
        {buttons}
      </div>
    </div>,
    document.body
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function HighlightedParagraph({
  para,
  idPrefix,
  chapterNum,
  annotations,
  bookId,
  onBookmark,
  onAnnotationSaved,
}: {
  para: ParagraphBlock;
  idPrefix: string;
  chapterNum: number;
  annotations: Annotation[];
  bookId: string;
  onBookmark: (audioPositionMs: number) => void;
  onAnnotationSaved: () => void;
}) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;
  const { audioRef, session, onChapterSelectRef } = useAudioPlayer();

  // ── Selection state ───────────────────────────────────────────────────
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [selEnd, setSelEnd] = useState<SelectionEnd | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentPopover, setCommentPopover] = useState<CommentPopover | null>(null);

  const clearSelection = useCallback(() => {
    setAnchor(null);
    setSelEnd(null);
    setShowCommentInput(false);
    setCommentPopover(null);
  }, []);

  // ── Annotation ranges mapped to para-absolute chars ───────────────────
  const annotationRanges = useMemo(() => {
    return annotations.flatMap((ann) => {
      const range = toParaRange(ann, para);
      if (!range) return [];
      return [{ ...ann, startChar: range.start, endChar: range.end }];
    });
  }, [annotations, para]);

  // ── Span → annotation lookup ──────────────────────────────────────────
  function getSpanAnnotations(span: WordSpan) {
    return annotationRanges.filter(
      (ann) => span.charStart < ann.endChar && span.charEnd > ann.startChar
    );
  }

  // ── Selection range (ordered) ─────────────────────────────────────────
  const selectionRange = useMemo(() => {
    if (!anchor) return null;
    const aIdx = anchor.spanIdx;
    const eIdx = selEnd?.spanIdx ?? aIdx;
    const lo = Math.min(aIdx, eIdx);
    const hi = Math.max(aIdx, eIdx);
    return { lo, hi };
  }, [anchor, selEnd]);

  // ── Audio play ────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (!anchor) return;
    if (session && session.chapterId === chapterNum) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = anchor.startMs / 1000;
        audio.play().catch(() => {});
      }
    } else {
      onChapterSelectRef.current?.(chapterNum, anchor.startMs);
    }
    clearSelection();
  }, [anchor, session, chapterNum, audioRef, onChapterSelectRef, clearSelection]);

  // ── Bookmark ──────────────────────────────────────────────────────────
  const handleBookmark = useCallback(() => {
    if (!anchor) return;
    onBookmark(anchor.startMs);
    clearSelection();
  }, [anchor, onBookmark, clearSelection]);

  // ── Highlight ─────────────────────────────────────────────────────────
  const handleHighlight = useCallback(async () => {
    if (!anchor) return;
    const anchorSpan = spans[anchor.spanIdx];
    const endSpan = selEnd ? spans[selEnd.spanIdx] : anchorSpan;
    const lo = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? anchorSpan : endSpan;
    const hi = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? endSpan : anchorSpan;

    await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        bookId,
        chapterNumber: chapterNum,
        startSegmentSeq: lo.segmentSeq,
        startChar: lo.segCharStart,
        endSegmentSeq: hi.segmentSeq,
        endChar: hi.segCharEnd,
        type: "highlight",
      }),
    });
    clearSelection();
    onAnnotationSaved();
  }, [anchor, selEnd, spans, bookId, chapterNum, clearSelection, onAnnotationSaved]);

  // ── Comment save ──────────────────────────────────────────────────────
  const handleCommentSave = useCallback(async (commentText: string) => {
    if (!anchor) return;
    const anchorSpan = spans[anchor.spanIdx];
    const endSpan = selEnd ? spans[selEnd.spanIdx] : anchorSpan;
    const lo = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? anchorSpan : endSpan;
    const hi = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? endSpan : anchorSpan;

    await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        bookId,
        chapterNumber: chapterNum,
        startSegmentSeq: lo.segmentSeq,
        startChar: lo.segCharStart,
        endSegmentSeq: hi.segmentSeq,
        endChar: hi.segCharEnd,
        type: "comment",
        commentText,
      }),
    });
    clearSelection();
    onAnnotationSaved();
  }, [anchor, selEnd, spans, bookId, chapterNum, clearSelection, onAnnotationSaved]);

  // ── Delete annotation ─────────────────────────────────────────────────
  const handleDeleteAnnotation = useCallback(async (id: number) => {
    await fetch(`/api/annotations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    onAnnotationSaved();
  }, [onAnnotationSaved]);

  // ── No spans → plain text ─────────────────────────────────────────────
  if (!spans.length) return <>{text}</>;

  // ── Render ────────────────────────────────────────────────────────────
  const elements: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span.charStart > lastEnd) {
      elements.push(text.slice(lastEnd, span.charStart));
    }

    const inSelection = selectionRange !== null && i >= selectionRange.lo && i <= selectionRange.hi;
    const spanAnns = getSpanAnnotations(span);
    const hasHighlight = spanAnns.some((a) => a.type === "highlight");
    const hasComment = spanAnns.some((a) => a.type === "comment");

    let bg: string | undefined;
    if (inSelection) {
      bg = "var(--color-selection)";
    } else if (hasHighlight) {
      bg = "var(--color-highlight)";
    }

    const commentAnns = spanAnns.filter((a) => a.type === "comment");

    elements.push(
      <span
        key={span.charStart}
        id={`w-${idPrefix}-${span.charStart}`}
        onClick={(e) => {
          e.stopPropagation();

          // If span has a comment annotation and we're not mid-selection, show popover
          if (commentAnns.length > 0 && !anchor) {
            const ann = commentAnns[0];
            setCommentPopover({
              annotationId: ann.id,
              commentText: ann.comment_text ?? "",
              element: e.currentTarget,
            });
            return;
          }

          // Selection logic
          if (!anchor) {
            // First click → set anchor
            setAnchor({ spanIdx: i, charStart: span.charStart, startMs: span.start_ms, element: e.currentTarget });
            setSelEnd(null);
          } else if (i === anchor.spanIdx && !selEnd) {
            // Re-clicking the anchor with no range → deselect
            clearSelection();
          } else if (inSelection && selEnd) {
            // Click within an established range → deselect
            clearSelection();
          } else {
            // Click on any other word → extend/move the end of selection
            setSelEnd({ spanIdx: i, charEnd: span.charEnd, element: e.currentTarget });
          }
        }}
        style={{
          cursor: "pointer",
          backgroundColor: bg,
          borderRadius: inSelection || hasHighlight ? "3px" : undefined,
          padding: hasHighlight ? "2px 4px" : inSelection ? "2px 1px" : undefined,
          margin: hasHighlight ? "0 -4px" : undefined,
          borderBottom: hasComment && !inSelection ? "2px solid rgba(100, 160, 255, 0.7)" : undefined,
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

      {/* Word popup */}
      {anchor && !showCommentInput && (
        <WordPopup
          anchorEl={anchor.element}
          anchorEl2={selEnd?.element}
          onPlay={handlePlay}
          onBookmark={handleBookmark}
          onHighlight={handleHighlight}
          onComment={() => setShowCommentInput(true)}
          onClose={clearSelection}
        />
      )}

      {/* Comment input */}
      {anchor && showCommentInput && (
        <CommentInputUI
          anchorEl={anchor.element}
          anchorEl2={selEnd?.element}
          onSave={handleCommentSave}
          onCancel={clearSelection}
        />
      )}

      {/* Comment popover for existing annotations */}
      {commentPopover && (
        <CommentPopoverUI
          popover={commentPopover}
          onDelete={handleDeleteAnnotation}
          onClose={() => setCommentPopover(null)}
        />
      )}
    </>
  );
}
