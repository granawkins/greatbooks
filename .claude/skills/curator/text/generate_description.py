#!/usr/bin/env python3
"""
Generate a short book description and write it to the database.

The description appears on the /library page and book cards throughout the site.
It should be 1-2 sentences, punchy, specific — written to intrigue a general reader.

Usage:
    .venv/bin/python .claude/skills/curator/text/generate_description.py --book-id austen-emma
    .venv/bin/python .claude/skills/curator/text/generate_description.py --book-id austen-emma --dry-run
    .venv/bin/python .claude/skills/curator/text/generate_description.py --all --dry-run

Requires: google-generativeai (or openai), GOOGLE_API_KEY in .env
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

import google.generativeai as genai

MODEL = "gemini-2.0-flash"
COST_PER_1K_OUTPUT = 0.0004  # ~$0.40/1M output tokens

# ── Style guide ──────────────────────────────────────────────────────────────
# Calibrated to the existing 5 descriptions on the homepage.

SYSTEM_PROMPT = """You write short book descriptions for a great books reading site.

Style rules:
- 1–2 sentences. 15–30 words total.
- Lead with the book's central tension, image, or idea — not with "A story about..."
- Use em-dashes for rhythm. Be specific, not generic.
- No fluff: "masterpiece", "classic", "timeless", "must-read" are banned.
- The tone is a confident professor recommending the book to a smart adult.

Examples (calibrate to these exactly):
  The Iliad:     "The rage of Achilles and the cost of war. The foundational epic of Western literature."
  The Odyssey:   "The long road home. Odysseus navigates gods, monsters, and temptation to return to Ithaca."
  The Republic:  "What is justice? Plato imagines the ideal city and the examined life, culminating in the Allegory of the Cave."
  The Apology:   "Socrates on trial for his life, arguing that the unexamined life is not worth living."
  The Phaedo:    "The last hours of Socrates. A conversation about death, the soul, and why a philosopher should not fear dying."

Return ONLY the description text. No quotes, no preamble, no explanation."""


def generate_description(title: str, author: str, existing: str = None) -> str:
    """Generate a description for a book."""
    client = genai.GenerativeModel(MODEL, system_instruction=SYSTEM_PROMPT)

    prompt = f'Write a description for: "{title}" by {author}.'
    if existing:
        prompt += f'\n\nExisting description (improve if needed, or keep): "{existing}"'

    response = client.generate_content(prompt)
    return response.text.strip().strip('"')


def update_db(book_id: str, description: str) -> None:
    db = PROJECT_ROOT / "greatbooks.db"
    con = sqlite3.connect(db)
    con.execute("PRAGMA busy_timeout = 5000")
    con.execute("UPDATE books SET description = ? WHERE id = ?", (description, book_id))
    con.commit()
    con.close()


def log_cost(book_id: str, description: str) -> None:
    try:
        sys.path.insert(0, str(PROJECT_ROOT))
        from logs.cost_log import log_cost as _log
        # Rough token estimate: ~4 chars/token
        output_tokens = len(description) // 4
        cost = round(output_tokens * COST_PER_1K_OUTPUT / 1000, 6)
        _log(
            api="llm",
            provider="google",
            model=MODEL,
            input_units=output_tokens,
            input_unit_type="tokens",
            cost_usd=cost,
            entity_type="book",
            entity_id=book_id,
            meta={"task": "description"},
        )
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Generate book descriptions")
    parser.add_argument("--book-id", help="Single book ID to process")
    parser.add_argument("--all", action="store_true", help="Process all books missing a description")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate even if description exists")
    parser.add_argument("--dry-run", action="store_true", help="Print result but don't write to DB")
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not set. Run: set -a && source .env && set +a")
        sys.exit(1)
    genai.configure(api_key=api_key)

    db = PROJECT_ROOT / "greatbooks.db"
    con = sqlite3.connect(db)

    if args.book_id:
        rows = con.execute(
            "SELECT id, title, author, description FROM books WHERE id = ?", (args.book_id,)
        ).fetchall()
    elif args.all:
        if args.overwrite:
            rows = con.execute("SELECT id, title, author, description FROM books ORDER BY id").fetchall()
        else:
            rows = con.execute(
                "SELECT id, title, author, description FROM books WHERE description IS NULL OR description = '' ORDER BY id"
            ).fetchall()
    else:
        parser.print_help()
        sys.exit(1)
    con.close()

    if not rows:
        print("No books to process.")
        return

    for book_id, title, author, existing in rows:
        if existing and not args.overwrite:
            print(f"  [{book_id}] Already has description — skipping (use --overwrite to regenerate)")
            continue

        print(f"\n  [{book_id}] {title} — {author}")
        if existing:
            print(f"    Current: {existing}")

        desc = generate_description(title, author, existing)
        print(f"    New:     {desc}")

        if not args.dry_run:
            update_db(book_id, desc)
            log_cost(book_id, desc)
            print(f"    ✓ Saved to DB")
        else:
            print(f"    [DRY RUN] Not saved")


if __name__ == "__main__":
    main()
