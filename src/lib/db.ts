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

// Read-write connection for user mutations (progress, etc.)
const rwConnection = new Database(DB_PATH);
rwConnection.pragma("foreign_keys = ON");
rwConnection.pragma("busy_timeout = 5000");

// -- Types matching the database schema --

export type BookRow = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_image: string | null;
  original_date: string | null;
  translator: string | null;
  translation_date: string | null;
  source_url: string | null;
  license: string | null;
  layout: "prose" | "verse";
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
  segment_type: "heading" | "text" | "paragraph_break";
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

export type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
};

export type UserProgressRow = {
  user_id: string;
  book_id: string;
  chapter_number: number;
  audio_position_ms: number;
  updated_at: string;
};

export type MessageRow = {
  id: number;
  user_id: string;
  book_id: string;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "streaming" | "completed" | "error";
  created_at: string;
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

  // -- User & progress (read-write) --

  upsertUser: (id: string): void => {
    rwConnection
      .prepare("INSERT OR IGNORE INTO users (id) VALUES (?)")
      .run(id);
  },

  getUser: (id: string): UserRow | undefined =>
    connection
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as UserRow | undefined,

  getUserByEmail: (email: string): UserRow | undefined =>
    connection
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | undefined,

  updateUserEmail: (id: string, email: string): void => {
    rwConnection
      .prepare("UPDATE users SET email = ? WHERE id = ?")
      .run(email, id);
  },

  getProgress: (userId: string): UserProgressRow[] =>
    connection
      .prepare("SELECT * FROM user_progress WHERE user_id = ?")
      .all(userId) as UserProgressRow[],

  upsertProgress: (
    userId: string,
    bookId: string,
    chapterNumber: number,
    audioPositionMs: number
  ): void => {
    rwConnection
      .prepare(
        `INSERT INTO user_progress (user_id, book_id, chapter_number, audio_position_ms, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (user_id, book_id) DO UPDATE SET
           chapter_number = excluded.chapter_number,
           audio_position_ms = excluded.audio_position_ms,
           updated_at = excluded.updated_at`
      )
      .run(userId, bookId, chapterNumber, audioPositionMs);
  },

  getMessages: (userId: string, bookId: string): MessageRow[] =>
    connection
      .prepare(
        "SELECT * FROM messages WHERE user_id = ? AND book_id = ? ORDER BY id"
      )
      .all(userId, bookId) as MessageRow[],

  insertMessage: (
    userId: string,
    bookId: string,
    role: "user" | "assistant",
    text: string,
    status: "pending" | "completed" = "completed"
  ): MessageRow => {
    const result = rwConnection
      .prepare(
        "INSERT INTO messages (user_id, book_id, role, text, status) VALUES (?, ?, ?, ?, ?) RETURNING *"
      )
      .get(userId, bookId, role, text, status) as MessageRow;
    return result;
  },

  getBookStats: (): { book_id: string; chapter_count: number; total_duration_ms: number | null }[] =>
    connection
      .prepare(
        "SELECT book_id, COUNT(*) as chapter_count, SUM(audio_duration_ms) as total_duration_ms FROM chapters GROUP BY book_id"
      )
      .all() as { book_id: string; chapter_count: number; total_duration_ms: number | null }[],

  updateMessage: (
    id: number,
    text: string,
    status: "streaming" | "completed" | "error"
  ): void => {
    rwConnection
      .prepare("UPDATE messages SET text = ?, status = ? WHERE id = ?")
      .run(text, status, id);
  },
};
