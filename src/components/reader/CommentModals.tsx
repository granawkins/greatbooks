"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Annotation } from "./types";

// ── Shared styles ────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1001, padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "1px solid rgba(50,100,200,0.7)",
  borderRadius: "var(--radius)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  padding: "12px 14px", width: "min(320px,100%)",
  position: "relative", minHeight: 48,
  fontFamily: "var(--font-body)", fontSize: "0.9rem",
  lineHeight: 1.6, color: "var(--color-text)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", minHeight: 24, resize: "none",
  fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
  border: "none", outline: "none", padding: 0, margin: 0,
  background: "transparent", color: "var(--color-text)", boxSizing: "border-box",
};

const xBtnStyle: React.CSSProperties = {
  position: "absolute", top: 6, right: 6, width: 22, height: 22,
  border: "none", background: "var(--color-bg-tertiary)",
  color: "var(--color-text-secondary)", cursor: "pointer",
  borderRadius: "50%", display: "flex", alignItems: "center",
  justifyContent: "center", padding: 0,
};

function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" fill="none">
      <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  );
}

// ── View/edit existing comment ───────────────────────────────────────────

export function CommentModal({
  annotation, onDelete, onEdit, onClose,
}: {
  annotation: Annotation;
  onDelete: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(annotation.comment_text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      el.focus();
    }
  }, [editing]);

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={backdropStyle}>
      <div onClick={(e) => { e.stopPropagation(); if (!editing) setEditing(true); }}
        style={{ ...cardStyle, cursor: editing ? undefined : "pointer" }}>
        {editing ? (
          <textarea ref={textareaRef} value={text}
            onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = text.trim(); if (t && t !== annotation.comment_text) onEdit(annotation.id, t); setEditing(false); }
              else if (e.key === "Escape") { setText(annotation.comment_text ?? ""); setEditing(false); }
            }}
            onBlur={() => { const t = text.trim(); if (t && t !== annotation.comment_text) onEdit(annotation.id, t); setEditing(false); }}
            style={textareaStyle}
          />
        ) : (
          <p style={{ margin: 0, paddingRight: 24 }}>{annotation.comment_text}</p>
        )}
        <button onClick={(e) => { e.stopPropagation(); if (editing) { setText(annotation.comment_text ?? ""); setEditing(false); } else { onDelete(annotation.id); onClose(); } }}
          style={xBtnStyle} aria-label={editing ? "Cancel" : "Delete"}>
          <XIcon />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── New comment input ────────────────────────────────────────────────────

export function CommentInputModal({ onSave, onCancel }: { onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={backdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <textarea autoFocus value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSave(text.trim()); }
            else if (e.key === "Escape") onCancel();
          }}
          placeholder="Add a comment..." style={textareaStyle}
        />
        <button onClick={onCancel} style={xBtnStyle} aria-label="Cancel"><XIcon /></button>
      </div>
    </div>,
    document.body
  );
}
