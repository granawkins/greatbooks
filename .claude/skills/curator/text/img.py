#!/usr/bin/env python3
"""
Generate AI cover art for a book using Google Nano Banana (gemini-2.5-flash-image).

The visual style is defined in cover-style.md. Each book has a chosen subject
(a specific object or scene) recorded in data/<book-id>/SKILL.md.

Usage:
    python img.py --book-id iliad --subject "The Shield of Achilles, a vast bronze shield with hammered scenes"
    python img.py --book-id iliad --subject "..." --output data/iliad/cover.png
    python img.py --book-id iliad --subject "..." --prompt "Full custom prompt (skips style guide)"

Saves cover image to data/<book-id>/cover.png by default.
Updates books.cover_image in the database.

Requires:
    - google-genai
    - python-dotenv
    - GOOGLE_API_KEY in .env
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parents[3]
load_dotenv(_project_root / ".env")

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash-image"

# Nano Banana (gemini-2.5-flash-image): ~$0.039/image
COST_PER_IMAGE = 0.039

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_API_KEY", "")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY not set in environment")
        _client = genai.Client(api_key=api_key)
    return _client


def _load_style_guide() -> str:
    """Load cover-style.md from the same directory as this script."""
    style_path = Path(__file__).resolve().parent / "cover-style.md"
    return style_path.read_text()


def _build_prompt(subject: str, title: str, author: str) -> str:
    """Build a cover art prompt from the style guide + book-specific subject."""
    style_guide = _load_style_guide()
    return (
        f"Generate a book cover image following this style guide:\n\n"
        f"{style_guide}\n\n"
        f"---\n\n"
        f"For this specific book:\n"
        f"- Title: {title}\n"
        f"- Author: {author}\n"
        f"- Subject/scene: {subject}\n"
    )


def generate(
    subject: str,
    output_path: str,
    title: str = "",
    author: str = "",
    prompt: str | None = None,
) -> dict:
    """
    Generate cover art for a book and save it to disk.

    Args:
        subject: What to depict — specific object/scene chosen for this book
        output_path: Where to save the PNG file
        title: Book title (e.g. "The Iliad")
        author: Author name (e.g. "Homer")
        prompt: Override everything with a fully custom prompt

    Returns:
        {"file_path": str, "prompt": str}
    """
    client = _get_client()
    image_prompt = prompt or _build_prompt(subject, title, author)

    print(f"Prompt: {image_prompt}")
    print(f"Calling {MODEL}...")

    response = client.models.generate_content(
        model=MODEL,
        contents=image_prompt,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="2:3"),
        ),
    )

    # Extract image bytes from response parts (Python SDK returns raw bytes)
    image_bytes = None
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            image_bytes = part.inline_data.data
            break

    if not image_bytes:
        raise RuntimeError(f"No image data in response from {MODEL}")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(image_bytes)

    print(f"Saved {output_path} ({len(image_bytes):,} bytes)")

    # Log cost
    try:
        sys.path.insert(0, str(_project_root))
        from logs.cost_log import log_cost
        log_cost(
            api="image",
            provider="google",
            model=MODEL,
            input_units=1,
            input_unit_type="images",
            cost_usd=COST_PER_IMAGE,
            entity_type="book",
            entity_id=os.environ.get("GREATBOOKS_ENTITY_ID"),
            meta={"output": output_path, "subject": subject},
        )
    except Exception:
        pass  # Don't let logging failures block generation

    return {"file_path": output_path, "prompt": image_prompt}


def update_db(book_id: str, cover_path: str) -> None:
    """
    Write cover_image path to the books table.

    Args:
        book_id: Book ID (e.g. "iliad")
        cover_path: Public URL path to store (e.g. "/covers/iliad.png")
    """
    db_path = _project_root / "greatbooks.db"
    con = sqlite3.connect(db_path)
    con.execute("PRAGMA busy_timeout = 5000")
    con.execute("UPDATE books SET cover_image = ? WHERE id = ?", (cover_path, book_id))
    con.commit()
    con.close()
    print(f"Updated books.cover_image = '{cover_path}' for book '{book_id}'")


def main():
    parser = argparse.ArgumentParser(
        description=f"Generate book cover art via Google {MODEL}"
    )
    parser.add_argument("--book-id", required=True, help="Book ID (e.g. iliad)")
    parser.add_argument(
        "--subject",
        required=True,
        help='What to depict — specific object/scene for this book (see cover-style.md). '
             'E.g. "The Shield of Achilles, a vast bronze shield with hammered scenes of cities and fields"',
    )
    parser.add_argument("--title", required=True, help="Book title (e.g. 'The Iliad')")
    parser.add_argument("--author", required=True, help="Author name (e.g. 'Homer')")
    parser.add_argument("--prompt", help="Override everything with a fully custom prompt")
    parser.add_argument(
        "--output",
        help="Output PNG path (default: public/covers/<book-id>.png)",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Skip updating the database after generating",
    )
    args = parser.parse_args()

    output_path = args.output or str(_project_root / "public" / "covers" / f"{args.book_id}.png")

    os.environ.setdefault("GREATBOOKS_ENTITY_ID", args.book_id)

    result = generate(
        subject=args.subject,
        output_path=output_path,
        title=args.title,
        author=args.author,
        prompt=args.prompt,
    )

    if not args.no_db:
        # Store as the public URL path: "/covers/<book-id>.png"
        cover_url = f"/covers/{args.book_id}.png"
        update_db(args.book_id, cover_url)

    print(f"Done: {result['file_path']}")


if __name__ == "__main__":
    main()
