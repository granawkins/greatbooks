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

/** Reading center: 40% from top of viewport. */
export function getReadingCenterY(): number {
  return getViewportHeight() * 0.4;
}

/**
 * Scroll an element to the reading center (40% from top).
 */
export function scrollToCenter(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
): void {
  const rect = el.getBoundingClientRect();
  const elTarget = rect.top + Math.min(rect.height / 2, 40);
  window.scrollBy({ top: elTarget - getReadingCenterY(), behavior });
}

/** Is the element within the reading zone (20%–60% from top of viewport)?
 *  When it leaves this zone, we scroll to re-center it at 40%. */
export function isInReadingZone(el: HTMLElement): boolean {
  const vh = getViewportHeight();
  const rect = el.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  return mid >= vh * 0.2 && mid <= vh * 0.6;
}
