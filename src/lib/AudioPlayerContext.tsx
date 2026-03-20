"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export type SegmentBoundary = { start_ms: number; end_ms: number };

export type AudioSession = {
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  chapterId: number;
  src: string;
  durationMs: number;
  segmentBoundaries: SegmentBoundary[];
  initialPositionMs?: number;
};

// Word-timing span the player uses for imperative highlighting
export type WordTiming = { id: string; start_ms: number; end_ms: number };

// Paragraph-timing data the player uses for imperative auto-scroll
export type ScrollData = {
  ranges: ({ start_ms: number; end_ms: number } | null)[];
  elements: (HTMLElement | null)[];
};

export type ViewMode = "audio" | "text";

// ── AudioSessionContext ──────────────────────────────────────────────────────

type AudioSessionContextValue = {
  session: AudioSession | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;

  loadSession: (session: AudioSession, initialPositionMs?: number, autoPlay?: boolean) => void;
  dismiss: () => void;

  // Data refs — the book page populates these, the player reads them imperatively
  wordTimingsRef: React.RefObject<WordTiming[] | null>;
  scrollDataRef: React.RefObject<ScrollData | null>;

  // What book/chapter the user is currently viewing (set synchronously, no async deps)
  viewingChapterRef: React.RefObject<{ bookId: string; chapterId: number } | null>;

  // Navigate to a chapter within the current book page (set by BookPage)
  navigateToChapterRef: React.RefObject<((chapterId: number) => void) | null>;

  // Sparse callbacks — only fired on discrete events, never at 60fps
  onPauseRef: React.RefObject<((ms: number) => void) | null>;
  onChatClickRef: React.RefObject<(() => void) | null>;
  onChapterSelectRef: React.RefObject<((chapterId: number, startMs?: number, autoPlay?: boolean) => void) | null>;

  // Playback speed — stored as ref so it can be applied on audio init
  playbackSpeedRef: React.RefObject<number | null>;
  setPlaybackSpeed: (speed: number) => void;
  persistSpeedRef: React.RefObject<((speed: number) => void) | null>;

  // Audio gating — set by consumer to handle blocked audio (e.g. show upgrade modal)
  // Returns "login" | "audio_limit" if blocked, or null if allowed
  audioGateCheckRef: React.RefObject<(() => "login" | "audio_limit" | null) | null>;
  onAudioBlockedRef: React.RefObject<((reason: "login" | "audio_limit") => void) | null>;

  // Client-side session listening time (ms) — for accurate mid-session gate checks
  getSessionListenedMs: () => number;
};

const AudioSessionContext = createContext<AudioSessionContextValue | null>(null);

export function useAudioSession() {
  const ctx = useContext(AudioSessionContext);
  if (!ctx) throw new Error("useAudioSession must be used within AudioPlayerProvider");
  return ctx;
}

// ── AudioViewContext ─────────────────────────────────────────────────────────

type AudioViewContextValue = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const AudioViewContext = createContext<AudioViewContextValue | null>(null);

export function useAudioView() {
  const ctx = useContext(AudioViewContext);
  if (!ctx) throw new Error("useAudioView must be used within AudioPlayerProvider");
  return ctx;
}

// ── Combined hook (backward compatibility) ───────────────────────────────────

export function useAudioPlayer() {
  const sessionCtx = useAudioSession();
  const viewCtx = useAudioView();
  return { ...sessionCtx, ...viewCtx };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [session, setSession] = useState<AudioSession | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("audio");

  // Restore viewMode from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("greatbooks-view-mode");
      if (stored === "audio" || stored === "text") setViewModeState(stored);
    } catch {}
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem("greatbooks-view-mode", mode); } catch {}
  }, []);

  const seekedRef = useRef(false);
  const initialMsRef = useRef(0);
  const autoPlayRef = useRef(false);

  const wordTimingsRef = useRef<WordTiming[] | null>(null);
  const scrollDataRef = useRef<ScrollData | null>(null);
  const viewingChapterRef = useRef<{ bookId: string; chapterId: number } | null>(null);
  const navigateToChapterRef = useRef<((chapterId: number) => void) | null>(null);
  const onPauseRef = useRef<((ms: number) => void) | null>(null);
  const onChatClickRef = useRef<(() => void) | null>(null);
  const onChapterSelectRef = useRef<((chapterId: number) => void) | null>(null);
  const audioGateCheckRef = useRef<(() => "login" | "audio_limit" | null) | null>(null);
  const onAudioBlockedRef = useRef<((reason: "login" | "audio_limit") => void) | null>(null);
  const playbackSpeedRef = useRef<number | null>(null);

  // Client-side session listening time tracking
  const sessionListenedMsRef = useRef(0);
  const playStartRef = useRef<number | null>(null);

  const getSessionListenedMs = useCallback(() => {
    let total = sessionListenedMsRef.current;
    if (playStartRef.current) {
      total += Date.now() - playStartRef.current;
    }
    return total;
  }, []);

  // Persist callback — set externally by PlaybackSpeedSync once auth is available
  const persistSpeedRef = useRef<((speed: number) => void) | null>(null);

  const setPlaybackSpeed = useCallback((speed: number) => {
    playbackSpeedRef.current = speed;
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    // Persist to DB if available
    persistSpeedRef.current?.(speed);
  }, []);

  // Save progress on any pause (user-initiated, loadSession, dismiss, ended)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePause = () => {
      onPauseRef.current?.(Math.floor(audio.currentTime * 1000));
    };
    audio.addEventListener("pause", handlePause);
    return () => audio.removeEventListener("pause", handlePause);
  }, []);

  // Track play/pause for session listening time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => { playStartRef.current = Date.now(); };
    const onPause = () => {
      if (playStartRef.current) {
        sessionListenedMsRef.current += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Handle audio load errors (e.g. 403 from audio limit) — show upgrade modal
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleError = () => {
      const blocked = audioGateCheckRef.current?.();
      if (blocked) {
        onAudioBlockedRef.current?.(blocked);
      }
    };
    audio.addEventListener("error", handleError);
    return () => audio.removeEventListener("error", handleError);
  }, []);

  // Periodic progress save every 5s while playing + enforce audio limit
  useEffect(() => {
    if (!session) return;
    const audio = audioRef.current;
    if (!audio) return;
    const interval = setInterval(() => {
      if (!audio.paused) {
        onPauseRef.current?.(Math.floor(audio.currentTime * 1000));
        // Enforce audio limit during playback
        const blocked = audioGateCheckRef.current?.();
        if (blocked) {
          audio.pause();
          onAudioBlockedRef.current?.(blocked);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  // Restore initial position after audio loads, and auto-play if requested
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !session) return;

    const handleCanPlay = () => {
      if (!seekedRef.current) {
        if (initialMsRef.current > 0) {
          audio.currentTime = initialMsRef.current / 1000;
        }
        audio.playbackRate = playbackSpeedRef.current ?? 1;
        seekedRef.current = true;
      }
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        // Check audio gate before auto-playing
        const blocked = audioGateCheckRef.current?.();
        if (blocked) {
          onAudioBlockedRef.current?.(blocked);
        } else {
          audio.play().catch(() => {});
        }
      }
    };
    audio.addEventListener("canplay", handleCanPlay);
    if (audio.readyState >= 3) handleCanPlay();
    return () => audio.removeEventListener("canplay", handleCanPlay);
  }, [session]);

  const loadSession = useCallback(
    (newSession: AudioSession, initialPositionMs?: number, autoPlay?: boolean) => {
      // Reset session listening time tracking
      sessionListenedMsRef.current = 0;
      playStartRef.current = null;

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = newSession.src;
        audio.currentTime = 0;
      }
      setSession({ ...newSession, initialPositionMs: initialPositionMs ?? 0 });
      seekedRef.current = false;
      initialMsRef.current = initialPositionMs ?? 0;
      autoPlayRef.current = autoPlay ?? false;
    },
    []
  );

  const dismiss = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setSession(null);
  }, []);

  // Memoize context values to prevent unnecessary re-renders
  const sessionValue = useMemo<AudioSessionContextValue>(() => ({
    session,
    audioRef,
    loadSession,
    dismiss,
    wordTimingsRef,
    scrollDataRef,
    viewingChapterRef,
    navigateToChapterRef,
    onPauseRef,
    onChatClickRef,
    onChapterSelectRef,
    playbackSpeedRef,
    setPlaybackSpeed,
    persistSpeedRef,
    audioGateCheckRef,
    onAudioBlockedRef,
    getSessionListenedMs,
  }), [session, loadSession, dismiss, setPlaybackSpeed, getSessionListenedMs]);

  const viewValue = useMemo<AudioViewContextValue>(() => ({
    viewMode,
    setViewMode,
  }), [viewMode, setViewMode]);

  return (
    <AudioSessionContext.Provider value={sessionValue}>
      <AudioViewContext.Provider value={viewValue}>
        <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
        {children}
      </AudioViewContext.Provider>
    </AudioSessionContext.Provider>
  );
}
