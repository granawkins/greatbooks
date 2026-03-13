"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import AudioPlayer from "./AudioPlayer";
import { CloseIcon } from "./icons";

export default function PersistentPlayerBar() {
  const { session, dismiss } = useAudioPlayer();
  const pathname = usePathname();
  if (!session) return null;

  const sessionPath = `/${session.bookId}/${session.chapterId}`;
  const isOnSessionPage = pathname === sessionPath;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: "var(--color-surface)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--color-border)",
        padding: "8px 24px 16px",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "28rem" }}>
        {!isOnSessionPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <Link
              href={sessionPath}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
              className="hover:text-[var(--color-text)]"
            >
              {session.bookTitle}
              <span style={{ margin: "0 6px", opacity: 0.5 }}>|</span>
              {session.chapterTitle}
            </Link>
            <button
              aria-label="Close player"
              onClick={dismiss}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                borderRadius: 4,
                marginLeft: 8,
              }}
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <AudioPlayer />
      </div>
    </div>
  );
}
