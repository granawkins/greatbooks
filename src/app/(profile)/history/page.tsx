"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useBookDetailsModal } from "@/lib/BookDetailsModalContext";
import BookCover from "@/components/BookCover";

type HistoryItem = {
  book_id: string;
  title: string;
  author: string;
  type: string;
  chapter_number: number;
  audio_position_ms: number;
  updated_at: string;
  stats: {
    total_chars: number;
    total_duration_ms: number | null;
    chapter_count: number;
  } | null;
  course?: { id: string; title: string };
};

const sectionHeadingStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 400,
  color: "var(--color-text)",
  marginBottom: "1rem",
} as const;

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const { openBookDetails } = useBookDetailsModal();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/user/history", { credentials: "include" })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {});
  }, [user?.email]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <h1 style={sectionHeadingStyle}>History</h1>

      {loading ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Loading...
        </p>
      ) : !user?.email ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Sign in to see your reading history.
        </p>
      ) : history.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          No history yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-6">
          {history.map((item) => (
            <div
              key={item.course ? `${item.course.id}-${item.book_id}` : item.book_id}
              onClick={() => openBookDetails(item.course?.id ?? item.book_id)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <BookCover
                bookId={item.book_id}
                title={item.title}
                stats={item.stats}
                progress={{ chapter_number: item.chapter_number }}
              />
              {item.course && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "var(--radius)",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.6875rem",
                      color: "var(--color-text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "90%",
                    }}
                  >
                    {item.course.title}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
