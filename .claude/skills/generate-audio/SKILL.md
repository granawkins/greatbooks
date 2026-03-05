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

Generates MP3 audio from text using **Google Chirp3 HD** or **ElevenLabs**. Includes retry with backoff for transient errors.

**CLI (Google — default):**
```bash
python .claude/skills/generate-audio/tts.py --text "Hello world" --output out.mp3
python .claude/skills/generate-audio/tts.py --file input.txt --output out.mp3 --voice Orus
```

**CLI (ElevenLabs):**
```bash
python .claude/skills/generate-audio/tts.py --text "Hello world" --output out.mp3 \
  --provider elevenlabs --voice "Frederick Surrey"
python .claude/skills/generate-audio/tts.py --text "Hello world" --output out.mp3 \
  --provider elevenlabs --model eleven_multilingual_v2
```

**Importable:**
```python
from tts import generate

# Google (default)
result = generate("Hello world", "out.mp3", voice="Algieba")

# ElevenLabs
result = generate("Hello world", "out.mp3", provider="elevenlabs", voice="Frederick Surrey")
result = generate("Hello world", "out.mp3", provider="elevenlabs", model="eleven_multilingual_v2")
# Returns {"file_path": str, "duration_ms": int}
```

**Google**: Max 2000 chars/call. Voices: Algieba, Orus, Kore, Puck, Zephyr, Aoede ([Chirp3 HD docs](https://cloud.google.com/text-to-speech/docs/chirp3-hd)).

**ElevenLabs**: Max 5000 chars/call. Voices: Frederick Surrey (default). Models: `eleven_v3` (default, best quality), `eleven_multilingual_v2`, `eleven_flash_v2_5` (fastest/cheapest). Voice ID `j9jfwdrw7BRfcR43Qohk`.

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
# Returns [{
#   "segment_id": int,
#   "audio_start_ms": int,
#   "audio_end_ms": int,
#   "words": [{"start_ms": int, "end_ms": int, "char_start": int, "char_end": int}]
# }]
```

### generate_chapter.py — Chapter Orchestrator

Chunks segments by paragraph boundaries, runs TTS + STT for each chunk. Skips chunks whose MP3 already exists (resumable).

**CLI:**
```bash
python .claude/skills/generate-audio/generate_chapter.py \
  --segments segments.json \
  --output-dir data/iliad/audio/ \
  --chapter 1 \
  --voice Algieba
```

**Importable:**
```python
from generate_chapter import generate_chapter, chunk_segments
manifest = generate_chapter(segments, "data/iliad/audio/", chapter_number=1, voice="Algieba")
```

Input segments JSON: `[{"id", "sequence", "text", "segment_type", "group_number"}]`

Output: Single merged MP3 (`01.mp3`) with word timestamps offset to the merged timeline. Chunk MP3s are created temporarily and deleted after merge.

## Workflow

### 1. Export segments from DB
```bash
python3 -c "
import sqlite3, json
conn = sqlite3.connect('greatbooks.db')
rows = conn.execute('''
    SELECT s.id, s.sequence, s.text, s.segment_type, s.group_number
    FROM segments s JOIN chapters c ON s.chapter_id = c.id
    WHERE c.book_id = '<BOOK_ID>' AND c.number = <CHAPTER_NUM>
    ORDER BY s.sequence
''').fetchall()
segments = [{'id':r[0],'sequence':r[1],'text':r[2],'segment_type':r[3],'group_number':r[4]} for r in rows]
with open('/tmp/segments.json','w') as f: json.dump(segments, f)
print(f'{len(segments)} segments')
"
```

### 2. Generate TTS chunks
```bash
GREATBOOKS_ENTITY_ID=<BOOK_ID> python3 .claude/skills/generate-audio/generate_chapter.py \
  --segments /tmp/segments.json \
  --output-dir data/<BOOK_ID>/audio/ \
  --chapter <CHAPTER_NUM> \
  --voice Algieba
```

### 3. Store in database
`generate_chapter.py` merges chunks automatically (via `merge_chunks()`), but the caller must update the DB:
```sql
UPDATE chapters SET audio_file = 'data/<BOOK_ID>/audio/<NN>.mp3',
    audio_duration_ms = <MERGED_DURATION_MS>
WHERE book_id = '<BOOK_ID>' AND number = <CHAPTER_NUM>;

-- For each segment in manifest['chunks'][*]['word_timestamps'][*]:
UPDATE segments SET audio_start_ms = ?, audio_end_ms = ?, word_timestamps = ?
WHERE id = <SEGMENT_ID>;
```

### 4. Update book SKILL.md and check costs

## Audio Chunking Strategy (Internal)

TTS has a 2000-character limit, so text is chunked for API calls:

1. Collect paragraphs (groups of segments with the same `group_number`)
2. Accumulate paragraphs until reaching ~1800 chars (soft limit) or a section/chapter break
3. Hard-break at 2000 chars even mid-paragraph if needed
4. Section breaks and headings always start a new chunk
5. Each chunk = one TTS call + one STT call
6. After all chunks are generated, they are **merged into a single MP3 per chapter**

## Audio File Naming

Final output (one file per chapter):
```
data/<book-id>/audio/<chapter_number>.mp3
```
Example: `data/iliad/audio/01.mp3`

## TTS Configuration

### Google Chirp3 HD (default)
- **Default voice**: Algieba
- **Format**: MP3, 24kHz
- **Max input**: 2000 characters per call
- **Cost**: ~$0.016/1K chars ($16/1M chars)
- **Retry**: 3 attempts with exponential backoff on 503/UNAVAILABLE

### ElevenLabs
- **Default voice**: Frederick Surrey (`j9jfwdrw7BRfcR43Qohk`)
- **Default model**: eleven_v3 (best quality)
- **Format**: MP3
- **Max input**: 5000 characters per call
- **Cost**: ~$0.30/1K chars for v3, ~$0.18/1K for v2, ~$0.08/1K for flash (varies by plan)
- **Retry**: 3 attempts with exponential backoff on 503/429

## Cost Tracking

Both `tts.py` and `stt.py` automatically log to `logs/api_costs.jsonl` via `logs/cost_log.py`. Set the `GREATBOOKS_ENTITY_ID` environment variable to tag calls with the book id.
