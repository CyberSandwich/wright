<script lang="ts">
  import { documents, currentDocumentId, loadDocument, newDocument, deleteCurrentDocument } from '../stores/documents';
  import { settings, toggleSidebar } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import type { Document } from '../lib/db';

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  function getPreview(content: string): string {
    const text = content.replace(/[#*_`\[\]]/g, '').trim();
    if (text.length <= 60) return text || 'Empty document';
    return text.substring(0, 60) + '...';
  }

  function handleDocumentClick(doc: Document) {
    if (doc.id) {
      loadDocument(doc.id);
    }
  }

  function handleNewDocument() {
    newDocument();
  }

  function handleKeyDown(event: KeyboardEvent, doc: Document) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDocumentClick(doc);
    }
  }
</script>

<aside class="sidebar" class:open={$settings.sidebarOpen} aria-label="Document library">
  <div class="sidebar-header">
    <h2>Wright</h2>
    <div class="header-actions">
      <button
        class="icon-button"
        on:click={handleNewDocument}
        title="New document"
        aria-label="Create new document"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
      <button
        class="icon-button toggle-btn"
        on:click={toggleSidebar}
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="document-list" role="listbox" aria-label="Documents">
    {#each $documents as doc (doc.id)}
      <button
        class="document-item"
        class:active={$currentDocumentId === doc.id}
        on:click={() => handleDocumentClick(doc)}
        on:keydown={(e) => handleKeyDown(e, doc)}
        role="option"
        aria-selected={$currentDocumentId === doc.id}
      >
        <div class="doc-title">{doc.title || 'Untitled'}</div>
        <div class="doc-meta">
          <span class="doc-date">{formatDate(doc.updatedAt)}</span>
          <span class="doc-words">{doc.wordCount} words</span>
        </div>
        <div class="doc-preview">{getPreview(doc.content)}</div>
      </button>
    {/each}

    {#if $documents.length === 0}
      <div class="empty-state">
        <p>No documents yet</p>
        <button class="create-btn" on:click={handleNewDocument}>
          Create your first document
        </button>
      </div>
    {/if}
  </div>

  <div class="sidebar-footer">
    <button
      class="icon-button"
      on:click={() => openModal('settings')}
      title="Settings"
      aria-label="Open settings"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</aside>

<!-- Collapsed sidebar toggle -->
{#if !$settings.sidebarOpen}
  <button
    class="sidebar-toggle-collapsed"
    on:click={toggleSidebar}
    title="Open sidebar"
    aria-label="Open sidebar"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </button>
{/if}

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    height: 100%;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--color-border-light);
    transition: transform var(--transition-normal), width var(--transition-normal);
    overflow: hidden;
  }

  .sidebar:not(.open) {
    width: 0;
    transform: translateX(-100%);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
  }

  .sidebar-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--space-1);
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .icon-button:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .document-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .document-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    text-align: left;
    transition: background var(--transition-fast);
    margin-bottom: var(--space-1);
  }

  .document-item:hover {
    background: var(--color-bg-tertiary);
  }

  .document-item.active {
    background: var(--color-accent);
    color: white;
  }

  .document-item.active .doc-meta,
  .document-item.active .doc-preview {
    color: rgba(255, 255, 255, 0.8);
  }

  .doc-title {
    font-weight: 500;
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .doc-meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .doc-preview {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
  }

  .create-btn {
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: background var(--transition-fast);
  }

  .create-btn:hover {
    background: var(--color-accent-hover);
  }

  .sidebar-footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border-light);
  }

  .sidebar-toggle-collapsed {
    position: fixed;
    left: var(--space-2);
    top: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    z-index: 1000;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .sidebar-toggle-collapsed:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }
</style>
