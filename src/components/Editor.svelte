<script lang="ts">
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
  import { commonmark, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand, toggleLinkCommand, updateLinkCommand, wrapInBulletListCommand, wrapInOrderedListCommand } from '@milkdown/preset-commonmark';
  import { gfm, toggleStrikethroughCommand } from '@milkdown/preset-gfm';
  import { history } from '@milkdown/plugin-history';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { callCommand } from '@milkdown/utils';
  import { get } from 'svelte/store';
  import { currentDocument, currentDocumentId, updateContent } from '../stores/documents';
  import { settings } from '../stores/settings';
  import { calculateStats, debounce, formatTime, type TextStats } from '../lib/stats';
  import { underline, toggleUnderlineCommand } from '../lib/underline-plugin';

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
  // Uses a dynamic <style> element with nth-child selector to persist through ProseMirror DOM updates
  let focusModeStyleEl: HTMLStyleElement | null = null;
  let lastActiveBlockIndex: number = -1;

  function getBlockIndex(proseMirror: Element, activeBlock: Element): number {
    // Get the index of the active block among its siblings
    const blocks = proseMirror.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > pre');
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] === activeBlock || blocks[i].contains(activeBlock)) {
        return i;
      }
    }
    return -1;
  }

  function findActiveBlock(): Element | null {
    if (!editorContainer) return null;

    const proseMirror = editorContainer.querySelector('.ProseMirror');
    if (!proseMirror) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;

    // If we're in a text node, start with parent
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== proseMirror) {
      if (node instanceof Element) {
        const tag = node.tagName.toUpperCase();
        if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE'].includes(tag)) {
          return node;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function applyFocusActiveStyle() {
    if (!get(settings).focusMode) return;

    const proseMirror = editorContainer?.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const activeBlock = findActiveBlock();
    if (!activeBlock) return;

    // Find the top-level block (direct child of ProseMirror)
    let topLevelBlock: Element = activeBlock;
    while (topLevelBlock.parentElement && topLevelBlock.parentElement !== proseMirror) {
      topLevelBlock = topLevelBlock.parentElement;
    }

    const blockIndex = getBlockIndex(proseMirror, topLevelBlock);

    // Only update if the index changed
    if (blockIndex === lastActiveBlockIndex) return;
    lastActiveBlockIndex = blockIndex;

    // Create or update the style element
    if (!focusModeStyleEl) {
      focusModeStyleEl = document.createElement('style');
      focusModeStyleEl.id = 'focus-mode-active-style';
      document.head.appendChild(focusModeStyleEl);
    }

    if (blockIndex >= 0) {
      // Use nth-child to target the active block
      // This CSS persists even when ProseMirror recreates the elements
      // Need high specificity to override Svelte's scoped CSS (which adds hash class)
      focusModeStyleEl.textContent = `
        .editor-container.focus-mode .milkdown .ProseMirror > *:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > *:nth-child(${blockIndex + 1}) *,
        .editor-container.focus-mode .milkdown .ProseMirror > h1:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > h2:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > h3:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > h4:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > h5:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > h6:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > p:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > ul:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > ul:nth-child(${blockIndex + 1}) li,
        .editor-container.focus-mode .milkdown .ProseMirror > ol:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > ol:nth-child(${blockIndex + 1}) li,
        .editor-container.focus-mode .milkdown .ProseMirror > blockquote:nth-child(${blockIndex + 1}),
        .editor-container.focus-mode .milkdown .ProseMirror > pre:nth-child(${blockIndex + 1}) {
          opacity: 1 !important;
        }
      `;
    }
  }

  function startFocusModeLoop() {
    applyFocusActiveStyle();
  }

  function stopFocusModeLoop() {
    lastActiveBlockIndex = -1;
    if (focusModeStyleEl) {
      focusModeStyleEl.remove();
      focusModeStyleEl = null;
    }
  }

  // Typewriter mode - keep cursor vertically centered (only on typing)
  let scrollArea: HTMLElement | null = null;
  let typewriterAnimationFrame: number | null = null;
  let currentScrollTarget = 0;
  let isTypewriterAnimating = false;
  let typewriterAnimationStartTime = 0;
  const TYPEWRITER_MAX_ANIMATION_MS = 500; // Stop animation after 500ms max

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

    // Always keep cursor centered - update target with minimal threshold
    if (Math.abs(diff) > 2) {
      currentScrollTarget = scrollArea.scrollTop + diff;

      if (!isTypewriterAnimating) {
        typewriterAnimationStartTime = performance.now();
        animateTypewriterScroll();
      }
    }
  }

  function animateTypewriterScroll() {
    if (!scrollArea) return;

    // Stop animation if it's been running too long (prevents infinite loops)
    if (performance.now() - typewriterAnimationStartTime > TYPEWRITER_MAX_ANIMATION_MS) {
      isTypewriterAnimating = false;
      typewriterAnimationFrame = null;
      return;
    }

    const currentScroll = scrollArea.scrollTop;
    const diff = currentScrollTarget - currentScroll;

    // If we're close enough, stop animating
    if (Math.abs(diff) < 0.5) {
      isTypewriterAnimating = false;
      typewriterAnimationFrame = null;
      return;
    }

    isTypewriterAnimating = true;

    // Smooth easing - move 20% of remaining distance each frame
    // Fast enough to feel responsive, smooth enough to not jitter
    const step = diff * 0.20;
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

  // Debounced/throttled selection change handling to prevent excessive DOM operations
  let selectionChangeRaf: number | null = null;
  let lastSelectionChangeTime = 0;
  const SELECTION_CHANGE_THROTTLE_MS = 50; // Throttle to max 20 updates/second

  function handleSelectionChange() {
    const now = performance.now();

    // Throttle: skip if called too recently
    if (now - lastSelectionChangeTime < SELECTION_CHANGE_THROTTLE_MS) {
      // Schedule one final update after throttle period
      if (!selectionChangeRaf) {
        selectionChangeRaf = requestAnimationFrame(() => {
          selectionChangeRaf = null;
          lastSelectionChangeTime = performance.now();
          detectActiveFormats();
          // Apply focus mode style when selection changes
          if (get(settings).focusMode) {
            applyFocusActiveStyle();
          }
        });
      }
      return;
    }

    lastSelectionChangeTime = now;
    detectActiveFormats();
    // Apply focus mode style when selection changes
    if (get(settings).focusMode) {
      applyFocusActiveStyle();
    }
    // Typewriter mode is NOT triggered here - only on typing
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
    if (editorInstance) {
      editorInstance.action(callCommand(toggleUnderlineCommand.key));
    }
  }

  export function toggleStrikethrough() {
    if (editorInstance) {
      editorInstance.action(callCommand(toggleStrikethroughCommand.key));
    }
  }

  export function toggleBulletList() {
    if (editorInstance) {
      editorInstance.action(callCommand(wrapInBulletListCommand.key));
    }
  }

  export function toggleOrderedList() {
    if (editorInstance) {
      editorInstance.action(callCommand(wrapInOrderedListCommand.key));
    }
  }

  // Text color
  export function setTextColor(color: string) {
    if (!editorInstance || !editorContainer) return;

    // Save the current selection before focusing
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const savedRange = selection.getRangeAt(0).cloneRange();

    const proseMirror = editorContainer.querySelector('.ProseMirror') as HTMLElement;
    if (proseMirror) {
      proseMirror.focus();

      // Restore the selection
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }

        // Apply color after selection is restored
        requestAnimationFrame(() => {
          if (color === '') {
            document.execCommand('removeFormat', false);
          } else {
            document.execCommand('foreColor', false, color);
          }
        });
      });
    }
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
    if (!editorWrapper) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const wrapperRect = editorWrapper.getBoundingClientRect();

    // Position popup near selection, relative to the wrapper
    linkPopupPosition = {
      x: rect.left - wrapperRect.left + rect.width / 2,
      y: rect.bottom - wrapperRect.top + 8
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
          // Note: Focus mode is handled by its own RAF loop
          // Apply typewriter mode on content change
          if ($settings.typewriterMode) {
            requestAnimationFrame(() => applyTypewriterMode());
          }
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(underline)
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
      // Start focus mode loop if enabled
      if ($settings.focusMode) {
        startFocusModeLoop();
      }
    }
  });

  onDestroy(() => {
    document.removeEventListener('selectionchange', handleSelectionChange);
    cancelTypewriterAnimation();
    stopFocusModeLoop();
    if (selectionChangeRaf) {
      cancelAnimationFrame(selectionChangeRaf);
      selectionChangeRaf = null;
    }
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
      // Start the focus mode RAF loop
      startFocusModeLoop();
    } else {
      stopFocusModeLoop();
    }
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
      role="textbox"
      tabindex="0"
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
  .editor-container.focus-mode :global(.milkdown pre),
  .editor-container.focus-mode :global(p),
  .editor-container.focus-mode :global(h1),
  .editor-container.focus-mode :global(h2),
  .editor-container.focus-mode :global(h3),
  .editor-container.focus-mode :global(h4),
  .editor-container.focus-mode :global(h5),
  .editor-container.focus-mode :global(h6),
  .editor-container.focus-mode :global(li),
  .editor-container.focus-mode :global(blockquote),
  .editor-container.focus-mode :global(pre) {
    opacity: 0.25 !important;
    transition: opacity 0.2s ease;
  }

  /* Note: Active block in focus mode uses inline styles via JavaScript
     to ensure opacity: 1 is applied with highest priority */

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
