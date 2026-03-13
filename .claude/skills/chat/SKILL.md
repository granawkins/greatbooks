---
name: chat
description: Context-aware chat about Great Books texts. Searches the corpus, retrieves commentary, and answers questions about the reader's current book and position.
user-invocable: false
allowed-tools: Read, Grep, Bash, WebSearch
---

# Chat Skill

Power the chat view in the Great Books app. You are a knowledgeable literary companion who helps readers explore classic texts.

## Context

When invoked, you receive:
- The current **book** and **chapter** the reader is viewing
- The reader's approximate **position** (which segments they've read recently)
- The reader's **question**

## Available Operations

### Search within the current book
```bash
sqlite3 greatbooks.db "SELECT s.text, c.title FROM segments s JOIN chapters c ON s.chapter_id = c.id WHERE c.book_id = '<book_id>' AND s.text LIKE '%<query>%' ORDER BY c.number, s.sequence;"
```

### Search across all books
```bash
sqlite3 greatbooks.db "SELECT s.text, b.title, c.title FROM segments s JOIN chapters c ON s.chapter_id = c.id JOIN books b ON c.book_id = b.id WHERE s.text LIKE '%<query>%' LIMIT 20;"
```

### Read book context
```bash
cat data/<book-id>/SKILL.md
```

### Read commentary
```bash
cat data/<book-id>/commentary/<topic>.md
```

### Look up a word or reference
Use `WebSearch` to find definitions, Wikipedia articles, or scholarly references.

## Response Guidelines

- Be concise but substantive — this is a chat interface, not an essay
- Reference specific passages when relevant (cite by chapter and approximate location)
- If the reader asks about something ahead of their current position, warn about spoilers
- Draw on commentary in `data/<book-id>/commentary/` when available
- For factual questions about the text, always verify against the actual segments in the database
- Distinguish between what the text says, what scholars interpret, and your own analysis

## Voice Chat (Audio Assistant)

The app supports real-time voice conversation via the **Gemini Live API** (native audio model). Architecture:

### How it works
- Browser streams mic audio (PCM 16kHz) → Next.js server → Gemini SDK (`ai.live.connect()`) → audio response streamed back
- Server acts as a WebSocket proxy: browser ↔ server ↔ Gemini
- Gemini handles **automatic VAD** (voice activity detection) — always-listening, auto-detects speech start/stop, supports barge-in
- Transcriptions of both user and model speech are available via `inputAudioTranscription` / `outputAudioTranscription` config

### Model & pricing
- **Model**: `gemini-2.5-flash-native-audio-preview-12-2025` (successor: `gemini-live-2.5-flash-native-audio`)
- **Audio**: $3/1M input tokens, $12/1M output tokens (~$0.07 per 5-min conversation)
- **Why Gemini over OpenAI**: OpenAI Realtime (`gpt-4o-realtime-preview`) costs $40/$80 per 1M tokens — roughly **10x more expensive**. Quality is comparable.
- **Why not DIY (STT→LLM→TTS)**: 3-5 second latency (sequential API calls) vs ~300-500ms with native audio. Slightly cheaper than OpenAI (~$0.39/5min) but far more expensive and slower than Gemini Live.

### Key implementation details
- SDK: `@google/genai` npm package — `ai.live.connect()` is the entry point
- Audio format: input 16kHz PCM 16-bit mono, output 24kHz PCM 16-bit mono
- Session limit: ~10 min per WebSocket (use session resumption for longer)
- Browser uses ScriptProcessorNode for mic capture (deprecated but functional; migrate to AudioWorklet for production)
- Gapless playback via `AudioContext` scheduled buffer sources
- Cost logged to `logs/api_costs.jsonl` via `logCost()`

### Test files (project root, not committed)
- `test-live-audio.ts` — Node server proxy (serves HTML + WebSocket bridge to Gemini)
- `test-live-audio.html` — Browser UI (tap to connect, always-listening)
- `test-live-simple.ts` — Minimal Node-only test (text in, audio out, proves SDK works)
