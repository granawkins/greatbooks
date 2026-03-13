# Guide

The guide stage builds the study guide for each book — the content that wraps the reading experience with scholarly context, discussion sessions, and essay prompts.

A book is **Guide-complete** when `data/<book-id>/STUDYGUIDE.md` exists and follows the format below.

**Canonical template:** `data/homer-iliad/STUDYGUIDE.md` — read this before writing any new study guide.

---

## Study Guide Format

Every study guide has two parts: a book-level introduction, and a series of discussion sessions (typically 4–6) covering chunks of chapters.

### Part 1: Before You Read

A ~400-word introduction (target: 3 minutes read aloud). Written to excite the reader, not summarize the scholarship. Tone: pop-history leaning, but not dumbed down. Think: a historian who writes for the Atlantic.

**Must include:**
- What makes this book worth reading — the hook
- One or two practical tips for reading this particular text (e.g. "take the gods seriously", "pay attention to the similes")
- Translation note (Butler names for Greek/Roman figures: Jove, Minerva, Ulysses, etc.)
- Close on something that pulls the reader into the first pages

**Must NOT include:** a summary of scholarship, a catalogue of Greek terms, plot summary. Save those for the sessions.

Followed immediately by a **### Coming Up** section that orients the reader toward the first session — vivid, specific, no spoilers on outcomes. Names what they'll encounter. Includes any practical reading notes (e.g. the Catalog of Ships).

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
[1 paragraph. No spoilers. Vivid anticipation — name what the reader will encounter next, without revealing outcomes. End with "We'll check in next before you start Book X."]

### Essay
[Exactly one essay question. Occasionally two, only if genuinely distinct and critical. Real questions with real answers worth arguing about.]
```

**Tone throughout:** confident, direct, written to be heard. No filler. No "it's worth noting." No quiz-question flatness. The AI tutor reads this as a script or draws from it in conversation.

**No spoilers in Coming Up sections.** Foreshadow vividly but don't reveal outcomes. "One side will push the other back" — not "The Trojans breach the wall."

---

## Greek Terms

Always give the English equivalent in parentheses on first use:
- mēnis → mēnis (rage, or wrath)
- timē → timē (honor)
- kleos → kleos (glory, or fame)
- nostos → nostos (homecoming)
- xenia → xenia (guest-friendship, or hospitality)
- aristeia → aristeia (a hero's supreme moment on the battlefield)

---

## Translation Names (Butler)

Use Butler's names throughout — not the Greek forms:

| Greek | Butler |
|-------|--------|
| Zeus | Jove |
| Athena | Minerva |
| Hera | Juno |
| Poseidon | Neptune |
| Aphrodite | Venus |
| Ares | Mars |
| Hephaestus | Vulcan |
| Hermes | Mercury |
| Diomedes | Diomed |
| Odysseus | Ulysses |

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

CTA modal appears at limits. The study guide "Before You Read" is served before the first ~2 minutes of audio — designed so a free user hears the intro, gets excited, and hits the paywall.

App UI (not yet built): course enrollment page, chapter context cards, post-session chat panel, subscription CTA modal.
