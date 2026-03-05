"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type MutableRefObject,
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
};

// Word-timing span the player uses for imperative highlighting
export type WordTiming = { id: string; start_ms: number; end_ms: number };

// Paragraph-timing data the player uses for imperative auto-scroll
export type ScrollData = {
  ranges: ({ start_ms: number; end_ms: number } | null)[];
  elements: (HTMLElement | null)[];
};

type AudioPlayerContextValue = {
  session: AudioSession | null;
  audioRef: MutableRefObject<HTMLAudioElement | null>;

  loadSession: (session: AudioSession, initialPositionMs?: number, autoPlay?: boolean) => void;
  dismiss: () => void;

  // Data refs — the book page populates these, the player reads them imperatively
  wordTimingsRef: MutableRefObject<WordTiming[] | null>;
  scrollDataRef: MutableRefObject<ScrollData | null>;

  // What book/chapter the user is currently viewing (set synchronously, no async deps)
  viewingChapterRef: MutableRefObject<{ bookId: string; chapterId: number } | null>;

  // Navigate to a chapter within the current book page (set by BookPage)
  navigateToChapterRef: MutableRefObject<((chapterId: number) => void) | null>;

  // Sparse callbacks — only fired on discrete events, never at 60fps
  onPauseRef: MutableRefObject<((ms: number) => void) | null>;
  onChatClickRef: MutableRefObject<(() => void) | null>;
  onChapterSelectRef: MutableRefObject<((chapterId: number) => void) | null>;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [session, setSession] = useState<AudioSession | null>(null);

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

  // Periodic progress save every 5s while playing
  useEffect(() => {
    if (!session) return;
    const audio = audioRef.current;
    if (!audio) return;
    const interval = setInterval(() => {
      if (!audio.paused) {
        onPauseRef.current?.(Math.floor(audio.currentTime * 1000));
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
        seekedRef.current = true;
      }
      if (autoPlayRef.current) {
        autoPlayRef.current = false;
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener("canplay", handleCanPlay);
    if (audio.readyState >= 3) handleCanPlay();
    return () => audio.removeEventListener("canplay", handleCanPlay);
  }, [session]);

  const loadSession = useCallback(
    (newSession: AudioSession, initialPositionMs?: number, autoPlay?: boolean) => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = newSession.src;
        audio.currentTime = 0;
        audio.playbackRate = 1;
      }
      setSession(newSession);
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

  const value: AudioPlayerContextValue = {
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
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
      {children}
    </AudioPlayerContext.Provider>
  );
}
