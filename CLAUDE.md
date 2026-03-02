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
- **SQLite** (`greatbooks.db` at project root) via `better-sqlite3`, called directly by API routes
- **Python** scripts for content ingestion (parse HTML) and audio generation (TTS/STT); deps in `.claude/skills/generate-audio/requirements.txt`
- **Google Chirp3 HD** for TTS, **Google STT (Chirp 2)** for word-level timestamp alignment; credentials via `.env` + `google-credentials.json`

## Architecture Principles
- **CSS variables for theming** — swappable light/dark/custom via `:root` overrides
- **Flat component library** — reusable primitives in `src/components/` that reference CSS variables
- **Shallow hierarchy** — pages import components directly (max 3 levels deep)
- **AI-agent backend** — no traditional REST API; Claude skills define the workflows for content management, audio generation, and chat
- **File + DB hybrid** — structured data (text, timestamps, users) in SQLite; large artifacts (audio files, raw HTML, commentary markdown) on disk in `data/`

## Data Model

### Segment — the atomic text unit
A **segment** is a sentence (prose) or line (poetry). Segments are the smallest unit we store, display, and annotate.

- Segments are ordered by `sequence` within a chapter
- Segments with the same `group_number` form a **paragraph** (prose) or **stanza** (poetry)
- `segment_type` controls rendering: `text` (normal), `heading` (subheading), `section_break` (visual divider)

### Audio chunking
Audio is generated in chunks of ~4 paragraphs, breaking only on structural boundaries (paragraph, section, or chapter breaks). Never mid-paragraph. Each chunk is one TTS API call and one mp3 file.

Word-level timestamps are stored as JSON on each audio chunk, mapping words back to their source segments. The frontend loads these for the synced reading cursor.

### Database schema
Defined in `schema.sql`. Tables: `books`, `chapters`, `segments`, `audio_chunks`. See `.claude/skills/database/SKILL.md` for full reference.

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
greatbooks.db                 ← SQLite database
schema.sql                    ← Database schema definition
.env                          ← Google API credentials (gitignored)
google-credentials.json       ← Google service account key (gitignored)

data/
  <book-id>/
    SKILL.md                  ← Provenance, context, audio status
    raw/                      ← Original source HTML
    audio/                    ← Generated TTS audio (mp3)
    commentary/               ← Scholarly context (markdown)

.claude/skills/
  add-book/
    SKILL.md                  ← Workflow instructions
    parse_html.py             ← HTML → chapters/segments JSON
  generate-audio/
    SKILL.md                  ← TTS + timestamp workflow
    tts.py                    ← Text → MP3 via Google Chirp3 HD (CLI + importable)
    stt.py                    ← MP3 → word timestamps via Google STT + Needleman-Wunsch alignment (CLI + importable)
    generate_chapter.py       ← Orchestrator: chunks segments, runs TTS + STT in a loop (CLI + importable)
    requirements.txt          ← Python dependencies
  chat/
    SKILL.md                  ← Chat agent instructions
  database/
    SKILL.md                  ← Schema reference + query patterns

src/
  app/
    layout.tsx                ← Root layout (font, metadata)
    page.tsx                  ← Home page (book grid)
    globals.css               ← CSS variables / theme
    [bookId]/
      layout.tsx              ← Book layout (back link + title + tab bar)
      page.tsx                ← Redirects to /read
      read/page.tsx           ← Reader view
      listen/page.tsx         ← Listener view
      chat/page.tsx           ← Chat view
  components/
    BookCard.tsx              ← Book card for home grid
    TabBar.tsx                ← Read/Listen/Chat navigation tabs
    IconButton.tsx            ← Reusable icon button
    ChapterNav.tsx            ← Chapter selector sidebar
    AudioPlayer.tsx           ← Audio player bar
    ChatMessage.tsx           ← Chat message bubble
    ChatInput.tsx             ← Chat text input + send button
  lib/
    db.ts                     ← SQLite connection + typed query helpers
  data/
    books.ts                  ← Book/Chapter types + dummy data (temporary)
```
