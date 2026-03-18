"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAudioPlayer } from "@/lib/AudioPlayerContext";
import { useProgress } from "@/lib/useProgress";
import { useTopBar } from "@/lib/TopBarContext";
import ChatView from "@/components/chat/ChatView";
import type { BookMeta, NavChapter, ChapterData } from "@/components/reader";

// ── Context ─────────────────────────────────────────────────────────────

type BookShellContextValue = {
  bookId: string;
  bookMeta: BookMeta;
  chapters: NavChapter[];
  currentChapter: number;
  setCurrentChapter: (num: number) => void;
  cacheChapter: (num: number, data: ChapterData) => void;
  getCachedChapter: (num: number) => ChapterData | undefined;
};

const BookShellContext = createContext<BookShellContextValue | null>(null);

export function useBookShell() {
  const ctx = useContext(BookShellContext);
  if (!ctx) throw new Error("useBookShell must be used within BookShell");
  return ctx;
}

// ── Component ───────────────────────────────────────────────────────────

export default function BookShell({
  bookId,
  bookMeta,
  chapters,
  children,
}: {
  bookId: string;
  bookMeta: BookMeta;
  chapters: NavChapter[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const cache = useRef<Record<number, ChapterData>>({});

  const { saveProgressNow } = useProgress(bookId);
  const {
    session,
    audioRef,
    onPauseRef,
    onChatClickRef,
    onChapterSelectRef,
    viewingChapterRef,
    navigateToChapterRef,
  } = useAudioPlayer();
  const { setBookNav, updateActiveChapter, clearBookNav, setScrolled } = useTopBar();

  const cacheChapter = useCallback((num: number, data: ChapterData) => {
    cache.current[num] = data;
  }, []);
  const getCachedChapter = useCallback((num: number) => cache.current[num], []);

  // ── TopBar ────────────────────────────────────────────────────────────

  const handleChapterNav = useCallback(
    (id: number) => router.push(`/${bookId}/${id}`),
    [router, bookId]
  );

  useEffect(() => {
    setBookNav({
      title: bookMeta.title,
      chapters,
      activeChapterId: currentChapter,
      onChapterSelect: handleChapterNav,
    });
    return () => clearBookNav();
  }, [bookMeta.title, chapters, handleChapterNav, setBookNav, clearBookNav]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    updateActiveChapter(currentChapter);
  }, [currentChapter, updateActiveChapter]);

  useEffect(() => {
    if (currentChapter !== chapters[0]?.id) setScrolled(true);
  }, [currentChapter, chapters, setScrolled]);

  // ── Audio callbacks ───────────────────────────────────────────────────

  useEffect(() => {
    viewingChapterRef.current = { bookId, chapterId: currentChapter };
    return () => { viewingChapterRef.current = null; };
  }, [bookId, currentChapter, viewingChapterRef]);

  useEffect(() => {
    navigateToChapterRef.current = (chapterId: number) => router.push(`/${bookId}/${chapterId}`);
    return () => { navigateToChapterRef.current = null; };
  }, [navigateToChapterRef, router, bookId]);

  useEffect(() => {
    if (!session || session.bookId !== bookId) return;
    onPauseRef.current = (timeMs: number) => saveProgressNow(session.chapterId, timeMs);
    return () => { onPauseRef.current = null; };
  }, [session, bookId, saveProgressNow, onPauseRef]);

  useEffect(() => {
    onChatClickRef.current = () => {
      setChatOpen((o) => {
        if (!o) audioRef.current?.pause();
        return !o;
      });
    };
    return () => { onChatClickRef.current = null; };
  }, [onChatClickRef, audioRef]);

  useEffect(() => {
    onChapterSelectRef.current = (chapterId: number, startMs?: number, autoPlay?: boolean) => {
      if (chapterId === currentChapter) {
        if (startMs != null && audioRef.current) {
          audioRef.current.currentTime = startMs / 1000;
          if (autoPlay) audioRef.current.play().catch(() => {});
        }
      } else {
        router.push(`/${bookId}/${chapterId}`);
      }
    };
    return () => { onChapterSelectRef.current = null; };
  }, [onChapterSelectRef, currentChapter, audioRef, router, bookId]);

  // Auto-advance when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (session?.bookId !== bookId || session?.chapterId !== currentChapter) return;

    const idx = chapters.findIndex((c) => c.id === currentChapter);
    const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
    if (!next) return;

    const handleEnded = () => {
      router.push(`/${bookId}/${next.id}?autoplay=1`);
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [audioRef, session, bookId, currentChapter, chapters, router]);

  // ── Chat ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (chatOpen) window.history.pushState({ chat: true }, "");
  }, [chatOpen]);

  useEffect(() => {
    const handlePopState = () => setChatOpen(false);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const ctxValue: BookShellContextValue = {
    bookId, bookMeta, chapters, currentChapter,
    setCurrentChapter, cacheChapter, getCachedChapter,
  };

  return (
    <BookShellContext.Provider value={ctxValue}>
      {children}
      {chatOpen && (
        <ChatView
          bookId={bookId}
          bookTitle={bookMeta.title}
          authorName={bookMeta.author}
          onClose={() => window.history.back()}
        />
      )}
    </BookShellContext.Provider>
  );
}
