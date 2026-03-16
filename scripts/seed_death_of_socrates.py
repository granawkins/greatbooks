"""
Seed the death-of-socrates course into the database.

Creates a course covering Plato's Apology, Phaedo, and Republic with
introduction and discussion chapters drawn from existing study guides.

Structure:
  Apology: intro → reading ch → Session I → Session II
  Phaedo: intro → reading ch → Session I → Session II → Session III
  Republic: intro → chs 1–2 → Session I → chs 3–5 → Session II →
            chs 6–7 → Session III → chs 8–9 → Session IV → ch 10 → Session V

Usage: .venv/bin/python scripts/seed_death_of_socrates.py
"""

import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "greatbooks.db")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

COURSE_ID = "death-of-socrates"
COURSE_TITLE = "The Death of Socrates"
COURSE_AUTHOR = "Plato"
COURSE_DESCRIPTION = (
    "Socrates spent his life asking one question: how should a person live? "
    "Athens answered by executing him. Read his trial, his final hours, and the "
    "philosophy he died for — in the words of the man who was there."
)


def strip_markdown(text: str) -> str:
    """Remove markdown bold and italic markers from text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    return text


def parse_session_to_segments(text: str, reorder_essay: bool = True) -> list[dict]:
    """Parse a study guide session into segments (heading, text, list_item, paragraph_break).

    If reorder_essay is True, moves the Essay section (renamed 'Discussion') above Coming Up.
    """
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
            while (
                i + 1 < len(lines)
                and lines[i + 1].strip()
                and not lines[i + 1].startswith("- ")
                and not lines[i + 1].startswith("#")
                and not lines[i + 1].strip() == "---"
            ):
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
            if (
                not next_line
                or next_line.startswith("#")
                or next_line.startswith("- ")
                or next_line.strip() == "---"
            ):
                break
            para_lines.append(next_line)
            i += 1

        # Split paragraph into sentences for segments
        full_text = " ".join(para_lines)
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z"])', full_text)
        for sent in sentences:
            sent = sent.strip()
            if sent:
                segments.append({"type": "text", "text": strip_markdown(sent)})

        i += 1

    # Clean up trailing paragraph breaks
    while segments and segments[-1]["type"] == "paragraph_break":
        segments.pop()

    return segments


def _reorder_essay_and_coming_up(text: str) -> str:
    """Move ### Essay (renamed ### Discussion) above ### Coming Up in session text."""
    essay_match = re.search(r'(### Essay\n.*?)(?=\n### |\n---\n|\Z)', text, re.DOTALL)
    coming_match = re.search(r'(### Coming Up\n.*?)(?=\n### |\n---\n|\Z)', text, re.DOTALL)

    if not essay_match:
        return text

    essay_content = essay_match.group(1).strip()
    text_without_essay = text[:essay_match.start()] + text[essay_match.end():]

    # Rename Essay → Discussion
    essay_content = essay_content.replace("### Essay", "### Discussion", 1)

    if coming_match:
        coming_match2 = re.search(r'(### Coming Up\n)', text_without_essay)
        if coming_match2:
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
    """Extract session content from a Plato study guide file (Roman numeral sessions)."""
    with open(studyguide_path, "r") as f:
        content = f.read()

    sessions = {}

    # Extract "Before You Read" as intro content
    before_match = re.search(r"## Before You Read\n(.*?)(?=\n---\n|\n## Session)", content, re.DOTALL)
    if before_match:
        sessions["intro"] = before_match.group(1).strip()

    # Extract each session (Roman numeral: Session I, II, III, IV, V, ...)
    # Stop before *End of Study Guide or next session
    session_pattern = r"## (Session [IVXLCDM]+:.*?)\n(.*?)(?=\n## Session|\n\*End|\n*$)"
    for match in re.finditer(session_pattern, content, re.DOTALL):
        title = match.group(1).strip()
        body = match.group(2).strip()
        sessions[title] = body

    return sessions


def session_short_title(full_title: str) -> str:
    """Convert 'Session I: Title (subtitle)' to 'Session I: Title'."""
    return re.sub(r'\s*\(.*?\)\s*$', '', full_title).strip()


def generate_book_intro_segments(sessions: dict) -> list[dict]:
    """Generate introduction segments from 'Before You Read'."""
    if "intro" in sessions:
        return parse_session_to_segments(sessions["intro"], reorder_essay=False)
    return []


def ch_num_to_roman(n: int) -> str:
    """Convert integer to Roman numeral."""
    vals = [
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
    ]
    result = ""
    for val, numeral in vals:
        while n >= val:
            result += numeral
            n -= val
    return result


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA busy_timeout = 5000")

    # Idempotent: delete and re-seed if course already exists
    existing = conn.execute("SELECT id FROM books WHERE id = ?", (COURSE_ID,)).fetchone()
    if existing:
        print(f"Course '{COURSE_ID}' already exists. Deleting and re-seeding...")
        conn.execute(
            "DELETE FROM segments WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)",
            (COURSE_ID,),
        )
        conn.execute("DELETE FROM chapters WHERE book_id = ?", (COURSE_ID,))
        conn.execute("DELETE FROM books WHERE id = ?", (COURSE_ID,))
        conn.commit()

    # Insert course book
    conn.execute(
        "INSERT INTO books (id, title, author, description, layout, type) VALUES (?, ?, ?, ?, 'prose', 'course')",
        (COURSE_ID, COURSE_TITLE, COURSE_AUTHOR, COURSE_DESCRIPTION),
    )

    # Get source chapter IDs
    apology_chapters = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT number, id FROM chapters WHERE book_id = 'plato-apology' ORDER BY number"
        ).fetchall()
    }
    phaedo_chapters = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT number, id FROM chapters WHERE book_id = 'plato-phaedo' ORDER BY number"
        ).fetchall()
    }
    republic_chapters = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT number, id FROM chapters WHERE book_id = 'plato-republic' ORDER BY number"
        ).fetchall()
    }

    # Extract study guide sessions
    apology_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-apology", "STUDYGUIDE.md"))
    phaedo_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-phaedo", "STUDYGUIDE.md"))
    republic_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-republic", "STUDYGUIDE.md"))

    # Get sorted session keys (Roman numerals sort correctly alphabetically: I < II < III < IV < V)
    apology_session_keys = sorted(k for k in apology_sessions if k.startswith("Session"))
    phaedo_session_keys = sorted(k for k in phaedo_sessions if k.startswith("Session"))
    republic_session_keys = sorted(k for k in republic_sessions if k.startswith("Session"))

    print(f"Apology sessions found: {apology_session_keys}")
    print(f"Phaedo sessions found: {phaedo_session_keys}")
    print(f"Republic sessions found: {republic_session_keys}")

    # Republic: place sessions after specific chapters
    # Session I (Books I–II): after ch 2
    # Session II (Books III–V): after ch 5
    # Session III (Books VI–VII): after ch 7
    # Session IV (Books VIII–IX): after ch 9
    # Session V (Book X): after ch 10
    republic_session_after = {
        2: republic_session_keys[0],
        5: republic_session_keys[1],
        7: republic_session_keys[2],
        9: republic_session_keys[3],
        10: republic_session_keys[4],
    }

    # Build course items list:
    # Each tuple: (item_type, title, source_chapters_dict, source_ch_num, session_key, sessions_dict)
    course_items = []

    # === APOLOGY ===
    course_items.append(("discussion", "Introduction to the Apology", None, None, "intro", apology_sessions))
    course_items.append(("text", "Apology", apology_chapters, 1, None, None))
    for key in apology_session_keys:
        course_items.append(("discussion", session_short_title(key), None, None, key, apology_sessions))

    # === PHAEDO ===
    course_items.append(("discussion", "Introduction to the Phaedo", None, None, "intro", phaedo_sessions))
    course_items.append(("text", "Phaedo", phaedo_chapters, 1, None, None))
    for key in phaedo_session_keys:
        course_items.append(("discussion", session_short_title(key), None, None, key, phaedo_sessions))

    # === REPUBLIC ===
    course_items.append(("discussion", "Introduction to the Republic", None, None, "intro", republic_sessions))
    for ch_num in range(1, 11):
        course_items.append(
            ("text", f"Republic: Book {ch_num_to_roman(ch_num)}", republic_chapters, ch_num, None, None)
        )
        if ch_num in republic_session_after:
            session_key = republic_session_after[ch_num]
            course_items.append(
                ("discussion", session_short_title(session_key), None, None, session_key, republic_sessions)
            )

    # Insert chapters and segments
    chapter_num = 0
    for item_type, title, source_chapters, source_ch_num, session_key, sessions_dict in course_items:
        chapter_num += 1

        if item_type == "text":
            source_id = source_chapters.get(source_ch_num)
            if not source_id:
                print(f"  WARNING: Source chapter #{source_ch_num} not found, skipping")
                chapter_num -= 1
                continue
            conn.execute(
                "INSERT INTO chapters (book_id, number, title, source_chapter_id, chapter_type) "
                "VALUES (?, ?, ?, ?, 'text')",
                (COURSE_ID, chapter_num, title, source_id),
            )
            print(f"  Ch {chapter_num}: {title} (text, source_id={source_id})")

        elif item_type == "discussion":
            cursor = conn.execute(
                "INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, 'discussion')",
                (COURSE_ID, chapter_num, title),
            )
            chapter_id = cursor.lastrowid

            if session_key == "intro":
                segments = generate_book_intro_segments(sessions_dict)
            else:
                session_content = sessions_dict.get(session_key)
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


if __name__ == "__main__":
    main()
