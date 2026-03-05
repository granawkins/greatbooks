"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { ChapterListIcon, CloseIcon } from "./icons";

export function ChapterSelector({ isOnBookPage }: { isOnBookPage: boolean }) {
  const { session, dismiss, onChapterSelectRef } = useAudioPlayer();
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [chapterList, setChapterList] = useState<{ number: number; title: string }[]>([]);
  const chapterListRef = useRef<HTMLDivElement>(null);

  // Fetch chapter list when dropdown opens
  useEffect(() => {
    if (!chapterListOpen || !session) return;
    fetch(`/api/books/${session.bookId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.chapters) setChapterList(data.chapters);
      })
      .catch(() => {});
  }, [chapterListOpen, session?.bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!chapterListOpen) return;
    const handler = (e: MouseEvent) => {
      if (chapterListRef.current && !chapterListRef.current.contains(e.target as Node)) {
        setChapterListOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [chapterListOpen]);

  if (!session) return null;

  return (
    <div
      ref={chapterListRef}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        position: "relative",
      }}
    >
      <button
        aria-label="Select chapter"
        onClick={() => setChapterListOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--color-text-secondary)",
          borderRadius: "var(--radius)",
          flexShrink: 0,
          marginRight: 8,
          padding: 0,
        }}
        className="hover:opacity-60"
      >
        <ChapterListIcon />
      </button>

      {isOnBookPage ? (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.8125rem",
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {session.bookTitle} | {session.chapterTitle}
        </span>
      ) : (
        <Link
          href={`/${session.bookId}`}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.8125rem",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
          className="hover:underline"
        >
          {session.bookTitle} | {session.chapterTitle}
        </Link>
      )}
      {!isOnBookPage && (
        <button
          aria-label="Close player"
          onClick={dismiss}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            borderRadius: "var(--radius)",
            flexShrink: 0,
            marginLeft: 8,
          }}
          className="hover:opacity-60"
        >
          <CloseIcon />
        </button>
      )}

      {chapterListOpen && chapterList.length > 0 && (
        <div
          className="overflow-auto"
          style={{
            position: "absolute",
            left: 0,
            bottom: "100%",
            marginBottom: 8,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
            maxHeight: "50vh",
            minWidth: "22rem",
            zIndex: 60,
          }}
        >
          {chapterList.map((ch, i) => {
            const isActive = ch.number === session.chapterId;
            return (
              <button
                key={ch.number}
                onClick={() => {
                  setChapterListOpen(false);
                  onChapterSelectRef.current?.(ch.number);
                }}
                className="flex items-baseline gap-4 w-full text-left px-5 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
                style={{
                  backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                  borderBottom: i < chapterList.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span
                  className="text-xs tabular-nums shrink-0"
                  style={{
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                    opacity: 0.5,
                    minWidth: "1.5rem",
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {ch.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
