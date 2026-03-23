# Book Ingestion Rules

Rules for agents handling text ingestion on a per-book basis.
Follow these strictly. Deviate only when the source forces it, and document what you did.

---

## The Goal

Each book should be readable on the site with clean chapter titles, correct segment counts,
and properly formatted front matter. "Correct" means: a reader opening any chapter sees what
they expect from a well-edited print edition.

---

## Step 0 — Idempotency Check (run this first, every time)

Before doing anything, check what's already done:

```python
import sqlite3, subprocess
book_id = "{book-id}"
conn = sqlite3.connect('greatbooks.db')

book = conn.execute("SELECT id, description, cover_image, layout FROM books WHERE id = ?", (book_id,)).fetchone()
chapters = conn.execute("SELECT COUNT(*) FROM chapters WHERE book_id = ?", (book_id,)).fetchone()[0]
segments = conn.execute("SELECT COUNT(*) FROM segments s JOIN chapters c ON s.chapter_id = c.id WHERE c.book_id = ?", (book_id,)).fetchone()[0]
conn.close()

import os
lg = os.path.exists(f"public/covers/{book_id}-lg.png")
sm = os.path.exists(f"public/covers/{book_id}-sm.jpg")

print(f"Book in DB:      {'YES' if book else 'NO'}")
print(f"Chapters:        {chapters}")
print(f"Segments:        {segments}")
print(f"Description:     {book[1] if book else 'N/A'}")
print(f"Cover (DB):      {book[2] if book else 'N/A'}")
print(f"Cover lg (local):{lg}")
print(f"Cover sm (local):{sm}")
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
| Book in DB, no description | Skip to Step 6 (description) |
| Book in DB, no cover in DB | Skip to Step 6 (cover) |
| Cover in DB but not GCS (non-200) | Skip to Step 6 (resize + upload only) |
| Cover local files exist but not uploaded | Run upload only |
| Everything present and correct | Return — nothing to do |

Pull latest main before starting:
```bash
git pull origin main
cd /home/granawkins/greatbooks
set -a && source .env && set +a
```

---

## Step 1 — Dry Run and Inspect

```bash
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --dry-run --only {book-id}
```

Then check the DB:
```bash
sqlite3 greatbooks.db "SELECT number, title FROM chapters WHERE book_id = '{book-id}' ORDER BY number;"
```

**Chapter count sanity:**
- Short works (novellas, pamphlets, plays): 1–15 chapters is fine
- Novels: 10–60 chapters expected
- Multi-part novels (Dostoevsky, Hugo, Tolstoy): 30–60 after Part-prefixing
- If you get 1 chapter for a long work, or 200+ chapters for a normal novel → parser failure, investigate

---

## Step 2 — Fix Chapter Titles

### Part/Book/Volume nesting

Gutenberg often structures long works as PART I > CHAPTER I (two heading levels).
The parser handles one level of Part. If there are multiple nesting levels (e.g. Volume > Book > Chapter),
write a custom fix script for that book. Goal: each chapter title should read like
"Part I, Chapter I" or "Volume II, Book III, Chapter IV" — unique and unambiguous.

Known multi-level works: Les Misérables (Volume/Book/Chapter), War and Peace (Volume/Part/Chapter).

### Titles that came out "Unknown" or blank

These happen when the anchor ID is used as fallback. Fix them directly in the DB:
```python
import sqlite3
conn = sqlite3.connect('greatbooks.db')
conn.execute("UPDATE chapters SET title = 'Book I' WHERE book_id = ? AND number = ?", (book_id, 1))
conn.commit()
```

### Translators' chapter numbering restarts

Some translators restart CHAPTER I in each Part. After Part-prefixing, these become
"Part I, Chapter I", "Part II, Chapter I" etc. — that's correct, leave it.

---

## Step 3 — Front Matter Rules

### Translator's prefaces and introductions

**KEEP THEM.** These are valuable context. If parsed as a chapter titled "TRANSLATOR'S PREFACE"
or "INTRODUCTION", leave it as-is.

### Title-page chapters (just the author/title byline)

**DELETE THEM.** A chapter that contains only 1–5 segments of pure metadata
(e.g. "By Fyodor Dostoevsky: Translated by Constance Garnett") is a parser artifact.
Delete it from the DB and renumber if needed.

```python
conn.execute("DELETE FROM segments WHERE chapter_id = ?", (chapter_id,))
conn.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
# Renumber: UPDATE chapters SET number = number - 1 WHERE book_id = ? AND number > ?
```

### Dramatis Personae / Persons of the Dialogue

**Transcribe as a heading segment in Chapter 1, not a separate chapter.**
If parsed as its own chapter, move the content into chapter 1 as a `heading`-type segment
with line breaks (`\n`) between character names. Then delete the separate chapter.

### Multiple short front-matter sections

If there are 3+ small intro chapters (Life of the Author, Publisher's Note, Translator's Preface...),
merge them into one chapter titled "Introduction" or "Preface", using heading segments for each section title.

---

## Step 4 — Segment Quality Check

Spot-check 3 chapters (first, middle, last):
```python
import sqlite3
conn = sqlite3.connect('greatbooks.db')
chapters = conn.execute("SELECT id, number, title FROM chapters WHERE book_id = ? ORDER BY number", (book_id,)).fetchall()
# Check first, middle, last
for ch in [chapters[0], chapters[len(chapters)//2], chapters[-1]]:
    segs = conn.execute("SELECT sequence, segment_type, text FROM segments WHERE chapter_id = ? ORDER BY sequence LIMIT 10", (ch[0],)).fetchall()
    for s in segs:
        print(s)
```

Watch for:
- Segments that are just a number (page numbers leaking through)
- Gutenberg boilerplate text (Project Gutenberg trademark notices, license text)
- HTML entities (`&ldquo;`, `&amp;` etc.) — these should be decoded, not raw
- Stage directions without brackets (Shakespeare)
- ALL-CAPS segments that should be headings (`segment_type = 'heading'`)

---

## Step 5 — Verse vs Prose

Check the `books.layout` column:
```sql
SELECT id, layout FROM books WHERE id = '{book-id}';
```

Set to `verse` for: poetry, drama, verse epics. Everything else is `prose`.
```sql
UPDATE books SET layout = 'verse' WHERE id = '{book-id}';
```

Known verse books: Shakespeare plays, Paradise Lost, Divine Comedy, Canterbury Tales, Faust, Lucretius, Aeneid.

---

## Step 6 — Generate Description, Cover, Resize, Upload

```bash
# Description
.venv/bin/python .claude/skills/curator/text/generate_description.py --book-id {book-id}

# Cover — choose ONE iconic, specific object (not a character face, not a generic symbol)
.venv/bin/python .claude/skills/curator/text/img.py \
  --book-id {book-id} --title "..." --author "..." \
  --subject "One specific evocative object or scene"

# Resize
.venv/bin/python .claude/skills/curator/text/resize_cover.py --book-id {book-id}

# Upload
.venv/bin/python scripts/upload_to_gcs.py --covers --force
```

---

## Step 7 — Final DB Check

```sql
SELECT b.id, b.description, b.cover_image, b.layout,
       COUNT(DISTINCT c.id) as chapters, COUNT(s.id) as segments
FROM books b
JOIN chapters c ON c.book_id = b.id
JOIN segments s ON s.chapter_id = c.id
WHERE b.id = '{book-id}'
GROUP BY b.id;
```

All fields should be non-null. Cover should be `/covers/{book-id}.png`.

---

## Learned Patterns (from prior ingestion)

| Symptom | Cause | Fix |
|---------|-------|-----|
| Chapter titled "By [Author]: Translated By..." | Parser used title-page byline | Delete that chapter |
| All chapters named "CHAPTER I" | Part headings not tracked | Write custom re-splitter for this book |
| Chapter count = 1 for long work | No `<h2>` chapter breaks in HTML | Try `url_format: "epub"`, or fetch epub directly |
| 200+ chapters for normal novel | `<h2>` used for paragraph sub-headings | Use `<h3>` split instead, or write custom |
| "Unknown" chapter titles | Anchor ID fallback used | Fix titles directly in DB |
| Chapters restart at I in each Part | Multi-part structure, expected | Prefix with Part label |
| Stage directions run together | Missing spaces in Gutenberg OCR | Fix with regex (see Shakespeare notes) |
| Gutenberg license in last chapter | End-of-book boilerplate leaked | Delete those segments |
| ICA source truncated at ~100KB | Long single-page works cut off | Re-ingest from Gutenberg instead |
| HTML entities in text | Parser missed decoding step | Fix with `html.unescape()` pass |
