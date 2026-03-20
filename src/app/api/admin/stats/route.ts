import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import Database from "better-sqlite3";
import path from "path";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// Raw DB connection for admin queries
const rawDb = new Database(path.join(process.cwd(), "greatbooks.db"), { readonly: true });

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = db.getUser(userId);
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Stat cards ---
  const totalUsers = (rawDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  const usersWithEmail = (rawDb.prepare("SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL AND email != ''").get() as { count: number }).count;
  const totalSessions = (rawDb.prepare("SELECT COUNT(*) as count FROM user_sessions").get() as { count: number }).count;
  const totalMessages = (rawDb.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number }).count;
  const newUsersLast7 = (rawDb.prepare(
    "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')"
  ).get() as { count: number }).count;
  const sessionsLast7 = (rawDb.prepare(
    "SELECT COUNT(*) as count FROM user_sessions WHERE started_at >= datetime('now', '-7 days')"
  ).get() as { count: number }).count;

  // --- Daily signups (last 30 days) ---
  const dailySignups = rawDb.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= date('now', '-29 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all() as { date: string; count: number }[];

  // --- Daily sessions (last 30 days) ---
  const dailySessions = rawDb.prepare(`
    SELECT date(started_at) as date, COUNT(*) as count
    FROM user_sessions
    WHERE started_at >= date('now', '-29 days')
    GROUP BY date(started_at)
    ORDER BY date ASC
  `).all() as { date: string; count: number }[];

  // --- Sessions by book ---
  const sessionsByBook = rawDb.prepare(`
    SELECT us.book_id, b.title, COUNT(*) as count
    FROM user_sessions us
    LEFT JOIN books b ON b.id = us.book_id
    GROUP BY us.book_id
    ORDER BY count DESC
    LIMIT 20
  `).all() as { book_id: string; title: string; count: number }[];

  // --- Sessions by mode ---
  const sessionsByMode = rawDb.prepare(`
    SELECT mode, COUNT(*) as count
    FROM user_sessions
    GROUP BY mode
  `).all() as { mode: string; count: number }[];

  // --- Chat messages per day (last 30 days) ---
  const messagesPerDay = rawDb.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM messages
    WHERE created_at >= date('now', '-29 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all() as { date: string; count: number }[];

  return NextResponse.json({
    stats: {
      totalUsers,
      usersWithEmail,
      totalSessions,
      totalMessages,
      newUsersLast7,
      sessionsLast7,
    },
    charts: {
      dailySignups,
      dailySessions,
      sessionsByBook,
      sessionsByMode,
      messagesPerDay,
    },
  });
}
