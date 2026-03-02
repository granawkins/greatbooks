#!/usr/bin/env python3
"""
Speech-to-text transcription + word alignment.

Supports two providers:
  - deepgram (default): Deepgram Nova-3, ~10ms precision, $0.0043/min
  - google: Google STT latest_long, ~100ms precision, $0.016/min

Usage:
    # Transcribe only (raw STT words)
    python stt.py --audio chunk.mp3
    python stt.py --audio chunk.mp3 --provider google

    # Transcribe and align to source segments
    python stt.py --audio chunk.mp3 --segments '[{"id": 1, "text": "Hello world"}]' --output timestamps.json

Requires:
    - httpx, python-dotenv
    - DEEPGRAM_API_KEY in .env (for deepgram provider)
    - google-cloud-speech + GOOGLE_APPLICATION_CREDENTIALS in .env (for google provider)
"""

import argparse
import json
import os
import re
import sys
import threading
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parents[3]
load_dotenv(_project_root / ".env")

DEFAULT_PROVIDER = os.environ.get("STT_PROVIDER", "deepgram")


# ── Provider: Deepgram ─────────────────────────────────────────────────────

def _transcribe_deepgram(audio_path: str) -> list[dict]:
    """Transcribe via Deepgram Nova-3. Returns [{"word", "start", "end"}] (seconds)."""
    import httpx

    api_key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPGRAM_API_KEY not set in environment")

    with open(audio_path, "rb") as f:
        audio_data = f.read()

    response = httpx.post(
        "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=false&punctuate=true",
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "audio/mp3",
        },
        content=audio_data,
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json()

    words = []
    for w in data["results"]["channels"][0]["alternatives"][0]["words"]:
        words.append({
            "word": w["word"],
            "start": float(w["start"]),
            "end": float(w["end"]),
        })

    # Log cost
    _log_cost(words, audio_path, provider="deepgram", model="nova-3", cost_per_min=0.0043)
    return words


# ── Provider: Google ───────────────────────────────────────────────────────

# Lazy-loaded client (thread-safe init)
_google_client = None
_google_lock = threading.Lock()


def _get_google_client():
    global _google_client
    if _google_client is None:
        with _google_lock:
            if _google_client is None:
                from google.cloud import speech
                creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
                if creds_path:
                    _google_client = speech.SpeechClient.from_service_account_json(creds_path)
                else:
                    api_key = os.environ.get("GOOGLE_API_KEY", "")
                    _google_client = speech.SpeechClient(client_options={"api_key": api_key})
    return _google_client


def _parse_duration(duration) -> float:
    """Parse Google's Duration proto to seconds."""
    if duration is None:
        return 0.0
    seconds = duration.seconds if hasattr(duration, "seconds") else 0
    nanos = duration.nanos if hasattr(duration, "nanos") else 0
    return float(seconds) + nanos / 1e9


def _transcribe_google(audio_path: str) -> list[dict]:
    """Transcribe via Google STT. Returns [{"word", "start", "end"}] (seconds)."""
    from google.cloud import speech

    client = _get_google_client()

    with open(audio_path, "rb") as f:
        audio_content = f.read()

    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.MP3,
        sample_rate_hertz=24000,
        language_code="en-US",
        enable_word_time_offsets=True,
        model="latest_long",
    )

    response = client.recognize(config=config, audio=audio)

    words = []
    for result in response.results:
        for word_info in result.alternatives[0].words:
            words.append({
                "word": word_info.word,
                "start": _parse_duration(word_info.start_time),
                "end": _parse_duration(word_info.end_time),
            })

    # Log cost
    _log_cost(words, audio_path, provider="google", model="chirp2", cost_per_min=0.016)
    return words


# ── Shared cost logging ────────────────────────────────────────────────────

def _log_cost(words, audio_path, provider, model, cost_per_min):
    try:
        audio_duration_s = words[-1]["end"] if words else 0.0
        sys.path.insert(0, str(_project_root))
        from logs.cost_log import log_cost
        log_cost(
            api="stt",
            provider=provider,
            model=model,
            input_units=round(audio_duration_s, 1),
            input_unit_type="seconds",
            entity_type="book",
            entity_id=os.environ.get("GREATBOOKS_ENTITY_ID"),
            meta={"audio_path": audio_path},
        )
    except Exception:
        pass


# ── Public API ─────────────────────────────────────────────────────────────

def transcribe(audio_path: str, provider: str | None = None) -> list[dict]:
    """
    Transcribe an audio file and return word-level timestamps.

    Args:
        audio_path: Path to an MP3 file
        provider: "deepgram" or "google" (default from STT_PROVIDER env or "deepgram")

    Returns:
        List of {"word": str, "start": float, "end": float} (times in seconds)
    """
    p = provider or DEFAULT_PROVIDER
    if p == "deepgram":
        return _transcribe_deepgram(audio_path)
    elif p == "google":
        return _transcribe_google(audio_path)
    else:
        raise ValueError(f"Unknown STT provider: {p}")


# ── Needleman-Wunsch word alignment ─────────────────────────────────────────


def _normalize(word: str) -> str:
    """Lowercase and strip non-word characters."""
    return re.sub(r"[^\w]", "", word.lower())


def _tokenize(text: str) -> list[str]:
    """Split on whitespace and -- dashes."""
    return [t for t in re.split(r"\s+|--", text) if t]


def _edit_distance(a: str, b: str) -> int:
    """Levenshtein edit distance (single-row optimization)."""
    if a == b:
        return 0
    if len(a) == 0:
        return len(b)
    if len(b) == 0:
        return len(a)

    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        curr = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev = curr

    return prev[len(b)]


# Scoring constants
_MATCH = 3
_FUZZY = 1
_MISMATCH = -1
_GAP = -1


def _score(orig_norm: str, stt_norm: str) -> int:
    """Score aligning an original token with an STT word."""
    if orig_norm == stt_norm:
        return _MATCH
    if len(orig_norm) == 0 or len(stt_norm) == 0:
        return _MISMATCH
    max_len = max(len(orig_norm), len(stt_norm))
    dist = _edit_distance(orig_norm, stt_norm)
    if dist <= max(1, -(-max_len * 3 // 10)):  # ceil(max_len * 0.3)
        return _FUZZY
    return _MISMATCH


def _compute_char_indices(tokens: list[str], text: str) -> list[tuple[int, int]]:
    """
    Find (char_start, char_end) for each token within segment text.

    Searches sequentially so duplicate words resolve correctly.
    """
    indices = []
    search_from = 0
    for token in tokens:
        pos = text.find(token, search_from)
        if pos == -1:
            # Fallback: token not found (shouldn't happen with _tokenize)
            indices.append((search_from, search_from + len(token)))
        else:
            indices.append((pos, pos + len(token)))
            search_from = pos + len(token)
    return indices


def align(stt_words: list[dict], segments: list[dict]) -> list[dict]:
    """
    Align STT word timestamps to original text segments using
    Needleman-Wunsch global sequence alignment.

    Args:
        stt_words: From transcribe(): [{"word", "start", "end"}]
        segments: [{"id": int, "text": str}]

    Returns:
        [{
            "segment_id": int,
            "audio_start_ms": int,
            "audio_end_ms": int,
            "words": [{"start_ms": int, "end_ms": int, "char_start": int, "char_end": int}]
        }]
    """
    # Build flat token list with segment mapping
    all_tokens = []
    token_seg_idx = []  # which segment index each token belongs to
    seg_token_lists = []  # tokens per segment, for char index computation
    for seg_i, seg in enumerate(segments):
        tokens = _tokenize(seg["text"])
        seg_token_lists.append(tokens)
        for t in tokens:
            all_tokens.append(t)
            token_seg_idx.append(seg_i)

    if not all_tokens or not stt_words:
        return [
            {"segment_id": seg["id"], "audio_start_ms": 0, "audio_end_ms": 0, "words": []}
            for seg in segments
        ]

    n = len(all_tokens)
    m = len(stt_words)

    orig_norms = [_normalize(t) for t in all_tokens]
    stt_norms = [_normalize(w["word"]) for w in stt_words]

    # ── Needleman-Wunsch DP ──────────────────────────────────────────────
    W = m + 1
    dp = [0] * ((n + 1) * W)

    for i in range(1, n + 1):
        dp[i * W] = i * _GAP
    for j in range(1, m + 1):
        dp[j] = j * _GAP

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = _score(orig_norms[i - 1], stt_norms[j - 1])
            dp[i * W + j] = max(
                dp[(i - 1) * W + (j - 1)] + s,
                dp[(i - 1) * W + j] + _GAP,
                dp[i * W + (j - 1)] + _GAP,
            )

    # ── Traceback ────────────────────────────────────────────────────────
    matches = []  # (token_idx, stt_idx)
    i, j = n, m

    while i > 0 and j > 0:
        s = _score(orig_norms[i - 1], stt_norms[j - 1])
        if dp[i * W + j] == dp[(i - 1) * W + (j - 1)] + s:
            if s > 0:
                matches.append((i - 1, j - 1))
            i -= 1
            j -= 1
        elif dp[i * W + j] == dp[(i - 1) * W + j] + _GAP:
            i -= 1
        else:
            j -= 1

    matches.reverse()

    # ── Build per-token timestamps with interpolation ────────────────────
    # Keep full float precision until final output
    match_map = {oi: si for oi, si in matches}
    total_duration = stt_words[-1]["end"] if stt_words else 0.0

    token_timestamps = []  # list of (start_s, end_s) per token (float seconds)
    prev_match_orig = -1
    prev_match_stt = -1
    next_ptr = 0

    for k in range(n):
        while next_ptr < len(matches) and matches[next_ptr][0] < k:
            next_ptr += 1

        stt_idx = match_map.get(k)
        if stt_idx is not None:
            token_timestamps.append((
                stt_words[stt_idx]["start"],
                stt_words[stt_idx]["end"],
            ))
            prev_match_orig = k
            prev_match_stt = stt_idx
        else:
            # Interpolate from neighbors
            prev_time = stt_words[prev_match_stt]["end"] if prev_match_stt >= 0 else 0.0
            prev_idx = prev_match_orig

            if next_ptr < len(matches):
                next_idx = matches[next_ptr][0]
                next_time = stt_words[matches[next_ptr][1]]["start"]
            else:
                next_idx = n
                next_time = total_duration

            span = next_idx - prev_idx
            pos = k - prev_idx
            tpt = (next_time - prev_time) / span if span > 0 else 0

            token_timestamps.append((
                max(0.0, prev_time + (pos - 0.5) * tpt),
                prev_time + (pos + 0.5) * tpt,
            ))

    # ── Group by segment with char indices ────────────────────────────────
    seg_char_indices = []
    for seg_i, seg in enumerate(segments):
        seg_char_indices.append(
            _compute_char_indices(seg_token_lists[seg_i], seg["text"])
        )

    result = []
    token_offset = 0
    for seg_i, seg in enumerate(segments):
        seg_tokens = seg_token_lists[seg_i]
        char_indices = seg_char_indices[seg_i]
        words = []
        for j, _token in enumerate(seg_tokens):
            k = token_offset + j
            start_s, end_s = token_timestamps[k]
            char_start, char_end = char_indices[j]
            words.append({
                "start_ms": round(start_s * 1000),
                "end_ms": round(end_s * 1000),
                "char_start": char_start,
                "char_end": char_end,
            })

        audio_start = words[0]["start_ms"] if words else 0
        audio_end = words[-1]["end_ms"] if words else 0
        result.append({
            "segment_id": seg["id"],
            "audio_start_ms": audio_start,
            "audio_end_ms": audio_end,
            "words": words,
        })
        token_offset += len(seg_tokens)

    return result


def transcribe_and_align(audio_path: str, segments: list[dict], provider: str | None = None) -> list[dict]:
    """
    Convenience: transcribe audio then align words to segments.

    Args:
        audio_path: Path to MP3 file
        segments: [{"id": int, "text": str}]
        provider: "deepgram" or "google" (default from env)

    Returns:
        [{
            "segment_id": int,
            "audio_start_ms": int,
            "audio_end_ms": int,
            "words": [{"start_ms": int, "end_ms": int, "char_start": int, "char_end": int}]
        }]
    """
    stt_words = transcribe(audio_path, provider=provider)
    return align(stt_words, segments)


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio and align word timestamps to segments"
    )
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument(
        "--segments",
        help="JSON array of segments: [{\"id\": int, \"text\": str}]. "
        "If omitted, outputs raw STT words only.",
    )
    parser.add_argument("--output", help="Output JSON path (default: stdout)")
    parser.add_argument(
        "--provider",
        choices=["deepgram", "google"],
        default=None,
        help=f"STT provider (default: {DEFAULT_PROVIDER})",
    )
    args = parser.parse_args()

    if args.segments:
        segments = json.loads(args.segments)
        result = transcribe_and_align(args.audio, segments, provider=args.provider)
    else:
        result = transcribe(args.audio, provider=args.provider)

    output_json = json.dumps(result, indent=2)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output_json)
        print(f"Wrote timestamps to {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
