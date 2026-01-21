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
  let editorWrapper: HTMLDivElement;
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

  // Typewriter scroll - keep cursor centered
  function handleTypewriterScroll() {
    if (!$settings.typewriterMode || !editorWrapper) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const wrapperRect = editorWrapper.getBoundingClientRect();

    const cursorY = rect.top - wrapperRect.top + editorWrapper.scrollTop;
    const centerY = editorWrapper.clientHeight / 2;

    editorWrapper.scrollTo({
      top: cursorY - centerY,
      behavior: 'smooth'
    });
  }

  // Focus mode - highlight current paragraph
  function handleFocusMode() {
    if (!$settings.focusMode || !editorContainer) return;

    const proseMirror = editorContainer.querySelector('.ProseMirror');
    if (!proseMirror) return;

    // Remove previous focus class
    proseMirror.querySelectorAll('.focused-block').forEach(el => {
      el.classList.remove('focused-block');
    });

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Find the block-level parent of the cursor
    let node = selection.anchorNode;
    while (node && node !== proseMirror) {
      if (node.nodeType === Node.ELEMENT_NODE && node.parentNode === proseMirror) {
        (node as Element).classList.add('focused-block');
        break;
      }
      node = node.parentNode;
    }
  }

  // Combined handler for cursor movement
  function handleCursorChange() {
    if ($settings.typewriterMode) {
      setTimeout(handleTypewriterScroll, 10);
    }
    if ($settings.focusMode) {
      handleFocusMode();
    }
  }

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
          handleCursorChange();
        });
      })
      .use(commonmark)
      .use(history)
      .use(listener)
      .create();

    // Initial stats calculation
    stats = calculateStats(content);

    // Focus editor after init
    setTimeout(() => {
      const proseMirror = editorContainer.querySelector('.ProseMirror');
      if (proseMirror) {
        (proseMirror as HTMLElement).focus();

        // Add selection change listener for focus mode and typewriter mode
        document.addEventListener('selectionchange', handleCursorChange);
      }
    }, 100);
  }

  onMount(async () => {
    if ($currentDocument && editorContainer) {
      lastDocumentId = $currentDocumentId;
      await initEditor($currentDocument.content);
      isInitialized = true;
    }
  });

  onDestroy(() => {
    document.removeEventListener('selectionchange', handleCursorChange);
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

  // Reapply focus mode when toggled
  $: if ($settings.focusMode && isInitialized) {
    setTimeout(handleFocusMode, 50);
  }

  // Compute font styles
  $: fontFamily = $settings.fontFamily === 'mono'
    ? 'var(--font-family-editor)'
    : $settings.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : 'var(--font-family-ui)';
</script>

<div
  class="editor-wrapper"
  class:focus-mode={$settings.focusMode}
  class:typewriter-mode={$settings.typewriterMode}
  bind:this={editorWrapper}
>
  <div class="editor-scroll-area">
    <div
      class="editor-container"
      bind:this={editorContainer}
      style="--editor-font-family: {fontFamily}; --editor-font-size: {$settings.fontSize}px; --editor-line-height: {$settings.lineHeight};"
    ></div>
  </div>

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

  .editor-scroll-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .editor-container {
    min-height: 100%;
    padding: var(--space-12) var(--space-8);
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* Typewriter mode - add padding for centered cursor */
  .typewriter-mode .editor-container {
    padding-bottom: 50vh;
  }

  /* ProseMirror base styles */
  .editor-container :global(.milkdown) {
    font-family: var(--editor-font-family);
    font-size: var(--editor-font-size);
    line-height: var(--editor-line-height);
    color: var(--color-editor-text);
    outline: none;
    min-height: 300px;
  }

  .editor-container :global(.milkdown .ProseMirror) {
    outline: none;
    min-height: 300px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Cursor styling - blinking cursor */
  .editor-container :global(.milkdown .ProseMirror) {
    caret-color: var(--color-cursor);
  }

  .editor-container :global(.milkdown .ProseMirror:focus) {
    outline: none;
  }

  /* Placeholder text for empty editor */
  .editor-container :global(.milkdown .ProseMirror p.is-editor-empty:first-child::before) {
    content: 'Start writing...';
    color: var(--color-text-muted);
    pointer-events: none;
    float: left;
    height: 0;
  }

  /* Paragraphs */
  .editor-container :global(.milkdown p) {
    margin: 0 0 1em 0;
  }

  .editor-container :global(.milkdown p:last-child) {
    margin-bottom: 0;
  }

  /* Headings */
  .editor-container :global(.milkdown h1),
  .editor-container :global(.milkdown h2),
  .editor-container :global(.milkdown h3),
  .editor-container :global(.milkdown h4),
  .editor-container :global(.milkdown h5),
  .editor-container :global(.milkdown h6) {
    color: var(--color-heading);
    font-weight: 700;
    margin: 1.5em 0 0.5em 0;
    line-height: 1.3;
  }

  .editor-container :global(.milkdown h1) {
    font-size: 2em;
    border-bottom: 1px solid var(--color-border-light);
    padding-bottom: 0.3em;
  }

  .editor-container :global(.milkdown h2) {
    font-size: 1.5em;
  }

  .editor-container :global(.milkdown h3) {
    font-size: 1.25em;
  }

  .editor-container :global(.milkdown h4) {
    font-size: 1.1em;
  }

  /* Links */
  .editor-container :global(.milkdown a) {
    color: var(--color-link);
    text-decoration: none;
    border-bottom: 1px solid var(--color-link);
    transition: opacity 0.15s ease;
  }

  .editor-container :global(.milkdown a:hover) {
    opacity: 0.8;
  }

  /* Code */
  .editor-container :global(.milkdown code) {
    font-family: var(--font-family-editor);
    background: var(--color-code-bg);
    color: var(--color-code);
    padding: 0.2em 0.4em;
    border-radius: var(--radius-sm);
    font-size: 0.875em;
  }

  .editor-container :global(.milkdown pre) {
    background: var(--color-code-bg);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 1.5em 0;
    border: 1px solid var(--color-border-light);
  }

  .editor-container :global(.milkdown pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  /* Blockquotes */
  .editor-container :global(.milkdown blockquote) {
    border-left: 3px solid var(--color-accent);
    padding: 0.5em 0 0.5em var(--space-4);
    margin: 1.5em 0;
    color: var(--color-blockquote);
    background: var(--color-bg-secondary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .editor-container :global(.milkdown blockquote p) {
    margin: 0;
  }

  /* Lists */
  .editor-container :global(.milkdown ul),
  .editor-container :global(.milkdown ol) {
    padding-left: 1.5em;
    margin: 1em 0;
  }

  .editor-container :global(.milkdown li) {
    margin: 0.25em 0;
  }

  .editor-container :global(.milkdown li > p) {
    margin: 0;
  }

  /* Horizontal rules */
  .editor-container :global(.milkdown hr) {
    border: none;
    height: 2px;
    background: var(--color-border);
    margin: 2em 0;
    border-radius: 1px;
  }

  /* Bold and italic */
  .editor-container :global(.milkdown strong) {
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .editor-container :global(.milkdown em) {
    font-style: italic;
  }

  /* Selection */
  .editor-container :global(.milkdown .ProseMirror ::selection) {
    background: var(--color-selection);
  }

  /* Focus mode - dim all blocks except focused */
  .focus-mode .editor-container :global(.milkdown .ProseMirror > *) {
    opacity: 0.3;
    transition: opacity 0.2s ease;
  }

  .focus-mode .editor-container :global(.milkdown .ProseMirror > .focused-block) {
    opacity: 1;
  }

  /* Footer */
  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-secondary);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    flex-shrink: 0;
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
    transition: background 0.2s ease;
  }

  .save-status.saving::before {
    background: var(--color-accent);
    animation: pulse 1s infinite;
  }

  .save-status:not(.saving):not(.unsaved)::before {
    background: #10b981;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
