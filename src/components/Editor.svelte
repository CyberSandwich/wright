<script lang="ts">
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
  import { commonmark, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand, toggleLinkCommand, updateLinkCommand } from '@milkdown/preset-commonmark';
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
    underline: false,
    strikethrough: false,
    heading: null as number | null
  };

  // Link popup state
  let showLinkPopup = false;
  let linkUrl = '';
  let linkPopupPosition = { x: 0, y: 0 };
  let existingLinkHref: string | null = null;
  let linkInputEl: HTMLInputElement;

  const updateStats = debounce((content: string) => {
    stats = calculateStats(content);
  }, 300);

  // Syntax highlighting - just sets data attribute, no DOM manipulation
  function updateSyntaxHighlighting() {
    if (!editorContainer) return;

    if ($settings.syntaxHighlight.length === 0) {
      editorContainer.removeAttribute('data-syntax-modes');
    } else {
      editorContainer.setAttribute('data-syntax-modes', $settings.syntaxHighlight.join(' '));
    }
  }

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
    let isUnderline = false;
    let isStrikethrough = false;
    let headingLevel: number | null = null;

    // Walk up the DOM tree to check for formatting
    while (node && node !== proseMirror) {
      if (node instanceof Element) {
        const tag = node.tagName;
        if (tag === 'STRONG' || tag === 'B') isBold = true;
        if (tag === 'EM' || tag === 'I') isItalic = true;
        if (tag === 'U') isUnderline = true;
        if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') isStrikethrough = true;
        if (tag === 'H1') headingLevel = 1;
        else if (tag === 'H2') headingLevel = 2;
        else if (tag === 'H3') headingLevel = 3;
        else if (tag === 'H4') headingLevel = 4;
        else if (tag === 'H5') headingLevel = 5;
        else if (tag === 'H6') headingLevel = 6;
      }
      node = node.parentNode;
    }

    activeFormats = { bold: isBold, italic: isItalic, underline: isUnderline, strikethrough: isStrikethrough, heading: headingLevel };
    dispatch('formatchange', activeFormats);
  }

  // Focus mode - dim non-active paragraphs
  function applyFocusMode() {
    if (!editorContainer || !$settings.focusMode) return;

    const proseMirror = editorContainer.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const selection = window.getSelection();
    let activeBlock: Element | null = null;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Find the active paragraph/block - start from the actual node
      let node: Node | null = range.startContainer;

      // If we're in a text node, start with parent
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }

      while (node && node !== proseMirror) {
        if (node instanceof Element) {
          const tag = node.tagName.toUpperCase();
          if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'].includes(tag)) {
            activeBlock = node;
            break;
          }
        }
        node = node.parentNode;
      }
    }

    // Remove active class from all blocks, add to active one
    const blocks = proseMirror.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    blocks.forEach((block) => {
      block.classList.remove('focus-active');
    });

    if (activeBlock) {
      activeBlock.classList.add('focus-active');
    }
  }

  function clearFocusMode() {
    if (!editorContainer) return;
    const blocks = editorContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    blocks.forEach((block) => {
      block.classList.remove('focus-active');
    });
  }

  // Typewriter mode - keep cursor vertically centered (only on typing)
  let scrollArea: HTMLElement | null = null;
  let typewriterAnimationFrame: number | null = null;
  let currentScrollTarget = 0;
  let isTypewriterAnimating = false;

  function applyTypewriterMode() {
    if (!$settings.typewriterMode) return;

    // Get the scroll area element
    if (!scrollArea) {
      scrollArea = editorWrapper?.querySelector('.editor-scroll-area') as HTMLElement;
    }
    if (!scrollArea) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Only proceed if cursor is collapsed (not selecting text)
    if (!range.collapsed) return;

    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    if (!rect || rect.height === 0) return;

    const scrollAreaRect = scrollArea.getBoundingClientRect();

    // Calculate target position (center of scroll area)
    const targetY = scrollAreaRect.height / 2;
    const cursorRelativeY = rect.top - scrollAreaRect.top;
    const diff = cursorRelativeY - targetY;

    // Only scroll if cursor is noticeably off-center
    if (Math.abs(diff) > 40) {
      currentScrollTarget = scrollArea.scrollTop + diff;

      if (!isTypewriterAnimating) {
        animateTypewriterScroll();
      }
    }
  }

  function animateTypewriterScroll() {
    if (!scrollArea) return;

    const currentScroll = scrollArea.scrollTop;
    const diff = currentScrollTarget - currentScroll;

    // If we're close enough, stop animating
    if (Math.abs(diff) < 1) {
      isTypewriterAnimating = false;
      return;
    }

    isTypewriterAnimating = true;

    // Smooth easing - move 12% of remaining distance each frame
    // This creates a buttery smooth deceleration effect
    const step = diff * 0.12;
    scrollArea.scrollTop = currentScroll + step;

    typewriterAnimationFrame = requestAnimationFrame(animateTypewriterScroll);
  }

  function cancelTypewriterAnimation() {
    if (typewriterAnimationFrame) {
      cancelAnimationFrame(typewriterAnimationFrame);
      typewriterAnimationFrame = null;
    }
    isTypewriterAnimating = false;
  }

  function handleSelectionChange() {
    detectActiveFormats();
    if ($settings.focusMode) {
      applyFocusMode();
    }
    // Note: Typewriter mode is NOT triggered here - only on typing
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

  export function toggleUnderline() {
    if (!editorInstance) return;
    // Use execCommand for underline since it's not in standard Markdown
    document.execCommand('underline', false);
  }

  export function toggleStrikethrough() {
    if (!editorInstance) return;
    // Use execCommand for strikethrough
    document.execCommand('strikethrough', false);
  }

  // Link functions
  function detectExistingLink(): string | null {
    if (!editorContainer) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;

    while (node && node !== editorContainer) {
      if (node instanceof Element && node.tagName === 'A') {
        return (node as HTMLAnchorElement).href;
      }
      node = node.parentNode;
    }
    return null;
  }

  export function openLinkPopup() {
    if (!editorContainer) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = editorContainer.getBoundingClientRect();

    // Position popup near selection
    linkPopupPosition = {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 8
    };

    existingLinkHref = detectExistingLink();
    linkUrl = existingLinkHref || '';
    showLinkPopup = true;

    // Focus input after popup is shown
    tick().then(() => {
      linkInputEl?.focus();
      linkInputEl?.select();
    });
  }

  function applyLink() {
    if (!editorInstance) return;

    if (linkUrl.trim()) {
      // Add https:// if no protocol specified
      let url = linkUrl.trim();
      if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
        url = 'https://' + url;
      }

      if (existingLinkHref) {
        // Update existing link
        editorInstance.action(callCommand(updateLinkCommand.key, { href: url }));
      } else {
        // Add new link
        editorInstance.action(callCommand(toggleLinkCommand.key, { href: url }));
      }
    } else if (existingLinkHref) {
      // Remove link if URL is empty and there was an existing link
      editorInstance.action(callCommand(toggleLinkCommand.key, {}));
    }

    closeLinkPopup();
  }

  function closeLinkPopup() {
    showLinkPopup = false;
    linkUrl = '';
    existingLinkHref = null;

    // Return focus to editor
    const proseMirror = editorContainer?.querySelector('.ProseMirror') as HTMLElement;
    proseMirror?.focus();
  }

  function handleLinkKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeLinkPopup();
    }
  }

  // Handle Cmd+K shortcut
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openLinkPopup();
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
          // Apply modes on content change
          if ($settings.focusMode) {
            requestAnimationFrame(() => applyFocusMode());
          }
          if ($settings.typewriterMode) {
            requestAnimationFrame(() => applyTypewriterMode());
          }
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
    cancelTypewriterAnimation();
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
  $: if (isInitialized) {
    if ($settings.focusMode) {
      // Apply focus mode immediately when enabled
      requestAnimationFrame(() => applyFocusMode());
    } else {
      clearFocusMode();
    }
  }

  // React to syntax highlight changes
  $: if (isInitialized && editorContainer) {
    updateSyntaxHighlighting();
  }

  $: fontFamily = $settings.fontFamily === 'mono'
    ? 'var(--font-family-editor)'
    : $settings.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : 'var(--font-family-ui)';
</script>

<svelte:window on:keydown={handleKeydown} />

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

  {#if $settings.showWordCount || $settings.showLetterCount || $settings.showReadingTime}
    <div class="stats-bubble" class:typing={isTyping}>
      {#if $settings.showWordCount}
        <span>{stats.words} {stats.words === 1 ? 'word' : 'words'}</span>
      {/if}
      {#if $settings.showWordCount && $settings.showLetterCount}
        <span class="stats-dot">·</span>
      {/if}
      {#if $settings.showLetterCount}
        <span>{stats.charactersNoSpaces} {stats.charactersNoSpaces === 1 ? 'letter' : 'letters'}</span>
      {/if}
      {#if ($settings.showWordCount || $settings.showLetterCount) && $settings.showReadingTime && stats.words > 0}
        <span class="stats-dot">·</span>
      {/if}
      {#if $settings.showReadingTime && stats.words > 0}
        <span>{formatTime(stats.speakingTimeSeconds)}</span>
      {/if}
    </div>
  {/if}

  {#if showLinkPopup}
    <div
      class="link-popup"
      style="left: {linkPopupPosition.x}px; top: {linkPopupPosition.y}px;"
    >
      <div class="link-popup-arrow"></div>
      <input
        bind:this={linkInputEl}
        type="url"
        placeholder="Enter URL..."
        bind:value={linkUrl}
        on:keydown={handleLinkKeydown}
        class="link-input"
      />
      <div class="link-popup-actions">
        <button class="link-btn link-btn-apply" on:click={applyLink}>
          {existingLinkHref ? 'Update' : 'Add'}
        </button>
        {#if existingLinkHref}
          <button class="link-btn link-btn-remove" on:click={() => { linkUrl = ''; applyLink(); }}>
            Remove
          </button>
        {/if}
        <button class="link-btn link-btn-cancel" on:click={closeLinkPopup}>
          Cancel
        </button>
      </div>
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
    left: 50%;
    transform: translateX(-50%);
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

  /* Mobile safe area adjustment */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .stats-bubble {
      bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
    }
  }

  .stats-dot {
    opacity: 0.5;
  }

  .stats-bubble.typing {
    transform: translateX(-50%) scale(1.02);
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

  /* Syntax highlighting styles */
  .editor-container :global(.syntax-hl) {
    border-radius: 2px;
    padding: 0 1px;
    transition: background 0.15s ease;
  }

  .editor-container :global(.syntax-nouns) {
    color: var(--color-syntax-noun, #4A9EFF);
  }

  .editor-container :global(.syntax-verbs) {
    color: var(--color-syntax-verb, #FF6B6B);
  }

  .editor-container :global(.syntax-adjectives) {
    color: var(--color-syntax-adjective, #9D7CD8);
  }

  .editor-container :global(.syntax-adverbs) {
    color: var(--color-syntax-adverb, #7DCE82);
  }

  .editor-container :global(.syntax-conjunctions) {
    color: var(--color-syntax-conjunction, #F7B955);
  }

  /* Syntax highlighting - placeholder for future ProseMirror decoration implementation */
  .editor-container[data-syntax-modes] {
    /* Syntax modes are stored but visual highlighting requires ProseMirror decorations */
  }

  /* Focus mode - dim non-active blocks */
  .editor-container.focus-mode :global(.milkdown p),
  .editor-container.focus-mode :global(.milkdown h1),
  .editor-container.focus-mode :global(.milkdown h2),
  .editor-container.focus-mode :global(.milkdown h3),
  .editor-container.focus-mode :global(.milkdown h4),
  .editor-container.focus-mode :global(.milkdown h5),
  .editor-container.focus-mode :global(.milkdown h6),
  .editor-container.focus-mode :global(.milkdown li),
  .editor-container.focus-mode :global(.milkdown blockquote),
  .editor-container.focus-mode :global(.milkdown pre) {
    opacity: 0.25;
    transition: opacity 0.15s ease;
  }

  /* Active block in focus mode - more specific to override */
  .editor-container.focus-mode :global(.milkdown p.focus-active),
  .editor-container.focus-mode :global(.milkdown h1.focus-active),
  .editor-container.focus-mode :global(.milkdown h2.focus-active),
  .editor-container.focus-mode :global(.milkdown h3.focus-active),
  .editor-container.focus-mode :global(.milkdown h4.focus-active),
  .editor-container.focus-mode :global(.milkdown h5.focus-active),
  .editor-container.focus-mode :global(.milkdown h6.focus-active),
  .editor-container.focus-mode :global(.milkdown li.focus-active),
  .editor-container.focus-mode :global(.milkdown blockquote.focus-active),
  .editor-container.focus-mode :global(.milkdown pre.focus-active) {
    opacity: 1;
  }

  /* Link popup */
  .link-popup {
    position: absolute;
    transform: translateX(-50%);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-3);
    z-index: 100;
    min-width: 280px;
    animation: popIn 0.15s ease-out;
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  .link-popup-arrow {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    background: var(--color-bg-secondary);
    border-left: 1px solid var(--color-border);
    border-top: 1px solid var(--color-border);
    transform: translateX(-50%) rotate(45deg);
  }

  .link-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    outline: none;
    transition: all var(--transition-fast);
  }

  .link-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-glow);
  }

  .link-input::placeholder {
    color: var(--color-text-muted);
  }

  .link-popup-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .link-btn {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .link-btn-apply {
    background: var(--color-accent);
    color: white;
  }

  .link-btn-apply:hover {
    background: var(--color-accent-hover);
  }

  .link-btn-remove {
    background: var(--color-bg-tertiary);
    color: #EF4444;
  }

  .link-btn-remove:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .link-btn-cancel {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
  }

  .link-btn-cancel:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }
</style>
