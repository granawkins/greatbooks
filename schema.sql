-- Great Books database schema
-- SQLite, lives at ./greatbooks.db

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,                  -- author-title slug (e.g. "homer-iliad")
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,                     -- relative path under public/covers/ (e.g. "homer-iliad.png")
  original_date TEXT,                   -- when the work was written (e.g. "~8th century BCE")
  translator TEXT,                      -- translator name (NULL for English originals)
  translation_date TEXT,                -- year of translation (e.g. "1898")
  source_url TEXT,                      -- URL where the text was sourced
  license TEXT,                         -- copyright status (e.g. "Public Domain")
  layout TEXT DEFAULT 'prose'           -- 'prose' (sentences flow) or 'verse' (line breaks between segments)
);

CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL REFERENCES books(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  audio_file TEXT,                      -- relative path to MP3 (NULL if no audio)
  audio_duration_ms INTEGER             -- total audio duration in milliseconds
);

-- A segment is the smallest unit of text: a sentence (prose) or line (poetry).
-- Consecutive 'text' segments form a paragraph; 'paragraph_break' segments split them.
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  sequence INTEGER NOT NULL,           -- ordering within chapter
  text TEXT NOT NULL DEFAULT '',
  segment_type TEXT NOT NULL DEFAULT 'text',  -- 'heading' | 'text' | 'paragraph_break'
  audio_start_ms INTEGER,              -- start time in chapter audio (ms)
  audio_end_ms INTEGER,                -- end time in chapter audio (ms)
  word_timestamps JSON                 -- [{start_ms, end_ms, char_start, char_end}, ...]
);

-- Users (anonymous by default — id is a UUID stored in the browser's localStorage)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Reading progress per user per book
CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT NOT NULL REFERENCES users(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  chapter_number INTEGER NOT NULL,
  audio_position_ms INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, book_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',  -- user: always 'completed'; assistant: 'pending'|'streaming'|'completed'|'error'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_segments_chapter ON segments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_book ON messages(user_id, book_id);
