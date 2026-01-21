<script lang="ts">
  import { currentDocument, saveNow } from '../stores/documents';
  import { settings, toggleSidebar, updateSetting, toggleFocusMode, toggleTypewriterMode, type FontFamily, type AccentColor } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import { fileSave } from 'browser-fs-access';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let showExportMenu = false;
  let showFontMenu = false;
  let showHeadingMenu = false;
  let showColorMenu = false;

  const accentColors: { id: AccentColor; color: string }[] = [
    { id: 'blue', color: '#58a6ff' },
    { id: 'purple', color: '#a78bfa' },
    { id: 'pink', color: '#f472b6' },
    { id: 'red', color: '#f87171' },
    { id: 'orange', color: '#fb923c' },
    { id: 'green', color: '#4ade80' },
    { id: 'teal', color: '#2dd4bf' }
  ];

  // Active format states (updated by Editor)
  export let activeFormats: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    heading: number | null;
  } = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    heading: null
  };

  async function handleExport(format: 'md' | 'txt') {
    if (!$currentDocument) return;
    showExportMenu = false;

    let content = $currentDocument.content;
    let ext = '.md';
    let mimeType = 'text/markdown';

    if (format === 'txt') {
      content = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/<u>(.+?)<\/u>/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '')
        .replace(/^>\s/gm, '')
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim());
      ext = '.txt';
      mimeType = 'text/plain';
    }

    const filename = `${$currentDocument.title || 'document'}${ext}`;

    try {
      await fileSave(new Blob([content], { type: mimeType }), {
        fileName: filename,
        extensions: [ext]
      });
    } catch (err) {
      console.log('Export cancelled');
    }
  }

  function handleSettings() {
    openModal('settings');
  }

  function handleKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.key === 's') {
      event.preventDefault();
      saveNow();
      return;
    }

    if (modifier && event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case 't':
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 1 });
          break;
        case 'h':
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 2 });
          break;
        case 'j':
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 3 });
          break;
        case 'b':
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 0 });
          break;
      }
      return;
    }

    if (modifier && event.key === 'u') {
      event.preventDefault();
      dispatch('format', { type: 'underline' });
      return;
    }

    if (modifier && (event.key === '=' || event.key === '+')) {
      event.preventDefault();
      adjustFontSize(1);
      return;
    }
    if (modifier && event.key === '-') {
      event.preventDefault();
      adjustFontSize(-1);
      return;
    }
  }

  function closeMenus() {
    showExportMenu = false;
    showFontMenu = false;
    showHeadingMenu = false;
    showColorMenu = false;
  }

  function setAccentColor(color: AccentColor) {
    updateSetting('accentColor', color);
    showColorMenu = false;
  }

  function toggleBold() {
    dispatch('format', { type: 'bold' });
  }

  function toggleItalic() {
    dispatch('format', { type: 'italic' });
  }

  function toggleUnderline() {
    dispatch('format', { type: 'underline' });
  }

  function toggleStrikethrough() {
    dispatch('format', { type: 'strikethrough' });
  }

  function setHeading(level: number) {
    showHeadingMenu = false;
    dispatch('format', { type: 'heading', level });
  }

  function setFont(font: FontFamily) {
    updateSetting('fontFamily', font);
    showFontMenu = false;
  }

  function adjustFontSize(delta: number) {
    const newSize = Math.min(28, Math.max(12, $settings.fontSize + delta));
    updateSetting('fontSize', newSize);
  }

  $: fontLabel = $settings.fontFamily === 'mono' ? 'Mono' :
                 $settings.fontFamily === 'serif' ? 'Serif' : 'Sans';

  $: headingLabel = activeFormats.heading === 1 ? 'Title' :
                    activeFormats.heading === 2 ? 'Heading' :
                    activeFormats.heading === 3 ? 'Subheading' : 'Body';
</script>

<svelte:window on:keydown={handleKeyDown} on:click={closeMenus} />

<header class="toolbar" role="toolbar" aria-label="Document toolbar">
  <div class="toolbar-left">
    <button
      class="icon-btn sidebar-toggle"
      on:click={toggleSidebar}
      title={$settings.sidebarOpen ? "Close sidebar" : "Open sidebar"}
      aria-label={$settings.sidebarOpen ? "Close sidebar" : "Open sidebar"}
    >
      {#if $settings.sidebarOpen}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      {/if}
    </button>

    <div class="dropdown-container">
      <button
        class="color-picker-btn"
        on:click|stopPropagation={() => showColorMenu = !showColorMenu}
        title="Accent color"
        aria-label="Change accent color"
      >
        <span class="color-dot" style="background: var(--color-accent)"></span>
      </button>
      {#if showColorMenu}
        <div class="color-menu">
          {#each accentColors as { id, color }}
            <button
              class="color-option"
              class:active={$settings.accentColor === id}
              style="--option-color: {color}"
              on:click={() => setAccentColor(id)}
              aria-label="{id} color"
            >
              <span class="color-swatch"></span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="toolbar-center">
    <div class="format-group">
      <button
        class="format-btn"
        class:active={activeFormats.bold}
        on:click={toggleBold}
        title="Bold (Cmd+B)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>
      <button
        class="format-btn"
        class:active={activeFormats.italic}
        on:click={toggleItalic}
        title="Italic (Cmd+I)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      <button
        class="format-btn"
        class:active={activeFormats.underline}
        on:click={toggleUnderline}
        title="Underline (Cmd+U)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
          <line x1="4" y1="21" x2="20" y2="21"/>
        </svg>
      </button>
      <button
        class="format-btn"
        class:active={activeFormats.strikethrough}
        on:click={toggleStrikethrough}
        title="Strikethrough"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="12" x2="20" y2="12"/>
          <path d="M17.5 7.5c-1-1.5-2.5-2.5-5.5-2.5-4 0-6 2-6 4 0 1.5 1 3 6 4"/>
          <path d="M8.5 16.5c1 1 2.5 2.5 5.5 2.5 4 0 6-2 6-4"/>
        </svg>
      </button>
    </div>

    <div class="divider"></div>

    <div class="dropdown-container">
      <button
        class="dropdown-btn"
        on:click|stopPropagation={() => showHeadingMenu = !showHeadingMenu}
        title="Text style"
      >
        {headingLabel}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {#if showHeadingMenu}
        <div class="dropdown-menu">
          <button class="dropdown-item" class:active={activeFormats.heading === null || activeFormats.heading === 0} on:click={() => setHeading(0)}>Body</button>
          <button class="dropdown-item" class:active={activeFormats.heading === 1} on:click={() => setHeading(1)}>Title</button>
          <button class="dropdown-item" class:active={activeFormats.heading === 2} on:click={() => setHeading(2)}>Heading</button>
          <button class="dropdown-item" class:active={activeFormats.heading === 3} on:click={() => setHeading(3)}>Subheading</button>
        </div>
      {/if}
    </div>

    <div class="divider"></div>

    <div class="dropdown-container">
      <button
        class="dropdown-btn"
        on:click|stopPropagation={() => showFontMenu = !showFontMenu}
        title="Font family"
      >
        {fontLabel}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {#if showFontMenu}
        <div class="dropdown-menu">
          <button class="dropdown-item" class:active={$settings.fontFamily === 'mono'} on:click={() => setFont('mono')}>Mono</button>
          <button class="dropdown-item" class:active={$settings.fontFamily === 'serif'} on:click={() => setFont('serif')}>Serif</button>
          <button class="dropdown-item" class:active={$settings.fontFamily === 'sans'} on:click={() => setFont('sans')}>Sans</button>
        </div>
      {/if}
    </div>

    <div class="size-control">
      <button class="size-btn" on:click={() => adjustFontSize(-1)} title="Decrease font size">−</button>
      <span class="size-value">{$settings.fontSize}</span>
      <button class="size-btn" on:click={() => adjustFontSize(1)} title="Increase font size">+</button>
    </div>

    <div class="divider"></div>

    <button
      class="mode-btn"
      class:active={$settings.focusMode}
      on:click={toggleFocusMode}
      title="Focus Mode"
    >
      Focus
    </button>
    <button
      class="mode-btn"
      class:active={$settings.typewriterMode}
      on:click={toggleTypewriterMode}
      title="Typewriter Mode"
    >
      Typewriter
    </button>
  </div>

  <div class="toolbar-right">
    <div class="dropdown-container">
      <button
        class="export-btn"
        on:click|stopPropagation={() => showExportMenu = !showExportMenu}
        title="Export document"
        aria-expanded={showExportMenu}
      >
        Export
      </button>

      {#if showExportMenu}
        <div class="dropdown-menu right">
          <button class="dropdown-item" on:click={() => handleExport('md')}>Export as .md</button>
          <button class="dropdown-item" on:click={() => handleExport('txt')}>Export as .txt</button>
        </div>
      {/if}
    </div>

    <button
      class="icon-btn"
      on:click={handleSettings}
      title="Settings"
      aria-label="Settings"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    height: 52px;
    flex-shrink: 0;
    gap: var(--space-3);
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toolbar-center {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    justify-content: center;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .format-group {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .format-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .format-btn.active {
    background: var(--color-accent);
    color: white;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 var(--space-1);
  }

  .dropdown-container {
    position: relative;
  }

  .dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    line-height: 1;
    transition: all var(--transition-fast);
  }

  .dropdown-btn:hover {
    background: var(--color-border);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-1);
    z-index: 100;
    min-width: 120px;
    animation: menuPop var(--transition-fast) ease-out;
  }

  .dropdown-menu.right {
    left: auto;
    right: 0;
    transform: none;
  }

  @keyframes menuPop {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .dropdown-menu.right {
    animation: menuPopRight var(--transition-fast) ease-out;
  }

  @keyframes menuPopRight {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-sm);
    text-align: left;
    transition: background var(--transition-fast);
  }

  .dropdown-item:hover {
    background: var(--color-bg-tertiary);
  }

  .dropdown-item.active {
    background: var(--color-accent);
    color: white;
  }

  .size-control {
    display: flex;
    align-items: center;
    height: 36px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .size-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 100%;
    color: var(--color-text-secondary);
    font-size: 1rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .size-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .size-value {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
    min-width: 28px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    line-height: 1;
    transition: all var(--transition-fast);
  }

  .mode-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .mode-btn.active {
    background: var(--color-accent);
    color: white;
  }

  .export-btn {
    height: 36px;
    padding: 0 var(--space-4);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .export-btn:hover {
    background: var(--color-accent-hover);
    box-shadow: var(--glow-accent);
  }

  /* Color picker */
  .color-picker-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .color-picker-btn:hover {
    background: var(--color-bg-tertiary);
  }

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2), var(--shadow-sm);
  }

  .color-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    animation: menuPop var(--transition-fast) ease-out;
  }

  .color-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .color-option:hover {
    transform: scale(1.1);
  }

  .color-option.active {
    background: var(--color-bg-tertiary);
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    background: var(--option-color);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1), var(--shadow-sm);
  }

  .color-option.active .color-swatch {
    box-shadow: 0 0 0 2px var(--color-bg-secondary), 0 0 0 4px var(--option-color);
  }

  @media (max-width: 900px) {
    .mode-btn {
      display: none;
    }
  }

  @media (max-width: 700px) {
    .toolbar-center {
      gap: var(--space-1);
    }
    .divider {
      display: none;
    }
    .dropdown-btn {
      padding: 0 var(--space-2);
    }
    .size-control {
      display: none;
    }
  }

  @media (max-width: 500px) {
    .toolbar {
      padding: var(--space-2);
    }
    .toolbar-center {
      display: none;
    }
    .export-btn {
      padding: 0 var(--space-3);
      font-size: var(--font-size-xs);
    }
  }

  /* Safe area support for mobile */
  @supports (padding-top: env(safe-area-inset-top)) {
    .toolbar {
      padding-top: max(var(--space-2), env(safe-area-inset-top));
      padding-left: max(var(--space-4), env(safe-area-inset-left));
      padding-right: max(var(--space-4), env(safe-area-inset-right));
    }
  }
</style>
