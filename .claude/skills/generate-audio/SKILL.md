---
name: generate-audio
description: Generate TTS audio for book chapters using Google Chirp3, then align word timestamps via STT.
user-invocable: true
allowed-tools: Read, Write, Bash
argument-hint: <book-id> [chapter-number]
---

# Generate Audio Skill

Generate AI-narrated audio for a book's chapters with word-level timestamps for the synced reading cursor.

## Setup

```bash
pip install -r .claude/skills/generate-audio/requirements.txt
```

Requires `.env` at project root with:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

## Scripts

### tts.py — Text-to-Speech

Generates MP3 audio from text using Google Chirp3 HD.

**CLI:**
```bash
python .claude/skills/generate-audio/tts.py --text "Hello world" --output out.mp3
python .claude/skills/generate-audio/tts.py --file input.txt --output out.mp3 --voice Orus
```

**Importable:**
```python
from tts import generate
result = generate("Hello world", "out.mp3", voice="Charon")
# Returns {"file_path": str, "duration_ms": int}
```

Max 2000 characters per call. Available voices: Charon, Orus, Kore, Puck, Zephyr, Aoede, and others (see [Chirp3 HD docs](https://cloud.google.com/text-to-speech/docs/chirp3-hd)).

### stt.py — Speech-to-Text + Word Alignment

Transcribes audio via Google STT and aligns word timestamps back to source segments using Needleman-Wunsch.

**CLI (transcribe only):**
```bash
python .claude/skills/generate-audio/stt.py --audio chunk.mp3
```

**CLI (transcribe + align):**
```bash
python .claude/skills/generate-audio/stt.py \
  --audio chunk.mp3 \
  --segments '[{"id": 1, "text": "Hello world"}]' \
  --output timestamps.json
```

**Importable:**
```python
from stt import transcribe, align, transcribe_and_align

# Raw STT words
words = transcribe("chunk.mp3")
# Returns [{"word": str, "start": float, "end": float}]

# Align to segments
result = transcribe_and_align("chunk.mp3", [{"id": 1, "text": "Hello world"}])
# Returns [{"segment_id": int, "words": [{"text": str, "start_ms": int, "end_ms": int}]}]
```

### generate_chapter.py — Chapter Orchestrator

Chunks segments by paragraph boundaries, runs TTS + STT for each chunk, outputs MP3s and a manifest.

**CLI:**
```bash
python .claude/skills/generate-audio/generate_chapter.py \
  --segments segments.json \
  --output-dir data/iliad/audio/ \
  --chapter 1 \
  --voice Charon
```

**Importable:**
```python
from generate_chapter import generate_chapter, chunk_segments
manifest = generate_chapter(segments, "data/iliad/audio/", chapter_number=1, voice="Charon")
```

Input segments JSON: `[{"id", "sequence", "text", "segment_type", "group_number"}]`

Output: MP3 files (`01-001.mp3`, `01-002.mp3`, ...) and `01-manifest.json`.

## Workflow

1. **Load chapter segments from the database** — query all segments for the target chapter(s)
2. **Export segments to JSON** — `generate_chapter.py` expects `[{"id", "sequence", "text", "segment_type", "group_number"}]`
3. **Run generate_chapter.py** — produces MP3 files + manifest
4. **Store results** — insert `audio_chunks` rows from the manifest (file paths, durations, word timestamps)
5. **Update book SKILL.md** — note which chapters now have audio

## Audio Chunking Strategy

Audio chunks break on **structural boundaries only** — never mid-paragraph:

1. Collect paragraphs (groups of segments with the same `group_number`)
2. Accumulate paragraphs until reaching ~1800 chars (90% of TTS limit) or a section/chapter break
3. Section breaks and headings always start a new chunk
4. Each chunk becomes one MP3 file, one TTS call, and one STT call

## Audio File Naming

```
<chapter_number>-<chunk_number>.mp3
```
Example: `data/iliad/audio/01-001.mp3` (chapter 1, chunk 1)

Manifest: `data/iliad/audio/01-manifest.json`

## TTS Configuration

- **Model**: Google Chirp3 HD
- **Default voice**: Charon
- **Format**: MP3, 24kHz
- **Max input**: 2000 characters per call
