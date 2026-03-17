"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";

export default function PlaybackSpeedSync() {
  const { user, loading } = useAuth();
  const { playbackSpeedRef } = useAudioPlayer();
  const initialized = useRef(false);

  useEffect(() => {
    if (loading || initialized.current) return;
    const speed = user?.playback_speed ?? 1;
    playbackSpeedRef.current = speed;
    initialized.current = true;
  }, [loading, user, playbackSpeedRef]);

  return null;
}
