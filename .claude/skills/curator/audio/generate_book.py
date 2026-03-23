#!/usr/bin/env python3
"""
Generate audio for an entire book, processing chapters in parallel batches.

Usage:
    python generate_book.py homer-odyssey
    python generate_book.py plato-republic --batch-size 5 --voice Orus
    python generate_book.py homer-odyssey --chapters 3-8
    python generate_book.py homer-odyssey --resume  # skip chapters with existing audio

Requires:
    - All dependencies from generate_chapter.py
    - greatbooks.db at project root
"""

import argparse
import json
import os
import signal
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Allow importing sibling modules
sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_chapter import generate_chapter

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "greatbooks.db"

# Graceful shutdown
_shutdown = False


def _signal_handler(signum, frame):
    global _shutdown
    print("\n⚠ Interrupt received — finishing current batch, then stopping.")
    print("  (Press Ctrl+C again to force quit)")
    _shutdown = True
    signal.signal(signal.SIGINT, signal.SIG_DFL)  # next Ctrl+C = hard kill


signal.signal(signal.SIGINT, _signal_handler)


def get_chapters(book_id: str, chapter_range: str | None = None) -> list[dict]:
    """Fetch chapter list from DB."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, number, title, audio_file, audio_duration_ms "
        "FROM chapters WHERE book_id = ? ORDER BY number",
        (book_id,),
    ).fetchall()
    conn.close()

    chapters = [dict(r) for r in rows]

    if chapter_range:
        if "-" in chapter_range:
            start, end = map(int, chapter_range.split("-"))
            chapters = [c for c in chapters if start <= c["number"] <= end]
        else:
            num = int(chapter_range)
            chapters = [c for c in chapters if c["number"] == num]

    return chapters


def get_segments(book_id: str, chapter_number: int) -> list[dict]:
    """Fetch segments for a chapter from DB."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT s.id, s.sequence, s.text, s.segment_type
        FROM segments s JOIN chapters c ON s.chapter_id = c.id
        WHERE c.book_id = ? AND c.number = ?
        ORDER BY s.sequence
        """,
        (book_id, chapter_number),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_db(book_id: str, chapter_number: int, manifest: dict):
    """Write audio metadata and word timestamps to DB."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA busy_timeout = 5000")

    # Update chapter
    conn.execute(
        "UPDATE chapters SET audio_file = ?, audio_duration_ms = ? "
        "WHERE book_id = ? AND number = ?",
        (
            os.path.relpath(manifest["merged_file"], PROJECT_ROOT),
            manifest["merged_duration_ms"],
            book_id,
            chapter_number,
        ),
    )

    # Update segments with word timestamps
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


def process_chapter(book_id: str, chapter: dict, voice: str, stt_provider: str | None) -> dict:
    """Generate audio for a single chapter and update DB. Returns summary info."""
    ch_num = chapter["number"]
    title = chapter["title"] or f"Chapter {ch_num}"
    audio_dir = str(PROJECT_ROOT / "data" / book_id / "audio")

    print(f"\n{'='*60}")
    print(f"Chapter {ch_num}: {title}")
    print(f"{'='*60}")

    segments = get_segments(book_id, ch_num)
    total_chars = sum(len(s["text"]) for s in segments if s.get("text"))
    print(f"  {len(segments)} segments, {total_chars:,} chars")

    t0 = time.time()
    manifest = generate_chapter(
        segments, audio_dir, ch_num,
        voice=voice, stt_provider=stt_provider,
        book_id=book_id,
    )
    elapsed = time.time() - t0

    # Update DB
    update_db(book_id, ch_num, manifest)

    # Move to data/ and upload to GCS immediately
    import shutil, subprocess
    src = PROJECT_ROOT / ".claude" / "data" / book_id / "audio" / f"{ch_num:02d}.mp3"
    dst_dir = PROJECT_ROOT / "data" / book_id / "audio"
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / f"{ch_num:02d}.mp3"
    if src.exists():
        shutil.move(str(src), str(dst))
        subprocess.run(
            ["python", "scripts/upload_to_gcs.py", "--audio", "--force"],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
        )
        print(f"  ↑ Uploaded ch{ch_num} to GCS")

    duration_s = manifest["merged_duration_ms"] / 1000
    print(f"  ✓ Chapter {ch_num} done: {duration_s:.1f}s audio, "
          f"{len(manifest['chunks'])} chunks, {elapsed:.0f}s elapsed")

    return {
        "number": ch_num,
        "title": title,
        "duration_ms": manifest["merged_duration_ms"],
        "chunks": len(manifest["chunks"]),
        "chars": total_chars,
        "elapsed_s": elapsed,
    }


def generate_book(
    book_id: str,
    batch_size: int = 10,
    voice: str = "Algieba",
    chapter_range: str | None = None,
    resume: bool = False,
    stt_provider: str | None = None,
):
    """Generate audio for all chapters of a book in parallel batches."""
    global _shutdown

    # Set entity ID for cost logging
    os.environ["GREATBOOKS_ENTITY_ID"] = book_id

    chapters = get_chapters(book_id, chapter_range)
    if not chapters:
        print(f"No chapters found for '{book_id}'")
        return

    # Filter out chapters that already have audio if resuming
    if resume:
        before = len(chapters)
        chapters = [c for c in chapters if not c.get("audio_file")]
        skipped = before - len(chapters)
        if skipped:
            print(f"Resuming: skipping {skipped} chapters with existing audio")

    if not chapters:
        print("All chapters already have audio!")
        return

    total_chapters = len(chapters)
    total_chars = 0
    for ch in chapters:
        segs = get_segments(book_id, ch["number"])
        total_chars += sum(len(s["text"]) for s in segs if s.get("text"))

    print(f"\n{'#'*60}")
    print(f"  GENERATING AUDIO: {book_id}")
    print(f"  Chapters: {total_chapters}, Total chars: {total_chars:,}")
    print(f"  Batch size: {batch_size}, Voice: {voice}")
    print(f"  Est. TTS cost: ${total_chars * 0.016 / 1000:.2f}")
    print(f"{'#'*60}")

    results = []
    t_start = time.time()

    # Process in batches
    for batch_start in range(0, total_chapters, batch_size):
        if _shutdown:
            print("\n⚠ Shutting down gracefully after interrupt.")
            break

        batch = chapters[batch_start : batch_start + batch_size]
        batch_num = batch_start // batch_size + 1
        total_batches = (total_chapters + batch_size - 1) // batch_size

        print(f"\n{'━'*60}")
        print(f"  BATCH {batch_num}/{total_batches} "
              f"(chapters {batch[0]['number']}-{batch[-1]['number']})")
        print(f"{'━'*60}")

        # Run chapters in this batch in parallel
        batch_results = [None] * len(batch)
        with ThreadPoolExecutor(max_workers=len(batch)) as pool:
            futures = {}
            for i, chapter in enumerate(batch):
                fut = pool.submit(
                    process_chapter, book_id, chapter, voice, stt_provider,
                )
                futures[fut] = i

            for fut in as_completed(futures):
                idx = futures[fut]
                try:
                    batch_results[idx] = fut.result()
                except Exception as e:
                    ch = batch[idx]
                    print(f"\n  ✗ Chapter {ch['number']} FAILED: {e}")
                    batch_results[idx] = {
                        "number": ch["number"],
                        "title": ch.get("title", ""),
                        "error": str(e),
                    }

        results.extend(batch_results)

        # Batch summary
        ok = [r for r in batch_results if r and "duration_ms" in r]
        failed = [r for r in batch_results if r and "error" in r]
        if ok:
            batch_audio = sum(r["duration_ms"] for r in ok) / 1000
            batch_elapsed = max(r["elapsed_s"] for r in ok)
            print(f"\n  Batch {batch_num} complete: {len(ok)} ok, {len(failed)} failed, "
                  f"{batch_audio:.0f}s audio in {batch_elapsed:.0f}s wall time")

    # Final summary
    total_elapsed = time.time() - t_start
    ok_results = [r for r in results if r and "duration_ms" in r]
    failed_results = [r for r in results if r and "error" in r]

    print(f"\n{'#'*60}")
    print(f"  COMPLETE: {book_id}")
    print(f"  Chapters: {len(ok_results)} succeeded, {len(failed_results)} failed")
    if ok_results:
        total_audio = sum(r["duration_ms"] for r in ok_results) / 1000
        total_chars_done = sum(r.get("chars", 0) for r in ok_results)
        print(f"  Total audio: {total_audio / 60:.1f} minutes")
        print(f"  Total chars: {total_chars_done:,}")
        print(f"  Wall time: {total_elapsed / 60:.1f} minutes")
    if failed_results:
        print(f"\n  Failed chapters:")
        for r in failed_results:
            print(f"    Chapter {r['number']}: {r['error']}")
    print(f"{'#'*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Generate audio for an entire book"
    )
    parser.add_argument("book_id", help="Book ID (e.g. homer-odyssey)")
    parser.add_argument(
        "--batch-size", type=int, default=10,
        help="Chapters to process in parallel (default: 10)",
    )
    parser.add_argument(
        "--voice", default="Algieba",
        help="Chirp3 HD voice name (default: Algieba)",
    )
    parser.add_argument(
        "--chapters", default=None,
        help="Chapter range to generate (e.g. '3' or '3-8')",
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip chapters that already have audio",
    )
    parser.add_argument(
        "--stt-provider", choices=["deepgram", "google"], default=None,
        help="STT provider override",
    )
    args = parser.parse_args()

    generate_book(
        args.book_id,
        batch_size=args.batch_size,
        voice=args.voice,
        chapter_range=args.chapters,
        resume=args.resume,
        stt_provider=args.stt_provider,
    )


if __name__ == "__main__":
    main()
