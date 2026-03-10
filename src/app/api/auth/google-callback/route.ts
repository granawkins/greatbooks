import { NextRequest } from "next/server";
import { createJWT, createCookieHeader, getBaseUrl } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const baseUrl = getBaseUrl(req);

  if (!code || !stateParam) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/auth-callback?successful=false` },
    });
  }

  let state: { userId: string; returnTo: string };
  try {
    state = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf-8")
    );
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/auth-callback?successful=false` },
    });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/google-callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", await tokenRes.text());
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/auth-callback?successful=false` },
    });
  }

  const { access_token } = await tokenRes.json();

  // Fetch user email from Google
  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!userInfoRes.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/auth-callback?successful=false` },
    });
  }

  const { email } = await userInfoRes.json();

  // Account merge: if email already exists, use that user; otherwise attach to current user
  const existingUser = db.getUserByEmail(email);
  let finalUserId: string;

  if (existingUser) {
    finalUserId = existingUser.id;
  } else {
    db.upsertUser(state.userId);
    db.updateUserEmail(state.userId, email);
    finalUserId = state.userId;
  }

  const jwtToken = createJWT(finalUserId);
  const cookie = createCookieHeader(
    "auth_token",
    jwtToken,
    7 * 24 * 60 * 60
  );

  const callbackParams = new URLSearchParams({
    successful: "true",
    returnTo: state.returnTo,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl}/auth-callback?${callbackParams.toString()}`,
      "Set-Cookie": cookie,
    },
  });
}
