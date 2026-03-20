"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAudioSession, type WordTiming } from "@/lib/AudioPlayerContext";
import { scrollToCenter, isInReadingZone } from "@/lib/readingCenter";
import { applyClassById, removeClassById } from "@/components/reader/wordAnnotator";
import { Scrubber, formatTime, formatTimeRemaining } from "./Scrubber";
import { CtrlBtn } from "./CtrlBtn";
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, ChatIcon } from "./icons";

function findActiveIdx(spans: WordTiming[], ms: number): number {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid];
    if (ms >= s.start_ms && ms < s.end_ms) return mid;
    if (ms < s.start_ms) hi = mid - 1;
    else lo = mid + 1;
  }
  return -1;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── Main component ────────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const {
    session,
    audioRef,
    wordTimingsRef,
    viewingChapterRef,
    onChatClickRef,
    playbackSpeedRef,
    setPlaybackSpeed,
    audioGateCheckRef,
    onAudioBlockedRef,
  } = useAudioSession();

  const router = useRouter();
  const pathname = usePathname();
  const isOnBookPage = session ? pathname.startsWith(`/${session.bookId}/`) : false;

  // ── Local playback state ────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    setPlaying(!audio.paused);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioRef]);

  // Sync speed index from the context's playback speed ref on session load
  useEffect(() => {
    const speed = playbackSpeedRef.current;
    const idx = SPEEDS.indexOf(speed);
    setSpeedIdx(idx >= 0 ? idx : 1);
  }, [session, playbackSpeedRef]);

  // ── Playback controls ────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    // Check audio gate before playing
    const blocked = audioGateCheckRef.current?.();
    if (blocked) {
      onAudioBlockedRef.current?.(blocked);
      return;
    }

    const viewing = viewingChapterRef.current;
    if (session && viewing) {
      if (session.bookId !== viewing.bookId || session.chapterId !== viewing.chapterId) {
        router.push(`/${session.bookId}/${session.chapterId}`);
      }
    }

    audio.play();
  }, [audioRef, session, viewingChapterRef, router, audioGateCheckRef, onAudioBlockedRef]);

  const seekTo = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = ms / 1000;
  }, [audioRef]);

  const jumpBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !session) return;
    const ms = Math.floor(audio.currentTime * 1000);
    const boundaries = session.segmentBoundaries;
    for (let i = boundaries.length - 1; i >= 0; i--) {
      if (boundaries[i].start_ms < ms - 200) {
        audio.currentTime = boundaries[i].start_ms / 1000;
        return;
      }
    }
    audio.currentTime = 0;
  }, [audioRef, session]);

  const jumpForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !session) return;
    const ms = Math.floor(audio.currentTime * 1000);
    const boundaries = session.segmentBoundaries;
    for (let i = 0; i < boundaries.length; i++) {
      if (boundaries[i].start_ms > ms + 200) {
        audio.currentTime = boundaries[i].start_ms / 1000;
        return;
      }
    }
  }, [audioRef, session]);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((prev) => {
      const next = (prev + 1) % SPEEDS.length;
      setPlaybackSpeed(SPEEDS[next]);
      return next;
    });
  }, [setPlaybackSpeed]);

  // ── Imperative refs for scrubber, highlighting, scroll ──────────────────

  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);

  const activeWordRef = useRef<string | null>(null);
  // following = true means auto-scroll tracks the active word
  const followingRef = useRef(false);
  // Timestamp of last programmatic scroll — ignore user-scroll events within 600ms
  const lastAutoScrollRef = useRef(0);

  const [speedHovered, setSpeedHovered] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);

  const duration = session?.durationMs ?? 0;
  const disabled = !session;

  const updateScrubber = useCallback((ms: number, dur: number) => {
    const pct = dur > 0 ? (ms / dur) * 100 : 0;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (knobRef.current) knobRef.current.style.left = `${pct}%`;
    if (elapsedRef.current) elapsedRef.current.textContent = formatTime(ms);
    if (remainingRef.current) {
      const remaining = Math.max(0, dur - ms);
      remainingRef.current.textContent = remaining > 0 ? `${formatTimeRemaining(remaining)} left in chapter` : "";
    }
  }, []);

  const updateHighlight = useCallback((ms: number) => {
    const spans = wordTimingsRef.current;
    if (!spans) return;
    const idx = findActiveIdx(spans, ms);
    const newId = idx >= 0 ? spans[idx].id : null;
    if (newId !== activeWordRef.current) {
      if (activeWordRef.current) removeClassById(activeWordRef.current, "word-active");
      if (newId) applyClassById(newId, "word-active");
      activeWordRef.current = newId;
      // Word-level auto-scroll: if following, keep active word in middle 50%
      if (followingRef.current && newId) {
        const el = document.getElementById(newId);
        if (el && !isInReadingZone(el)) {
          lastAutoScrollRef.current = Date.now();
          scrollToCenter(el, "smooth");
        }
      }
    }
  }, [wordTimingsRef]);

  const clearHighlight = useCallback(() => {
    if (activeWordRef.current) {
      removeClassById(activeWordRef.current, "word-active");
      activeWordRef.current = null;
    }
  }, []);

  // ── Reset highlight on resize ───────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (activeWordRef.current) {
        clearHighlight();
        activeWordRef.current = null;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clearHighlight]);

  // ── Following state machine ────────────────────────────────────────────
  // Play → following=true + jump to cursor
  // User scroll while playing → following=false
  // Pause+play → following=true + jump again
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      followingRef.current = true;
      // Jump to the active word immediately
      if (activeWordRef.current) {
        const el = document.getElementById(activeWordRef.current);
        if (el && !isInReadingZone(el)) {
          lastAutoScrollRef.current = Date.now();
          scrollToCenter(el, "smooth");
        }
      }
    };
    const onPause = () => {
      followingRef.current = false;
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioRef]);

  // User scroll while playing → stop following (ignore scroll events within 600ms of auto-scroll)
  useEffect(() => {
    const handleScroll = () => {
      if (Date.now() - lastAutoScrollRef.current < 600) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        followingRef.current = false;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [audioRef]);

  // ── rAF loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let rafId: number;
    let wasPaused = true;
    const tick = () => {
      const paused = audio.paused;
      if (!paused) {
        const ms = Math.floor(audio.currentTime * 1000);
        const dur = session?.durationMs ?? 0;
        updateScrubber(ms, dur);
        updateHighlight(ms);
        wasPaused = false;
      } else if (!wasPaused) {
        clearHighlight();
        const ms = Math.floor(audio.currentTime * 1000);
        updateScrubber(ms, session?.durationMs ?? 0);
        wasPaused = true;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRef, session, updateScrubber, updateHighlight, clearHighlight]);

  useEffect(() => {
    const ms = session?.initialPositionMs ?? 0;
    updateScrubber(ms, duration);
  }, [session, duration, updateScrubber]);

  // ── Seek handler for Scrubber ───────────────────────────────────────────

  const handleSeek = useCallback(
    (ms: number) => {
      seekTo(ms);
      updateScrubber(ms, duration);
      updateHighlight(ms);
    },
    [seekTo, duration, updateScrubber, updateHighlight]
  );

  const speedLabel = SPEEDS[speedIdx] === 1 ? "1×" : `${SPEEDS[speedIdx]}×`;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <Scrubber
        duration={duration}
        disabled={disabled}
        fillRef={fillRef}
        knobRef={knobRef}
        elapsedRef={elapsedRef}
        remainingRef={remainingRef}
        onSeek={handleSeek}
      />

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

        <CtrlBtn label="Previous sentence" disabled={disabled} onClick={jumpBack}>
          <SkipBackIcon />
        </CtrlBtn>

        {/* Play / Pause */}
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

        <CtrlBtn label="Next sentence" disabled={disabled} onClick={jumpForward}>
          <SkipForwardIcon />
        </CtrlBtn>

        {isOnBookPage ? (
          <CtrlBtn label="Open chat" accent onClick={() => onChatClickRef.current?.()}>
            <ChatIcon />
          </CtrlBtn>
        ) : (
          <div style={{ width: 52, height: 52 }} />
        )}
      </div>
    </div>
  );
}
