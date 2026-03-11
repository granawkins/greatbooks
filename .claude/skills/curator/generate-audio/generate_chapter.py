#!/usr/bin/env python3
"""
Generate audio for a full chapter: chunk segments, run TTS + STT for each chunk.

Chunks are processed in parallel (default 10 workers). Each worker runs TTS
then immediately STT+alignment for its chunk, so there's no idle time.

Usage:
    python generate_chapter.py --segments segments.json --output-dir data/iliad/audio/ --chapter 1
    python generate_chapter.py --segments segments.json --output-dir out/ --chapter 1 --voice Orus --workers 5

Input format (segments.json):
    [
      {"id": 1, "sequence": 1, "text": "Rage—Goddess...", "segment_type": "text"},
      {"id": 2, "sequence": 2, "text": "That cost the...", "segment_type": "text"},
      ...
    ]

Output:
    - MP3 files: <output-dir>/<chapter>-001.mp3, <chapter>-002.mp3, ...
    - Manifest JSON: <output-dir>/<chapter>-manifest.json

Requires:
    - google-cloud-texttospeech, python-dotenv, httpx
    - GOOGLE_APPLICATION_CREDENTIALS in .env
    - DEEPGRAM_API_KEY in .env (for STT)
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Allow importing sibling modules
sys.path.insert(0, str(Path(__file__).resolve().parent))

from tts import generate, MAX_INPUT_CHARS
from stt import transcribe_and_align

DEFAULT_WORKERS = 10


def chunk_segments(segments: list[dict], max_chars: int = None) -> list[list[dict]]:
    """
    Group segments into chunks suitable for TTS, breaking on paragraph
    and section boundaries. Prefers paragraph boundaries but will break
    mid-paragraph to respect the hard character limit.

    Each chunk is a list of segments whose combined text fits within max_chars.

    Args:
        segments: List of segment dicts with text, segment_type
        max_chars: Max characters per chunk (default: TTS limit * 0.9)

    Returns:
        List of chunks, where each chunk is a list of segment dicts
    """
    if max_chars is None:
        max_chars = int(MAX_INPUT_CHARS * 0.9)

    hard_limit = MAX_INPUT_CHARS

    chunks = []
    current_chunk = []
    current_len = 0
    at_paragraph_boundary = False

    for seg in segments:
        seg_text = seg.get("text", "")
        seg_type = seg.get("segment_type", "text")

        # Non-text segments (paragraph_break, heading) mark boundaries
        if seg_type != "text":
            at_paragraph_boundary = True
            continue

        # Would this segment push us over the limits?
        added_len = len(seg_text) + (1 if current_len > 0 else 0)  # space separator
        would_overflow_soft = current_len + added_len > max_chars
        would_overflow_hard = current_len + added_len > hard_limit

        # Start new chunk if:
        # - soft overflow at a paragraph boundary (preferred break point)
        # - hard overflow (must break, even mid-paragraph)
        if current_chunk and ((would_overflow_soft and at_paragraph_boundary) or would_overflow_hard):
            chunks.append(current_chunk)
            current_chunk = []
            current_len = 0

        # If a single segment overflows, it gets its own chunk
        if not current_chunk and len(seg_text) > hard_limit:
            chunks.append([seg])
            at_paragraph_boundary = False
            continue

        current_chunk.append(seg)
        current_len += added_len if current_len > 0 else len(seg_text)
        at_paragraph_boundary = False

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def chunk_text(chunk: list[dict]) -> str:
    """Join segment texts in a chunk, adding space between sentences."""
    return " ".join(seg.get("text", "") for seg in chunk if seg.get("text"))


def _process_chunk(
    chunk_idx: int,
    chunk_segs: list[dict],
    total_chunks: int,
    output_dir: str,
    chapter_str: str,
    voice: str,
    stt_provider: str | None,
) -> dict:
    """
    Process a single chunk: TTS then STT+alignment.
    Designed to run in a thread pool worker.
    """
    chunk_num = chunk_idx + 1
    chunk_str = f"{chunk_num:03d}"
    filename = f"{chapter_str}-{chunk_str}.mp3"
    filepath = os.path.join(output_dir, filename)

    text = chunk_text(chunk_segs)
    seg_ids = [s["id"] for s in chunk_segs]

    # TTS — skip if MP3 already exists
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        from tts import _mp3_duration_ms
        tts_result = {"file_path": filepath, "duration_ms": _mp3_duration_ms(filepath)}
        print(f"  [{chunk_num}/{total_chunks}] TTS: skipped (exists, {tts_result['duration_ms']}ms)")
    else:
        tts_result = generate(text, filepath, voice=voice)
        print(f"  [{chunk_num}/{total_chunks}] TTS: {len(text)} chars -> {tts_result['duration_ms']}ms")

    # STT + alignment — runs immediately after TTS in the same worker
    align_segments = [{"id": s["id"], "text": s["text"]} for s in chunk_segs]
    timestamps = transcribe_and_align(filepath, align_segments, provider=stt_provider)
    word_count = sum(len(t["words"]) for t in timestamps)
    print(f"  [{chunk_num}/{total_chunks}] STT: aligned {word_count} words")

    return {
        "chunk_idx": chunk_idx,
        "chunk_number": chunk_num,
        "file_path": f"data/{output_dir.split('data/')[-1]}/{filename}"
        if "data/" in output_dir
        else filename,
        "start_segment_id": seg_ids[0],
        "end_segment_id": seg_ids[-1],
        "duration_ms": tts_result["duration_ms"],
        "word_timestamps": timestamps,
    }


def _ffprobe_duration_ms(filepath: str) -> int:
    """Get accurate duration in milliseconds via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", filepath],
        capture_output=True, text=True,
    )
    return int(float(result.stdout.strip()) * 1000)


def _resolve_chunk_path(file_path: str, audio_dir: str) -> str:
    """Resolve chunk file path, trying as-is first, then relative to audio_dir."""
    if os.path.exists(file_path):
        return file_path
    return os.path.join(audio_dir, os.path.basename(file_path))


def merge_chunks(manifest: dict, output_dir: str) -> tuple[str, int]:
    """
    Merge chunk MP3s into a single chapter MP3, offset word timestamps
    using ffprobe for accurate chunk durations, and clean up chunk files.

    Mutates manifest in place (timestamps are offset).

    Returns:
        (output_path, merged_duration_ms)
    """
    chapter_str = f"{manifest['chapter']:02d}"
    chunks = manifest["chunks"]

    # 1. Get accurate duration of each chunk via ffprobe
    chunk_paths = []
    chunk_durations = []
    for chunk in chunks:
        fp = _resolve_chunk_path(chunk["file_path"], output_dir)
        dur = _ffprobe_duration_ms(fp)
        chunk_paths.append(fp)
        chunk_durations.append(dur)
        print(f"  Chunk {chunk['chunk_number']}: {dur}ms")

    # 2. Cumulative offsets
    cumulative_offsets = [0]
    for d in chunk_durations[:-1]:
        cumulative_offsets.append(cumulative_offsets[-1] + d)

    # 3. Offset all word timestamps
    for ci, chunk in enumerate(chunks):
        offset = cumulative_offsets[ci]
        for seg_entry in chunk["word_timestamps"]:
            seg_entry["audio_start_ms"] += offset
            seg_entry["audio_end_ms"] += offset
            for w in seg_entry["words"]:
                w["start_ms"] += offset
                w["end_ms"] += offset

    # 4. Merge via ffmpeg concat
    output_path = os.path.join(output_dir, f"{chapter_str}.mp3")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for fp in chunk_paths:
            f.write(f"file '{os.path.abspath(fp)}'\n")
        concat_path = f.name

    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path,
         "-c", "copy", output_path],
        capture_output=True, check=True,
    )
    os.unlink(concat_path)

    merged_duration = _ffprobe_duration_ms(output_path)
    print(f"  Merged: {output_path} ({merged_duration / 1000:.1f}s)")

    # 5. Delete chunk MP3s
    for fp in chunk_paths:
        if os.path.exists(fp):
            os.unlink(fp)

    return output_path, merged_duration


def generate_chapter(
    segments: list[dict],
    output_dir: str,
    chapter_number: int,
    voice: str = "Algieba",
    max_workers: int = DEFAULT_WORKERS,
    stt_provider: str | None = None,
) -> dict:
    """
    Generate audio for a full chapter.

    Chunks are processed in parallel — each worker runs TTS then immediately
    STT+alignment for its chunk.

    Args:
        segments: All segments for the chapter (ordered by sequence)
        output_dir: Directory to write MP3 files and manifest
        chapter_number: Chapter number (for file naming)
        voice: Chirp3 HD voice name
        max_workers: Max parallel workers (default: 10)
        stt_provider: STT provider override ("deepgram" or "google")

    Returns:
        Manifest dict with chunk info and word timestamps
    """
    os.makedirs(output_dir, exist_ok=True)
    chapter_str = f"{chapter_number:02d}"

    chunks = chunk_segments(segments)
    total = len(chunks)
    workers = min(max_workers, total)

    print(f"  {total} chunks, {workers} workers")

    # Process chunks in parallel
    results = [None] * total
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {}
        for i, chunk_segs in enumerate(chunks):
            fut = pool.submit(
                _process_chunk,
                i, chunk_segs, total,
                output_dir, chapter_str, voice, stt_provider,
            )
            futures[fut] = i

        for fut in as_completed(futures):
            idx = futures[fut]
            try:
                results[idx] = fut.result()
            except Exception as e:
                print(f"  [chunk {idx + 1}] ERROR: {e}", file=sys.stderr)
                raise

    # Build manifest in chunk order
    manifest = {
        "chapter": chapter_number,
        "voice": voice,
        "chunks": [],
    }
    for r in results:
        entry = dict(r)
        del entry["chunk_idx"]
        manifest["chunks"].append(entry)

    # Merge chunks into single MP3, offset timestamps, clean up
    output_path, merged_duration = merge_chunks(manifest, output_dir)
    manifest["merged_file"] = output_path
    manifest["merged_duration_ms"] = merged_duration

    return manifest


def main():
    parser = argparse.ArgumentParser(
        description="Generate audio for a full chapter"
    )
    parser.add_argument(
        "--segments",
        required=True,
        help="Path to JSON file with segment array",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory for output MP3 files and manifest",
    )
    parser.add_argument(
        "--chapter",
        type=int,
        required=True,
        help="Chapter number (used for file naming)",
    )
    parser.add_argument(
        "--voice",
        default="Algieba",
        help="Chirp3 HD voice name (default: Algieba)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Max parallel workers (default: {DEFAULT_WORKERS})",
    )
    parser.add_argument(
        "--stt-provider",
        choices=["deepgram", "google"],
        default=None,
        help="STT provider (default: from env or deepgram)",
    )
    args = parser.parse_args()

    with open(args.segments, "r") as f:
        segments = json.load(f)

    print(f"Generating audio for chapter {args.chapter}: "
          f"{len(segments)} segments, voice={args.voice}")

    manifest = generate_chapter(
        segments, args.output_dir, args.chapter,
        voice=args.voice, max_workers=args.workers,
        stt_provider=args.stt_provider,
    )

    print(f"\nDone! {len(manifest['chunks'])} chunks, "
          f"{manifest['merged_duration_ms'] / 1000:.1f}s merged audio")


if __name__ == "__main__":
    main()
