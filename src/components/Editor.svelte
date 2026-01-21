<script lang="ts">
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
  import { commonmark, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand } from '@milkdown/preset-commonmark';
  import { history } from '@milkdown/plugin-history';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { callCommand } from '@milkdown/utils';
  import { currentDocument, currentDocumentId, updateContent } from '../stores/documents';
  import { settings } from '../stores/settings';
  import { calculateStats, debounce, formatTime, type TextStats } from '../lib/stats';

  const dispatch = createEventDispatcher();

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
    speakingTimeSeconds: 0
  };

  // Typing effect state
  let isTyping = false;
  let typingTimeout: ReturnType<typeof setTimeout>;

  // Active format states
  let activeFormats = {
    bold: false,
    italic: false,
    heading: null as number | null
  };

  const updateStats = debounce((content: string) => {
    stats = calculateStats(content);
  }, 300);

  function triggerTypingEffect() {
    isTyping = true;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 150);
  }

  // Detect current formatting at cursor position
  function detectActiveFormats() {
    if (!editorContainer) return;

    const proseMirror = editorContainer.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;

    // Reset states
    let isBold = false;
    let isItalic = false;
    let headingLevel: number | null = null;

    // Walk up the DOM tree to check for formatting
    while (node && node !== proseMirror) {
      if (node instanceof Element) {
        const tag = node.tagName;
        if (tag === 'STRONG' || tag === 'B') isBold = true;
        if (tag === 'EM' || tag === 'I') isItalic = true;
        if (tag === 'H1') headingLevel = 1;
        else if (tag === 'H2') headingLevel = 2;
        else if (tag === 'H3') headingLevel = 3;
        else if (tag === 'H4') headingLevel = 4;
        else if (tag === 'H5') headingLevel = 5;
        else if (tag === 'H6') headingLevel = 6;
      }
      node = node.parentNode;
    }

    activeFormats = { bold: isBold, italic: isItalic, heading: headingLevel };
    dispatch('formatchange', activeFormats);
  }

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
    detectActiveFormats();
    if ($settings.focusMode) {
      applyFocusMode();
    }
    if ($settings.typewriterMode) {
      applyTypewriterMode();
    }
  }

  // Formatting commands - called from Toolbar via parent
  export function toggleBold() {
    if (editorInstance) {
      editorInstance.action(callCommand(toggleStrongCommand.key));
    }
  }

  export function toggleItalic() {
    if (editorInstance) {
      editorInstance.action(callCommand(toggleEmphasisCommand.key));
    }
  }

  export function setHeading(level: number) {
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
          triggerTypingEffect();
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
  <div class="editor-scroll-area">
    <div
      class="editor-container"
      class:focus-mode={$settings.focusMode}
      class:typewriter-mode={$settings.typewriterMode}
      class:typing={isTyping}
      bind:this={editorContainer}
      style="--editor-font-family: {fontFamily}; --editor-font-size: {$settings.fontSize}px; --editor-line-height: {$settings.lineHeight};"
    ></div>
  </div>

  {#if $settings.showWordCount || $settings.showReadingTime}
    <div class="stats-bubble" class:typing={isTyping}>
      {#if $settings.showWordCount}
        <span>{stats.words} words</span>
        <span class="stats-dot">·</span>
        <span>{stats.charactersNoSpaces} letters</span>
      {/if}
      {#if $settings.showWordCount && $settings.showReadingTime && stats.words > 0}
        <span class="stats-dot">·</span>
      {/if}
      {#if $settings.showReadingTime && stats.words > 0}
        <span>{formatTime(stats.speakingTimeSeconds)}</span>
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
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  }

  .stats-dot {
    opacity: 0.5;
  }

  .stats-bubble.typing {
    transform: scale(1.02);
  }

  /* Subtle typing pulse on cursor line */
  .editor-container.typing :global(.milkdown .ProseMirror) {
    --typing-glow: var(--color-accent-glow);
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

  /* Ensure cursor is visible in empty blocks */
  .editor-container :global(.milkdown .ProseMirror p:empty),
  .editor-container :global(.milkdown .ProseMirror h1:empty),
  .editor-container :global(.milkdown .ProseMirror h2:empty),
  .editor-container :global(.milkdown .ProseMirror h3:empty),
  .editor-container :global(.milkdown .ProseMirror h4:empty),
  .editor-container :global(.milkdown .ProseMirror h5:empty),
  .editor-container :global(.milkdown .ProseMirror h6:empty) {
    min-height: 1em;
  }

  .editor-container :global(.milkdown .ProseMirror p:empty::before),
  .editor-container :global(.milkdown .ProseMirror h1:empty::before),
  .editor-container :global(.milkdown .ProseMirror h2:empty::before),
  .editor-container :global(.milkdown .ProseMirror h3:empty::before),
  .editor-container :global(.milkdown .ProseMirror h4:empty::before),
  .editor-container :global(.milkdown .ProseMirror h5:empty::before),
  .editor-container :global(.milkdown .ProseMirror h6:empty::before) {
    content: '';
    display: inline-block;
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
