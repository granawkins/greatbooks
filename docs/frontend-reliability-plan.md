# Frontend Reliability Plan: Scroll Stability, Cursor Containment, and Playback Speed Persistence

Date: 2026-03-20

## Why these issues keep recurring

The three issues are linked by one pattern: **multiple places make imperative updates without one authoritative lifecycle**.

Current behavior shows:

- Initial chapter positioning is done in `ChapterView` via a one-time `useLayoutEffect`, but later DOM/layout changes can still move content after that point (fonts, viewport changes, player visibility, etc.).
- Listening cursor auto-scroll is driven in `AudioPlayer` by a rAF loop and visibility checks that can disable auto-scroll permanently (`autoScrollRef`), with limited re-arming behavior.
- Playback speed is initialized once from auth into `playbackSpeedRef`, and persistence is fire-and-forget; race conditions and stale user fetches can reset speed back to 1.

## Findings from the current code

### 1) Initial load jitter / position drift

- Initial scroll is applied once using `scrollToCenter(..., "instant")` in `ChapterView` and then `scrollReady` flips to true.
- `scrollToCenter()` depends on measured top bar / player bar height and viewport metrics at call time; if those change after first paint, center target changes.

### 2) Listening cursor leaving frame

- On play transition, `AudioPlayer` scrolls to current paragraph once.
- During playback, auto-scroll can be disabled when previous paragraph is off-screen (`autoScrollRef.current = false`) and then remains disabled until another play transition.
- Resize / visual viewport / long background tab resumptions are not fully handled with deterministic re-center guarantees.

### 3) Playback speed resetting to 1

- `PlaybackSpeedSync` only hydrates once (`initialized` ref). Any later user refresh or session change does not re-assert a preferred speed deterministically.
- `AuthContext.updatePlaybackSpeed()` optimistically updates local state, then PATCHes; there is no ordering/version guard if stale `/api/auth/me` responses arrive after a speed change.
- Anonymous default speed is 1 and there is no local persistent fallback for signed-in users.

## Durable architecture changes (recommended)

### A. Introduce a single `ReadingPositionController`

Create a small controller/hook that becomes the **only owner** of center-position calculations and retries.

Responsibilities:

1. **Apply target position** from server target (initial block index) or current audio paragraph.
2. **Stabilize after layout shifts** with short bounded retries (e.g., at 0ms, rAF, 100ms, 300ms) until element center error < threshold.
3. Re-run on deterministic events:
   - `resize`
   - `visualViewport.resize`
   - `visualViewport.scroll` (mobile URL bar dynamics)
   - player bar height changes (via `ResizeObserver` on `[data-player-bar]`)
   - `visibilitychange` when tab becomes visible
4. Expose `recenterNow(reason)` for playback start, mode switch, and manual recovery.

This preserves server-first positioning while making client reconciliation explicit and bounded.

### B. Replace auto-scroll “disable forever” with a state machine

Move cursor-scroll policy to explicit states:

- `FOLLOWING`: keep active paragraph in frame
- `USER_OVERRIDDEN`: user intentionally moved away; don’t fight scroll for N seconds
- `RECENTER_PENDING`: triggered by play, resume, mode switch, or viewport change

Rules:

- On **play**: always transition to `RECENTER_PENDING` then `FOLLOWING`.
- On **viewport change / tab return** while playing: `RECENTER_PENDING`.
- If paragraph exits safe frame while `FOLLOWING`: perform instant re-center (rate-limited).
- If user scrolls manually during playback: temporary `USER_OVERRIDDEN`, then decay back to `FOLLOWING`.

### C. Make playback speed source-of-truth explicit

Use layered preference resolution:

1. `serverUser.playback_speed` (authoritative when fresh)
2. `localStorage("greatbooks-playback-speed")` fallback cache
3. default `1`

And add write guarantees:

- Every speed change writes both to context and localStorage synchronously.
- Persist to server with **last-write-wins token** (monotonic client timestamp/version).
- Ignore stale auth refreshes older than the last local speed write.
- On login/session refresh, merge with policy: if local write is newer than fetched user snapshot, keep local and re-persist.

## Concrete implementation plan

### Phase 1: Instrumentation + guardrails (1–2 days)

- Add optional debug telemetry (disabled by default) for:
  - center error at initial load, play, resume, mode switch
  - number of re-centering attempts
  - times active paragraph exits safe frame
  - playback speed source selected (server/local/default)
- Add `performance.mark` events around initial chapter render and first settled scroll.

### Phase 2: Position controller + viewport resilience (2–3 days)

- Implement `useReadingPositionController` and route all centering through it.
- Add bounded stabilization retries after initial load and on play.
- Wire listeners for `visualViewport`, `visibilitychange`, and `ResizeObserver` for top/bottom inset changes.
- Keep existing server `initialScrollBlockIdx` computation; client only reconciles drift.

### Phase 3: Cursor-following state machine (1–2 days)

- Refactor `AudioPlayer` auto-scroll logic into explicit states.
- Remove one-way `autoScrollRef` disable behavior.
- Add deterministic “cursor must remain in frame while playing” assertion in dev mode.

### Phase 4: Speed persistence hardening (1 day)

- Store speed in localStorage immediately on user change.
- Add freshness token/version in `AuthContext` speed updates.
- Rehydrate speed from server/local with deterministic precedence.
- Ensure `audio.playbackRate` is reapplied on session load and auth refresh.

### Phase 5: Regression tests (1–2 days)

- Playwright scenarios:
  - reload at deep progress; assert no second jump after settle window
  - press play from off-screen; assert active paragraph re-centered
  - emulate mobile viewport + URL bar changes + orientation change
  - background tab for 5+ minutes, return, assert recenter/follow continues
  - set speed 1.25, reload, re-login, chapter switch, and ensure persistence

## Additional recommendations

1. **Stop relying on one-shot effects with disabled exhaustive deps** for critical init paths; centralize init sequencing in one hook.
2. Add a small “layout settled” barrier for reader (fonts + refs + measured insets) before final initial-position commit.
3. Consider moving paragraph range lookup to binary search by `ms` (same as word timing search) to reduce rAF work and edge instability.
4. Add an internal feature flag (`reader_stability_v2`) to roll out gradually and compare telemetry.

## Success criteria

- Initial load reaches target with <= 1 corrective adjustment and no visible second jump.
- While audio is playing, active paragraph remains inside safe frame across viewport changes and tab resume.
- User-selected speed (e.g., 1.25) survives reload, chapter changes, and auth refreshes without reverting.
- No regression in server-first rendering and initial block selection.

## Relevant code areas for implementation

- `src/app/[bookId]/[chapterNum]/ChapterView.tsx`
- `src/components/audio/AudioPlayer.tsx`
- `src/lib/readingCenter.ts`
- `src/components/audio/PlaybackSpeedSync.tsx`
- `src/lib/AuthContext.tsx`
- `src/lib/AudioPlayerContext.tsx`
