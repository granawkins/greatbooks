# Great Books

A webapp providing the best reading/listening experience, with AI enhancements, for select public-domain books.

## Vision

Combine the best of Audible + Kindle + ChatGPT voice-mode into one elegant interface for classic literature. Source texts from open repositories (Internet Classics Archive, Project Gutenberg, etc.).

## Core Features

### 1. Reader (Kindle-like)
- Clean, distraction-free reading interface for public-domain texts
- Click any word to: search it within the text, look it up on Wikipedia, get a definition
- Adjustable typography (font size, line spacing, theme)
- Position tracking and bookmarking
- Sliding cursor showing current position

### 2. Listener (Audible-like)
- AI-generated audio using Google Chirp3 TTS
- Standard audio controls: play/pause, skip, speed adjustment
- Chapter/section navigation
- Combined read+listen mode with synced sliding cursor highlighting text as audio plays

### 3. AI Chat (ChatGPT-like)
- Context-aware: sees your current position and recent reading
- Tools for searching the current book and the full corpus
- Access to public-domain commentary, supplementary materials, and background
- Searchable reference corpus (scholarly commentary, historical context, etc.)

## Corpus (Initial)
- Homer: *Iliad*, *Odyssey*
- Plato: *Republic*
- Milton: *Paradise Lost*
- (More to be added)

## Tech Stack
- **Next.js 16** with App Router and TypeScript
- **Tailwind CSS 4** for layout/utility classes
- **CSS custom properties** in `globals.css` for themeable colors/fonts
- Components use inline styles referencing CSS variables for theme-able properties

## Architecture Principles
- **CSS variables for theming** — swappable light/dark/custom via `:root` overrides
- **Flat component library** — reusable primitives in `src/components/` that reference CSS variables
- **Shallow hierarchy** — pages import components directly (max 3 levels deep)

## Project Structure
```
src/
  app/
    layout.tsx              ← Root layout (font, metadata)
    page.tsx                ← Home page (book grid)
    globals.css             ← CSS variables / theme
    [bookId]/
      layout.tsx            ← Book layout (back link + title + tab bar)
      page.tsx              ← Redirects to /read
      read/page.tsx         ← Reader view
      listen/page.tsx       ← Listener view (placeholder)
      chat/page.tsx         ← Chat view (placeholder)
  components/
    BookCard.tsx            ← Book card for home grid
    TabBar.tsx              ← Read/Listen/Chat navigation tabs
    IconButton.tsx          ← Reusable icon button
    ChapterNav.tsx          ← Chapter selector sidebar
    AudioPlayer.tsx         ← Placeholder audio player bar
    ChatMessage.tsx         ← Chat message bubble
    ChatInput.tsx           ← Chat text input + send button
  data/
    books.ts                ← Book/Chapter types + dummy data
```
