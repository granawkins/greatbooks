# Research

The research stage builds the scholarly foundation for each book — a verified reference library and a study guide that serves both the professor-voiced before-you-read content and the AI chat layer.

A book is **Research-complete** when:
1. `data/<book-id>/references/` exists with 4–6 verified source files
2. `data/<book-id>/STUDYGUIDE.md` exists and follows the spec

---

## Study Guide Spec

Read before writing any study guide. The canonical spec is:
```
.claude/skills/curator/guide/SKILL.md
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
