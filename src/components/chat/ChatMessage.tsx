type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  overlay?: boolean;
};

export default function ChatMessage({ role, content, overlay }: ChatMessageProps) {
  const isUser = role === "user";

  const bg = overlay
    ? isUser
      ? "var(--color-accent)"
      : "rgba(255, 255, 255, 0.1)"
    : isUser
      ? "var(--color-accent)"
      : "var(--color-bg-secondary)";

  const fg = overlay
    ? "#ffffff"
    : isUser
      ? "#ffffff"
      : "var(--color-text)";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
        style={{
          backgroundColor: bg,
          color: fg,
          fontFamily: "var(--font-ui)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
