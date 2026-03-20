"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAudioSession } from "@/lib/AudioPlayerContext";

export default function PlaybackSpeedSync() {
  const { user, loading, updatePlaybackSpeed } = useAuth();
  const { playbackSpeedRef, persistSpeedRef } = useAudioSession();

  // Wire up the persist callback so speed changes auto-save to DB
  useEffect(() => {
    persistSpeedRef.current = (speed: number) => {
      updatePlaybackSpeed(speed);
    };
    return () => { persistSpeedRef.current = null; };
  }, [persistSpeedRef, updatePlaybackSpeed]);

  useEffect(() => {
    if (loading) return;
    if (playbackSpeedRef.current != null) return;
    // Hydrate from DB once, when we actually have an authenticated user.
    if (!user?.id) return;
    playbackSpeedRef.current = user.playback_speed;
  }, [loading, user, playbackSpeedRef]);

  return null;
}
