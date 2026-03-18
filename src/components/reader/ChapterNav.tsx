import Link from "next/link";

export function ChapterNav({
  bookId,
  prevChapter,
  nextChapter,
}: {
  bookId: string;
  prevChapter: { num: number; title: string } | null;
  nextChapter: { num: number; title: string } | null;
}) {
  if (!prevChapter && !nextChapter) return null;

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 0",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        margin: "1.5rem 0",
        fontFamily: "var(--font-ui)",
        fontSize: "0.8125rem",
        color: "var(--color-text-secondary)",
      }}
    >
      {prevChapter ? (
        <Link
          href={`/${bookId}/${prevChapter.num}?scroll=bottom`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            textDecoration: "none",
            color: "var(--color-text-secondary)",
            transition: "color 0.15s",
            minWidth: 0,
          }}
          className="hover:text-[var(--color-text)]"
        >
          <span style={{ flexShrink: 0, fontSize: "0.75rem" }}>&larr;</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prevChapter.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {nextChapter ? (
        <Link
          href={`/${bookId}/${nextChapter.num}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            textDecoration: "none",
            color: "var(--color-text-secondary)",
            transition: "color 0.15s",
            minWidth: 0,
            marginLeft: "auto",
          }}
          className="hover:text-[var(--color-text)]"
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextChapter.title}
          </span>
          <span style={{ flexShrink: 0, fontSize: "0.75rem" }}>&rarr;</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
