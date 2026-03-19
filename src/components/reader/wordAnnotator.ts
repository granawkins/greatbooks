/**
 * Imperative DOM styling for word spans.
 * Single system used by: audio cursor, highlights, comments, selections, bookmark flash.
 * All operations are direct DOM manipulation — no React state or re-renders.
 */

import type { Annotation } from "./types";

// ── Span lookup ──────────────────────────────────────────────────────────

/** Parse span ID: w-{ch}-{seq}-{charStart} → { seq, charStart } */
function parseId(id: string): { seq: number; charStart: number } | null {
  const p = id.split("-");
  if (p.length !== 4) return null;
  const seq = parseInt(p[2]);
  const charStart = parseInt(p[3]);
  if (isNaN(seq) || isNaN(charStart)) return null;
  return { seq, charStart };
}

/** Get all word spans for a chapter (cached per call, not globally) */
function getAllSpans(chapterNum: number): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[id^="w-${chapterNum}-"]`));
}

/** Check if a span falls within a coordinate range */
function spanInRange(
  span: HTMLElement,
  startSeq: number, startChar: number,
  endSeq: number, endChar: number,
): boolean {
  const coord = parseId(span.id);
  if (!coord) return false;
  const charEnd = coord.charStart + (span.textContent?.length ?? 0);

  if (coord.seq < startSeq || coord.seq > endSeq) return false;
  if (coord.seq === startSeq && charEnd <= startChar) return false;
  if (coord.seq === endSeq && coord.charStart >= endChar) return false;
  return true;
}

/** Find spans in a coordinate range */
function getSpansInRange(
  chapterNum: number,
  startSeq: number, startChar: number,
  endSeq: number, endChar: number,
): HTMLElement[] {
  return getAllSpans(chapterNum).filter((s) => spanInRange(s, startSeq, startChar, endSeq, endChar));
}

// ── Class operations ─────────────────────────────────────────────────────

/** Apply a CSS class to all spans in a coordinate range */
export function applyClass(
  chapterNum: number,
  startSeq: number, startChar: number,
  endSeq: number, endChar: number,
  className: string,
): void {
  const spans = getSpansInRange(chapterNum, startSeq, startChar, endSeq, endChar);
  for (const span of spans) {
    span.classList.add(className);
  }
}

/** Remove a CSS class from all spans in a coordinate range */
export function removeClass(
  chapterNum: number,
  startSeq: number, startChar: number,
  endSeq: number, endChar: number,
  className: string,
): void {
  const spans = getSpansInRange(chapterNum, startSeq, startChar, endSeq, endChar);
  for (const span of spans) {
    span.classList.remove(className);
  }
}

/** Apply a CSS class to a single span by ID */
export function applyClassById(id: string, className: string): void {
  document.getElementById(id)?.classList.add(className);
}

/** Remove a CSS class from a single span by ID */
export function removeClassById(id: string, className: string): void {
  document.getElementById(id)?.classList.remove(className);
}

/** Remove a CSS class from ALL spans in a chapter */
export function removeClassAll(chapterNum: number, className: string): void {
  for (const span of getAllSpans(chapterNum)) {
    span.classList.remove(className);
  }
}

// ── Comment data attributes ──────────────────────────────────────────────

/** Tag spans in a range with comment annotation data */
export function tagComment(
  chapterNum: number,
  annId: number,
  startSeq: number, startChar: number,
  endSeq: number, endChar: number,
): void {
  const spans = getSpansInRange(chapterNum, startSeq, startChar, endSeq, endChar);
  let firstTagged = false;
  for (const span of spans) {
    span.classList.add("ann-comment");
    const existing = span.getAttribute("data-comment-ids") ?? "";
    const ids = existing ? existing.split(" ") : [];
    if (!ids.includes(String(annId))) {
      ids.push(String(annId));
      span.setAttribute("data-comment-ids", ids.join(" "));
    }
    if (!firstTagged) {
      span.setAttribute("data-comment-id", String(annId));
      firstTagged = true;
    }
  }
}

/** Remove comment annotation data from spans */
export function untagComment(chapterNum: number, annId: number): void {
  const spans = getAllSpans(chapterNum);
  for (const span of spans) {
    const ids = (span.getAttribute("data-comment-ids") ?? "").split(" ").filter(Boolean);
    const filtered = ids.filter((id) => id !== String(annId));
    if (filtered.length > 0) {
      span.setAttribute("data-comment-ids", filtered.join(" "));
    } else {
      span.removeAttribute("data-comment-ids");
      span.classList.remove("ann-comment");
    }
    if (span.getAttribute("data-comment-id") === String(annId)) {
      span.removeAttribute("data-comment-id");
    }
  }
}

// ── Batch apply ──────────────────────────────────────────────────────────

/** Apply all annotations from initial data (called once on mount) */
export function applyAnnotations(chapterNum: number, annotations: Annotation[]): void {
  for (const ann of annotations) {
    if (ann.type === "highlight") {
      applyClass(chapterNum, ann.start_segment_seq, ann.start_char, ann.end_segment_seq, ann.end_char, "ann-highlight");
    } else if (ann.type === "comment") {
      tagComment(chapterNum, ann.id, ann.start_segment_seq, ann.start_char, ann.end_segment_seq, ann.end_char);
    }
  }
}

/** Clear all annotation styles from a chapter */
export function clearAnnotations(chapterNum: number): void {
  const spans = getAllSpans(chapterNum);
  for (const span of spans) {
    span.classList.remove("ann-highlight", "ann-comment", "ann-selection", "word-active", "word-bookmark");
    span.removeAttribute("data-comment-ids");
    span.removeAttribute("data-comment-id");
  }
}

// ── Selection state (module-level, shared across paragraphs) ──────────────

type SelectionState = {
  chapterNum: number;
  anchor: { seq: number; charStart: number; charEnd: number; element: HTMLElement };
  end: { seq: number; charStart: number; charEnd: number; element: HTMLElement } | null;
};

let selection: SelectionState | null = null;
let selectionListeners: Array<() => void> = [];

export function onSelectionChange(fn: () => void): () => void {
  selectionListeners.push(fn);
  return () => { selectionListeners = selectionListeners.filter((f) => f !== fn); };
}

function notifySelection() { selectionListeners.forEach((fn) => fn()); }

export function getSelection(): SelectionState | null { return selection; }

/** Get ordered selection range */
export function getSelectionRange(): { startSeq: number; startChar: number; endSeq: number; endChar: number; anchorEl: HTMLElement; endEl: HTMLElement } | null {
  if (!selection) return null;
  const a = selection.anchor;
  const b = selection.end ?? a;
  const [lo, hi] = (a.seq < b.seq || (a.seq === b.seq && a.charStart <= b.charStart)) ? [a, b] : [b, a];
  return { startSeq: lo.seq, startChar: lo.charStart, endSeq: hi.seq, endChar: hi.charEnd, anchorEl: a.element, endEl: b.element };
}

export function startSelection(chapterNum: number, seq: number, charStart: number, charEnd: number, element: HTMLElement): void {
  // Clear previous selection styling
  if (selection) removeClassAll(selection.chapterNum, "ann-selection");
  selection = { chapterNum, anchor: { seq, charStart, charEnd, element }, end: null };
  applyClass(chapterNum, seq, charStart, seq, charEnd, "ann-selection");
  notifySelection();
}

export function extendSelection(seq: number, charStart: number, charEnd: number, element: HTMLElement): void {
  if (!selection) return;
  selection.end = { seq, charStart, charEnd, element };
  // Restyle the full range
  removeClassAll(selection.chapterNum, "ann-selection");
  const range = getSelectionRange()!;
  applyClass(selection.chapterNum, range.startSeq, range.startChar, range.endSeq, range.endChar, "ann-selection");
  notifySelection();
}

export function clearSelection(): void {
  if (selection) removeClassAll(selection.chapterNum, "ann-selection");
  selection = null;
  notifySelection();
}

export function hasSelection(): boolean { return selection !== null; }

// ── Utility ──────────────────────────────────────────────────────────────

/** Find the first word span in a segment */
export function findFirstSpanInSegment(chapterNum: number, seq: number): HTMLElement | null {
  // All spans for this segment start with w-{ch}-{seq}-
  const spans = document.querySelectorAll<HTMLElement>(`[id^="w-${chapterNum}-${seq}-"]`);
  if (spans.length === 0) return null;
  // Return the one with the lowest charStart
  let best: HTMLElement | null = null;
  let bestChar = Infinity;
  for (const span of spans) {
    const coord = parseId(span.id);
    if (coord && coord.charStart < bestChar) {
      bestChar = coord.charStart;
      best = span;
    }
  }
  return best;
}

/** Get coordinates from a span element */
export function getSpanCoords(span: HTMLElement): { seq: number; charStart: number; charEnd: number } | null {
  const coord = parseId(span.id);
  if (!coord) return null;
  return { ...coord, charEnd: coord.charStart + (span.textContent?.length ?? 0) };
}

/** Find the word span element closest to an event target */
export function findWordSpan(target: HTMLElement, chapterNum: number): HTMLElement | null {
  return target.closest(`[id^="w-${chapterNum}-"]`) as HTMLElement | null;
}
