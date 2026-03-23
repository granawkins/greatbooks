#!/usr/bin/env python3
"""
Batch-add books from Project Gutenberg.

Fetches HTML, parses into segments, inserts into the database.

Usage:
    .venv/bin/python .claude/skills/curator/text/add_gutenberg_books.py [--dry-run] [--only BOOK_ID]

Options:
    --dry-run   Fetch and parse but don't insert into DB
    --only ID   Only process a single book (by book_id, e.g. milton-paradise-lost)

Each book entry requires: id, title, author, pg_id
Optional: url_format ("epub" for epub-only books), pg_id_vol2 (multi-volume works)
All other metadata (description, translator, original_date) defaults to None and can
be filled in the DB later.

NOTE: The following catalog books are NOT on Gutenberg and need separate handling:
  - Death of Ivan Ilyich (Tolstoy) — Standard Ebooks
  - To the Lighthouse (Woolf) — Standard Ebooks
  - Point Counter Point (Huxley) — Internet Archive
  - As I Lay Dying (Faulkner) — Internet Archive

NOTE: Ancient/classical texts are handled by add_ica_books.py (MIT Classics Archive):
  Homer, Plato, Aristotle, Sophocles, Virgil, Marcus Aurelius, Epictetus,
  Herodotus, Thucydides, Lucretius, Tacitus, Plutarch
"""

import argparse
import logging
import os
import re
import sqlite3
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from parse_html import parse_gutenberg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# ── Book definitions ─────────────────────────────────────────────────────────
# 1 line per book. Required: id, title, author, pg_id
# Optional: url_format="epub" (epub-only books), pg_id_vol2 (multi-volume)

GUTENBERG_BOOKS = [
    # ── Medieval & Renaissance ───────────────────────────────────────────────
    {"id": "dante-divine-comedy",           "title": "The Divine Comedy",                    "author": "Dante Alighieri",              "pg_id": 8800},
    {"id": "chaucer-canterbury-tales",      "title": "The Canterbury Tales",                 "author": "Geoffrey Chaucer",             "pg_id": 2383},
    {"id": "machiavelli-the-prince",        "title": "The Prince",                           "author": "Niccolò Machiavelli",          "pg_id": 1232},
    {"id": "montaigne-essays",              "title": "Essays",                               "author": "Michel de Montaigne",          "pg_id": 3600},
    {"id": "cervantes-don-quixote",         "title": "Don Quixote",                          "author": "Miguel de Cervantes",          "pg_id": 996},

    # ── Shakespeare ──────────────────────────────────────────────────────────
    {"id": "shakespeare-romeo-and-juliet",  "title": "Romeo and Juliet",                     "author": "William Shakespeare",          "pg_id": 1513},
    {"id": "shakespeare-hamlet",            "title": "Hamlet",                               "author": "William Shakespeare",          "pg_id": 1524},
    {"id": "shakespeare-othello",           "title": "Othello",                              "author": "William Shakespeare",          "pg_id": 1531},
    {"id": "shakespeare-macbeth",           "title": "Macbeth",                              "author": "William Shakespeare",          "pg_id": 1533},
    {"id": "shakespeare-king-lear",         "title": "King Lear",                            "author": "William Shakespeare",          "pg_id": 1128,  "url_format": "epub"},
    {"id": "shakespeare-the-tempest",       "title": "The Tempest",                          "author": "William Shakespeare",          "pg_id": 23042},

    # ── 17th Century ─────────────────────────────────────────────────────────
    {"id": "augustine-confessions",         "title": "Confessions",                          "author": "Augustine",                    "pg_id": 3296},
    {"id": "descartes-discourse-on-method", "title": "Discourse on the Method",              "author": "René Descartes",               "pg_id": 59},
    {"id": "descartes-meditations",         "title": "Meditations on First Philosophy",      "author": "René Descartes",               "pg_id": 70091},
    {"id": "hobbes-leviathan",              "title": "Leviathan",                            "author": "Thomas Hobbes",                "pg_id": 3207},
    {"id": "pascal-pensees",               "title": "Pensées",                              "author": "Blaise Pascal",                "pg_id": 18269},
    {"id": "milton-paradise-lost",          "title": "Paradise Lost",                        "author": "John Milton",                  "pg_id": 26},
    {"id": "spinoza-ethics",               "title": "Ethics",                               "author": "Baruch Spinoza",               "pg_id": 3800},
    {"id": "locke-second-treatise",         "title": "Second Treatise of Government",        "author": "John Locke",                   "pg_id": 7370},

    # ── 18th Century ─────────────────────────────────────────────────────────
    {"id": "defoe-robinson-crusoe",         "title": "Robinson Crusoe",                      "author": "Daniel Defoe",                 "pg_id": 521},
    {"id": "swift-gullivers-travels",       "title": "Gulliver's Travels",                   "author": "Jonathan Swift",               "pg_id": 829},
    {"id": "fielding-tom-jones",            "title": "Tom Jones",                            "author": "Henry Fielding",               "pg_id": 6593},
    {"id": "sterne-tristram-shandy",        "title": "Tristram Shandy",                      "author": "Laurence Sterne",              "pg_id": 1079},
    {"id": "hume-enquiry",                  "title": "An Enquiry Concerning Human Understanding", "author": "David Hume",             "pg_id": 9662},
    {"id": "rousseau-social-contract",      "title": "The Social Contract",                  "author": "Jean-Jacques Rousseau",        "pg_id": 46333},
    {"id": "laclos-liaisons-dangereuses",   "title": "Les Liaisons Dangereuses",             "author": "Pierre Choderlos de Laclos",   "pg_id": 45512},
    {"id": "smith-wealth-of-nations",       "title": "The Wealth of Nations",                "author": "Adam Smith",                   "pg_id": 3300},
    {"id": "goethe-sorrows-of-werther",     "title": "The Sorrows of Young Werther",         "author": "Johann Wolfgang von Goethe",   "pg_id": 2527},
    {"id": "hamilton-federalist",           "title": "The Federalist Papers",                "author": "Alexander Hamilton, James Madison, John Jay", "pg_id": 18},
    {"id": "franklin-autobiography",        "title": "Autobiography of Benjamin Franklin",   "author": "Benjamin Franklin",            "pg_id": 20203},
    {"id": "kant-critique-of-pure-reason",  "title": "Critique of Pure Reason",              "author": "Immanuel Kant",                "pg_id": 4280},

    # ── Early 19th Century ───────────────────────────────────────────────────
    {"id": "goethe-faust",                  "title": "Faust",                                "author": "Johann Wolfgang von Goethe",   "pg_id": 14591},
    {"id": "austen-sense-and-sensibility",  "title": "Sense and Sensibility",                "author": "Jane Austen",                  "pg_id": 161},
    {"id": "austen-pride-and-prejudice",    "title": "Pride and Prejudice",                  "author": "Jane Austen",                  "pg_id": 1342},
    {"id": "austen-emma",                   "title": "Emma",                                 "author": "Jane Austen",                  "pg_id": 158},
    {"id": "shelley-frankenstein",          "title": "Frankenstein",                         "author": "Mary Shelley",                 "pg_id": 84},
    {"id": "irving-sleepy-hollow",          "title": "The Legend of Sleepy Hollow",          "author": "Washington Irving",            "pg_id": 41},
    {"id": "stendhal-red-and-black",        "title": "The Red and the Black",                "author": "Stendhal",                     "pg_id": 44747},
    {"id": "tocqueville-democracy",         "title": "Democracy in America",                 "author": "Alexis de Tocqueville",        "pg_id": 815, "pg_id_vol2": 816},
    {"id": "kierkegaard-fear-trembling",    "title": "Fear and Trembling",                   "author": "Søren Kierkegaard",            "pg_id": 45868},
    {"id": "dickens-oliver-twist",          "title": "Oliver Twist",                         "author": "Charles Dickens",              "pg_id": 730},
    {"id": "stendhal-charterhouse-parma",   "title": "The Charterhouse of Parma",            "author": "Stendhal",                     "pg_id": 66374},
    {"id": "dumas-count-monte-cristo",      "title": "The Count of Monte Cristo",            "author": "Alexandre Dumas",              "pg_id": 1184},
    {"id": "douglass-narrative",            "title": "Narrative of the Life of Frederick Douglass", "author": "Frederick Douglass",  "pg_id": 23},
    {"id": "bronte-jane-eyre",              "title": "Jane Eyre",                            "author": "Charlotte Brontë",             "pg_id": 1260},
    {"id": "bronte-wuthering-heights",      "title": "Wuthering Heights",                    "author": "Emily Brontë",                 "pg_id": 768},
    {"id": "thackeray-vanity-fair",         "title": "Vanity Fair",                          "author": "William Makepeace Thackeray",  "pg_id": 599},

    # ── Mid 19th Century ─────────────────────────────────────────────────────
    {"id": "dickens-david-copperfield",     "title": "David Copperfield",                    "author": "Charles Dickens",              "pg_id": 766},
    {"id": "hawthorne-scarlet-letter",      "title": "The Scarlet Letter",                   "author": "Nathaniel Hawthorne",          "pg_id": 25344},
    {"id": "melville-moby-dick",            "title": "Moby Dick",                            "author": "Herman Melville",              "pg_id": 2701},
    {"id": "dickens-bleak-house",           "title": "Bleak House",                          "author": "Charles Dickens",              "pg_id": 1023},
    {"id": "thoreau-walden",               "title": "Walden",                               "author": "Henry David Thoreau",          "pg_id": 205},
    {"id": "flaubert-madame-bovary",        "title": "Madame Bovary",                        "author": "Gustave Flaubert",             "pg_id": 2413},
    {"id": "dickens-tale-two-cities",       "title": "A Tale of Two Cities",                 "author": "Charles Dickens",              "pg_id": 98},
    {"id": "darwin-origin-of-species",      "title": "On the Origin of Species",             "author": "Charles Darwin",               "pg_id": 22764},
    {"id": "dickens-great-expectations",    "title": "Great Expectations",                   "author": "Charles Dickens",              "pg_id": 1400},
    {"id": "turgenev-fathers-and-sons",     "title": "Fathers and Sons",                     "author": "Ivan Turgenev",                "pg_id": 30723},
    {"id": "hugo-les-miserables",           "title": "Les Misérables",                       "author": "Victor Hugo",                  "pg_id": 135},
    {"id": "dostoevsky-notes-underground",  "title": "Notes from Underground",               "author": "Fyodor Dostoevsky",            "pg_id": 600},
    {"id": "carroll-alice-wonderland",      "title": "Alice's Adventures in Wonderland",     "author": "Lewis Carroll",                "pg_id": 11},
    {"id": "dostoevsky-crime-punishment",   "title": "Crime and Punishment",                 "author": "Fyodor Dostoevsky",            "pg_id": 2554},
    {"id": "alcott-little-women",           "title": "Little Women",                         "author": "Louisa May Alcott",            "pg_id": 514},
    {"id": "dostoevsky-the-idiot",          "title": "The Idiot",                            "author": "Fyodor Dostoevsky",            "pg_id": 2638},
    {"id": "tolstoy-war-and-peace",         "title": "War and Peace",                        "author": "Leo Tolstoy",                  "pg_id": 2600},
    {"id": "eliot-middlemarch",             "title": "Middlemarch",                          "author": "George Eliot",                 "pg_id": 145},
    {"id": "twain-tom-sawyer",              "title": "The Adventures of Tom Sawyer",         "author": "Mark Twain",                   "pg_id": 74},
    {"id": "tolstoy-anna-karenina",         "title": "Anna Karenina",                        "author": "Leo Tolstoy",                  "pg_id": 1399},
    {"id": "ibsen-dolls-house",             "title": "A Doll's House",                       "author": "Henrik Ibsen",                 "pg_id": 2542},
    {"id": "dostoevsky-brothers-karamazov", "title": "The Brothers Karamazov",               "author": "Fyodor Dostoevsky",            "pg_id": 28054},

    # ── Late 19th Century ────────────────────────────────────────────────────
    {"id": "james-portrait-of-lady",        "title": "The Portrait of a Lady",               "author": "Henry James",                  "pg_id": 2833},
    {"id": "stevenson-treasure-island",     "title": "Treasure Island",                      "author": "Robert Louis Stevenson",       "pg_id": 120},
    {"id": "twain-huckleberry-finn",        "title": "The Adventures of Huckleberry Finn",   "author": "Mark Twain",                   "pg_id": 76},
    {"id": "nietzsche-zarathustra",         "title": "Thus Spake Zarathustra",               "author": "Friedrich Nietzsche",          "pg_id": 1998},
    {"id": "nietzsche-beyond-good-evil",    "title": "Beyond Good and Evil",                 "author": "Friedrich Nietzsche",          "pg_id": 4363},
    {"id": "stevenson-jekyll-hyde",         "title": "Dr. Jekyll and Mr. Hyde",              "author": "Robert Louis Stevenson",       "pg_id": 43},
    {"id": "doyle-study-in-scarlet",        "title": "A Study in Scarlet",                   "author": "Arthur Conan Doyle",           "pg_id": 244},
    {"id": "wilde-dorian-gray",             "title": "The Picture of Dorian Gray",           "author": "Oscar Wilde",                  "pg_id": 174},
    {"id": "doyle-sherlock-holmes",         "title": "The Adventures of Sherlock Holmes",    "author": "Arthur Conan Doyle",           "pg_id": 1661},
    {"id": "wilde-importance-earnest",      "title": "The Importance of Being Earnest",      "author": "Oscar Wilde",                  "pg_id": 844},
    {"id": "stoker-dracula",               "title": "Dracula",                              "author": "Bram Stoker",                  "pg_id": 345},
    {"id": "james-turn-of-screw",           "title": "The Turn of the Screw",                "author": "Henry James",                  "pg_id": 209},
    {"id": "butler-way-of-all-flesh",       "title": "The Way of All Flesh",                 "author": "Samuel Butler",                "pg_id": 2084},

    # ── 1900–1910 ────────────────────────────────────────────────────────────
    {"id": "conrad-lord-jim",              "title": "Lord Jim",                             "author": "Joseph Conrad",                "pg_id": 5658},
    {"id": "dreiser-sister-carrie",         "title": "Sister Carrie",                        "author": "Theodore Dreiser",             "pg_id": 233},
    {"id": "baum-wizard-of-oz",             "title": "The Wonderful Wizard of Oz",           "author": "L. Frank Baum",                "pg_id": 55},
    {"id": "kipling-kim",                  "title": "Kim",                                  "author": "Rudyard Kipling",              "pg_id": 2226},
    {"id": "james-wings-dove",              "title": "The Wings of the Dove",                "author": "Henry James",                  "pg_id": 29452, "pg_id_vol2": 30059},
    {"id": "james-ambassadors",             "title": "The Ambassadors",                      "author": "Henry James",                  "pg_id": 432},
    {"id": "london-call-of-wild",           "title": "The Call of the Wild",                 "author": "Jack London",                  "pg_id": 215},
    {"id": "dubois-souls-black-folk",       "title": "The Souls of Black Folk",              "author": "W.E.B. Du Bois",               "pg_id": 408},
    {"id": "conrad-nostromo",              "title": "Nostromo",                             "author": "Joseph Conrad",                "pg_id": 2021},
    {"id": "barrie-peter-pan",              "title": "Peter Pan",                            "author": "J.M. Barrie",                  "pg_id": 16},
    {"id": "james-golden-bowl",             "title": "The Golden Bowl",                      "author": "Henry James",                  "pg_id": 4264},
    {"id": "wharton-house-of-mirth",        "title": "The House of Mirth",                   "author": "Edith Wharton",                "pg_id": 284},
    {"id": "conrad-heart-of-darkness",     "title": "Heart of Darkness",                   "author": "Joseph Conrad",                "pg_id": 219},
    {"id": "conrad-secret-agent",           "title": "The Secret Agent",                     "author": "Joseph Conrad",                "pg_id": 974},
    {"id": "forster-room-with-view",        "title": "A Room with a View",                   "author": "E.M. Forster",                 "pg_id": 2641},
    {"id": "montgomery-anne-green-gables",  "title": "Anne of Green Gables",                 "author": "L.M. Montgomery",              "pg_id": 45},
    {"id": "bennett-old-wives-tale",        "title": "The Old Wives' Tale",                  "author": "Arnold Bennett",               "pg_id": 5247},

    # ── 1910–1920 ────────────────────────────────────────────────────────────
    {"id": "forster-howards-end",           "title": "Howards End",                          "author": "E.M. Forster",                 "pg_id": 2946},
    {"id": "beerbohm-zuleika-dobson",       "title": "Zuleika Dobson",                       "author": "Max Beerbohm",                 "pg_id": 1845},
    {"id": "lawrence-sons-lovers",          "title": "Sons and Lovers",                      "author": "D.H. Lawrence",                "pg_id": 217},
    {"id": "maugham-human-bondage",         "title": "Of Human Bondage",                     "author": "W. Somerset Maugham",          "pg_id": 351},
    {"id": "ford-good-soldier",             "title": "The Good Soldier",                     "author": "Ford Madox Ford",              "pg_id": 2775},
    {"id": "kafka-metamorphosis",           "title": "The Metamorphosis",                    "author": "Franz Kafka",                  "pg_id": 5200},
    {"id": "lawrence-the-rainbow",          "title": "The Rainbow",                          "author": "D.H. Lawrence",                "pg_id": 28948},
    {"id": "joyce-portrait-artist",         "title": "A Portrait of the Artist as a Young Man", "author": "James Joyce",             "pg_id": 4217},
    {"id": "tarkington-ambersons",          "title": "The Magnificent Ambersons",            "author": "Booth Tarkington",             "pg_id": 8867},
    {"id": "anderson-winesburg-ohio",       "title": "Winesburg, Ohio",                      "author": "Sherwood Anderson",            "pg_id": 416},

    # ── 1920s ────────────────────────────────────────────────────────────────
    {"id": "lewis-main-street",             "title": "Main Street",                          "author": "Sinclair Lewis",               "pg_id": 543},
    {"id": "wharton-age-innocence",         "title": "The Age of Innocence",                 "author": "Edith Wharton",                "pg_id": 541},
    {"id": "lawrence-women-in-love",        "title": "Women in Love",                        "author": "D.H. Lawrence",                "pg_id": 4240},
    {"id": "joyce-ulysses",                "title": "Ulysses",                              "author": "James Joyce",                  "pg_id": 4300},
    {"id": "forster-passage-to-india",      "title": "A Passage to India",                   "author": "E.M. Forster",                 "pg_id": 61221},
    {"id": "dreiser-american-tragedy",      "title": "An American Tragedy",                  "author": "Theodore Dreiser",             "pg_id": 75181},
    {"id": "fitzgerald-great-gatsby",       "title": "The Great Gatsby",                     "author": "F. Scott Fitzgerald",          "pg_id": 64317},
    {"id": "kafka-the-trial",              "title": "The Trial",                            "author": "Franz Kafka",                  "pg_id": 7849},
    {"id": "hemingway-sun-also-rises",      "title": "The Sun Also Rises",                   "author": "Ernest Hemingway",             "pg_id": 67138},
    {"id": "cather-death-archbishop",       "title": "Death Comes for the Archbishop",       "author": "Willa Cather",                 "pg_id": 69730},
    {"id": "wilder-bridge-san-luis-rey",    "title": "The Bridge of San Luis Rey",           "author": "Thornton Wilder",              "pg_id": 69768},
    {"id": "ford-parades-end",              "title": "Parade's End",                         "author": "Ford Madox Ford",              "pg_id": 64248, "pg_id_vol2": 67622},

    # ── 1930s ────────────────────────────────────────────────────────────────
    {"id": "hemingway-farewell-arms",       "title": "A Farewell to Arms",                   "author": "Ernest Hemingway",             "pg_id": 75201},
    {"id": "hughes-high-wind-jamaica",      "title": "A High Wind in Jamaica",               "author": "Richard Hughes",               "pg_id": 75530},
    {"id": "faulkner-sound-fury",           "title": "The Sound and the Fury",               "author": "William Faulkner",             "pg_id": 75170},
    {"id": "hammett-maltese-falcon",        "title": "The Maltese Falcon",                   "author": "Dashiell Hammett",             "pg_id": 77600},

    # ── Roman History ────────────────────────────────────────────────────────
    {"id": "livy-history-of-rome",          "title": "The History of Rome",                  "author": "Livy",                         "pg_id": 19725},
]


def fetch_url(url: str) -> str:
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
    if url_format == "epub":
        return f"https://www.gutenberg.org/cache/epub/{pg_id}/pg{pg_id}-images.html"
    return f"https://www.gutenberg.org/files/{pg_id}/{pg_id}-h/{pg_id}-h.htm"


def fetch_book(book: dict) -> str:
    url_format = book.get("url_format", "files")
    if url_format == "epub":
        url = build_gutenberg_url(book["pg_id"], "epub")
        log.info(f"  Fetching (epub): {url}")
        return fetch_url(url)
    url = build_gutenberg_url(book["pg_id"], "files")
    log.info(f"  Fetching: {url}")
    try:
        return fetch_url(url)
    except Exception as e:
        log.warning(f"  /files/ format failed: {e}")
    url = build_gutenberg_url(book["pg_id"], "epub")
    log.info(f"  Trying epub format: {url}")
    return fetch_url(url)


def fetch_multivolume_book(book: dict) -> str:
    vol1_html = fetch_book(book)
    if "pg_id_vol2" in book:
        book2 = dict(book)
        book2["pg_id"] = book["pg_id_vol2"]
        log.info(f"  Fetching volume 2...")
        vol2_html = fetch_book(book2)
        vol1_html = vol1_html + "\n<!-- VOLUME BREAK -->\n" + vol2_html
    return vol1_html


def insert_book(db_path: str, book: dict, parsed: dict):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")
    try:
        source_url = book.get("source_url") or f"https://www.gutenberg.org/ebooks/{book['pg_id']}"
        conn.execute(
            """INSERT INTO books (id, title, author, description,
               original_date, translator, translation_date, source_url, license)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                book["id"], book["title"], book["author"],
                book.get("description"), book.get("original_date"),
                book.get("translator"), book.get("translation_date"),
                source_url, book.get("license", "Public Domain"),
            ),
        )
        total_segments = 0
        for ch_num, chapter in enumerate(parsed["chapters"], 1):
            cur = conn.execute(
                "INSERT INTO chapters (book_id, number, title) VALUES (?, ?, ?)",
                (book["id"], ch_num, chapter["title"]),
            )
            chapter_id = cur.lastrowid
            seq = 1
            for g_idx, group in enumerate(chapter["groups"]):
                if group["type"] == "text" and g_idx > 0:
                    prev = chapter["groups"][g_idx - 1]
                    if prev["type"] == "text":
                        conn.execute(
                            "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, '', 'paragraph_break')",
                            (chapter_id, seq),
                        )
                        seq += 1
                for segment_text in group["segments"]:
                    conn.execute(
                        "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, ?, ?)",
                        (chapter_id, seq, segment_text, group["type"]),
                    )
                    seq += 1
                    total_segments += 1
        conn.commit()
        log.info(f"  Inserted: {len(parsed['chapters'])} chapters, {total_segments} segments")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def save_raw_html(book: dict, html: str):
    raw_dir = os.path.join("data", book["id"], "raw")
    os.makedirs(raw_dir, exist_ok=True)
    with open(os.path.join(raw_dir, "source.html"), "w", encoding="utf-8") as f:
        f.write(html)


def setup_data_dirs(book: dict):
    for subdir in ["raw", "audio", "commentary"]:
        os.makedirs(os.path.join("data", book["id"], subdir), exist_ok=True)


def book_exists(db_path: str, book_id: str) -> bool:
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT 1 FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()
    return row is not None


def main():
    parser = argparse.ArgumentParser(description="Batch-add Gutenberg books")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", type=str)
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
    succeeded, failed, skipped = [], [], []

    for book in books:
        log.info(f"{'=' * 60}")
        log.info(f"Processing: {book['author']} — {book['title']} [{book['id']}]")

        if book_exists(db_path, book["id"]):
            log.info(f"  Already in database, skipping")
            skipped.append(book["id"])
            continue

        try:
            html = fetch_multivolume_book(book) if "pg_id_vol2" in book else fetch_book(book)
            log.info(f"  Fetched {len(html):,} bytes")
            setup_data_dirs(book)
            save_raw_html(book, html)
            parsed = parse_gutenberg(html)
            total_segs = sum(len(g["segments"]) for ch in parsed["chapters"] for g in ch["groups"])
            log.info(f"  Parsed: {len(parsed['chapters'])} chapters, {total_segs} segments")
            if len(parsed["chapters"]) == 0:
                raise ValueError("No chapters found")
            if total_segs < 10:
                raise ValueError(f"Only {total_segs} segments — likely parse error")
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

        time.sleep(2)

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
