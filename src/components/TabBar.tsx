"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Read", segment: "read" },
  { label: "Listen", segment: "listen" },
  { label: "Chat", segment: "chat" },
] as const;

export default function TabBar({ bookId }: { bookId: string }) {
  const pathname = usePathname();
  const activeSegment = pathname.split("/").pop();

  return (
    <nav
      className="flex gap-1 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeSegment === tab.segment;
        return (
          <Link
            key={tab.segment}
            href={`/${bookId}/${tab.segment}`}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{
              color: isActive
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: "var(--color-accent)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
