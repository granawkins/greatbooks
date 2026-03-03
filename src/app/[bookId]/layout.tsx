import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = db.getBook(bookId);
  if (!book) notFound();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {children}
    </div>
  );
}
