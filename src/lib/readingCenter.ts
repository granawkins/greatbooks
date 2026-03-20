/**
 * Shared helper: compute the vertical center of the visible reading area,
 * accounting for the fixed top bar and player bar.
 *
 * Also provides scrollToCenter() — a replacement for scrollIntoView({ block: "center" })
 * that respects the same insets.
 */

/** Returns the viewport height, preferring visualViewport on mobile. */
function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getInsetVar(name: "--topbar-height" | "--player-height", fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const parsed = parseFloat(raw || String(fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Returns the Y coordinate (in viewport pixels) of the visible reading center. */
export function getReadingCenterY(isTextMode: boolean): number {
  const topInset = getInsetVar("--topbar-height", 52);
  const bottomInset = isTextMode ? 0 : getInsetVar("--player-height", 172);
  return topInset + (getViewportHeight() - topInset - bottomInset) / 2;
}

/**
 * Scroll an element so its top portion is at the reading center.
 * For short elements, this centers them; for tall elements,
 * it ensures the start of the element (where the user reads) stays visible.
 */
export function scrollToCenter(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
  isTextMode = false,
): void {
  const rect = el.getBoundingClientRect();
  // Target the top of the element (with a small offset into it) rather than
  // the vertical center — this keeps the start of new paragraphs visible
  // even for tall elements.
  const elTarget = rect.top + Math.min(rect.height / 2, 40);
  const targetY = getReadingCenterY(isTextMode);
  window.scrollBy({ top: elTarget - targetY, behavior });
}
