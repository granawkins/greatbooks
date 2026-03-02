#!/usr/bin/env python3
"""
Generate TTS audio using Google Chirp3 HD.

Usage:
    python tts.py --text "Text to speak" --output output.mp3
    python tts.py --file input.txt --output output.mp3
    python tts.py --text "Hello" --output out.mp3 --voice Orus

Requires:
    - google-cloud-texttospeech
    - python-dotenv
    - GOOGLE_APPLICATION_CREDENTIALS in .env (path to service account JSON)
"""

import argparse
import os
import struct
import sys
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parents[3]
load_dotenv(_project_root / ".env")

from google.cloud import texttospeech_v1beta1 as texttospeech

# Max input characters for Chirp3 HD
MAX_INPUT_CHARS = 2000

# Lazy-loaded client
_client = None


def _get_client():
    global _client
    if _client is None:
        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        if creds_path:
            _client = texttospeech.TextToSpeechClient.from_service_account_json(
                creds_path
            )
        else:
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            _client = texttospeech.TextToSpeechClient(
                client_options={"api_key": api_key}
            )
    return _client


def _mp3_duration_ms(path: str) -> int:
    """Calculate MP3 duration in milliseconds by parsing frame headers."""
    with open(path, "rb") as f:
        data = f.read()

    offset = 0
    # Skip ID3v2 tag if present
    if data[:3] == b"ID3":
        size_bytes = data[6:10]
        tag_size = (
            (size_bytes[0] << 21)
            | (size_bytes[1] << 14)
            | (size_bytes[2] << 7)
            | size_bytes[3]
        )
        offset = 10 + tag_size

    bitrate_table = {
        (1, 1): [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
        (1, 2): [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
        (1, 3): [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        (2, 1): [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
        (2, 2): [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
        (2, 3): [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    }
    samplerate_table = {
        1: [44100, 48000, 32000],
        2: [22050, 24000, 16000],
        2.5: [11025, 12000, 8000],
    }
    samples_per_frame = {1: 1152, 2: 1152, 3: 576}

    total_samples = 0
    sample_rate = 0

    while offset < len(data) - 4:
        # Find sync word
        if data[offset] != 0xFF or (data[offset + 1] & 0xE0) != 0xE0:
            offset += 1
            continue

        header = struct.unpack(">I", data[offset : offset + 4])[0]
        version_bits = (header >> 19) & 3
        layer_bits = (header >> 17) & 3
        bitrate_idx = (header >> 12) & 0xF
        sr_idx = (header >> 10) & 3
        padding = (header >> 9) & 1

        if version_bits == 1 or layer_bits == 0 or bitrate_idx == 0 or bitrate_idx == 15 or sr_idx == 3:
            offset += 1
            continue

        version = {3: 1, 2: 2, 0: 2.5}.get(version_bits)
        layer = {3: 1, 2: 2, 1: 3}.get(layer_bits)
        if version is None or layer is None:
            offset += 1
            continue

        br_key = (1 if version == 1 else 2, layer)
        if br_key not in bitrate_table:
            offset += 1
            continue

        bitrate = bitrate_table[br_key][bitrate_idx] * 1000
        sample_rate = samplerate_table[version][sr_idx]
        spf = samples_per_frame[layer]

        if layer == 1:
            frame_size = (12 * bitrate // sample_rate + padding) * 4
        else:
            frame_size = 144 * bitrate // sample_rate + padding

        if frame_size <= 0:
            offset += 1
            continue

        total_samples += spf
        offset += frame_size

    if sample_rate == 0:
        return 0
    return int(total_samples / sample_rate * 1000)


def generate(text: str, output_path: str, voice: str = "Charon") -> dict:
    """
    Generate TTS audio for the given text.

    Args:
        text: Text to synthesize (max 2000 chars)
        output_path: Where to save the MP3 file
        voice: Chirp3 HD voice name (e.g. Charon, Orus, Kore)

    Returns:
        {"file_path": str, "duration_ms": int}
    """
    if len(text) > MAX_INPUT_CHARS:
        raise ValueError(
            f"Text too long ({len(text)} chars). Max is {MAX_INPUT_CHARS}."
        )

    client = _get_client()

    voice_name = voice[0].upper() + voice[1:].lower()

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name=f"en-US-Chirp3-HD-{voice_name}",
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
        ),
    )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(response.audio_content)

    duration_ms = _mp3_duration_ms(output_path)

    return {"file_path": output_path, "duration_ms": duration_ms}


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio via Google Chirp3 HD")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="Text to synthesize")
    group.add_argument("--file", help="File containing text to synthesize")
    parser.add_argument("--output", required=True, help="Output MP3 path")
    parser.add_argument("--voice", default="Charon", help="Voice name (default: Charon)")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r") as f:
            text = f.read()
    else:
        text = args.text

    result = generate(text, args.output, voice=args.voice)
    print(f"Saved {result['file_path']} ({result['duration_ms']}ms)")


if __name__ == "__main__":
    main()
