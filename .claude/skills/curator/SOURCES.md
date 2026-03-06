# Source Availability & Format Reference

Verified 2026-03-06. Every Tier 1 title has been confirmed available.

## Source Format Comparison

### MIT Internet Classics Archive (ICA)
- **URL pattern**: `classics.mit.edu/<Author>/<work>.<book>.<numeral>.html` (multi-book) or `classics.mit.edu/<Author>/<work>.html` (single)
- **Content delimiters**: `<A NAME="start">` / `<A NAME="end">`
- **Paragraph separator**: `<BR><BR>` (universal across all works)
- **Line numbering**: `<A NAME="N">` anchors throughout
- **Truncation**: ~100KB server response limit — affects longer single-page works. Use `.pl.txt` or `.mb.txt` plain-text fallback.
- **Parser**: `parse_html.py --source classics` (implemented, handles prose; needs extension for drama/verse)

**Three genre variants:**
| Genre | Line breaks | Speaker markup | Examples |
|-------|-----------|----------------|----------|
| Prose | None (flowing text) | None | Odyssey, Apology, Histories, Meditations, Ethics |
| Verse epic | `<BR>` per line | None (dialogue inline) | Aeneid, Iliad |
| Verse drama | `<BR>` per line | `<B>SPEAKER</B>` + `<BLOCKQUOTE>` | Oedipus, Agamemnon, Medea |

Drama also has: `<I>stage directions</I>`, `<I>strophe 1</I>` for choral odes, Dramatis Personae sections.

### Project Gutenberg
- **URL patterns**: `/files/{id}/{id}-h/{id}-h.htm` (older, more consistent) or `/cache/epub/{id}/pg{id}-images.html` (newer)
- **Content delimiters**: `*** START OF THE PROJECT GUTENBERG EBOOK ***` / `*** END OF ***` text markers; newer format also has `<div id="pg-header">` / `<div id="pg-footer">`
- **Chapters**: `<h2>` tags, often wrapped in `<div class="chapter">`
- **Paragraphs**: `<p>` tags with CSS classes: `.noindent`, `.poem`, `.letter`, `.drama`
- **Verse lines**: `<br>` within `<p>` tags
- **Parser**: `parse_html.py --source gutenberg` (NOT YET IMPLEMENTED)

**Key CSS classes across Gutenberg works:**
- Default `<p>` = prose paragraph (text-indent: 1em)
- `.poem` = verse passage (10% left margin)
- `.drama` = dialogue (zero indent, `.charname` for speakers)
- `.letter` = epistolary content (indented both sides)
- `.noindent` = paragraph without first-line indent

**Heading hierarchy varies:**
- 1 level: Pride and Prejudice, Moby Dick, The Prince
- 2 levels: Paradise Lost (books), Divine Comedy (part > canto), Hamlet (act > scene)
- 3 levels: Brothers Karamazov (part > book > chapter), Don Quixote (part > chapter)

---

## ICA Tier 1 — Verified URLs & Translators

### Key: URL slug lookups
Some ICA URL slugs are non-obvious:
- Marcus Aurelius → `Antoninus/meditations`
- Lucretius → `Carus/nature_things` (full name: Titus Lucretius Carus)
- Thucydides → `Thucydides/pelopwar` (not `pelam`)
- Aristotle Ethics → `Aristotle/nicomachaen` (not `nicomacha`)

| # | Author | Title | ICA URL slug | Translator | Translator dates | PD? | Genre | Books/Pages |
|---|--------|-------|-------------|-----------|-----------------|-----|-------|------------|
| 1 | Homer | Iliad | `Homer/iliad` | Samuel Butler | 1835–1902 | Yes | Prose epic | 24 books |
| 2 | Homer | Odyssey | `Homer/odyssey` | Samuel Butler | 1835–1902 | Yes | Prose epic | 24 books |
| 3 | Plato | Republic | `Plato/republic` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 10 books |
| 5a | Aeschylus | Agamemnon | `Aeschylus/agamemnon` | E. D. A. Morshead | 1849–1912 | Yes | Verse drama | 1 page |
| 5b | Aeschylus | Libation Bearers | `Aeschylus/choephori` | E. D. A. Morshead | 1849–1912 | Yes | Verse drama | 1 page |
| 5c | Aeschylus | Eumenides | `Aeschylus/eumenides` | E. D. A. Morshead | 1849–1912 | Yes | Verse drama | 1 page |
| 6a | Sophocles | Oedipus Rex | `Sophocles/oedipus` | F. Storr | 1839–1919 | Yes | Verse drama | 1 page |
| 6b | Sophocles | Oedipus at Colonus | `Sophocles/colonus` | F. Storr | 1839–1919 | Yes | Verse drama | 1 page |
| 6c | Sophocles | Antigone | `Sophocles/antigone` | R. C. Jebb | 1841–1905 | Yes | Verse drama | 1 page |
| 7a | Euripides | Medea | `Euripides/medea` | E. P. Coleridge | fl. 1891 | Yes | Verse drama | 1 page |
| 7b | Euripides | Hippolytus | `Euripides/hippolytus` | E. P. Coleridge | fl. 1891 | Yes | Verse drama | 1 page |
| 7c | Euripides | Bacchae | `Euripides/bacchan` | E. P. Coleridge | fl. 1891 | Yes | Verse drama | 1 page |
| 8 | Aristophanes | Clouds | `Aristophanes/clouds` | anon (prob. B. B. Rogers) | d. 1919 | Yes | Verse comedy | 1 page |
| 9 | Herodotus | Histories | `Herodotus/history` | George Rawlinson | 1812–1902 | Yes | Prose history | 9 books |
| 10 | Thucydides | Peloponnesian War | `Thucydides/pelopwar` | Richard Crawley | 1840–1893 | Yes | Prose history | 8 books |
| 11a | Plato | Apology | `Plato/apology` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 1 page |
| 11b | Plato | Crito | `Plato/crito` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 1 page |
| 11c | Plato | Phaedo | `Plato/phaedo` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 1 page |
| 11d | Plato | Symposium | `Plato/symposium` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 1 page |
| 11e | Plato | Meno | `Plato/meno` | Benjamin Jowett | 1817–1893 | Yes | Prose dialogue | 1 page |
| 12 | Aristotle | Nicomachean Ethics | `Aristotle/nicomachaen` | W. D. Ross | 1877–1971 | Yes* | Prose philosophy | 10 books |
| 13 | Aristotle | Politics | `Aristotle/politics` | Benjamin Jowett | 1817–1893 | Yes | Prose philosophy | 8 books |
| 14 | Aristotle | Poetics | `Aristotle/poetics` | S. H. Butcher | 1850–1910 | Yes | Prose philosophy | 1 page |
| 15 | Virgil | Aeneid | `Virgil/aeneid` | John Dryden | 1631–1700 | Yes | Verse epic | 12 books |
| 16 | Plutarch | Lives (selections) | `Plutarch/lycurgus` etc. | John Dryden | 1631–1700 | Yes | Prose biography | Multiple |
| 17 | Marcus Aurelius | Meditations | `Antoninus/meditations` | George Long | 1800–1879 | Yes | Prose philosophy | 12 books |
| 18 | Epictetus | Discourses | `Epictetus/discourses` | George Long | 1800–1879 | Yes | Prose philosophy | 4 books |
| 19 | Lucretius | On the Nature of Things | `Carus/nature_things` | William Ellery Leonard | 1876–1944 | Yes* | Verse philosophy | 6 books |
| 20 | Tacitus | Annals | `Tacitus/annals` | Alfred John Church & W. J. Brodribb | fl. 1876 | Yes | Prose history | 16 books |

\* W. D. Ross translation published 1925 (PD in US). Leonard translation published 1916 (PD).

### ICA Truncation Risk
Works served as a single HTML page (dramas, short dialogues) may hit the ~100KB limit. Known truncated:
- Oedipus Rex (~101KB)
- Agamemnon (~101KB)

Use `.pl.txt` plain-text fallback for these. Multi-book works (one page per book) are safe.

---

## Gutenberg Tier 1 — Verified IDs & Translators

| # | Author | Title | PG ID | Translator | Translator dates | PD? | Genre | Format notes |
|---|--------|-------|-------|-----------|-----------------|-----|-------|-------------|
| 4 | Milton | Paradise Lost | 26 | N/A (English original) | — | Yes | Verse epic | `<div class="chapter">`, `<br>` per line |
| 21 | Augustine | Confessions | 3610 | E. B. Pusey | 1800–1882 | Yes | Prose | |
| 22 | Dante | Divine Comedy | 8800 | Rev. H. F. Cary | 1772–1844 | Yes | Verse epic | 3 parts × ~33 cantos |
| 23 | Chaucer | Canterbury Tales | 8789 | N/A (Middle English original) | — | Yes | Verse tales | |
| 24 | Machiavelli | The Prince | 1232 | W. K. Marriott | fl. 1908 | Yes | Prose philosophy | 26 chapters |
| 25 | Montaigne | Essays | 1615 | Charles Cotton | 1630–1687 | Yes | Prose essays | Multiple volumes |
| 26a | Shakespeare | Hamlet | 1524 | N/A (English original) | — | Yes | Verse drama | 5 acts |
| 26b | Shakespeare | King Lear | 1128 | N/A (English original) | — | Yes | Verse drama | epub format only |
| 26c | Shakespeare | Othello | 1531 | N/A (English original) | — | Yes | Verse drama | 5 acts |
| 26d | Shakespeare | Macbeth | 1533 | N/A (English original) | — | Yes | Verse drama | 5 acts |
| 26e | Shakespeare | The Tempest | 23042 | N/A (English original) | — | Yes | Verse drama | 5 acts |
| 27 | Cervantes | Don Quixote | 996 | John Ormsby | 1829–1895 | Yes | Prose novel | 2 parts, 126 chapters |
| 28 | Hobbes | Leviathan | 3600 | N/A (English original) | — | Yes | Prose philosophy | 4 parts |
| 29 | Descartes | Discourse on Method | 59 | John Veitch | 1829–1894 | Yes | Prose philosophy | 6 parts |
| 30 | Spinoza | Ethics | 3800 | R. H. M. Elwes | fl. 1883 | Yes | Prose philosophy | 5 parts |
| 31 | Pascal | Pensees | 18269 | W. F. Trotter | fl. 1910 | Yes | Prose philosophy | ~14 sections |
| 32 | Locke | Second Treatise | 7370 | N/A (English original) | — | Yes | Prose philosophy | 19 chapters |
| 33 | Swift | Gulliver's Travels | 829 | N/A (English original) | — | Yes | Prose satire | 4 parts |
| 34 | Hume | Enquiry | 9662 | N/A (English original) | — | Yes | Prose philosophy | 12 sections |
| 35 | Rousseau | Social Contract | 46333 | G. D. H. Cole | 1889–1959 | Yes* | Prose philosophy | 4 books |
| 36 | Adam Smith | Wealth of Nations | 3300 | N/A (English original) | — | Yes | Prose economics | 5 books |
| 37 | Kant | Critique of Pure Reason | 4280 | J. M. D. Meiklejohn | 1830–1902 | Yes | Prose philosophy | |
| 38 | Hamilton et al | The Federalist | 18 | N/A (English original) | — | Yes | Prose politics | 85 papers |
| 39 | Goethe | Faust | 14591 | Bayard Taylor | 1825–1878 | Yes | Verse drama | 2 parts |
| 40a | Austen | Pride and Prejudice | 1342 | N/A (English original) | — | Yes | Prose novel | 61 chapters |
| 40b | Austen | Emma | 158 | N/A (English original) | — | Yes | Prose novel | 55 chapters |
| 41 | Hegel | Phenomenology of Mind | 3700 | J. B. Baillie | 1872–1940 | Yes* | Prose philosophy | |
| 42a | Tocqueville | Democracy in America v1 | 815 | Henry Reeve | 1813–1895 | Yes | Prose politics | |
| 42b | Tocqueville | Democracy in America v2 | 816 | Henry Reeve | 1813–1895 | Yes | Prose politics | |
| 43 | Kierkegaard | Fear and Trembling | 45868 | Walter Lowrie | 1868–1959 | Yes* | Prose philosophy | |
| 44 | Eliot (George) | Middlemarch | 145 | N/A (English original) | — | Yes | Prose novel | 86 chapters |
| 45 | Melville | Moby Dick | 2701 | N/A (English original) | — | Yes | Prose novel | 135 chapters |
| 46 | Dostoevsky | Brothers Karamazov | 28054 | Constance Garnett | 1861–1946 | Yes* | Prose novel | 4 parts, 12 books |
| 47 | Tolstoy | War and Peace | 2600 | Aylmer & Louise Maude | fl. 1904 | Yes | Prose novel | 4 books + epilogues |
| 48 | Darwin | Origin of Species | 22764 | N/A (English original) | — | Yes | Prose science | 15 chapters |
| 49 | Marx | Capital (vol 1) | 3202 | Samuel Moore & Edward Aveling | fl. 1887 | Yes | Prose economics | epub format only |
| 50 | Nietzsche | Beyond Good and Evil | 7205 | Helen Zimmern | 1846–1934 | Yes | Prose philosophy | 9 chapters |
| 51 | Twain | Huckleberry Finn | 76 | N/A (English original) | — | Yes | Prose novel | 43 chapters |
| 52 | Conrad | Heart of Darkness | 219 | N/A (English original) | — | Yes | Prose novella | 3 parts |

\* These translations were published before 1928 and are PD in the US, though the translators died after 1928. Gutenberg hosts them, confirming PD status.

### Gutenberg Format Notes
- **IDs 1128, 3202**: Only available via `/cache/epub/` format (newer HTML), not `/files/` format
- **Older format** (`/files/`): `<div class="chapter">`, more consistent CSS classes
- **Newer format** (`/cache/epub/`): `<div id="pg-header">`, heading IDs, may include page number spans

---

## Parser Requirements

### Current state
- `parse_html.py --source classics`: Handles ICA prose (Iliad, Republic). Single or multi-file input.
- `parse_html.py --source gutenberg`: **Stub — not implemented**

### ICA parser extensions needed
1. **Verse detection**: Distinguish `<BR>` (line break within verse) from `<BR><BR>` (paragraph break)
2. **Drama support**: Parse `<B>SPEAKER</B>` as heading segments, `<BLOCKQUOTE>` content as speech text
3. **Stage direction support**: Parse `<I>stage directions</I>` (may map to heading or annotation type)
4. **Truncation fallback**: Detect missing `<A NAME="end">` and fall back to `.pl.txt` download

### Gutenberg parser needs
1. **Boilerplate stripping**: Find content between `*** START OF` / `*** END OF` markers (or `#pg-header`/`#pg-footer`)
2. **Chapter detection**: Split on `<h2>` tags (and `<h3>` for acts/scenes/cantos)
3. **Paragraph extraction**: Parse `<p>` tags; use class to distinguish prose/poetry/drama/letters
4. **Verse line handling**: `<br>` within `<p>` = individual verse lines
5. **Heading hierarchy**: Use text content ("Chapter", "Book", "Part", "Canto", "Act") not just tag level

### Unified pipeline vision
Both sources ultimately produce the same output: `{chapters: [{title, groups: [{type, segments}]}]}`. The format differences are in HTML parsing, not in the output schema. A single `parse_html.py` with `--source classics|gutenberg` covering both formats would handle all 66 Tier 1+2 titles.
