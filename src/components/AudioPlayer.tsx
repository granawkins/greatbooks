"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export type SegmentBoundary = { start_ms: number; end_ms: number };

type AudioPlayerProps = {
  src: string | null;
  durationMs: number | null;
  initialPositionMs?: number;
  segmentBoundaries?: SegmentBoundary[];
  onTimeUpdate?: (timeMs: number) => void;
  onPause?: (timeMs: number) => void;
  onChatClick?: () => void;
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── Icons ────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 4.5l11 5.5-11 5.5V4.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="4" y="3.5" width="4" height="13" rx="1" />
      <rect x="12" y="3.5" width="4" height="13" rx="1" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M7.5 2L1 8l6.5 6V2z" />
      <path d="M15 2L8.5 8l6.5 6V2z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M1 2l6.5 6L1 14V2z" />
      <path d="M8.5 2l6.5 6-6.5 6V2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 3.5A1 1 0 0 1 3 2.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-4 4V3.5z" />
    </svg>
  );
}

// ── Small control button ──────────────────────────────────────────────────────

function CtrlBtn({
  label,
  disabled = false,
  onClick,
  children,
  accent = false,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 52,
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "none",
        cursor: disabled ? "default" : "pointer",
        borderRadius: "var(--radius)",
        color: disabled
          ? "var(--color-border)"
          : hovered
          ? accent
            ? "var(--color-accent)"
            : "var(--color-text)"
          : "var(--color-text-secondary)",
        opacity: disabled ? 0.35 : 1,
        transition: "color 0.13s",
        padding: 0,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AudioPlayer({
  src,
  durationMs,
  initialPositionMs,
  segmentBoundaries = [],
  onTimeUpdate,
  onPause,
  onChatClick,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false); // triggers re-render for knob
  const [trackHovered, setTrackHovered] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [speedHovered, setSpeedHovered] = useState(false);

  const duration = durationMs ?? 0;
  const progress = duration > 0 ? currentMs / duration : 0;
  const disabled = !src;

  // rAF loop for smooth position updates
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

  // Reset on src change
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

  // Restore initial position
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
    if (audio.readyState >= 3) handleCanPlay();
    return () => audio.removeEventListener("canplay", handleCanPlay);
  }, [src, initialPositionMs]);

  // ── Playback ──────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      onPause?.(Math.floor(audio.currentTime * 1000));
    } else {
      audio.play();
    }
    setPlaying((p) => !p);
  }, [playing, onPause]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }, [speedIdx]);

  // ── Seek ──────────────────────────────────────────────────────────────────

  const applySeek = useCallback(
    (clientX: number) => {
      const audio = audioRef.current;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!audio || !rect || !duration) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ms = Math.floor(pct * duration);
      audio.currentTime = ms / 1000;
      setCurrentMs(ms);
      onTimeUpdate?.(ms);
    },
    [duration, onTimeUpdate]
  );

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setIsDragging(true);
      applySeek(e.clientX);
    },
    [applySeek]
  );

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      applySeek(e.clientX);
    },
    [applySeek]
  );

  const handleTrackPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      draggingRef.current = false;
      setIsDragging(false);
    },
    []
  );

  // ── Sentence jump ─────────────────────────────────────────────────────────

  const jumpBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Math.floor(audio.currentTime * 1000);
    let targetMs = 0;
    if (segmentBoundaries.length) {
      const THRESHOLD = 1500;
      for (let i = segmentBoundaries.length - 1; i >= 0; i--) {
        if (segmentBoundaries[i].start_ms < ms - THRESHOLD) {
          targetMs = segmentBoundaries[i].start_ms;
          break;
        }
      }
    } else {
      targetMs = Math.max(0, ms - 5000);
    }
    audio.currentTime = targetMs / 1000;
    setCurrentMs(targetMs);
    onTimeUpdate?.(targetMs);
  }, [segmentBoundaries, onTimeUpdate]);

  const jumpForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Math.floor(audio.currentTime * 1000);
    let targetMs = duration;
    if (segmentBoundaries.length) {
      for (const seg of segmentBoundaries) {
        if (seg.start_ms > ms + 100) {
          targetMs = seg.start_ms;
          break;
        }
      }
    } else {
      targetMs = Math.min(duration, ms + 5000);
    }
    audio.currentTime = targetMs / 1000;
    setCurrentMs(targetMs);
    onTimeUpdate?.(targetMs);
  }, [segmentBoundaries, duration, onTimeUpdate]);

  // ── Layout constants ──────────────────────────────────────────────────────

  const knobSize = isDragging || trackHovered ? 16 : 11;
  const knobOpacity = disabled ? 0 : isDragging || trackHovered ? 1 : 0.55;
  const speedLabel = SPEEDS[speedIdx] === 1 ? "1×" : `${SPEEDS[speedIdx]}×`;

  return (
    <div style={{ width: "100%" }}>
      {src && <audio ref={audioRef} src={src} preload="auto" />}

      {/* ── Scrubber ─────────────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentMs}
        style={{
          position: "relative",
          height: 28,
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "default" : "pointer",
          touchAction: "none",
          userSelect: "none",
        }}
        onMouseEnter={() => setTrackHovered(true)}
        onMouseLeave={() => setTrackHovered(false)}
        onPointerDown={disabled ? undefined : handleTrackPointerDown}
        onPointerMove={disabled ? undefined : handleTrackPointerMove}
        onPointerUp={disabled ? undefined : handleTrackPointerUp}
      >
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 3,
            backgroundColor: "var(--color-border)",
          }}
        />
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${progress * 100}%`,
            height: 3,
            borderRadius: 3,
            backgroundColor: disabled ? "var(--color-border)" : "var(--color-accent)",
          }}
        />
        {/* Knob */}
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: knobSize,
            height: knobSize,
            borderRadius: "50%",
            backgroundColor: "var(--color-accent)",
            opacity: knobOpacity,
            transition: "width 0.15s, height 0.15s, opacity 0.15s",
            boxShadow: "0 0 0 3px rgba(37,99,235,0.18)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Timestamps ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          marginTop: 3,
          lineHeight: 1.6,
        }}
      >
        <span>{formatTime(currentMs)}</span>
        <span>{duration ? formatTime(duration) : "--:--"}</span>
      </div>

      {/* ── Controls row ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        {/* Speed */}
        <button
          aria-label="Playback speed"
          disabled={disabled}
          onClick={cycleSpeed}
          onMouseEnter={() => setSpeedHovered(true)}
          onMouseLeave={() => setSpeedHovered(false)}
          style={{
            width: 52,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "none",
            cursor: disabled ? "default" : "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: disabled
              ? "var(--color-border)"
              : speedHovered
              ? "var(--color-text)"
              : "var(--color-text-secondary)",
            opacity: disabled ? 0.35 : 1,
            transition: "color 0.13s",
            padding: 0,
          }}
        >
          {speedLabel}
        </button>

        {/* Skip back */}
        <CtrlBtn label="Previous sentence" disabled={disabled} onClick={jumpBack}>
          <SkipBackIcon />
        </CtrlBtn>

        {/* Play / Pause — center hero */}
        <button
          aria-label={playing ? "Pause" : "Play"}
          disabled={disabled}
          onClick={togglePlay}
          onMouseEnter={() => setPlayHovered(true)}
          onMouseLeave={() => setPlayHovered(false)}
          style={{
            width: 84,
            height: 84,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "50%",
            cursor: disabled ? "default" : "pointer",
            backgroundColor: playHovered && !disabled ? "var(--color-bg-secondary)" : "transparent",
            color: disabled ? "var(--color-border)" : "var(--color-text)",
            opacity: disabled ? 0.35 : 1,
            transition: "background-color 0.15s",
            padding: 0,
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip forward */}
        <CtrlBtn label="Next sentence" disabled={disabled} onClick={jumpForward}>
          <SkipForwardIcon />
        </CtrlBtn>

        {/* Chat */}
        <CtrlBtn label="Open chat" accent onClick={onChatClick}>
          <ChatIcon />
        </CtrlBtn>
      </div>
    </div>
  );
}
