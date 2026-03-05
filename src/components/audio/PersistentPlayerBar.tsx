"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import AudioPlayer from "./AudioPlayer";

export default function PersistentPlayerBar() {
  const { session } = useAudioPlayer();
  if (!session) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: "var(--color-bg)",
        borderTop: "1px solid var(--color-border)",
        padding: "8px 24px 16px",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "28rem" }}>
        <AudioPlayer />
      </div>
    </div>
  );
}
