"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Annotation, Block } from "./types";
import type { CommentIntent } from "./InteractiveParagraph";
import { useAnnotations } from "./AnnotationContext";
import { tagComment } from "./wordAnnotator";
import { setCommentHover } from "./commentHover";

// ── Types ────────────────────────────────────────────────────────────────

type DraftComment = CommentIntent & { id: string };

type Props = {
  blocks: Block[];
  bookId: string;
  chapterNum: number;
  marginEl: HTMLDivElement | null;
  textContainerRef: React.RefObject<HTMLDivElement | null>;
};

// ── Margin comment card ──────────────────────────────────────────────────

const iconBtnBase: React.CSSProperties = {
  position: "absolute", top: 4, right: 4, width: 18, height: 18,
  border: "none", background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)",
  cursor: "pointer", borderRadius: "50%", display: "flex", alignItems: "center",
  justifyContent: "center", padding: 0, lineHeight: 1,
};

type MarginCardProps = {
  cardRef: (el: HTMLDivElement | null) => void;
} & (
  | { annotation: Annotation; onDelete: (id: number) => void; onEdit: (id: number, text: string) => void; draft?: false; onSave?: never; onCancel?: never }
  | { annotation?: never; onDelete?: never; onEdit?: never; draft: true; onSave: (text: string) => void; onCancel: () => void }
);

function MarginCommentCard(props: MarginCardProps) {
  const { cardRef } = props;
  const [editing, setEditing] = useState(!!props.draft);
  const [text, setText] = useState(props.draft ? "" : (props.annotation?.comment_text ?? ""));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentId = props.draft ? undefined : props.annotation?.id;

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
    if (!trimmed) { handleCancel(); return; }
    if (props.draft) { props.onSave(trimmed); }
    else { props.onEdit(props.annotation.id, trimmed); setEditing(false); }
  };

  const handleCancel = () => {
    if (props.draft) props.onCancel();
    else { setText(props.annotation.comment_text ?? ""); setEditing(false); }
  };

  return (
    <div ref={cardRef} data-margin-comment-id={commentId} className="margin-comment-card"
      onMouseEnter={() => commentId != null && setCommentHover(commentId, true)}
      onMouseLeave={() => commentId != null && setCommentHover(commentId, false)}
      onClick={() => { if (!editing) setEditing(true); }}
      style={{
        position: "absolute", left: 0, right: 0, background: "none",
        border: "none", borderLeft: "3px solid rgba(50,100,200,0.7)", borderRadius: 0,
        padding: "4px 0 4px 10px", fontSize: "0.8rem", lineHeight: 1.5,
        fontFamily: "var(--font-body)", color: "var(--color-text)",
        cursor: editing ? undefined : "pointer",
      }}
    >
      {editing ? (
        <textarea ref={textareaRef} value={text}
          onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } else if (e.key === "Escape") handleCancel(); }}
          onBlur={handleSave} placeholder="Add a comment..."
          style={{ width: "100%", minHeight: 24, resize: "none", overflow: "hidden", fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", border: "none", outline: "none", padding: 0, margin: 0, background: "transparent", color: "var(--color-text)", boxSizing: "border-box" }}
        />
      ) : (
        <p style={{ margin: 0, color: "var(--color-text)" }}>{text}</p>
      )}
      <button onClick={(e) => { e.stopPropagation(); if (editing) handleCancel(); else props.onDelete!(props.annotation!.id); }}
        style={{ ...iconBtnBase, visibility: editing ? "visible" : "hidden" }} className="margin-comment-x" aria-label={editing ? "Cancel" : "Delete"}>
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" fill="none">
          <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function AnnotationLayer({
  blocks, bookId, chapterNum, marginEl, textContainerRef,
}: Props) {
  const { annotations, removeAnnotation, updateAnnotation, addAnnotation } = useAnnotations();
  const commentCardsRef = useRef<Map<number | string, HTMLDivElement>>(new Map());
  const [draftComment, setDraftComment] = useState<DraftComment | null>(null);

  // Listen for desktop comment intents from InteractiveParagraph
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CommentIntent;
      setDraftComment({ ...detail, id: `draft-${Date.now()}` });
    };
    document.addEventListener("start-comment", handler);
    return () => document.removeEventListener("start-comment", handler);
  }, []);

  const handleDraftSave = useCallback((commentText: string) => {
    if (!draftComment) return;
    // Optimistic: add to state + tag DOM spans with matching ID
    const id = addAnnotation({
      start_segment_seq: draftComment.startSegmentSeq,
      start_char: draftComment.startChar,
      end_segment_seq: draftComment.endSegmentSeq,
      end_char: draftComment.endChar,
      type: "comment",
      color: "",
      comment_text: commentText,
    });
    // Re-tag DOM spans so data-comment-id matches the state ID
    tagComment(chapterNum, id,
      draftComment.startSegmentSeq, draftComment.startChar,
      draftComment.endSegmentSeq, draftComment.endChar);
    // Persist
    fetch("/api/annotations", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        bookId, chapterNumber: chapterNum,
        startSegmentSeq: draftComment.startSegmentSeq, startChar: draftComment.startChar,
        endSegmentSeq: draftComment.endSegmentSeq, endChar: draftComment.endChar,
        type: "comment", commentText,
      }),
    }).catch(() => {});
    setDraftComment(null);
  }, [draftComment, bookId, chapterNum, addAnnotation]);

  const commentAnns = useMemo(() => {
    const result: Annotation[] = [];
    for (const block of blocks) {
      if (block.type !== "paragraph") continue;
      const seqs = new Set(block.segments.map((s) => s.sequence));
      for (const ann of annotations) {
        if (ann.type === "comment" && (seqs.has(ann.start_segment_seq) || seqs.has(ann.end_segment_seq))) {
          result.push(ann);
        }
      }
    }
    return result;
  }, [blocks, annotations]);

  // Position cards — compute ideal positions from anchor elements, then resolve overlaps
  const positionCards = useCallback(() => {
    const textEl = textContainerRef.current;
    if (!textEl || !marginEl) return;
    if (commentAnns.length === 0 && !draftComment) return;
    const marginRect = marginEl.getBoundingClientRect();

    // Collect all cards with their ideal top positions
    const positioned: { key: number | string; idealTop: number }[] = [];

    for (const ann of commentAnns) {
      const card = commentCardsRef.current.get(ann.id);
      if (!card) continue;
      const anchorSpan = textEl.querySelector(`[data-comment-id="${ann.id}"]`);
      if (anchorSpan) {
        const idealTop = anchorSpan.getBoundingClientRect().top - marginRect.top;
        card.style.top = `${idealTop}px`;
        positioned.push({ key: ann.id, idealTop });
      }
    }

    if (draftComment) {
      const draftCard = commentCardsRef.current.get(draftComment.id);
      if (draftCard && draftComment.anchorElement) {
        const idealTop = draftComment.anchorElement.getBoundingClientRect().top - marginRect.top;
        draftCard.style.top = `${idealTop}px`;
        positioned.push({ key: draftComment.id, idealTop });
      }
    }

    // Sort by ideal position (top to bottom) then resolve overlaps
    positioned.sort((a, b) => a.idealTop - b.idealTop);
    let lastBottom = -Infinity;
    for (const { key } of positioned) {
      const card = commentCardsRef.current.get(key);
      if (!card) continue;
      const top = parseFloat(card.style.top) || 0;
      if (top < lastBottom + 6) card.style.top = `${lastBottom + 6}px`;
      lastBottom = (parseFloat(card.style.top) || 0) + card.offsetHeight;
    }
  }, [commentAnns, marginEl, draftComment, textContainerRef]);

  useLayoutEffect(() => { positionCards(); });
  useEffect(() => {
    const h = () => positionCards();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [positionCards]);

  const handleDelete = useCallback((id: number) => {
    removeAnnotation(id);
    fetch(`/api/annotations/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }, [removeAnnotation]);

  const handleEdit = useCallback((id: number, text: string) => {
    updateAnnotation(id, { comment_text: text });
    fetch(`/api/annotations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ commentText: text }),
    }).catch(() => {});
  }, [updateAnnotation]);

  if (!marginEl) return null;

  return createPortal(
    <>
      {commentAnns.map((ann) => (
        <MarginCommentCard key={ann.id} annotation={ann} onDelete={handleDelete} onEdit={handleEdit}
          cardRef={(el) => { if (el) commentCardsRef.current.set(ann.id, el); else commentCardsRef.current.delete(ann.id); }}
        />
      ))}
      {draftComment && (
        <MarginCommentCard key={draftComment.id} draft onSave={handleDraftSave} onCancel={() => setDraftComment(null)}
          cardRef={(el) => { if (el) commentCardsRef.current.set(draftComment.id, el); else commentCardsRef.current.delete(draftComment.id); }}
        />
      )}
    </>,
    marginEl
  );
}
