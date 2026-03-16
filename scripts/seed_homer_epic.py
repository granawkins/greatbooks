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


def strip_markdown(text: str) -> str:
    """Remove markdown bold and italic markers from text."""
    # Bold: **text** → text
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    # Italic: *text* → text
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    return text


def parse_session_to_segments(text: str, reorder_essay: bool = True) -> list[dict]:
    """Parse a study guide session into segments (heading, text, list_item, paragraph_break).

    If reorder_essay is True, moves the Essay section (renamed 'Discussion') above Coming Up.
    """
    # First, optionally reorder Essay above Coming Up
    if reorder_essay:
        text = _reorder_essay_and_coming_up(text)

    segments = []
    lines = text.strip().split("\n")
    i = 0
    prev_was_list = False

    while i < len(lines):
        line = lines[i].rstrip()

        # Skip empty lines
        if not line:
            if not prev_was_list and segments and segments[-1]["type"] != "paragraph_break":
                segments.append({"type": "paragraph_break", "text": ""})
            i += 1
            continue

        # Headings (### or ##)
        if line.startswith("#"):
            prev_was_list = False
            heading_text = re.sub(r"^#+\s*", "", line).strip()
            if heading_text:
                segments.append({"type": "heading", "text": strip_markdown(heading_text)})
            i += 1
            continue

        # Horizontal rules
        if line.strip() == "---":
            prev_was_list = False
            if segments and segments[-1]["type"] != "paragraph_break":
                segments.append({"type": "paragraph_break", "text": ""})
            i += 1
            continue

        # List items (- text)
        if line.startswith("- "):
            prev_was_list = True
            item_text = line[2:].strip()
            # Collect continuation lines
            while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith("- ") and not lines[i + 1].startswith("#") and not lines[i + 1].strip() == "---":
                i += 1
                item_text += " " + lines[i].strip()
            segments.append({"type": "list_item", "text": strip_markdown(item_text)})
            i += 1
            continue

        prev_was_list = False

        # Regular text — collect into a paragraph
        para_lines = [line]
        while i + 1 < len(lines):
            next_line = lines[i + 1].rstrip()
            if not next_line or next_line.startswith("#") or next_line.startswith("- ") or next_line.strip() == "---":
                break
            para_lines.append(next_line)
            i += 1

        # Split paragraph into sentences for segments
        full_text = strip_markdown(" ".join(para_lines))
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z"])', full_text)
        for sent in sentences:
            sent = sent.strip()
            if sent:
                segments.append({"type": "text", "text": sent})

        i += 1

    # Clean up trailing paragraph breaks
    while segments and segments[-1]["type"] == "paragraph_break":
        segments.pop()

    return segments


def _reorder_essay_and_coming_up(text: str) -> str:
    """Move ### Essay (renamed ### Discussion) above ### Coming Up in session text."""
    # Find Essay section
    essay_match = re.search(r'(### Essay\n.*?)(?=\n### |\n---\n|\Z)', text, re.DOTALL)
    coming_match = re.search(r'(### Coming Up\n.*?)(?=\n### |\n---\n|\Z)', text, re.DOTALL)

    if not essay_match:
        return text

    # Remove essay from original position
    essay_content = essay_match.group(1).strip()
    text_without_essay = text[:essay_match.start()] + text[essay_match.end():]

    # Rename Essay → Discussion
    essay_content = essay_content.replace("### Essay", "### Discussion", 1)

    if coming_match:
        # Find Coming Up in the modified text
        coming_match2 = re.search(r'(### Coming Up\n)', text_without_essay)
        if coming_match2:
            # Insert Discussion before Coming Up
            insert_pos = coming_match2.start()
            text_without_essay = (
                text_without_essay[:insert_pos]
                + essay_content + "\n\n---\n\n"
                + text_without_essay[insert_pos:]
            )
            return text_without_essay

    # No Coming Up found — just append Discussion at the end
    return text_without_essay.rstrip() + "\n\n---\n\n" + essay_content


def extract_sessions(studyguide_path: str) -> dict[str, str]:
    """Extract session content from a study guide file."""
    with open(studyguide_path, "r") as f:
        content = f.read()

    sessions = {}

    # Extract "Before You Read" as intro content
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
    course_items = []

    # Iliad introduction (Before You Read)
    course_items.append(("discussion", "Introduction to the Iliad", "homer-iliad", None, "intro_iliad"))

    # Iliad sessions and chapters
    iliad_session_map = [
        ("Session 1: The Quarrel (Books I\u2013II)", range(1, 3)),
        ("Session 2: The World Opens (Books III\u2013IX)", range(3, 10)),
        ("Session 3: The Trojans Press (Books X\u2013XV)", range(10, 16)),
        ("Session 4: The Pivot (Books XVI\u2013XVIII)", range(16, 19)),
        ("Session 5: The Return (Books XIX\u2013XXII)", range(19, 23)),
        ("Session 6: The Ending (Books XXIII\u2013XXIV)", range(23, 25)),
    ]

    for session_title, chapter_range in iliad_session_map:
        for ch_num in chapter_range:
            course_items.append(("text", f"Iliad: Book {ch_num_to_roman(ch_num)}", "homer-iliad", ch_num, None))
        course_items.append(("discussion", f"Iliad \u2014 {session_title}", "homer-iliad", None, session_title))

    # Odyssey introduction (Before You Read) — separate chapter between Iliad and Odyssey
    course_items.append(("discussion", "Introduction to the Odyssey", "homer-odyssey", None, "intro_odyssey"))

    # Odyssey sessions and chapters
    odyssey_session_map = [
        ("Session 1: The Son Sets Out (Books I\u2013IV)", range(1, 5)),
        ("Session 2: The Wanderings Begin (Books V\u2013VIII)", range(5, 9)),
        ("Session 3: Monsters and the Underworld (Books IX\u2013XII)", range(9, 13)),
        ("Session 4: The Return (Books XIII\u2013XVI)", range(13, 17)),
        ("Session 5: The Disguise Holds (Books XVII\u2013XX)", range(17, 21)),
        ("Session 6: The Reckoning (Books XXI\u2013XXIV)", range(21, 25)),
    ]

    for session_title, chapter_range in odyssey_session_map:
        for ch_num in chapter_range:
            course_items.append(("text", f"Odyssey: Book {ch_num_to_roman(ch_num)}", "homer-odyssey", ch_num, None))
        course_items.append(("discussion", f"Odyssey \u2014 {session_title}", "homer-odyssey", None, session_title))

    # Insert chapters and segments
    chapter_num = 0
    for item_type, title, source_book, source_ch_num, session_key in course_items:
        chapter_num += 1

        if item_type == "text" and source_book and source_ch_num:
            source_chapters = iliad_chapters if source_book == "homer-iliad" else odyssey_chapters
            source_id = source_chapters.get(source_ch_num)
            if not source_id:
                print(f"  WARNING: Source chapter {source_book} #{source_ch_num} not found, skipping")
                continue
            conn.execute(
                "INSERT INTO chapters (book_id, number, title, source_chapter_id, chapter_type) VALUES (?, ?, ?, ?, 'text')",
                (COURSE_ID, chapter_num, title, source_id),
            )
            print(f"  Ch {chapter_num}: {title} (ref -> {source_book} ch {source_ch_num})")

        elif item_type == "discussion":
            cursor = conn.execute(
                "INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, 'discussion')",
                (COURSE_ID, chapter_num, title),
            )
            chapter_id = cursor.lastrowid

            if session_key == "intro_iliad":
                segments = generate_book_intro_segments("The Iliad", iliad_sessions)
            elif session_key == "intro_odyssey":
                segments = generate_book_intro_segments("The Odyssey", odyssey_sessions)
            else:
                # Find matching session content
                session_content = None
                sessions = iliad_sessions if source_book == "homer-iliad" else odyssey_sessions
                for key, content in sessions.items():
                    if key.startswith("Session") and session_key.startswith("Session") and key.split(":")[0] == session_key.split(":")[0]:
                        session_content = content
                        break

                if session_content:
                    segments = parse_session_to_segments(session_content)
                else:
                    segments = [{"type": "text", "text": f"Discussion: {title}"}]
                    print(f"  WARNING: No session content found for '{session_key}'")

            for seq, seg in enumerate(segments, 1):
                conn.execute(
                    "INSERT INTO segments (chapter_id, sequence, text, segment_type) VALUES (?, ?, ?, ?)",
                    (chapter_id, seq, seg["text"], seg["type"]),
                )

            print(f"  Ch {chapter_num}: {title} (discussion, {len(segments)} segments)")

    conn.commit()
    conn.close()

    print(f"\nDone! Created course '{COURSE_ID}' with {chapter_num} chapters.")


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


def generate_book_intro_segments(book_title: str, sessions: dict) -> list[dict]:
    """Generate introduction segments for a single book's 'Before You Read'."""
    segments = []
    if "intro" in sessions:
        segments = parse_session_to_segments(sessions["intro"], reorder_essay=False)
    if not segments:
        segments = [{"type": "text", "text": f"Introduction to {book_title}."}]
    return segments


if __name__ == "__main__":
    main()
