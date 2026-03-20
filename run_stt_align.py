#!/usr/bin/env python3
"""
Run STT alignment on existing merged audio files.
Used for chapters where TTS ran but STT timestamps are missing.

Usage:
    python run_stt_align.py plato-apology
    python run_stt_align.py plato-phaedo
"""

import json
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DB_PATH = PROJECT_ROOT / "greatbooks.db"

sys.path.insert(0, str(PROJECT_ROOT / ".claude/skills/curator/audio"))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from stt import transcribe_and_align


def get_chapters_with_audio(book_id: str) -> list[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, number, title, audio_file FROM chapters "
        "WHERE book_id = ? AND audio_file IS NOT NULL ORDER BY number",
        (book_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_segments(chapter_id: int) -> list[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, text FROM segments WHERE chapter_id = ? AND segment_type = 'text' ORDER BY sequence",
        (chapter_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_segment_timestamps(timestamps: list[dict]):
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 5000")
    for ts in timestamps:
        conn.execute(
            "UPDATE segments SET audio_start_ms = ?, audio_end_ms = ?, word_timestamps = ? WHERE id = ?",
            (ts["audio_start_ms"], ts["audio_end_ms"], json.dumps(ts["words"]), ts["segment_id"]),
        )
    conn.commit()
    conn.close()


def run_stt_for_book(book_id: str):
    chapters = get_chapters_with_audio(book_id)
    if not chapters:
        print(f"No chapters with audio found for {book_id}")
        return

    for ch in chapters:
        audio_path = PROJECT_ROOT / ch["audio_file"]
        if not audio_path.exists():
            print(f"  Chapter {ch['number']}: audio file missing ({audio_path})")
            continue

        segments = get_segments(ch["id"])
        if not segments:
            print(f"  Chapter {ch['number']}: no text segments found")
            continue

        # Check if already aligned
        conn = sqlite3.connect(str(DB_PATH))
        aligned = conn.execute(
            "SELECT COUNT(*) FROM segments WHERE chapter_id = ? AND audio_start_ms IS NOT NULL",
            (ch["id"],)
        ).fetchone()[0]
        conn.close()

        if aligned == len(segments):
            print(f"  Chapter {ch['number']}: already aligned ({aligned} segments), skipping")
            continue

        print(f"\n  Chapter {ch['number']}: {ch['title']}")
        print(f"    Audio: {audio_path} ({audio_path.stat().st_size // 1024}KB)")
        print(f"    Segments: {len(segments)}")
        print(f"    Running STT...")

        import os
        os.environ["GREATBOOKS_ENTITY_ID"] = book_id
        timestamps = transcribe_and_align(str(audio_path), segments)
        update_segment_timestamps(timestamps)

        print(f"    ✓ Aligned {len(timestamps)} segments")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_stt_align.py <book_id> [<book_id> ...]")
        sys.exit(1)

    for book_id in sys.argv[1:]:
        print(f"\n{'='*60}")
        print(f"Book: {book_id}")
        print(f"{'='*60}")
        run_stt_for_book(book_id)

    print("\nDone.")
