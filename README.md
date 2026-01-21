# Wright

A minimalist, local-only Markdown editor inspired by Ulysses, iA Writer, and Typora. Wright is a distraction-free, browser-based writing application that works entirely offline with no backend dependencies.

## Features

- **Distraction-free writing** - Clean, minimal interface focused on your content
- **Local-only storage** - All documents stored in IndexedDB, never leaves your browser
- **Dark/Light themes** - System preference detection with manual override
- **Auto-save** - Automatic saving with visual status indicator
- **Word statistics** - Real-time word count and reading time estimates
- **Focus mode** - Dim surrounding text to concentrate on current paragraph
- **Document management** - Create, rename, delete, and organize documents
- **Import/Export** - Open and save Markdown files from your computer
- **PWA support** - Install as a standalone app, works offline
- **Keyboard shortcuts** - Cmd/Ctrl+S to save, Cmd/Ctrl+Shift+D for focus mode
- **Accessibility** - Full keyboard navigation and screen reader support

## Technology Stack

- **Framework**: Svelte 5
- **Build Tool**: Vite
- **Editor**: Milkdown (ProseMirror-based)
- **Storage**: Dexie.js (IndexedDB)
- **File Access**: browser-fs-access
- **PWA**: vite-plugin-pwa

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

## Deployment

Wright is configured for GitHub Pages deployment. Push to the `main` branch to trigger automatic deployment via GitHub Actions.

The app will be available at: `https://[username].github.io/Wright/`

## Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Save | Cmd+S | Ctrl+S |
| Focus Mode | Cmd+Shift+D | Ctrl+Shift+D |
| Find | Cmd+F | Ctrl+F |

## Browser Support

Wright works in all modern browsers that support:
- IndexedDB
- ES Modules
- CSS Custom Properties

## License

MIT
