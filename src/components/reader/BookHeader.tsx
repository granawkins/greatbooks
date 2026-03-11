"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useTopBar } from "@/lib/TopBarContext";
import { getCoverLgUrl } from "@/lib/assets";
import type { BookMeta, NavChapter } from "./types";

function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("classics.mit.edu")) return "Internet Classics Archive";
    if (host.includes("gutenberg.org")) return "Project Gutenberg";
    if (host.includes("perseus.tufts.edu")) return "Perseus Digital Library";
    return host;
  } catch {
    return "Source";
  }
}

export function BookHeader({
  bookId,
  bookMeta,
  chapters,
  activeChapterId,
  onChapterSelect,
}: {
  bookId: string;
  bookMeta: BookMeta | null;
  chapters: NavChapter[];
  activeChapterId: number;
  onChapterSelect: (id: number) => void;
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { setBookNav, updateActiveChapter, clearBookNav, setScrolled } = useTopBar();

  // Register book nav with TopBar on mount, clear on unmount
  useEffect(() => {
    if (!bookMeta) return;
    setBookNav({
      title: bookMeta.title,
      chapters,
      activeChapterId,
      onChapterSelect,
    });
    return () => clearBookNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookMeta, chapters, onChapterSelect, setBookNav, clearBookNav]);

  // Update active chapter in TopBar without re-registering
  useEffect(() => {
    updateActiveChapter(activeChapterId);
  }, [activeChapterId, updateActiveChapter]);

  // Track scroll state via IntersectionObserver on hero
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [setScrolled]);

  if (!bookMeta) return <div ref={heroRef} style={{ minHeight: 1 }} />;

  const lineStyle = {
    fontFamily: "var(--font-body)",
    fontSize: "1.125rem",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.85,
  } as const;

  return (
    <div ref={heroRef} style={{ minHeight: 1 }}>
      <div
        style={{
          paddingTop: "2rem",
          paddingBottom: "2rem",
        }}
      >
        {/* Full-resolution cover image */}
        <div
          style={{
            width: "100%",
            aspectRatio: "3 / 4",
            position: "relative",
            borderRadius: "3px",
            overflow: "hidden",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.12), 1px 2px 4px rgba(0,0,0,0.08)",
            marginBottom: "1.5rem",
          }}
        >
          <Image
            src={getCoverLgUrl(bookId)}
            alt={`${bookMeta.title} cover`}
            fill
            sizes="(max-width: 68ch) 100vw, 68ch"
            className="object-cover"
            priority
          />
        </div>

        {/* Metadata lines */}
        <div style={{ textAlign: "center" }}>
          {bookMeta.author && (
            <p style={lineStyle}>by {bookMeta.author}</p>
          )}
          {bookMeta.original_date && (
            <p style={lineStyle}>{bookMeta.original_date}</p>
          )}
          {bookMeta.translator && (
            <p style={lineStyle}>
              Translated by {bookMeta.translator}
              {bookMeta.translation_date ? ` in ${bookMeta.translation_date}` : ""}
            </p>
          )}
          {bookMeta.source_url && (
            <p style={lineStyle}>
              <a
                href={bookMeta.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-text-secondary)" }}
                className="hover:underline"
              >
                Source: {sourceName(bookMeta.source_url)}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
