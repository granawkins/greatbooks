import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReply } from "@/lib/llm";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!userId || !bookId) {
    return NextResponse.json({ error: "userId and bookId required" }, { status: 400 });
  }
  const messages = db.getMessages(userId, bookId);
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, bookId, text } = body;

  if (!userId || !bookId || !text) {
    return NextResponse.json(
      { error: "userId, bookId, and text required" },
      { status: 400 }
    );
  }

  db.upsertUser(userId);
  db.insertMessage(userId, bookId, "user", text);
  // Immediately create a pending placeholder so the frontend can show a spinner
  const pending = db.insertMessage(userId, bookId, "assistant", "", "pending");

  // Fire and forget — streams reply into the pending row
  generateReply(userId, bookId, pending.id).catch(console.error);

  return NextResponse.json({ ok: true }, { status: 201 });
}
