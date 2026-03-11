# Research

The research stage builds the scholarly foundation for each book — a verified reference library and a study guide that serves both the professor-voiced before-you-read content and the AI chat layer.

A book is **Research-complete** when:
1. `data/<book-id>/references/` exists with 4–6 verified source files
2. `data/<book-id>/STUDYGUIDE.md` exists and follows the spec

---

## Study Guide Spec

Read before writing any study guide:
```
/home/granawkins/greatbooks/data/STUDYGUIDE_SPEC.md
```

Structure at a glance:
```
## Chapter Summaries     ← one line per chapter (reference, top of file)
## Before You Read       ← professor-voiced book introduction
## Chapter Materials
  ### Chapter N
    Before You Read      ← 2-3 sentences, no spoilers, orient + watch-for
    Chat Prompts         ← opening + probing + broader questions
```

**Tone:** Yale/Oxford professor to serious students. Short sentences, written to be heard. No filler, no hedging, no "it is worth noting." Assume motivated readers who want to be challenged.

---

## Research Process

Do this before writing anything:

1. **Web search first** — university OCW pages (Yale, MIT), Stanford Encyclopedia of Philosophy, Wikipedia (starting point only — follow citations), SparkNotes/LitCharts for common reader questions, canonical critical essays
2. **Verify every claim** — trace to an accessible URL; note URL + date; flag paywalled sources explicitly; flag unverifiable claims `[UNVERIFIED]`
3. **Save references** — one file per source in `data/<book-id>/references/`, with a source header at top of each file
4. **Then write** — grounded in research, not just training knowledge

Good sources: Stanford Encyclopedia of Philosophy, Wikipedia (as starting point), JSTOR abstracts (note paywall), university syllabi, translation prefaces (often the best single-source overview), Simone Weil and other canonical critics.

---

## Reference Library Format

Each file in `data/<book-id>/references/` should start with:
```markdown
# Source: [Title]
URL: [URL]
Accessed: [YYYY-MM-DD]
Paywall: [yes/no]
```

Then the relevant excerpted or summarized content. Keep files focused — one source per file. Typical set for a book:
- `[book]-wikipedia-overview.md` — Wikipedia article (verify online)
- `[book]-[theme].md` — key scholarly theme or essay
- `[book]-translation-comparison.md` — translator notes, edition differences
- `[book]-historical-context.md` — historical/biographical background
- `[book]-key-themes-characters.md` — character analysis, thematic vocabulary

---

## Sub-Agent Workflow

Research + writing tasks run well as sub-agents. Instructions to give:
- Read `data/STUDYGUIDE_SPEC.md` first
- Do web research before writing — search for university course pages, SEP articles, Wikipedia
- Output path: `data/<book-id>/STUDYGUIDE.md`
- Print a source summary when done (URL, paywalled or not, what was used)
- Flag any claims that couldn't be verified

Results come back to Clio for review before PR.

---

## Priority Queue

| Book | Course | Status |
|------|--------|--------|
| Iliad | Ancient Epics | ✓ done — STUDYGUIDE.md + 5 reference files |
| Odyssey | Ancient Epics | ❌ next up |
| Apology | Examined Life | ❌ short — good second target |
| Phaedo | Examined Life | ❌ |
| Republic | Examined Life | ❌ |
| Meditations | How to Live | ❌ |
| Discourses | How to Live | ❌ |

Work in course order. Odyssey first — it completes the first course.

---

## Completed Work

### Iliad (homer-iliad)
- `data/homer-iliad/STUDYGUIDE.md` — full study guide, 24 chapters, before-you-read, chat prompts
- `data/homer-iliad/references/` — 5 verified files:
  - `iliad-wikipedia-overview.md` — fetched and confirmed online
  - `simone-weil-poem-of-force.md` — essay on force as the true hero
  - `homeric-question-oral-tradition.md` — Parry, Lord, oral-formulaic theory
  - `key-themes-characters-scholarship.md` — menis, kleos, timē, character analysis
  - `translation-comparison.md` — Fagles vs Lattimore vs Butler
  - `troy-archaeology-historical-context.md` — Schliemann, Troy VIIa
- `data/STUDYGUIDE_SPEC.md` — canonical spec for all future guides
