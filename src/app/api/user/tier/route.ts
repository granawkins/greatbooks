import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = db.getUser(userId);
  if (!user?.email) {
    return NextResponse.json({ error: "Must have email to upgrade" }, { status: 400 });
  }

  const body = await req.json();
  const tier = body.tier;
  if (tier !== "plus" && tier !== "premium" && tier !== "basic") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  if (tier === "basic") {
    db.setUserTier(userId, "basic");
  } else {
    // Gift: 30 days from now
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
    db.setUserTier(userId, tier, expires);
  }

  const tierInfo = db.getUserTierInfo(userId);
  return NextResponse.json({ success: true, ...tierInfo });
}
