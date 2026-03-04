"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import AudioPlayer from "@/components/AudioPlayer";

export default function PersistentPlayerBar() {
  const { session } = useAudioPlayer();

  if (!session) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div className="mx-auto px-6 py-4" style={{ maxWidth: "68ch" }}>
        <AudioPlayer />
      </div>
    </div>
  );
}
