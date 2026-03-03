"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import IconButton from "./IconButton";

type AudioPlayerProps = {
  src: string | null;
  durationMs: number | null;
  initialPositionMs?: number;
  onTimeUpdate?: (timeMs: number) => void;
  onPause?: (timeMs: number) => void;
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({
  src,
  durationMs,
  initialPositionMs,
  onTimeUpdate,
  onPause,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x
  const duration = durationMs ?? 0;

  // Poll currentTime via rAF for smooth, high-frequency updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let rafId: number;
    const tick = () => {
      if (!audio.paused) {
        const ms = Math.floor(audio.currentTime * 1000);
        setCurrentMs(ms);
        onTimeUpdate?.(ms);
      }
      rafId = requestAnimationFrame(tick);
    };

    const handleEnded = () => setPlaying(false);
    audio.addEventListener("ended", handleEnded);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate]);

  // Reset when src changes; seek to initial position if provided
  const seekedRef = useRef(false);
  useEffect(() => {
    setPlaying(false);
    setCurrentMs(0);
    seekedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [src]);

  // Seek to initial position once audio is ready
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !initialPositionMs || seekedRef.current) return;
    const handleCanPlay = () => {
      if (!seekedRef.current && initialPositionMs > 0) {
        audio.currentTime = initialPositionMs / 1000;
        setCurrentMs(initialPositionMs);
        seekedRef.current = true;
      }
    };
    audio.addEventListener("canplay", handleCanPlay);
    // If already ready
    if (audio.readyState >= 3) handleCanPlay();
    return () => audio.removeEventListener("canplay", handleCanPlay);
  }, [src, initialPositionMs]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      onPause?.(Math.floor(audio.currentTime * 1000));
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing, onPause]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ms = Math.floor(pct * duration);
    audio.currentTime = ms / 1000;
    setCurrentMs(ms);
    onTimeUpdate?.(ms);
  }, [duration, onTimeUpdate]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  }, [speedIdx]);

  const disabled = !src;
  const progress = duration > 0 ? (currentMs / duration) * 100 : 0;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {src && <audio ref={audioRef} src={src} preload="auto" />}

      <IconButton label={playing ? "Pause" : "Play"} disabled={disabled} onClick={togglePlay}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" />
            <rect x="9" y="2" width="4" height="12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </IconButton>

      <div className="flex-1">
        <div
          className="h-1.5 rounded-full overflow-hidden cursor-pointer"
          style={{ backgroundColor: "var(--color-bg-secondary)" }}
          onClick={seek}
        >
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: "var(--color-accent)",
              width: `${progress}%`,
            }}
          />
        </div>
        <div
          className="flex justify-between text-xs mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>{formatTime(currentMs)}</span>
          <span>{duration ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>

      <button
        className="text-xs px-2 py-1 rounded-[var(--radius)] transition-colors hover:opacity-80"
        style={{
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
        onClick={cycleSpeed}
        disabled={disabled}
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  );
}
