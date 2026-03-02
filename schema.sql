-- Great Books database schema
-- SQLite, lives at ./greatbooks.db

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT
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
-- Segments are grouped into paragraphs/stanzas by group_number.
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  sequence INTEGER NOT NULL,           -- ordering within chapter
  text TEXT NOT NULL DEFAULT '',
  segment_type TEXT NOT NULL DEFAULT 'text',  -- 'heading' | 'text' | 'section_break'
  group_number INTEGER,                -- paragraph/stanza grouping
  audio_start_ms INTEGER,              -- start time in chapter audio (ms)
  audio_end_ms INTEGER,                -- end time in chapter audio (ms)
  word_timestamps JSON                 -- [{start_ms, end_ms, char_start, char_end}, ...]
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_segments_chapter ON segments(chapter_id);
