"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAudioSession } from "@/lib/AudioPlayerContext";

export default function PlaybackSpeedSync() {
  const { user, loading, updatePlaybackSpeed } = useAuth();
  const { playbackSpeedRef, persistSpeedRef } = useAudioSession();
  const initialized = useRef(false);

  // Wire up the persist callback so speed changes auto-save to DB
  useEffect(() => {
    persistSpeedRef.current = (speed: number) => {
      updatePlaybackSpeed(speed);
    };
    return () => { persistSpeedRef.current = null; };
  }, [persistSpeedRef, updatePlaybackSpeed]);

  useEffect(() => {
    if (loading || initialized.current) return;
    const speed = user?.playback_speed ?? 1;
    playbackSpeedRef.current = speed;
    initialized.current = true;
  }, [loading, user, playbackSpeedRef]);

  return null;
}
