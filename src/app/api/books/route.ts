import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const books = db.getBooks();
  return NextResponse.json(books);
}
