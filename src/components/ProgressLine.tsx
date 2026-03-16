const CHARS_PER_PAGE = 1500;

function PagesIcon() {
  return (
    <svg width="0.7em" height="0.7em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}>
      <rect x="4" y="1" width="9" height="12" rx="1" />
      <rect x="3" y="3" width="9" height="12" rx="1" fill="var(--color-bg, #fff)" />
      <rect x="3" y="3" width="9" height="12" rx="1" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="0.7em" height="0.7em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}>
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

export type ProgressLineProps = {
  totalChars: number;
  totalDurationMs: number | null;
  chapterCount: number;
  progressChapter?: number | null;
  /** Bar color overrides for light-on-dark contexts */
  barTrackColor?: string;
  barFillColor?: string;
  /** Fixed bar width (e.g. "120px") */
  barWidth?: string;
};

export default function ProgressLine({
  totalChars,
  totalDurationMs,
  chapterCount,
  progressChapter,
  barTrackColor,
  barFillColor,
  barWidth,
}: ProgressLineProps) {
  const totalPages = Math.max(1, Math.round(totalChars / CHARS_PER_PAGE));
  const inProgress = progressChapter != null && chapterCount > 0;
  const remainingFraction = inProgress ? 1 - (progressChapter - 1) / chapterCount : 1;
  const progressFraction = inProgress ? (progressChapter - 1) / chapterCount : 0;

  const displayPages = inProgress ? Math.max(1, Math.round(totalPages * remainingFraction)) : totalPages;
  const displayDuration = totalDurationMs
    ? (inProgress ? Math.round(totalDurationMs * remainingFraction) : totalDurationMs)
    : null;

  return (
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          color: "inherit",
        }}
      >
        <PagesIcon />{displayPages}{displayDuration != null && displayDuration > 0 && <>{" "}<HeadphonesIcon />{formatHours(displayDuration)}</>}{inProgress && " left"}
      </span>
      {inProgress && (
        <div
          style={{
            margin: "4px auto 0",
            height: "2px",
            width: barWidth ?? "100%",
            backgroundColor: barTrackColor ?? "var(--color-border)",
            borderRadius: "1px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(progressFraction * 100, 2)}%`,
              backgroundColor: barFillColor ?? "var(--color-accent)",
              borderRadius: "1px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}
