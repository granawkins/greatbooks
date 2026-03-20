"use client";

import { useAudioSession, useAudioView } from "@/lib/AudioPlayerContext";
import { ChatIcon } from "@/components/audio/icons";

export function FloatingControls({
  onChat,
}: {
  onChat?: () => void;
} = {}) {
  const { onChatClickRef } = useAudioSession();
  const { viewMode } = useAudioView();
  const isTextMode = viewMode === "text";
  const handleChat = onChat ?? (() => onChatClickRef.current?.());

  if (!isTextMode) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 0,
        left: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "var(--content-max-width)",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "flex-end",
          boxSizing: "border-box",
        }}
      >
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
              backgroundColor: "var(--color-accent)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
              color: "#fff",
              padding: 0,
              transition: "opacity 0.15s",
            }}
          >
            <ChatIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
