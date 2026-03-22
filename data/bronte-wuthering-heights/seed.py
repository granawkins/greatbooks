#!/usr/bin/env python3
"""
Seed script for Wuthering Heights by Emily Brontë.
Idempotent: deletes existing data and re-inserts.
"""

import json
import sqlite3
from pathlib import Path

BASE = Path(__file__).parent
DB_PATH = BASE.parent.parent / "greatbooks.db"
CHAPTERS_JSON = BASE / "chapters.json"

BOOK_ID = "bronte-wuthering-heights"
BOOK_TITLE = "Wuthering Heights"
BOOK_AUTHOR = "Emily Brontë"
ORIGINAL_DATE = "1847"
SOURCE_URL = "https://www.gutenberg.org/files/768/768-h/768-h.htm"
LICENSE = "Public Domain"
LAYOUT = "prose"
BOOK_TYPE = "book"


def seed():
    chapters = json.loads(CHAPTERS_JSON.read_text(encoding='utf-8'))
    print(f"Loaded {len(chapters)} chapters from chapters.json")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")
    cur = conn.cursor()

    # Idempotent: delete existing data
    print(f"Deleting existing data for '{BOOK_ID}'...")
    cur.execute(
        "DELETE FROM segments WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)",
        (BOOK_ID,)
    )
    cur.execute("DELETE FROM chapters WHERE book_id = ?", (BOOK_ID,))
    cur.execute("DELETE FROM books WHERE id = ?", (BOOK_ID,))
    conn.commit()

    # Insert book
    print(f"Inserting book '{BOOK_ID}'...")
    cur.execute(
        """
        INSERT INTO books (id, title, author, original_date, source_url, license, layout, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (BOOK_ID, BOOK_TITLE, BOOK_AUTHOR, ORIGINAL_DATE, SOURCE_URL, LICENSE, LAYOUT, BOOK_TYPE)
    )
    conn.commit()

    # Insert chapters and segments
    total_segments = 0
    for chapter in chapters:
        cur.execute(
            "INSERT INTO chapters (book_id, number, title) VALUES (?, ?, ?)",
            (BOOK_ID, chapter['number'], chapter['title'])
        )
        chapter_id = cur.lastrowid

        segments = chapter['segments']
        for seq, seg in enumerate(segments, start=1):
            cur.execute(
                "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, ?, ?)",
                (chapter_id, seq, seg['text'], seg['type'])
            )
        total_segments += len(segments)

        if chapter['number'] % 5 == 0:
            print(f"  Inserted up to chapter {chapter['number']}...")

    conn.commit()
    conn.close()

    print(f"\nDone!")
    print(f"  Chapters: {len(chapters)}")
    print(f"  Segments (total): {total_segments}")
    text_segs = sum(len([s for s in c['segments'] if s['type'] == 'text']) for c in chapters)
    print(f"  Text segments: {text_segs}")


if __name__ == '__main__':
    seed()
