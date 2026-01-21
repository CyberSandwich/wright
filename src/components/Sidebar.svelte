<script lang="ts">
  import { documents, currentDocumentId, loadDocument, newDocument, deleteCurrentDocument } from '../stores/documents';
  import { settings, toggleSidebar } from '../stores/settings';
  import { createDocument, deleteDocument, getDocument, getAllDocuments } from '../lib/db';
  import { fileSave } from 'browser-fs-access';
  import type { Document } from '../lib/db';

  let isDragOver = false;
  let openMenuId: number | null = null;

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  }

  function handleDocumentClick(doc: Document) {
    if (doc.id && openMenuId !== doc.id) {
      loadDocument(doc.id);
      // Close sidebar after selecting document
      toggleSidebar();
    }
  }

  function toggleMenu(e: MouseEvent, docId: number) {
    e.stopPropagation();
    openMenuId = openMenuId === docId ? null : docId;
  }

  function closeMenus() {
    openMenuId = null;
  }

  function handleBackdropClick() {
    toggleSidebar();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && $settings.sidebarOpen) {
      toggleSidebar();
    }
  }

  async function handleDeleteDoc(e: MouseEvent, doc: Document) {
    e.stopPropagation();
    openMenuId = null;
    if (!doc.id) return;

    // If deleting current document, switch to another
    if ($currentDocumentId === doc.id) {
      await deleteCurrentDocument();
    } else {
      await deleteDocument(doc.id);
      // Reload documents list
      const docs = await getAllDocuments();
      documents.set(docs);
    }
  }

  async function handleExportDoc(e: MouseEvent, doc: Document, format: 'md' | 'txt') {
    e.stopPropagation();
    openMenuId = null;

    let content = doc.content;
    let ext = '.md';
    let mimeType = 'text/markdown';

    if (format === 'txt') {
      content = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1');
      ext = '.txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const filename = `${doc.title || 'document'}${ext}`;

    try {
      await fileSave(blob, { fileName: filename, extensions: [ext] });
    } catch (err) {
      console.log('Export cancelled');
    }
  }

  async function handleMassExport(format: 'md' | 'txt') {
    for (const doc of $documents) {
      let content = doc.content;
      let ext = '.md';
      let mimeType = 'text/markdown';

      if (format === 'txt') {
        content = content
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1')
          .replace(/\[(.+?)\]\(.+?\)/g, '$1');
        ext = '.txt';
        mimeType = 'text/plain';
      }

      const blob = new Blob([content], { type: mimeType });
      const filename = `${doc.title || 'document'}${ext}`;

      try {
        await fileSave(blob, { fileName: filename, extensions: [ext] });
      } catch (err) {
        break; // User cancelled
      }
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;

    const files = e.dataTransfer?.files;
    if (!files) return;

    for (const file of files) {
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const content = await file.text();
        const title = file.name.replace(/\.(md|txt)$/, '');

        // Extract title from # heading if present
        const match = content.match(/^#\s+(.+)$/m);
        const extractedTitle = match ? match[1].trim() : title;

        await createDocument(extractedTitle, content);
      }
    }

    // Reload documents
    const docs = await getAllDocuments();
    documents.set(docs);
  }
</script>

<svelte:window on:click={closeMenus} on:keydown={handleKeydown} />

{#if $settings.sidebarOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="sidebar-backdrop" on:click={handleBackdropClick} role="presentation">
    <div
      class="sidebar-popup"
      class:drag-over={isDragOver}
      role="dialog"
      aria-modal="true"
      aria-label="Document library"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
    >
    <div class="sidebar-content">
      {#if isDragOver}
        <div class="drop-indicator">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>Drop files here</p>
        </div>
      {:else}
        <div class="document-list" role="listbox" aria-label="Documents">
          {#each $documents as doc (doc.id)}
            <div class="document-item-wrapper">
              <button
                class="document-item"
                class:active={$currentDocumentId === doc.id}
                on:click={() => handleDocumentClick(doc)}
                role="option"
                aria-selected={$currentDocumentId === doc.id}
              >
                <div class="doc-title">{doc.title || 'Untitled'}</div>
                <div class="doc-meta">
                  <span>{formatDate(doc.updatedAt)}</span>
                  <span>·</span>
                  <span>{doc.wordCount} words</span>
                </div>
              </button>

              <button
                class="doc-menu-btn"
                class:active={$currentDocumentId === doc.id}
                on:click={(e) => toggleMenu(e, doc.id!)}
                aria-label="Document options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="12" cy="6" r="1.5"/>
                  <circle cx="12" cy="18" r="1.5"/>
                </svg>
              </button>

              {#if openMenuId === doc.id}
                <div class="doc-menu" role="menu" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
                  <button class="doc-menu-item" on:click={(e) => handleExportDoc(e, doc, 'md')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export .md
                  </button>
                  <button class="doc-menu-item" on:click={(e) => handleExportDoc(e, doc, 'txt')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Export .txt
                  </button>
                  <div class="doc-menu-divider"></div>
                  <button class="doc-menu-item danger" on:click={(e) => handleDeleteDoc(e, doc)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                  </button>
                </div>
              {/if}
            </div>
          {/each}

          {#if $documents.length === 0}
            <div class="empty-state">
              <p>No documents yet</p>
              <p class="hint">Drop .md or .txt files here</p>
            </div>
          {/if}

          <div class="new-btn-container">
            <button class="new-doc-btn" on:click={newDocument} aria-label="Create new document">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
        </div>
      {/if}
    </div>

    {#if $documents.length > 0}
      <div class="sidebar-footer">
        <button class="footer-btn" on:click={() => handleMassExport('md')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          All .md
        </button>
        <button class="footer-btn" on:click={() => handleMassExport('txt')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          All .txt
        </button>
      </div>
    {/if}
    </div>
  </div>
{/if}

<style>
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .sidebar-popup {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    bottom: var(--space-4);
    display: flex;
    flex-direction: column;
    width: 320px;
    max-width: calc(100vw - var(--space-8));
    max-height: calc(100vh - var(--space-8));
    max-height: calc(100dvh - var(--space-8));
    background: var(--sidebar-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-xl);
    animation: slideIn var(--transition-normal) ease-out;
    transition: background var(--transition-fast);
    overflow: hidden;
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .sidebar-popup {
      top: var(--space-2);
      left: var(--space-2);
      right: var(--space-2);
      bottom: var(--space-2);
      width: auto;
      max-width: none;
    }
  }

  /* Safe area support */
  @supports (padding-top: env(safe-area-inset-top)) {
    .sidebar-popup {
      top: max(var(--space-4), env(safe-area-inset-top));
      left: max(var(--space-4), env(safe-area-inset-left));
      bottom: max(var(--space-4), env(safe-area-inset-bottom));
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  .sidebar-popup.drag-over {
    background: var(--color-bg-tertiary);
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-top: var(--space-4);
  }

  .new-btn-container {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
    margin-top: var(--space-2);
  }

  .new-doc-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    color: white;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-md);
  }

  .new-doc-btn:hover {
    transform: scale(1.08);
    box-shadow: var(--glow-accent), var(--shadow-lg);
  }

  .new-doc-btn:active {
    transform: scale(0.95);
    box-shadow: var(--shadow-sm);
  }

  .footer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .footer-btn:hover {
    background: var(--color-bg-tertiary);
    box-shadow: var(--shadow-md);
  }

  .drop-indicator {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    color: var(--color-accent);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .drop-indicator p {
    font-size: 1rem;
    font-weight: 600;
  }

  .document-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-3);
    -webkit-overflow-scrolling: touch;
  }

  .document-item-wrapper {
    position: relative;
    margin-bottom: var(--space-2);
  }

  .document-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--space-4) var(--space-5);
    padding-right: var(--space-12);
    border-radius: var(--radius-xl);
    text-align: left;
    transition: all var(--transition-fast);
    background: var(--color-bg-secondary);
    box-shadow: var(--shadow-sm);
  }

  .document-item:hover {
    background: var(--color-bg-tertiary);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  .document-item.active {
    background: var(--color-accent);
    color: white;
    box-shadow: var(--glow-accent), var(--shadow-md);
  }

  .document-item.active .doc-meta {
    color: rgba(255, 255, 255, 0.8);
  }

  .doc-title {
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    margin-bottom: var(--space-2);
  }

  .doc-meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .doc-menu-btn {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    opacity: 0;
    transition: all var(--transition-fast);
  }

  .document-item-wrapper:hover .doc-menu-btn {
    opacity: 1;
  }

  .doc-menu-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .doc-menu-btn.active {
    color: rgba(255, 255, 255, 0.7);
  }

  .doc-menu-btn.active:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .doc-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    min-width: 160px;
    padding: var(--space-2);
    z-index: 100;
    animation: menuPop var(--transition-fast) ease-out;
  }

  @keyframes menuPop {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .doc-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
    text-align: left;
  }

  .doc-menu-item:hover {
    background: var(--color-bg-tertiary);
  }

  .doc-menu-item.danger {
    color: #ef4444;
  }

  .doc-menu-item.danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .doc-menu-divider {
    height: 1px;
    background: var(--color-border-light);
    margin: var(--space-2) 0;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    text-align: center;
  }

  .empty-state p {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .empty-state .hint {
    margin-top: var(--space-2);
    font-size: var(--font-size-xs);
    opacity: 0.7;
  }

  .sidebar-footer {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: 1px solid var(--color-border-light);
  }
</style>
