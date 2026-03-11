# Guide

The guide stage gets content into the product — wiring the study guide material (from Research) into the app's course enrollment flow, chapter reading experience, and AI chat layer.

A book is **Guide-complete** when:
1. Its before-you-read text is served from the course enrollment/book intro page
2. Each chapter shows a 2-3 sentence context card before the text begins
3. AI chat is enabled post-chapter with seeded opening prompts

---

## Course Structure

Three courses, each with a fixed book sequence:

| Course | Sequence |
|--------|---------|
| Ancient Epics | Iliad → Odyssey |
| The Examined Life | Apology → Phaedo → Republic |
| How to Live | Meditations → Discourses → Apology |

A student enrolls in a course. Their reading queue fills with books in order. They move through each book chapter by chapter, then into the next book.

---

## The Four Moments

Each book in a course delivers four moments of guided experience:

### 1. Before You Read (book-level)
A professor-voiced introduction shown when a student begins a new book in their queue. Sourced from `data/<book-id>/STUDYGUIDE.md` → `## Before You Read`.

**What it does:** tells the student who wrote this, when, what we know and don't know, who the key figures are, what to pay attention to. Not hype — initiation. Sets the student up to read with purpose.

**Tone:** Yale/Oxford professor. Written to be heard (students may listen, not just read). Short sentences. No filler.

### 2. Chapter Context (chapter-level, before reading)
2-3 sentences shown before each chapter begins. Sourced from `data/<book-id>/STUDYGUIDE.md` → each chapter's `Before You Read`.

**Rules:**
- Orient, don't summarize
- No spoilers — describe the terrain, not what happens
- Tell them what to watch for: a character's mood, a structural shift, a key argument

### 3. The Reading / Listening Experience
The chapter itself — read on screen or listened to via generated audio. The cursor syncs word-by-word to the audio playback.

**Guide stage is not responsible for this** (that's Text + Audio stages). Guide only needs to ensure the surrounding context is in place.

### 4. AI Chat (chapter-level, after reading)
Opens after the student finishes a chapter. Sourced from `data/<book-id>/STUDYGUIDE.md` → each chapter's `Chat Prompts`.

**Opening message** (always first): "So what happened in this chapter?"
Then the AI uses the seeded probing questions to push deeper:
- Comprehension questions: did they actually follow it?
- Interpretive questions: what does this moment mean?
- Broader questions: connecting to themes, other books, their own life

The AI corrects misreadings, surfaces details students missed, and asks genuine dilemmas — not just flatters engagement.

---

## Subscription Gates

| Feature | Free | Plus ($1/mo) | Pro ($7/mo) |
|---------|------|-------------|------------|
| Read text | ✓ unlimited | ✓ unlimited | ✓ unlimited |
| Audio | 5 min/session | ✓ unlimited | ✓ unlimited |
| AI chat | 10 messages | 25 messages | ✓ unlimited |
| Courses | ✓ | ✓ | ✓ |

CTA modal appears when a user hits their limit. Shows the table above. Pushes to signup/upgrade.

---

## App Integration (Technical Notes)

Content source: `data/<book-id>/STUDYGUIDE.md` parsed into the DB or served at runtime.

Key UI surfaces to build:
- Course enrollment page (before-you-read + enroll CTA)
- Chapter start overlay (chapter context card)
- Post-chapter chat panel (seeded with opening prompt + probing questions)
- Subscription CTA modal (at audio/chat limits)

Status: **not yet built**. The study guide content exists for Iliad; the app UI for courses is the next major engineering milestone.

---

## What "Guide-Complete" Unlocks

When all three courses are Guide-complete, greatbooks.fm is ready for launch to Grant's Twitter audience. The pitch: "Read the Iliad in 24 chapters, listen on your commute, talk about it with an AI professor." The whole loop — enroll, read, listen, discuss — needs to work end-to-end for at least one course before launch.

Ancient Epics is closest: Iliad has full audio + research; Odyssey needs research only. That course could be Guide-complete with one engineering sprint once Odyssey's STUDYGUIDE is written.
