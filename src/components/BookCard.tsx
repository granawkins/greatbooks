import Link from "next/link";
import Image from "next/image";
import type { BookRow } from "@/lib/db";
import { getCoverSmUrl } from "@/lib/assets";
import ProgressLine from "@/components/ProgressLine";

type BookCardProps = {
  book: BookRow;
  progress?: { chapter_number: number; audio_position_ms: number } | null;
  stats?: { chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number } | null;
  courseInfo?: { courseId: string; courseTitle: string } | null;
};

export default function BookCard({ book, progress, stats, courseInfo }: BookCardProps) {
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
      <div style={{ paddingTop: "0.5rem", color: "var(--color-text-secondary)" }}>
        <ProgressLine
          totalChars={stats?.total_chars ?? 0}
          totalDurationMs={stats?.total_duration_ms ?? null}
          chapterCount={stats?.chapter_count ?? 0}
          progressChapter={progress?.chapter_number}
        />
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
