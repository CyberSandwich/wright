<script lang="ts">
  import { currentDocument, updateTitle, saveNow, updateContent } from '../stores/documents';
  import { settings, toggleSidebar, updateSetting, toggleFormatting } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import { fileOpen, fileSave } from 'browser-fs-access';

  let isEditingTitle = false;
  let titleInput: HTMLInputElement;
  let editedTitle = '';
  let showMenu = false;

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

  async function handleExportMd() {
    if (!$currentDocument) return;

    const blob = new Blob([$currentDocument.content], { type: 'text/markdown' });
    const filename = `${$currentDocument.title || 'document'}.md`;

    try {
      await fileSave(blob, {
        fileName: filename,
        extensions: ['.md'],
        description: 'Markdown files'
      });
    } catch (err) {
      console.log('Export cancelled:', err);
    }
  }

  async function handleExportTxt() {
    if (!$currentDocument) return;
    showMenu = false;

    const plainText = $currentDocument.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const filename = `${$currentDocument.title || 'document'}.txt`;

    try {
      await fileSave(blob, {
        fileName: filename,
        extensions: ['.txt'],
        description: 'Text files'
      });
    } catch (err) {
      console.log('Export cancelled:', err);
    }
  }

  async function handleImport() {
    showMenu = false;
    try {
      const file = await fileOpen({
        mimeTypes: ['text/markdown', 'text/plain'],
        extensions: ['.md', '.txt'],
        description: 'Markdown files'
      });

      const content = await file.text();
      if ($currentDocument) {
        updateContent(content);
      }
    } catch (err) {
      console.log('Import cancelled:', err);
    }
  }

  function handleDelete() {
    showMenu = false;
    openModal('delete-confirm');
  }

  function handleSettings() {
    showMenu = false;
    openModal('settings');
  }

  function cycleTheme() {
    showMenu = false;
    const newTheme = $settings.theme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', newTheme);
  }

  function handleKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.key === 's') {
      event.preventDefault();
      saveNow();
    }
  }

  function closeMenuOnClickOutside(event: MouseEvent) {
    if (showMenu) {
      showMenu = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} on:click={closeMenuOnClickOutside} />

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

  <div class="toolbar-right">
    <button
      class="icon-btn"
      class:active={$settings.showFormatting}
      on:click={toggleFormatting}
      title="Formatting"
      aria-label="Toggle formatting toolbar"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M4 7V4h16v3"/>
        <path d="M9 20h6"/>
        <path d="M12 4v16"/>
      </svg>
    </button>

    <button
      class="export-btn"
      on:click={handleExportMd}
      title="Export as Markdown"
      aria-label="Export as Markdown"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export
    </button>

    <div class="menu-container">
      <button
        class="icon-btn chevron-btn"
        class:open={showMenu}
        on:click|stopPropagation={() => showMenu = !showMenu}
        title="More options"
        aria-label="More options"
        aria-expanded={showMenu}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {#if showMenu}
        <div class="dropdown-menu" role="menu">
          <button class="menu-item" on:click={handleImport} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          <button class="menu-item" on:click={handleExportTxt} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Export as .txt
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" on:click={cycleTheme} role="menuitem">
            {#if $settings.theme === 'dark'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              Light Mode
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              Dark Mode
            {/if}
          </button>
          <button class="menu-item" on:click={handleSettings} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item danger" on:click={handleDelete} role="menuitem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    height: 64px;
    flex-shrink: 0;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
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
  }

  .icon-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .icon-btn.active {
    background: var(--color-accent);
    color: white;
    box-shadow: var(--glow-accent);
  }

  .chevron-btn svg {
    transition: transform var(--transition-fast);
  }

  .chevron-btn.open svg {
    transform: rotate(180deg);
  }

  .title-btn {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    transition: background var(--transition-fast);
    max-width: 300px;
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
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-accent);
    border-radius: var(--radius-lg);
    width: 300px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    box-shadow: var(--glow-accent);
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all var(--transition-fast);
    box-shadow: var(--glow-accent);
  }

  .export-btn:hover {
    background: var(--color-accent-hover);
    transform: translateY(-1px);
  }

  .menu-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    min-width: 200px;
    padding: var(--space-2);
    z-index: 1000;
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

  .menu-item.danger {
    color: #f87171;
  }

  .menu-item.danger:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border-light);
    margin: var(--space-2) 0;
  }
</style>
