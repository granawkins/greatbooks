# Republic — Plato

## Source
- **URL**: http://classics.mit.edu/Plato/republic.html
- **Translator**: Benjamin Jowett
- **Edition**: Internet Classics Archive plain-text download (`republic.mb.txt`)
- **Format**: Plain text — the per-book HTML files (republic.2.i.html through republic.11.x.html) were attempted first, but books III and V are truncated by a ~100KB server response limit

## How to Re-scrape

1. Download the full text: `curl http://classics.mit.edu/Plato/republic.mb.txt -o data/republic/raw/republic_full.txt`
2. Split on `^BOOK [IVXLC]+$` lines to get the 10 chapters (Books I–X). Skip the Introduction preamble before `BOOK I`.
3. Within each chapter, split on double-blank-lines to get paragraphs. Collapse wrapped lines (each line is ~75 chars) into a single string.
4. Speaker-indicator lines (e.g. `Socrates - GLAUCON`) match `^[A-Z][a-z]+ - [A-Z\s-]+$` — store as `heading` segments with `group_number = NULL`.
5. Split prose paragraphs into sentences on `(?<=[.!?])\s+(?=[A-Z"'])`.
6. Strip the copyright footer starting at the last `---` line before inserting.

## Structure
- 10 books (chapters): Books I–X
- Prose dialogue — segments are sentences
- Groups correspond to paragraphs and speaker turns
- Speaker indicator lines (e.g. "Socrates - GLAUCON") stored as heading segments with group_number = NULL
- 5,325 segments total

## Context
- **Composed**: ~375 BCE
- **Genre**: Socratic dialogue / philosophy
- **Major themes**: Justice, the ideal state, philosopher-kings, the allegory of the cave, the divided line, the nature of the soul, education, censorship of art
- **Key characters**: Socrates, Glaucon, Adeimantus, Thrasymachus, Polemarchus, Cephalus

## Commentary
- None added yet

## Cover
- **Subject**: A single ancient oil lamp casting a warm glow on a rough cave wall — evoking the Allegory of the Cave
- **Generated**: 2026-03-03

## Audio Status
- No audio generated yet
