const CHARS_PER_PAGE = 2200;

function formatHours(ms: number): string {
  const hours = Math.round(ms / 3600000);
  return hours < 1 ? "<1h" : `${hours}h`;
}

export type ProgressLineProps = {
  totalChars: number;
  totalDurationMs: number | null;
  chapterCount: number;
  progressChapter?: number | null;
  barTrackColor?: string;
  barFillColor?: string;
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

  const hasDuration = displayDuration != null && displayDuration > 0;
  const label = `${displayPages} pages${hasDuration ? ` (${formatHours(displayDuration)})` : ""}${inProgress ? " left" : ""}`;

  return (
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.75rem",
          color: "inherit",
        }}
      >
        {label}
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
