---
name: generate-audio
description: Generate TTS audio for book chapters using Google Chirp3, then align word timestamps via STT.
user-invocable: true
allowed-tools: Read, Write, Bash
argument-hint: <book-id> [chapter-number]
---

# Generate Audio Skill

Generate AI-narrated audio for a book's chapters with word-level timestamps for the synced reading cursor.

## Workflow

1. **Load chapter segments from the database** — query all segments for the target chapter(s)
2. **Chunk segments into audio groups** — break on structural boundaries, targeting ~4 paragraphs per chunk
3. **Generate TTS** — run `generate_tts.py` for each chunk
4. **Align timestamps** — run `align_timestamps.py` to get word-level timing
5. **Store results** — insert `audio_chunks` rows with file paths and timestamps
6. **Update book SKILL.md** — note which chapters now have audio

## Audio Chunking Strategy

Audio chunks break on **structural boundaries only** — never mid-paragraph:

1. Collect paragraphs (groups of segments with the same `group_number`)
2. Accumulate paragraphs until you reach ~4 paragraphs or a section/chapter break
3. Each chunk becomes one audio file and one TTS API call
4. Section breaks and headings always start a new chunk

This produces natural-sounding audio without mid-thought cuts.

## Using generate_tts.py

```bash
python .claude/skills/generate-audio/generate_tts.py \
  --text "paragraph text here..." \
  --output data/<book-id>/audio/<chapter>-<chunk>.mp3
```

## Using align_timestamps.py

```bash
python .claude/skills/generate-audio/align_timestamps.py \
  --audio data/<book-id>/audio/<chapter>-<chunk>.mp3 \
  --segments '[{"id": 1, "text": "..."}]' \
  --output timestamps.json
```

Output:
```json
[
  {
    "segment_id": 1,
    "words": [
      {"text": "Rage", "start_ms": 0, "end_ms": 280},
      {"text": "Goddess", "start_ms": 310, "end_ms": 650}
    ]
  }
]
```

## Audio File Naming

Files are stored in `data/<book-id>/audio/` with the pattern:
```
<chapter_number>-<chunk_number>.mp3
```

Example: `data/iliad/audio/01-001.mp3` (chapter 1, chunk 1)

## TTS Configuration

- **Model**: Google Chirp3 (HD voices)
- **Voice**: TBD — choose a voice that suits the text
- **Format**: MP3, 24kHz
- **Speed**: 1.0x (normal reading pace)
