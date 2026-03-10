import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAuthUserId, getBaseUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import { magicLinkTokens } from "@/lib/magic-link-tokens";
import crypto from "crypto";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function POST(req: NextRequest) {
  if (!resend) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 }
    );
  }

  let userId = await getAuthUserId();
  if (!userId) {
    userId = crypto.randomUUID();
    db.upsertUser(userId);
  }

  const body = await req.json();
  const { email, returnTo = "/" } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const token = generateToken();
  magicLinkTokens.set(token, {
    email: email.toLowerCase(),
    userId,
    returnTo,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  const { error } = await resend.emails.send({
    from: "Great Books <noreply@greatbooks.wiki>",
    to: email,
    subject: "Sign in to Great Books",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F5;">
  <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #E5DDD4;">
    <h1 style="color: #2C2A28; font-size: 24px; margin: 0 0 20px 0;">Sign in to Great Books</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Click the button below to sign in. This link expires in 15 minutes.
    </p>
    <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Sign In
    </a>
    <p style="color: #999; font-size: 14px; margin: 24px 0 0 0;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>`,
  });

  if (error) {
    console.error("Failed to send magic link email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Check your email for a sign-in link",
  });
}
