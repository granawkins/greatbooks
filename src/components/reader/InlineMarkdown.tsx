import { type ReactNode } from "react";

/**
 * Renders inline markdown (bold and italic) as React elements.
 * Handles **bold**, *italic*, and ***bold italic***.
 * Plain text segments with no markdown pass through unchanged.
 */
export function renderInlineMarkdown(text: string): ReactNode {
  // Quick check: if no asterisks, return as-is
  if (!text.includes("*")) return text;

  const parts: ReactNode[] = [];
  // Match **bold**, *italic*, or ***bold italic*** patterns
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // ***bold italic***
      parts.push(<strong key={key}><em>{match[2]}</em></strong>);
    } else if (match[3]) {
      // **bold**
      parts.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4]) {
      // *italic*
      parts.push(<em key={key}>{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
    key++;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
