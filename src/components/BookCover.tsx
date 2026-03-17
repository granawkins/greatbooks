import Image from "next/image";
import { getCoverSmUrl } from "@/lib/assets";

const CHARS_PER_PAGE = 1500;

function PagesIcon() {
  return (
    <svg width="0.85em" height="0.85em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-0.05em" }}>
      <rect x="4" y="1" width="9" height="12" rx="1" />
      <rect x="3" y="3" width="9" height="12" rx="1" fill="var(--color-bg, #fff)" />
      <rect x="3" y="3" width="9" height="12" rx="1" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="0.85em" height="0.85em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-0.05em" }}>
      <path d="M2 10V8a6 6 0 1 1 12 0v2" />
      <rect x="1" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatHours(ms: number): string {
  const hours = Math.round(ms / 3600000);
  return hours < 1 ? "<1h" : `${hours}h`;
}

export type BookCoverProps = {
  bookId: string;
  title?: string;
  stats?: {
    total_chars: number;
    total_duration_ms: number | null;
    chapter_count: number;
  } | null;
  progress?: {
    chapter_number: number;
  } | null;
};

export default function BookCover({ bookId, title, stats, progress }: BookCoverProps) {
  const totalPages = stats ? Math.max(1, Math.round(stats.total_chars / CHARS_PER_PAGE)) : 0;
  const hasDuration = stats?.total_duration_ms != null && stats.total_duration_ms > 0;
  const chapterCount = stats?.chapter_count ?? 0;

  const inProgress = progress != null && chapterCount > 0;
  const remainingFraction = inProgress ? 1 - (progress.chapter_number - 1) / chapterCount : 1;
  const progressFraction = inProgress ? (progress.chapter_number - 1) / chapterCount : 0;

  const displayPages = inProgress ? Math.max(1, Math.round(totalPages * remainingFraction)) : totalPages;
  const displayDuration = stats?.total_duration_ms
    ? (inProgress ? Math.round(stats.total_duration_ms * remainingFraction) : stats.total_duration_ms)
    : null;
  const hasDisplayDuration = displayDuration != null && displayDuration > 0;

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: "3 / 4",
          borderRadius: "3px",
          boxShadow:
            "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08), inset -1px 0 2px rgba(0,0,0,0.04)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        <Image
          src={getCoverSmUrl(bookId)}
          alt={title ? `${title} cover` : ""}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      {stats && (
        <div
          style={{
            textAlign: "center",
            marginTop: "0.375rem",
            color: "var(--color-text-secondary)",
          }}
        >
          {inProgress ? (
            <>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.75rem",
                }}
              >
                {displayPages} pages{hasDisplayDuration ? ` (${formatHours(displayDuration)})` : ""} left
              </span>
              <div
                style={{
                  margin: "4px auto 0",
                  height: "2px",
                  width: "100%",
                  backgroundColor: "var(--color-border)",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(progressFraction * 100, 2)}%`,
                    backgroundColor: "var(--color-accent)",
                    borderRadius: "1px",
                  }}
                />
              </div>
            </>
          ) : (
            totalPages > 0 && (
              <p
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-ui)",
                  margin: 0,
                }}
              >
                <PagesIcon />{totalPages}{hasDuration && <>{" \u00a0 "}<HeadphonesIcon />{formatHours(stats.total_duration_ms!)}</>}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
