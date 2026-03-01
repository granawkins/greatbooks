#!/usr/bin/env python3
"""
Align word-level timestamps to segments using Google STT.

Takes a generated audio file and the original segment texts,
runs speech-to-text to get word timestamps, then aligns them
back to the source segments.

Usage:
    python align_timestamps.py \
      --audio chunk.mp3 \
      --segments '[{"id": 1, "text": "Rage Goddess..."}]' \
      --output timestamps.json

Requires:
    - Google Cloud credentials configured
    - google-cloud-speech package
"""

import argparse
import json
import sys


def align_words(audio_path: str, segments: list[dict]) -> list[dict]:
    """
    Run STT on the audio and align word timestamps to segments.

    Args:
        audio_path: path to the audio file
        segments: list of {"id": int, "text": str}

    Returns:
        list of {"segment_id": int, "words": [{"text": str, "start_ms": int, "end_ms": int}]}
    """
    # TODO: Implement Google STT + alignment
    #
    # Steps:
    # 1. Run Google Speech-to-Text on the audio with word-level timestamps
    # 2. Get back a list of words with start/end times
    # 3. Match STT words to source segment words using sequence alignment
    #    (STT may mishear words, so use fuzzy matching)
    # 4. Return timestamps mapped to segment IDs
    #
    # from google.cloud import speech
    #
    # client = speech.SpeechClient()
    # with open(audio_path, "rb") as f:
    #     audio = speech.RecognitionAudio(content=f.read())
    # config = speech.RecognitionConfig(
    #     encoding=speech.RecognitionConfig.AudioEncoding.MP3,
    #     sample_rate_hertz=24000,
    #     language_code="en-US",
    #     enable_word_time_offsets=True,
    # )
    # response = client.recognize(config=config, audio=audio)

    raise NotImplementedError("Timestamp alignment not yet implemented")


def main():
    parser = argparse.ArgumentParser(description="Align word timestamps")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--segments", required=True, help="JSON array of segments")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    segments = json.loads(args.segments)
    result = align_words(args.audio, segments)

    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote timestamps to {args.output}")


if __name__ == "__main__":
    main()
