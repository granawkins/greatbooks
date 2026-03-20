#!/usr/bin/env python3
"""
Split plato-phaedo from 1 chapter into 4 chapters at given sequence boundaries,
and update the death-of-socrates course accordingly.
"""

import sqlite3
import sys

DB_PATH = "/home/granawkins/greatbooks/greatbooks.db"

def main():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    cur = con.cursor()

    # ── Step 1: Split Phaedo into 4 chapters ──────────────────────────────────
    # Existing chapter
    cur.execute("SELECT id, number, title FROM chapters WHERE book_id='plato-phaedo' ORDER BY number")
    existing = cur.fetchall()
    print("Existing Phaedo chapters:", existing)

    ch1_id = existing[0][0]  # should be 61

    # Verify segment counts
    cur.execute("SELECT MIN(sequence), MAX(sequence), COUNT(*) FROM segments WHERE chapter_id=?", (ch1_id,))
    min_seq, max_seq, total = cur.fetchone()
    print(f"Chapter 1 segments: seq {min_seq}–{max_seq}, count={total}")

    # Rename ch 1
    cur.execute("UPDATE chapters SET title=? WHERE id=?",
                ("The Frame: Phaedo and Echecrates", ch1_id))
    print(f"Renamed chapter id={ch1_id} to 'The Frame: Phaedo and Echecrates'")

    # Create chapter 2
    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, ?)",
                ("plato-phaedo", 2, "The Prison Morning", "text"))
    ch2_id = cur.lastrowid
    print(f"Created ch2 id={ch2_id}")

    # Create chapter 3
    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, ?)",
                ("plato-phaedo", 3, "The Final Argument", "text"))
    ch3_id = cur.lastrowid
    print(f"Created ch3 id={ch3_id}")

    # Create chapter 4
    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, ?)",
                ("plato-phaedo", 4, "The Last Hour", "text"))
    ch4_id = cur.lastrowid
    print(f"Created ch4 id={ch4_id}")

    # Update segment chapter_ids based on sequence ranges
    # Ch 2: sequences 77–957
    cur.execute("UPDATE segments SET chapter_id=? WHERE chapter_id=? AND sequence BETWEEN 77 AND 957",
                (ch2_id, ch1_id))
    print(f"Moved sequences 77-957 to ch2 (id={ch2_id}): {cur.rowcount} segments")

    # Ch 3: sequences 958–1595
    cur.execute("UPDATE segments SET chapter_id=? WHERE chapter_id=? AND sequence BETWEEN 958 AND 1595",
                (ch3_id, ch1_id))
    print(f"Moved sequences 958-1595 to ch3 (id={ch3_id}): {cur.rowcount} segments")

    # Ch 4: sequences 1596–1650
    cur.execute("UPDATE segments SET chapter_id=? WHERE chapter_id=? AND sequence BETWEEN 1596 AND 1650",
                (ch4_id, ch1_id))
    print(f"Moved sequences 1596-1650 to ch4 (id={ch4_id}): {cur.rowcount} segments")

    # Verify split
    print("\n── Phaedo chapter verification ──")
    cur.execute("""
        SELECT c.number, c.title, c.id, COUNT(s.id) segs
        FROM chapters c
        JOIN segments s ON s.chapter_id = c.id
        WHERE c.book_id = 'plato-phaedo'
        GROUP BY c.id ORDER BY c.number
    """)
    for row in cur.fetchall():
        print(f"  Ch {row[0]} (id={row[2]}): {row[1]} — {row[3]} segments")

    # ── Step 2: Update death-of-socrates course ──────────────────────────────
    print("\n── Updating death-of-socrates course ──")

    # Current state:
    # ch 5 (id=2121): Introduction to the Phaedo (discussion)
    # ch 6 (id=2122): Phaedo (text, source_chapter_id=61) ← DELETE THIS
    # ch 7 (id=2123): Session I: Why Fear Death? (discussion) → renumber to 8
    # ch 8 (id=2124): Session II: The Soul and the Forms (discussion) → renumber to 10
    # ch 9 (id=2125): Session III: The Last Hour (discussion) → renumber to 12
    # ch 10-25 (ids 2126-2141): Republic stuff → shift +3

    # First: to avoid unique constraint on (book_id, number), temporarily set
    # the old numbers to negatives for chapters we'll renumber
    cur.execute("UPDATE chapters SET number=-7 WHERE id=2123")
    cur.execute("UPDATE chapters SET number=-8 WHERE id=2124")
    cur.execute("UPDATE chapters SET number=-9 WHERE id=2125")

    # Shift Republic chapters (numbers 10-25) to (13-28), go in reverse to avoid collisions
    cur.execute("""
        SELECT id, number FROM chapters
        WHERE book_id='death-of-socrates' AND number >= 10
        ORDER BY number DESC
    """)
    republic_chapters = cur.fetchall()
    for cid, num in republic_chapters:
        cur.execute("UPDATE chapters SET number=? WHERE id=?", (num + 3, cid))
        print(f"  Shifted ch {num} → {num + 3} (id={cid})")

    # Delete old Phaedo reference chapter (id=2122)
    cur.execute("DELETE FROM chapters WHERE id=2122")
    print("  Deleted old Phaedo chapter id=2122")

    # Insert 4 new Phaedo reference chapters
    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type, source_chapter_id) VALUES (?, ?, ?, ?, ?)",
                ("death-of-socrates", 6, "Phaedo: The Frame", "text", ch1_id))
    print(f"  Inserted ch6: Phaedo: The Frame (source_chapter_id={ch1_id})")

    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type, source_chapter_id) VALUES (?, ?, ?, ?, ?)",
                ("death-of-socrates", 7, "Phaedo: The Prison Morning", "text", ch2_id))
    print(f"  Inserted ch7: Phaedo: The Prison Morning (source_chapter_id={ch2_id})")

    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type, source_chapter_id) VALUES (?, ?, ?, ?, ?)",
                ("death-of-socrates", 9, "Phaedo: The Final Argument", "text", ch3_id))
    print(f"  Inserted ch9: Phaedo: The Final Argument (source_chapter_id={ch3_id})")

    cur.execute("INSERT INTO chapters (book_id, number, title, chapter_type, source_chapter_id) VALUES (?, ?, ?, ?, ?)",
                ("death-of-socrates", 11, "Phaedo: The Last Hour", "text", ch4_id))
    print(f"  Inserted ch11: Phaedo: The Last Hour (source_chapter_id={ch4_id})")

    # Now renumber the discussion chapters from temp negative numbers
    cur.execute("UPDATE chapters SET number=8 WHERE id=2123")
    cur.execute("UPDATE chapters SET number=10 WHERE id=2124")
    cur.execute("UPDATE chapters SET number=12 WHERE id=2125")
    print("  Renumbered discussion chapters: 2123→8, 2124→10, 2125→12")

    # Verify course
    print("\n── death-of-socrates course verification ──")
    cur.execute("""
        SELECT number, title, chapter_type, source_chapter_id
        FROM chapters WHERE book_id='death-of-socrates'
        ORDER BY number
    """)
    for row in cur.fetchall():
        src = f" (source={row[3]})" if row[3] else ""
        print(f"  Ch {row[0]}: {row[1]} [{row[2]}]{src}")

    con.commit()
    con.close()
    print("\n✅ Done! DB committed.")

    # Return the new chapter IDs for reference
    return ch1_id, ch2_id, ch3_id, ch4_id


if __name__ == "__main__":
    main()
