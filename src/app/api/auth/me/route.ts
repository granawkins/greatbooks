import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export async function GET() {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({
      id: null, email: null, playback_speed: 1,
      tier: "anonymous", audioUsedMs: 0, audioLimitMs: 0,
      creditsUsed: 0, creditsLimit: 0, tierExpiresAt: null,
      isAdmin: false,
    });
  }

  // Ensure user exists in DB
  db.upsertUser(userId);
  const user = db.getUser(userId);
  const tierInfo = db.getUserTierInfo(userId);
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? "");

  return NextResponse.json({
    id: user?.id ?? userId,
    email: user?.email ?? null,
    playback_speed: user?.playback_speed ?? 1,
    ...tierInfo,
    // JSON doesn't support Infinity — use -1 as sentinel for "unlimited"
    audioLimitMs: tierInfo.audioLimitMs === Infinity ? -1 : tierInfo.audioLimitMs,
    creditsLimit: tierInfo.creditsLimit === Infinity ? -1 : tierInfo.creditsLimit,
    isAdmin,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  if (typeof body.playback_speed === "number") {
    const speed = Math.max(0.5, Math.min(3, body.playback_speed));
    db.updatePlaybackSpeed(userId, speed);
  }

  const user = db.getUser(userId);
  return NextResponse.json({
    id: user?.id ?? userId,
    email: user?.email ?? null,
    playback_speed: user?.playback_speed ?? 1,
  });
}
