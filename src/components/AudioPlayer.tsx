"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAudioPlayer, type WordTiming } from "@/lib/AudioPlayerContext";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── Word highlighting helpers ─────────────────────────────────────────────────

function highlightWord(el: HTMLElement | null) {
  if (!el) return;
  el.style.textDecorationLine = "underline";
  el.style.textDecorationColor = "#2563eb";
  el.style.textDecorationThickness = "2px";
  el.style.textUnderlineOffset = "3px";
}

function clearWord(el: HTMLElement | null) {
  if (!el) return;
  el.style.textDecorationLine = "";
  el.style.textDecorationColor = "";
  el.style.textDecorationThickness = "";
  el.style.textUnderlineOffset = "";
}

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

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" />
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

export default function AudioPlayer() {
  const {
    session,
    audioRef,
    loadSession,
    dismiss,
    wordTimingsRef,
    scrollDataRef,
    viewportParaRef,
    viewingChapterRef,
    pageContextRef,
    navigateToChapterRef,
    onChatClickRef,
  } = useAudioPlayer();

  const router = useRouter();

  // ── Local playback state (derived from audio element events) ────────────
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // index into SPEEDS (default 1x)
  // Resume modal — captures ref values at open time so we don't read refs during render
  type ModalData = {
    mode: "offscreen" | "mismatch";
    savedTimeMs: number;
    isCrossBook: boolean;
    pageChapterTitle: string;
    pageBookTitle: string;
  };
  const [resumeModal, setResumeModal] = useState<ModalData | null>(null);
  const resumeModalRef = useRef<HTMLDivElement>(null);

  // Sync playing state with audio element
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

  // Reset speed on session change
  useEffect(() => {
    setSpeedIdx(1);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = 1;
  }, [session, audioRef]);

  // ── Playback controls (local, operate directly on audio element) ────────

  const pathname = usePathname();
  const isOnBookPage = session ? pathname === `/${session.bookId}` : false;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Pause if playing
    if (!audio.paused) {
      audio.pause();
      return;
    }

    // Use viewingChapterRef for immediate mismatch detection (no async deps)
    const viewing = viewingChapterRef.current;
    const sessionMatchesPage = session && viewing &&
      session.bookId === viewing.bookId &&
      session.chapterId === viewing.chapterId;

    // Session loaded but viewing a different chapter/book that has audio → mismatch
    const pageCtx = pageContextRef.current;
    if (session && viewing && !sessionMatchesPage && pageCtx) {
      setResumeModal({
        mode: "mismatch",
        savedTimeMs: Math.floor(audio.currentTime * 1000),
        isCrossBook: session.bookId !== pageCtx.bookId,
        pageChapterTitle: pageCtx.chapterTitle,
        pageBookTitle: pageCtx.bookTitle,
      });
      return;
    }

    // Session matches page — check if audio position is offscreen
    if (sessionMatchesPage && audio.currentTime > 0.5) {
      const sd = scrollDataRef.current;
      if (sd) {
        const ms = Math.floor(audio.currentTime * 1000);
        let audioPara = -1;
        for (let i = 0; i < sd.ranges.length; i++) {
          const r = sd.ranges[i];
          if (r && ms >= r.start_ms && ms < r.end_ms) { audioPara = i; break; }
        }
        if (audioPara >= 0) {
          const el = sd.elements[audioPara];
          if (el) {
            const rect = el.getBoundingClientRect();
            const visible = rect.top < window.innerHeight && rect.bottom > 0;
            if (!visible) {
              setResumeModal({
                mode: "offscreen",
                savedTimeMs: ms,
                isCrossBook: false,
                pageChapterTitle: "",
                pageBookTitle: "",
              });
              return;
            }
          }
        }
      }
    }

    audio.play();
  }, [audioRef, session, viewingChapterRef, pageContextRef, scrollDataRef]);

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
      const audio = audioRef.current;
      if (audio) audio.playbackRate = SPEEDS[next];
      return next;
    });
  }, [audioRef]);

  // ── Resume modal handlers ──────────────────────────────────────────────

  // Offscreen: continue from saved position
  const handleResumeContinue = useCallback(() => {
    setResumeModal(null);
    audioRef.current?.play();
  }, [audioRef]);

  // Offscreen: play from current viewport position
  const handleResumeHere = useCallback(() => {
    setResumeModal(null);
    const sd = scrollDataRef.current;
    if (!sd) { audioRef.current?.play(); return; }
    const paraIdx = viewportParaRef.current;
    const range = sd.ranges[paraIdx];
    if (range) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = range.start_ms / 1000;
    }
    audioRef.current?.play();
  }, [audioRef, scrollDataRef, viewportParaRef]);

  // Mismatch: continue current session and navigate to its location
  const handleMismatchContinue = useCallback(() => {
    setResumeModal(null);
    if (!session) return;
    audioRef.current?.play();

    const pageCtx = pageContextRef.current;
    if (pageCtx && pageCtx.bookId === session.bookId) {
      // Same book, different chapter → switch chapter in the book page
      navigateToChapterRef.current?.(session.chapterId);
    } else {
      // Different book → navigate to the session's book
      router.push(`/${session.bookId}`);
    }
  }, [audioRef, session, pageContextRef, navigateToChapterRef, router]);

  // Mismatch: load the current page's audio and start playing
  const handleMismatchHere = useCallback(() => {
    setResumeModal(null);
    const pageCtx = pageContextRef.current;
    if (!pageCtx) return;
    loadSession(pageCtx, 0, true);
  }, [pageContextRef, loadSession]);

  // Close modal on outside click
  useEffect(() => {
    if (!resumeModal) return;
    const handler = (e: MouseEvent) => {
      if (resumeModalRef.current && !resumeModalRef.current.contains(e.target as Node)) {
        setResumeModal(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [resumeModal]);

  // DOM refs for imperative scrubber updates (no React re-renders)
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  // Tracking refs for imperative highlighting & scroll
  const activeWordRef = useRef<string | null>(null);
  const activeParaRef = useRef<number | null>(null);
  // Auto-scroll: enabled on play start, disabled when user scrolls away
  const autoScrollRef = useRef(true);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [trackHovered, setTrackHovered] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);
  const [speedHovered, setSpeedHovered] = useState(false);

  const duration = session?.durationMs ?? 0;
  const disabled = !session;

  // ── Imperative update — called from rAF and from seek ──────────────────────

  const updateScrubber = useCallback((ms: number, dur: number) => {
    const pct = dur > 0 ? (ms / dur) * 100 : 0;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (knobRef.current) knobRef.current.style.left = `${pct}%`;
    if (timeRef.current) timeRef.current.textContent = formatTime(ms);
  }, []);

  const updateHighlight = useCallback((ms: number) => {
    const spans = wordTimingsRef.current;
    if (!spans) return;
    const idx = findActiveIdx(spans, ms);
    const newId = idx >= 0 ? spans[idx].id : null;
    if (newId !== activeWordRef.current) {
      if (activeWordRef.current) clearWord(document.getElementById(activeWordRef.current));
      if (newId) highlightWord(document.getElementById(newId));
      activeWordRef.current = newId;
    }
  }, [wordTimingsRef]);

  const updateScroll = useCallback((ms: number) => {
    if (!autoScrollRef.current) return;
    const sd = scrollDataRef.current;
    if (!sd) return;
    for (let i = 0; i < sd.ranges.length; i++) {
      const r = sd.ranges[i];
      if (r && ms >= r.start_ms && ms < r.end_ms) {
        if (i !== activeParaRef.current) {
          // If we had a previous paragraph, check it's still visible (user hasn't scrolled away)
          if (activeParaRef.current !== null) {
            const prevEl = sd.elements[activeParaRef.current];
            if (prevEl) {
              const rect = prevEl.getBoundingClientRect();
              const visible = rect.top < window.innerHeight && rect.bottom > 0;
              if (!visible) {
                autoScrollRef.current = false;
                activeParaRef.current = i;
                return;
              }
            }
          }
          activeParaRef.current = i;
          sd.elements[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
  }, [scrollDataRef]);

  const clearHighlight = useCallback(() => {
    if (activeWordRef.current) {
      clearWord(document.getElementById(activeWordRef.current));
      activeWordRef.current = null;
    }
  }, []);

  // ── rAF loop — purely imperative, zero setState ────────────────────────────

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

        // Just started playing — re-engage auto-scroll and jump to audio position
        if (wasPaused) {
          autoScrollRef.current = true;
          activeParaRef.current = null;
          const sd = scrollDataRef.current;
          if (sd) {
            for (let i = 0; i < sd.ranges.length; i++) {
              const r = sd.ranges[i];
              if (r && ms >= r.start_ms && ms < r.end_ms) {
                activeParaRef.current = i;
                sd.elements[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
                break;
              }
            }
          }
        }

        updateScrubber(ms, dur);
        updateHighlight(ms);
        updateScroll(ms);
        wasPaused = false;
      } else if (!wasPaused) {
        // Just paused — clear highlight, sync scrubber one last time
        clearHighlight();
        const ms = Math.floor(audio.currentTime * 1000);
        updateScrubber(ms, session?.durationMs ?? 0);
        wasPaused = true;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRef, session, scrollDataRef, updateScrubber, updateHighlight, updateScroll, clearHighlight]);

  // Sync scrubber on mount / session change
  useEffect(() => {
    const audio = audioRef.current;
    const ms = audio ? Math.floor(audio.currentTime * 1000) : 0;
    updateScrubber(ms, duration);
  }, [session, duration, audioRef, updateScrubber]);

  // ── Seek ──────────────────────────────────────────────────────────────────

  const applySeek = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ms = Math.floor(pct * duration);
      seekTo(ms);
      updateScrubber(ms, duration);
      updateHighlight(ms);
    },
    [duration, seekTo, updateScrubber, updateHighlight]
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

  // ── Layout constants ──────────────────────────────────────────────────────

  const knobSize = isDragging || trackHovered ? 16 : 11;
  const knobOpacity = disabled ? 0 : isDragging || trackHovered ? 1 : 0.55;
  const speedLabel = SPEEDS[speedIdx] === 1 ? "1×" : `${SPEEDS[speedIdx]}×`;

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* ── Resume modal (offscreen or mismatch) ────────────────────────── */}
      {resumeModal && (
        <div
          ref={resumeModalRef}
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 12,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 240,
            zIndex: 100,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              textAlign: "center",
            }}
          >
            {resumeModal.mode === "offscreen" ? "Resume audio from..." : "Continue listening?"}
          </span>
          {resumeModal.mode === "offscreen" ? (
            <>
              <button
                onClick={handleResumeContinue}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  transition: "background-color 0.13s",
                }}
                className="hover:opacity-80"
              >
                Continue from {formatTime(resumeModal.savedTimeMs)}
              </button>
              <button
                onClick={handleResumeHere}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--color-accent)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  transition: "background-color 0.13s",
                }}
                className="hover:opacity-80"
              >
                Play from here
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleMismatchContinue}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  transition: "background-color 0.13s",
                  textAlign: "left",
                }}
                className="hover:opacity-80"
              >
                Resume {resumeModal.isCrossBook
                  ? `${session?.bookTitle}, `
                  : ""}{session?.chapterTitle} at {formatTime(resumeModal.savedTimeMs)}
              </button>
              <button
                onClick={handleMismatchHere}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--color-accent)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  transition: "background-color 0.13s",
                  textAlign: "left",
                }}
                className="hover:opacity-80"
              >
                Start {resumeModal.isCrossBook
                  ? `${resumeModal.pageBookTitle}, `
                  : ""}{resumeModal.pageChapterTitle}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Title bar ────────────────────────────────────────────────────── */}
      {session && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          {isOnBookPage ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {session.bookTitle} | {session.chapterTitle}
            </span>
          ) : (
            <Link
              href={`/${session.bookId}`}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
              className="hover:underline"
            >
              {session.bookTitle} | {session.chapterTitle}
            </Link>
          )}
          {!isOnBookPage && (
            <button
              aria-label="Close player"
              onClick={dismiss}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                borderRadius: "var(--radius)",
                flexShrink: 0,
                marginLeft: 8,
              }}
              className="hover:opacity-60"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}

      {/* ── Scrubber ─────────────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Playback position"
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
        {/* Fill — updated imperatively */}
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
        {/* Knob — updated imperatively */}
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
        {/* Updated imperatively */}
        <span ref={timeRef}>{formatTime(0)}</span>
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

        {/* Chat — only on a book page */}
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
