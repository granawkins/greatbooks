#!/usr/bin/env python3
"""
Batch-add books from the MIT Internet Classics Archive.

Fetches HTML, parses into segments, inserts into the database.
Handles both multi-page works (one HTML per book/chapter) and single-page works.

Usage:
    .venv/bin/python .claude/skills/add-book/add_ica_books.py [--dry-run] [--only BOOK_ID]

Options:
    --dry-run   Fetch and parse but don't insert into DB
    --only ID   Only process a single book (by book_id, e.g. homer-odyssey)
"""

import argparse
import json
import logging
import os
import re
import sqlite3
import sys
import time
import urllib.request

# Add the skill directory to path so we can import parse_html
sys.path.insert(0, os.path.dirname(__file__))
from parse_html import parse_classics, parse_classics_multi

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Book definitions ────────────────────────────────────────────────────────
# Each entry defines everything needed to fetch, parse, and insert a book.
# "pages" is either:
#   - an int (number of books/chapters, fetched as <slug>.1.i.html etc.)
#   - a list of (page_slug, title) tuples for single-page works
#   - "auto" to auto-discover from the URL pattern

ICA_BOOKS = [
    {
        "id": "homer-odyssey",
        "title": "Odyssey",
        "author": "Homer",
        "description": "The epic journey of Odysseus returning home after the Trojan War.",
        "original_date": "~8th century BCE",
        "translator": "Samuel Butler",
        "translation_date": "1900",
        "source_url": "http://classics.mit.edu/Homer/odyssey.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Homer/odyssey.{n}.{numeral}.html",
        "pages": 24,
    },
    {
        "id": "plato-apology",
        "title": "Apology",
        "author": "Plato",
        "description": "Socrates' defense speech at his trial in Athens.",
        "original_date": "~399 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1871",
        "source_url": "http://classics.mit.edu/Plato/apology.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Plato/apology.html",
        "pages": [("apology", "Apology")],
    },
    {
        "id": "plato-crito",
        "title": "Crito",
        "author": "Plato",
        "description": "A dialogue on justice, injustice, and the proper response to injustice.",
        "original_date": "~399 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1871",
        "source_url": "http://classics.mit.edu/Plato/crito.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Plato/crito.html",
        "pages": [("crito", "Crito")],
    },
    {
        "id": "plato-phaedo",
        "title": "Phaedo",
        "author": "Plato",
        "description": "The death scene of Socrates, with a discussion of the immortality of the soul.",
        "original_date": "~360 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1871",
        "source_url": "http://classics.mit.edu/Plato/phaedo.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Plato/phaedo.html",
        "pages": [("phaedo", "Phaedo")],
    },
    {
        "id": "plato-symposium",
        "title": "Symposium",
        "author": "Plato",
        "description": "A series of speeches on the nature of love, culminating in Socrates' account.",
        "original_date": "~385 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1871",
        "source_url": "http://classics.mit.edu/Plato/symposium.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Plato/symposium.html",
        "pages": [("symposium", "Symposium")],
    },
    {
        "id": "plato-meno",
        "title": "Meno",
        "author": "Plato",
        "description": "A dialogue exploring whether virtue can be taught.",
        "original_date": "~385 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1871",
        "source_url": "http://classics.mit.edu/Plato/meno.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Plato/meno.html",
        "pages": [("meno", "Meno")],
    },
    {
        "id": "aristotle-ethics",
        "title": "Nicomachean Ethics",
        "author": "Aristotle",
        "description": "Aristotle's most important work on ethics, exploring virtue and the good life.",
        "original_date": "~340 BCE",
        "translator": "W. D. Ross",
        "translation_date": "1925",
        "source_url": "http://classics.mit.edu/Aristotle/nicomachaen.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Aristotle/nicomachaen.{n}.{numeral}.html",
        "pages": 10,
    },
    {
        "id": "aristotle-politics",
        "title": "Politics",
        "author": "Aristotle",
        "description": "An examination of political life, the state, and the best forms of government.",
        "original_date": "~350 BCE",
        "translator": "Benjamin Jowett",
        "translation_date": "1885",
        "source_url": "http://classics.mit.edu/Aristotle/politics.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Aristotle/politics.{n}.{word}.html",
        "pages": 8,
    },
    {
        "id": "aristotle-poetics",
        "title": "Poetics",
        "author": "Aristotle",
        "description": "The foundational work of Western literary theory.",
        "original_date": "~335 BCE",
        "translator": "S. H. Butcher",
        "translation_date": "1895",
        "source_url": "http://classics.mit.edu/Aristotle/poetics.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Aristotle/poetics.1.1.html",
        "pages": [("poetics.1.1", "Poetics")],
    },
    {
        "id": "herodotus-histories",
        "title": "The Histories",
        "author": "Herodotus",
        "description": "The first great work of history, covering the Greco-Persian Wars.",
        "original_date": "~430 BCE",
        "translator": "George Rawlinson",
        "translation_date": "1858",
        "source_url": "http://classics.mit.edu/Herodotus/history.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Herodotus/history.{n}.{word}.html",
        "pages": 9,
    },
    {
        "id": "thucydides-peloponnesian-war",
        "title": "History of the Peloponnesian War",
        "author": "Thucydides",
        "description": "The definitive account of the war between Athens and Sparta.",
        "original_date": "~400 BCE",
        "translator": "Richard Crawley",
        "translation_date": "1874",
        "source_url": "http://classics.mit.edu/Thucydides/pelopwar.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Thucydides/pelopwar.{n}.{word}.html",
        "pages": 8,
    },
    {
        "id": "marcus-aurelius-meditations",
        "title": "Meditations",
        "author": "Marcus Aurelius",
        "description": "Personal reflections of the Roman Emperor on Stoic philosophy.",
        "original_date": "~170 CE",
        "translator": "George Long",
        "translation_date": "1862",
        "source_url": "http://classics.mit.edu/Antoninus/meditations.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Antoninus/meditations.{n}.{word}.html",
        "pages": 12,
    },
    {
        "id": "epictetus-discourses",
        "title": "Discourses",
        "author": "Epictetus",
        "description": "Teachings on Stoic ethics as recorded by Arrian.",
        "original_date": "~108 CE",
        "translator": "George Long",
        "translation_date": "1877",
        "source_url": "http://classics.mit.edu/Epictetus/discourses.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Epictetus/discourses.{n}.{word}.html",
        "pages": 4,
    },
    {
        "id": "lucretius-nature-of-things",
        "title": "On the Nature of Things",
        "author": "Lucretius",
        "description": "A poetic exposition of Epicurean physics and philosophy.",
        "original_date": "~55 BCE",
        "translator": "William Ellery Leonard",
        "translation_date": "1916",
        "source_url": "http://classics.mit.edu/Carus/nature_things.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Carus/nature_things.{n}.{word}.html",
        "pages": 6,
    },
    {
        "id": "tacitus-annals",
        "title": "The Annals",
        "author": "Tacitus",
        "description": "A history of the Roman Empire from Tiberius to Nero.",
        "original_date": "~116 CE",
        "translator": "Alfred John Church & William Jackson Brodribb",
        "translation_date": "1876",
        "source_url": "http://classics.mit.edu/Tacitus/annals.html",
        "license": "Public Domain",
        "url_pattern": "http://classics.mit.edu/Tacitus/annals.{n}.{word}.html",
        "pages": 16,
    },
    {
        "id": "plutarch-lives",
        "title": "Parallel Lives (Selections)",
        "author": "Plutarch",
        "description": "Biographies of famous Greeks and Romans, arranged in pairs.",
        "original_date": "~100 CE",
        "translator": "John Dryden",
        "translation_date": "1683",
        "source_url": "http://classics.mit.edu/Plutarch/index.html",
        "license": "Public Domain",
        # Plutarch's Lives are individual pages, not numbered books
        "url_pattern": "http://classics.mit.edu/Plutarch/{slug}.html",
        "pages": [
            ("lycurgus", "Lycurgus"),
            ("solon", "Solon"),
            ("caesar", "Caesar"),
            ("antony", "Antony"),
        ],
    },
]

# ── Number word lookups for ICA URL patterns ────────────────────────────────
# ICA uses both Roman numerals and English words in URLs depending on the work.

ROMAN = [
    "", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
    "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
    "xxi", "xxii", "xxiii", "xxiv",
]

WORDS = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    "twenty-one", "twenty-two", "twenty-three", "twenty-four",
]

# ICA uses "first", "second", etc. for some works (e.g. Thucydides, Herodotus)
ORDINALS = [
    "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth",
    "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth",
    "nineteenth", "twentieth", "twenty-first", "twenty-second",
    "twenty-third", "twenty-fourth",
]


def build_url(pattern: str, n: int) -> str:
    """Build a URL from a pattern with {n}, {numeral}, {word} placeholders."""
    return (
        pattern
        .replace("{n}", str(n))
        .replace("{numeral}", ROMAN[n])
        .replace("{word}", WORDS[n])
        .replace("{ordinal}", ORDINALS[n])
    )


def fetch_url(url: str) -> str:
    """Fetch a URL with retries."""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GreatBooks/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < 2:
                log.warning(f"  Retry {attempt + 1} for {url}: {e}")
                time.sleep(2 ** attempt)
            else:
                raise


def discover_url_pattern(book: dict, n: int) -> str:
    """Try different URL patterns to find one that works for this book."""
    pattern = book["url_pattern"]
    # Try numeral (roman), word, ordinal in order
    for placeholder in ["{numeral}", "{word}", "{ordinal}"]:
        if placeholder not in pattern:
            continue
        url = build_url(pattern, n)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GreatBooks/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return placeholder
        except Exception:
            pass

    # If pattern has {word}, try replacing with {ordinal} or {numeral}
    base = pattern
    for try_placeholder in ["{numeral}", "{word}", "{ordinal}"]:
        for orig in ["{numeral}", "{word}", "{ordinal}"]:
            if orig in base:
                test_pattern = base.replace(orig, try_placeholder)
                url = build_url(test_pattern, n)
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "GreatBooks/1.0"})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        if resp.status == 200:
                            book["url_pattern"] = test_pattern
                            log.info(f"  Discovered URL pattern: {test_pattern}")
                            return try_placeholder
                except Exception:
                    pass

    raise ValueError(f"Could not find working URL pattern for {book['id']}")


BOOK_TITLE_LABELS = [
    "", "Book I", "Book II", "Book III", "Book IV", "Book V",
    "Book VI", "Book VII", "Book VIII", "Book IX", "Book X",
    "Book XI", "Book XII", "Book XIII", "Book XIV", "Book XV",
    "Book XVI", "Book XVII", "Book XVIII", "Book XIX", "Book XX",
    "Book XXI", "Book XXII", "Book XXIII", "Book XXIV",
]


def fetch_book(book: dict) -> list[tuple[str, str]]:
    """Fetch all HTML pages for a book. Returns [(filename, html), ...]."""
    pages = book["pages"]
    html_files = []

    if isinstance(pages, list):
        # Single-page or explicit page list
        for slug, _title in pages:
            url = book["url_pattern"].replace("{slug}", slug)
            if "{n}" not in url and "{slug}" not in url:
                url = book["url_pattern"]
            log.info(f"  Fetching {url}")
            html = fetch_url(url)
            html_files.append((f"{slug}.html", html))
            time.sleep(0.5)
    elif isinstance(pages, int):
        # Numbered books — discover which URL variant works
        log.info(f"  Testing URL pattern for book 1...")
        discover_url_pattern(book, 1)

        for n in range(1, pages + 1):
            url = build_url(book["url_pattern"], n)
            log.info(f"  Fetching book {n}/{pages}: {url}")
            html = fetch_url(url)
            html_files.append((f"book_{n}.html", html))
            time.sleep(0.5)

    return html_files


def parse_book(html_files: list[tuple[str, str]], book: dict) -> dict:
    """Parse fetched HTML into chapters/segments using the classics parser."""
    if len(html_files) == 1:
        result = parse_classics(html_files[0][1])
        # Override title if the parser couldn't extract one
        if result["chapters"][0]["title"] == "Unknown":
            if isinstance(book["pages"], list):
                result["chapters"][0]["title"] = book["pages"][0][1]
            else:
                result["chapters"][0]["title"] = book["title"]
    else:
        result = parse_classics_multi(html_files)

    # Fix up chapter titles if they're generic "Book I" etc.
    # The parser extracts from HTML, which is usually fine for multi-book works
    if isinstance(book["pages"], list) and len(book["pages"]) > 1:
        for i, ch in enumerate(result["chapters"]):
            if ch["title"] == "Unknown" and i < len(book["pages"]):
                ch["title"] = book["pages"][i][1]

    return result


def insert_book(db_path: str, book: dict, parsed: dict):
    """Insert a parsed book into the database."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")

    try:
        # Insert book row
        conn.execute(
            """INSERT INTO books (id, title, author, description,
               original_date, translator, translation_date, source_url, license)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                book["id"], book["title"], book["author"], book["description"],
                book["original_date"], book["translator"],
                book["translation_date"], book["source_url"], book["license"],
            ),
        )

        total_segments = 0
        for ch_num, chapter in enumerate(parsed["chapters"], 1):
            # Insert chapter
            cur = conn.execute(
                "INSERT INTO chapters (book_id, number, title) VALUES (?, ?, ?)",
                (book["id"], ch_num, chapter["title"]),
            )
            chapter_id = cur.lastrowid

            # Insert segments
            seq = 1
            for g_idx, group in enumerate(chapter["groups"]):
                # Add paragraph_break between text groups (not before the first)
                if group["type"] == "text" and g_idx > 0:
                    prev = chapter["groups"][g_idx - 1]
                    if prev["type"] == "text":
                        conn.execute(
                            "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, '', 'paragraph_break')",
                            (chapter_id, seq),
                        )
                        seq += 1

                seg_type = group["type"]  # "text" or "heading"
                for segment_text in group["segments"]:
                    conn.execute(
                        "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, ?, ?)",
                        (chapter_id, seq, segment_text, seg_type),
                    )
                    seq += 1
                    total_segments += 1

        conn.commit()
        log.info(
            f"  Inserted: {len(parsed['chapters'])} chapters, {total_segments} segments"
        )
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def save_raw_html(book: dict, html_files: list[tuple[str, str]]):
    """Save raw HTML files to data/<book-id>/raw/."""
    raw_dir = os.path.join("data", book["id"], "raw")
    os.makedirs(raw_dir, exist_ok=True)
    for filename, html in html_files:
        path = os.path.join(raw_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)


def setup_data_dirs(book: dict):
    """Create the data directory structure for a book."""
    base = os.path.join("data", book["id"])
    for subdir in ["raw", "audio", "commentary"]:
        os.makedirs(os.path.join(base, subdir), exist_ok=True)


def book_exists(db_path: str, book_id: str) -> bool:
    """Check if a book already exists in the database."""
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT 1 FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()
    return row is not None


def main():
    parser = argparse.ArgumentParser(description="Batch-add ICA books")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and parse but don't insert into DB")
    parser.add_argument("--only", type=str, help="Only process a single book ID")
    args = parser.parse_args()

    db_path = "greatbooks.db"
    books = ICA_BOOKS

    if args.only:
        books = [b for b in books if b["id"] == args.only]
        if not books:
            log.error(f"Unknown book ID: {args.only}")
            log.info(f"Available: {', '.join(b['id'] for b in ICA_BOOKS)}")
            sys.exit(1)

    log.info(f"Processing {len(books)} books")
    succeeded = []
    failed = []
    skipped = []

    for book in books:
        log.info(f"{'=' * 60}")
        log.info(f"Processing: {book['author']} — {book['title']} [{book['id']}]")

        if book_exists(db_path, book["id"]):
            log.info(f"  Already in database, skipping")
            skipped.append(book["id"])
            continue

        try:
            # 1. Fetch HTML
            html_files = fetch_book(book)
            log.info(f"  Fetched {len(html_files)} page(s)")

            # 2. Save raw HTML
            setup_data_dirs(book)
            save_raw_html(book, html_files)
            log.info(f"  Saved raw HTML to data/{book['id']}/raw/")

            # 3. Parse
            parsed = parse_book(html_files, book)
            total_segs = sum(
                len(seg)
                for ch in parsed["chapters"]
                for g in ch["groups"]
                for seg in [g["segments"]]
            )
            log.info(
                f"  Parsed: {len(parsed['chapters'])} chapters, {total_segs} segments"
            )
            if "skipped" in parsed:
                for fname, err in parsed["skipped"]:
                    log.warning(f"  Skipped {fname}: {err}")

            # 4. Insert into DB
            if args.dry_run:
                log.info(f"  [DRY RUN] Would insert into database")
                # Print a sample
                ch = parsed["chapters"][0]
                log.info(f"  Sample chapter: {ch['title']}")
                if ch["groups"]:
                    first_seg = ch["groups"][0]["segments"][0]
                    log.info(f"  First segment: {first_seg[:100]}...")
            else:
                insert_book(db_path, book, parsed)

            succeeded.append(book["id"])

        except Exception as e:
            log.error(f"  FAILED: {e}")
            failed.append((book["id"], str(e)))

    # Summary
    log.info(f"{'=' * 60}")
    log.info(f"DONE — {len(succeeded)} succeeded, {len(skipped)} skipped, {len(failed)} failed")
    if succeeded:
        log.info(f"  Succeeded: {', '.join(succeeded)}")
    if skipped:
        log.info(f"  Skipped: {', '.join(skipped)}")
    if failed:
        log.info(f"  Failed:")
        for book_id, err in failed:
            log.info(f"    {book_id}: {err}")


if __name__ == "__main__":
    main()
