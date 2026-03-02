/**
 * SQLite database connection and typed query helpers.
 *
 * Uses better-sqlite3 for synchronous, fast access from Next.js server code.
 * The database file lives at ./greatbooks.db in the project root.
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "greatbooks.db");
const connection = new Database(DB_PATH, { readonly: true });
connection.pragma("foreign_keys = ON");

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
  audio_file: string | null;
  audio_duration_ms: number | null;
};

export type SegmentRow = {
  id: number;
  chapter_id: number;
  sequence: number;
  text: string;
  segment_type: "heading" | "text" | "section_break";
  group_number: number | null;
  audio_start_ms: number | null;
  audio_end_ms: number | null;
  word_timestamps: string | null; // JSON string
};

export type WordTimestamp = {
  start_ms: number;
  end_ms: number;
  char_start: number;
  char_end: number;
};

// -- Query helpers --

export const db = {
  getBooks: (): BookRow[] =>
    connection.prepare("SELECT * FROM books").all() as BookRow[],

  getBook: (id: string): BookRow | undefined =>
    connection
      .prepare("SELECT * FROM books WHERE id = ?")
      .get(id) as BookRow | undefined,

  getChapters: (bookId: string): ChapterRow[] =>
    connection
      .prepare("SELECT * FROM chapters WHERE book_id = ? ORDER BY number")
      .all(bookId) as ChapterRow[],

  getChapter: (bookId: string, number: number): ChapterRow | undefined =>
    connection
      .prepare(
        "SELECT * FROM chapters WHERE book_id = ? AND number = ?"
      )
      .get(bookId, number) as ChapterRow | undefined,

  getSegments: (chapterId: number): SegmentRow[] =>
    connection
      .prepare(
        "SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence"
      )
      .all(chapterId) as SegmentRow[],
};
