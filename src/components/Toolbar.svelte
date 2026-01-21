<script lang="ts">
  import { currentDocument, updateTitle, saveNow } from '../stores/documents';
  import { settings, toggleSidebar, updateSetting, toggleFocusMode, toggleTypewriterMode, type FontFamily } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import { fileSave } from 'browser-fs-access';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let isEditingTitle = false;
  let titleInput: HTMLInputElement;
  let editedTitle = '';
  let showExportMenu = false;
  let showFontMenu = false;

  // Active format states (updated by Editor)
  export let activeFormats: {
    bold: boolean;
    italic: boolean;
    heading: number | null;
  } = {
    bold: false,
    italic: false,
    heading: null
  };

  function startEditTitle() {
    if ($currentDocument) {
      editedTitle = $currentDocument.title;
      isEditingTitle = true;
      setTimeout(() => titleInput?.focus(), 0);
    }
  }

  function saveTitle() {
    if (editedTitle.trim()) {
      updateTitle(editedTitle.trim());
    }
    isEditingTitle = false;
  }

  function handleTitleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveTitle();
    } else if (event.key === 'Escape') {
      isEditingTitle = false;
    }
  }

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

  function handleDelete() {
    openModal('delete-confirm');
  }

  function handleKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    // Save: Cmd+S
    if (modifier && event.key === 's') {
      event.preventDefault();
      saveNow();
      return;
    }

    // Format shortcuts (Cmd+Shift+...)
    if (modifier && event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case 't': // Title (H1)
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 1 });
          break;
        case 'h': // Heading (H2)
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 2 });
          break;
        case 'j': // Subheading (H3)
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 3 });
          break;
        case 'b': // Body (remove heading)
          event.preventDefault();
          dispatch('format', { type: 'heading', level: 0 });
          break;
      }
      return;
    }

    // Font size: Cmd+Plus / Cmd+Minus
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
  }

  // Formatting commands
  function toggleBold() {
    dispatch('format', { type: 'bold' });
  }

  function toggleItalic() {
    dispatch('format', { type: 'italic' });
  }

  function setHeading(level: number) {
    const newLevel = activeFormats.heading === level ? 0 : level;
    dispatch('format', { type: 'heading', level: newLevel });
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      {:else}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      {/if}
    </button>

    {#if isEditingTitle}
      <input
        bind:this={titleInput}
        bind:value={editedTitle}
        on:blur={saveTitle}
        on:keydown={handleTitleKeyDown}
        class="title-input"
        type="text"
        aria-label="Document title"
      />
    {:else}
      <button
        class="title-btn"
        on:click={startEditTitle}
        title="Click to rename"
        aria-label="Document title: {$currentDocument?.title || 'Untitled'}"
      >
        {$currentDocument?.title || 'Untitled'}
      </button>
    {/if}
  </div>

  <div class="toolbar-center">
    <button
      class="format-btn"
      class:active={activeFormats.bold}
      on:click={toggleBold}
      title="Bold"
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
      title="Italic"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="19" y1="4" x2="10" y2="4"/>
        <line x1="14" y1="20" x2="5" y2="20"/>
        <line x1="15" y1="4" x2="9" y2="20"/>
      </svg>
    </button>

    <div class="format-divider"></div>

    <button
      class="format-btn heading-btn"
      class:active={activeFormats.heading === 1}
      on:click={() => setHeading(1)}
      title="Heading 1"
    >H1</button>
    <button
      class="format-btn heading-btn"
      class:active={activeFormats.heading === 2}
      on:click={() => setHeading(2)}
      title="Heading 2"
    >H2</button>
    <button
      class="format-btn heading-btn"
      class:active={activeFormats.heading === 3}
      on:click={() => setHeading(3)}
      title="Heading 3"
    >H3</button>

    <div class="format-divider"></div>

    <div class="font-container">
      <button
        class="font-select-btn"
        on:click|stopPropagation={() => showFontMenu = !showFontMenu}
        title="Font family"
      >
        {fontLabel}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {#if showFontMenu}
        <div class="font-menu">
          <button class="font-option" class:active={$settings.fontFamily === 'mono'} on:click={() => setFont('mono')}>Mono</button>
          <button class="font-option" class:active={$settings.fontFamily === 'serif'} on:click={() => setFont('serif')}>Serif</button>
          <button class="font-option" class:active={$settings.fontFamily === 'sans'} on:click={() => setFont('sans')}>Sans</button>
        </div>
      {/if}
    </div>

    <div class="font-size-control">
      <button class="size-btn" on:click={() => adjustFontSize(-1)} title="Decrease font size">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
        </svg>
      </button>
      <span class="size-value">{$settings.fontSize}</span>
      <button class="size-btn" on:click={() => adjustFontSize(1)} title="Increase font size">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>

    <div class="format-divider"></div>

    <button
      class="mode-btn"
      class:active={$settings.focusMode}
      on:click={toggleFocusMode}
      title="Focus Mode - dims other paragraphs"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
      Focus
    </button>
    <button
      class="mode-btn"
      class:active={$settings.typewriterMode}
      on:click={toggleTypewriterMode}
      title="Typewriter Mode - keeps cursor centered"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <line x1="6" y1="8" x2="18" y2="8"/>
        <line x1="6" y1="12" x2="18" y2="12"/>
        <line x1="6" y1="16" x2="12" y2="16"/>
      </svg>
      Typewriter
    </button>
  </div>

  <div class="toolbar-right">
    <div class="export-container">
      <button
        class="export-btn"
        on:click|stopPropagation={() => showExportMenu = !showExportMenu}
        title="Export document"
        aria-expanded={showExportMenu}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
      </button>

      {#if showExportMenu}
        <div class="export-menu" role="menu">
          <button class="menu-item" on:click={() => handleExport('md')} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Export as .md
          </button>
          <button class="menu-item" on:click={() => handleExport('txt')} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
            Export as .txt
          </button>
        </div>
      {/if}
    </div>

    <button
      class="icon-btn"
      on:click={handleSettings}
      title="Settings"
      aria-label="Settings"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <button
      class="icon-btn danger"
      on:click={handleDelete}
      title="Delete document"
      aria-label="Delete document"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    height: 64px;
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
    gap: var(--space-1);
    flex: 1;
    justify-content: center;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .icon-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .title-btn {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-btn:hover {
    background: var(--color-bg-tertiary);
  }

  .title-input {
    font-size: 1rem;
    font-weight: 600;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--color-accent);
    border-radius: var(--radius-md);
    width: 180px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .title-input:focus {
    box-shadow: var(--glow-accent);
  }

  /* Format buttons */
  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .format-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .format-btn.active {
    background: var(--color-accent);
    color: white;
  }

  .format-btn.active:hover {
    box-shadow: var(--glow-accent);
  }

  .heading-btn {
    font-size: 0.75rem;
    min-width: 32px;
  }

  .format-divider {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 var(--space-2);
  }

  /* Font selector */
  .font-container {
    position: relative;
  }

  .font-select-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .font-select-btn:hover {
    color: var(--color-text-primary);
  }

  .font-menu {
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
  }

  .font-option {
    display: block;
    width: 100%;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
    text-align: left;
    white-space: nowrap;
    transition: background var(--transition-fast);
  }

  .font-option:hover {
    background: var(--color-bg-tertiary);
  }

  .font-option.active {
    background: var(--color-accent);
    color: white;
  }

  /* Font size control */
  .font-size-control {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--space-1);
  }

  .size-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .size-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .size-value {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-primary);
    min-width: 24px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  /* Mode buttons */
  .mode-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
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

  .mode-btn.active:hover {
    box-shadow: var(--glow-accent);
  }

  /* Export dropdown */
  .export-container {
    position: relative;
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .export-btn:hover {
    background: var(--color-accent-hover);
    box-shadow: var(--glow-accent);
  }

  .export-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    min-width: 180px;
    padding: var(--space-2);
    z-index: 1000;
    animation: menuPop var(--transition-fast) ease-out;
  }

  @keyframes menuPop {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-lg);
    transition: background var(--transition-fast);
    text-align: left;
  }

  .menu-item:hover {
    background: var(--color-bg-tertiary);
  }

  @media (max-width: 900px) {
    .toolbar-center {
      display: none;
    }
  }
</style>
