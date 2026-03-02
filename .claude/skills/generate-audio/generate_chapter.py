#!/usr/bin/env python3
"""
Generate audio for a full chapter: chunk segments, run TTS + STT for each chunk.

Usage:
    python generate_chapter.py --segments segments.json --output-dir data/iliad/audio/ --chapter 1
    python generate_chapter.py --segments segments.json --output-dir out/ --chapter 1 --voice Orus

Input format (segments.json):
    [
      {"id": 1, "sequence": 1, "text": "Rage—Goddess...", "segment_type": "text", "group_number": 1},
      {"id": 2, "sequence": 2, "text": "That cost the...", "segment_type": "text", "group_number": 1},
      ...
    ]

Output:
    - MP3 files: <output-dir>/<chapter>-001.mp3, <chapter>-002.mp3, ...
    - Manifest JSON: <output-dir>/<chapter>-manifest.json

Requires:
    - google-cloud-texttospeech, google-cloud-speech, python-dotenv
    - GOOGLE_APPLICATION_CREDENTIALS in .env
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Allow importing sibling modules
sys.path.insert(0, str(Path(__file__).resolve().parent))

from tts import generate, MAX_INPUT_CHARS
from stt import transcribe_and_align


def chunk_segments(segments: list[dict], max_chars: int = None) -> list[list[dict]]:
    """
    Group segments into chunks suitable for TTS, breaking on paragraph
    and section boundaries. Never splits mid-paragraph.

    Each chunk is a list of segments whose combined text fits within max_chars.

    Args:
        segments: List of segment dicts with text, group_number, segment_type
        max_chars: Max characters per chunk (default: TTS limit * 0.9)

    Returns:
        List of chunks, where each chunk is a list of segment dicts
    """
    if max_chars is None:
        max_chars = int(MAX_INPUT_CHARS * 0.9)

    chunks = []
    current_chunk = []
    current_len = 0
    current_group = None

    for seg in segments:
        seg_text = seg.get("text", "")
        seg_type = seg.get("segment_type", "text")
        group = seg.get("group_number")

        # Section breaks and headings always start a new chunk
        is_boundary = seg_type in ("section_break", "heading")

        # New paragraph (different group_number)
        is_new_paragraph = group != current_group and current_group is not None

        # Would this segment push us over the limit?
        added_len = len(seg_text) + (2 if current_len > 0 else 0)  # \n\n separator
        would_overflow = current_len + added_len > max_chars

        # Start new chunk if: boundary, or overflow at a paragraph boundary
        if current_chunk and (is_boundary or (would_overflow and is_new_paragraph)):
            chunks.append(current_chunk)
            current_chunk = []
            current_len = 0

        # If a single segment overflows, it gets its own chunk
        if not current_chunk and len(seg_text) > max_chars:
            chunks.append([seg])
            current_group = group
            continue

        if seg_text:  # skip empty segments
            current_chunk.append(seg)
            current_len += added_len if current_len > 0 else len(seg_text)

        current_group = group

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def chunk_text(chunk: list[dict]) -> str:
    """Join segment texts in a chunk, separating paragraphs with blank lines."""
    parts = []
    prev_group = None
    for seg in chunk:
        group = seg.get("group_number")
        if prev_group is not None and group != prev_group:
            parts.append("")  # blank line between paragraphs
        parts.append(seg.get("text", ""))
        prev_group = group
    return "\n".join(parts)


def generate_chapter(
    segments: list[dict],
    output_dir: str,
    chapter_number: int,
    voice: str = "Charon",
) -> dict:
    """
    Generate audio for a full chapter.

    Args:
        segments: All segments for the chapter (ordered by sequence)
        output_dir: Directory to write MP3 files and manifest
        chapter_number: Chapter number (for file naming)
        voice: Chirp3 HD voice name

    Returns:
        Manifest dict with chunk info and word timestamps
    """
    os.makedirs(output_dir, exist_ok=True)
    chapter_str = f"{chapter_number:02d}"

    chunks = chunk_segments(segments)
    manifest = {"chapter": chapter_number, "voice": voice, "chunks": []}

    for i, chunk_segs in enumerate(chunks):
        chunk_num = i + 1
        chunk_str = f"{chunk_num:03d}"
        filename = f"{chapter_str}-{chunk_str}.mp3"
        filepath = os.path.join(output_dir, filename)

        text = chunk_text(chunk_segs)
        seg_ids = [s["id"] for s in chunk_segs]

        print(f"  Chunk {chunk_num}/{len(chunks)}: {len(text)} chars, "
              f"segments {seg_ids[0]}-{seg_ids[-1]}")

        # TTS
        tts_result = generate(text, filepath, voice=voice)
        print(f"    TTS: {tts_result['duration_ms']}ms")

        # STT + alignment
        align_segments = [{"id": s["id"], "text": s["text"]} for s in chunk_segs]
        timestamps = transcribe_and_align(filepath, align_segments)
        print(f"    STT: aligned {sum(len(t['words']) for t in timestamps)} words")

        manifest["chunks"].append(
            {
                "chunk_number": chunk_num,
                "file_path": f"data/{output_dir.split('data/')[-1]}/{filename}"
                if "data/" in output_dir
                else filename,
                "start_segment_id": seg_ids[0],
                "end_segment_id": seg_ids[-1],
                "duration_ms": tts_result["duration_ms"],
                "word_timestamps": timestamps,
            }
        )

    # Write manifest
    manifest_path = os.path.join(output_dir, f"{chapter_str}-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Manifest: {manifest_path}")

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
        default="Charon",
        help="Chirp3 HD voice name (default: Charon)",
    )
    args = parser.parse_args()

    with open(args.segments, "r") as f:
        segments = json.load(f)

    print(f"Generating audio for chapter {args.chapter}: "
          f"{len(segments)} segments, voice={args.voice}")

    manifest = generate_chapter(
        segments, args.output_dir, args.chapter, voice=args.voice
    )

    total_ms = sum(c["duration_ms"] for c in manifest["chunks"])
    print(f"\nDone! {len(manifest['chunks'])} chunks, "
          f"{total_ms / 1000:.1f}s total audio")


if __name__ == "__main__":
    main()
