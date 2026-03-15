"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Annotation, Block, NavChapter } from "./types";
import { HighlightedParagraph, type CommentIntent } from "./HighlightedParagraph";
import { setCommentHover } from "./commentHover";
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

// ── Main component ─────────────────────────────────────────────────────

type DraftComment = CommentIntent & { id: string };


export function ChapterBlocks({
  blocks,
  chapterNum,
  paraRefsMap,
  verse,
  annotations,
  bookId,
  onAnnotationSaved,
  marginEl,
}: {
  blocks: Block[];
  chapterNum: number;
  paraRefsMap: React.RefObject<Record<number, (HTMLParagraphElement | null)[]>>;
  verse?: boolean;
  annotations: Annotation[];
  bookId: string;
  onAnnotationSaved: () => void;
  marginEl: HTMLDivElement | null;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const commentCardsRef = useRef<Map<number | string, HTMLDivElement>>(new Map());

  // ── Draft comment (new comment being typed in margin) ───────────────
  const [draftComment, setDraftComment] = useState<DraftComment | null>(null);

  const handleStartComment = useCallback((intent: CommentIntent) => {
    setDraftComment({ ...intent, id: `draft-${Date.now()}` });
  }, []);

  const handleDraftSave = useCallback(async (commentText: string) => {
    if (!draftComment) return;
    await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        bookId,
        chapterNumber: chapterNum,
        startSegmentSeq: draftComment.startSegmentSeq,
        startChar: draftComment.startChar,
        endSegmentSeq: draftComment.endSegmentSeq,
        endChar: draftComment.endChar,
        type: "comment",
        commentText,
      }),
    });
    setDraftComment(null);
    onAnnotationSaved();
  }, [draftComment, bookId, chapterNum, onAnnotationSaved]);

  // ── Collect comment annotations ─────────────────────────────────────
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

  // ── Position comment cards via direct DOM measurement ───────────────
  const positionCards = useCallback(() => {
    const textEl = textRef.current;
    if (!textEl || !marginEl) return;
    const hasCards = commentAnns.length > 0 || draftComment;
    if (!hasCards) return;

    const marginRect = marginEl.getBoundingClientRect();

    // Position saved comment cards
    for (const ann of commentAnns) {
      const card = commentCardsRef.current.get(ann.id);
      if (!card) continue;
      const anchorSpan = textEl.querySelector(`[data-comment-id="${ann.id}"]`);
      if (anchorSpan) {
        const spanRect = anchorSpan.getBoundingClientRect();
        card.style.top = `${spanRect.top - marginRect.top}px`;
      }
    }

    // Position draft card
    if (draftComment) {
      const draftCard = commentCardsRef.current.get(draftComment.id);
      if (draftCard) {
        const anchorRect = draftComment.anchorElement.getBoundingClientRect();
        draftCard.style.top = `${anchorRect.top - marginRect.top}px`;
      }
    }

    // Prevent overlapping: push cards down if they'd collide
    const allKeys: (number | string)[] = [
      ...commentAnns.map((a) => a.id),
      ...(draftComment ? [draftComment.id] : []),
    ];
    const cards = allKeys
      .map((key) => commentCardsRef.current.get(key))
      .filter((c): c is HTMLDivElement => c != null);

    let lastBottom = -Infinity;
    for (const card of cards) {
      const top = parseFloat(card.style.top) || 0;
      if (top < lastBottom + 6) {
        card.style.top = `${lastBottom + 6}px`;
      }
      lastBottom = (parseFloat(card.style.top) || 0) + card.offsetHeight;
    }
  }, [commentAnns, marginEl, draftComment]);

  useLayoutEffect(() => { positionCards(); });

  useEffect(() => {
    const h = () => positionCards();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [positionCards]);

  const handleDeleteAnnotation = useCallback(async (id: number) => {
    await fetch(`/api/annotations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    onAnnotationSaved();
  }, [onAnnotationSaved]);

  const handleEditAnnotation = useCallback(async (id: number, commentText: string) => {
    await fetch(`/api/annotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ commentText }),
    });
    onAnnotationSaved();
  }, [onAnnotationSaved]);

  return (
    <>
      <div ref={textRef} className="space-y-5">
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
              <HighlightedParagraph
                para={block}
                idPrefix={`${chapterNum}-${i}`}
                chapterNum={chapterNum}
                annotations={annotations}
                bookId={bookId}
                onAnnotationSaved={onAnnotationSaved}
                onStartComment={handleStartComment}
              />
            </p>
          )
        )}
      </div>

      {/* Margin comment cards — portaled into the margin column */}
      {marginEl && createPortal(
        <>
          {commentAnns.map((ann) => (
            <MarginCommentCard
              key={ann.id}
              annotation={ann}
              onDelete={handleDeleteAnnotation}
              onEdit={handleEditAnnotation}
              cardRef={(el) => {
                if (el) commentCardsRef.current.set(ann.id, el);
                else commentCardsRef.current.delete(ann.id);
              }}
            />
          ))}
          {draftComment && (
            <MarginCommentCard
              key={draftComment.id}
              draft
              onSave={handleDraftSave}
              onCancel={() => setDraftComment(null)}
              cardRef={(el) => {
                if (el) commentCardsRef.current.set(draftComment.id, el);
                else commentCardsRef.current.delete(draftComment.id);
              }}
            />
          )}
        </>,
        marginEl
      )}
    </>
  );
}

// ── Margin comment card ────────────────────────────────────────────────

const iconBtnBase: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 18,
  height: 18,
  border: "none",
  background: "var(--color-bg-tertiary)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
};

// Overloaded props: either a saved annotation (view/edit) or a draft (new)
type MarginCommentCardProps = {
  cardRef: (el: HTMLDivElement | null) => void;
} & (
  | {
      annotation: Annotation;
      onDelete: (id: number) => void;
      onEdit: (id: number, text: string) => void;
      draft?: false;
      onSave?: never;
      onCancel?: never;
    }
  | {
      annotation?: never;
      onDelete?: never;
      onEdit?: never;
      draft: true;
      onSave: (text: string) => void;
      onCancel: () => void;
    }
);

function MarginCommentCard(props: MarginCommentCardProps) {
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
    if (!trimmed) {
      handleCancel();
      return;
    }
    if (props.draft) {
      props.onSave(trimmed);
    } else {
      props.onEdit(props.annotation.id, trimmed);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (props.draft) {
      props.onCancel();
    } else {
      setText(props.annotation.comment_text ?? "");
      setEditing(false);
    }
  };

  return (
    <div
      ref={cardRef}
      data-margin-comment-id={commentId}
      className="margin-comment-card"
      onMouseEnter={() => commentId != null && setCommentHover(commentId, true)}
      onMouseLeave={() => commentId != null && setCommentHover(commentId, false)}
      onClick={() => { if (!editing) setEditing(true); }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        background: "none",
        border: "none",
        borderLeft: "3px solid rgba(50, 100, 200, 0.7)",
        borderRadius: 0,
        padding: "4px 0 4px 10px",
        fontSize: "0.8rem",
        lineHeight: 1.5,
        fontFamily: "var(--font-body)",
        color: "var(--color-text)",
        cursor: editing ? undefined : "pointer",
      }}
    >
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
          onBlur={handleSave}
          placeholder="Add a comment…"
          style={{
            width: "100%",
            minHeight: 24,
            resize: "none",
            overflow: "hidden",
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
      ) : (
        <p style={{ margin: 0, color: "var(--color-text)" }}>
          {text}
        </p>
      )}

      {/* X button: delete (view) or cancel (edit) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (editing) handleCancel();
          else props.onDelete!(props.annotation!.id);
        }}
        style={{ ...iconBtnBase, visibility: editing ? "visible" : "hidden" }}
        className="margin-comment-x"
        aria-label={editing ? "Cancel" : "Delete comment"}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" fill="none">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  );
}
