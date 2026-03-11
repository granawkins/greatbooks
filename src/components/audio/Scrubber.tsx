"use client";

import { useRef, useState, useCallback, type Ref } from "react";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatTimeRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function Scrubber({
  duration,
  disabled,
  fillRef,
  knobRef,
  elapsedRef,
  remainingRef,
  onSeek,
}: {
  duration: number;
  disabled: boolean;
  fillRef: Ref<HTMLDivElement>;
  knobRef: Ref<HTMLDivElement>;
  elapsedRef: Ref<HTMLSpanElement>;
  remainingRef: Ref<HTMLSpanElement>;
  onSeek: (ms: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [trackHovered, setTrackHovered] = useState(false);

  const applySeek = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(Math.floor(pct * duration));
    },
    [duration, onSeek]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setIsDragging(true);
      applySeek(e.clientX);
    },
    [applySeek]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      applySeek(e.clientX);
    },
    [applySeek]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      draggingRef.current = false;
      setIsDragging(false);
    },
    []
  );

  const knobSize = isDragging || trackHovered ? 16 : 11;
  const knobOpacity = disabled ? 0 : isDragging || trackHovered ? 1 : 0.55;

  const timeStyle = {
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: "var(--color-text-secondary)",
    letterSpacing: "0.04em",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.6,
  } as const;

  return (
    <>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Playback position"
        aria-valuenow={0}
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
        onPointerDown={disabled ? undefined : handlePointerDown}
        onPointerMove={disabled ? undefined : handlePointerMove}
        onPointerUp={disabled ? undefined : handlePointerUp}
      >
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
        <div
          ref={fillRef}
          style={{
            position: "absolute",
            left: 0,
            width: "0%",
            height: 3,
            borderRadius: 3,
            backgroundColor: disabled ? "var(--color-border)" : "var(--color-accent)",
          }}
        />
        <div
          ref={knobRef}
          style={{
            position: "absolute",
            left: "0%",
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

      {/* Time row: elapsed | remaining in chapter | total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 3,
        }}
      >
        <span ref={elapsedRef} style={timeStyle}>
          {formatTime(0)}
        </span>
        <span ref={remainingRef} style={timeStyle}>
          {duration ? `${formatTimeRemaining(duration)} left in chapter` : ""}
        </span>
        <span style={timeStyle}>
          {duration ? formatTime(duration) : "--:--"}
        </span>
      </div>
    </>
  );
}

export { formatTime, formatTimeRemaining };
