export default function BookLoading() {
  return (
    <article
      className="mx-auto animate-pulse"
      style={{
        maxWidth: "var(--content-max-width)",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
      }}
    >
      {/* Header skeleton */}
      <div style={{ textAlign: "center", paddingTop: "2.5rem", paddingBottom: "2rem" }}>
        <div
          className="mx-auto rounded"
          style={{
            width: "12rem",
            height: "2rem",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        />
        <div
          className="mx-auto rounded mt-3"
          style={{
            width: "18rem",
            height: "0.875rem",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        />
      </div>

      {/* Text skeleton — paragraph-shaped blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {[100, 85, 95, 70, 90, 80, 60].map((w, i) => (
          <div
            key={i}
            className="rounded"
            style={{
              width: `${w}%`,
              height: "1.1rem",
              backgroundColor: "var(--color-bg-secondary)",
              opacity: 1 - i * 0.1,
            }}
          />
        ))}
      </div>
    </article>
  );
}
