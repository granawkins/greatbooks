# Text Ingestion Skill

**Goal:** Take a book ID and produce: clean chapters/segments in the DB + cover on GCS = readable on /library.

**Not covered here:** audio generation (see `audio/`), study guides (see `guide/`).

---

## How to invoke this skill

To ingest a single book, read this file and follow the steps for `{book-id}`.
The pipeline is idempotent — always run Step 0 first to skip what's already done.

---

## Step 0 — Idempotency Check (run this first, every time)

Before doing anything, check what's already done:

```python
import sqlite3, os
book_id = "{book-id}"
conn = sqlite3.connect('greatbooks.db')
book = conn.execute("SELECT id, description, cover_image, layout FROM books WHERE id = ?", (book_id,)).fetchone()
chapters = conn.execute("SELECT COUNT(*) FROM chapters WHERE book_id = ?", (book_id,)).fetchone()[0]
segments = conn.execute("SELECT COUNT(*) FROM segments s JOIN chapters c ON s.chapter_id = c.id WHERE c.book_id = ?", (book_id,)).fetchone()[0]
conn.close()
lg = os.path.exists(f"public/covers/{book_id}-lg.png")
sm = os.path.exists(f"public/covers/{book_id}-sm.jpg")
print(f"Book in DB:       {'YES' if book else 'NO'}")
print(f"Chapters:         {chapters}")
print(f"Segments:         {segments}")
print(f"Description:      {book[1] if book else 'N/A'}")
print(f"Cover (DB):       {book[2] if book else 'N/A'}")
print(f"Cover lg (local): {lg}")
print(f"Cover sm (local): {sm}")
```

Then check GCS:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://storage.googleapis.com/greatbooks-assets/covers/{book-id}-sm.jpg"
```

**Decision matrix:**
| State | Action |
|-------|--------|
| Book not in DB | Run full pipeline from Step 1 |
| Book in DB, chapters look wrong | Skip to Step 2 (fix chapters) |
| Book in DB, no description | Skip to Step 4 (description) |
| Book in DB, no cover in DB | Skip to Step 5 (cover) |
| Cover in DB but GCS returns non-200 | Skip to Step 6 (resize + upload) |
| Cover local files exist but not uploaded | Run Step 6 upload only |
| Everything present and correct | **Return — nothing to do** |

Setup:
```bash
cd /home/granawkins/greatbooks
git pull origin main
set -a && source .env && set +a
```

---

## Step 1 — Ingest Text

The book should already be in `GUTENBERG_BOOKS` in `.claude/skills/curator/text/add_gutenberg_books.py`.
If not, add a 1-liner:
```python
{"id": "author-short-title", "title": "Full Title", "author": "Author Name", "pg_id": 12345},
```
- `id` format: `{author-lastname}-{short-title}` (lowercase, hyphens)
- `pg_id`: number from `gutenberg.org/ebooks/12345`
- `"url_format": "epub"` for epub-only books
- `"pg_id_vol2": N` for two-volume works

Classical/ancient texts (Homer, Plato, Aristotle, etc.) are in `add_ica_books.py` — don't mix.

```bash
# Dry run first
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --dry-run --only {book-id}
# Then insert
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --only {book-id}
```

---

## Step 2 — Inspect and Fix Chapters

```bash
sqlite3 greatbooks.db "SELECT number, title FROM chapters WHERE book_id = '{book-id}' ORDER BY number;"
```

**Sanity check:**
- Short works / plays: 1–15 chapters fine
- Novels: 10–60 chapters
- Multi-part works (Dostoevsky, Hugo, Tolstoy): 30–60 after Part-prefixing
- chapters=1 for a long work → parser failure, investigate
- chapters=200+ for a normal novel → parser split on sub-headings, investigate

### Fixing chapter titles

**Part/Book/Volume nesting:** The parser handles one level (PART > CHAPTER → "Part I, Chapter I").
For two-level nesting (VOLUME > BOOK > CHAPTER, as in Hugo or Tolstoy), write a custom SQL/Python
fix for that book — query the raw HTML structure, determine the correct titles, update in DB.
Target: every chapter title is unique and unambiguous.

**"Unknown" or blank titles:** Fix directly in DB:
```python
conn.execute("UPDATE chapters SET title = 'Book I' WHERE book_id = ? AND number = ?", (book_id, 1))
```

### Front matter rules

**KEEP:** Translator's prefaces, author introductions, forewords — these are chapters.

**DELETE:** Title-page bylines (1–5 segments, just "By [Author]: Translated by X").
```python
# Delete a chapter and its segments
conn.execute("DELETE FROM segments WHERE chapter_id = ?", (ch_id,))
conn.execute("DELETE FROM chapters WHERE id = ?", (ch_id,))
# Then renumber: UPDATE chapters SET number = number - 1 WHERE book_id = ? AND number > ?
```

**Dramatis Personae / Persons of the Dialogue:** Don't keep as separate chapter.
Move content into Chapter 1 as a `heading`-type segment with character names joined by `\n`.
Then delete the separate dramatis personae chapter.

**Multiple short front-matter sections (3+):** Merge into one chapter titled "Introduction"
or "Preface", using heading-type segments for each section title.

### Verse vs prose

Set `layout = 'verse'` for: plays, poetry, verse epics.
```sql
UPDATE books SET layout = 'verse' WHERE id = '{book-id}';
```
Known verse books: all Shakespeare, Paradise Lost, Divine Comedy, Canterbury Tales,
Faust, Lucretius, Aeneid. Prose is the default.

---

## Step 3 — Segment Quality Check

Spot-check first, middle, and last chapters:
```python
conn = sqlite3.connect('greatbooks.db')
chapters = conn.execute("SELECT id, number, title FROM chapters WHERE book_id = ? ORDER BY number", (book_id,)).fetchall()
for ch in [chapters[0], chapters[len(chapters)//2], chapters[-1]]:
    print(f"\n--- Ch {ch[1]}: {ch[2]} ---")
    segs = conn.execute("SELECT sequence, segment_type, text FROM segments WHERE chapter_id = ? ORDER BY sequence LIMIT 8", (ch[0],)).fetchall()
    for s in segs:
        print(s)
```

Watch for and fix:
- Bare numbers (page number artifacts)
- Gutenberg license boilerplate in last chapter
- Raw HTML entities (`&ldquo;`, `&amp;`) — should be decoded
- Stage directions without `[brackets]` (Shakespeare)
- ALL-CAPS lines that should be `heading` type, not `text`

---

## Step 4 — Generate Description

```bash
.venv/bin/python .claude/skills/curator/text/generate_description.py --book-id {book-id} --dry-run
# If it looks good:
.venv/bin/python .claude/skills/curator/text/generate_description.py --book-id {book-id}
```

**Style:** 1–2 sentences, 15–30 words. Lead with the central tension or image — not "A story about...".
Calibrate to:
- *The Iliad:* "The rage of Achilles and the cost of war. The foundational epic of Western literature."
- *The Apology:* "Socrates on trial for his life, arguing that the unexamined life is not worth living."
- *Crime and Punishment:* "A student commits murder, believing himself above morality — but the crushing weight of guilt becomes his relentless punishment."

---

## Step 5 — Generate Cover

Read `cover-style.md` for style rules. Choose ONE specific, iconic object or scene — not a character face, not a generic symbol (no laurel wreaths, no columns).

```bash
.venv/bin/python .claude/skills/curator/text/img.py \
  --book-id {book-id} \
  --title "Full Title" \
  --author "Author Name" \
  --subject "One specific evocative object — e.g. 'A worn axe lying on rough stone, a shaft of cold light cutting across it'"
```

This saves `public/covers/{book-id}.png`, updates `books.cover_image`, logs cost to `logs/api_costs.jsonl`.

---

## Step 6 — Resize and Upload to GCS

```bash
.venv/bin/python .claude/skills/curator/text/resize_cover.py --book-id {book-id}
.venv/bin/python scripts/upload_to_gcs.py --covers --force
```

Verify live:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://storage.googleapis.com/greatbooks-assets/covers/{book-id}-sm.jpg"
# Should be 200
```

---

## Step 7 — Final Check

```bash
sqlite3 greatbooks.db "
SELECT b.id, b.description IS NOT NULL as has_desc, b.cover_image, b.layout,
       COUNT(DISTINCT c.id) as chapters, COUNT(s.id) as segments
FROM books b
JOIN chapters c ON c.book_id = b.id
JOIN segments s ON s.chapter_id = c.id
WHERE b.id = '{book-id}'
GROUP BY b.id;"
```

All fields non-null. Cover should be `/covers/{book-id}.png`. Report chapter count and any issues found.

---

## Known Failure Patterns

| Symptom | Cause | Fix |
|---------|-------|-----|
| Chapter 1 = "By [Author]: Translated By..." | Title-page byline parsed as chapter | Delete it |
| All chapters named "CHAPTER I" | Part headings not tracked (parser bug or multi-level nesting) | Custom fix per book |
| chapters=1 for long work | No `<h2>` chapter breaks | Try `url_format: "epub"` or custom split |
| chapters=200+ for normal novel | `<h2>` used for sub-headings | Use h3 split or custom |
| "Unknown" titles | Anchor ID fallback | Fix in DB |
| Stage directions run together | Missing spaces in OCR | Regex fix |
| Gutenberg boilerplate in last chapter | End marker not stripped | Delete those segments |
| ICA source truncated (~100KB) | Long single-page work cut off | Re-ingest from Gutenberg |
| HTML entities in text | Decoder missed | `html.unescape()` pass |
| 403 on Gutenberg fetch | Rate limited | Wait 30s and retry |
| Cover generation fails | GOOGLE_API_KEY not set | `set -a && source .env && set +a` |
