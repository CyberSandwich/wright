<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
  import { commonmark } from '@milkdown/preset-commonmark';
  import { history } from '@milkdown/plugin-history';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { currentDocument, currentDocumentId, updateContent, saveStatus } from '../stores/documents';
  import { settings } from '../stores/settings';
  import { calculateStats, debounce, type TextStats } from '../lib/stats';
  import Stats from './Stats.svelte';

  let editorContainer: HTMLDivElement;
  let editorInstance: Editor | null = null;
  let lastDocumentId: number | null = null;
  let isInitialized = false;
  let stats: TextStats = {
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0,
    speakingTime: 0
  };

  // Debounced stats calculation
  const updateStats = debounce((content: string) => {
    stats = calculateStats(content);
  }, 300);

  async function initEditor(content: string) {
    // Clear the container first
    if (editorContainer) {
      editorContainer.innerHTML = '';
    }

    // Destroy existing instance
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch (e) {
        // Editor might already be destroyed
      }
      editorInstance = null;
    }

    editorInstance = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          updateContent(markdown);
          updateStats(markdown);
        });
      })
      .use(commonmark)
      .use(history)
      .use(listener)
      .create();

    // Initial stats calculation
    stats = calculateStats(content);
  }

  onMount(async () => {
    if ($currentDocument && editorContainer) {
      lastDocumentId = $currentDocumentId;
      await initEditor($currentDocument.content);
      isInitialized = true;
    }
  });

  onDestroy(() => {
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch (e) {
        // Editor might already be destroyed
      }
    }
  });

  // Re-initialize editor only when document ID changes (not on every content update)
  $: if (isInitialized && editorContainer && $currentDocument && $currentDocumentId !== lastDocumentId) {
    lastDocumentId = $currentDocumentId;
    initEditor($currentDocument.content);
  }

  // Compute font styles
  $: fontFamily = $settings.fontFamily === 'mono'
    ? 'var(--font-family-editor)'
    : $settings.fontFamily === 'serif'
      ? 'Georgia, serif'
      : 'var(--font-family-ui)';
</script>

<div class="editor-wrapper" class:focus-mode={$settings.focusMode}>
  <div
    class="editor-container"
    bind:this={editorContainer}
    style="--editor-font-family: {fontFamily}; --editor-font-size: {$settings.fontSize}px; --editor-line-height: {$settings.lineHeight};"
  ></div>

  <div class="editor-footer">
    <Stats {stats} />
    <div class="save-status" class:saving={$saveStatus === 'saving'} class:unsaved={$saveStatus === 'unsaved'}>
      {#if $saveStatus === 'saving'}
        Saving...
      {:else if $saveStatus === 'unsaved'}
        Unsaved
      {:else}
        Saved
      {/if}
    </div>
  </div>
</div>

<style>
  .editor-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    overflow: hidden;
    background: var(--color-editor-bg);
  }

  .editor-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-8) var(--space-16);
    max-width: calc(var(--line-length) + var(--space-16) * 2);
    margin: 0 auto;
    width: 100%;
  }

  .editor-container :global(.milkdown) {
    font-family: var(--editor-font-family);
    font-size: var(--editor-font-size);
    line-height: var(--editor-line-height);
    color: var(--color-editor-text);
    outline: none;
    min-height: 100%;
  }

  .editor-container :global(.milkdown .editor) {
    outline: none;
  }

  .editor-container :global(.milkdown p) {
    margin-bottom: 1em;
  }

  .editor-container :global(.milkdown h1),
  .editor-container :global(.milkdown h2),
  .editor-container :global(.milkdown h3),
  .editor-container :global(.milkdown h4),
  .editor-container :global(.milkdown h5),
  .editor-container :global(.milkdown h6) {
    color: var(--color-heading);
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .editor-container :global(.milkdown h1) {
    font-size: 2em;
  }

  .editor-container :global(.milkdown h2) {
    font-size: 1.5em;
  }

  .editor-container :global(.milkdown h3) {
    font-size: 1.25em;
  }

  .editor-container :global(.milkdown a) {
    color: var(--color-link);
    text-decoration: underline;
  }

  .editor-container :global(.milkdown code) {
    font-family: var(--font-family-editor);
    background: var(--color-code-bg);
    color: var(--color-code);
    padding: 0.2em 0.4em;
    border-radius: var(--radius-sm);
    font-size: 0.9em;
  }

  .editor-container :global(.milkdown pre) {
    background: var(--color-code-bg);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 1em 0;
  }

  .editor-container :global(.milkdown pre code) {
    background: none;
    padding: 0;
  }

  .editor-container :global(.milkdown blockquote) {
    border-left: 3px solid var(--color-accent);
    padding-left: var(--space-4);
    margin-left: 0;
    color: var(--color-blockquote);
    font-style: italic;
  }

  .editor-container :global(.milkdown ul),
  .editor-container :global(.milkdown ol) {
    padding-left: var(--space-6);
    margin-bottom: 1em;
  }

  .editor-container :global(.milkdown li) {
    margin-bottom: 0.25em;
  }

  .editor-container :global(.milkdown hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 2em 0;
  }

  .editor-container :global(.milkdown strong) {
    font-weight: 600;
  }

  .editor-container :global(.milkdown em) {
    font-style: italic;
  }

  /* Focus mode styles */
  .focus-mode .editor-container :global(.milkdown .ProseMirror > *) {
    opacity: 0.3;
    transition: opacity 0.2s ease;
  }

  .focus-mode .editor-container :global(.milkdown .ProseMirror > *:has(.ProseMirror-focused)),
  .focus-mode .editor-container :global(.milkdown .ProseMirror > *.ProseMirror-focused) {
    opacity: 1;
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-secondary);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .save-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .save-status.saving {
    color: var(--color-accent);
  }

  .save-status.unsaved {
    color: var(--color-text-muted);
  }

  .save-status::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
  }

  .save-status.saving::before {
    background: var(--color-accent);
    animation: pulse 1s infinite;
  }

  .save-status:not(.saving):not(.unsaved)::before {
    background: #22c55e;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
