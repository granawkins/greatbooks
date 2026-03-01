"use client";

import { useState } from "react";
import IconButton from "./IconButton";

type ChatInputProps = {
  onSend: (message: string) => void;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

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
      className="flex gap-2 p-3 border-t"
      style={{ borderColor: "var(--color-border)" }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about this book..."
        className="flex-1 px-3 py-2 rounded-[var(--radius)] border text-sm outline-none focus:ring-2"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-ui)",
          // @ts-expect-error CSS custom property in ring color
          "--tw-ring-color": "var(--color-accent)",
        }}
      />
      <IconButton
        label="Send"
        type="submit"
        style={{
          backgroundColor: "var(--color-accent)",
          color: "#ffffff",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 1l14 7-14 7V9l8-1-8-1V1z" />
        </svg>
      </IconButton>
    </form>
  );
}
