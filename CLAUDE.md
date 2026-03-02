# Great Books

A webapp providing the best reading/listening experience, with AI enhancements, for select public-domain books.

## Vision

Combine the best of Audible + Kindle + ChatGPT voice-mode into one elegant interface for classic literature. Source texts from open repositories (Internet Classics Archive, Project Gutenberg, etc.).

## Core Features

### 1. Reader (Kindle-like)
- Clean, distraction-free reading interface for public-domain texts
- Click any word to: search it within the text, look it up on Wikipedia, get a definition
- Adjustable typography (font size, line spacing, theme)
- Position tracking and bookmarking
- Sliding cursor showing current position

### 2. Listener (Audible-like)
- AI-generated audio using Google Chirp3 TTS
- Standard audio controls: play/pause, skip, speed adjustment
- Chapter/section navigation
- Combined read+listen mode with synced sliding cursor highlighting text as audio plays

### 3. AI Chat (ChatGPT-like)
- Context-aware: sees your current position and recent reading
- Tools for searching the current book and the full corpus
- Access to public-domain commentary, supplementary materials, and background
- Searchable reference corpus (scholarly commentary, historical context, etc.)

## Corpus (Initial)
- Homer: *Iliad*, *Odyssey*
- Plato: *Republic*
- Milton: *Paradise Lost*
- (More to be added)

## Tech Stack
- **Next.js 16** with App Router and TypeScript
- **Tailwind CSS 4** for layout/utility classes
- **CSS custom properties** in `globals.css` for themeable colors/fonts
- **SQLite** (`greatbooks.db` at project root) via `better-sqlite3`, called directly by API routes. **WAL mode** is enabled on the DB file for concurrent access — Next.js opens readonly, Python scripts open read-write. Python writers should set `PRAGMA busy_timeout = 5000` to handle lock contention gracefully.
- **Python** scripts for content ingestion (parse HTML) and audio generation (TTS/STT); deps in `.claude/skills/generate-audio/requirements.txt`
- **Google Chirp3 HD** for TTS, **Google STT (Chirp 2)** for word-level timestamp alignment; credentials via `.env` + `google-credentials.json`

## Architecture Principles
- **CSS variables for theming** — swappable light/dark/custom via `:root` overrides
- **Flat component library** — reusable primitives in `src/components/` that reference CSS variables
- **Shallow hierarchy** — pages import components directly (max 3 levels deep)
- **AI-agent backend** — no traditional REST API; Claude skills define the workflows for content management, audio generation, and chat
- **File + DB hybrid** — structured data (text, timestamps, users) in SQLite; large artifacts (audio files, raw HTML, commentary markdown) on disk in `data/`

## Cost Tracking
All external API calls (TTS, STT, LLM, image) are logged to `logs/api_costs.jsonl` — one JSON line per call with timestamp, api type, provider, model, input units, estimated cost, and the relevant entity (book or user). The `logs/cost_log.py` module provides `log_cost()` for writing and `summarize()` for reading. TTS and STT scripts log automatically; any new API integration should import and call `log_cost()`. Set `GREATBOOKS_ENTITY_ID` env var to tag calls with the relevant book id.

## Data Model

### Segment — the atomic text unit
A **segment** is a sentence (prose) or line (poetry). Segments are the smallest unit we store, display, and annotate.

- Segments are ordered by `sequence` within a chapter
- Segments with the same `group_number` form a **paragraph** (prose) or **stanza** (poetry)
- `segment_type` controls rendering: `text` (normal), `heading` (subheading), `section_break` (visual divider)

### Audio
Audio is **one MP3 file per chapter** (e.g. `data/iliad/audio/01.mp3`). Internally, TTS is called in ~1800-char chunks (due to API limits), then the chunks are merged via ffmpeg concat into a single file. Word-level timestamps are offset to match the merged file's timeline.

Audio metadata lives directly on the `chapters` table: `audio_file` (path), `audio_duration_ms`, and `word_timestamps` (JSON). The frontend loads these for the synced reading cursor.

### Database schema
Defined in `schema.sql`. Tables: `books`, `chapters`, `segments`. See `.claude/skills/database/SKILL.md` for full reference.

## Skills

AI agents are the primary backend operators. Skills live in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `add-book` | Fetch public-domain text, parse HTML into segments, populate DB. Includes `parse_html.py`. |
| `generate-audio` | Generate TTS audio per chapter, align word timestamps via STT. Scripts: `tts.py`, `stt.py`, `generate_chapter.py`. |
| `chat` | Powers the chat view — searches text/commentary, answers questions with book context. |
| `database` | Schema reference, query patterns, conventions. Not user-invocable. |

Each book also has a `data/<book-id>/SKILL.md` with provenance, context, and status (not a discoverable skill — read by the chat skill for context).

## Project Structure
```
greatbooks.db                 ← SQLite database (gitignored, created via schema.sql)
schema.sql                    ← Database schema definition

src/
  app/
    page.tsx                  ← Home page (book grid)
    globals.css               ← CSS variables / theme
    [bookId]/
      read/page.tsx           ← Reader view (fetches from API)
      listen/page.tsx         ← Listener view (audio + synced text)
      chat/page.tsx           ← Chat view (placeholder)
    api/
      books/[bookId]/         ← Book + chapter metadata
      audio/[...path]/        ← Streams MP3 files from data/
  components/                 ← Flat: BookCard, TabBar, ChapterNav, AudioPlayer, etc.
  lib/db.ts                   ← SQLite connection (readonly) + typed query helpers
  data/books.ts               ← Book/chapter list for navigation (will be replaced by DB queries)

data/<book-id>/
  SKILL.md                    ← Provenance, context, audio status
  raw/                        ← Original source HTML
  audio/                      ← One MP3 per chapter + manifest JSON

logs/
  cost_log.py                 ← Shared cost-logging utility
  api_costs.jsonl             ← Append-only API call log (gitignored)

.claude/skills/
  add-book/                   ← Fetch + parse + insert book text
  generate-audio/             ← TTS + STT + merge + store audio
  chat/                       ← Chat agent (placeholder)
  database/                   ← Schema reference (not user-invocable)
```

## Known Issues / TODO
- `src/data/books.ts` still used for navigation (chapter list, home page). Should be replaced by DB queries so adding a book doesn't require editing TS.
- Listen page: word-level highlighting not yet implemented (currently paragraph-level only).
- `_mp3_duration_ms()` in `tts.py` undercounts after ffmpeg concat — always use `ffprobe` for merged file duration.
- Fagles/Lattimore translations are NOT public domain (post-1928) — only Butler, Jowett, and similar old translations work.
