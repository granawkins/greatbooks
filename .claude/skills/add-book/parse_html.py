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
import sys


def parse_gutenberg(html: str) -> dict:
    """Parse Project Gutenberg HTML into chapters/segments."""
    # TODO: Implement Gutenberg-specific parsing
    # - Find chapter boundaries (typically <h2> or <h3> tags)
    # - Split text into paragraphs (by <p> tags)
    # - Split paragraphs into sentences (by punctuation rules)
    # - Handle poetry vs prose detection
    raise NotImplementedError("Gutenberg parser not yet implemented")


def parse_classics(html: str) -> dict:
    """Parse Internet Classics Archive HTML into chapters/segments."""
    # TODO: Implement Classics Archive parsing
    # - Simpler HTML structure than Gutenberg
    # - May need to infer chapter breaks from context
    raise NotImplementedError("Classics Archive parser not yet implemented")


def parse_perseus(html: str) -> dict:
    """Parse Perseus Digital Library HTML into chapters/segments."""
    # TODO: Implement Perseus parsing
    # - Most structured source
    # - May include line numbers to preserve
    raise NotImplementedError("Perseus parser not yet implemented")


PARSERS = {
    "gutenberg": parse_gutenberg,
    "classics": parse_classics,
    "perseus": parse_perseus,
}


def main():
    parser = argparse.ArgumentParser(description="Parse HTML into book segments")
    parser.add_argument("input", help="Path to HTML file")
    parser.add_argument(
        "--source",
        choices=PARSERS.keys(),
        default="gutenberg",
        help="Source format (default: gutenberg)",
    )
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        html = f.read()

    result = PARSERS[args.source](html)
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
