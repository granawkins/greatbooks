# Manual Content Fixes

Post-ingestion fixes applied by hand to individual books. Grouped by type.

## Frontend Changes

- **Book header redesign**: Large centered title + metadata (author, date, translator, source link) when at top of page. Collapses to sticky compact header with back button on scroll. Chapter selector button next to title in both states. Hidden for single-chapter books.
- **Verse layout**: Added `layout` column to `books` table (`prose`/`verse`). Verse books render segments on separate lines instead of flowing together. Set to `verse`: all 5 Shakespeare, Paradise Lost, Divine Comedy, Canterbury Tales, Faust, Lucretius.
- **Single-chapter books**: No chapter divider or chapter selector button shown.
- **Heading `whiteSpace: pre-line`**: Headings now respect `\n` for multi-line content (dramatis personae, etc.).

## Removed Preamble/Title-Page Chapters

Deleted front-matter chapters that were publisher info, editorial notes, or title pages:

- **Paradise Lost**: Removed "Introduction (one page)" chapter
- **Augustine Confessions**: Removed "By Saint Augustine" title page chapter
- **Canterbury Tales**: Removed "of Geoffrey Chaucer", "PREFACE.", "LIFE OF GEOFFREY CHAUCER." chapters
- **Leviathan**: Removed "By Thomas Hobbes: 1651" title page chapter
- **Spinoza Ethics**: Removed "(Ethica Ordine Geometrico Demonstrata)" and "Benedict de Spinoza" chapters
- **Locke Second Treatise**: Removed "by JOHN LOCKE" and "BY IOHN LOCKE" chapters

## Merged Intro Sections into Single Chapter

Where multiple front-matter sections were parsed as separate chapters, merged them into one with titles as inline headings:

- **The Prince**: Chapters 2-5 (Youth, Office, Literature and Death, The Man and His Works) merged into "Introduction"
- **Montaigne Essays**: Chapters 2-18 (Life of Montaigne + 16 dedicatory letters) merged into "Preface"; deleted "Essays of Michel de Montaigne" title chapter
- **Don Quixote**: Chapters 2-14 (Cervantes, Don Quixote, Author's Preface, verse dedications, Dialogue) merged into "Prefaratory"

## Fixed Chapter Titles

- **Aristotle Politics**: "Unknown" → "Book I" through "Book VIII"
- **Thucydides**: "Unknown" → "Book I" through "Book VII"
- **Marcus Aurelius Meditations**: "Unknown" → "Book 1" through "Book 12"
- **Epictetus Discourses**: "Unknown" → "Book I" through "Book IV"
- **Herodotus Histories**: Muse names (Clio, Euterpe, etc.) moved from first text segment to chapter title (e.g. "Book 1: Clio")
- **Tacitus Annals**: Date ranges moved from first text segment to chapter title (e.g. "Book I (A.D. 14–15)")

## Dramatis Personae Formatting

Converted run-together "Persons of the Dialogue" text segments into single `heading` segments with line breaks:

- **Plato Crito, Phaedo, Symposium, Meno**: Dramatis personae with character names, scene, place
- **Macbeth**: Full dramatis personae list consolidated into one heading

## Deleted Stray Segments

- **Plato Apology**: Removed "Socrates' Defense" (title line parsed as body text)

## Section Labels to Headings

- **Lucretius**: "Proem" text segments at start of each book → heading type

## Re-ingested from Better Sources

- **Plato Phaedo**: Original ICA source truncated at ~100KB. Re-ingested from Gutenberg PG 1658 (Jowett). 799 → 1649 segments.
- **Plato Symposium**: Same truncation issue. Re-ingested from Gutenberg PG 1600 (Jowett). 683 → 822 segments.
- **Shakespeare The Tempest**: Original PG 23042 was badly formatted (First Folio transcription). Re-ingested from PG 1540 (clean Globe edition). 5 acts with scene headings.
- **Rousseau Social Contract**: Original PG 46333 parsed as single chapter with spacing issues. Custom re-parsed from same source with proper chapter splitting (Introduction + Books I–IV). Removed extra Discourses bundled in that edition.

## Shakespeare Stage Directions

- **Missing spaces**: All 5 Shakespeare plays had concatenated stage directions (e.g. "EnterHoratioandMarcellus."). Fixed programmatically: camelCase split + "and"/"with" word boundary detection. ~310 segments fixed.
- **Square brackets**: Wrapped all Enter/Exit/Exeunt/Re-enter stage directions in `[brackets]`. ~382 segments.

## King Lear Restructuring

- Removed extensive editorial preamble (Executive Director's notes, Scanner's notes, etc.)
- Split from single "Full Text" chapter into 5 acts (Act I–V)
- Converted "Scoena Prima", "Scena Secunda" etc. to heading segments within each act
