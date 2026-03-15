import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json([]);
  }

  const { searchParams } = req.nextUrl;
  const bookId = searchParams.get("bookId");
  const chapterNum = searchParams.get("chapterNum");

  if (!bookId || !chapterNum) {
    return NextResponse.json({ error: "bookId and chapterNum required" }, { status: 400 });
  }

  const annotations = db.getAnnotations(userId, bookId, Number(chapterNum));
  return NextResponse.json(annotations);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const {
    bookId,
    chapterNumber,
    startSegmentSeq,
    startChar,
    endSegmentSeq,
    endChar,
    type,
    color,
    commentText,
  } = body;

  if (
    !bookId ||
    chapterNumber == null ||
    startSegmentSeq == null ||
    startChar == null ||
    endSegmentSeq == null ||
    endChar == null ||
    !type
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "highlight" && type !== "comment") {
    return NextResponse.json({ error: "type must be highlight or comment" }, { status: 400 });
  }

  db.upsertUser(userId);
  const annotation = db.insertAnnotation(
    userId,
    bookId,
    chapterNumber,
    startSegmentSeq,
    startChar,
    endSegmentSeq,
    endChar,
    type,
    color ?? "yellow",
    commentText ?? null
  );

  return NextResponse.json(annotation, { status: 201 });
}
