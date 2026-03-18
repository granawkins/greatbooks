"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ParagraphBlock, Annotation, WordSpan } from "./types";
import { buildWordSpans } from "./blockGrouping";
import { WordPopup } from "./WordPopup";
import { setCommentHover } from "./commentHover";
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

// ── Shared mobile modal backdrop ──────────────────────────────────────────

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1001,
  padding: "1rem",
};

const modalCardStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "1px solid rgba(50, 100, 200, 0.7)",
  borderRadius: "var(--radius)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  padding: "12px 14px",
  width: "min(320px, 100%)",
  position: "relative",
  minHeight: 48,
  fontFamily: "var(--font-body)",
  fontSize: "0.9rem",
  lineHeight: 1.6,
  color: "var(--color-text)",
};

const modalXBtn: React.CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 22,
  height: 22,
  border: "none",
  background: "var(--color-bg-tertiary)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

function XIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" fill="none">
      <line x1="2" y1="2" x2="8" y2="8" />
      <line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  );
}

// ── Mobile comment modal (view/edit existing) ───────────────────────────

function CommentModal({
  annotation,
  onDelete,
  onEdit,
  onClose,
}: {
  annotation: Annotation;
  onDelete: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(annotation.comment_text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== annotation.comment_text) {
      onEdit(annotation.id, trimmed);
    }
    setEditing(false);
  };

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={modalBackdropStyle}>
      {editing && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", inset: 0, zIndex: 0 }}
        />
      )}
      <div onClick={(e) => { e.stopPropagation(); if (!editing) setEditing(true); }} style={{ ...modalCardStyle, cursor: editing ? undefined : "pointer", zIndex: 1 }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
              else if (e.key === "Escape") { setText(annotation.comment_text ?? ""); setEditing(false); }
            }}
            onBlur={handleSave}
            style={{
              width: "100%", minHeight: 24, resize: "none",
              fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
              border: "none", outline: "none", padding: 0, margin: 0,
              background: "transparent", color: "var(--color-text)", boxSizing: "border-box",
            }}
          />
        ) : (
          <p style={{ margin: 0, paddingRight: 24 }}>{annotation.comment_text}</p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (editing) { setText(annotation.comment_text ?? ""); setEditing(false); } else { onDelete(annotation.id); onClose(); } }}
          style={modalXBtn}
          aria-label={editing ? "Cancel" : "Delete comment"}
        >
          <XIcon />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Mobile comment input modal ──────────────────────────────────────────

function CommentInputModal({
  onSave,
  onCancel,
}: {
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={modalBackdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) onSave(text.trim());
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          placeholder="Add a comment…"
          style={{
            width: "100%",
            minHeight: 60,
            resize: "none",
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
            border: "none",
            outline: "none",
            padding: 0,
            margin: 0,
            background: "transparent",
            color: "var(--color-text)",
            boxSizing: "border-box",
          }}
        />
        <button onClick={onCancel} style={modalXBtn} aria-label="Cancel">
          <XIcon />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Main component ───────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 768;

export type CommentIntent = {
  startSegmentSeq: number;
  startChar: number;
  endSegmentSeq: number;
  endChar: number;
  anchorElement: HTMLElement;
};

export function HighlightedParagraph({
  para,
  idPrefix,
  chapterNum,
  annotations,
  bookId,
  onAnnotationSaved,
  onStartComment,
}: {
  para: ParagraphBlock;
  idPrefix: string;
  chapterNum: number;
  annotations: Annotation[];
  bookId: string;
  onAnnotationSaved: () => void;
  onStartComment?: (intent: CommentIntent) => void;
}) {
  const spans = useMemo(() => buildWordSpans(para), [para]);
  const text = para.text;
  const { audioRef, session, onChapterSelectRef } = useAudioPlayer();

  // ── Selection state ───────────────────────────────────────────────────
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [selEnd, setSelEnd] = useState<SelectionEnd | null>(null);
  const [showMobileCommentInput, setShowMobileCommentInput] = useState(false);
  const [mobileCommentAnn, setMobileCommentAnn] = useState<Annotation | null>(null);

  const clearSelection = useCallback(() => {
    setAnchor(null);
    setSelEnd(null);
    setShowMobileCommentInput(false);
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

  // ── Highlights overlapping current selection ────────────────────────
  const selectionHighlightIds = useMemo(() => {
    if (!selectionRange) return [];
    const ids = new Set<number>();
    for (let i = selectionRange.lo; i <= selectionRange.hi; i++) {
      const anns = getSpanAnnotations(spans[i]);
      for (const a of anns) {
        if (a.type === "highlight") ids.add(a.id);
      }
    }
    return Array.from(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionRange, annotationRanges]);

  const selectionHasHighlight = selectionHighlightIds.length > 0;

  // ── Highlight (toggle) ────────────────────────────────────────────────
  const handleHighlight = useCallback(() => {
    if (!anchor) return;

    if (selectionHasHighlight) {
      selectionHighlightIds.forEach((id) =>
        fetch(`/api/annotations/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {})
      );
    } else {
      const anchorSpan = spans[anchor.spanIdx];
      const endSpan = selEnd ? spans[selEnd.spanIdx] : anchorSpan;
      const lo = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? anchorSpan : endSpan;
      const hi = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? endSpan : anchorSpan;

      fetch("/api/annotations", {
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
      }).catch(() => {});
    }
    clearSelection();
    onAnnotationSaved();
  }, [anchor, selEnd, spans, bookId, chapterNum, clearSelection, onAnnotationSaved, selectionHasHighlight, selectionHighlightIds]);

  // ── Comment ──────────────────────────────────────────────────────────
  const handleComment = useCallback(() => {
    if (!anchor) return;
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile || !onStartComment) {
      setShowMobileCommentInput(true);
      return;
    }
    // Desktop: emit intent upward to ChapterBlocks
    const anchorSpan = spans[anchor.spanIdx];
    const endSpan = selEnd ? spans[selEnd.spanIdx] : anchorSpan;
    const lo = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? anchorSpan : endSpan;
    const hi = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? endSpan : anchorSpan;
    onStartComment({
      startSegmentSeq: lo.segmentSeq,
      startChar: lo.segCharStart,
      endSegmentSeq: hi.segmentSeq,
      endChar: hi.segCharEnd,
      anchorElement: anchor.element,
    });
    // Don't clear selection — keep underline visible while editing
    setAnchor(null);
    setSelEnd(null);
  }, [anchor, selEnd, spans, onStartComment]);

  const handleMobileCommentSave = useCallback((commentText: string) => {
    if (!anchor) return;
    const anchorSpan = spans[anchor.spanIdx];
    const endSpan = selEnd ? spans[selEnd.spanIdx] : anchorSpan;
    const lo = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? anchorSpan : endSpan;
    const hi = anchor.spanIdx <= (selEnd?.spanIdx ?? anchor.spanIdx) ? endSpan : anchorSpan;

    fetch("/api/annotations", {
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
    }).catch(() => {});
    clearSelection();
    onAnnotationSaved();
  }, [anchor, selEnd, spans, bookId, chapterNum, clearSelection, onAnnotationSaved]);

  // ── Delete annotation ─────────────────────────────────────────────────
  const handleDeleteAnnotation = useCallback((id: number) => {
    fetch(`/api/annotations/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
    onAnnotationSaved();
  }, [onAnnotationSaved]);

  const handleEditAnnotation = useCallback((id: number, commentText: string) => {
    fetch(`/api/annotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ commentText }),
    }).catch(() => {});
    onAnnotationSaved();
  }, [onAnnotationSaved]);

  // Ref for the paragraph container — used to allow clicks on sibling words
  const paraRef = useRef<HTMLSpanElement>(null);

  // ── No spans → plain text ─────────────────────────────────────────────
  if (!spans.length) return <>{text}</>;

  // ── Per-span state (precompute) ─────────────────────────────────────
  const spanStates = spans.map((span, i) => {
    const inSelection = selectionRange !== null && i >= selectionRange.lo && i <= selectionRange.hi;
    const anns = getSpanAnnotations(span);
    const hasHighlight = anns.some((a) => a.type === "highlight");
    const hasComment = anns.some((a) => a.type === "comment");
    const commentIds = anns.filter((a) => a.type === "comment").map((a) => a.id);
    return { inSelection, anns, hasHighlight, hasComment, commentIds };
  });

  // ── Render ────────────────────────────────────────────────────────────
  const elements: React.ReactNode[] = [];
  let lastEnd = 0;
  const taggedCommentIds = new Set<number>();

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { inSelection, anns: spanAnns, hasHighlight, hasComment, commentIds } = spanStates[i];

    // Gap text before this span
    if (span.charStart > lastEnd) {
      const gapText = text.slice(lastEnd, span.charStart);
      const prev = i > 0 ? spanStates[i - 1] : null;
      const gapHighlight = prev && prev.hasHighlight && hasHighlight;
      const gapComment = prev && prev.hasComment && hasComment;
      const gapSelection = prev && prev.inSelection && inSelection;
      // Shared comment IDs between prev and current for gap hover
      const gapCommentIds = prev && gapComment
        ? prev.commentIds.filter((id) => commentIds.includes(id))
        : [];

      if (gapSelection || gapHighlight || gapComment) {
        const gapBg = gapSelection ? "var(--color-selection)" : gapHighlight ? "var(--color-highlight)" : undefined;
        elements.push(
          <span key={`gap-${lastEnd}`}
            className={hasComment ? "comment-underline" : undefined}
            data-comment-ids={gapCommentIds.length > 0 ? gapCommentIds.join(" ") : undefined}
            style={{
              backgroundColor: gapBg,
              padding: gapBg ? "3px 0" : undefined,
              margin: gapBg ? "-3px 0" : undefined,
              borderBottom: gapComment && !gapSelection ? "2px solid rgba(50, 100, 200, 0.7)" : undefined,
            }}
          >{gapText}</span>
        );
      } else {
        elements.push(gapText);
      }
    }

    let bg: string | undefined;
    if (inSelection) {
      bg = "var(--color-selection)";
    } else if (hasHighlight) {
      bg = "var(--color-highlight)";
    }

    // Tag the first span of each comment annotation for DOM positioning
    const firstCommentAnn = spanAnns.find((a) => a.type === "comment" && !taggedCommentIds.has(a.id));
    if (firstCommentAnn) taggedCommentIds.add(firstCommentAnn.id);

    elements.push(
      <span
        key={span.charStart}
        id={`w-${idPrefix}-${span.charStart}`}
        className={hasComment ? "comment-underline" : undefined}
        data-comment-id={firstCommentAnn?.id}
        data-comment-ids={commentIds.length > 0 ? commentIds.join(" ") : undefined}
        onMouseEnter={() => {
          if (commentIds.length > 0) {
            commentIds.forEach((id) => setCommentHover(id, true));
          }
        }}
        onMouseLeave={() => {
          if (commentIds.length > 0) {
            commentIds.forEach((id) => setCommentHover(id, false));
          }
        }}
        onClick={(e) => {
          e.stopPropagation();

          // On mobile, clicking a commented span shows the comment modal
          if (!anchor && hasComment) {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            if (isMobile) {
              const commentAnn = spanAnns.find((a) => a.type === "comment");
              if (commentAnn) {
                setMobileCommentAnn(commentAnn);
                return;
              }
            }
          }

          // Selection logic
          if (!anchor) {
            setAnchor({ spanIdx: i, charStart: span.charStart, startMs: span.start_ms, element: e.currentTarget });
            setSelEnd(null);
          } else if (i === anchor.spanIdx && !selEnd) {
            clearSelection();
          } else if (inSelection && selEnd) {
            clearSelection();
          } else {
            setSelEnd({ spanIdx: i, charEnd: span.charEnd, element: e.currentTarget });
          }
        }}
        style={{
          cursor: "pointer",
          backgroundColor: bg,
          padding: bg ? "3px 0" : undefined,
          margin: bg ? "-3px 0" : undefined,
          borderBottom: hasComment && !inSelection ? "2px solid rgba(50, 100, 200, 0.7)" : undefined,
        }}
      >
        {text.slice(span.charStart, span.charEnd)}
      </span>
    );

    lastEnd = span.charEnd;
  }

  if (lastEnd < text.length) elements.push(text.slice(lastEnd));

  return (
    <span ref={paraRef}>
      {elements}

      {/* Word popup */}
      {anchor && !showMobileCommentInput && (
        <WordPopup
          anchorEl={anchor.element}
          anchorEl2={selEnd?.element}
          containerEl={paraRef.current}
          isHighlighted={selectionHasHighlight}
          onPlay={handlePlay}
          onHighlight={handleHighlight}
          onComment={handleComment}
          onClose={clearSelection}
        />
      )}

      {/* Comment input (mobile modal) */}
      {anchor && showMobileCommentInput && (
        <CommentInputModal
          onSave={handleMobileCommentSave}
          onCancel={clearSelection}
        />
      )}

      {/* Mobile comment view modal */}
      {mobileCommentAnn && (
        <CommentModal
          annotation={mobileCommentAnn}
          onDelete={handleDeleteAnnotation}
          onEdit={handleEditAnnotation}
          onClose={() => setMobileCommentAnn(null)}
        />
      )}
    </span>
  );
}
