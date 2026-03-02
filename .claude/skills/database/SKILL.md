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

- **books** — one row per book (id is a slug like `iliad`)
- **chapters** — ordered by `number` within a book. Audio columns (`audio_file`, `audio_duration_ms`) are NULL until audio is generated.
- **segments** — the atomic text unit. A sentence (prose) or line (poetry). Ordered by `sequence` within a chapter. Grouped into paragraphs/stanzas by `group_number`. Audio timing columns (`audio_start_ms`, `audio_end_ms`, `word_timestamps`) are NULL until audio is generated.

## Segment Types

| `segment_type` | Meaning | Rendering |
|---|---|---|
| `text` | Normal content (sentence or line) | Rendered inline within its paragraph group |
| `heading` | Section heading within a chapter | Rendered as a subheading |
| `section_break` | Visual divider | Rendered as whitespace / decorative break |

Segments with the same `group_number` form a paragraph (prose) or stanza (poetry). A `NULL` group_number means the segment stands alone (headings, breaks).

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

## Conventions

- Always use parameterized queries (never string interpolation)
- Book IDs are lowercase slugs: `iliad`, `odyssey`, `republic`, `paradise-lost`
- Segment sequences are 1-indexed, contiguous within a chapter
- Group numbers are 1-indexed, contiguous within a chapter
- Audio file paths are relative to the project root: `data/iliad/audio/01.mp3`
- Word timestamps JSON format (on segments table): `[{start_ms, end_ms, char_start, char_end}]` — char indices reference `segments.text`
