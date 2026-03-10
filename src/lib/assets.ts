const GCS_BUCKET = "greatbooks-assets";
const GCS_BASE = `https://storage.googleapis.com/${GCS_BUCKET}`;

/**
 * Convert a DB cover_image path (e.g. "/covers/homer-iliad.jpg")
 * to a full GCS public URL.
 */
export function getCoverUrl(dbPath: string): string {
  const gcsPath = dbPath.replace(/^\//, "");
  return `${GCS_BASE}/${gcsPath}`;
}
