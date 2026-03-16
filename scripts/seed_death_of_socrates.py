"""
Seed the death-of-socrates course into the database.

Creates a course that presents the Apology, Phaedo, and Republic with
interleaved discussion sessions drawn from study guides.

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
    "Athens answered by executing him. Read his trial, his final hours, and "
    "the philosophy he died for \u2014 in the words of the man who was there."
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
            segments.append({"type": "list_item", "text": item_text})
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
                segments.append({"type": "text", "text": sent})

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

    # No Coming Up found — append Discussion at the end
    return text_without_essay.rstrip() + "\n\n---\n\n" + essay_content


def extract_sessions(studyguide_path: str) -> dict[str, str]:
    """Extract session content from a study guide file.

    Handles session numbers as both Arabic digits (Session 1) and
    Roman numerals (Session I, Session II, etc.).
    """
    with open(studyguide_path, "r") as f:
        content = f.read()

    sessions = {}

    # Extract "Before You Read" as intro content
    before_match = re.search(
        r"## Before You Read\n(.*?)(?=\n---\n|\n## Session)",
        content,
        re.DOTALL,
    )
    if before_match:
        sessions["intro"] = before_match.group(1).strip()

    # Extract each session — use [^:\n]+ to match both Arabic and Roman numerals
    session_pattern = r"## (Session [^:\n]+:.*?)\n(.*?)(?=\n## Session|\n*$)"
    for match in re.finditer(session_pattern, content, re.DOTALL):
        title = match.group(1).strip()
        body = match.group(2).strip()
        sessions[title] = body

    return sessions


def generate_book_intro_segments(book_title: str, sessions: dict) -> list[dict]:
    """Generate introduction segments from 'Before You Read'."""
    if "intro" in sessions:
        segs = parse_session_to_segments(sessions["intro"], reorder_essay=False)
        if segs:
            return segs
    return [{"type": "text", "text": f"Introduction to {book_title}."}]


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

    # Insert course book record
    conn.execute(
        "INSERT INTO books (id, title, author, description, layout, type) VALUES (?, ?, ?, ?, 'prose', 'course')",
        (COURSE_ID, COURSE_TITLE, COURSE_AUTHOR, COURSE_DESCRIPTION),
    )

    # Fetch source chapter ID maps
    def get_chapter_map(book_id: str) -> dict[int, int]:
        return {
            row[0]: row[1]
            for row in conn.execute(
                "SELECT number, id FROM chapters WHERE book_id = ? ORDER BY number", (book_id,)
            ).fetchall()
        }

    apology_chapters = get_chapter_map("plato-apology")
    phaedo_chapters = get_chapter_map("plato-phaedo")
    republic_chapters = get_chapter_map("plato-republic")

    # Extract study guide sessions
    apology_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-apology", "STUDYGUIDE.md"))
    phaedo_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-phaedo", "STUDYGUIDE.md"))
    republic_sessions = extract_sessions(os.path.join(DATA_DIR, "plato-republic", "STUDYGUIDE.md"))

    # ------------------------------------------------------------------
    # Course items: (type, title, source_book_id, source_ch_num, session_key, sessions_dict)
    # type = "text" (reference chapter) | "discussion" (study guide segment)
    # For discussions: session_key = "intro" OR exact key from sessions dict
    # ------------------------------------------------------------------
    course_items = []

    # ---- APOLOGY (1 chapter, 2 sessions) ----
    course_items.append(("discussion", "Introduction to the Apology", "plato-apology", None,
                         "intro", apology_sessions))
    course_items.append(("text", "Apology: Chapter I", "plato-apology", 1, None, None))
    course_items.append(("discussion", "Apology \u2014 Session 1: The Defense", "plato-apology", None,
                         "Session I: The Defense (The Full Speech)", apology_sessions))
    course_items.append(("discussion", "Apology \u2014 Session 2: The Verdict", "plato-apology", None,
                         "Session II: The Verdict", apology_sessions))

    # ---- PHAEDO (1 chapter, 3 sessions) ----
    course_items.append(("discussion", "Introduction to the Phaedo", "plato-phaedo", None,
                         "intro", phaedo_sessions))
    course_items.append(("text", "Phaedo: Chapter I", "plato-phaedo", 1, None, None))
    course_items.append(("discussion", "Phaedo \u2014 Session 1: Why Fear Death?", "plato-phaedo", None,
                         "Session I: Why Fear Death? (Opening through the Argument from Recollection)",
                         phaedo_sessions))
    course_items.append(("discussion", "Phaedo \u2014 Session 2: The Soul and the Forms", "plato-phaedo", None,
                         "Session II: The Soul and the Forms (Affinity Argument through Final Argument)",
                         phaedo_sessions))
    course_items.append(("discussion", "Phaedo \u2014 Session 3: The Last Hour", "plato-phaedo", None,
                         "Session III: The Last Hour (The Myth and the Death Scene)", phaedo_sessions))

    # ---- REPUBLIC (10 chapters, 5 sessions) ----
    # Session I  → Books I–II    (chapters 1–2)
    # Session II → Books III–V   (chapters 3–5)
    # Session III→ Books VI–VII  (chapters 6–7)
    # Session IV → Books VIII–IX (chapters 8–9)
    # Session V  → Book X        (chapter 10)
    course_items.append(("discussion", "Introduction to the Republic", "plato-republic", None,
                         "intro", republic_sessions))
    for ch in [1, 2]:
        course_items.append(("text", f"Republic: Book {ch_num_to_roman(ch)}",
                              "plato-republic", ch, None, None))
    course_items.append(("discussion", "Republic \u2014 Session 1: What Is Justice?", "plato-republic", None,
                         "Session I: What Is Justice? (Books I\u2013II)", republic_sessions))
    for ch in [3, 4, 5]:
        course_items.append(("text", f"Republic: Book {ch_num_to_roman(ch)}",
                              "plato-republic", ch, None, None))
    course_items.append(("discussion", "Republic \u2014 Session 2: The City in Speech", "plato-republic", None,
                         "Session II: The City in Speech (Books III\u2013V)", republic_sessions))
    for ch in [6, 7]:
        course_items.append(("text", f"Republic: Book {ch_num_to_roman(ch)}",
                              "plato-republic", ch, None, None))
    course_items.append(("discussion", "Republic \u2014 Session 3: The Sun, the Line, and the Den",
                         "plato-republic", None,
                         "Session III: The Sun, the Line, and the Den (Books VI\u2013VII)",
                         republic_sessions))
    for ch in [8, 9]:
        course_items.append(("text", f"Republic: Book {ch_num_to_roman(ch)}",
                              "plato-republic", ch, None, None))
    course_items.append(("discussion", "Republic \u2014 Session 4: The Decline of Regimes",
                         "plato-republic", None,
                         "Session IV: The Decline of Regimes (Books VIII\u2013IX)", republic_sessions))
    course_items.append(("text", f"Republic: Book {ch_num_to_roman(10)}",
                          "plato-republic", 10, None, None))
    course_items.append(("discussion", "Republic \u2014 Session 5: The Myth of Er",
                         "plato-republic", None,
                         "Session V: The Myth of Er (Book X)", republic_sessions))

    # ---- Insert all chapters and segments ----
    chapter_num = 0
    source_map = {
        "plato-apology": apology_chapters,
        "plato-phaedo": phaedo_chapters,
        "plato-republic": republic_chapters,
    }

    for item_type, title, source_book, source_ch_num, session_key, sessions_dict in course_items:
        chapter_num += 1

        if item_type == "text":
            source_id = source_map[source_book].get(source_ch_num)
            if not source_id:
                print(f"  WARNING: Source chapter {source_book} #{source_ch_num} not found, skipping")
                chapter_num -= 1
                continue
            conn.execute(
                "INSERT INTO chapters (book_id, number, title, source_chapter_id, chapter_type) "
                "VALUES (?, ?, ?, ?, 'text')",
                (COURSE_ID, chapter_num, title, source_id),
            )
            print(f"  Ch {chapter_num}: {title} (ref -> {source_book} ch {source_ch_num})")

        elif item_type == "discussion":
            cursor = conn.execute(
                "INSERT INTO chapters (book_id, number, title, chapter_type) VALUES (?, ?, ?, 'discussion')",
                (COURSE_ID, chapter_num, title),
            )
            chapter_id = cursor.lastrowid

            if session_key == "intro":
                segments = generate_book_intro_segments(title, sessions_dict)
            else:
                session_content = sessions_dict.get(session_key)
                if session_content:
                    segments = parse_session_to_segments(session_content)
                else:
                    segments = [{"type": "text", "text": f"Discussion: {title}"}]
                    print(f"  WARNING: No session content for key '{session_key}'")
                    print(f"    Available: {list(sessions_dict.keys())}")

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
