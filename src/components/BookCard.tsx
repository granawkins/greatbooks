import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import { getCoverSmUrl } from "@/lib/assets";

type BookCardProps = {
  book: BookRow;
  progress?: { chapter_number: number; audio_position_ms: number } | null;
  stats?: { chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number } | null;
  courseInfo?: { courseId: string; courseTitle: string } | null;
};

const CHARS_PER_PAGE = 1500;

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function HeadphonesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      <path d="M2 10V8a6 6 0 1 1 12 0v2" />
      <rect x="1" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function BookCard({ book, progress, stats, courseInfo }: BookCardProps) {
  const chapterCount = stats?.chapter_count ?? 0;
  const totalDuration = stats?.total_duration_ms ?? null;
  const totalChars = stats?.total_chars ?? 0;

  const totalPages = Math.max(1, Math.round(totalChars / CHARS_PER_PAGE));

  // Progress fraction (simple: chapter-based)
  const progressFraction = progress && chapterCount > 0
    ? (progress.chapter_number - 1) / chapterCount
    : null;

  const inProgress = progress && chapterCount > 0;
  const remainingFraction = inProgress ? 1 - (progress.chapter_number - 1) / chapterCount : 1;

  const displayPages = inProgress ? Math.max(1, Math.round(totalPages * remainingFraction)) : totalPages;
  const displayDuration = totalDuration
    ? (inProgress ? Math.round(totalDuration * remainingFraction) : totalDuration)
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
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-ui)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            flexWrap: "wrap",
          }}
        >
          {inProgress && (
            <span style={{ fontStyle: "italic", opacity: 0.7 }}>Remaining</span>
          )}
          <span>{displayPages} pages</span>
          {displayDuration != null && displayDuration > 0 && (
            <>
              <HeadphonesIcon />
              <span>{formatDuration(displayDuration)}</span>
            </>
          )}
        </p>
        {inProgress && (
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
        )}
        {courseInfo && (
          <p
            style={{
              fontSize: "0.65rem",
              color: "var(--color-accent)",
              fontFamily: "var(--font-ui)",
              marginTop: "2px",
            }}
          >
            In: {courseInfo.courseTitle}
          </p>
        )}
      </div>
    </Link>
  );
}
