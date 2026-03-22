#!/usr/bin/env python3
"""
Parser for Wuthering Heights (Gutenberg edition).
Reads raw/source.html, strips boilerplate, splits on <h2>CHAPTER headings,
and writes chapters.json.
"""

import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

# Paths
BASE = Path(__file__).parent
HTML_FILE = BASE / "raw" / "source.html"
OUT_FILE = BASE / "chapters.json"

# Roman numeral to int
ROMAN = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50,
    'C': 100, 'D': 500, 'M': 1000
}

def roman_to_int(s):
    s = s.strip().upper()
    result = 0
    prev = 0
    for ch in reversed(s):
        val = ROMAN.get(ch, 0)
        if val < prev:
            result -= val
        else:
            result += val
        prev = val
    return result


def clean_text(s):
    """Normalize whitespace and common HTML entities."""
    s = s.replace('\u2014', '—').replace('\u2013', '–')
    s = s.replace('\u2018', "'").replace('\u2019', "'")
    s = s.replace('\u201c', '"').replace('\u201d', '"')
    s = s.replace('\xa0', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def split_into_sentences(text):
    """Split a paragraph text into sentence-level segments."""
    # Split on sentence boundaries: ., !, ? followed by whitespace + capital or end
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z"\u201c\u2018\(])', text)
    return [s.strip() for s in sentences if s.strip()]


def parse():
    html = HTML_FILE.read_text(encoding='utf-8', errors='replace')

    # Strip before START OF and after END OF
    start_marker = '*** START OF'
    end_marker = '*** END OF'
    start_idx = html.find(start_marker)
    end_idx = html.find(end_marker)
    if start_idx == -1 or end_idx == -1:
        print("WARNING: Could not find Gutenberg markers — parsing full file")
    else:
        # Keep from the line after start_marker to end_marker
        html = html[start_idx:end_idx]

    soup = BeautifulSoup(html, 'html.parser')

    chapters = []

    # Find all chapter divs
    chapter_divs = soup.find_all('div', class_='chapter')
    print(f"Found {len(chapter_divs)} chapter divs")

    for div in chapter_divs:
        # Find the h2 heading inside
        h2 = div.find('h2')
        if h2 is None:
            continue
        h2_text = clean_text(h2.get_text())
        # Must contain "CHAPTER"
        if 'CHAPTER' not in h2_text.upper():
            continue

        # Parse chapter number from heading (e.g. "CHAPTER XIV")
        m = re.match(r'CHAPTER\s+([IVXLCDM]+)', h2_text, re.IGNORECASE)
        if m:
            num = roman_to_int(m.group(1))
        else:
            num = len(chapters) + 1

        title = f"Chapter {num}"

        segments = []
        seq = 1

        # Collect all <p> tags within this div
        paragraphs = div.find_all('p')
        for p in paragraphs:
            para_text = clean_text(p.get_text())
            if not para_text:
                continue

            # Split paragraph into sentence-level segments
            sentences = split_into_sentences(para_text)
            if not sentences:
                continue

            # First sentence: plain text
            for i, sent in enumerate(sentences):
                if not sent:
                    continue
                segments.append({'type': 'text', 'text': sent, 'sequence': seq})
                seq += 1

            # Add paragraph break after each paragraph (except will be cleaned up)
            segments.append({'type': 'paragraph_break', 'text': '', 'sequence': seq})
            seq += 1

        # Remove trailing paragraph_break
        while segments and segments[-1]['type'] == 'paragraph_break':
            segments.pop()

        # Re-sequence
        for i, seg in enumerate(segments):
            seg['sequence'] = i + 1

        chapters.append({
            'number': num,
            'title': title,
            'segments': segments
        })
        print(f"  Chapter {num}: {len([s for s in segments if s['type'] == 'text'])} text segments")

    # Sort by chapter number
    chapters.sort(key=lambda c: c['number'])

    print(f"\nTotal chapters: {len(chapters)}")
    total_segs = sum(len(c['segments']) for c in chapters)
    print(f"Total segments (incl paragraph_breaks): {total_segs}")
    text_segs = sum(len([s for s in c['segments'] if s['type'] == 'text']) for c in chapters)
    print(f"Total text segments: {text_segs}")

    # Write output (without sequence in JSON — seed.py will assign)
    out_chapters = []
    for c in chapters:
        out_chapters.append({
            'number': c['number'],
            'title': c['title'],
            'segments': [{'type': s['type'], 'text': s['text']} for s in c['segments']]
        })

    OUT_FILE.write_text(json.dumps(out_chapters, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\nWrote {OUT_FILE}")

    # Show sample
    if chapters:
        ch1 = chapters[0]
        print(f"\nSample - Chapter 1 first 3 segments:")
        for s in ch1['segments'][:3]:
            print(f"  [{s['type']}] {s['text'][:100]}")

    return chapters


if __name__ == '__main__':
    parse()
