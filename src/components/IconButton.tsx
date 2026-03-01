"use client";

import { ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function IconButton({
  children,
  label,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      {...props}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius)] transition-colors hover:opacity-80 disabled:opacity-40 ${props.className ?? ""}`}
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        color: "var(--color-text)",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
