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

function buildStatsLine(
  totalPages: number,
  totalDuration: number | null,
  discussionCount: number,
  isCourse: boolean,
  remaining: boolean,
): string {
  const parts: string[] = [];

  // Pages with optional duration in parens
  if (totalDuration) {
    parts.push(`${totalPages} pages (${formatDuration(totalDuration)})`);
  } else {
    parts.push(`${totalPages} pages`);
  }

  // Discussion sessions for courses
  if (isCourse && discussionCount > 0) {
    parts.push(`${discussionCount} session${discussionCount !== 1 ? "s" : ""}`);
  }

  const line = parts.join(", ");
  return remaining ? `Remaining: ${line}` : line;
}

export default function BookCard({ book, progress, stats, courseInfo }: BookCardProps) {
  const chapterCount = stats?.chapter_count ?? 0;
  const totalDuration = stats?.total_duration_ms ?? null;
  const totalChars = stats?.total_chars ?? 0;
  const discussionCount = stats?.discussion_count ?? 0;
  const isCourse = book.type === "course";

  const totalPages = Math.max(1, Math.round(totalChars / CHARS_PER_PAGE));

  // Progress fraction (simple: chapter-based)
  const progressFraction = progress && chapterCount > 0
    ? (progress.chapter_number - 1) / chapterCount
    : null;

  const inProgress = progress && chapterCount > 0;
  const remainingFraction = inProgress ? 1 - (progress.chapter_number - 1) / chapterCount : 1;

  const remainingPages = Math.max(1, Math.round(totalPages * remainingFraction));
  const remainingDuration = totalDuration ? Math.round(totalDuration * remainingFraction) : null;
  const remainingDiscussions = isCourse ? Math.max(0, Math.round(discussionCount * remainingFraction)) : 0;

  const statsLine = inProgress
    ? buildStatsLine(remainingPages, remainingDuration, remainingDiscussions, isCourse, true)
    : buildStatsLine(totalPages, totalDuration, discussionCount, isCourse, false);

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
          }}
        >
          {statsLine}
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
