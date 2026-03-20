import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminDashboardClient from "./AdminDashboardClient";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export default async function AdminPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/");

  const user = db.getUser(userId);
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    redirect("/");
  }

  return <AdminDashboardClient />;
}
