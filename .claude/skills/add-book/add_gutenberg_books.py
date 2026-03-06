#!/usr/bin/env python3
"""
Batch-add books from Project Gutenberg.

Fetches HTML, parses into segments, inserts into the database.

Usage:
    .venv/bin/python .claude/skills/add-book/add_gutenberg_books.py [--dry-run] [--only BOOK_ID]

Options:
    --dry-run   Fetch and parse but don't insert into DB
    --only ID   Only process a single book (by book_id, e.g. milton-paradise-lost)
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
from parse_html import parse_gutenberg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Book definitions ────────────────────────────────────────────────────────
# Each entry defines everything needed to fetch, parse, and insert a book.

GUTENBERG_BOOKS = [
    {
        "id": "milton-paradise-lost",
        "title": "Paradise Lost",
        "author": "John Milton",
        "description": "The epic poem of the Fall of Man — Satan's rebellion, the temptation of Adam and Eve, and their expulsion from Eden.",
        "original_date": "1667",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/26",
        "license": "Public Domain",
        "pg_id": 26,
    },
    {
        "id": "augustine-confessions",
        "title": "Confessions",
        "author": "Augustine",
        "description": "Augustine's spiritual autobiography — his journey from sin to Christian faith.",
        "original_date": "~400 CE",
        "translator": "E. B. Pusey",
        "translation_date": "1838",
        "source_url": "https://www.gutenberg.org/ebooks/3296",
        "license": "Public Domain",
        "pg_id": 3296,
    },
    {
        "id": "dante-divine-comedy",
        "title": "The Divine Comedy",
        "author": "Dante Alighieri",
        "description": "Dante's journey through Hell, Purgatory, and Paradise — the supreme poem of the Middle Ages.",
        "original_date": "~1320",
        "translator": "H. F. Cary",
        "translation_date": "1814",
        "source_url": "https://www.gutenberg.org/ebooks/8800",
        "license": "Public Domain",
        "pg_id": 8800,
    },
    {
        "id": "chaucer-canterbury-tales",
        "title": "The Canterbury Tales",
        "author": "Geoffrey Chaucer",
        "description": "A collection of stories told by pilgrims on their way to Canterbury Cathedral.",
        "original_date": "~1400",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/2383",
        "license": "Public Domain",
        "pg_id": 2383,
    },
    {
        "id": "machiavelli-the-prince",
        "title": "The Prince",
        "author": "Niccolò Machiavelli",
        "description": "The foundational text of modern political philosophy — a handbook on acquiring and maintaining power.",
        "original_date": "1532",
        "translator": "W. K. Marriott",
        "translation_date": "1908",
        "source_url": "https://www.gutenberg.org/ebooks/1232",
        "license": "Public Domain",
        "pg_id": 1232,
    },
    {
        "id": "montaigne-essays",
        "title": "Essays",
        "author": "Michel de Montaigne",
        "description": "The pioneering personal essays — wide-ranging reflections on life, death, knowledge, and human nature.",
        "original_date": "1580",
        "translator": "Charles Cotton",
        "translation_date": "1685",
        "source_url": "https://www.gutenberg.org/ebooks/3600",
        "license": "Public Domain",
        "pg_id": 3600,
    },
    {
        "id": "shakespeare-hamlet",
        "title": "Hamlet",
        "author": "William Shakespeare",
        "description": "The tragedy of Prince Hamlet's quest to avenge his father's murder.",
        "original_date": "~1601",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/1524",
        "license": "Public Domain",
        "pg_id": 1524,
    },
    {
        "id": "shakespeare-othello",
        "title": "Othello",
        "author": "William Shakespeare",
        "description": "The tragedy of Othello, the Moor of Venice — jealousy, manipulation, and destruction.",
        "original_date": "~1603",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/1531",
        "license": "Public Domain",
        "pg_id": 1531,
    },
    {
        "id": "shakespeare-macbeth",
        "title": "Macbeth",
        "author": "William Shakespeare",
        "description": "The tragedy of Macbeth — ambition, guilt, and the corruption of power.",
        "original_date": "~1606",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/1533",
        "license": "Public Domain",
        "pg_id": 1533,
    },
    {
        "id": "shakespeare-king-lear",
        "title": "King Lear",
        "author": "William Shakespeare",
        "description": "The tragedy of King Lear — madness, betrayal, and the bonds between parents and children.",
        "original_date": "~1606",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/1128",
        "license": "Public Domain",
        "pg_id": 1128,
        "url_format": "epub",  # Only available in epub format
    },
    {
        "id": "shakespeare-the-tempest",
        "title": "The Tempest",
        "author": "William Shakespeare",
        "description": "Prospero's magical island — a romance of forgiveness, power, and freedom.",
        "original_date": "~1611",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/23042",
        "license": "Public Domain",
        "pg_id": 23042,
    },
    {
        "id": "cervantes-don-quixote",
        "title": "Don Quixote",
        "author": "Miguel de Cervantes",
        "description": "The first modern novel — a deluded knight's comic adventures across Spain.",
        "original_date": "1605",
        "translator": "John Ormsby",
        "translation_date": "1885",
        "source_url": "https://www.gutenberg.org/ebooks/996",
        "license": "Public Domain",
        "pg_id": 996,
    },
    {
        "id": "hobbes-leviathan",
        "title": "Leviathan",
        "author": "Thomas Hobbes",
        "description": "The foundational work of modern political philosophy — the social contract and the sovereign state.",
        "original_date": "1651",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/3207",
        "license": "Public Domain",
        "pg_id": 3207,
    },
    {
        "id": "descartes-discourse-on-method",
        "title": "Discourse on the Method",
        "author": "René Descartes",
        "description": "The foundation of modern philosophy — 'I think, therefore I am.'",
        "original_date": "1637",
        "translator": "John Veitch",
        "translation_date": "1850",
        "source_url": "https://www.gutenberg.org/ebooks/59",
        "license": "Public Domain",
        "pg_id": 59,
    },
    {
        "id": "spinoza-ethics",
        "title": "Ethics",
        "author": "Baruch Spinoza",
        "description": "A systematic treatise on God, nature, the mind, and human freedom — written in geometric form.",
        "original_date": "1677",
        "translator": "R. H. M. Elwes",
        "translation_date": "1883",
        "source_url": "https://www.gutenberg.org/ebooks/3800",
        "license": "Public Domain",
        "pg_id": 3800,
    },
    {
        "id": "pascal-pensees",
        "title": "Pensées",
        "author": "Blaise Pascal",
        "description": "Fragments of a defense of Christianity — the famous wager, the misery of man without God.",
        "original_date": "1670",
        "translator": "W. F. Trotter",
        "translation_date": "1910",
        "source_url": "https://www.gutenberg.org/ebooks/18269",
        "license": "Public Domain",
        "pg_id": 18269,
    },
    {
        "id": "locke-second-treatise",
        "title": "Second Treatise of Government",
        "author": "John Locke",
        "description": "The theory of natural rights, consent of the governed, and the right of revolution.",
        "original_date": "1689",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/7370",
        "license": "Public Domain",
        "pg_id": 7370,
    },
    {
        "id": "swift-gullivers-travels",
        "title": "Gulliver's Travels",
        "author": "Jonathan Swift",
        "description": "Gulliver's voyages to Lilliput, Brobdingnag, Laputa, and the Houyhnhnms — satire of human nature.",
        "original_date": "1726",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/829",
        "license": "Public Domain",
        "pg_id": 829,
    },
    {
        "id": "hume-enquiry",
        "title": "An Enquiry Concerning Human Understanding",
        "author": "David Hume",
        "description": "A systematic examination of the origins and limits of human knowledge.",
        "original_date": "1748",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/9662",
        "license": "Public Domain",
        "pg_id": 9662,
    },
    {
        "id": "rousseau-social-contract",
        "title": "The Social Contract",
        "author": "Jean-Jacques Rousseau",
        "description": "The theory of popular sovereignty — 'Man is born free, and everywhere he is in chains.'",
        "original_date": "1762",
        "translator": "G. D. H. Cole",
        "translation_date": "1913",
        "source_url": "https://www.gutenberg.org/ebooks/46333",
        "license": "Public Domain",
        "pg_id": 46333,
    },
    {
        "id": "smith-wealth-of-nations",
        "title": "The Wealth of Nations",
        "author": "Adam Smith",
        "description": "The foundational work of modern economics — the invisible hand, division of labor, and free markets.",
        "original_date": "1776",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/3300",
        "license": "Public Domain",
        "pg_id": 3300,
    },
    {
        "id": "kant-critique-of-pure-reason",
        "title": "Critique of Pure Reason",
        "author": "Immanuel Kant",
        "description": "The critical examination of the powers and limits of human reason.",
        "original_date": "1781",
        "translator": "J. M. D. Meiklejohn",
        "translation_date": "1855",
        "source_url": "https://www.gutenberg.org/ebooks/4280",
        "license": "Public Domain",
        "pg_id": 4280,
    },
    {
        "id": "hamilton-federalist",
        "title": "The Federalist Papers",
        "author": "Alexander Hamilton, James Madison, John Jay",
        "description": "85 essays arguing for ratification of the US Constitution.",
        "original_date": "1788",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/18",
        "license": "Public Domain",
        "pg_id": 18,
    },
    {
        "id": "goethe-faust",
        "title": "Faust",
        "author": "Johann Wolfgang von Goethe",
        "description": "The scholar who sells his soul to the devil — the supreme drama of German literature.",
        "original_date": "1808",
        "translator": "Bayard Taylor",
        "translation_date": "1870",
        "source_url": "https://www.gutenberg.org/ebooks/14591",
        "license": "Public Domain",
        "pg_id": 14591,
    },
    {
        "id": "austen-pride-and-prejudice",
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "description": "Elizabeth Bennet and Mr. Darcy — the archetypal romance of manners.",
        "original_date": "1813",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/1342",
        "license": "Public Domain",
        "pg_id": 1342,
    },
    {
        "id": "austen-emma",
        "title": "Emma",
        "author": "Jane Austen",
        "description": "Emma Woodhouse — 'handsome, clever, and rich' — meddles in the love lives of her neighbors.",
        "original_date": "1815",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/158",
        "license": "Public Domain",
        "pg_id": 158,
    },
    {
        "id": "tocqueville-democracy-in-america",
        "title": "Democracy in America",
        "author": "Alexis de Tocqueville",
        "description": "The classic analysis of American democratic society and its institutions.",
        "original_date": "1835",
        "translator": "Henry Reeve",
        "translation_date": "1835",
        "source_url": "https://www.gutenberg.org/ebooks/815",
        "license": "Public Domain",
        "pg_id": 815,
        "pg_id_vol2": 816,  # Two-volume work
    },
    {
        "id": "kierkegaard-fear-and-trembling",
        "title": "Fear and Trembling",
        "author": "Søren Kierkegaard",
        "description": "A meditation on faith through the story of Abraham and Isaac.",
        "original_date": "1843",
        "translator": "Walter Lowrie",
        "translation_date": "1941",
        "source_url": "https://www.gutenberg.org/ebooks/45868",
        "license": "Public Domain",
        "pg_id": 45868,
    },
    {
        "id": "eliot-middlemarch",
        "title": "Middlemarch",
        "author": "George Eliot",
        "description": "A panoramic portrait of English provincial life — ambition, marriage, and reform.",
        "original_date": "1871",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/145",
        "license": "Public Domain",
        "pg_id": 145,
    },
    {
        "id": "melville-moby-dick",
        "title": "Moby Dick",
        "author": "Herman Melville",
        "description": "Captain Ahab's obsessive hunt for the great white whale.",
        "original_date": "1851",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/2701",
        "license": "Public Domain",
        "pg_id": 2701,
    },
    {
        "id": "dostoevsky-brothers-karamazov",
        "title": "The Brothers Karamazov",
        "author": "Fyodor Dostoevsky",
        "description": "The great Russian novel of faith, doubt, and parricide.",
        "original_date": "1880",
        "translator": "Constance Garnett",
        "translation_date": "1912",
        "source_url": "https://www.gutenberg.org/ebooks/28054",
        "license": "Public Domain",
        "pg_id": 28054,
    },
    {
        "id": "tolstoy-war-and-peace",
        "title": "War and Peace",
        "author": "Leo Tolstoy",
        "description": "The epic of Russia during the Napoleonic Wars — history, philosophy, and the lives of three families.",
        "original_date": "1869",
        "translator": "Aylmer Maude & Louise Maude",
        "translation_date": "1904",
        "source_url": "https://www.gutenberg.org/ebooks/2600",
        "license": "Public Domain",
        "pg_id": 2600,
    },
    {
        "id": "darwin-origin-of-species",
        "title": "On the Origin of Species",
        "author": "Charles Darwin",
        "description": "The theory of evolution by natural selection — the most important book in the history of biology.",
        "original_date": "1859",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/22764",
        "license": "Public Domain",
        "pg_id": 22764,
    },
    {
        "id": "nietzsche-beyond-good-and-evil",
        "title": "Beyond Good and Evil",
        "author": "Friedrich Nietzsche",
        "description": "A critique of past philosophy and an exploration of the will to power.",
        "original_date": "1886",
        "translator": "Helen Zimmern",
        "translation_date": "1906",
        "source_url": "https://www.gutenberg.org/ebooks/4363",
        "license": "Public Domain",
        "pg_id": 4363,
    },
    {
        "id": "twain-huckleberry-finn",
        "title": "Adventures of Huckleberry Finn",
        "author": "Mark Twain",
        "description": "Huck and Jim's journey down the Mississippi — the great American novel.",
        "original_date": "1884",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/76",
        "license": "Public Domain",
        "pg_id": 76,
    },
    {
        "id": "conrad-heart-of-darkness",
        "title": "Heart of Darkness",
        "author": "Joseph Conrad",
        "description": "Marlow's journey up the Congo River to find the mysterious Kurtz.",
        "original_date": "1899",
        "translator": None,
        "translation_date": None,
        "source_url": "https://www.gutenberg.org/ebooks/219",
        "license": "Public Domain",
        "pg_id": 219,
    },
]


def fetch_url(url: str) -> str:
    """Fetch a URL with retries and Gutenberg-friendly headers."""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "GreatBooks/1.0 (educational project)",
                "Accept": "text/html",
            })
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < 2:
                log.warning(f"  Retry {attempt + 1} for {url}: {e}")
                time.sleep(2 ** (attempt + 1))
            else:
                raise


def build_gutenberg_url(pg_id: int, url_format: str = "files") -> str:
    """Build a Gutenberg download URL."""
    if url_format == "epub":
        return f"https://www.gutenberg.org/cache/epub/{pg_id}/pg{pg_id}-images.html"
    else:
        return f"https://www.gutenberg.org/files/{pg_id}/{pg_id}-h/{pg_id}-h.htm"


def fetch_book(book: dict) -> str:
    """Fetch the HTML for a Gutenberg book. Tries /files/ then /cache/epub/."""
    url_format = book.get("url_format", "files")

    if url_format == "epub":
        # Only epub available
        url = build_gutenberg_url(book["pg_id"], "epub")
        log.info(f"  Fetching (epub): {url}")
        return fetch_url(url)

    # Try /files/ first
    url = build_gutenberg_url(book["pg_id"], "files")
    log.info(f"  Fetching: {url}")
    try:
        return fetch_url(url)
    except Exception as e:
        log.warning(f"  /files/ format failed: {e}")

    # Fallback to /cache/epub/
    url = build_gutenberg_url(book["pg_id"], "epub")
    log.info(f"  Trying epub format: {url}")
    return fetch_url(url)


def fetch_multivolume_book(book: dict) -> str:
    """Fetch and combine HTML for multi-volume works (e.g. Tocqueville)."""
    vol1_html = fetch_book(book)

    if "pg_id_vol2" in book:
        book2 = dict(book)
        book2["pg_id"] = book["pg_id_vol2"]
        log.info(f"  Fetching volume 2...")
        vol2_html = fetch_book(book2)

        # Combine: strip boilerplate from vol2 and append
        # We'll let the parser handle the full combined HTML
        # Just concatenate with a separator
        vol1_html = vol1_html + "\n<!-- VOLUME BREAK -->\n" + vol2_html

    return vol1_html


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
                # Add paragraph_break between consecutive text groups
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


def save_raw_html(book: dict, html: str):
    """Save raw HTML to data/<book-id>/raw/."""
    raw_dir = os.path.join("data", book["id"], "raw")
    os.makedirs(raw_dir, exist_ok=True)
    path = os.path.join(raw_dir, "source.html")
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
    parser = argparse.ArgumentParser(description="Batch-add Gutenberg books")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and parse but don't insert into DB")
    parser.add_argument("--only", type=str, help="Only process a single book ID")
    args = parser.parse_args()

    db_path = "greatbooks.db"
    books = GUTENBERG_BOOKS

    if args.only:
        books = [b for b in books if b["id"] == args.only]
        if not books:
            log.error(f"Unknown book ID: {args.only}")
            log.info(f"Available: {', '.join(b['id'] for b in GUTENBERG_BOOKS)}")
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
            if "pg_id_vol2" in book:
                html = fetch_multivolume_book(book)
            else:
                html = fetch_book(book)
            log.info(f"  Fetched {len(html):,} bytes")

            # 2. Save raw HTML
            setup_data_dirs(book)
            save_raw_html(book, html)
            log.info(f"  Saved raw HTML to data/{book['id']}/raw/")

            # 3. Parse
            parsed = parse_gutenberg(html)
            total_segs = sum(
                len(g["segments"])
                for ch in parsed["chapters"]
                for g in ch["groups"]
            )
            log.info(
                f"  Parsed: {len(parsed['chapters'])} chapters, {total_segs} segments"
            )

            # Sanity check
            if len(parsed["chapters"]) == 0:
                raise ValueError("No chapters found in parsed output")
            if total_segs < 10:
                raise ValueError(f"Only {total_segs} segments found — likely parsing error")

            # 4. Insert into DB
            if args.dry_run:
                log.info(f"  [DRY RUN] Would insert into database")
                for i, ch in enumerate(parsed["chapters"][:5]):
                    seg_count = sum(len(g["segments"]) for g in ch["groups"])
                    log.info(f"    Ch {i+1}: {ch['title']} ({seg_count} segments)")
                if len(parsed["chapters"]) > 5:
                    log.info(f"    ... and {len(parsed['chapters']) - 5} more chapters")
            else:
                insert_book(db_path, book, parsed)

            succeeded.append(book["id"])

        except Exception as e:
            log.error(f"  FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed.append((book["id"], str(e)))

        # Be polite to Gutenberg servers
        time.sleep(2)

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
