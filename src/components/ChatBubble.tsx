"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const STORAGE_KEY = "greatbooks:userId";

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "streaming" | "completed" | "error";
};

type ChatBubbleProps = {
  bookId: string;
  bookTitle: string;
  authorName: string;
  /** When this flips to true the panel opens; internal toggle still works normally */
  externalOpen?: boolean;
};

export default function ChatBubble({ bookId, bookTitle, authorName, externalOpen }: ChatBubbleProps) {
  const [open, setOpen] = useState(false);

  // When the parent signals open, honour it
  useEffect(() => {
    if (externalOpen) setOpen(true);
  }, [externalOpen]);
  const [userId] = useState(getUserId);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = useCallback(async (): Promise<Message[]> => {
    if (!userId || !bookId) return [];
    const res = await fetch(`/api/chat?userId=${userId}&bookId=${bookId}`);
    if (!res.ok) return [];
    const rows: Message[] = await res.json();
    setMessages(rows);
    return rows;
  }, [userId, bookId]);

  // Load messages when chat opens
  useEffect(() => {
    if (open && userId) {
      fetchMessages();
    }
  }, [open, userId, fetchMessages]);

  // Poll every 1s while any message is pending or streaming
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
    // Optimistically add user message; backend will create it + the pending assistant row
    setMessages((prev) => [
      ...prev,
      { id: -Date.now(), role: "user", text, status: "completed" },
    ]);

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bookId, text }),
    });

    // Replace optimistic state with real rows (includes the pending assistant message)
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
    <div className="fixed bottom-[9rem] right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col rounded-[var(--radius-lg)] border shadow-lg overflow-hidden"
          style={{
            width: "380px",
            height: "480px",
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg-secondary)",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-ui)" }}
            >
              Chat
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-[var(--radius)] hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
              return (
                <ChatMessage key={msg.id} role={msg.role} content={msg.text} />
              );
            })}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--color-accent)", color: "#ffffff" }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v8A1.5 1.5 0 0 0 2.5 12H5v3.5a.5.5 0 0 0 .854.354L9.207 12H13.5A1.5 1.5 0 0 0 15 10.5v-8A1.5 1.5 0 0 0 13.5 1h-11z" />
          </svg>
        )}
      </button>
    </div>
  );
}
