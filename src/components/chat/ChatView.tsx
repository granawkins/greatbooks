"use client";

import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import { useChatSocket } from "./useChatSocket";
import UpgradeModal from "@/components/UpgradeModal";

type ChatViewProps = {
  bookId: string;
  bookTitle: string;
  authorName: string;
  onClose: () => void;
};

export default function ChatView({ bookId, bookTitle, authorName, onClose }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = useChatSocket({ bookId });
  const { voiceState } = chat;
  const voiceActive = voiceState === "active" || voiceState === "connecting";
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, chat.partialTranscript, chat.userTranscript]);

  // Lock body scroll while chat is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Track visual viewport height for mobile keyboard resize
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setViewportHeight(vv.height);
    onResize();
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const displayMessages =
    chat.messages.length > 0
      ? chat.messages
      : [
          {
            id: 0,
            role: "assistant" as const,
            text: `Ask me anything about "${bookTitle}" by ${authorName}.`,
            status: "completed" as const,
            model: null,
          },
        ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...(viewportHeight != null ? { height: viewportHeight } : {}),
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Close button — floats over messages, aligned to content width */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}>
        <div style={{
          maxWidth: "var(--content-max-width)",
          margin: "0 auto",
          padding: "1rem 1.5rem",
        }}>
          <button
            onClick={onClose}
            aria-label="Close chat"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.15s",
              pointerEvents: "auto",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "var(--content-max-width)",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "0 1.5rem 1.5rem",
          }}
        >
          {displayMessages.map((msg) => {
            if ((msg.status === "pending" || msg.status === "streaming") && !msg.text) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-2.5 text-sm"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.6)",
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
            return <ChatMessage key={msg.id} role={msg.role} content={msg.text} overlay />;
          })}

          {/* Live voice transcripts */}
          {voiceActive && chat.userTranscript && (
            <ChatMessage role="user" content={chat.userTranscript} overlay />
          )}
          {voiceActive && chat.partialTranscript && (
            <ChatMessage role="assistant" content={chat.partialTranscript} overlay />
          )}
        </div>
      </div>

      {/* Input area */}
      <div
        style={{
          maxWidth: "var(--content-max-width)",
          width: "100%",
          margin: "0 auto",
          padding: "0.75rem 1.5rem 2rem",
          flexShrink: 0,
        }}
      >
        {chat.creditsExhausted ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 0.75rem",
              }}
            >
              You&apos;ve used all your AI credits this month.
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              style={{
                padding: "0.5rem 1.5rem",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontFamily: "var(--font-ui)",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              Upgrade for more credits
            </button>
          </div>
        ) : voiceActive ? (
          <VoiceControls
            state={voiceState}
            audioLevel={chat.audioLevel}
            onStop={chat.stopVoice}
          />
        ) : (
          <ChatInput
            ref={inputRef}
            onSend={chat.sendText}
            onMic={chat.startVoice}
            isStreaming={chat.messages.some((m) => m.status === "streaming")}
          />
        )}
      </div>

      {showUpgradeModal && (
        <UpgradeModal variant="credits_exhausted" onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

import { forwardRef } from "react";

type ChatInputProps = {
  onSend: (text: string) => void;
  onMic: () => void;
  isStreaming: boolean;
};

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  function ChatInput({ onSend, onMic, isStreaming }, ref) {
    const [value, setValue] = useState("");
    const hasText = value.trim().length > 0;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setValue("");
    };

    return (
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask about this book..."
          style={{
            flex: 1,
            padding: "0.625rem 1rem",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            fontFamily: "var(--font-ui)",
            fontSize: "16px",
            outline: "none",
          }}
        />
        <button
          type={hasText ? "submit" : "button"}
          onClick={hasText ? undefined : onMic}
          disabled={isStreaming}
          aria-label={hasText ? "Send" : "Start voice chat"}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
            cursor: isStreaming ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isStreaming ? 0.4 : 1,
            transition: "opacity 0.15s",
            flexShrink: 0,
          }}
        >
          {hasText ? (
            // Send arrow
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 1l14 7-14 7V9l8-1-8-1V1z" />
            </svg>
          ) : (
            // Mic icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </form>
    );
  }
);

type VoiceControlsProps = {
  state: "connecting" | "active";
  audioLevel: number;
  onStop: () => void;
};

function VoiceControls({ state, audioLevel, onStop }: VoiceControlsProps) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
      <button
        onClick={onStop}
        aria-label="Stop voice chat"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `3px solid rgba(255, 255, 255, ${state === "connecting" ? 0.3 : Math.min(0.3 + audioLevel * 3, 1)})`,
          backgroundColor: "rgba(239, 68, 68, 0.9)",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.1s",
        }}
      >
        {state === "connecting" ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
        ) : (
          // Stop square
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="4" y="4" width="10" height="10" rx="1.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
