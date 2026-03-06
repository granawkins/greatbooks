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
| 2 | Homer | Odyssey | GBWW+SJC | MIT Classics (Butler) | Greek epic | |
| 3 | Plato | Republic | GBWW+SJC | MIT Classics (Jowett) | Political philosophy | DONE |
| 4 | Milton | Paradise Lost | GBWW+SJC | Gutenberg | English epic poem | |
| 5 | Aeschylus | Oresteia (Agamemnon, Libation Bearers, Eumenides) | GBWW+SJC | MIT Classics | Greek tragedy trilogy | |
| 6 | Sophocles | Oedipus Rex, Oedipus at Colonus, Antigone | GBWW+SJC | MIT Classics | Theban plays | |
| 7 | Euripides | Medea, Hippolytus, Bacchae | GBWW+SJC | MIT Classics | Key tragedies | |
| 8 | Aristophanes | Clouds | GBWW+SJC | MIT Classics | Comedy | |
| 9 | Herodotus | Histories | GBWW+SJC | MIT Classics | First history | |
| 10 | Thucydides | History of the Peloponnesian War | GBWW+SJC | MIT Classics | Political history | |
| 11 | Plato | Apology, Crito, Phaedo, Symposium, Meno | GBWW+SJC | MIT Classics (Jowett) | Key dialogues beyond Republic | |
| 12 | Aristotle | Nicomachean Ethics | GBWW+SJC | MIT Classics | Ethics | |
| 13 | Aristotle | Politics | GBWW+SJC | MIT Classics | Political philosophy | |
| 14 | Aristotle | Poetics | GBWW+SJC | MIT Classics | Literary theory | |
| 15 | Virgil | Aeneid | GBWW+SJC | MIT Classics | Roman epic | |
| 16 | Plutarch | Lives (selections) | GBWW+SJC | MIT Classics | Parallel biographies | |
| 17 | Marcus Aurelius | Meditations | GBWW+SJC | MIT Classics | Stoic philosophy | |
| 18 | Epictetus | Discourses | GBWW+SJC | MIT Classics | Stoic philosophy | |
| 19 | Lucretius | On the Nature of Things | GBWW+SJC | MIT Classics | Epicurean philosophy/poem | |
| 20 | Tacitus | Annals | GBWW+SJC | MIT Classics | Roman history | |
| 21 | Augustine | Confessions | GBWW+SJC | Gutenberg | Christian autobiography | |
| 22 | Dante | Divine Comedy | GBWW+SJC | Gutenberg | Medieval epic poem | |
| 23 | Chaucer | Canterbury Tales | GBWW+SJC | Gutenberg | Middle English tales | |
| 24 | Machiavelli | The Prince | GBWW+SJC | Gutenberg | Political philosophy | |
| 25 | Montaigne | Essays (selections) | GBWW+SJC | Gutenberg | Personal essays | |
| 26 | Shakespeare | Hamlet, King Lear, Othello, Macbeth, The Tempest | GBWW+SJC | Gutenberg | Major tragedies + romance | |
| 27 | Cervantes | Don Quixote | GBWW+SJC | Gutenberg | First modern novel | |
| 28 | Hobbes | Leviathan | GBWW+SJC | Gutenberg | Political philosophy | |
| 29 | Descartes | Discourse on Method, Meditations | GBWW+SJC | Gutenberg | Modern philosophy | |
| 30 | Spinoza | Ethics | GBWW+SJC | Gutenberg | Rationalist philosophy | |
| 31 | Pascal | Pensees | GBWW+SJC | Gutenberg | Religious philosophy | |
| 32 | Locke | Second Treatise of Government | GBWW+SJC | Gutenberg | Liberal political theory | |
| 33 | Swift | Gulliver's Travels | GBWW+SJC | Gutenberg | Satire | |
| 34 | Hume | Enquiry Concerning Human Understanding | GBWW+SJC | Gutenberg | Empiricism | |
| 35 | Rousseau | Social Contract | GBWW+SJC | Gutenberg | Political philosophy | |
| 36 | Adam Smith | Wealth of Nations | GBWW+SJC | Gutenberg | Economics | |
| 37 | Kant | Critique of Pure Reason | GBWW+SJC | Gutenberg | Critical philosophy | |
| 38 | Hamilton/Madison/Jay | The Federalist | GBWW+SJC | Gutenberg | American political thought | |
| 39 | Goethe | Faust | GBWW+SJC | Gutenberg | German dramatic poem | |
| 40 | Austen | Emma / Pride and Prejudice | GBWW+SJC | Gutenberg | English novel | |
| 41 | Hegel | Phenomenology of Mind | GBWW+SJC | Gutenberg | Idealist philosophy | |
| 42 | Tocqueville | Democracy in America | GBWW+SJC | Gutenberg | Political analysis | |
| 43 | Kierkegaard | Fear and Trembling | GBWW+SJC | Gutenberg | Existentialism | |
| 44 | Eliot (George) | Middlemarch | GBWW+SJC | Gutenberg | Victorian novel | |
| 45 | Melville | Moby Dick | GBWW+SJC | Gutenberg | American novel | |
| 46 | Dostoevsky | Brothers Karamazov | GBWW+SJC | Gutenberg | Russian novel | |
| 47 | Tolstoy | War and Peace | GBWW+SJC | Gutenberg | Russian novel | |
| 48 | Darwin | Origin of Species | GBWW+SJC | Gutenberg | Natural science | |
| 49 | Marx | Capital (selections) | GBWW+SJC | Gutenberg | Political economy | |
| 50 | Nietzsche | Beyond Good and Evil | GBWW+SJC | Gutenberg | Philosophy | |
| 51 | Twain | Adventures of Huckleberry Finn | GBWW+SJC | Gutenberg | American novel | |
| 52 | Conrad | Heart of Darkness | GBWW+SJC | Gutenberg | Novella (d.1924, PD) | |

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

## Recommended Implementation Order

**Phase 1 — Greek Classics (MIT Classics, same pipeline as Iliad/Odyssey):**
Oresteia, Oedipus trilogy, Medea/Bacchae, Apology+Crito+Phaedo, Symposium, Nicomachean Ethics

**Phase 2 — Roman Classics (MIT Classics):**
Aeneid, Meditations, Lucretius, Plutarch Lives (selections)

**Phase 3 — Medieval/Renaissance (Gutenberg, new parser needed):**
Divine Comedy, Canterbury Tales, The Prince, Don Quixote

**Phase 4 — Early Modern Philosophy (Gutenberg):**
Leviathan, Discourse on Method, Pensees, Social Contract, Wealth of Nations

**Phase 5 — Modern Literature (Gutenberg):**
Shakespeare plays, Gulliver's Travels, Pride and Prejudice, Middlemarch, Huckleberry Finn

**Phase 6 — 19th Century Giants (Gutenberg):**
Moby Dick, Brothers Karamazov, War and Peace, Faust

## Statistics
- Tier 1: 52 titles (both lists, public domain) — 2 done
- Tier 2: 14 titles (one list, public domain)
- Tier 3: 14+ titles (20th century, copyright issues)
- Total unique public domain titles: ~66
