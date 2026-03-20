"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAudioSession } from "@/lib/AudioPlayerContext";

export default function PlaybackSpeedSync() {
  const { user, loading, updatePlaybackSpeed } = useAuth();
  const { playbackSpeedRef, persistSpeedRef, audioRef } = useAudioSession();
  const initialized = useRef(false);

  // Wire up the persist callback so speed changes auto-save to DB
  useEffect(() => {
    persistSpeedRef.current = (speed: number) => {
      updatePlaybackSpeed(speed);
    };
    return () => { persistSpeedRef.current = null; };
  }, [persistSpeedRef, updatePlaybackSpeed]);

  // Sync speed from auth — also apply to audio element in case it loaded before auth
  useEffect(() => {
    if (loading || initialized.current) return;
    const speed = user?.playback_speed ?? 1;
    playbackSpeedRef.current = speed;
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    initialized.current = true;
  }, [loading, user, playbackSpeedRef, audioRef]);

  return null;
}
