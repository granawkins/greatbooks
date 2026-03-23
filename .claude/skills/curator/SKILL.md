---
name: curator
description: The greatbooks.fm content pipeline — corpus planning, text ingestion, audio generation, research, and course content. Use for any task related to adding books, generating audio, writing study guides, or advancing the content pipeline.
user-invocable: true
allowed-tools: Read, Write, Bash, WebFetch, WebSearch
---

# Curator

The curator is the content pipeline for greatbooks.fm. It owns everything between "which books should we include" and "a student is reading a fully supported chapter." Five stages — Text, Audio, Research, Guide, Course — tracked in the morning brief table.

```
               T  A  R  G  C
─────────────────────────────
Ancient Epics (homer-epic)
  Iliad        ✓  ✓  ✓  ✓  ✓
  Odyssey      ✓  ✓  ✓  ✓  ✓
Examined Life
  Apology      ✓  ·  ·  ·  ·
  Phaedo       ✓  ·  ·  ·  ·
  Republic     ✓  ✓  ✓  ✓  ·
How to Live
  Meditations  ✓  ·  ·  ·  ·
  Discourses   ✓  ·  ·  ·  ·

T=Text A=Audio R=Research G=Guide C=Course
```

Update this table when any stage completes for a book.

---

## Corpus: Which Books

**124 titles** on the shortlist — see `sources/index.html` for the full interactive catalog with pipeline status, Goodreads ratings, and source links. See `sources/SKILL.md` for how we built the list and all sources consulted.

**Book ID convention:** `{author-lastname}-{short-title}` — all lowercase, hyphens only, English.
Examples: `homer-iliad`, `plato-republic`, `marcus-aurelius-meditations`

**Current DB:** 54 books ingested (Phase 1 academic canon). ~31 of these overlap with the new 124-title shortlist.

---

## Text Pipeline (T)

Fetch public-domain text, parse into segments, insert into DB, generate cover art.

### Sources

**MIT Internet Classics Archive** (classics.mit.edu) — Greek/Roman works.
- Parser: `text/parse_html.py --source classics`
- Batch script: `text/add_ica_books.py`

**Project Gutenberg** (gutenberg.org) — English literature, modern philosophy, novels.
- Parser: `text/parse_html.py --source gutenberg` *(generic Gutenberg parser not yet implemented)*
- For new Gutenberg books: write a custom `data/<book-id>/parse.py` following the pattern in `data/bronte-wuthering-heights/parse.py`
  - Strip boilerplate between `*** START OF` / `*** END OF` markers
  - Split on `<div class="chapter">` or `<h2>CHAPTER` headings
  - **Convert em dashes correctly:** `s.replace('\u2014', '—')` not `'--'`
  - Write `data/<book-id>/chapters.json`, then run `data/<book-id>/seed.py` to insert
- Batch script: `text/add_gutenberg_books.py`

Safe translators: Butler (Homer), Jowett (Plato), old PG editions. **Fagles and Lattimore are NOT public domain.**

### Workflow

1. Save raw HTML to `data/<book-id>/raw/source.html`
2. Parse: `python .claude/skills/curator/text/parse_html.py data/<book-id>/raw/source.html`
3. Review output — check chapter breaks, paragraph structure
4. Insert into DB (`books`, `chapters`, `segments` tables)
5. Generate cover art (see below)
6. Write `data/<book-id>/SKILL.md` — provenance, structure, themes

### Batch ingestion

```bash
# ICA books
.venv/bin/python .claude/skills/curator/text/add_ica_books.py
.venv/bin/python .claude/skills/curator/text/add_ica_books.py --dry-run
.venv/bin/python .claude/skills/curator/text/add_ica_books.py --only homer-odyssey

# Gutenberg books
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --only melville-moby-dick
```

Both scripts skip books already in DB and log every step.

### Cover art

Read `text/cover-style.md` first (fine-art oil, single iconic object, no text). Then:

```bash
python .claude/skills/curator/text/img.py \
  --book-id <book-id> \
  --subject "<specific object or scene description>"
```

The script saves `public/covers/<book-id>.png`. Each call ~$0.04.

**After generating, you must:**
1. Create JPEG variants for GCS serving:
```python
from PIL import Image
img = Image.open('public/covers/<book-id>.png').convert('RGB')
img.save('public/covers/<book-id>.jpg', 'JPEG', quality=90)
img.resize((256, 384)).save('public/covers/<book-id>-sm.jpg', 'JPEG', quality=75)
```
2. Upload to GCS: `.venv/bin/python scripts/upload_to_gcs.py --covers --force`
3. Update the DB: `UPDATE books SET cover_image='/covers/<book-id>.jpg' WHERE id='<book-id>';`
   - img.py may not set this correctly — always verify with `SELECT cover_image FROM books WHERE id='<book-id>';`

Add a Cover section to `data/<book-id>/SKILL.md` when done.

#### Course covers (different from book covers)

Course covers are **not** the same as book covers:
- **No text** — no title or author on the image. The homepage renders text separately.
- **Landscape aspect ratio** — used as a background image behind the course card.
- **Two resolutions required:**
  - `-lg.png` — large version (~1.5MB), used as CSS `background-image` on desktop
  - `-sm.jpg` — small thumbnail (~45KB), used in the "Continue" section
- **Naming:** `public/covers/<course-id>-lg.png` and `public/covers/<course-id>-sm.jpg`
- See `homer-epic-lg.png` / `homer-epic-sm.jpg` for reference.

When generating, override `img.py` defaults: pass a custom `--prompt` with no title/author instructions, and use landscape aspect ratio. Then resize/compress to create both variants.

### DB schema notes

`books` row must include: `original_date`, `translator`, `translation_date`, `source_url`, `license`. See the `database` skill for full schema reference.

---

## Audio Pipeline (A)

Generate TTS narration with word-level timestamps for the synced reading cursor.

### Setup

```bash
pip install -r .claude/skills/curator/audio/requirements.txt
```

Requires `.env` at project root:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

### Quick start: full book

```bash
GREATBOOKS_ENTITY_ID=<book-id> \
  .venv/bin/python .claude/skills/curator/audio/generate_book.py <book-id>

# Options
--batch-size 5    # chapters in parallel (default 10)
--voice Orus      # Chirp3 HD voice (default: Algieba)
--chapters 3-8    # chapter range only
--resume          # skip chapters with existing audio
```

This fetches segments from DB, runs TTS + STT per chapter in parallel batches, merges chunks, and writes audio + timestamps back to DB automatically.

### Voices

**Google Chirp3 HD** (default): Algieba, Orus, Kore, Puck, Zephyr, Aoede
- Max 2000 chars/call · ~$0.016/1K chars · 24kHz MP3
- **en-GB voices available** — pass full voice name e.g. `--voice en-GB-Chirp3-HD-Gacrux`
- Full en-GB voice list: Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe, Callirrhoe, Charon, Despina, Enceladus, Erinome, Fenrir, Gacrux, Iapetus, Kore, Laomedeia, Leda, Orus, Puck, Pulcherrima, Rasalgethi, Sadachbia, Sadaltager, Schedar, Sulafat, Umbriel
- **Use stable `google.cloud.texttospeech` (v1), not `texttospeech_v1beta1`** — en-GB voices require v1; tts.py has been updated accordingly

**ElevenLabs**: Frederick Surrey (`j9jfwdrw7BRfcR43Qohk`)
- Max 5000 chars/call · ~$0.30/1K chars (v3) · better quality for literary prose

### Scripts

| Script | Purpose |
|--------|---------|
| `generate_book.py` | Orchestrate full book, parallel batches |
| `generate_chapter.py` | Single chapter: chunk → TTS → STT → merge |
| `tts.py` | Text-to-Speech (Google or ElevenLabs) |
| `stt.py` | Speech-to-Text + Needleman-Wunsch word alignment |

### Audio file convention

One MP3 per chapter: `data/<book-id>/audio/<NN>.mp3` (zero-padded chapter number).

### Cost tracking

All API calls log to `logs/api_costs.jsonl`. Set `GREATBOOKS_ENTITY_ID` to tag by book.

---

## Research Pipeline (R)

Build the scholarly foundation — reference libraries and study guides — that make the platform worth returning to.

### What "research complete" means for a book

1. `data/<book-id>/references/` exists with 4–6 verified source files
2. `data/<book-id>/STUDYGUIDE.md` exists and follows the spec

### Study guide spec

Read before writing any study guide:
```
.claude/skills/curator/guide/SKILL.md
```

Structure at a glance:
```
## Chapter Summaries     ← one line per chapter (reference, top of file)
## Before You Read       ← professor-voiced book intro
## Chapter Materials
  ### Chapter N
    Before You Read      ← 2-3 sentences, no spoilers, orient + watch-for
    Chat Prompts         ← opening + probing + broader questions
```

**Tone:** Yale/Oxford professor to serious students. Short sentences, written to be heard. No filler, no hedging.

### Research process

1. **Web search first** — university OCW pages (Yale, MIT), Stanford Encyclopedia of Philosophy, Wikipedia (starting point only, follow citations), SparkNotes for common reader questions
2. **Verify every claim** — trace to accessible URL; flag paywalled; flag unverifiable as `[UNVERIFIED]`
3. **Save references** — one file per source in `data/<book-id>/references/`, with source header at top
4. **Then write** — grounded in research, not just training knowledge

### Sub-agent workflow

Research + writing tasks run well as sub-agents. Give the agent:
- Path to `curator/guide/SKILL.md`
- Output path: `data/<book-id>/STUDYGUIDE.md`
- Instruction to do web research before writing, print source summary when done

Results come back to Clio for review. PRs go via the `engineer` skill.

### Priority queue

Iliad is done. Next in order:
1. Odyssey (Ancient Epics course, book 2)
2. Apology (Examined Life course, book 1 — short, anchor of two courses)
3. Phaedo (Examined Life, book 2)
4. Meditations (How to Live, book 1)
5. Discourses (How to Live, book 2)

---

## Guide Pipeline (G)

Course content that goes into the app itself — before-you-read guides, chapter contexts, and chat prompts wired to the UI.

*This stage is in design. The study guide (R stage) provides the raw material; the Guide stage is about getting it into the product.*

**When this is defined:** a book is Guide-complete when:
- Its before-you-read text is served from the app's course enrollment flow
- Each chapter shows a 2-3 sentence context card before the text
- AI chat is enabled for that chapter with seeded prompts

---

## Course Pipeline (C)

Assemble books into a course — the top-level product students enroll in. A course is a book with `type='course'` in the DB, whose chapters either reference existing book chapters or contain original discussion content.

### Prerequisites

All books in the course must have stages T, A, and R complete. Stage G (guide) is desirable but not blocking.

### What a course contains

1. **Introduction chapters** — one per book, drawn from the STUDYGUIDE.md "Before You Read" section
2. **Reading chapters** — reference chapters pointing to existing book chapters via `source_chapter_id`. These inherit segments and audio from the source.
3. **Discussion chapters** — study guide sessions parsed into segments. Content comes from the STUDYGUIDE.md session sections (Summaries, Themes & Characters, Discussion question, Coming Up).

### Course structure pattern

For each book in the course:
```
Introduction to [Book]           ← discussion chapter, from "Before You Read"
[Book]: Chapter I                ← reference chapter → source book ch 1
[Book]: Chapter II               ← reference chapter → source book ch 2
[Book] — Session 1: [Title]     ← discussion chapter, from Session 1
[Book]: Chapter III              ← reference chapter → source book ch 3
...
```

Discussion sessions are placed after the chapters they cover (e.g., Session 1 covers Books I–II, so it appears after Book II).

### How to create a course

1. **Create a seed script** at `scripts/seed_<course-id>.py` following the pattern in `scripts/seed_homer_epic.py`
2. The script should:
   - Insert a `books` row with `type='course'`, `layout='prose'`
   - Create reference chapters with `source_chapter_id` pointing to existing chapters
   - Create discussion chapters with segments parsed from `STUDYGUIDE.md`
   - Strip markdown formatting (`**bold**`, `*italic*`) from segment text
   - Use `list_item` segment_type for bullet lists (no paragraph_breaks between consecutive list items)
   - Reorder: put the "Discussion" (essay) section above "Coming Up" in each session
3. Run: `.venv/bin/python scripts/seed_<course-id>.py`
4. The script is idempotent — it deletes and re-seeds if the course already exists

### Schema

- `books.type = 'course'` — distinguishes courses from regular books
- `chapters.source_chapter_id` — FK to another chapter; when set, `db.getSegments()` and `db.getResolvedChapter()` follow the reference transparently
- `chapters.chapter_type` — `'text'` (reading) or `'discussion'` (study guide session)
- `segments.segment_type = 'list_item'` — consecutive list_items are grouped into `<ul>` blocks by the frontend

### Course ID convention

`{author-or-theme}-{short-title}` — e.g., `homer-epic`, `examined-life`, `how-to-live`

### Annotation sharing

Annotations on course reference chapters are stored against the **source book** (not the course). This means highlights and comments are shared between reading a book independently and reading it as part of a course.

### Current courses

| Course ID | Title | Books | Status |
|-----------|-------|-------|--------|
| `homer-epic` | Homer's Epics | Iliad → Odyssey | ✓ seeded |

---

## Tier Lists (Full)

See `sources/GBWW_LIST.md` for the complete Encyclopaedia Britannica 1952/1990 list and `sources/SJC_LIST.md` for the St. John's College reading list. Both are the canonical sources for corpus expansion decisions.

Quick reference for Tier 1 (both lists, public domain):
- 52 titles total: 50 done, 2 unavailable (Hegel's Phenomenology, Marx's Capital — not on Gutenberg in English)
- Drama/verse titles needing parser work: Oresteia, Oedipus trilogy, Euripides, Aristophanes Clouds, Aeneid
