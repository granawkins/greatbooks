"use client";

import { useAudioSession, useAudioView } from "@/lib/AudioPlayerContext";
import { ViewModeToggle, FontSizeControls } from "@/components/audio/PersistentPlayerBar";
import { ChatIcon } from "@/components/audio/icons";

export function FloatingControls({
  onResize,
  onChat,
}: {
  onResize?: () => HTMLElement | null;
  onChat?: () => void;
} = {}) {
  const { onChatClickRef } = useAudioSession();
  const { viewMode } = useAudioView();
  const isTextMode = viewMode === "text";
  const handleChat = onChat ?? (() => onChatClickRef.current?.());

  return (
    <div
      style={{
        position: "fixed",
        bottom: isTextMode ? 20 : 180,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "var(--content-max-width)",
        padding: "0 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        pointerEvents: "none",
        zIndex: 60,
        boxSizing: "border-box",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <FontSizeControls onResize={onResize} />
      </div>
      {isTextMode && (
        <div style={{ pointerEvents: "auto" }}>
          <button
            aria-label="Open chat"
            onClick={handleChat}
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              backgroundColor: "var(--color-surface)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              color: "var(--color-text)",
              padding: 0,
              transition: "background-color 0.15s",
            }}
          >
            <ChatIcon />
          </button>
        </div>
      )}
      <div style={{ pointerEvents: "auto" }}>
        <ViewModeToggle />
      </div>
    </div>
  );
}
