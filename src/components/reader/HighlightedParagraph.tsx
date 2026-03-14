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

  const rect1 = anchorEl.getBoundingClientRect();
  const rect2 = anchorEl2?.getBoundingClientRect();
  const top = rect2 ? Math.max(rect1.bottom, rect2.bottom) + 8 : rect1.bottom + 8;
  const left = rect2
    ? (rect1.left + rect1.width / 2 + rect2.left + rect2.width / 2) / 2
    : rect1.left + rect1.width / 2;

  return createPortal(
    <div
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
        padding: "10px",
        width: 260,
        zIndex: 1001,
      }}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        style={{
          width: "100%",
          minHeight: 72,
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
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: 6 }}>
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
      bg = "var(--color-highlight)";
    } else if (hasHighlight) {
      bg = "rgba(255, 220, 60, 0.35)";
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
            // First click
            setAnchor({ spanIdx: i, charStart: span.charStart, startMs: span.start_ms, element: e.currentTarget });
            setSelEnd(null);
          } else if (i === anchor.spanIdx) {
            // Click same word → deselect
            clearSelection();
          } else {
            // Extend selection
            setSelEnd({ spanIdx: i, charEnd: span.charEnd, element: e.currentTarget });
          }
        }}
        style={{
          cursor: "pointer",
          backgroundColor: bg,
          borderRadius: inSelection || hasHighlight ? "2px" : undefined,
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
