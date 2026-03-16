"use client";

import { type ReactNode } from "react";

type Choice = {
  label: string;
  sublabel?: string;
  badge?: string;
  href?: string;
  onClick?: () => void;
};

export default function CourseChoiceModal({
  title,
  message,
  choices,
}: {
  title: string;
  message: string;
  choices: Choice[];
}) {
  const cardStyle = {
    display: "block",
    padding: "1.25rem",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    textDecoration: "none",
    transition: "border-color 0.15s, background-color 0.15s",
    width: "100%",
    cursor: "pointer",
    background: "var(--color-bg)",
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: "24rem",
          width: "100%",
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            fontWeight: 400,
            color: "var(--color-text)",
            margin: "0 0 0.5rem",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
            margin: "0 0 1.5rem",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {choices.map((choice, i) => {
            const content: ReactNode = (
              <>
                {choice.badge && (
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      margin: "0 0 0.2rem",
                    }}
                  >
                    {choice.badge}
                  </p>
                )}
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "var(--color-text)",
                    margin: 0,
                  }}
                >
                  {choice.label}
                </p>
                {choice.sublabel && (
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.75rem",
                      color: "var(--color-text-secondary)",
                      margin: "0.15rem 0 0",
                    }}
                  >
                    {choice.sublabel}
                  </p>
                )}
              </>
            );

            if (choice.href) {
              return (
                <a
                  key={i}
                  href={choice.href}
                  style={cardStyle}
                  className="hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]"
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={i}
                onClick={choice.onClick}
                style={{ ...cardStyle, textAlign: "left", fontFamily: "inherit" }}
                className="hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
