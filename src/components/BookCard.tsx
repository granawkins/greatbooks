import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import { getCoverSmUrl } from "@/lib/assets";

type BookCardProps = {
  book: BookRow;
  progress?: { chapter_number: number; audio_position_ms: number } | null;
  stats?: { chapter_count: number; total_duration_ms: number | null } | null;
};

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function BookCard({ book, progress, stats }: BookCardProps) {
  const chapterCount = stats?.chapter_count ?? 0;
  const totalDuration = stats?.total_duration_ms ?? null;

  // Progress fraction (simple: chapter-based)
  const progressFraction = progress && chapterCount > 0
    ? (progress.chapter_number - 1) / chapterCount
    : null;

  return (
    <Link href={`/${book.id}`} className="block group">
      {/* Book cover with shadow */}
      <div
        className="relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]"
        style={{
          aspectRatio: "3 / 4",
          borderRadius: "3px",
          boxShadow:
            "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08), inset -1px 0 2px rgba(0,0,0,0.04)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        <Image
          src={getCoverSmUrl(book.id)}
          alt={`${book.title} cover`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
        />
      </div>

      {/* Info below cover */}
      <div style={{ paddingTop: "0.5rem" }}>
        {progress && chapterCount > 0 ? (
          <>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Ch. {progress.chapter_number} of {chapterCount}
            </p>
            {/* Progress bar */}
            <div
              style={{
                marginTop: "4px",
                height: "2px",
                backgroundColor: "var(--color-border)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max((progressFraction ?? 0) * 100, 2)}%`,
                  backgroundColor: "var(--color-accent)",
                  borderRadius: "1px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {totalDuration
              ? `${chapterCount} ch · ${formatDuration(totalDuration)}`
              : `${chapterCount} chapter${chapterCount !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>
    </Link>
  );
}
