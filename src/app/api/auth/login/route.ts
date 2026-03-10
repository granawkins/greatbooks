import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, getBaseUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnTo = searchParams.get("returnTo") || "/";

  // Ensure the current user exists (anonymous)
  let userId = await getAuthUserId();
  if (!userId) {
    userId = crypto.randomUUID();
    db.upsertUser(userId);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/google-callback`;

  const state = Buffer.from(
    JSON.stringify({ userId, returnTo })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
  );
}
