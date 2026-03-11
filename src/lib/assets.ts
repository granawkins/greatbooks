const GCS_BUCKET = "greatbooks-assets";
const GCS_BASE = `https://storage.googleapis.com/${GCS_BUCKET}`;

/** Thumbnail cover for grids (~34KB JPG) */
export function getCoverSmUrl(bookId: string): string {
  return `${GCS_BASE}/covers/${bookId}-sm.jpg`;
}

/** Full-resolution cover for book page (~1.7MB PNG) */
export function getCoverLgUrl(bookId: string): string {
  return `${GCS_BASE}/covers/${bookId}-lg.png`;
}
