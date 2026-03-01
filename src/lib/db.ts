/**
 * SQLite database connection and typed query helpers.
 *
 * Uses better-sqlite3 for synchronous, fast access from Next.js API routes.
 * The database file lives at ./greatbooks.db in the project root.
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const books = db.getBooks();
 */

// TODO: Install better-sqlite3
// import Database from 'better-sqlite3';
// import path from 'path';
//
// const DB_PATH = path.join(process.cwd(), 'greatbooks.db');
// const connection = new Database(DB_PATH, { readonly: false });
// connection.pragma('journal_mode = WAL');
// connection.pragma('foreign_keys = ON');

// -- Types matching the database schema --

export type BookRow = {
  id: string;
  title: string;
  author: string;
  description: string | null;
};

export type ChapterRow = {
  id: number;
  book_id: string;
  number: number;
  title: string;
};

export type SegmentRow = {
  id: number;
  chapter_id: number;
  sequence: number;
  text: string;
  segment_type: "heading" | "text" | "section_break";
  group_number: number | null;
};

export type AudioChunkRow = {
  id: number;
  chapter_id: number;
  chunk_number: number;
  start_segment_id: number;
  end_segment_id: number;
  file_path: string;
  duration_ms: number | null;
  word_timestamps: string | null; // JSON string
};

export type WordTimestamp = {
  text: string;
  start_ms: number;
  end_ms: number;
};

export type SegmentTimestamps = {
  segment_id: number;
  words: WordTimestamp[];
};

// -- Query helpers (placeholder) --

// TODO: Implement when better-sqlite3 is installed
// export const db = {
//   getBooks: (): BookRow[] =>
//     connection.prepare('SELECT * FROM books').all() as BookRow[],
//
//   getBook: (id: string): BookRow | undefined =>
//     connection.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined,
//
//   getChapters: (bookId: string): ChapterRow[] =>
//     connection.prepare('SELECT * FROM chapters WHERE book_id = ? ORDER BY number').all(bookId) as ChapterRow[],
//
//   getSegments: (chapterId: number): SegmentRow[] =>
//     connection.prepare('SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence').all(chapterId) as SegmentRow[],
//
//   getAudioChunks: (chapterId: number): AudioChunkRow[] =>
//     connection.prepare('SELECT * FROM audio_chunks WHERE chapter_id = ? ORDER BY chunk_number').all(chapterId) as AudioChunkRow[],
// };
