type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm"
        style={{
          backgroundColor: isUser
            ? "var(--color-accent)"
            : "var(--color-bg-secondary)",
          color: isUser ? "#ffffff" : "var(--color-text)",
          fontFamily: "var(--font-ui)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
