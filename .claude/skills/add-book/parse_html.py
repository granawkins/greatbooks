#!/usr/bin/env python3
"""
Parse a public-domain HTML source file into chapters and segments.

Usage:
    python parse_html.py <input.html> [--source gutenberg|classics|perseus]

Output:
    JSON to stdout with structure:
    {
      "chapters": [
        {
          "title": "Chapter Title",
          "groups": [
            {"type": "text", "segments": ["sentence 1", "sentence 2"]},
            {"type": "heading", "segments": ["Section Heading"]},
            {"type": "section_break", "segments": [""]}
          ]
        }
      ]
    }

Each group becomes a paragraph/stanza. Each segment is a sentence (prose)
or line (poetry). The add-book skill then inserts these into the database.
"""

import argparse
import json
import re
import sys
from html.parser import HTMLParser


def _split_sentences(text: str) -> list[str]:
    """Split a prose paragraph into sentences.

    Handles common abbreviations and quoted speech to avoid false splits.
    """
    # Split on sentence-ending punctuation followed by space + uppercase letter.
    # Keeps the punctuation with the preceding sentence.
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"\'])', text)
    return [s.strip() for s in parts if s.strip()]


def _extract_text(html: str) -> str:
    """Extract plain text from HTML, collapsing whitespace."""
    # Remove tags but keep their text content
    text = re.sub(r'<[^>]+>', ' ', html)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_classics(html: str) -> dict:
    """Parse Internet Classics Archive HTML into chapters/segments.

    Structure: content is between <A NAME="start"> and <A NAME="end">.
    Paragraphs are separated by <BR><BR>. Line reference anchors
    <A NAME="N"> are interspersed throughout.
    """
    # Extract content between start and end markers
    start_match = re.search(r'<A NAME="start"></A>', html, re.IGNORECASE)
    end_match = re.search(r'<A NAME="end"></A>', html, re.IGNORECASE)
    if not start_match or not end_match:
        raise ValueError("Could not find start/end markers in HTML")

    content = html[start_match.end():end_match.start()]

    # Split into paragraphs on <BR><BR> (with optional whitespace)
    paragraphs = re.split(r'<BR>\s*<BR>', content, flags=re.IGNORECASE)

    groups = []
    for para in paragraphs:
        text = _extract_text(para)
        if not text:
            continue

        sentences = _split_sentences(text)
        if sentences:
            groups.append({
                "type": "text",
                "segments": sentences,
            })

    # Extract book title from the HTML
    title_match = re.search(
        r'<FONT SIZE="\+1"><B>(Book [IVXLC]+)</B></FONT>', html
    )
    title = title_match.group(1) if title_match else "Unknown"

    return {
        "chapters": [{
            "title": title,
            "groups": groups,
        }]
    }


def parse_classics_multi(html_files: list[tuple[str, str]]) -> dict:
    """Parse multiple Internet Classics Archive HTML files (one per chapter).

    Args:
        html_files: list of (filename, html_content) tuples, sorted by chapter.

    Returns:
        Combined result with all chapters.
    """
    chapters = []
    for filename, html in html_files:
        result = parse_classics(html)
        chapters.extend(result["chapters"])
    return {"chapters": chapters}


def parse_gutenberg(html: str) -> dict:
    """Parse Project Gutenberg HTML into chapters/segments."""
    raise NotImplementedError("Gutenberg parser not yet implemented")


def parse_perseus(html: str) -> dict:
    """Parse Perseus Digital Library HTML into chapters/segments."""
    raise NotImplementedError("Perseus parser not yet implemented")


PARSERS = {
    "gutenberg": parse_gutenberg,
    "classics": parse_classics,
    "perseus": parse_perseus,
}


def main():
    parser = argparse.ArgumentParser(description="Parse HTML into book segments")
    parser.add_argument("input", nargs="+", help="Path to HTML file(s) or directory")
    parser.add_argument(
        "--source",
        choices=PARSERS.keys(),
        default="gutenberg",
        help="Source format (default: gutenberg)",
    )
    args = parser.parse_args()

    import os

    # Collect input files
    paths = []
    for inp in args.input:
        if os.path.isdir(inp):
            for f in sorted(os.listdir(inp)):
                if f.endswith(".html"):
                    paths.append(os.path.join(inp, f))
        else:
            paths.append(inp)

    # Sort by book number if filenames match book_N.html pattern
    def sort_key(p):
        m = re.search(r'book_(\d+)', os.path.basename(p))
        return int(m.group(1)) if m else 0
    paths.sort(key=sort_key)

    if len(paths) == 1:
        with open(paths[0], "r", encoding="utf-8") as f:
            html = f.read()
        result = PARSERS[args.source](html)
    else:
        html_files = []
        for p in paths:
            with open(p, "r", encoding="utf-8") as f:
                html_files.append((os.path.basename(p), f.read()))
        if args.source == "classics":
            result = parse_classics_multi(html_files)
        else:
            raise ValueError(f"Multi-file parsing not supported for {args.source}")

    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
