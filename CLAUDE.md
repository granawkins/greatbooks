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

### 3. AI Chat (Text + Voice)
- Context-aware: sees your current position, recent reading, and study guide
- Text chat: streamed responses via WebSocket (Gemini 2.5 Flash)
- Voice chat: real-time bidirectional audio via Gemini Live API (native audio model)
- Chat appears as a translucent overlay on top of the reader
- Transcripts from voice conversations are persisted alongside text messages
- All messages stored in `messages` table with `model` column tracking which model generated each response

## Corpus (Initial)
- Homer: *Iliad*, *Odyssey*
- Plato: *Republic*
- Milton: *Paradise Lost*
- (More to be added)

## Tech Stack
- **Next.js 16** with App Router and TypeScript
- **Tailwind CSS 4** for layout/utility classes
- **CSS custom properties** in `globals.css` for themeable colors/fonts
- **SQLite** (`greatbooks.db` at project root) via `better-sqlite3`, called directly by API routes and the chat server. **WAL mode** is enabled on the DB file for concurrent access — Next.js opens readonly, chat server and Python scripts open read-write. Python writers should set `PRAGMA busy_timeout = 5000` to handle lock contention gracefully.
- **Python** scripts for content ingestion (parse HTML) and audio/image generation; virtualenv at `.venv/` in project root — always run Python scripts with `.venv/bin/python`. Install deps with `.venv/bin/pip install`. Each skill has its own `requirements.txt`.
- **Google Chirp3 HD** for TTS, **Google STT (Chirp 2)** for word-level timestamp alignment; credentials via `.env` + `google-credentials.json`
- **Google Gemini 2.5 Flash** for text chat, **Gemini 2.5 Flash Native Audio** for voice chat

## Architecture

```
Browser ←WebSocket→ Chat Server (:3002) ←SDK→ Gemini Live API (voice)
                         ↕                ←REST SSE→ Gemini 2.5 Flash (text)
Browser ←HTTP→      Next.js (:3000)
                         ↕
                    SQLite (shared, WAL mode)
```

### Dual-server setup
- **Next.js** (:3000) — serves the frontend, REST API routes, audio streaming
- **Chat server** (:3002) — standalone Node/TypeScript WebSocket server for all chat (text + voice)
  - Run locally: `npm run chat-server`
  - Production: managed by pm2, nginx proxies `/ws/chat` to `:3002`
  - Auth: cookie in production, token query param in dev (cross-origin)

### Chat WebSocket protocol
Client → Server:
- `{ type: "text", text }` — send a text message
- `{ type: "voice_start" }` — begin voice session
- `{ type: "voice_stop" }` — end voice session
- `{ type: "audio", data }` — mic audio (base64 PCM 16kHz)

Server → Client:
- `{ type: "history", messages }` — sent on connect
- `{ type: "message", message }` — completed message (user or assistant)
- `{ type: "stream", messageId, text }` — text response chunk
- `{ type: "stream_end", messageId }` — text response complete
- `{ type: "audio", data }` — voice audio (base64 PCM 24kHz)
- `{ type: "output_transcript", text }` — voice model transcript fragment
- `{ type: "input_transcript", text }` — user speech transcript fragment
- `{ type: "voice_ready" }` — voice session established
- `{ type: "voice_stopped" }` — voice session ended
- `{ type: "turn_complete" }` — voice turn finished
- `{ type: "interrupted" }` — user interrupted model
- `{ type: "error", message }` — error

### Shared context
`src/lib/chatContext.ts` builds system prompts for both text and voice chat, including:
- Book metadata (title, author)
- Study guide content (from `data/<bookId>/STUDYGUIDE.md`)
- Reader position (current chapter + recent text near cursor)

## Architecture Principles
- **CSS variables for theming** — swappable light/dark/custom via `:root` overrides
- **Flat component library** — reusable primitives in `src/components/` that reference CSS variables
- **Shallow hierarchy** — pages import components directly (max 3 levels deep)
- **AI-agent backend** — no traditional REST API; Claude skills define the workflows for content management, audio generation, and chat
- **File + DB hybrid** — structured data (text, timestamps, users) in SQLite; large artifacts (audio files, raw HTML, commentary markdown) on disk in `data/`

## Cost Tracking
All external API calls (TTS, STT, LLM, image, realtime voice) are logged to `logs/api_costs.jsonl` — one JSON line per call with timestamp, api type, provider, model, input units, estimated cost, and the relevant entity (book or user). The `logs/cost_log.py` module provides `log_cost()` for writing and `summarize()` for reading. The JS equivalent is `src/lib/costLog.ts`. TTS and STT scripts log automatically; any new API integration should import and call `log_cost()` / `logCost()`. Set `GREATBOOKS_ENTITY_ID` env var to tag calls with the relevant book id.

Voice chat cost: calculated from audio bytes (32 tokens/sec × duration), logged on session close.

## Data Model

### Segment — the atomic text unit
A **segment** is a sentence (prose) or line (poetry). Segments are the smallest unit we store, display, and annotate.

- Segments are ordered by `sequence` within a chapter
- `segment_type` controls rendering: `text` (normal content), `heading` (inline subheading, e.g. speaker labels), `paragraph_break` (splits consecutive text segments into separate paragraphs)
- Consecutive `text` segments form a paragraph; any non-text segment breaks the group
- The API returns raw segments; the frontend handles paragraph grouping and rendering

### Audio
Audio is **one MP3 file per chapter** (e.g. `data/homer-iliad/audio/01.mp3`). Internally, TTS is called in ~1800-char chunks (due to API limits), then the chunks are merged via ffmpeg concat into a single file. Word-level timestamps are offset to match the merged file's timeline.

Chapter-level audio metadata (`audio_file`, `audio_duration_ms`) lives on the `chapters` table. Word-level timestamps live on each **segment** row:
- `audio_start_ms` / `audio_end_ms` — when the segment starts/ends in the chapter MP3
- `word_timestamps` (JSON) — `[{start_ms, end_ms, char_start, char_end}]` where `char_start`/`char_end` are character indices into `segments.text` (no duplicated word strings)

### Database schema
Defined in `schema.sql`. Tables: `books`, `chapters`, `segments`, `users`, `user_progress`, `messages`. See `.claude/skills/database/SKILL.md` for full reference.

The `messages` table has a `model` column (TEXT, nullable) that records which model generated each response (e.g. `gemini-2.5-flash`, `gemini-2.5-flash-native-audio-preview-12-2025`). User messages have `model = NULL`.

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
      page.tsx                ← Book view (text reader + chat overlay); audio managed globally
    api/
      books/[bookId]/         ← Book + chapter metadata
      audio/[...path]/        ← Streams MP3 files from data/
      chat/                   ← Text chat REST API (legacy fallback)
      chat/token/             ← Short-lived JWT for WS auth in dev
  components/
    chat/
      ChatView.tsx            ← Translucent overlay with text input + voice controls
      ChatMessage.tsx         ← Message bubble component
      useChatSocket.ts        ← React hook: WS connection, text/voice, audio playback
    reader/                   ← Reader components (ChapterBlocks, BookHeader, etc.)
    audio/                    ← Audio player components
  lib/
    db.ts                     ← SQLite connection (readonly + read-write) + typed query helpers
    chatContext.ts            ← Shared context builder (study guide + reader position)
    costLog.ts                ← JS cost logging (mirrors logs/cost_log.py)
    llm.ts                    ← Text chat via Gemini REST SSE (used by /api/chat fallback)
    AudioPlayerContext.tsx     ← Global audio session context (persists across navigation)
  server/
    chat-server.ts            ← Standalone WS server for text + voice chat (:3002)
    chat-session.ts           ← Per-connection session: text streaming + voice proxy
    voice-cost.ts             ← Audio byte → token → cost calculation

public/
  audio-capture.js            ← AudioWorklet processor for mic capture (16kHz PCM)

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
- Word-level highlighting implemented; uses `word_timestamps` on segments with char indices.
- `_mp3_duration_ms()` in `tts.py` undercounts after ffmpeg concat — always use `ffprobe` for merged file duration.
- Fagles/Lattimore translations are NOT public domain (post-1928) — only Butler, Jowett, and similar old translations work.
