import { books } from "@/data/books";
import BookCard from "@/components/BookCard";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
        >
          Great Books
        </h1>
        <p
          className="mt-2 text-lg"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Classic literature, reimagined for reading, listening, and exploring.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </main>
    </div>
  );
}
