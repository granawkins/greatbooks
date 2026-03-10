"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "streaming" | "completed" | "error";
};

type ChatViewProps = {
  bookId: string;
  bookTitle: string;
  authorName: string;
  onClose: () => void;
};

export default function ChatView({ bookId, bookTitle, authorName, onClose }: ChatViewProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = useCallback(async (): Promise<Message[]> => {
    if (!userId || !bookId) return [];
    const res = await fetch(`/api/chat?bookId=${bookId}`, { credentials: "include" });
    if (!res.ok) return [];
    const rows: Message[] = await res.json();
    setMessages(rows);
    return rows;
  }, [userId, bookId]);

  useEffect(() => {
    if (userId) fetchMessages();
  }, [userId, fetchMessages]);

  const needsPoll = messages.some(
    (m) => m.status === "pending" || m.status === "streaming"
  );

  useEffect(() => {
    if (!needsPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(async () => {
      const rows = await fetchMessages();
      const allDone = rows.every(
        (m) => m.status !== "pending" && m.status !== "streaming"
      );
      if (allDone) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 1000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [needsPoll, fetchMessages]);

  const handleSend = async (text: string) => {
    if (!userId) return;
    setMessages((prev) => [
      ...prev,
      { id: -Date.now(), role: "user", text, status: "completed" },
    ]);
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, text }),
    });
    fetchMessages();
  };

  const displayMessages =
    messages.length > 0
      ? messages
      : [
          {
            id: 0,
            role: "assistant" as const,
            text: `Ask me anything about "${bookTitle}" by ${authorName}.`,
            status: "completed" as const,
          },
        ];

  return (
    <div
      style={{
        height: "100dvh",
        backgroundColor: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 200,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "1.5rem 1.5rem 0.75rem",
          maxWidth: "68ch",
          width: "100%",
          margin: "0 auto",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Back to reading"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem",
            marginLeft: "-0.25rem",
            color: "var(--color-text-secondary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderRadius: "var(--radius)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4L6 9l5 5" />
          </svg>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.9375rem" }}>
            Chat
          </span>
        </button>
      </div>

      <div style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }} />

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "68ch",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1.25rem 1.5rem",
          }}
        >
          {displayMessages.map((msg) => {
            if (msg.status === "pending" || msg.status === "streaming") {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className="rounded-[var(--radius-lg)] px-4 py-2.5 text-sm"
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                  </div>
                </div>
              );
            }
            return <ChatMessage key={msg.id} role={msg.role} content={msg.text} />;
          })}
        </div>
      </div>

      <div
        style={{
          maxWidth: "68ch",
          width: "100%",
          margin: "0 auto",
          flexShrink: 0,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
