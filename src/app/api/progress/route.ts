import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json([]);
  }
  const progress = db.getProgress(userId);
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { bookId, chapterNumber, audioPositionMs } = body;

  if (!bookId || chapterNumber == null) {
    return NextResponse.json(
      { error: "bookId and chapterNumber required" },
      { status: 400 }
    );
  }

  db.upsertUser(userId);
  db.upsertProgress(userId, bookId, chapterNumber, audioPositionMs ?? 0);

  return NextResponse.json({ ok: true });
}
