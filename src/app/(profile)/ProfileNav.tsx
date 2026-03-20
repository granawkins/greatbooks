"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Settings", href: "/settings" },
  { label: "Billing", href: "/billing" },
  { label: "History", href: "/history" },
];

export default function ProfileNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "0",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "2rem",
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              fontFamily: "var(--font-ui)",
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
              textDecoration: "none",
              borderBottom: isActive ? "2px solid var(--color-text)" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
