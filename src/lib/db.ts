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

// -- Migrations --
rwConnection.exec(`
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    start_segment_seq INTEGER NOT NULL,
    start_char INTEGER NOT NULL,
    end_segment_seq INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('highlight', 'comment')),
    color TEXT DEFAULT 'yellow',
    comment_text TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON annotations(user_id, book_id, chapter_number);
`);

// Add type column to books (course support)
try {
  rwConnection.exec(`ALTER TABLE books ADD COLUMN type TEXT DEFAULT 'book'`);
} catch { /* column already exists */ }

// Add playback_speed column to users
try {
  rwConnection.exec(`ALTER TABLE users ADD COLUMN playback_speed REAL DEFAULT 1.0`);
} catch { /* column already exists */ }

// Add user_sessions table
rwConnection.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT NOT NULL REFERENCES books(id),
    chapter_number INTEGER NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('listen', 'read')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_ms INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, started_at);
`);

// Add source_chapter_id and chapter_type columns to chapters (course support)
try {
  rwConnection.exec(`ALTER TABLE chapters ADD COLUMN source_chapter_id INTEGER`);
} catch { /* column already exists */ }
try {
  rwConnection.exec(`ALTER TABLE chapters ADD COLUMN chapter_type TEXT DEFAULT 'text'`);
} catch { /* column already exists */ }

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
  type: "book" | "course";
};

export type ChapterRow = {
  id: number;
  book_id: string;
  number: number;
  title: string;
  audio_file: string | null;
  audio_duration_ms: number | null;
  source_chapter_id: number | null;
  chapter_type: "text" | "discussion";
};

export type SegmentRow = {
  id: number;
  chapter_id: number;
  sequence: number;
  text: string;
  segment_type: "heading" | "text" | "paragraph_break" | "list_item";
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
  playback_speed: number;
  created_at: string;
};

export type UserProgressRow = {
  user_id: string;
  book_id: string;
  chapter_number: number;
  audio_position_ms: number;
  updated_at: string;
};

export type ProgressWithBookRow = UserProgressRow & {
  title: string;
  author: string;
  type: "book" | "course";
};

export type MessageRow = {
  id: number;
  user_id: string;
  book_id: string;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "streaming" | "completed" | "error";
  model: string | null;
  created_at: string;
};

export type UserSessionRow = {
  id: number;
  user_id: string;
  book_id: string;
  chapter_number: number;
  mode: "listen" | "read";
  started_at: string;
  ended_at: string;
  duration_ms: number;
};

export type AnnotationRow = {
  id: number;
  user_id: string;
  book_id: string;
  chapter_number: number;
  start_segment_seq: number;
  start_char: number;
  end_segment_seq: number;
  end_char: number;
  type: "highlight" | "comment";
  color: string;
  comment_text: string | null;
  created_at: string;
};

// -- Query helpers --

export const db = {
  getBooks: (type?: "book" | "course"): BookRow[] => {
    if (type) {
      return connection.prepare("SELECT * FROM books WHERE type = ?").all(type) as BookRow[];
    }
    return connection.prepare("SELECT * FROM books").all() as BookRow[];
  },

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

  getSegments: (chapterId: number): SegmentRow[] => {
    // Check if this chapter references another chapter (course reference chapter)
    const chapter = connection
      .prepare("SELECT source_chapter_id FROM chapters WHERE id = ?")
      .get(chapterId) as { source_chapter_id: number | null } | undefined;
    const resolvedId = chapter?.source_chapter_id ?? chapterId;
    return connection
      .prepare("SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence")
      .all(resolvedId) as SegmentRow[];
  },

  /** For a course reference chapter, get the source book_id and chapter number for annotations */
  getSourceBookInfo: (bookId: string, chapterNum: number): { bookId: string; chapterNumber: number } | null => {
    const chapter = connection
      .prepare("SELECT source_chapter_id FROM chapters WHERE book_id = ? AND number = ?")
      .get(bookId, chapterNum) as { source_chapter_id: number | null } | undefined;
    if (!chapter?.source_chapter_id) return null;
    const source = connection
      .prepare("SELECT book_id, number FROM chapters WHERE id = ?")
      .get(chapter.source_chapter_id) as { book_id: string; number: number } | undefined;
    if (!source) return null;
    return { bookId: source.book_id, chapterNumber: source.number };
  },

  /** Resolve a chapter's audio info, following source_chapter_id if set */
  getResolvedChapter: (chapterId: number): ChapterRow | undefined => {
    const chapter = connection
      .prepare("SELECT * FROM chapters WHERE id = ?")
      .get(chapterId) as ChapterRow | undefined;
    if (!chapter) return undefined;
    if (chapter.source_chapter_id) {
      const source = connection
        .prepare("SELECT * FROM chapters WHERE id = ?")
        .get(chapter.source_chapter_id) as ChapterRow | undefined;
      if (source) {
        // Return the course chapter but with source's audio info
        return {
          ...chapter,
          audio_file: source.audio_file,
          audio_duration_ms: source.audio_duration_ms,
        };
      }
    }
    return chapter;
  },

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

  updatePlaybackSpeed: (id: string, speed: number): void => {
    rwConnection
      .prepare("UPDATE users SET playback_speed = ? WHERE id = ?")
      .run(speed, id);
  },

  getProgress: (userId: string): UserProgressRow[] =>
    connection
      .prepare("SELECT * FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as UserProgressRow[],

  getProgressWithBooks: (userId: string): ProgressWithBookRow[] =>
    connection
      .prepare(
        `SELECT p.*, b.title, b.author, b.type
         FROM user_progress p
         JOIN books b ON p.book_id = b.id
         WHERE p.user_id = ?
         ORDER BY p.updated_at DESC`
      )
      .all(userId) as ProgressWithBookRow[],

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
    status: "pending" | "completed" = "completed",
    model: string | null = null
  ): MessageRow => {
    const result = rwConnection
      .prepare(
        "INSERT INTO messages (user_id, book_id, role, text, status, model) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
      )
      .get(userId, bookId, role, text, status, model) as MessageRow;
    return result;
  },

  getBookStats: (): { book_id: string; chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number }[] =>
    connection
      .prepare(
        `SELECT c.book_id,
                COUNT(*) as chapter_count,
                SUM(COALESCE(c.audio_duration_ms, src.audio_duration_ms)) as total_duration_ms,
                COALESCE(SUM(
                  (SELECT SUM(LENGTH(s.text)) FROM segments s
                   WHERE s.chapter_id = COALESCE(c.source_chapter_id, c.id)
                   AND s.segment_type = 'text')
                ), 0) as total_chars,
                SUM(CASE WHEN c.chapter_type = 'discussion' THEN 1 ELSE 0 END) as discussion_count
         FROM chapters c
         LEFT JOIN chapters src ON c.source_chapter_id = src.id
         GROUP BY c.book_id`
      )
      .all() as { book_id: string; chapter_count: number; total_duration_ms: number | null; total_chars: number; discussion_count: number }[],

  updateMessage: (
    id: number,
    text: string,
    status: "streaming" | "completed" | "error"
  ): void => {
    rwConnection
      .prepare("UPDATE messages SET text = ?, status = ? WHERE id = ?")
      .run(text, status, id);
  },

  // -- Annotations (read-write) --

  getAnnotations: (userId: string, bookId: string, chapterNumber: number): AnnotationRow[] =>
    rwConnection
      .prepare(
        "SELECT * FROM annotations WHERE user_id = ? AND book_id = ? AND chapter_number = ? ORDER BY id"
      )
      .all(userId, bookId, chapterNumber) as AnnotationRow[],

  insertAnnotation: (
    userId: string,
    bookId: string,
    chapterNumber: number,
    startSegmentSeq: number,
    startChar: number,
    endSegmentSeq: number,
    endChar: number,
    type: "highlight" | "comment",
    color: string = "yellow",
    commentText: string | null = null
  ): AnnotationRow => {
    return rwConnection
      .prepare(
        `INSERT INTO annotations
          (user_id, book_id, chapter_number, start_segment_seq, start_char, end_segment_seq, end_char, type, color, comment_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
      )
      .get(userId, bookId, chapterNumber, startSegmentSeq, startChar, endSegmentSeq, endChar, type, color, commentText) as AnnotationRow;
  },

  updateAnnotationComment: (id: number, userId: string, commentText: string): boolean => {
    const result = rwConnection
      .prepare("UPDATE annotations SET comment_text = ? WHERE id = ? AND user_id = ?")
      .run(commentText, id, userId);
    return result.changes > 0;
  },

  deleteAnnotation: (id: number, userId: string): boolean => {
    const result = rwConnection
      .prepare("DELETE FROM annotations WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return result.changes > 0;
  },

  // -- Session tracking --

  /** Extend the most recent session if it matches, otherwise create a new one.
   *  A session is "continuable" if same user/book/chapter/mode and ended < 30s ago. */
  extendOrCreateSession: (
    userId: string,
    bookId: string,
    chapterNumber: number,
    mode: "listen" | "read",
    durationMs: number
  ): void => {
    if (durationMs <= 0) return;
    const SESSION_GAP_SECONDS = 30;
    const recent = rwConnection
      .prepare(
        `SELECT id, ended_at FROM user_sessions
         WHERE user_id = ? AND book_id = ? AND chapter_number = ? AND mode = ?
         ORDER BY ended_at DESC LIMIT 1`
      )
      .get(userId, bookId, chapterNumber, mode) as
      | { id: number; ended_at: string }
      | undefined;

    if (
      recent &&
      (Date.now() - new Date(recent.ended_at + "Z").getTime()) / 1000 <
        SESSION_GAP_SECONDS
    ) {
      rwConnection
        .prepare(
          `UPDATE user_sessions
           SET duration_ms = duration_ms + ?, ended_at = datetime('now')
           WHERE id = ?`
        )
        .run(durationMs, recent.id);
    } else {
      rwConnection
        .prepare(
          `INSERT INTO user_sessions (user_id, book_id, chapter_number, mode, duration_ms)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(userId, bookId, chapterNumber, mode, durationMs);
    }
  },

  /** Get total usage in ms by mode, optionally filtered to a month (YYYY-MM). */
  getUserUsageSummary: (
    userId: string,
    month?: string
  ): { listen_ms: number; read_ms: number } => {
    const where = month
      ? `WHERE user_id = ? AND started_at >= ? AND started_at < date(?, '+1 month')`
      : `WHERE user_id = ?`;
    const params = month
      ? [userId, `${month}-01`, `${month}-01`]
      : [userId];
    const rows = rwConnection
      .prepare(
        `SELECT mode, COALESCE(SUM(duration_ms), 0) as total_ms
         FROM user_sessions ${where} GROUP BY mode`
      )
      .all(...params) as { mode: string; total_ms: number }[];
    const result = { listen_ms: 0, read_ms: 0 };
    for (const row of rows) {
      if (row.mode === "listen") result.listen_ms = row.total_ms;
      else if (row.mode === "read") result.read_ms = row.total_ms;
    }
    return result;
  },

  // -- Course helpers --

  /** Get distinct source book IDs for a course, ordered by first appearance */
  getCourseBookIds: (courseId: string): string[] => {
    const rows = connection
      .prepare(`
        SELECT sc.book_id, MIN(cc.number) as first_appearance
        FROM chapters cc
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE cc.book_id = ?
        GROUP BY sc.book_id
        ORDER BY first_appearance
      `)
      .all(courseId) as { book_id: string; first_appearance: number }[];
    return rows.map((r) => r.book_id);
  },

  /** Get distinct source books for a course up to a given chapter number, ordered by first appearance */
  getCourseSourceBooksUpTo: (courseId: string, upToChapter: number): { book_id: string; title: string; author: string }[] => {
    return connection
      .prepare(`
        SELECT DISTINCT b.id as book_id, b.title, b.author, MIN(cc.number) as first_appearance
        FROM chapters cc
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        JOIN books b ON sc.book_id = b.id
        WHERE cc.book_id = ? AND cc.number <= ?
        GROUP BY b.id
        ORDER BY first_appearance
      `)
      .all(courseId, upToChapter) as { book_id: string; title: string; author: string; first_appearance: number }[];
  },

  /** Find courses that contain chapters from the given book */
  getCoursesForBook: (bookId: string): { course_id: string; course_title: string }[] => {
    return connection
      .prepare(`
        SELECT DISTINCT b.id as course_id, b.title as course_title
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        WHERE b.type = 'course' AND sc.book_id = ?
      `)
      .all(bookId) as { course_id: string; course_title: string }[];
  },

  /** Find a course the user is enrolled in (has progress) that contains the given book.
   *  Returns the course info + which course chapter corresponds to the user's book progress. */
  getEnrolledCourseForBook: (userId: string, bookId: string): {
    courseId: string;
    courseTitle: string;
    currentCourseChapter: number;
  } | null => {
    // Find courses containing this book where user has progress
    const row = connection
      .prepare(`
        SELECT b.id as course_id, b.title as course_title, up.chapter_number
        FROM books b
        JOIN chapters cc ON cc.book_id = b.id
        JOIN chapters sc ON cc.source_chapter_id = sc.id
        JOIN user_progress up ON up.book_id = b.id AND up.user_id = ?
        WHERE b.type = 'course' AND sc.book_id = ?
        LIMIT 1
      `)
      .get(userId, bookId) as { course_id: string; course_title: string; chapter_number: number } | undefined;
    if (!row) return null;
    return {
      courseId: row.course_id,
      courseTitle: row.course_title,
      currentCourseChapter: row.chapter_number,
    };
  },
};
