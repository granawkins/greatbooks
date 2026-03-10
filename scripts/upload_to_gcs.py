#!/usr/bin/env python3
"""Upload covers and audio to Google Cloud Storage.

Usage:
    .venv/bin/python scripts/upload_to_gcs.py              # upload all
    .venv/bin/python scripts/upload_to_gcs.py --covers     # covers only
    .venv/bin/python scripts/upload_to_gcs.py --audio      # audio only
    .venv/bin/python scripts/upload_to_gcs.py --force      # re-upload even if exists

Requires: google-cloud-storage
Credentials: uses GOOGLE_APPLICATION_CREDENTIALS env var (or google-credentials.json).
"""

import argparse
import os
import sys
from pathlib import Path

from google.cloud import storage

BUCKET_NAME = "greatbooks-assets"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
COVERS_DIR = PROJECT_ROOT / "public" / "covers"
DATA_DIR = PROJECT_ROOT / "data"

# Set credentials if not already in env
if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    creds = PROJECT_ROOT / "google-credentials.json"
    if creds.exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds)


def upload_file(bucket, local_path: Path, gcs_path: str, content_type: str, force: bool) -> bool:
    """Upload a single file. Returns True if uploaded, False if skipped."""
    blob = bucket.blob(gcs_path)
    if not force and blob.exists():
        return False
    blob.upload_from_filename(str(local_path), content_type=content_type)
    return True


def upload_covers(bucket, force: bool):
    """Upload all cover images from public/covers/."""
    if not COVERS_DIR.exists():
        print("No covers directory found, skipping.")
        return

    files = sorted(COVERS_DIR.glob("*.*"))
    uploaded, skipped = 0, 0

    for f in files:
        ext = f.suffix.lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }.get(ext)
        if not content_type:
            continue

        gcs_path = f"covers/{f.name}"
        if upload_file(bucket, f, gcs_path, content_type, force):
            uploaded += 1
            print(f"  uploaded {gcs_path}")
        else:
            skipped += 1

    print(f"Covers: {uploaded} uploaded, {skipped} skipped (already exist)")


def upload_audio(bucket, force: bool):
    """Upload all audio MP3s from data/*/audio/."""
    uploaded, skipped = 0, 0

    for book_dir in sorted(DATA_DIR.iterdir()):
        audio_dir = book_dir / "audio"
        if not audio_dir.is_dir():
            continue

        mp3s = sorted(audio_dir.glob("*.mp3"))
        if not mp3s:
            continue

        book_id = book_dir.name
        for mp3 in mp3s:
            gcs_path = f"audio/{book_id}/{mp3.name}"
            if upload_file(bucket, mp3, gcs_path, "audio/mpeg", force):
                uploaded += 1
                print(f"  uploaded {gcs_path}")
            else:
                skipped += 1

    print(f"Audio: {uploaded} uploaded, {skipped} skipped (already exist)")


def main():
    parser = argparse.ArgumentParser(description="Upload assets to GCS")
    parser.add_argument("--covers", action="store_true", help="Upload covers only")
    parser.add_argument("--audio", action="store_true", help="Upload audio only")
    parser.add_argument("--force", action="store_true", help="Re-upload even if file exists")
    args = parser.parse_args()

    # Default: upload both
    do_covers = args.covers or not args.audio
    do_audio = args.audio or not args.covers

    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    if not bucket.exists():
        print(f"Bucket {BUCKET_NAME} does not exist. Create it first:")
        print(f"  gsutil mb -l us-central1 gs://{BUCKET_NAME}")
        sys.exit(1)

    if do_covers:
        print("Uploading covers...")
        upload_covers(bucket, args.force)

    if do_audio:
        print("Uploading audio...")
        upload_audio(bucket, args.force)

    print("Done.")


if __name__ == "__main__":
    main()
