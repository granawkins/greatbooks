"use client";

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import type { Annotation } from "./types";
import { WordPopup } from "./WordPopup";
import { CommentModal, CommentInputModal } from "./CommentModals";
import { setCommentHover } from "./commentHover";
import { useAudioSession } from "@/lib/AudioPlayerContext";
import { useAnnotations } from "./AnnotationContext";
import {
  applyAnnotations, clearAnnotations, applyClass, removeClass,
  tagComment, untagComment, findWordSpan, getSpanCoords,
  startSelection, extendSelection, clearSelection,
  getSelection, getSelectionRange, onSelectionChange, hasSelection,
} from "./wordAnnotator";

// ── Types ────────────────────────────────────────────────────────────────

export type CommentIntent = {
  startSegmentSeq: number;
  startChar: number;
  endSegmentSeq: number;
  endChar: number;
  anchorElement: HTMLElement;
};

type Props = {
  children: React.ReactNode;
  chapterNum: number;
  bookId: string;
};

const MOBILE_BREAKPOINT = 768;

// ── Subscribe to module-level selection state ────────────────────────────

function useSelectionState() {
  const subscribe = useCallback((fn: () => void) => onSelectionChange(fn), []);
  const getSnapshot = useCallback(() => getSelection(), []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── Main component ───────────────────────────────────────────────────────

export default function InteractiveParagraph({
  children, chapterNum, bookId,
}: Props) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const { audioRef, session, onChapterSelectRef } = useAudioSession();
  const { annotations, addAnnotation, removeAnnotation } = useAnnotations();

  const [showCommentInput, setShowCommentInput] = useState(false);
  const [mobileCommentAnn, setMobileCommentAnn] = useState<Annotation | null>(null);

  const annotationsRef = useRef(annotations);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  const sel = useSelectionState();

  // ── Apply initial annotations on mount ─────────────────────────────────

  useEffect(() => {
    applyAnnotations(chapterNum, annotations);
    return () => clearAnnotations(chapterNum);
  }, [chapterNum, annotations]);

  // ── Event delegation ──────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    const span = findWordSpan(e.target as HTMLElement, chapterNum);
    if (!span) return;
    e.stopPropagation();
    const coords = getSpanCoords(span);
    if (!coords) return;

    // Mobile comment view — tap on commented word
    if (!hasSelection()) {
      const commentIds = span.getAttribute("data-comment-ids");
      if (commentIds && window.innerWidth < MOBILE_BREAKPOINT) {
        const annId = parseInt(commentIds.split(" ")[0]);
        const ann = annotationsRef.current.find((a) => a.id === annId);
        if (ann) { setMobileCommentAnn(ann); return; }
      }
    }

    const currentSel = getSelection();
    if (!currentSel) {
      // No selection — start one
      startSelection(chapterNum, coords.seq, coords.charStart, coords.charEnd, span);
    } else if (currentSel.end) {
      // Already have a range — click anywhere clears
      clearSelection();
    } else if (
      coords.seq === currentSel.anchor.seq &&
      coords.charStart === currentSel.anchor.charStart
    ) {
      // Click same word again — deselect
      clearSelection();
    } else {
      // Extend selection (works across paragraphs)
      extendSelection(coords.seq, coords.charStart, coords.charEnd, span);
    }
  }, [chapterNum]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const span = (e.target as HTMLElement).closest("[data-comment-ids]") as HTMLElement | null;
    if (span) (span.getAttribute("data-comment-ids") ?? "").split(" ").map(Number).forEach((id) => setCommentHover(id, true));
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const span = (e.target as HTMLElement).closest("[data-comment-ids]") as HTMLElement | null;
    if (span) (span.getAttribute("data-comment-ids") ?? "").split(" ").map(Number).forEach((id) => setCommentHover(id, false));
  }, []);

  // ── Actions (operate on module-level selection) ────────────────────────

  const handlePlay = useCallback(() => {
    if (!hasSelection()) return;
    if (session && session.chapterId === chapterNum) {
      audioRef.current?.play().catch(() => {});
    } else {
      onChapterSelectRef.current?.(chapterNum);
    }
    clearSelection();
  }, [session, chapterNum, audioRef, onChapterSelectRef]);

  const handleHighlight = useCallback(() => {
    const range = getSelectionRange();
    if (!range) return;

    // Check DOM for existing highlights in range
    const spans = document.querySelectorAll<HTMLElement>(`[id^="w-${chapterNum}-"]`);
    let hasExisting = false;
    for (const span of spans) {
      if (!span.classList.contains("ann-highlight")) continue;
      const coord = getSpanCoords(span);
      if (!coord) continue;
      if (coord.seq >= range.startSeq && coord.seq <= range.endSeq &&
          !(coord.seq === range.startSeq && coord.charEnd <= range.startChar) &&
          !(coord.seq === range.endSeq && coord.charStart >= range.endChar)) {
        hasExisting = true; break;
      }
    }

    if (hasExisting) {
      // Find annotations that precisely overlap the selection's char range
      const overlapping = annotationsRef.current.filter((a) => {
        if (a.type !== "highlight") return false;
        if (a.end_segment_seq < range.startSeq || a.start_segment_seq > range.endSeq) return false;
        if (a.end_segment_seq === range.startSeq && a.end_char <= range.startChar) return false;
        if (a.start_segment_seq === range.endSeq && a.start_char >= range.endChar) return false;
        return true;
      });
      // Remove only those annotations' ranges from DOM + state + API
      for (const a of overlapping) {
        removeClass(chapterNum, a.start_segment_seq, a.start_char, a.end_segment_seq, a.end_char, "ann-highlight");
        removeAnnotation(a.id);
        fetch(`/api/annotations/${a.id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
      }
    } else {
      // Add — optimistic DOM + state + API
      applyClass(chapterNum, range.startSeq, range.startChar, range.endSeq, range.endChar, "ann-highlight");
      addAnnotation({
        start_segment_seq: range.startSeq, start_char: range.startChar,
        end_segment_seq: range.endSeq, end_char: range.endChar,
        type: "highlight", color: "", comment_text: null,
      });
      fetch("/api/annotations", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          bookId, chapterNumber: chapterNum,
          startSegmentSeq: range.startSeq, startChar: range.startChar,
          endSegmentSeq: range.endSeq, endChar: range.endChar,
          type: "highlight",
        }),
      }).catch(() => {});
    }
    clearSelection();
  }, [chapterNum, bookId, addAnnotation, removeAnnotation]);

  const handleComment = useCallback(() => {
    const range = getSelectionRange();
    const sel = getSelection();
    if (!range || !sel) return;
    // Immediately underline the selected words
    tagComment(chapterNum, -Date.now(), range.startSeq, range.startChar, range.endSeq, range.endChar);
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile) {
      setShowCommentInput(true);
      return;
    }
    // Desktop: dispatch event for AnnotationLayer to show margin draft
    // Pass the anchor element BEFORE clearing selection
    const anchorEl = sel.anchor.element;
    document.dispatchEvent(new CustomEvent("start-comment", {
      detail: {
        startSegmentSeq: range.startSeq, startChar: range.startChar,
        endSegmentSeq: range.endSeq, endChar: range.endChar,
        anchorElement: anchorEl,
      },
    }));
    clearSelection();
  }, [chapterNum]);

  const handleCommentSave = useCallback((commentText: string) => {
    const range = getSelectionRange();
    if (!range) return;
    // Optimistic: DOM + state + API
    const tempId = addAnnotation({
      start_segment_seq: range.startSeq, start_char: range.startChar,
      end_segment_seq: range.endSeq, end_char: range.endChar,
      type: "comment", color: "", comment_text: commentText,
    });
    tagComment(chapterNum, tempId, range.startSeq, range.startChar, range.endSeq, range.endChar);
    fetch("/api/annotations", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        bookId, chapterNumber: chapterNum,
        startSegmentSeq: range.startSeq, startChar: range.startChar,
        endSegmentSeq: range.endSeq, endChar: range.endChar,
        type: "comment", commentText,
      }),
    }).catch(() => {});
    clearSelection();
    setShowCommentInput(false);
  }, [chapterNum, bookId, addAnnotation]);

  const handleDeleteAnnotation = useCallback((id: number) => {
    const ann = annotationsRef.current.find((a) => a.id === id);
    if (ann) {
      if (ann.type === "highlight") removeClass(chapterNum, ann.start_segment_seq, ann.start_char, ann.end_segment_seq, ann.end_char, "ann-highlight");
      else untagComment(chapterNum, id);
    }
    removeAnnotation(id);
    fetch(`/api/annotations/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }, [chapterNum, removeAnnotation]);

  const handleEditAnnotation = useCallback((id: number, text: string) => {
    fetch(`/api/annotations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ commentText: text }),
    }).catch(() => {});
  }, []);

  // ── Popup: only show in the paragraph that owns the anchor ─────────────

  const [showPopup, setShowPopup] = useState(false);
  const [selHasHighlight, setSelHasHighlight] = useState(false);
  const [popupContainerEl, setPopupContainerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!sel || !container) { setShowPopup(false); setSelHasHighlight(false); return; }
    const ownsAnchor = container.contains(sel.anchor.element);
    setShowPopup(ownsAnchor);
    setPopupContainerEl(container);
    if (!ownsAnchor) return;

    const range = getSelectionRange();
    if (!range) { setSelHasHighlight(false); return; }
    // Check if any of the actually-selected spans have the highlight class
    const spans = document.querySelectorAll<HTMLElement>(`[id^="w-${chapterNum}-"]`);
    let found = false;
    for (const span of spans) {
      if (!span.classList.contains("ann-highlight")) continue;
      const coord = getSpanCoords(span);
      if (!coord) continue;
      // Must be within the selection's char range, not just the segment range
      if (coord.seq < range.startSeq || coord.seq > range.endSeq) continue;
      if (coord.seq === range.startSeq && coord.charEnd <= range.startChar) continue;
      if (coord.seq === range.endSeq && coord.charStart >= range.endChar) continue;
      found = true; break;
    }
    setSelHasHighlight(found);
  }, [sel, chapterNum]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <span ref={containerRef} onClick={handleClick}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      style={{ cursor: "pointer" }}>
      {children}

      {showPopup && !showCommentInput && sel && (
        <WordPopup
          anchorEl={sel.anchor.element}
          anchorEl2={sel.end?.element}
          containerEl={popupContainerEl}
          isHighlighted={selHasHighlight}
          onPlay={handlePlay}
          onHighlight={handleHighlight}
          onComment={handleComment}
          onClose={clearSelection}
        />
      )}

      {showPopup && showCommentInput && (
        <CommentInputModal onSave={handleCommentSave} onCancel={() => { clearSelection(); setShowCommentInput(false); }} />
      )}

      {mobileCommentAnn && (
        <CommentModal annotation={mobileCommentAnn}
          onDelete={handleDeleteAnnotation} onEdit={handleEditAnnotation}
          onClose={() => setMobileCommentAnn(null)}
        />
      )}
    </span>
  );
}
