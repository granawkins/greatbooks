---
name: add-book
description: Add a new public-domain book to the Great Books corpus. Fetches source text, parses it into segments, and populates the database.
user-invocable: true
allowed-tools: Read, Write, Bash, WebFetch, WebSearch
argument-hint: <title>
---

# Add Book Skill

Add a new book to the Great Books corpus.

## Workflow

1. **Find the source text** — see "Where to Find Content" below
2. **Download the HTML** — save to `data/<book-id>/raw/source.html`
3. **Parse into segments** — run `parse_html.py` to extract chapters and segments
4. **Review the output** — check that chapter breaks, paragraphs, and segment boundaries look right
5. **Insert into database** — add rows to `books`, `chapters`, and `segments` tables
6. **Write the book's SKILL.md** — create `data/<book-id>/SKILL.md` with provenance and context
7. **Update the frontend** — add the book to `src/data/books.ts` so it appears on the home page

## Using parse_html.py

```bash
python .claude/skills/add-book/parse_html.py data/<book-id>/raw/source.html
```

Output is JSON to stdout:
```json
{
  "chapters": [
    {
      "title": "Book I: The Rage of Achilles",
      "groups": [
        {
          "type": "text",
          "segments": ["Rage — Goddess, sing the rage...", "Begin, Muse, when the two first broke..."]
        },
        {
          "type": "heading",
          "segments": ["The Quarrel"]
        }
      ]
    }
  ]
}
```

Each group becomes a paragraph/stanza (assigned a `group_number`). Each segment string becomes a row in the `segments` table. The `type` field maps to `segment_type`.

## Inserting into the Database

After parsing, insert using sqlite3:

```bash
sqlite3 greatbooks.db
```

Follow the schema and conventions in the `database` skill. Assign `sequence` numbers sequentially within each chapter. Assign `group_number` sequentially, resetting per chapter. Headings and section breaks get `group_number = NULL`.

## Where to Find Content

### Project Gutenberg (gutenberg.org)
- Best for English literature: Milton, Shakespeare, etc.
- Use the HTML version (not plain text) — it preserves structure
- URL pattern: `https://www.gutenberg.org/files/<id>/<id>-h/<id>-h.htm`
- Watch for: encoding issues, inconsistent heading markup, editorial notes mixed into text

### Internet Classics Archive (classics.mit.edu)
- Best for Greek/Roman works in translation
- Translations tend to be older (public domain) but solid
- Watch for: minimal HTML structure, run-on paragraphs

### Perseus Digital Library (perseus.tufts.edu)
- Scholarly editions of Greek and Latin texts with translations
- More structured but more complex HTML
- Good for cross-referencing line numbers

### General Tips
- Always verify the translation is public domain (pre-1928 US publication)
- Prefer translations by: Fagles, Lattimore (check dates), Butler, Jowett
- Save the raw HTML before processing — we keep it for reference in `data/<book-id>/raw/`

## Writing the Book's SKILL.md

After adding a book, create `data/<book-id>/SKILL.md` with:
- **Source**: URL, translator, edition
- **Structure**: how many chapters, any structural quirks
- **Context**: date of composition, genre, major themes, key characters
- **Commentary**: what supplementary material has been added (if any)
- **Audio status**: which chapters have generated audio (initially none)
