"""
Seed the homer-epic course into the database.

Creates a course that interleaves Iliad and Odyssey chapters with discussion sessions
drawn from the existing study guides.

Usage: .venv/bin/python scripts/seed_homer_epic.py
"""

import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "greatbooks.db")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

COURSE_ID = "homer-epic"
COURSE_TITLE = "Homer's Epics"
COURSE_AUTHOR = "Homer"
COURSE_DESCRIPTION = (
    "Read the Iliad and Odyssey together — the two foundational epics of Western literature. "
    "Guided discussions after each section help you reflect on themes, characters, and what connects these poems."
)


def parse_session_to_segments(text: str) -> list[dict]:
    """Parse a study guide session into segments (heading, text, list_item, paragraph_break)."""
    segments = []
    lines = text.strip().split("\n")
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()

        # Skip empty lines (they create paragraph breaks between text blocks)
        if not line:
            if segments and segments[-1]["type"] != "paragraph_break":
                segments.append({"type": "paragraph_break", "text": ""})
            i += 1
            continue

        # Headings (### or ##)
        if line.startswith("#"):
            heading_text = re.sub(r"^#+\s*", "", line).strip()
            if heading_text:
                segments.append({"type": "heading", "text": heading_text})
            i += 1
            continue

        # Horizontal rules
        if line.strip() == "---":
            if segments and segments[-1]["type"] != "paragraph_break":
                segments.append({"type": "paragraph_break", "text": ""})
            i += 1
            continue

        # List items (- **bold:** text pattern or plain - text)
        if line.startswith("- "):
            item_text = line[2:].strip()
            # Collect continuation lines (indented or next line without - prefix)
            while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith("- ") and not lines[i + 1].startswith("#") and not lines[i + 1].strip() == "---":
                i += 1
                item_text += " " + lines[i].strip()
            segments.append({"type": "list_item", "text": item_text})
            i += 1
            continue

        # Regular text — collect into a paragraph
        para_lines = [line]
        while i + 1 < len(lines):
            next_line = lines[i + 1].rstrip()
            if not next_line or next_line.startswith("#") or next_line.startswith("- ") or next_line.strip() == "---":
                break
            para_lines.append(next_line)
            i += 1

        # Split paragraph into sentences for segments
        full_text = " ".join(para_lines)
        # Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z*"])', full_text)
        for sent in sentences:
            sent = sent.strip()
            if sent:
                segments.append({"type": "text", "text": sent})

        i += 1

    # Clean up trailing paragraph breaks
    while segments and segments[-1]["type"] == "paragraph_break":
        segments.pop()

    return segments


def extract_sessions(studyguide_path: str) -> dict[str, str]:
    """Extract session content from a study guide file."""
    with open(studyguide_path, "r") as f:
        content = f.read()

    sessions = {}

    # Also extract "Before You Read" as intro content
    before_match = re.search(r"## Before You Read\n(.*?)(?=\n---\n|\n## Session)", content, re.DOTALL)
    if before_match:
        sessions["intro"] = before_match.group(1).strip()

    # Extract each session
    session_pattern = r"## (Session \d+:.*?)\n(.*?)(?=\n## Session|\n*$)"
    for match in re.finditer(session_pattern, content, re.DOTALL):
        title = match.group(1).strip()
        body = match.group(2).strip()
        sessions[title] = body

    return sessions


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 5000")

    # Check if course already exists
    existing = conn.execute("SELECT id FROM books WHERE id = ?", (COURSE_ID,)).fetchone()
    if existing:
        print(f"Course '{COURSE_ID}' already exists. Deleting and re-seeding...")
        conn.execute("DELETE FROM segments WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)", (COURSE_ID,))
        conn.execute("DELETE FROM chapters WHERE book_id = ?", (COURSE_ID,))
        conn.execute("DELETE FROM books WHERE id = ?", (COURSE_ID,))
        conn.commit()

    # Insert course book
    conn.execute(
        "INSERT INTO books (id, title, author, description, layout, type) VALUES (?, ?, ?, ?, 'prose', 'course')",
        (COURSE_ID, COURSE_TITLE, COURSE_AUTHOR, COURSE_DESCRIPTION),
    )

    # Get source chapter IDs
    iliad_chapters = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT number, id FROM chapters WHERE book_id = 'homer-iliad' ORDER BY number"
        ).fetchall()
    }
    odyssey_chapters = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT number, id FROM chapters WHERE book_id = 'homer-odyssey' ORDER BY number"
        ).fetchall()
    }

    # Extract study guide sessions
    iliad_sessions = extract_sessions(os.path.join(DATA_DIR, "homer-iliad", "STUDYGUIDE.md"))
    odyssey_sessions = extract_sessions(os.path.join(DATA_DIR, "homer-odyssey", "STUDYGUIDE.md"))

    # Define course structure
    # Format: (type, title, source_book, source_chapters, session_key)
    course_items = []

    # Course introduction (combined from both "Before You Read" sections)
    course_items.append(("discussion", "Introduction", None, None, "intro_combined"))

    # Iliad sessions and chapters
    iliad_session_map = [
        ("Session 1: The Quarrel (Books 1–2)", range(1, 3)),          # Books 1-2
        ("Session 2: The World Opens (Books 3–9)", range(3, 10)),     # Books 3-9
        ("Session 3: The Trojans Press (Books 10–15)", range(10, 16)), # Books 10-15
        ("Session 4: The Pivot (Books 16–18)", range(16, 19)),        # Books 16-18
        ("Session 5: The Return (Books 19–22)", range(19, 23)),       # Books 19-22
        ("Session 6: The Ending (Books 23–24)", range(23, 25)),       # Books 23-24
    ]

    for session_title, chapter_range in iliad_session_map:
        # Add the chapters first
        for ch_num in chapter_range:
            course_items.append(("text", f"Iliad: Book {ch_num_to_roman(ch_num)}", "homer-iliad", ch_num, None))
        # Then the discussion
        course_items.append(("discussion", f"Iliad — {session_title}", "homer-iliad", None, session_title))

    # Odyssey sessions and chapters
    odyssey_session_map = [
        ("Session 1: The Son Sets Out (Books I–IV)", range(1, 5)),
        ("Session 2: The Wanderings Begin (Books V–VIII)", range(5, 9)),
        ("Session 3: Monsters and the Underworld (Books IX–XII)", range(9, 13)),
        ("Session 4: The Return (Books XIII–XVI)", range(13, 17)),
        ("Session 5: The Disguise Holds (Books XVII–XX)", range(17, 21)),
        ("Session 6: The Reckoning (Books XXI–XXIV)", range(21, 25)),
    ]

    for session_title, chapter_range in odyssey_session_map:
        for ch_num in chapter_range:
            course_items.append(("text", f"Odyssey: Book {ch_num_to_roman(ch_num)}", "homer-odyssey", ch_num, None))
        course_items.append(("discussion", f"Odyssey — {session_title}", "homer-odyssey", None, session_title))

    # Insert chapters and segments
    chapter_num = 0
    for item_type, title, source_book, source_ch_num, session_key in course_items:
        chapter_num += 1

        if item_type == "text" and source_book and source_ch_num:
            # Reference chapter — points to existing chapter for segments/audio
            source_chapters = iliad_chapters if source_book == "homer-iliad" else odyssey_chapters
            source_id = source_chapters.get(source_ch_num)
            if not source_id:
                print(f"  WARNING: Source chapter {source_book} #{source_ch_num} not found, skipping")
                continue
            conn.execute(
                "INSERT INTO chapters (book_id, number, title, source_chapter_id, chapter_type) VALUES (?, ?, ?, ?, 'text')",
                (COURSE_ID, chapter_num, title, source_id),
            )
            print(f"  Ch {chapter_num}: {title} (ref → {source_book} ch {source_ch_num})")

        elif item_type == "discussion":
            # Discussion chapter — has its own segments
            cursor = conn.execute(
                "INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, 'discussion')",
                (COURSE_ID, chapter_num, title),
            )
            chapter_id = cursor.lastrowid

            # Generate segments from study guide content
            if session_key == "intro_combined":
                segments = generate_intro_segments(iliad_sessions, odyssey_sessions)
            else:
                # Find the matching session content
                session_content = None
                if source_book == "homer-iliad":
                    # Try to find matching session key
                    for key, content in iliad_sessions.items():
                        if key.startswith("Session") and session_key.startswith("Session") and key.split(":")[0] == session_key.split(":")[0]:
                            session_content = content
                            break
                elif source_book == "homer-odyssey":
                    for key, content in odyssey_sessions.items():
                        if key.startswith("Session") and session_key.startswith("Session") and key.split(":")[0] == session_key.split(":")[0]:
                            session_content = content
                            break

                if session_content:
                    segments = parse_session_to_segments(session_content)
                else:
                    segments = [{"type": "text", "text": f"Discussion: {title}"}]
                    print(f"  WARNING: No session content found for '{session_key}'")

            # Insert segments
            for seq, seg in enumerate(segments, 1):
                conn.execute(
                    "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, ?, ?)",
                    (chapter_id, seq, seg["text"], seg["type"]),
                )

            print(f"  Ch {chapter_num}: {title} (discussion, {len(segments)} segments)")

    conn.commit()
    conn.close()

    total_chapters = chapter_num
    print(f"\nDone! Created course '{COURSE_ID}' with {total_chapters} chapters.")


def ch_num_to_roman(n: int) -> str:
    """Convert integer to Roman numeral."""
    vals = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
            (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    result = ""
    for val, numeral in vals:
        while n >= val:
            result += numeral
            n -= val
    return result


def generate_intro_segments(iliad_sessions, odyssey_sessions):
    """Generate introduction segments combining both 'Before You Read' sections."""
    segments = []

    # Course intro
    segments.append({"type": "heading", "text": "Welcome"})
    segments.append({"type": "text", "text": "This course takes you through Homer's two great epics — the Iliad and the Odyssey — in sequence, with guided discussion sessions between sections."})
    segments.append({"type": "text", "text": "You'll read each poem in full, pausing at natural breakpoints to reflect on themes, characters, and the connections between the two works."})
    segments.append({"type": "text", "text": "Each discussion session includes summaries, key themes, and an essay question. You can also chat with an AI reading companion who knows the text."})
    segments.append({"type": "paragraph_break", "text": ""})

    # Pull in the Iliad intro
    if "intro" in iliad_sessions:
        segments.append({"type": "heading", "text": "The Iliad"})
        for seg in parse_session_to_segments(iliad_sessions["intro"]):
            segments.append(seg)
        segments.append({"type": "paragraph_break", "text": ""})

    # Pull in the Odyssey intro
    if "intro" in odyssey_sessions:
        segments.append({"type": "heading", "text": "The Odyssey"})
        for seg in parse_session_to_segments(odyssey_sessions["intro"]):
            segments.append(seg)

    return segments


if __name__ == "__main__":
    main()
