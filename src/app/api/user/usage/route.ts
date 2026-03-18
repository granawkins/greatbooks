import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ listen_ms: 0, read_ms: 0 });
  }

  const month = req.nextUrl.searchParams.get("month") ?? undefined;
  const summary = db.getUserUsageSummary(userId, month);
  return NextResponse.json(summary);
}
