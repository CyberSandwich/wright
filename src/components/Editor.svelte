<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
  import { commonmark, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand } from '@milkdown/preset-commonmark';
  import { history } from '@milkdown/plugin-history';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { callCommand } from '@milkdown/utils';
  import { currentDocument, currentDocumentId, updateContent } from '../stores/documents';
  import { settings, toggleFocusMode, toggleTypewriterMode } from '../stores/settings';
  import { calculateStats, debounce, formatTime, type TextStats } from '../lib/stats';

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
    readingTimeSeconds: 0,
    speakingTimeSeconds: 0
  };

  const updateStats = debounce((content: string) => {
    stats = calculateStats(content);
  }, 300);

  // Focus mode - dim non-active paragraphs
  function applyFocusMode() {
    if (!editorContainer || !$settings.focusMode) return;

    const proseMirror = editorContainer.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let activeBlock: Element | null = null;

    // Find the active paragraph/block
    let node: Node | null = range.startContainer;
    while (node && node !== proseMirror) {
      if (node instanceof Element && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(node.tagName)) {
        activeBlock = node;
        break;
      }
      node = node.parentNode;
    }

    // Apply dimming to all blocks except active
    const blocks = proseMirror.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    blocks.forEach((block) => {
      if (block === activeBlock) {
        (block as HTMLElement).style.opacity = '1';
      } else {
        (block as HTMLElement).style.opacity = '0.3';
      }
    });
  }

  function clearFocusMode() {
    if (!editorContainer) return;
    const blocks = editorContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    blocks.forEach((block) => {
      (block as HTMLElement).style.opacity = '1';
    });
  }

  // Typewriter mode - keep cursor vertically centered
  function applyTypewriterMode() {
    if (!editorWrapper || !$settings.typewriterMode) return;

    const proseMirror = editorContainer?.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const wrapperRect = editorWrapper.getBoundingClientRect();

    // Calculate where we want the cursor to be (center of visible area)
    const targetY = wrapperRect.top + wrapperRect.height / 2;
    const currentY = rect.top;
    const diff = currentY - targetY;

    if (Math.abs(diff) > 50) {
      editorWrapper.scrollBy({
        top: diff,
        behavior: 'smooth'
      });
    }
  }

  function handleSelectionChange() {
    if ($settings.focusMode) {
      applyFocusMode();
    }
    if ($settings.typewriterMode) {
      applyTypewriterMode();
    }
  }

  // Formatting commands
  function toggleBold() {
    if (editorInstance) {
      editorInstance.action(callCommand(toggleStrongCommand.key));
    }
  }

  function toggleItalic() {
    if (editorInstance) {
      editorInstance.action(callCommand(toggleEmphasisCommand.key));
    }
  }

  function setHeading(level: number) {
    if (editorInstance) {
      editorInstance.action(callCommand(wrapInHeadingCommand.key, level));
    }
  }

  async function initEditor(content: string) {
    if (editorContainer) {
      editorContainer.innerHTML = '';
    }

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

    stats = calculateStats(content);

    // Set up selection change listener for focus/typewriter modes
    document.addEventListener('selectionchange', handleSelectionChange);

    await tick();

    const proseMirror = editorContainer?.querySelector('.ProseMirror');
    if (proseMirror) {
      (proseMirror as HTMLElement).focus();
    }
  }

  onMount(async () => {
    if ($currentDocument && editorContainer) {
      lastDocumentId = $currentDocumentId;
      await initEditor($currentDocument.content);
      isInitialized = true;
    }
  });

  onDestroy(() => {
    document.removeEventListener('selectionchange', handleSelectionChange);
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch (e) {
        // Editor might already be destroyed
      }
    }
  });

  $: if (isInitialized && editorContainer && $currentDocument && $currentDocumentId !== lastDocumentId) {
    lastDocumentId = $currentDocumentId;
    initEditor($currentDocument.content);
  }

  // React to focus mode changes
  $: if (isInitialized && !$settings.focusMode) {
    clearFocusMode();
  }

  $: fontFamily = $settings.fontFamily === 'mono'
    ? 'var(--font-family-editor)'
    : $settings.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : 'var(--font-family-ui)';
</script>

<div class="editor-wrapper" bind:this={editorWrapper}>
  {#if $settings.showFormatting}
    <div class="formatting-bar">
      <button class="format-btn" on:click={toggleBold} title="Bold (Ctrl+B)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>
      <button class="format-btn" on:click={toggleItalic} title="Italic (Ctrl+I)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      <div class="format-divider"></div>
      <button class="format-btn" on:click={() => setHeading(1)} title="Heading 1">H1</button>
      <button class="format-btn" on:click={() => setHeading(2)} title="Heading 2">H2</button>
      <button class="format-btn" on:click={() => setHeading(3)} title="Heading 3">H3</button>
      <div class="format-divider"></div>
      <button
        class="format-btn"
        class:active={$settings.focusMode}
        on:click={toggleFocusMode}
        title="Focus Mode"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>
      <button
        class="format-btn"
        class:active={$settings.typewriterMode}
        on:click={toggleTypewriterMode}
        title="Typewriter Mode"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <line x1="6" y1="8" x2="18" y2="8"/>
          <line x1="6" y1="12" x2="18" y2="12"/>
          <line x1="6" y1="16" x2="12" y2="16"/>
        </svg>
      </button>
    </div>
  {/if}

  <div class="editor-scroll-area">
    <div
      class="editor-container"
      class:focus-mode={$settings.focusMode}
      class:typewriter-mode={$settings.typewriterMode}
      bind:this={editorContainer}
      style="--editor-font-family: {fontFamily}; --editor-font-size: {$settings.fontSize}px; --editor-line-height: {$settings.lineHeight};"
    ></div>
  </div>

  {#if $settings.showWordCount || $settings.showReadingTime}
    <div class="stats-bubble">
      {#if $settings.showWordCount}
        <span>{stats.words} words</span>
      {/if}
      {#if $settings.showWordCount && $settings.showReadingTime && stats.words > 0}
        <span class="stats-dot">·</span>
      {/if}
      {#if $settings.showReadingTime && stats.words > 0}
        <span>{formatTime(stats.readingTimeSeconds)}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: var(--color-editor-bg);
    position: relative;
  }

  .formatting-bar {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 var(--space-2);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .format-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .format-btn.active {
    background: var(--color-accent);
    color: white;
    box-shadow: var(--glow-accent);
  }

  .format-divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--space-2);
  }

  .editor-scroll-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .editor-container {
    min-height: 100%;
    padding: var(--space-8) var(--space-8);
    padding-bottom: 60vh;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  @media (min-width: 1200px) {
    .editor-container {
      max-width: 1000px;
      padding-left: var(--space-12);
      padding-right: var(--space-12);
    }
  }

  .editor-container.typewriter-mode {
    padding-top: 40vh;
  }

  /* Stats bubble */
  .stats-bubble {
    position: absolute;
    bottom: var(--space-6);
    right: var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(8px);
    z-index: 10;
  }

  .stats-dot {
    opacity: 0.5;
  }

  /* ProseMirror base styles */
  .editor-container :global(.milkdown) {
    font-family: var(--editor-font-family);
    font-size: var(--editor-font-size);
    line-height: var(--editor-line-height);
    color: var(--color-editor-text);
    outline: none;
    min-height: 200px;
  }

  .editor-container :global(.milkdown .ProseMirror) {
    outline: none;
    min-height: 200px;
    white-space: pre-wrap;
    word-wrap: break-word;
    caret-color: var(--color-accent);
  }

  .editor-container :global(.milkdown .ProseMirror:focus) {
    outline: none;
  }

  /* Paragraphs */
  .editor-container :global(.milkdown p) {
    margin: 0 0 1em 0;
    transition: opacity 0.2s ease;
  }

  .editor-container :global(.milkdown p:last-child) {
    margin-bottom: 0;
  }

  /* Headings */
  .editor-container :global(.milkdown h1),
  .editor-container :global(.milkdown h2),
  .editor-container :global(.milkdown h3),
  .editor-container :global(.milkdown h4) {
    color: var(--color-heading);
    font-weight: 700;
    margin: 1.5em 0 0.5em 0;
    line-height: 1.3;
    transition: opacity 0.2s ease;
  }

  .editor-container :global(.milkdown h1) { font-size: 2em; }
  .editor-container :global(.milkdown h2) { font-size: 1.5em; }
  .editor-container :global(.milkdown h3) { font-size: 1.25em; }
  .editor-container :global(.milkdown h4) { font-size: 1.1em; }

  /* Links */
  .editor-container :global(.milkdown a) {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Code */
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
    border-radius: var(--radius-lg);
    overflow-x: auto;
    margin: 1em 0;
  }

  .editor-container :global(.milkdown pre code) {
    background: none;
    padding: 0;
  }

  /* Blockquotes */
  .editor-container :global(.milkdown blockquote) {
    border-left: 3px solid var(--color-accent);
    padding-left: var(--space-4);
    margin: 1em 0;
    color: var(--color-text-secondary);
    transition: opacity 0.2s ease;
  }

  /* Lists */
  .editor-container :global(.milkdown ul),
  .editor-container :global(.milkdown ol) {
    padding-left: 1.5em;
    margin: 1em 0;
  }

  .editor-container :global(.milkdown li) {
    margin: 0.25em 0;
    transition: opacity 0.2s ease;
  }

  /* Bold and italic */
  .editor-container :global(.milkdown strong) {
    font-weight: 700;
  }

  .editor-container :global(.milkdown em) {
    font-style: italic;
  }

  /* Horizontal rules */
  .editor-container :global(.milkdown hr) {
    border: none;
    height: 2px;
    background: var(--color-border);
    margin: 2em 0;
    border-radius: 1px;
  }

  /* Selection */
  .editor-container :global(.milkdown .ProseMirror ::selection) {
    background: var(--color-selection);
  }
</style>
