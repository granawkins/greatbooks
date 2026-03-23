# Text Ingestion Skill

Add a book to the site: text in DB + cover on GCS = readable on /library.

---

## What this covers

1. Add book/chapters/segments to the database
2. Generate cover image
3. Resize to two sizes and upload to GCS
4. Spot-check result

**Not covered here:** audio generation (see `audio/`), study guides (see `guide/`).

---

## Prerequisites

Run from `/home/granawkins/greatbooks/` with the venv active:
```bash
cd /home/granawkins/greatbooks
source .venv/bin/activate
set -a && source .env && set +a
```

---

## Step 1 — Add book definition

If the book is on Project Gutenberg, add a 1-liner to `GUTENBERG_BOOKS` in `.claude/skills/curator/text/add_gutenberg_books.py`:
```python
{"id": "author-short-title", "title": "Full Title", "author": "Author Name", "pg_id": 12345},
```

- `id` format: `{author-lastname}-{short-title}` (lowercase, hyphens, no punctuation)
- `pg_id`: the number in the Gutenberg URL (e.g. gutenberg.org/ebooks/**12345**)
- For epub-only books add: `"url_format": "epub"`
- For multi-volume works add: `"pg_id_vol2": 67890`

If the book is on MIT Internet Classics Archive (ancient/classical texts), it belongs in `add_ica_books.py` — different parser, don't mix.

---

## Step 2 — Ingest text

```bash
# Dry run first — check chapter count and segment count look right
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --dry-run --only {book-id}

# If it looks good, insert for real
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --only {book-id}
```

**Sanity check** — query the DB:
```bash
sqlite3 greatbooks.db "
SELECT b.title, COUNT(DISTINCT c.id) as chapters, COUNT(s.id) as segments
FROM books b
JOIN chapters c ON c.book_id = b.id
JOIN segments s ON s.chapter_id = c.id
WHERE b.id = '{book-id}'
GROUP BY b.id;"
```

Expected ranges (fail if outside):
- Chapters: short works 1–10, novels 10–60, epics/philosophy 10–40
- Segments: short works 100+, novels 2000+, long works 5000+

If chapters=1 or segments<100, the parser probably didn't find chapter breaks — flag for manual fix later and continue.

---

## Step 3 — Generate description

```bash
.venv/bin/python .claude/skills/curator/text/generate_description.py --book-id {book-id} --dry-run
# If it looks good:
.venv/bin/python .claude/skills/curator/text/generate_description.py --book-id {book-id}
```

**Style:** 1–2 sentences, 15–30 words. Lead with the central tension or image, not "A story about...".
Calibrate to these examples already on the site:
- *The Iliad:* "The rage of Achilles and the cost of war. The foundational epic of Western literature."
- *The Odyssey:* "The long road home. Odysseus navigates gods, monsters, and temptation to return to Ithaca."
- *The Apology:* "Socrates on trial for his life, arguing that the unexamined life is not worth living."

For batches: `--all` processes all books missing a description. `--overwrite` regenerates existing ones.

---

## Step 4 — Generate cover

Choose a single iconic subject for the book (see `cover-style.md` for guidance — pick a specific object, not a character portrait):

```bash
set -a && source .env && set +a  # required for GOOGLE_API_KEY + cost logging
.venv/bin/python .claude/skills/curator/text/img.py \
  --book-id {book-id} \
  --title "Full Title" \
  --author "Author Name" \
  --subject "One specific object or scene — e.g. 'A bronze helmet resting on a stone altar'"
```

This saves `public/covers/{book-id}.png`, updates `books.cover_image` in the DB, and logs cost to `logs/api_costs.jsonl`.

---

## Step 5 — Resize and upload to GCS

The site uses two sizes served from GCS:
- `{book-id}-lg.png` — full resolution (for book detail page)
- `{book-id}-sm.jpg` — thumbnail ~400px wide (for library grid)

```bash
.venv/bin/python .claude/skills/curator/text/resize_cover.py --book-id {book-id}
.venv/bin/python scripts/upload_to_gcs.py --covers --force
```

Requires Pillow: `.venv/bin/pip install Pillow`

---

## Step 6 — Spot check

```bash
# Cover is live
curl -s -o /dev/null -w "%{http_code}" \
  "https://storage.googleapis.com/greatbooks-assets/covers/{book-id}-sm.jpg"
# Should be 200

# Book appears in DB
sqlite3 greatbooks.db "SELECT id, title, cover_image FROM books WHERE id = '{book-id}';"
```

Visit `https://greatbooks.fm/library` — the book should appear with its cover.

---

## Batch mode

To ingest many books in sequence, omit `--only`. The script skips books already in the DB.
Run dry-run first on the full list to catch failures before writing to DB.

```bash
.venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py --dry-run 2>&1 | grep -E "FAILED|chapters|segments"
```

---

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| chapters=1, all content in one chapter | Parser didn't find `<h2>` chapter headings | Manual fix: re-ingest with custom chapter split |
| segments < 100 | Wrong Gutenberg URL format | Try `url_format: "epub"` |
| 403 on Gutenberg fetch | Rate limited | Wait 30s and retry |
| Cover generation fails | GOOGLE_API_KEY not set | Run `set -a && source .env && set +a` first |
