import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReply } from "@/lib/llm";
import { getAuthUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }
  const messages = db.getMessages(userId, bookId);
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { bookId, text } = body;

  if (!bookId || !text) {
    return NextResponse.json(
      { error: "bookId and text required" },
      { status: 400 }
    );
  }

  db.upsertUser(userId);
  db.insertMessage(userId, bookId, "user", text);
  const pending = db.insertMessage(userId, bookId, "assistant", "", "pending");

  generateReply(userId, bookId, pending.id).catch(console.error);

  return NextResponse.json({ ok: true }, { status: 201 });
}
