/**
 * Shared context builder for text and voice chat.
 * Produces system prompts with book metadata, study guide, and reader position.
 */

import { db } from "./db";
import fs from "fs";
import path from "path";

type ContextOptions = {
  bookId: string;
  userId: string;
  voice?: boolean;
};

/**
 * Build a system prompt for the chat model, including book metadata,
 * study guide content, and the reader's current position.
 */
export function buildSystemPrompt(opts: ContextOptions): string {
  const { bookId, userId, voice } = opts;

  const book = db.getBook(bookId);
  if (!book) return "You are a helpful reading companion.";

  const parts: string[] = [];

  // Identity
  parts.push(`You are a knowledgeable reading companion for "${book.title}" by ${book.author}.`);
  parts.push("Help the reader understand the text, characters, themes, and historical context. Be concise and engaging.");

  if (voice) {
    parts.push(`
You are in voice mode — a Socratic tutor and professor, thinking aloud with the reader.

Respond like a brilliant teacher who loves this material: make connections, ask follow-up questions, let your answers breathe. Don't truncate yourself artificially. If a question deserves two minutes of reflection, give it two minutes. If something is worth a brief answer, be brief — but let the content decide, not a word limit.

Be natural and conversational, but intellectually substantive. You're not customer support. You're the professor who changed how someone thinks about a book.`);
  }

  // Study guide
  const guidePath = path.join(process.cwd(), "data", bookId, "STUDYGUIDE.md");
  try {
    const guide = fs.readFileSync(guidePath, "utf-8");
    if (guide.length > 0) {
      // Truncate to ~4000 chars to leave room for other context
      const truncated = guide.length > 4000 ? guide.slice(0, 4000) + "\n..." : guide;
      parts.push(`\n## Study Guide\n${truncated}`);
    }
  } catch {
    // No study guide for this book — that's fine
  }

  // Reader position
  const position = getReaderPosition(bookId, userId);
  if (position) {
    parts.push(`\n## Where You Are\nChapter: ${position.chapterTitle}`);
    if (position.recentText) {
      parts.push(`Recent text:\n---\n${position.recentText}\n---`);
    }
  }

  return parts.join("\n");
}

type ReaderPosition = {
  chapterTitle: string;
  recentText: string | null;
};

/**
 * Get the reader's current chapter and recent text near their cursor position.
 */
function getReaderPosition(bookId: string, userId: string): ReaderPosition | null {
  const progressRows = db.getProgress(userId);
  const progress = progressRows.find((p) => p.book_id === bookId);
  if (!progress) return null;

  const chapter = db.getChapter(bookId, progress.chapter_number);
  if (!chapter) return null;

  const segments = db.getSegments(chapter.id);
  if (segments.length === 0) return { chapterTitle: chapter.title, recentText: null };

  // Find the segment nearest the audio position
  const audioMs = progress.audio_position_ms || 0;
  let targetIdx = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.audio_start_ms != null && seg.audio_start_ms <= audioMs) {
      targetIdx = i;
    }
  }

  // Grab ~2 paragraphs of text ending at the cursor
  const textSegments = segments.filter((s) => s.segment_type === "text");
  const targetSeq = segments[targetIdx].sequence;
  const nearbyText = textSegments
    .filter((s) => s.sequence <= targetSeq)
    .slice(-8) // last ~8 sentences ≈ 2 paragraphs
    .map((s) => s.text)
    .join(" ");

  return {
    chapterTitle: chapter.title,
    recentText: nearbyText.length > 0 ? nearbyText : null,
  };
}
