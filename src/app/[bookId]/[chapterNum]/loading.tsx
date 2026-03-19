export default function ChapterLoading() {
  return (
    <article
      className="mx-auto animate-pulse"
      style={{
        maxWidth: "var(--content-max-width)",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
      }}
    >
      {/* Chapter title skeleton */}
      <div style={{ textAlign: "center", paddingTop: "2.5rem", paddingBottom: "2rem" }}>
        <div
          className="mx-auto rounded"
          style={{
            width: "10rem",
            height: "1.75rem",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        />
      </div>

      {/* Paragraph-shaped blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {/* Paragraph 1 — 4 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[100, 97, 95, 60].map((w, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: `${w}%`,
                height: "1rem",
                backgroundColor: "var(--color-bg-secondary)",
              }}
            />
          ))}
        </div>

        {/* Paragraph 2 — 5 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[100, 98, 100, 93, 45].map((w, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: `${w}%`,
                height: "1rem",
                backgroundColor: "var(--color-bg-secondary)",
              }}
            />
          ))}
        </div>

        {/* Paragraph 3 — 3 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[100, 96, 70].map((w, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: `${w}%`,
                height: "1rem",
                backgroundColor: "var(--color-bg-secondary)",
              }}
            />
          ))}
        </div>

        {/* Paragraph 4 — 5 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[100, 99, 100, 95, 55].map((w, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: `${w}%`,
                height: "1rem",
                backgroundColor: "var(--color-bg-secondary)",
                opacity: 1 - i * 0.05,
              }}
            />
          ))}
        </div>

        {/* Paragraph 5 — 4 lines, fading out */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[100, 97, 92, 50].map((w, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: `${w}%`,
                height: "1rem",
                backgroundColor: "var(--color-bg-secondary)",
                opacity: 0.7 - i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
