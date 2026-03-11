---
name: curator
description: The greatbooks.fm content pipeline — corpus planning, text ingestion, audio generation, research, and course content. Use for any task related to adding books, generating audio, writing study guides, or advancing the content pipeline.
user-invocable: true
allowed-tools: Read, Write, Bash, WebFetch, WebSearch
---

# Curator

The curator is the content pipeline for greatbooks.fm. It owns everything between "which books should we include" and "a student is reading a fully supported chapter." Four stages — Text, Audio, Research, Guide — tracked in the morning brief table.

```
               T  A  R  G
───────────────────────────
Ancient Epics
  Iliad        ✓  ✓  ✓  ·
  Odyssey      ✓  ✓  ·  ·
Examined Life
  Apology      ✓  ·  ·  ·
  Phaedo       ✓  ·  ·  ·
  Republic     ✓  ✓  ·  ·
How to Live
  Meditations  ✓  ·  ·  ·
  Discourses   ✓  ·  ·  ·

T=Text A=Audio R=Research G=Guide
```

Update this table when any stage completes for a book.

---

## Corpus: Which Books

Three launch courses, each requiring all four pipeline stages to be complete:

| Course | Books | Audio status |
|--------|-------|-------------|
| Ancient Epics | Iliad → Odyssey | ✓ complete |
| The Examined Life | Apology → Phaedo → Republic | Republic only |
| How to Live | Meditations → Discourses → Apology | none |

**Book ID convention:** `{author-lastname}-{short-title}` — all lowercase, hyphens only, English.
Examples: `homer-iliad`, `plato-republic`, `marcus-aurelius-meditations`

Full book selection: `GBWW_LIST.md` (Britannica), `SJC_LIST.md` (St. John's), `SOURCES.md` (verified URLs).

**Tier 1 status:** 54 books in DB, 1,858 chapters, ~364,000 segments. Remaining corpus gaps: drama/verse parser (Oresteia, Oedipus, Aeneid), Hegel and Marx (not on Gutenberg in English).

---

## Text Pipeline (T)

Fetch public-domain text, parse into segments, insert into DB, generate cover art.

### Sources

**MIT Internet Classics Archive** (classics.mit.edu) — Greek/Roman works.
- Parser: `add-book/parse_html.py --source classics`
- Batch script: `add-book/add_ica_books.py`

**Project Gutenberg** (gutenberg.org) — English literature, modern philosophy, novels.
- Parser: `add-book/parse_html.py --source gutenberg` *(Gutenberg parser not yet implemented)*
- Batch script: `add-book/add_gutenberg_books.py`

Safe translators: Butler (Homer), Jowett (Plato), old PG editions. **Fagles and Lattimore are NOT public domain.**

### Workflow

1. Save raw HTML to `data/<book-id>/raw/source.html`
2. Parse: `python .claude/skills/curator/add-book/parse_html.py data/<book-id>/raw/source.html`
3. Review output — check chapter breaks, paragraph structure
4. Insert into DB (`books`, `chapters`, `segments` tables)
5. Generate cover art (see below)
6. Write `data/<book-id>/SKILL.md` — provenance, structure, themes

### Batch ingestion

```bash
# ICA books
.venv/bin/python .claude/skills/curator/add-book/add_ica_books.py
.venv/bin/python .claude/skills/curator/add-book/add_ica_books.py --dry-run
.venv/bin/python .claude/skills/curator/add-book/add_ica_books.py --only homer-odyssey

# Gutenberg books
.venv/bin/python .claude/skills/curator/add-book/add_gutenberg_books.py
.venv/bin/python .claude/skills/curator/add-book/add_gutenberg_books.py --only melville-moby-dick
```

Both scripts skip books already in DB and log every step.

### Cover art

Read `add-book/cover-style.md` first (fine-art oil, single iconic object, no text). Then:

```bash
python .claude/skills/curator/add-book/img.py \
  --book-id <book-id> \
  --subject "<specific object or scene description>"
```

Saves `data/<book-id>/cover.png` and updates `books.cover_image`. Each call ~$0.04. Add a Cover section to `data/<book-id>/SKILL.md` when done.

### DB schema notes

`books` row must include: `original_date`, `translator`, `translation_date`, `source_url`, `license`. See the `database` skill for full schema reference.

---

## Audio Pipeline (A)

Generate TTS narration with word-level timestamps for the synced reading cursor.

### Setup

```bash
pip install -r .claude/skills/curator/generate-audio/requirements.txt
```

Requires `.env` at project root:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

### Quick start: full book

```bash
GREATBOOKS_ENTITY_ID=<book-id> \
  .venv/bin/python .claude/skills/curator/generate-audio/generate_book.py <book-id>

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
/home/granawkins/greatbooks/data/STUDYGUIDE_SPEC.md
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
- Path to `STUDYGUIDE_SPEC.md`
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

## Tier Lists (Full)

See `GBWW_LIST.md` for the complete Encyclopaedia Britannica 1952/1990 list and `SJC_LIST.md` for the St. John's College reading list. Both are the canonical sources for corpus expansion decisions.

Quick reference for Tier 1 (both lists, public domain):
- 52 titles total: 50 done, 2 unavailable (Hegel's Phenomenology, Marx's Capital — not on Gutenberg in English)
- Drama/verse titles needing parser work: Oresteia, Oedipus trilogy, Euripides, Aristophanes Clouds, Aeneid
