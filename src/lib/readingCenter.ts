/**
 * Shared helper: compute the vertical center of the visible reading area,
 * accounting for the fixed top bar and player bar.
 *
 * Also provides scrollToCenter() — a replacement for scrollIntoView({ block: "center" })
 * that respects the same insets.
 */

/** Returns the Y coordinate (in viewport pixels) of the visible reading center. */
export function getReadingCenterY(isTextMode: boolean): number {
  const topInset = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--topbar-height") || "52"
  );
  const bottomInset = isTextMode
    ? 0
    : parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--player-height") || "172"
      );
  return topInset + (window.innerHeight - topInset - bottomInset) / 2;
}

/**
 * Scroll an element to the visible reading center.
 * Drop-in replacement for el.scrollIntoView({ block: "center" }).
 */
export function scrollToCenter(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
  isTextMode = false,
): void {
  const rect = el.getBoundingClientRect();
  const elCenter = rect.top + rect.height / 2;
  const targetY = getReadingCenterY(isTextMode);
  window.scrollBy({ top: elCenter - targetY, behavior });
}
