# Sources & Catalog

How we chose which books to publish, and the reference data we used.

## The catalog

**`index.html`** — open in a browser to see all 124 titles with pipeline status, Goodreads ratings, and source links. Self-contained, no server needed.

Data fields per book: title, author, year, Goodreads rating + number of ratings, source URL, pipeline stages (Text/Audio/Research/Guide). Edit the `BOOKS` array in the HTML directly.

---

## How we built the list

### Phase 1: Academic canon (early 2026)

The original corpus was drawn from two academic "great books" programs:

- **Great Books of the Western World** (Encyclopaedia Britannica, 1952 & 1990 editions) — the Adler/Hutchins canon. 54 volumes, ~130 distinct works spanning Homer to Freud.
- **St. John's College Reading List** — the four-year undergraduate curriculum. ~300 works including scientific papers, music, and poetry alongside literature and philosophy.

We cross-referenced these with available public-domain sources (MIT Internet Classics Archive, Project Gutenberg) and ingested 54 books into the main database. The selection was **heavily weighted toward philosophy and ancient texts** — Plato (6 dialogues), Aristotle (3 works), plus Stoics, political philosophy, and Enlightenment thinkers. Only a handful of novels.

This was appropriate for the initial "courses" feature (Ancient Epics, Examined Life, How to Live) but too narrow for a general-audience literary platform.

### Phase 2: Popular + public domain (March 2026)

To build a broader catalog, we cross-referenced three popularity-based lists, filtered to US public domain:

1. **Modern Library 100 Best Novels** — 1998 board vote, English-language 20th-century novels
2. **Project Gutenberg Top 100** — daily download rankings (fetched 2026-03-23)
3. **thegreatestbooks.org** — aggregates ~130 "best of" lists from major publications

Starting from ~146 titles in the union (filtered to PD), we removed:
- **Duplicates** (7) — variant titles for same work; kept the fuller title
- **Not-a-book** (9) — short stories, poetry anthologies, reference works unsuitable for audiobook format
- **Popular but not canonical** (9) — Gutenberg downloads that aren't "great literature" (Smollett novels, The King in Yellow, etc.)

Then added 3 titles not on the lists but clearly missing: Descartes (Discourse on the Method, Meditations on First Philosophy) and Goethe (Sorrows of Young Werther).

**Result:** 124 titles, ~750 BC to 1930. Skews toward novels post-1800 because the popularity lists do, but retains the philosophy/non-fiction core from Phase 1.

### Goodreads data

Ratings and review counts scraped from goodreads.com on 2026-03-23 via search page scraping (no API — Goodreads shut down their API). For each book, we took the edition with the most ratings. Data is a snapshot; not automatically updated.

---

## Sources consulted

### Used in the catalog

| Source | What it is | How we accessed it | Notes |
|--------|-----------|-------------------|-------|
| **Modern Library 100 Best Novels** | 1998 board vote, 100 English-language 20th-century novels | Hardcoded from training data; modernlibrary.com redirects to Penguin Random House | ~22 titles pre-1928 PD |
| **Project Gutenberg Top 100** | Daily download rankings | WebFetch on `gutenberg.org/browse/scores/top` (2026-03-23) | Snapshot; changes daily. Many non-literary works in top 100 |
| **thegreatestbooks.org** | Aggregation of ~130 "best of" lists | Cloudflare-blocked; used training data + spot checks | Most comprehensive aggregator but not directly fetchable |
| **Goodreads** | User ratings and review counts | WebFetch on search pages (2026-03-23) | No API; scraped search results, picked edition with most ratings |
| **Project Gutenberg** (as text source) | Public domain ebook repository | Individual book pages via `gutenberg.org/ebooks/{ID}` | Primary text source for ~100 books |
| **MIT Internet Classics Archive** | Greek/Roman classics | `classics.mit.edu/{Author}/{work}.html` | 6 works; ~100KB page limit can truncate long single-page works |
| **Standard Ebooks** | Professionally formatted PD ebooks | `standardebooks.org/ebooks/{path}` | Used for 2 books (Tolstoy short fiction, Woolf) not on Gutenberg |
| **Internet Archive** | Digital library with controlled lending | `archive.org/details/{id}` | Used for 2 books (Faulkner, Huxley) not yet on Gutenberg |

### Used in Phase 1 (now superseded)

| Source | What it is | How we accessed it | Disposition |
|--------|-----------|-------------------|-------------|
| **GBWW_LIST.md** | Complete Britannica Great Books list (1952 + 1990) | Scraped from Wikipedia via curl + Python HTML parsing (2026-03-05) | Informed Phase 1 selection; no longer used directly |
| **SJC_LIST.md** | St. John's College reading list | Scraped from sjc.edu (2026-03-05) | Same |
| **SOURCES.md** | Verified URLs and format notes for ICA + Gutenberg sources | Hand-compiled (2026-03-06) | Parser guidance; still useful for text ingestion |
| **CORPUS_LISTS.md** | Cross-reference table of all lists + PD candidates | Hand-compiled (2026-03-22) | Superseded by the catalog |

### Recorded but not used

| Source | Why not |
|--------|--------|
| **Penguin Classics catalog** | Considered as a "brand signal" for canonical status; never systematically scraped |
| **Wikipedia "100 best" lists** | Accessed for Modern Library data but blocked for direct list extraction (403) |
| **Faded Page** (fadedpage.com) | Canadian PD ebook site; not needed — Gutenberg covered all but 4 titles |

---

## Manual content fixes

Post-ingestion fixes applied to Phase 1 books in the main database. See `MANUAL_FIXES.md` for the full log: removed preamble chapters, fixed chapter titles, merged intro sections, formatted dramatis personae, re-ingested truncated texts, and fixed Shakespeare stage directions.
