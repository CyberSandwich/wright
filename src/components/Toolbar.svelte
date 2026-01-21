<script lang="ts">
  import { currentDocument, saveNow } from '../stores/documents';
  import { settings, toggleSidebar, updateSetting, toggleFocusMode, toggleTypewriterMode, type FontFamily } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import { fileSave } from 'browser-fs-access';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let showExportMenu = false;
  let showFontMenu = false;
  let showHeadingMenu = false;
  let showTextColorMenu = false;

  const textColors = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' }
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
    showTextColorMenu = false;
  }

  function setTextColor(color: string) {
    showTextColorMenu = false;
    dispatch('format', { type: 'textColor', color });
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

  function toggleLink() {
    dispatch('format', { type: 'link' });
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

  function resetFontSize() {
    updateSetting('fontSize', 18);
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
  </div>

  <div class="toolbar-center">
    <!-- Format buttons -->
    <div class="format-group">
      <button
        class="format-btn"
        class:active={activeFormats.bold}
        on:mousedown|preventDefault={toggleBold}
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
        on:mousedown|preventDefault={toggleItalic}
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
        on:mousedown|preventDefault={toggleUnderline}
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
        on:mousedown|preventDefault={toggleStrikethrough}
        title="Strikethrough"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="12" x2="20" y2="12"/>
          <path d="M17.5 7.5c-1-1.5-2.5-2.5-5.5-2.5-4 0-6 2-6 4 0 1.5 1 3 6 4"/>
          <path d="M8.5 16.5c1 1 2.5 2.5 5.5 2.5 4 0 6-2 6-4"/>
        </svg>
      </button>
      <button
        class="format-btn"
        on:mousedown|preventDefault={toggleLink}
        title="Add Link (Cmd+K)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      <div class="color-dropdown">
        <button
          class="format-btn"
          on:click|stopPropagation={() => showTextColorMenu = !showTextColorMenu}
          title="Text Color"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 20h16"/>
            <path d="M9.5 4L6 16"/>
            <path d="M14.5 4L18 16"/>
            <path d="M7.5 12h9"/>
          </svg>
        </button>
        {#if showTextColorMenu}
          <div class="color-dropdown-menu">
            {#each textColors as { name, value }}
              <button
                class="color-option-btn"
                on:mousedown|preventDefault={() => setTextColor(value)}
                title={name}
              >
                {#if value === ''}
                  <span class="color-swatch-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4" y1="4" x2="20" y2="20"/>
                    </svg>
                  </span>
                {:else}
                  <span class="color-swatch-text" style="background: {value}"></span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="divider"></div>

    <!-- Heading dropdown -->
    <div class="dropdown-container">
      <button
        class="dropdown-btn heading-btn"
        on:click|stopPropagation={() => showHeadingMenu = !showHeadingMenu}
        title="Text style"
      >
        <span class="btn-label">{headingLabel}</span>
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

    <!-- Font dropdown -->
    <div class="dropdown-container">
      <button
        class="dropdown-btn font-btn"
        on:click|stopPropagation={() => showFontMenu = !showFontMenu}
        title="Font family"
      >
        <span class="btn-label">{fontLabel}</span>
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

    <div class="divider"></div>

    <!-- Font size control: - ○ + -->
    <div class="size-control">
      <button class="size-btn" on:click={() => adjustFontSize(-1)} title="Smaller">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="size-reset" on:click={resetFontSize} title="Reset to default (18px)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      </button>
      <button class="size-btn" on:click={() => adjustFontSize(1)} title="Larger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <div class="divider"></div>

    <!-- Mode buttons -->
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
    <!-- Export dropdown -->
    <div class="dropdown-container">
      <button
        class="export-btn"
        on:click|stopPropagation={() => showExportMenu = !showExportMenu}
        title="Export document"
        aria-expanded={showExportMenu}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Export</span>
      </button>

      {#if showExportMenu}
        <div class="dropdown-menu right">
          <button class="dropdown-item" on:click={() => handleExport('md')}>Export as .md</button>
          <button class="dropdown-item" on:click={() => handleExport('txt')}>Export as .txt</button>
        </div>
      {/if}
    </div>

    <!-- Settings -->
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
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    min-height: 56px;
    flex-shrink: 0;
    gap: var(--space-4);
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .toolbar-center {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    justify-content: center;
    flex-wrap: wrap;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
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
    border-radius: var(--radius-lg);
    padding: 4px;
  }

  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
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
    height: 28px;
    background: var(--color-border);
  }

  .dropdown-container {
    position: relative;
  }

  .dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    height: 40px;
    padding: 0 var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-lg);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .dropdown-btn:hover {
    background: var(--color-border);
  }

  .dropdown-btn.heading-btn {
    min-width: 110px;
  }

  .dropdown-btn.font-btn {
    min-width: 80px;
  }

  .dropdown-btn .btn-label {
    flex: 1;
    text-align: left;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-2);
    z-index: 100;
    min-width: 140px;
    animation: menuPop 0.15s ease-out;
  }

  .dropdown-menu.right {
    left: auto;
    right: 0;
    transform: none;
  }

  @keyframes menuPop {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .dropdown-menu.right {
    animation: menuPopRight 0.15s ease-out;
  }

  @keyframes menuPopRight {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
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

  /* Font size control: - ○ + */
  .size-control {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-lg);
    padding: 4px;
  }

  .size-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .size-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .size-reset {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .size-reset:hover {
    background: var(--color-bg-secondary);
    color: var(--color-accent);
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
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
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: 40px;
    padding: 0 var(--space-4);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .export-btn:hover {
    background: var(--color-accent-hover);
    box-shadow: var(--glow-accent);
  }

  /* Text color dropdown */
  .color-dropdown {
    position: relative;
  }

  .color-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    animation: menuPop 0.15s ease-out;
  }

  .color-option-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .color-option-btn:hover {
    background: var(--color-bg-tertiary);
    transform: scale(1.15);
  }

  .color-swatch-text {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .color-swatch-none {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
  }

  @media (max-width: 1000px) {
    .mode-btn {
      display: none;
    }
  }

  @media (max-width: 800px) {
    .toolbar-center {
      gap: var(--space-2);
    }
    .divider {
      display: none;
    }
    .dropdown-btn {
      padding: 0 var(--space-3);
    }
  }

  @media (max-width: 640px) {
    .toolbar {
      padding: var(--space-2) var(--space-3);
    }
    .toolbar-center {
      display: none;
    }
    .export-btn span {
      display: none;
    }
    .export-btn {
      padding: 0 var(--space-3);
    }
  }

  /* Safe area support for mobile */
  @supports (padding-top: env(safe-area-inset-top)) {
    .toolbar {
      padding-top: max(var(--space-3), env(safe-area-inset-top));
      padding-left: max(var(--space-4), env(safe-area-inset-left));
      padding-right: max(var(--space-4), env(safe-area-inset-right));
    }
  }
</style>
