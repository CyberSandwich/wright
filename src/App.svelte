<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeDocuments, currentDocument } from './stores/documents';
  import { loadSettings, settings, toggleFocusMode } from './stores/settings';
  import Sidebar from './components/Sidebar.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import Editor from './components/Editor.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import DeleteConfirmModal from './components/DeleteConfirmModal.svelte';
  import './styles/global.css';

  let isLoading = true;
  let editorRef: Editor;
  let activeFormats = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    heading: null as number | null
  };

  onMount(async () => {
    await loadSettings();
    await initializeDocuments();
    isLoading = false;
  });

  function handleFormat(event: CustomEvent<{ type: string; level?: number; color?: string }>) {
    const { type, level, color } = event.detail;
    if (type === 'bold') {
      editorRef?.toggleBold();
    } else if (type === 'italic') {
      editorRef?.toggleItalic();
    } else if (type === 'underline') {
      editorRef?.toggleUnderline();
    } else if (type === 'strikethrough') {
      editorRef?.toggleStrikethrough();
    } else if (type === 'heading' && level !== undefined) {
      editorRef?.setHeading(level);
    } else if (type === 'link') {
      editorRef?.openLinkPopup();
    } else if (type === 'textColor' && color !== undefined) {
      editorRef?.setTextColor(color);
    } else if (type === 'bulletList') {
      editorRef?.toggleBulletList();
    } else if (type === 'orderedList') {
      editorRef?.toggleOrderedList();
    }
  }

  function handleFormatChange(event: CustomEvent<{ bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean; heading: number | null }>) {
    activeFormats = event.detail;
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Exit focus mode with Escape
    if (event.key === 'Escape' && $settings.focusMode) {
      toggleFocusMode();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<svelte:head>
  <title>{$currentDocument?.title || 'Wright'} - Wright</title>
</svelte:head>

{#if isLoading}
  <div class="loading">
    <div class="loading-spinner"></div>
    <p>Loading...</p>
  </div>
{:else}
  <div class="app" class:focus-mode={$settings.focusMode}>
    {#if !$settings.focusMode}
      <Sidebar />
    {/if}
    <main class="main-content">
      {#if !$settings.focusMode}
        <Toolbar {activeFormats} on:format={handleFormat} />
      {/if}
      <Editor bind:this={editorRef} on:formatchange={handleFormatChange} />
    </main>
  </div>

  {#if $settings.focusMode}
    <button
      class="exit-focus-btn"
      on:click={toggleFocusMode}
      title="Exit Focus Mode (Escape)"
      aria-label="Exit Focus Mode"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  {/if}

  <SettingsModal />
  <DeleteConfirmModal />

  <!-- Screen reader status announcements -->
  <div id="editor-status" role="status" aria-live="polite" class="sr-only"></div>
{/if}

<style>
  .app {
    display: flex;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: var(--space-4);
    color: var(--color-text-secondary);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Focus mode exit button */
  .exit-focus-btn {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    opacity: 0.3;
    transition: all var(--transition-fast);
    z-index: 100;
    box-shadow: var(--shadow-md);
  }

  .exit-focus-btn:hover {
    opacity: 1;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-lg);
  }

  @supports (top: env(safe-area-inset-top)) {
    .exit-focus-btn {
      top: max(var(--space-4), env(safe-area-inset-top));
      right: max(var(--space-4), env(safe-area-inset-right));
    }
  }
</style>
