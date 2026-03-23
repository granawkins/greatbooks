---
name: database
description: Reference for the Great Books SQLite database — schema, conventions, and common queries.
user-invocable: false
allowed-tools: Read, Bash
---

# Database Skill

The Great Books app uses a SQLite database at `./greatbooks.db`. The schema is defined in `schema.sql` at the project root.

## Initializing

```bash
sqlite3 greatbooks.db < schema.sql
```

## Schema Overview

- **books** — one row per book (id is `author-title` slug like `homer-iliad`)
- **chapters** — ordered by `number` within a book. Audio columns (`audio_file`, `audio_duration_ms`) are NULL until audio is generated.
- **segments** — the atomic text unit. A sentence (prose) or line (poetry). Ordered by `sequence` within a chapter. Audio timing columns (`audio_start_ms`, `audio_end_ms`, `word_timestamps`) are NULL until audio is generated.

## Segment Types

| `segment_type` | Meaning | Rendering |
|---|---|---|
| `text` | Normal content (sentence or line) | Consecutive text segments form a paragraph |
| `heading` | Inline heading (e.g. speaker labels in Republic) | Rendered as small uppercase label; also breaks paragraphs |
| `paragraph_break` | Paragraph boundary marker | Not rendered; splits consecutive text segments into separate paragraphs |

Consecutive `text` segments form a paragraph. Any non-text segment (`paragraph_break` or `heading`) splits them. The frontend handles grouping.

## Common Queries

### Get all chapters for a book
```sql
SELECT * FROM chapters WHERE book_id = ? ORDER BY number;
```

### Get segments for a chapter (for rendering)
```sql
SELECT * FROM segments WHERE chapter_id = ? ORDER BY sequence;
```

### Get audio info for a chapter
```sql
SELECT audio_file, audio_duration_ms
FROM chapters WHERE book_id = ? AND number = ?;
```

### Get segment timestamps for a chapter
```sql
SELECT s.id, s.text, s.audio_start_ms, s.audio_end_ms, s.word_timestamps
FROM segments s
WHERE s.chapter_id = ? AND s.audio_start_ms IS NOT NULL
ORDER BY s.sequence;
```

### Full-text search within a book
```sql
SELECT s.*, c.number as chapter_number, c.title as chapter_title
FROM segments s
JOIN chapters c ON s.chapter_id = c.id
WHERE c.book_id = ? AND s.text LIKE ?
ORDER BY c.number, s.sequence;
```

## Syncing from Production

The **remote database is the source of truth**. The local `greatbooks.db` is a read-only copy — never push local changes upstream. To get the latest data, run:

```bash
./db_sync.sh
```

This checkpoints WAL on the remote, downloads via rsync (with progress bar and bandwidth cap), and verifies integrity. Run this whenever you need data that was added in production (e.g. new books, user data).

## Conventions

- Always use parameterized queries (never string interpolation)
- Book IDs use `author-title` format: `homer-iliad`, `plato-republic`, `milton-paradise-lost`
- Segment sequences are 1-indexed, contiguous within a chapter
- Audio file paths are relative to the project root: `data/homer-iliad/audio/01.mp3`
- Word timestamps JSON format (on segments table): `[{start_ms, end_ms, char_start, char_end}]` — char indices reference `segments.text`
