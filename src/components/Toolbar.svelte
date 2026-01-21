<script lang="ts">
  import { currentDocument, updateTitle, deleteCurrentDocument, saveNow, updateContent } from '../stores/documents';
  import { settings, toggleFocusMode, toggleTypewriterMode, updateSetting } from '../stores/settings';
  import { openFind, openModal } from '../stores/ui';
  import { fileOpen, fileSave } from 'browser-fs-access';

  let isEditingTitle = false;
  let titleInput: HTMLInputElement;
  let editedTitle = '';

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

    const blob = new Blob([$currentDocument.content], { type: 'text/markdown' });
    const filename = `${$currentDocument.title || 'document'}.md`;

    try {
      await fileSave(blob, {
        fileName: filename,
        extensions: ['.md'],
        description: 'Markdown files'
      });
    } catch (err) {
      // User cancelled or error
      console.log('Export cancelled or failed:', err);
    }
  }

  async function handleImport() {
    try {
      const file = await fileOpen({
        mimeTypes: ['text/markdown', 'text/plain'],
        extensions: ['.md', '.txt'],
        description: 'Markdown files'
      });

      const content = await file.text();
      // For now, just replace current document content
      // In a full implementation, this would create a new document
      if ($currentDocument) {
        updateContent(content);
      }
    } catch (err) {
      console.log('Import cancelled or failed:', err);
    }
  }

  function handleDelete() {
    openModal('delete-confirm');
  }

  function cycleTheme() {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf($settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSetting('theme', nextTheme);
  }

  // Keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.key === 's') {
      event.preventDefault();
      saveNow();
    } else if (modifier && event.key === 'f') {
      event.preventDefault();
      openFind();
    } else if (modifier && event.shiftKey && event.key === 'd') {
      event.preventDefault();
      toggleFocusMode();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<header class="toolbar" role="toolbar" aria-label="Document toolbar">
  <div class="toolbar-left">
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
        class="title-button"
        on:click={startEditTitle}
        title="Click to rename"
        aria-label="Document title: {$currentDocument?.title || 'Untitled'}. Click to rename."
      >
        {$currentDocument?.title || 'Untitled'}
      </button>
    {/if}
  </div>

  <div class="toolbar-center">
    <div class="button-group" role="group" aria-label="Formatting options">
      <button
        class="toolbar-button"
        title="Bold (Cmd+B)"
        aria-label="Bold"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>
      <button
        class="toolbar-button"
        title="Italic (Cmd+I)"
        aria-label="Italic"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      <button
        class="toolbar-button"
        title="Heading"
        aria-label="Heading"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12h16"/>
          <path d="M4 6v12"/>
          <path d="M20 6v12"/>
        </svg>
      </button>
      <button
        class="toolbar-button"
        title="Link (Cmd+K)"
        aria-label="Insert link"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      <button
        class="toolbar-button"
        title="Code"
        aria-label="Code"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      </button>
      <button
        class="toolbar-button"
        title="List"
        aria-label="Bullet list"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="toolbar-right">
    <button
      class="toolbar-button"
      class:active={$settings.focusMode}
      on:click={toggleFocusMode}
      title="Focus mode"
      aria-label="Toggle focus mode"
      aria-pressed={$settings.focusMode}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>

    <button
      class="toolbar-button"
      class:active={$settings.typewriterMode}
      on:click={toggleTypewriterMode}
      title="Typewriter mode"
      aria-label="Toggle typewriter mode"
      aria-pressed={$settings.typewriterMode}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <line x1="6" y1="8" x2="6" y2="8"/>
        <line x1="10" y1="8" x2="10" y2="8"/>
        <line x1="14" y1="8" x2="14" y2="8"/>
        <line x1="18" y1="8" x2="18" y2="8"/>
        <line x1="6" y1="16" x2="18" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    </button>

    <button
      class="toolbar-button"
      on:click={cycleTheme}
      title="Theme: {$settings.theme}"
      aria-label="Change theme, current: {$settings.theme}"
    >
      {#if $settings.theme === 'light'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      {/if}
    </button>

    <div class="separator"></div>

    <button
      class="toolbar-button"
      on:click={handleImport}
      title="Import"
      aria-label="Import document"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>

    <button
      class="toolbar-button"
      on:click={handleExport}
      title="Export"
      aria-label="Export document"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>

    <button
      class="toolbar-button danger"
      on:click={handleDelete}
      title="Delete document"
      aria-label="Delete document"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-light);
    min-height: 48px;
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
  }

  .title-button {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-button:hover {
    background: var(--color-bg-secondary);
  }

  .title-input {
    font-size: var(--font-size-sm);
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    width: 200px;
  }

  .button-group {
    display: flex;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-1);
    gap: var(--space-1);
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .toolbar-button:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .toolbar-button.active {
    background: var(--color-accent);
    color: white;
  }

  .toolbar-button.danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  :global([data-theme="dark"]) .toolbar-button.danger:hover {
    background: rgba(220, 38, 38, 0.2);
    color: #f87171;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 var(--space-2);
  }

  @media (max-width: 768px) {
    .toolbar-center {
      display: none;
    }
  }
</style>
