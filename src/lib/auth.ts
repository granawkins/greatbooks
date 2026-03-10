import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "greatbooks-dev-secret";
const COOKIE_NAME = "auth_token";

export function createJWT(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyJWT(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

export function createCookieHeader(
  name: string,
  value: string,
  maxAge: number
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/** Get the authenticated userId from the request cookie, or null. */
export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

/** Derive base URL from the incoming request's origin. */
export function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  return url.origin;
}
