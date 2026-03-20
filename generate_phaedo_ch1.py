#!/usr/bin/env python3
"""
Generate audio for Phaedo Chapter 1 with TTS text transforms.
Applies speaker-name normalization before sending text to TTS.
"""

import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Allow importing the audio skill modules
AUDIO_SKILL_DIR = Path(__file__).parent / ".claude/skills/curator/audio"
sys.path.insert(0, str(AUDIO_SKILL_DIR))

from generate_chapter import generate_chapter

PROJECT_ROOT = Path(__file__).parent
DB_PATH = PROJECT_ROOT / "greatbooks.db"
BOOK_ID = "plato-phaedo"
CHAPTER_NUMBER = 1


def text_transform(text: str) -> str:
    """
    Apply TTS text transforms for Phaedo:
    - Strip metadata headers entirely
    - Convert ALL-CAPS speaker labels to title case
    - Normalize whitespace
    """
    if not text:
        return text

    # Normalize whitespace first
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n+', ' ', text).strip()

    if not text:
        return text

    # Strip metadata headers entirely
    if re.match(r'^PERSONS OF THE DIALOGUE[:\s]', text):
        return ""
    if re.match(r'^SCENE[:\s]', text):
        return ""
    if re.match(r'^PLACE OF THE NARRATION[:\s]', text):
        return ""

    # Convert ALL-CAPS speaker labels (e.g. ECHECRATES: → Echecrates:)
    # Pattern: one or more ALL-CAPS words at start, followed by colon
    text = re.sub(
        r'^([A-Z][A-Z\s]+?):\s*',
        lambda m: m.group(1).title() + ': ',
        text
    )

    return text.strip()


def get_segments(chapter_id: int) -> list[dict]:
    """Fetch segments for the given chapter id."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, sequence, text, segment_type FROM segments "
        "WHERE chapter_id = ? ORDER BY sequence",
        (chapter_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def apply_transforms(segments: list[dict]) -> list[dict]:
    """Return a copy of segments with text transforms applied."""
    result = []
    for seg in segments:
        s = dict(seg)
        if s.get("segment_type") == "text":
            s["text"] = text_transform(s.get("text", "") or "")
        result.append(s)
    return result


def update_db(chapter_id: int, chapter_number: int, manifest: dict):
    """Write audio metadata and word timestamps to DB."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode=WAL")

    audio_file_rel = os.path.relpath(manifest["merged_file"], PROJECT_ROOT)

    conn.execute(
        "UPDATE chapters SET audio_file = ?, audio_duration_ms = ? WHERE id = ?",
        (audio_file_rel, manifest["merged_duration_ms"], chapter_id),
    )

    for chunk in manifest["chunks"]:
        for seg_ts in chunk["word_timestamps"]:
            conn.execute(
                "UPDATE segments SET audio_start_ms = ?, audio_end_ms = ?, "
                "word_timestamps = ? WHERE id = ?",
                (
                    seg_ts["audio_start_ms"],
                    seg_ts["audio_end_ms"],
                    json.dumps(seg_ts["words"]),
                    seg_ts["segment_id"],
                ),
            )

    conn.commit()
    conn.close()


def main():
    print(f"=== Generating audio for Phaedo Chapter {CHAPTER_NUMBER} ===")

    # Get chapter ID
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT id, title FROM chapters WHERE book_id=? AND number=?",
        (BOOK_ID, CHAPTER_NUMBER),
    ).fetchone()
    conn.close()

    if not row:
        print(f"ERROR: Chapter {CHAPTER_NUMBER} of {BOOK_ID} not found!")
        sys.exit(1)

    chapter_id, chapter_title = row
    print(f"Chapter id={chapter_id}: {chapter_title}")

    # Get segments
    segments = get_segments(chapter_id)
    print(f"Raw segments: {len(segments)}")

    # Show a few examples of transforms
    print("\nTransform examples:")
    for seg in segments[:15]:
        if seg.get("segment_type") == "text" and seg.get("text"):
            orig = seg["text"][:80].replace('\n', '↵')
            transformed = text_transform(seg["text"])[:80].replace('\n', '↵')
            if orig != transformed or not transformed:
                print(f"  [{seg['sequence']}] '{orig}' → '{transformed}'")

    # Apply transforms
    transformed_segments = apply_transforms(segments)

    # Count effective text segments
    text_segs = [s for s in transformed_segments
                 if s.get("segment_type") == "text" and s.get("text")]
    total_chars = sum(len(s["text"]) for s in text_segs)
    print(f"\nAfter transform: {len(text_segs)} text segments, {total_chars:,} chars")
    print(f"Est. TTS cost: ${total_chars * 0.016 / 1000:.2f}")

    # Generate audio
    audio_dir = str(PROJECT_ROOT / "data" / BOOK_ID / "audio")
    os.makedirs(audio_dir, exist_ok=True)

    print(f"\nStarting TTS generation...")
    t0 = time.time()

    manifest = generate_chapter(
        transformed_segments,
        audio_dir,
        CHAPTER_NUMBER,
        voice="Algieba",
        max_workers=10,
    )

    elapsed = time.time() - t0
    duration_s = manifest["merged_duration_ms"] / 1000

    print(f"\n✓ Generated: {duration_s:.1f}s audio, {len(manifest['chunks'])} chunks, {elapsed:.0f}s elapsed")
    print(f"  File: {manifest['merged_file']}")

    # Update DB
    print("\nUpdating DB...")
    update_db(chapter_id, CHAPTER_NUMBER, manifest)

    print("\n=== Done! ===")

    # Verify
    conn = sqlite3.connect(str(DB_PATH))
    total, aligned = conn.execute("""
        SELECT COUNT(*), SUM(CASE WHEN audio_start_ms IS NOT NULL THEN 1 ELSE 0 END)
        FROM segments s JOIN chapters c ON s.chapter_id = c.id
        WHERE c.book_id = ? AND c.number = ?
    """, (BOOK_ID, CHAPTER_NUMBER)).fetchone()
    ch_info = conn.execute(
        "SELECT number, title, audio_file, audio_duration_ms FROM chapters WHERE book_id=? AND number=?",
        (BOOK_ID, CHAPTER_NUMBER)
    ).fetchone()
    conn.close()

    print(f"\nVerification:")
    print(f"  Segments: {total}, with timestamps: {aligned}")
    print(f"  Chapter: {ch_info}")


if __name__ == "__main__":
    main()
