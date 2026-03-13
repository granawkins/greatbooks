import { NextResponse } from "next/server";
import { getAuthUserId, createJWT } from "@/lib/auth";

/**
 * Returns a short-lived JWT for authenticating the chat WebSocket connection.
 * Needed because the WS may be cross-origin in dev (port 3000→3002),
 * and HttpOnly cookies aren't sent cross-origin.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Short-lived token — just needs to last long enough to open the WS
  const token = createJWT(userId);
  return NextResponse.json({ token });
}
