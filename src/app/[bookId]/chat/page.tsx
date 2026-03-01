"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { getBook } from "@/data/books";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = getBook(bookId);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: book
        ? `Welcome! I can help you explore "${book.title}" by ${book.author}. Ask me anything about the text, characters, themes, or historical context.`
        : "Welcome! Ask me anything about this book.",
    },
  ]);

  if (!book) return null;

  const handleSend = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      {
        role: "assistant",
        content:
          "This is a placeholder response. AI chat will be connected in a future update.",
      },
    ]);
  };

  return (
    <div
      className="flex flex-col rounded-[var(--radius-lg)] border overflow-hidden"
      style={{
        borderColor: "var(--color-border)",
        height: "calc(100vh - 220px)",
      }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
