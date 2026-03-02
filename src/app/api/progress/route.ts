import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const progress = db.getProgress(userId);
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, bookId, chapterNumber, audioPositionMs, textPositionSegment } = body;

  if (!userId || !bookId || chapterNumber == null) {
    return NextResponse.json(
      { error: "userId, bookId, and chapterNumber required" },
      { status: 400 }
    );
  }

  db.upsertUser(userId);
  db.upsertProgress(
    userId,
    bookId,
    chapterNumber,
    audioPositionMs ?? 0,
    textPositionSegment ?? 0
  );

  return NextResponse.json({ ok: true });
}
