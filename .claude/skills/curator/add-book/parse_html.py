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
    start_match = re.search(r'<A NAME="start">\s*</A>', html, re.IGNORECASE)
    end_match = re.search(r'<A NAME="end">\s*</A>', html, re.IGNORECASE)
    if not start_match:
        raise ValueError("Could not find start marker in HTML")

    # If no end marker (truncated response ~100KB), use all content after start
    if end_match:
        content = html[start_match.end():end_match.start()]
    else:
        content = html[start_match.end():]

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
    skipped = []
    for filename, html in html_files:
        try:
            result = parse_classics(html)
        except ValueError as e:
            skipped.append((filename, str(e)))
            continue
        chapters.extend(result["chapters"])
    if skipped and not chapters:
        raise ValueError(f"All files failed to parse: {skipped}")
    result = {"chapters": chapters}
    if skipped:
        result["skipped"] = skipped
    return {"chapters": chapters}


def _gutenberg_extract_title(h2) -> str:
    """Extract a clean title from a Gutenberg h2 element.

    Handles: image-only titles (extract from anchor id), caption text
    leaking from adjacent images, etc.
    """
    # First try: get text, but only from direct text nodes (not alt text)
    # Remove any remaining img tags first (in case decompose didn't catch them)
    for img in h2.find_all("img"):
        img.decompose()

    text = h2.get_text(strip=True)

    if not text:
        # Try anchor id attribute
        anchor = h2.find("a", id=True)
        if anchor:
            raw_id = anchor["id"]
            return raw_id.replace("_", " ").title()
        return ""

    # Clean up: if text has garbage before a chapter marker, extract just the chapter part
    # e.g. "I hope Mr. Bingley will like it.CHAPTER II." → "Chapter II."
    chapter_match = re.search(
        r'((?:CHAPTER|Chapter|BOOK|Book|PART|Part|CANTO|Canto|ACT|Act|SECTION|Section)\s+[\dIVXLCDMivxlcdm]+\.?(?:\s.*)?)',
        text,
    )
    if chapter_match:
        return chapter_match.group(1).strip()

    # Clean up page number artifacts like "{ix}"
    text = re.sub(r'\{[^}]+\}', '', text).strip()

    return text


def parse_gutenberg(html: str) -> dict:
    """Parse Project Gutenberg HTML into chapters/segments.

    Structure: content between *** START OF *** and *** END OF *** markers.
    Chapters split on <h2> tags. Paragraphs from <p> tags.
    Verse lines use <br/> within <p> tags.
    """
    from bs4 import BeautifulSoup

    # Strip Gutenberg boilerplate
    start_markers = [
        r'\*\*\* ?START OF (?:THE |THIS )?PROJECT GUTENBERG EBOOK[^*]*\*\*\*',
        r'<div id="pg-header">.*?</div>',
    ]
    end_markers = [
        r'\*\*\* ?END OF (?:THE |THIS )?PROJECT GUTENBERG EBOOK[^*]*\*\*\*',
        r'<div id="pg-footer">',
    ]

    content = html
    for pattern in start_markers:
        m = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if m:
            content = content[m.end():]
            break

    for pattern in end_markers:
        m = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if m:
            content = content[:m.start()]
            break

    soup = BeautifulSoup(content, "html.parser")

    # Remove images, page numbers, TOC links-only paragraphs
    for tag in soup.find_all("img"):
        tag.decompose()
    for tag in soup.find_all(class_="pagenum"):
        tag.decompose()
    for tag in soup.find_all("sup"):
        tag.decompose()

    # Try splitting on h2, then h3 — use whichever captures more content
    chapters = _gutenberg_split_by_heading(soup, "h2")
    h2_segs = sum(len(g["segments"]) for c in chapters for g in c["groups"])

    h3_chapters = _gutenberg_split_by_heading(soup, "h3")
    h3_segs = sum(len(g["segments"]) for c in h3_chapters for g in c["groups"])

    if h3_segs > h2_segs * 1.5:
        chapters = h3_chapters

    if not chapters:
        groups = _gutenberg_extract_groups(soup)
        return {"chapters": [{"title": "Full Text", "groups": groups}]}

    return {"chapters": chapters}


def _gutenberg_split_by_heading(soup, heading_tag: str) -> list[dict]:
    """Split content by a heading tag level (h2 or h3) into chapters."""
    headings = soup.find_all(heading_tag)
    if not headings:
        return []

    # Determine the sub-heading tag for this level
    sub_heading = "h3" if heading_tag == "h2" else "h4"

    chapters = []
    for i, heading in enumerate(headings):
        title = _gutenberg_extract_title(heading)

        # Skip TOC headings
        title_lower = title.lower().strip()
        if title_lower in ("contents", "contents.", "table of contents"):
            continue

        # Collect sibling elements until next heading of same level
        chapter_elements = []

        # Check if heading is inside a div.chapter
        parent_div = heading.find_parent("div", class_="chapter")
        if parent_div:
            for el in heading.find_all_next():
                if el.find_parent("div", class_="chapter") != parent_div:
                    break
                if el.name == heading_tag and el != heading:
                    break
                chapter_elements.append(el)
        else:
            el = heading.next_sibling
            while el:
                if hasattr(el, "name") and el.name == heading_tag:
                    break
                if hasattr(el, "name") and el.name:
                    chapter_elements.append(el)
                el = el.next_sibling

        # Check for subtitle in sub-heading immediately after
        subtitle = None
        if chapter_elements and hasattr(chapter_elements[0], "name"):
            first = chapter_elements[0]
            if first.name == sub_heading:
                subtitle = first.get_text(strip=True)
                chapter_elements = chapter_elements[1:]
            elif first.name == "hr":
                chapter_elements = chapter_elements[1:]
                if chapter_elements and hasattr(chapter_elements[0], "name") and chapter_elements[0].name == sub_heading:
                    subtitle = chapter_elements[0].get_text(strip=True)
                    chapter_elements = chapter_elements[1:]

        full_title = title
        if subtitle:
            full_title = f"{title}: {subtitle}"

        groups = _gutenberg_elements_to_groups(chapter_elements)
        if groups:
            chapters.append({"title": full_title, "groups": groups})

    return chapters


def _gutenberg_extract_groups(soup) -> list[dict]:
    """Extract text groups from a BeautifulSoup object."""
    elements = soup.find_all(["p", "h3", "h4", "h5"])
    return _gutenberg_elements_to_groups(elements)


def _gutenberg_elements_to_groups(elements: list) -> list[dict]:
    """Convert a list of BeautifulSoup elements to groups."""
    groups = []
    for el in elements:
        if not hasattr(el, "name") or el.name is None:
            continue

        if el.name in ("h3", "h4", "h5"):
            text = el.get_text(strip=True)
            if text:
                groups.append({"type": "heading", "segments": [text]})
            continue

        if el.name != "p":
            continue

        # Skip empty paragraphs
        text = el.get_text(strip=True)
        if not text:
            continue

        # Skip paragraphs that are just links (TOC entries)
        if el.find("a") and not el.find(string=re.compile(r'[a-zA-Z]{10,}')):
            links = el.find_all("a")
            non_link_text = el.get_text(strip=True)
            for a in links:
                non_link_text = non_link_text.replace(a.get_text(strip=True), "")
            if not non_link_text.strip():
                continue

        # Check if this is verse (has <br> tags)
        brs = el.find_all("br")
        if brs:
            # Verse: each line between <br> tags is a segment
            # Get the HTML content and split on <br>
            inner_html = el.decode_contents()
            lines = re.split(r'<br\s*/?>', inner_html, flags=re.IGNORECASE)
            segments = []
            for line in lines:
                line_text = _extract_text(line).strip()
                if line_text:
                    segments.append(line_text)
            if segments:
                groups.append({"type": "text", "segments": segments})
        else:
            # Prose paragraph — split into sentences
            sentences = _split_sentences(text)
            if sentences:
                groups.append({"type": "text", "segments": sentences})

    return groups


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
