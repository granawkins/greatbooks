# Curator Skill

Plan and manage the Great Books corpus — which titles to add, where to source them, and in what order.

Compiled from two canonical collections:
- **GBWW**: Great Books of the Western World (Encyclopaedia Britannica, 1952/1990 editions, ~130 authors)
- **SJC**: St. John's College reading list (Annapolis/Santa Fe, ~150+ authors)

Focus: major literary, philosophical, and historical works that appear on one or both lists, are public domain, and work well as reading/listening experiences.

## Book ID Convention

IDs use `{author-lastname}-{short-title}` format: all lowercase, hyphens only, English. Examples:
- `homer-iliad`, `homer-odyssey`
- `plato-republic`, `plato-apology`, `plato-symposium`
- `aristotle-ethics`, `aristotle-politics`, `aristotle-poetics`
- `shakespeare-hamlet`, `shakespeare-king-lear`
- `dostoevsky-brothers-karamazov`
- `austen-pride-and-prejudice`
- `smith-wealth-of-nations`

Shorten long titles to the recognizable part (not the full subtitle).

See also: `GBWW_LIST.md` (full Britannica list), `SJC_LIST.md` (full St. John's list), `SOURCES.md` (verified URLs, translators, formats, parser requirements).

## Sources

### MIT Internet Classics Archive (classics.mit.edu)
Ancient Greek and Roman works. HTML format, one page per chapter. Free, no login.
- **Format**: `<A NAME="start">`/`<A NAME="end">` markers, `<BR><BR>` paragraph breaks
- **Genres**: prose (flowing text), verse epic (`<BR>` per line), verse drama (`<B>SPEAKER</B>` + `<BLOCKQUOTE>`)
- **Parser**: `parse_html.py --source classics` — handles prose; drama/verse need extensions
- **Limitation**: ~100KB server response limit truncates large single-page works; use `.pl.txt` fallback
- **URL quirks**: some slugs are non-obvious (Lucretius → `Carus/`, Marcus Aurelius → `Antoninus/`)
- **Coverage**: 20 Tier 1 titles across 25+ individual works

### Project Gutenberg (gutenberg.org)
Massive public-domain library. Everything pre-1928. HTML/plain text.
- **Format**: `<p>` tags, `<h2>` chapter headings, `<div class="chapter">` containers
- **Two HTML versions**: `/files/` (older, more consistent) and `/cache/epub/` (newer, has `#pg-header`/`#pg-footer`)
- **CSS classes**: `.poem` (verse), `.drama` (dialogue), `.letter` (epistolary), `.noindent`
- **Parser**: `parse_html.py --source gutenberg` — **NOT YET IMPLEMENTED**
- **Coverage**: 32 Tier 1 titles, all verified available

### Other potential sources
- Perseus Digital Library (perseus.tufts.edu) — Greek/Latin with translations
- Standard Ebooks (standardebooks.org) — beautifully formatted public domain
- Wikisource — community-transcribed public domain texts

Full details: `SOURCES.md` (verified URLs, Gutenberg IDs, translators, copyright status, format analysis).

## Tier 1: Both Lists, Public Domain, High Impact

| # | Author | Title | Lists | Source | Notes | Status |
|---|--------|-------|-------|--------|-------|--------|
| 1 | Homer | Iliad | GBWW+SJC | MIT Classics (Butler) | Greek epic | DONE |
| 2 | Homer | Odyssey | GBWW+SJC | MIT Classics (Butler) | Greek epic | DONE |
| 3 | Plato | Republic | GBWW+SJC | MIT Classics (Jowett) | Political philosophy | DONE |
| 4 | Milton | Paradise Lost | GBWW+SJC | Gutenberg (PG 26) | English epic poem | DONE |
| 5 | Aeschylus | Oresteia (Agamemnon, Libation Bearers, Eumenides) | GBWW+SJC | MIT Classics | Greek tragedy trilogy — needs drama parser | |
| 6 | Sophocles | Oedipus Rex, Oedipus at Colonus, Antigone | GBWW+SJC | MIT Classics | Theban plays — needs drama parser | |
| 7 | Euripides | Medea, Hippolytus, Bacchae | GBWW+SJC | MIT Classics | Key tragedies — needs drama parser | |
| 8 | Aristophanes | Clouds | GBWW+SJC | MIT Classics | Comedy — needs drama parser | |
| 9 | Herodotus | Histories | GBWW+SJC | MIT Classics (Rawlinson) | First history | DONE |
| 10 | Thucydides | History of the Peloponnesian War | GBWW+SJC | MIT Classics (Crawley) | Political history; Book 5 missing (different HTML format) | DONE |
| 11 | Plato | Apology, Crito, Phaedo, Symposium, Meno | GBWW+SJC | MIT Classics (Jowett) | Key dialogues beyond Republic | DONE |
| 12 | Aristotle | Nicomachean Ethics | GBWW+SJC | MIT Classics (Ross) | Ethics | DONE |
| 13 | Aristotle | Politics | GBWW+SJC | MIT Classics (Jowett) | Political philosophy | DONE |
| 14 | Aristotle | Poetics | GBWW+SJC | MIT Classics (Butcher) | Literary theory | DONE |
| 15 | Virgil | Aeneid | GBWW+SJC | MIT Classics (Dryden) | Roman epic — needs verse parser | |
| 16 | Plutarch | Lives (selections) | GBWW+SJC | MIT Classics (Dryden) | 4 lives: Lycurgus, Solon, Caesar, Antony | DONE |
| 17 | Marcus Aurelius | Meditations | GBWW+SJC | MIT Classics (Long) | Stoic philosophy | DONE |
| 18 | Epictetus | Discourses | GBWW+SJC | MIT Classics (Long) | Stoic philosophy | DONE |
| 19 | Lucretius | On the Nature of Things | GBWW+SJC | MIT Classics (Leonard) | Epicurean philosophy/poem — verse parsed as prose | DONE |
| 20 | Tacitus | Annals | GBWW+SJC | MIT Classics (Church & Brodribb) | Books 1-6 only (7-10 lost; 11-16 not on ICA) | DONE |
| 21 | Augustine | Confessions | GBWW+SJC | Gutenberg (PG 3296, Pusey) | Christian autobiography | DONE |
| 22 | Dante | Divine Comedy | GBWW+SJC | Gutenberg (PG 8800, Cary) | Medieval epic poem, 101 cantos | DONE |
| 23 | Chaucer | Canterbury Tales | GBWW+SJC | Gutenberg (PG 2383) | Middle English tales | DONE |
| 24 | Machiavelli | The Prince | GBWW+SJC | Gutenberg (PG 1232, Marriott) | Political philosophy | DONE |
| 25 | Montaigne | Essays | GBWW+SJC | Gutenberg (PG 3600, Cotton) | Complete essays, 126 chapters | DONE |
| 26 | Shakespeare | Hamlet, King Lear, Othello, Macbeth, The Tempest | GBWW+SJC | Gutenberg | 5 plays as separate books | DONE |
| 27 | Cervantes | Don Quixote | GBWW+SJC | Gutenberg (PG 996, Ormsby) | First modern novel, 143 chapters | DONE |
| 28 | Hobbes | Leviathan | GBWW+SJC | Gutenberg (PG 3207) | Political philosophy | DONE |
| 29 | Descartes | Discourse on Method | GBWW+SJC | Gutenberg (PG 59, Veitch) | Modern philosophy | DONE |
| 30 | Spinoza | Ethics | GBWW+SJC | Gutenberg (PG 3800, Elwes) | Rationalist philosophy | DONE |
| 31 | Pascal | Pensées | GBWW+SJC | Gutenberg (PG 18269, Trotter) | Religious philosophy | DONE |
| 32 | Locke | Second Treatise of Government | GBWW+SJC | Gutenberg (PG 7370) | Liberal political theory | DONE |
| 33 | Swift | Gulliver's Travels | GBWW+SJC | Gutenberg (PG 829) | Satire | DONE |
| 34 | Hume | Enquiry Concerning Human Understanding | GBWW+SJC | Gutenberg (PG 9662) | Empiricism | DONE |
| 35 | Rousseau | Social Contract | GBWW+SJC | Gutenberg (PG 46333, Cole) | Political philosophy; 1 chapter | DONE |
| 36 | Adam Smith | Wealth of Nations | GBWW+SJC | Gutenberg (PG 3300) | Economics | DONE |
| 37 | Kant | Critique of Pure Reason | GBWW+SJC | Gutenberg (PG 4280, Meiklejohn) | Critical philosophy | DONE |
| 38 | Hamilton/Madison/Jay | The Federalist | GBWW+SJC | Gutenberg (PG 18) | 87 papers | DONE |
| 39 | Goethe | Faust | GBWW+SJC | Gutenberg (PG 14591, Taylor) | German dramatic poem; 1 chapter | DONE |
| 40 | Austen | Emma / Pride and Prejudice | GBWW+SJC | Gutenberg (PG 158, 1342) | Two novels as separate books | DONE |
| 41 | Hegel | Phenomenology of Mind | GBWW+SJC | — | NOT on Gutenberg in English | UNAVAILABLE |
| 42 | Tocqueville | Democracy in America | GBWW+SJC | Gutenberg (PG 815+816, Reeve) | 2 volumes combined | DONE |
| 43 | Kierkegaard | Fear and Trembling | GBWW+SJC | Gutenberg (PG 45868, Lowrie) | Existentialism; 1 chapter | DONE |
| 44 | Eliot (George) | Middlemarch | GBWW+SJC | Gutenberg (PG 145) | Victorian novel, 87 chapters | DONE |
| 45 | Melville | Moby Dick | GBWW+SJC | Gutenberg (PG 2701) | American novel, 138 chapters | DONE |
| 46 | Dostoevsky | Brothers Karamazov | GBWW+SJC | Gutenberg (PG 28054, Garnett) | Russian novel, 98 chapters | DONE |
| 47 | Tolstoy | War and Peace | GBWW+SJC | Gutenberg (PG 2600, Maude) | Russian novel, 365 chapters | DONE |
| 48 | Darwin | Origin of Species | GBWW+SJC | Gutenberg (PG 22764) | Natural science | DONE |
| 49 | Marx | Capital (selections) | GBWW+SJC | — | NOT on Gutenberg in English | UNAVAILABLE |
| 50 | Nietzsche | Beyond Good and Evil | GBWW+SJC | Gutenberg (PG 4363, Zimmern) | Philosophy | DONE |
| 51 | Twain | Adventures of Huckleberry Finn | GBWW+SJC | Gutenberg (PG 76) | American novel | DONE |
| 52 | Conrad | Heart of Darkness | GBWW+SJC | Gutenberg (PG 219) | Novella (d.1924, PD) | DONE |

## Tier 2: One List Only, Public Domain, High Impact

| # | Author | Title | List | Source | Notes | Status |
|---|--------|-------|------|--------|-------|--------|
| 53 | Aeschylus | Prometheus Bound | GBWW+SJC | MIT Classics | Often grouped with Oresteia | |
| 54 | Euclid | Elements (selections) | GBWW+SJC | MIT Classics | Mathematics — reading challenge | |
| 55 | Bacon | Novum Organum | GBWW+SJC | Gutenberg | Scientific method | |
| 56 | Rabelais | Gargantua and Pantagruel | GBWW | Gutenberg | Renaissance satire | |
| 57 | Moliere | Tartuffe, The Misanthrope | GBWW+SJC | Gutenberg | French comedy | |
| 58 | Racine | Phedre | GBWW+SJC | Gutenberg | French tragedy | |
| 59 | Voltaire | Candide | GBWW+SJC | Gutenberg | Satire | |
| 60 | Dickens | Little Dorrit | GBWW | Gutenberg | Victorian novel | |
| 61 | Ibsen | A Doll's House, Hedda Gabler | GBWW | Gutenberg | Modern drama | |
| 62 | Hawthorne | The Scarlet Letter | SJC | Gutenberg | American novel | |
| 63 | Balzac | Cousin Bette | GBWW | Gutenberg | French novel | |
| 64 | Boswell | Life of Samuel Johnson | GBWW | Gutenberg | Biography | |
| 65 | Gibbon | Decline and Fall (selections) | GBWW+SJC | Gutenberg | History | |
| 66 | Montesquieu | Spirit of the Laws | GBWW | Gutenberg | Political philosophy | |

## Tier 3: 20th Century (Copyright Concerns)

May need to find PD editions or skip.

| Author | Title | Lists | Copyright Status |
|--------|-------|-------|-----------------|
| Freud | Introductory Lectures | GBWW+SJC | Mixed — some translations PD |
| Woolf | To the Lighthouse, Mrs. Dalloway | GBWW+SJC | Copyrighted (d.1941) |
| Joyce | Portrait of the Artist as a Young Man | GBWW+SJC | May be PD (pub 1916) |
| Kafka | The Metamorphosis | GBWW | Some translations PD |
| Faulkner | Go Down, Moses | SJC | Copyrighted |
| Hemingway | Short stories | GBWW | Copyrighted |
| Fitzgerald | The Great Gatsby | GBWW | Recently entered PD (2021) |
| Orwell | Animal Farm | GBWW | PD in some countries |
| Beckett | Waiting for Godot | GBWW+SJC | Copyrighted |
| Eliot (T.S.) | The Waste Land | GBWW+SJC | Recently entered PD (2023) |
| Camus | The Stranger | SJC | Copyrighted |
| Beauvoir | The Second Sex | SJC | Copyrighted |
| Arendt | The Human Condition | SJC | Copyrighted |
| Morrison | Song of Solomon | SJC | Copyrighted |

## Next Steps

**ICA remaining (need parser extensions):**
- Drama parser: Oresteia, Oedipus trilogy, Euripides plays, Aristophanes Clouds
- Verse parser: Aeneid (verse epic with `<BR>` line breaks)

**Unavailable on Gutenberg:**
- Hegel's Phenomenology of Mind — not available in English on PG
- Marx's Capital — not available in English on PG
- Both may be findable on other sources (Standard Ebooks, Internet Archive)

**Improvements to existing ingestions:**
- Some books parsed as single chapter (King Lear, Rousseau, Faust, Kierkegaard) — could refine parser for non-standard heading structures
- Some title-page stubs as first chapters — could filter out

## Batch Ingestion

**ICA script**: `.claude/skills/add-book/add_ica_books.py`
```bash
.venv/bin/python .claude/skills/add-book/add_ica_books.py           # all books
.venv/bin/python .claude/skills/add-book/add_ica_books.py --dry-run # test without DB insert
.venv/bin/python .claude/skills/add-book/add_ica_books.py --only homer-odyssey  # single book
```

**Gutenberg script**: `.claude/skills/add-book/add_gutenberg_books.py`
```bash
.venv/bin/python .claude/skills/add-book/add_gutenberg_books.py           # all books
.venv/bin/python .claude/skills/add-book/add_gutenberg_books.py --dry-run # test without DB insert
.venv/bin/python .claude/skills/add-book/add_gutenberg_books.py --only melville-moby-dick  # single book
```

Both scripts skip books already in DB. Logs every step.

## Statistics
- Tier 1: 52 titles (both lists, public domain) — 50 done, 2 unavailable (Hegel, Marx)
- Tier 2: 14 titles (one list, public domain)
- Tier 3: 14+ titles (20th century, copyright issues)
- Total in DB: 54 books, 1,858 chapters, ~364,000 segments
- ICA prose titles: all 16 done
- ICA drama/verse titles: 6 remaining (need parser extensions)
- Gutenberg titles: all 36 done (34 Tier 1 + 2 Austen novels)
