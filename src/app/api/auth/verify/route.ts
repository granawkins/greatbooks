import { NextRequest } from "next/server";
import { createJWT, createCookieHeader, getBaseUrl } from "@/lib/auth";
import { db } from "@/lib/db";

// Import the token store from magic-link route
// Since Next.js API routes are in the same process, we share via a module-level map
// We re-export from magic-link, but Next.js route modules are isolated.
// Instead, use a shared module:
import { magicLinkTokens } from "@/lib/magic-link-tokens";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const baseUrl = getBaseUrl(req);

  if (!token) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${baseUrl}/auth-callback?successful=false&error=missing_token`,
      },
    });
  }

  const tokenData = magicLinkTokens.get(token);

  if (!tokenData) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${baseUrl}/auth-callback?successful=false&error=invalid_token`,
      },
    });
  }

  if (tokenData.expiresAt < Date.now()) {
    magicLinkTokens.delete(token);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${baseUrl}/auth-callback?successful=false&error=expired_token`,
      },
    });
  }

  // Token valid — delete to prevent reuse
  magicLinkTokens.delete(token);

  const { email, userId, returnTo } = tokenData;

  // Account merge
  const existingUser = db.getUserByEmail(email);
  let finalUserId: string;

  if (existingUser) {
    finalUserId = existingUser.id;
  } else {
    db.upsertUser(userId);
    db.updateUserEmail(userId, email);
    finalUserId = userId;
  }

  const jwtToken = createJWT(finalUserId);
  const cookie = createCookieHeader(
    "auth_token",
    jwtToken,
    7 * 24 * 60 * 60
  );

  const callbackParams = new URLSearchParams({
    successful: "true",
    returnTo,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl}/auth-callback?${callbackParams.toString()}`,
      "Set-Cookie": cookie,
    },
  });
}
