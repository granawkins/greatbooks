import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ id: null, email: null, playback_speed: 1 });
  }

  // Ensure user exists in DB
  db.upsertUser(userId);
  const user = db.getUser(userId);

  return NextResponse.json({
    id: user?.id ?? userId,
    email: user?.email ?? null,
    playback_speed: user?.playback_speed ?? 1,
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
