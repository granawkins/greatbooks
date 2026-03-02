#!/usr/bin/env python3
"""
Migrate word timestamps from chapters.word_timestamps to segments table.

Converts the old format:
  chapters.word_timestamps = [{segment_id, words: [{text, start_ms, end_ms}]}]

To the new format on each segment row:
  segments.audio_start_ms = first word start
  segments.audio_end_ms   = last word end
  segments.word_timestamps = [{start_ms, end_ms, char_start, char_end}]

Where char_start/char_end are character indices into segments.text.
"""

import json
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "greatbooks.db"


def compute_char_indices(word_texts: list[str], segment_text: str) -> list[tuple[int, int]]:
    """Find (char_start, char_end) for each word within segment text."""
    indices = []
    search_from = 0
    for word in word_texts:
        pos = segment_text.find(word, search_from)
        if pos == -1:
            print(f"  WARNING: word '{word}' not found in segment text "
                  f"(searching from {search_from}): '{segment_text[:80]}...'",
                  file=sys.stderr)
            indices.append((search_from, search_from + len(word)))
        else:
            indices.append((pos, pos + len(word)))
            search_from = pos + len(word)
    return indices


def migrate():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 5000")

    # Add new columns if they don't exist
    existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(segments)")}
    for col, typ in [("audio_start_ms", "INTEGER"), ("audio_end_ms", "INTEGER"), ("word_timestamps", "JSON")]:
        if col not in existing_cols:
            conn.execute(f"ALTER TABLE segments ADD COLUMN {col} {typ}")
            print(f"Added column segments.{col}")

    # Find chapters with word_timestamps
    chapters = conn.execute(
        "SELECT id, book_id, number, word_timestamps FROM chapters WHERE word_timestamps IS NOT NULL"
    ).fetchall()

    if not chapters:
        print("No chapters with word_timestamps found. Nothing to migrate.")
        return

    total_segments = 0

    for ch_id, book_id, ch_num, ts_json in chapters:
        old_timestamps = json.loads(ts_json)
        print(f"\nChapter {book_id} #{ch_num} (id={ch_id}): {len(old_timestamps)} segment entries")

        # Get segment texts from DB
        seg_rows = conn.execute(
            "SELECT id, text FROM segments WHERE chapter_id = ? ORDER BY sequence",
            (ch_id,)
        ).fetchall()
        seg_text_map = {row[0]: row[1] for row in seg_rows}

        migrated = 0
        for entry in old_timestamps:
            seg_id = entry["segment_id"]
            words = entry.get("words", [])

            if not words:
                continue

            seg_text = seg_text_map.get(seg_id)
            if seg_text is None:
                print(f"  WARNING: segment {seg_id} not found in DB, skipping", file=sys.stderr)
                continue

            # Compute char indices from word texts
            word_texts = [w["text"] for w in words]
            char_indices = compute_char_indices(word_texts, seg_text)

            # Build new word_timestamps format
            new_words = []
            for i, w in enumerate(words):
                char_start, char_end = char_indices[i]
                new_words.append({
                    "start_ms": w["start_ms"],
                    "end_ms": w["end_ms"],
                    "char_start": char_start,
                    "char_end": char_end,
                })

            audio_start_ms = words[0]["start_ms"]
            audio_end_ms = words[-1]["end_ms"]

            conn.execute(
                "UPDATE segments SET audio_start_ms = ?, audio_end_ms = ?, word_timestamps = ? WHERE id = ?",
                (audio_start_ms, audio_end_ms, json.dumps(new_words), seg_id)
            )
            migrated += 1

        # Clear chapter-level word_timestamps
        conn.execute(
            "UPDATE chapters SET word_timestamps = NULL WHERE id = ?",
            (ch_id,)
        )

        total_segments += migrated
        print(f"  Migrated {migrated} segments, cleared chapter word_timestamps")

    conn.commit()
    conn.close()
    print(f"\nDone! Migrated {total_segments} segments across {len(chapters)} chapters.")


if __name__ == "__main__":
    migrate()
