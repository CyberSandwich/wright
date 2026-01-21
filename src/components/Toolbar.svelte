<script lang="ts">
  import { currentDocument, updateTitle, saveNow, updateContent } from '../stores/documents';
  import { settings, toggleSidebar, updateSetting } from '../stores/settings';
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

  async function handleExport() {
    if (!$currentDocument) return;
    showMenu = false;

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

  function cycleTheme() {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf($settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSetting('theme', nextTheme);
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
    {#if !$settings.sidebarOpen}
      <button
        class="icon-btn"
        on:click={toggleSidebar}
        title="Open sidebar"
        aria-label="Open sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    {/if}

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
      on:click={cycleTheme}
      title="Theme: {$settings.theme}"
      aria-label="Change theme"
    >
      {#if $settings.theme === 'light'}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else if $settings.theme === 'dark'}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      {/if}
    </button>

    <div class="menu-container">
      <button
        class="icon-btn"
        on:click|stopPropagation={() => showMenu = !showMenu}
        title="More actions"
        aria-label="More actions"
        aria-expanded={showMenu}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/>
          <circle cx="12" cy="5" r="1"/>
          <circle cx="12" cy="19" r="1"/>
        </svg>
      </button>

      {#if showMenu}
        <div class="dropdown-menu" role="menu">
          <button class="menu-item" on:click={handleImport} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          <button class="menu-item" on:click={handleExport} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item danger" on:click={handleDelete} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-light);
    height: 48px;
    flex-shrink: 0;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: background 0.15s, color 0.15s;
  }

  .icon-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .title-btn {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background 0.15s;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-btn:hover {
    background: var(--color-bg-secondary);
  }

  .title-input {
    font-size: var(--font-size-sm);
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    width: 200px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .menu-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    min-width: 140px;
    padding: var(--space-1);
    z-index: 1000;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-sm);
    transition: background 0.15s;
    text-align: left;
  }

  .menu-item:hover {
    background: var(--color-bg-secondary);
  }

  .menu-item.danger {
    color: #dc2626;
  }

  .menu-item.danger:hover {
    background: #fef2f2;
  }

  :global([data-theme="dark"]) .menu-item.danger:hover {
    background: rgba(220, 38, 38, 0.15);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border-light);
    margin: var(--space-1) 0;
  }
</style>
