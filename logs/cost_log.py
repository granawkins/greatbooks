"""
Lightweight API cost logger. Appends one JSON line per call to logs/api_costs.jsonl.

Usage:
    from logs.cost_log import log_cost

    log_cost(
        api="tts",
        provider="google",
        model="chirp3-hd",
        input_units=1500,       # chars for TTS, seconds for STT, tokens for LLM
        input_unit_type="chars",
        cost_usd=0.024,
        entity_type="book",     # "book" or "user"
        entity_id="iliad",
        meta={"chapter": 1, "chunk": 1, "voice": "Charon"},
    )

Pricing reference (as of 2025):
    Google TTS Chirp3 HD:  $16 / 1M chars  ($0.000016/char)
    Google STT (Chirp 2):  $0.016 / min     (short audio, <60s)
    Deepgram Nova-3:       $0.0077 / min     (PAYG pre-recorded)
    ElevenLabs v3:         $0.30 / 1K chars  ($0.0003/char) — varies by plan tier
    ElevenLabs v2:         $0.18 / 1K chars  ($0.00018/char) — varies by plan tier
    Claude Sonnet:         $3 / 1M input tokens, $15 / 1M output tokens
    Claude Haiku:          $0.25 / 1M input tokens, $1.25 / 1M output tokens
    Google Nano Banana:    $0.039 / image  (gemini-2.5-flash-image)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

LOGS_DIR = Path(__file__).resolve().parent
COST_FILE = LOGS_DIR / "api_costs.jsonl"

# ── Pricing tables (USD per unit) ────────────────────────────────────────────

PRICING = {
    ("tts", "google", "chirp3-hd"): {"unit": "chars", "rate": 16.0 / 1_000_000},
    ("tts", "elevenlabs", "eleven_v3"): {"unit": "chars", "rate": 0.30 / 1_000},
    ("tts", "elevenlabs", "eleven_multilingual_v2"): {"unit": "chars", "rate": 0.18 / 1_000},
    ("tts", "elevenlabs", "eleven_flash_v2_5"): {"unit": "chars", "rate": 0.08 / 1_000},
    ("stt", "google", "chirp2"): {"unit": "seconds", "rate": 0.016 / 60},
    ("stt", "deepgram", "nova-3"): {"unit": "seconds", "rate": 0.0077 / 60},
    ("image", "google", "gemini-2.5-flash-image"): {"unit": "images", "rate": 0.039},  # Nano Banana
}


def estimate_cost(api: str, provider: str, model: str, input_units: float) -> float | None:
    """Look up cost from pricing table. Returns None if not found."""
    key = (api.lower(), provider.lower(), model.lower())
    entry = PRICING.get(key)
    if entry is None:
        return None
    return round(input_units * entry["rate"], 6)


def log_cost(
    api: str,
    provider: str,
    model: str,
    input_units: float,
    input_unit_type: str,
    cost_usd: float | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    meta: dict | None = None,
) -> dict:
    """
    Append one cost record to the JSONL log.

    If cost_usd is None, attempts to estimate from built-in pricing table.

    Returns the logged record dict.
    """
    if cost_usd is None:
        cost_usd = estimate_cost(api, provider, model, input_units)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "api": api,
        "provider": provider,
        "model": model,
        "input_units": input_units,
        "input_unit_type": input_unit_type,
        "cost_usd": cost_usd,
        "entity_type": entity_type,
        "entity_id": entity_id,
    }
    if meta:
        record["meta"] = meta

    os.makedirs(LOGS_DIR, exist_ok=True)
    with open(COST_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    return record


def read_costs(entity_type: str = None, entity_id: str = None, api: str = None) -> list[dict]:
    """Read and optionally filter cost records."""
    if not COST_FILE.exists():
        return []

    records = []
    with open(COST_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if entity_type and r.get("entity_type") != entity_type:
                continue
            if entity_id and r.get("entity_id") != entity_id:
                continue
            if api and r.get("api") != api:
                continue
            records.append(r)
    return records


def summarize(records: list[dict] = None, **filters) -> dict:
    """Summarize total costs, grouped by api type."""
    if records is None:
        records = read_costs(**filters)

    by_api = {}
    total = 0.0
    for r in records:
        api = r["api"]
        cost = r.get("cost_usd") or 0.0
        by_api[api] = by_api.get(api, 0.0) + cost
        total += cost

    return {"total_usd": round(total, 4), "by_api": {k: round(v, 4) for k, v in by_api.items()}, "count": len(records)}
