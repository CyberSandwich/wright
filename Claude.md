# Wright - Minimalist Markdown Editor

## Overview

Wright is a distraction-free, browser-based markdown editor inspired by Ulysses, iA Writer, and Typora. It's a local-only Progressive Web App (PWA) with no backend dependencies, storing all documents in IndexedDB.

## Tech Stack

- **Framework**: Svelte 5 (latest reactive framework)
- **Build Tool**: Vite 7
- **Editor Engine**: Milkdown 7.18.0 (ProseMirror-based)
- **Storage**: Dexie.js 4.2.1 (IndexedDB wrapper)
- **File Access**: browser-fs-access 0.38.0
- **PWA**: vite-plugin-pwa 1.2.0
- **Testing**: Playwright

## Project Structure

```
src/
├── main.ts                      # Entry point, Svelte app initialization
├── App.svelte                   # Root component, layout orchestration
├── components/
│   ├── Editor.svelte            # Main editor (Milkdown integration)
│   ├── Toolbar.svelte           # Formatting toolbar
│   ├── Sidebar.svelte           # Document list and sidebar
│   ├── SettingsModal.svelte     # Settings panel
│   ├── DeleteConfirmModal.svelte
│   └── Stats.svelte             # Statistics display component
├── stores/
│   ├── documents.ts             # Document state management
│   ├── settings.ts              # Settings/preferences state
│   └── ui.ts                    # Modal/UI state
├── lib/
│   ├── db.ts                    # Dexie database interface
│   └── stats.ts                 # Word count & reading time calculations
└── styles/
    ├── global.css               # Base styles and resets
    └── variables.css            # CSS custom properties
```

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript and Svelte type checking
- `npm run test` - Run Playwright tests
- `npm run test:ui` - Run Playwright tests with UI

## Key Features

- **Focus Mode**: Dims non-active paragraphs to help concentrate on current text
- **Typewriter Mode**: Keeps cursor vertically centered while typing
- **Auto-save**: Documents automatically save with debouncing (1s delay)
- **PWA Support**: Works offline as an installable app
- **Multiple Font Options**: Mono, serif, and sans-serif font families
- **Customizable Stats**: Word count, letter count, reading time display

## Performance Considerations

This is a performance-critical application. Follow these guidelines:

1. **Animation Loops**: Always add timeouts/limits to `requestAnimationFrame` loops to prevent infinite execution
2. **Event Handlers**: Throttle high-frequency events like `selectionchange` (fires on every keystroke/cursor move)
3. **DOM Queries**: Cache DOM element references when possible; avoid `querySelectorAll` in hot paths
4. **Focus Mode**: Only update changed elements, not all blocks
5. **Store Updates**: Use optimistic updates instead of full data reloads from IndexedDB

## Architecture Notes

### Editor Component (`Editor.svelte`)
- Uses Milkdown with ProseMirror under the hood
- Handles focus mode (dims inactive paragraphs)
- Handles typewriter mode (centered cursor scrolling)
- Manages link popup for adding/editing hyperlinks
- Detects and dispatches active formatting state to toolbar

### Documents Store (`documents.ts`)
- Manages document CRUD operations
- Auto-extracts title from first line of content
- Uses debounced auto-save with optimistic UI updates
- Maintains list of all documents for sidebar

### Settings Store (`settings.ts`)
- Persists user preferences to localStorage
- Controls font family, font size, line height
- Toggle settings: focus mode, typewriter mode, word count, etc.

## Recent Fixes (January 2026)

- Fixed performance issues causing high energy consumption (animation loops, throttling)
- Fixed sidebar z-index issue (close button was covered by backdrop)
- Fixed title extraction to handle HTML tags and empty lines
- Updated test suite to match current UI structure

## Important Reminders

**ALWAYS UPDATE THIS FILE** after making any significant changes to:
- Project structure
- Dependencies
- Key functionality
- Performance optimizations
- New features

**After completing any changes:**
1. Run `npm run check` to verify TypeScript/Svelte types
2. Run `npm run build` to ensure production build succeeds
3. If build passes, commit and push to GitHub

## Git Workflow

```bash
# After making changes
npm run check      # Verify types
npm run build      # Verify build
git add .
git commit -m "Description of changes"
git push
```
