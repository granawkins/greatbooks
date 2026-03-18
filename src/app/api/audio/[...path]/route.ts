import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { audioLimitMs } from "@/lib/tiers";

const storage = new Storage();
const bucket = storage.bucket("greatbooks-assets");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Auth check — only authenticated users can stream audio
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier-based audio limit check
  const tier = db.getUserTier(userId);
  const limit = audioLimitMs(tier);
  if (limit !== Infinity) {
    const used = db.getMonthlyAudioUsageMs(userId);
    if (used >= limit) {
      return NextResponse.json(
        { error: "audio_limit_reached", used, limit },
        { status: 403 }
      );
    }
  }

  const { path: segments } = await params;
  const filePath = segments.join("/");

  // Only serve .mp3 files
  if (!filePath.endsWith(".mp3")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Map URL path to GCS path
  // URL: /api/audio/homer-iliad/audio/01.mp3 → segments: ["homer-iliad", "audio", "01.mp3"]
  // GCS: audio/homer-iliad/01.mp3
  const bookId = segments[0];
  const audioFile = segments.slice(2).join("/");
  const gcsPath = `audio/${bookId}/${audioFile}`;

  try {
    const file = bucket.file(gcsPath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate a signed URL valid for 1 hour, redirect client to fetch directly from GCS
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
