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
  title TEXT NOT NULL
);

-- A segment is the smallest unit of text: a sentence (prose) or line (poetry).
-- Segments are grouped into paragraphs/stanzas by group_number.
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  sequence INTEGER NOT NULL,           -- ordering within chapter
  text TEXT NOT NULL DEFAULT '',
  segment_type TEXT NOT NULL DEFAULT 'text',  -- 'heading' | 'text' | 'section_break'
  group_number INTEGER                 -- paragraph/stanza grouping
);

-- Audio is chunked on structural boundaries (~4 paragraphs per chunk).
-- Each chunk maps to a contiguous range of segments.
CREATE TABLE IF NOT EXISTS audio_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  chunk_number INTEGER NOT NULL,
  start_segment_id INTEGER NOT NULL REFERENCES segments(id),
  end_segment_id INTEGER NOT NULL REFERENCES segments(id),
  file_path TEXT NOT NULL,
  duration_ms INTEGER,
  word_timestamps JSON                 -- [{segment_id, words: [{text, start_ms, end_ms}]}]
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_segments_chapter ON segments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_audio_chapter ON audio_chunks(chapter_id);
