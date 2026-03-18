---
name: audit
description: Weekly codebase audit — performance, code quality, SSR, component standardization. Produces a dated plan in the project root.
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, Agent, Write
---

# Audit Skill

Run a comprehensive software engineering audit of the Great Books codebase. Produces a dated report (`AUDIT_YYYY-MM-DD.md` in project root, gitignored) with a prioritized plan of proposed changes.

## When to run

When the user says "audit the codebase" or similar. Roughly once per week.

## After the audit

The user will typically review the plan and say "go ahead" or pick specific items. At that point, implement the changes directly — don't re-audit. After implementing, update the Systems Overview and Guidelines sections below to reflect the new state.

---

## Guidelines

These are the standing priorities for all audit reviews, in order:

1. **Page load speed** — Minimize time from request to interactive content. This covers DB query efficiency, data fetching patterns, bundle size, asset delivery, and how contexts/providers are stacked on the frontend.
2. **Minimize lines of code** — Less code = fewer bugs, faster reads. Remove dead code, consolidate duplicates, simplify abstractions. Three similar lines are better than a premature helper.
3. **Standardize components** — Reusable UI primitives should live in standalone files under `src/components/`. Inline one-off components in page files should be extracted when they appear more than once. Consistent prop patterns and naming.
4. **Server-side rendering** — Do as much SSR as possible for speed and SEO. Convert client components to server components where feasible. Push `"use client"` boundaries down to the smallest interactive leaf. Avoid wrapping large trees in client contexts unnecessarily.
5. **Minimize external requests** — Reduce API calls from the client. Prefer fetching data server-side and passing as props. Batch related queries. Cache where appropriate.

---

## Systems Overview

Living reference of the major systems and data flows. Update this section when implementations change.

### Book page loading

The heaviest page. Data flow:
1. **Server** (`[bookId]/[chapterNum]/page.tsx`): Queries DB for chapter segments, audio metadata, user progress. Resolves course reference chapters. Parses `word_timestamps` JSON. Passes everything as props to `ChapterView`.
2. **Client** (`ChapterView.tsx`): Groups segments into blocks, computes word timings, loads audio session into `AudioPlayerContext`, sets up scroll tracking. ~500 lines — the largest client component.
3. **Audio** (`AudioPlayerContext.tsx` + `AudioPlayer.tsx`): Global context with refs for word highlighting and auto-scroll. rAF loop runs continuously for playback sync. `PersistentPlayerBar` renders in root layout.
4. **Progress** (`useProgress.ts`): Debounced saves via POST to `/api/progress`. In reading mode, scroll position maps to audio timestamps. `readingCenter.ts` computes visible center accounting for top bar / player bar insets.
5. **Annotations** (`/api/annotations`): Fetched client-side after mount. Highlights and comments stored per-segment range.

### Audio system

- One MP3 per chapter, stored in GCS, streamed via `/api/audio/[...path]` (auth-gated proxy).
- Word-level timestamps on each segment row. Frontend builds `WordTiming[]` and `ScrollData` arrays for the rAF highlight/scroll loop.
- `AudioPlayerContext` persists across navigation (global provider in root layout). Session includes segment boundaries for skip forward/back.
- View mode toggle (audio/text) lives in the context. Reading mode pauses audio, collapses player bar with slide transition.

### Chat system

- Dual transport: WebSocket server on :3002 (primary), REST `/api/chat` (legacy fallback).
- WS server handles both text (Gemini 2.5 Flash SSE) and voice (Gemini Live native audio proxy).
- Context builder (`chatContext.ts`) assembles system prompt from book metadata, study guide, and reader position.
- Messages stored in `messages` table with model attribution.

### Auth system

- Anonymous users get a UUID from localStorage.
- Authenticated via Google OAuth or magic link (Resend email).
- JWT in httpOnly cookie. Dev mode uses query-param tokens for cross-origin WS auth.

### Component architecture

- CSS variables in `globals.css` for theming (light/dark). `--color-cursor` for audio/bookmark highlights.
- `--font-size-body` CSS variable for adjustable text size (persisted in localStorage).
- Floating controls (font size, view toggle, chat button) rendered by `ChapterView`, positioned relative to `--content-max-width` text column.
- Bookmark icon positioned via CSS class `.reading-bookmark` with desktop/mobile breakpoints.

---

## Audit Procedure

Follow these steps when running an audit:

### 1. Performance benchmarks

Run these and record results at the top of the report:

```bash
# Server-side: time key API responses (run dev server first if needed)
# Measure chapter data endpoint (heaviest query — segments + word timestamps)
curl -s -o /dev/null -w "chapter_data: %{time_total}s\n" http://localhost:3000/api/books/homer-iliad/chapters/1

# Measure book metadata endpoint
curl -s -o /dev/null -w "book_meta: %{time_total}s\n" http://localhost:3000/api/books/homer-iliad

# Measure books list
curl -s -o /dev/null -w "books_list: %{time_total}s\n" http://localhost:3000/api/books

# Client-side: PageSpeed Insights via API (free, no key needed for basic)
# Use the production URL if deployed, otherwise skip
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://greatbooks.fm&strategy=mobile&category=performance" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const a=d.lighthouseResult?.audits;console.log('Performance score:', d.lighthouseResult?.categories?.performance?.score*100);console.log('FCP:', a?.['first-contentful-paint']?.displayValue);console.log('LCP:', a?.['largest-contentful-paint']?.displayValue);console.log('TBT:', a?.['total-blocking-time']?.displayValue);console.log('CLS:', a?.['cumulative-layout-shift']?.displayValue);console.log('SI:', a?.['speed-index']?.displayValue)"
```

### 2. Code inventory

Measure current state:

```bash
# Total lines of TypeScript/TSX
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | tail -1

# Client component count
grep -rl '"use client"' src/ | wc -l

# Largest files (potential split candidates)
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -15
```

### 3. Review key areas

For each guideline, systematically review:

**Speed:**
- Are there N+1 queries or redundant DB calls in API routes?
- Are client components fetching data that could be server-fetched?
- Is the JS bundle pulling in unnecessary code?
- Are images and audio optimized?

**Code size:**
- Dead code, unused imports, unused exports?
- Duplicated logic across files?
- Over-engineered abstractions?

**Components:**
- Inline components that should be extracted?
- Inconsistent patterns (some components use inline styles, some use CSS classes)?
- Missing or redundant `"use client"` directives?

**SSR:**
- Client components that don't need interactivity?
- Data fetched client-side that could be passed as server props?
- Context providers wrapping more than they need to?

### 4. Write the report

Save to `AUDIT_YYYY-MM-DD.md` in the project root. Structure:

```markdown
# Codebase Audit — YYYY-MM-DD

## Benchmarks
(paste benchmark results)

## Code Inventory
(paste metrics)

## Summary
(3-5 bullet executive summary of highest-impact proposed changes)

## Proposed Changes

### P0 — High impact
(numbered list with file paths, what to change, why, estimated effort)

### P1 — Medium impact
(same format)

### P2 — Low priority / nice to have
(same format)
```

Keep it concrete — file paths, line counts, specific before/after descriptions. No vague "consider refactoring X" — say exactly what should change.
