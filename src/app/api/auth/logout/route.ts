import { createCookieHeader } from "@/lib/auth";

export async function POST() {
  // Clear the auth cookie
  const cookie = createCookieHeader("auth_token", "", 0);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
