# Guide

The guide stage builds the study guide for each book — the content that wraps the reading experience with scholarly context, discussion sessions, and essay prompts.

A book is **Guide-complete** when `data/<book-id>/STUDYGUIDE.md` exists and follows the format below.

**Canonical template:** `data/homer-iliad/STUDYGUIDE.md` — read this before writing any new study guide.

---

## Study Guide Format

Every study guide has two parts: a book-level introduction, and a series of discussion sessions (typically 4–6) covering chunks of chapters.

### Part 1: Before You Read

A ~400-word introduction (target: 3 minutes read aloud). Written to excite the reader, not summarize the scholarship. Tone: pop-history leaning, but not dumbed down.

**Must include:**
- What makes this book worth reading — the hook
- One or two practical tips specific to this text (e.g. how to approach the gods, what to pay attention to stylistically)
- A note on the translation — what names to expect, any significant differences from other editions a reader might have encountered
- Close on something that pulls the reader into the first pages

**Must NOT include:** a summary of scholarship, a catalogue of terms, plot summary.

Followed immediately by a **### Coming Up** section that orients the reader toward the first session — vivid, specific, no spoilers on outcomes. Names what they'll encounter. Includes any practical reading notes (e.g. sections that can be skimmed).

### Part 2: Discussion Sessions

Structure per session:

```markdown
## Session N: [Name] (Books X–Y)

### Summaries
- **Book X — [title]:** [1-2 sentence summary. Spoilers fine — this is a reference.]
- **Book Y — [title]:** [1-2 sentence summary.]

### Scenes, Themes & Characters
[4-6 named subsections. Each is a paragraph of commentary — confident statements of fact, written to be read aloud by an AI tutor or drawn from in conversation. Name each for what it covers: a character, a theme, a key scene, a concept.]

### Coming Up
[1 paragraph. No spoilers. Vivid anticipation — name what the reader will encounter next without revealing outcomes. End with "We'll check in next before you start Book X."]

### Essay
[Exactly one essay question. Occasionally two, only if genuinely distinct and critical. Real questions with real answers worth arguing about.]
```

---

## Translation & Language Rules

**Use the names as they appear in the specific translation.** Before writing, check `data/<book-id>/SKILL.md` for the translator used. Use their character names, place names, and god names consistently throughout the study guide. Note any significant name differences in the "Before You Read" section — readers may come in with prior knowledge from a different edition.

**When using original-language terms** (Greek, Latin, etc.) that carry scholarly weight, always define them in English on first use: *term* (English meaning). The relevant terms vary by work — identify them from the reference library. Use them where they add precision; don't scatter them for atmosphere.

---

## Tone

- Confident, direct, written to be heard
- No filler ("it's worth noting", "one might argue")
- No quiz-question flatness — these are statements the AI tutor reads as a script or draws from in conversation
- **No spoilers in Coming Up sections** — foreshadow vividly but don't reveal outcomes

---

## Course Structure & App Integration

Three launch courses:

| Course | Sequence |
|--------|---------|
| Ancient Epics | Iliad → Odyssey |
| The Examined Life | Apology → Phaedo → Republic |
| How to Live | Meditations → Discourses → Apology |

**Subscription gates:**
- Free: read text (unlimited), 5 min audio, 10 chat messages
- Plus ($1/mo): unlimited audio, 25 chat messages
- Pro ($7/mo): unlimited everything

The "Before You Read" section is served before the first ~2 minutes of audio. A free user hears the intro, gets excited, and hits the paywall. Keep it tight and compelling.

App UI (not yet built): course enrollment page, chapter context cards, post-session chat panel, subscription CTA modal.
