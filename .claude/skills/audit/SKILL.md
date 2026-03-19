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
1. **Server** (`[bookId]/[chapterNum]/page.tsx`): Queries DB for chapter segments, audio metadata, user progress. Parses `word_timestamps` JSON to extract char boundaries (not timing). Passes segments + boundaries to `ChapterContent` (server) and props to `ChapterView` (client).
2. **Server** (`ChapterContent.tsx`): Groups segments into blocks, renders every word as a `<span id="w-{ch}-{seq}-{charStart}">` using char boundaries. Wraps paragraphs in `InteractiveParagraph` (client). No timing data in the HTML.
3. **Client** (`ChapterView.tsx`): Wraps `{children}` (server-rendered text). Manages scroll position, audio session, bookmark tracking. Provides `AnnotationProvider` context. ~530 lines.
4. **Client** (`useWordTimings.ts`): Lazily fetches `/api/.../word-timestamps`, builds flat `[start_ms, end_ms][]` array (~5KB), feeds `wordTimingsRef` for AudioPlayer rAF loop.
5. **Client** (`InteractiveParagraph.tsx`): Event delegation (one `onClick` per paragraph). Handles selection, click-to-play, annotation CRUD. Cross-paragraph selection via module-level state in `wordAnnotator`.
6. **Client** (`AnnotationLayer.tsx`): Renders margin comment cards from `AnnotationContext`. Positioned via DOM measurement against anchor spans.

### Reader design choices

1. **Server-rendered word spans, lazy-loaded timing** — `ChapterContent` (server component) renders every word as a `<span>` using char boundaries from the DB. Timing data (`start_ms`/`end_ms`) ships separately as a ~5KB lazy fetch. This cuts the initial HTML payload ~60% while keeping text immediately visible and scrollable.

2. **DB coordinates as universal span IDs** — Span IDs are `w-{chapter}-{segmentSeq}-{charStart}`, derived directly from the database schema. Audio highlighting, annotations, and bookmarks all use the same coordinate system. No mapping layers, no sync issues.

3. **DOM for display, React for data, API for persistence** — Visual changes (highlight classes, audio cursor, selection) are imperative DOM manipulation via `wordAnnotator`. Annotation data lives in React context (`AnnotationContext`) for margin comment cards. API calls are fire-and-forget. Each layer updates independently and optimistically.

4. **Event delegation, not per-word handlers** — Each paragraph has one `onClick` that uses `closest('[id^="w-"]')` to identify the clicked word. Works with server-rendered children, supports cross-paragraph selection via module-level state in `wordAnnotator`.

5. **Word spans include trailing whitespace** — Each `<span>` contains its word plus trailing space/punctuation up to the next word. CSS classes (highlight background, comment underline) naturally cover the gap between words with zero extra markup or styling hacks.

### Audio system

- One MP3 per chapter, stored in GCS, streamed via `/api/audio/[...path]` (auth-gated proxy).
- Word-level timestamps lazily fetched by `useWordTimings` hook, interpolated into flat `WordTiming[]` for the rAF loop.
- `AudioPlayerContext` split into `AudioSessionContext` (session + refs, changes rarely) and `AudioViewContext` (viewMode, changes on toggle). Both persist across navigation via root layout.
- `wordAnnotator.applyClassById` / `removeClassById` used by AudioPlayer rAF loop — CSS class `.word-active` instead of inline styles.
- `useProgress` is save-only (no fetch on mount). Single instance in BookShell, exposed via BookShellContext.

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
- Word span styling via CSS classes in `globals.css`: `.word-active`, `.word-bookmark`, `.ann-highlight`, `.ann-comment`, `.ann-selection`.
- Floating controls (font size, view toggle, chat button) rendered by `ChapterView`, positioned relative to `--content-max-width` text column.
- Bookmark icon positioned via CSS class `.reading-bookmark` with desktop/mobile breakpoints.
- `BookDetailsModalProvider` context value stabilized with refs + useMemo — setting statsMap/progressMap never re-renders consumers.

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
