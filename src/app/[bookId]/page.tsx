import { redirect } from "next/navigation";

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  redirect(`/${bookId}/read`);
}
