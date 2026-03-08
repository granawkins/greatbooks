"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { type SegmentBoundary, useAudioPlayer, type WordTiming } from "@/lib/AudioPlayerContext";
import { useProgress } from "@/lib/useProgress";
import ChatView from "@/components/chat/ChatView";
import {
  BookHeader,
  ChapterBlocks,
  ChapterDivider,
  useInfiniteScroll,
  groupIntoBlocks,
  buildWordSpans,
  paraTimeRange,
  type Block,
  type BookMeta,
  type NavChapter,
} from "@/components/reader";

export default function BookPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { progress, loaded: progressLoaded, saveProgressNow } = useProgress(bookId);
  const {
    session,
    loadSession,
    wordTimingsRef,
    scrollDataRef,
    viewingChapterRef,
    navigateToChapterRef,
    onPauseRef,
    onChatClickRef,
    onChapterSelectRef,
  } = useAudioPlayer();

  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [bookChapters, setBookChapters] = useState<NavChapter[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  const {
    loadedChapters,
    activeChapterId,
    setActiveChapterId,
    sortedChapterNums,
    chapterSectionRefs,
    topSentinelRef,
    bottomSentinelRef,
    fetchChapter,
    handleChapterJump,
  } = useInfiniteScroll(bookId, bookChapters, saveProgressNow);

  const paraRefsMap = useRef<Record<number, (HTMLParagraphElement | null)[]>>({});
  const restoredRef = useRef(false);
  const initialAudioMsRef = useRef(0);

  const initialLoading = sortedChapterNums.length === 0;

  // Blocks per chapter
  const layout = bookMeta?.layout || "prose";
  const allChapterBlocks = useMemo(() => {
    const result: Record<number, Block[]> = {};
    for (const [num, data] of Object.entries(loadedChapters)) {
      result[Number(num)] = groupIntoBlocks(data.segments, layout);
    }
    return result;
  }, [loadedChapters, layout]);

  // Push a history entry when chat opens so browser back button closes it
  useEffect(() => {
    if (chatOpen) window.history.pushState({ chat: true }, "");
  }, [chatOpen]);

  // Browser back button: close chat
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setChatOpen(false);
      if (e.state?.chapter !== undefined) {
        handleChapterJump(e.state.chapter);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chapter list
  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.chapters) {
          setBookMeta({
            title: data.title,
            author: data.author,
            original_date: data.original_date,
            translator: data.translator,
            source_url: data.source_url,
            layout: data.layout || "prose",
          });
          setBookChapters(
            data.chapters.map((c: { number: number; title: string }) => ({
              id: c.number,
              title: c.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, [bookId]);

  // Restore saved chapter on first load
  useEffect(() => {
    if (!progressLoaded || restoredRef.current) return;
    restoredRef.current = true;
    if (progress) {
      setActiveChapterId(progress.chapter_number);
      initialAudioMsRef.current = progress.audio_position_ms;
      fetchChapter(progress.chapter_number);
      window.history.replaceState({ chapter: progress.chapter_number }, "");
    } else {
      fetchChapter(1);
      window.history.replaceState({ chapter: 1 }, "");
    }
  }, [progressLoaded, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio integration ─────────────────────────────────────────────────────

  const sessionChapterId = session?.chapterId;
  const sessionBlocks = sessionChapterId != null ? allChapterBlocks[sessionChapterId] : null;

  const wordTimings = useMemo((): WordTiming[] => {
    if (!sessionBlocks || sessionChapterId == null) return [];
    const result: WordTiming[] = [];
    for (let i = 0; i < sessionBlocks.length; i++) {
      const block = sessionBlocks[i];
      if (block.type !== "paragraph") continue;
      for (const s of buildWordSpans(block)) {
        result.push({ id: `w-${sessionChapterId}-${i}-${s.charStart}`, start_ms: s.start_ms, end_ms: s.end_ms });
      }
    }
    return result;
  }, [sessionBlocks, sessionChapterId]);

  const paraRanges = useMemo(
    () => sessionBlocks?.map((b) => (b.type === "paragraph" ? paraTimeRange(b) : null)) ?? [],
    [sessionBlocks]
  );

  const segmentBoundaries = useMemo((): SegmentBoundary[] => {
    if (!sessionChapterId || !loadedChapters[sessionChapterId]) return [];
    const result: SegmentBoundary[] = [];
    for (const seg of loadedChapters[sessionChapterId].segments) {
      if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
        result.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
      }
    }
    return result.sort((a, b) => a.start_ms - b.start_ms);
  }, [sessionChapterId, loadedChapters]);

  const initialChapterData = loadedChapters[activeChapterId];
  const audioSrc = initialChapterData?.audio_file
    ? `/api/audio/${initialChapterData.audio_file.replace(/^data\//, "")}`
    : null;

  // Load audio session into global player
  useEffect(() => {
    if (!progressLoaded) return;
    if (!initialChapterData?.audio_file || !audioSrc || !bookMeta) return;
    if (session) return;

    loadSession(
      {
        bookId,
        bookTitle: bookMeta.title,
        chapterTitle: initialChapterData.title,
        chapterId: activeChapterId,
        src: audioSrc,
        durationMs: initialChapterData.audio_duration_ms ?? 0,
        segmentBoundaries,
      },
      initialAudioMsRef.current
    );
    initialAudioMsRef.current = 0;
  }, [progressLoaded, initialChapterData, audioSrc, bookMeta, bookId, activeChapterId, session, segmentBoundaries, loadSession]);

  // Register callbacks with AudioPlayerContext
  useEffect(() => {
    viewingChapterRef.current = { bookId, chapterId: activeChapterId };
    return () => { viewingChapterRef.current = null; };
  }, [bookId, activeChapterId, viewingChapterRef]);

  useEffect(() => {
    navigateToChapterRef.current = (chapterId: number) => handleChapterJump(chapterId);
    return () => { navigateToChapterRef.current = null; };
  }, [navigateToChapterRef, handleChapterJump]);

  useEffect(() => {
    if (session?.bookId !== bookId || !sessionChapterId || !loadedChapters[sessionChapterId]) return;
    wordTimingsRef.current = wordTimings;
    return () => { wordTimingsRef.current = null; };
  }, [session?.bookId, bookId, sessionChapterId, wordTimings, wordTimingsRef, loadedChapters]);

  useEffect(() => {
    if (session?.bookId !== bookId || !sessionChapterId || !loadedChapters[sessionChapterId]) return;
    scrollDataRef.current = { ranges: paraRanges, elements: paraRefsMap.current[sessionChapterId] || [] };
    return () => { scrollDataRef.current = null; };
  }, [session?.bookId, bookId, sessionChapterId, paraRanges, scrollDataRef, loadedChapters]);

  useEffect(() => {
    if (!session || session.bookId !== bookId) return;
    const chapterId = session.chapterId;
    onPauseRef.current = (timeMs: number) => saveProgressNow(chapterId, timeMs);
    return () => { onPauseRef.current = null; };
  }, [session, bookId, saveProgressNow, onPauseRef]);

  useEffect(() => {
    onChatClickRef.current = () => setChatOpen((o) => !o);
    return () => { onChatClickRef.current = null; };
  }, [onChatClickRef]);

  useEffect(() => {
    onChapterSelectRef.current = (chapterId: number, startMs?: number, autoPlay?: boolean) => {
      if (startMs == null) {
        handleChapterJump(chapterId);
      } else {
        setActiveChapterId(chapterId);
      }
      const chapterData = loadedChapters[chapterId];
      if (chapterData?.audio_file && bookMeta) {
        const src = `/api/audio/${chapterData.audio_file.replace(/^data\//, "")}`;
        const boundaries: SegmentBoundary[] = [];
        for (const seg of chapterData.segments) {
          if (seg.audio_start_ms != null && seg.audio_end_ms != null) {
            boundaries.push({ start_ms: seg.audio_start_ms, end_ms: seg.audio_end_ms });
          }
        }
        boundaries.sort((a, b) => a.start_ms - b.start_ms);
        loadSession(
          {
            bookId,
            bookTitle: bookMeta.title,
            chapterTitle: chapterData.title,
            chapterId,
            src,
            durationMs: chapterData.audio_duration_ms ?? 0,
            segmentBoundaries: boundaries,
          },
          startMs,
          autoPlay ?? true,
        );
      }
    };
    return () => { onChapterSelectRef.current = null; };
  }, [onChapterSelectRef, handleChapterJump, setActiveChapterId, loadedChapters, bookMeta, bookId, loadSession]);

  if (chatOpen) {
    return (
      <ChatView
        bookId={bookId}
        bookTitle={bookMeta?.title ?? ""}
        authorName={bookMeta?.author ?? ""}
        onClose={() => window.history.back()}
      />
    );
  }

  return (
    <article
      className="mx-auto"
      style={{
        maxWidth: "68ch",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingBottom: "200px",
        position: "relative",
      }}
    >
      <BookHeader
        bookMeta={bookMeta}
        chapters={bookChapters}
        activeChapterId={activeChapterId}
        onChapterSelect={handleChapterJump}
      />

      <div ref={topSentinelRef} style={{ height: 1 }} />

      {initialLoading ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          Loading...
        </p>
      ) : (
        sortedChapterNums.map((chapterNum) => {
          const blocks = allChapterBlocks[chapterNum] || [];
          const chapterMeta = bookChapters.find((c) => c.id === chapterNum);
          return (
            <div
              key={chapterNum}
              ref={(el) => { chapterSectionRefs.current[chapterNum] = el; }}
              data-chapter={chapterNum}
            >
              {chapterMeta && bookChapters.length > 1 && <ChapterDivider title={chapterMeta.title} />}

              {blocks.length === 0 ? (
                <p className="text-sm text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
                  No text available for this chapter.
                </p>
              ) : (
                <ChapterBlocks blocks={blocks} chapterNum={chapterNum} paraRefsMap={paraRefsMap} verse={layout === "verse"} />
              )}
            </div>
          );
        })
      )}

      <div ref={bottomSentinelRef} style={{ height: 1 }} />
    </article>
  );
}
