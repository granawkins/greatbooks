import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ id: null, email: null });
  }

  // Ensure user exists in DB
  db.upsertUser(userId);
  const user = db.getUser(userId);

  return NextResponse.json({
    id: user?.id ?? userId,
    email: user?.email ?? null,
  });
}
