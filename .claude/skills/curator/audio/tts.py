#!/usr/bin/env python3
"""
Generate TTS audio using Google Chirp3 HD or ElevenLabs.

Usage:
    python tts.py --text "Text to speak" --output output.mp3
    python tts.py --file input.txt --output output.mp3 --voice Orus
    python tts.py --text "Hello" --output out.mp3 --provider elevenlabs --voice "Frederick Surrey"
    python tts.py --text "Hello" --output out.mp3 --provider elevenlabs --model eleven_multilingual_v2

Requires:
    - google-cloud-texttospeech (for Google provider)
    - elevenlabs (for ElevenLabs provider)
    - python-dotenv
    - GOOGLE_APPLICATION_CREDENTIALS in .env (for Google)
    - ELEVENLABS_API_KEY in .env (for ElevenLabs)
"""

import argparse
import os
import struct
import sys
import threading
import time
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parents[3]
load_dotenv(_project_root / ".env")

# Provider-specific imports are lazy-loaded in their respective functions

# Max input characters per call
MAX_INPUT_CHARS = 2000  # Google Chirp3 HD limit
ELEVENLABS_MAX_CHARS = 5000  # ElevenLabs limit is higher

# ElevenLabs voice name -> voice ID mapping
ELEVENLABS_VOICES = {
    "Frederick Surrey": "j9jfwdrw7BRfcR43Qohk",
}

ELEVENLABS_DEFAULT_MODEL = "eleven_v3"
ELEVENLABS_DEFAULT_VOICE = "Frederick Surrey"

# Lazy-loaded clients (thread-safe init)
_google_client = None
_elevenlabs_client = None
_client_lock = threading.Lock()


def _get_google_client():
    global _google_client
    if _google_client is None:
        with _client_lock:
            if _google_client is None:
                from google.cloud import texttospeech
                # Use default client — respects GOOGLE_APPLICATION_CREDENTIALS env var
                # via ADC (Application Default Credentials), which correctly handles
                # service account scopes. from_service_account_json() creates
                # scoped credentials that can fail for en-GB voices.
                _google_client = texttospeech.TextToSpeechClient()
    return _google_client


def _get_elevenlabs_client():
    global _elevenlabs_client
    if _elevenlabs_client is None:
        with _client_lock:
            if _elevenlabs_client is None:
                from elevenlabs import ElevenLabs
                api_key = os.environ.get("ELEVENLABS_API_KEY", "")
                if not api_key:
                    raise ValueError("ELEVENLABS_API_KEY not set in .env")
                _elevenlabs_client = ElevenLabs(api_key=api_key)
    return _elevenlabs_client


def _resolve_elevenlabs_voice(voice: str) -> str:
    """Resolve a voice name to an ElevenLabs voice ID."""
    # If it looks like a voice ID already, return as-is
    if len(voice) == 20 and voice.isalnum():
        return voice
    # Look up by name (case-insensitive)
    for name, vid in ELEVENLABS_VOICES.items():
        if name.lower() == voice.lower():
            return vid
    # Fallback: treat as voice ID
    return voice


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


def _log_cost(provider: str, model: str, voice: str, text_len: int,
              duration_ms: int, output_path: str):
    """Log TTS cost. Silently ignores logging failures."""
    try:
        sys.path.insert(0, str(_project_root))
        from logs.cost_log import log_cost
        log_cost(
            api="tts",
            provider=provider,
            model=model,
            input_units=text_len,
            input_unit_type="chars",
            entity_type="book",
            entity_id=os.environ.get("GREATBOOKS_ENTITY_ID"),
            meta={"voice": voice, "duration_ms": duration_ms, "output": output_path},
        )
    except Exception:
        pass


def _split_long_sentences(text: str, max_sentence_chars: int = 300) -> str:
    """Break long sentences by inserting periods at natural punctuation.

    Google Chirp3 HD rejects individual sentences over ~400 chars.
    This finds sentences that exceed the limit and breaks them at
    semicolons, colons, or commas, adding a period to force a sentence break.
    """
    import re
    # Split into sentences (preserving the delimiter)
    parts = re.split(r'(?<=[.!?"""])\s+', text)
    result = []
    for part in parts:
        if len(part) <= max_sentence_chars:
            result.append(part)
            continue
        # Try splitting at semicolons first, then colons, then commas
        broken = [part]
        for delim_pattern in [r';\s+', r':\s+', r',\s+']:
            new_broken = []
            for piece in broken:
                if len(piece) <= max_sentence_chars:
                    new_broken.append(piece)
                else:
                    sub = re.split(delim_pattern, piece)
                    # Rejoin into groups that fit under the limit
                    acc = sub[0]
                    for s in sub[1:]:
                        # Figure out what delimiter was between them
                        test = acc + " " + s
                        if len(test) <= max_sentence_chars:
                            acc = test
                        else:
                            # End the accumulator as a sentence
                            if not acc.rstrip().endswith(('.', '!', '?', '"', '"')):
                                acc = acc.rstrip().rstrip(',;:') + '.'
                            new_broken.append(acc)
                            acc = s
                    new_broken.append(acc)
            broken = new_broken
        result.extend(broken)
    return " ".join(result)


def _generate_google(text: str, output_path: str, voice: str = "Algieba") -> dict:
    """Generate TTS via Google Chirp3 HD."""
    from google.cloud import texttospeech

    if len(text) > MAX_INPUT_CHARS:
        raise ValueError(
            f"Text too long ({len(text)} chars). Max is {MAX_INPUT_CHARS}."
        )

    # Split long sentences to avoid Chirp3's sentence-length limit
    text = _split_long_sentences(text)

    client = _get_google_client()

    # Support full voice names like "en-GB-Chirp3-HD-Despina" or short names like "Algieba"
    if voice.startswith("en-"):
        # Full voice name provided — extract language code and use as-is
        parts = voice.split("-")
        lang_code = "-".join(parts[:2])  # e.g. "en-GB"
        full_voice_name = voice
    else:
        # Short name — default to en-US Chirp3-HD
        lang_code = "en-US"
        voice_name = voice[0].upper() + voice[1:].lower()
        full_voice_name = f"en-US-Chirp3-HD-{voice_name}"

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=text),
                voice=texttospeech.VoiceSelectionParams(
                    language_code=lang_code,
                    name=full_voice_name,
                ),
                audio_config=texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3,
                ),
            )
            break
        except Exception as e:
            if attempt < max_retries - 1 and ("503" in str(e) or "UNAVAILABLE" in str(e) or "too long" in str(e).lower()):
                wait = 2 ** (attempt + 1)
                print(f"    TTS retry {attempt + 1}/{max_retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(response.audio_content)

    duration_ms = _mp3_duration_ms(output_path)
    _log_cost("google", "chirp3-hd", voice, len(text), duration_ms, output_path)
    return {"file_path": output_path, "duration_ms": duration_ms}


def _generate_elevenlabs(text: str, output_path: str,
                         voice: str = ELEVENLABS_DEFAULT_VOICE,
                         model: str = ELEVENLABS_DEFAULT_MODEL) -> dict:
    """Generate TTS via ElevenLabs."""
    max_chars = ELEVENLABS_MAX_CHARS
    if len(text) > max_chars:
        raise ValueError(
            f"Text too long ({len(text)} chars). Max is {max_chars} for ElevenLabs."
        )

    client = _get_elevenlabs_client()
    voice_id = _resolve_elevenlabs_voice(voice)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            audio_iter = client.text_to_speech.convert(
                voice_id=voice_id,
                model_id=model,
                text=text,
            )
            audio_bytes = b"".join(audio_iter)
            break
        except Exception as e:
            if attempt < max_retries - 1 and ("503" in str(e) or "429" in str(e) or "rate" in str(e).lower()):
                wait = 2 ** (attempt + 1)
                print(f"    ElevenLabs TTS retry {attempt + 1}/{max_retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    duration_ms = _mp3_duration_ms(output_path)
    _log_cost("elevenlabs", model, voice, len(text), duration_ms, output_path)
    return {"file_path": output_path, "duration_ms": duration_ms}


def generate(text: str, output_path: str, voice: str = "Algieba",
             provider: str = "google", model: str | None = None) -> dict:
    """
    Generate TTS audio for the given text.

    Args:
        text: Text to synthesize
        output_path: Where to save the MP3 file
        voice: Voice name or ID
        provider: "google" or "elevenlabs"
        model: ElevenLabs model ID (ignored for Google). Default: eleven_v3

    Returns:
        {"file_path": str, "duration_ms": int}
    """
    if provider == "elevenlabs":
        return _generate_elevenlabs(
            text, output_path, voice=voice,
            model=model or ELEVENLABS_DEFAULT_MODEL,
        )
    else:
        return _generate_google(text, output_path, voice=voice)


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio via Google Chirp3 HD or ElevenLabs")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="Text to synthesize")
    group.add_argument("--file", help="File containing text to synthesize")
    parser.add_argument("--output", required=True, help="Output MP3 path")
    parser.add_argument("--voice", default=None, help="Voice name (default: Algieba for Google, Frederick Surrey for ElevenLabs)")
    parser.add_argument("--provider", default="google", choices=["google", "elevenlabs"],
                        help="TTS provider (default: google)")
    parser.add_argument("--model", default=None,
                        help="ElevenLabs model ID (default: eleven_v3). Ignored for Google.")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r") as f:
            text = f.read()
    else:
        text = args.text

    voice = args.voice
    if voice is None:
        voice = ELEVENLABS_DEFAULT_VOICE if args.provider == "elevenlabs" else "Algieba"

    result = generate(text, args.output, voice=voice, provider=args.provider, model=args.model)
    print(f"Saved {result['file_path']} ({result['duration_ms']}ms)")


if __name__ == "__main__":
    main()
