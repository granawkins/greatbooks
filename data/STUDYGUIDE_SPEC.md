# Study Guide Specification

This document defines the format, tone, and process for creating study guides for greatbooks.fm courses. Follow it for every book. Iterate on it as we learn what works.

---

## File Location

```
data/<book-id>/STUDYGUIDE.md
```

---

## File Structure

```
# [Title] — Study Guide

## Chapter Summaries
[One line per chapter — factual, plain, no drama. For quick reference during editing.]

## Before You Read
[The entry-point guide for this book. See tone guidelines below.]

## Chapter Materials

### [Chapter Title]

**Before You Read**
[2-3 sentences shown to the reader BEFORE they start the chapter.]

**Chat Prompts**
[Structured prompts that initialize the AI conversation AFTER the chapter.]
```

---

## Before You Read Guide (Book-level)

The entry point into each book. This replaces a "course intro." Tone: a Yale or Oxford professor introducing a seminal work to serious students. Not a hype piece. Not a listicle. An initiation.

**Include:**
- The work's opening word/image/gesture and what it signals
- Who Homer/the author is and what we know (and don't know) — be honest about scholarly uncertainty
- Historical and cultural context: when was it written, how was it transmitted, why did it matter then
- The characters the reader will meet, briefly and clearly
- What the reader should be ready for thematically
- A final sentence that sends them into the text

**Tone rules:**
- Serious but not stuffy
- Short declarative sentences — written to be heard, not read on a page
- No "as we shall see," no "it is worth noting," no hedging filler
- Assume the reader is intelligent and motivated
- Do NOT say "if you finish" — assume they will finish

**Research requirement:**
- Search the web for scholarly commentary, introductions, and critical essays on the work
- Good sources: university course pages, Stanford Encyclopedia of Philosophy, JSTOR abstracts, Penguin/Oxford intro excerpts, reputable literary criticism sites
- Use this research to ground the guide in actual scholarship, not just training knowledge

---

## Chapter Materials

### Before You Read (Chapter-level)

Shown to the reader **before** they start the chapter. 2-3 sentences maximum.

**Rules:**
- NO spoilers — never reveal what happens in this chapter
- Orient, don't summarize
- Either: set up the conflict/stakes entering this chapter, OR reinforce the action carrying over from the previous one
- Tell the reader what to pay attention to

**Example (Book 1 of the Iliad):**
> "This chapter establishes the conflict that drives the entire poem — a quarrel between Achilles and Agamemnon over honor and the spoils of war. Pay close attention to what triggers it, how each man responds, and what Achilles chooses to do rather than fight."

---

### Chat Prompts (Chapter-level)

These initialize the AI conversation **after** the reader finishes the chapter. Structure:

**Opening (always the same):**
> "So what happened in this chapter?"

This elicits what the reader got out of it. The AI should:
- Affirm what they got right
- Gently correct anything wrong
- Surface anything important they missed

**Probing questions (2-3, professor-style):**
- Specific to what actually happens in this chapter
- The kind a professor asks to check real comprehension and push thinking
- Examples: "And who exactly was Briseis, and why did her status matter?" / "What role did the gods play in how this unfolded?"

**Broader discussion questions (1-2):**
- No single right answer
- Invite genuine opinion and debate
- Examples: "Whose side are you on — Achilles or Agamemnon?" / "Is Hector a hero or just a man doing his duty?"

---

## Research Process

Before writing any study guide:

1. **Read web commentary** — search for "[book title] introduction scholarly commentary", "[book title] themes analysis", "[author] [book] course syllabus"
2. **Check reputable sources**: Stanford Encyclopedia of Philosophy, university course pages (Yale, Harvard, Oxford OCW), Literary criticism (JSTOR, NYRB, TLS), Penguin/Oxford Classics introductions
3. **Note the key scholarly debates** — what do experts argue about? Translation disputes, authorship questions, thematic readings. These become the most interesting "Before You Read" material and discussion questions.
4. **Use training knowledge** for the text itself, but ground historical/scholarly claims in research

---

## Iteration Process

We are iterating on the Iliad first (Grant knows it well and can verify quality). Once the Iliad guide is solid, use it as the template for all other books. Trust the process — the later books Grant hasn't read, so quality control relies on good research and faithful adherence to this spec.

---

## Books Completed

| Book | Status | Notes |
|------|--------|-------|
| Homer — Iliad | Draft v2 | In review — iterating with Grant |
| Homer — Odyssey | Not started | |
| Marcus Aurelius — Meditations | Not started | Priority for Stoics course |
| Epictetus — Discourses | Not started | Priority for Stoics course |
| Plato — Apology | Not started | Priority for Stoics course |

---

## Courses Planned

### Course 1: Ancient Epics
Iliad → Odyssey

### Course 2: The Examined Life (Socratic)
Apology → Phaedo → Republic

### Course 3: How to Live (Stoics)
Meditations → Discourses → Apology *(shared with Course 2)*
