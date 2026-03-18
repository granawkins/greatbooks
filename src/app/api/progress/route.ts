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
  const { bookId, chapterNumber, audioPositionMs, mode, durationMs } = body;

  if (!bookId || chapterNumber == null) {
    return NextResponse.json(
      { error: "bookId and chapterNumber required" },
      { status: 400 }
    );
  }

  db.upsertUser(userId);
  db.upsertProgress(userId, bookId, chapterNumber, audioPositionMs ?? 0);

  // For course reference chapters, also sync progress to the source book
  const source = db.getSourceBookInfo(bookId, chapterNumber);
  if (source) {
    db.upsertProgress(userId, source.bookId, source.chapterNumber, audioPositionMs ?? 0);
  }

  // Track usage session
  if (mode && durationMs > 0) {
    db.extendOrCreateSession(userId, bookId, chapterNumber, mode, durationMs);
  }

  return NextResponse.json({ ok: true });
}
