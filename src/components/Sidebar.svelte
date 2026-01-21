<script lang="ts">
  import { documents, currentDocumentId, loadDocument, newDocument } from '../stores/documents';
  import { settings, toggleSidebar } from '../stores/settings';
  import { openModal } from '../stores/ui';
  import type { Document } from '../lib/db';

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  }

  function getPreview(content: string): string {
    const text = content.replace(/[#*_`\[\]]/g, '').trim();
    if (text.length <= 50) return text || 'Empty';
    return text.substring(0, 50) + '...';
  }

  function handleDocumentClick(doc: Document) {
    if (doc.id) {
      loadDocument(doc.id);
    }
  }
</script>

{#if $settings.sidebarOpen}
  <aside class="sidebar" aria-label="Document library">
    <div class="sidebar-header">
      <h1>Wright</h1>
      <button
        class="icon-btn"
        on:click={toggleSidebar}
        title="Close sidebar"
        aria-label="Close sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </div>

    <div class="sidebar-actions">
      <button class="new-doc-btn" on:click={newDocument} aria-label="Create new document">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New
      </button>
    </div>

    <div class="document-list" role="listbox" aria-label="Documents">
      {#each $documents as doc (doc.id)}
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
            <span>{doc.wordCount} words</span>
          </div>
        </button>
      {/each}

      {#if $documents.length === 0}
        <div class="empty-state">
          <p>No documents</p>
        </div>
      {/if}
    </div>

    <div class="sidebar-footer">
      <button
        class="icon-btn"
        on:click={() => openModal('settings')}
        title="Settings"
        aria-label="Open settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>
  </aside>
{/if}

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    height: 100%;
    background: var(--color-bg-secondary);
    border-right: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
  }

  .sidebar-header h1 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: background 0.15s, color 0.15s;
  }

  .icon-btn:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .sidebar-actions {
    padding: var(--space-3) var(--space-3);
  }

  .new-doc-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: background 0.15s;
  }

  .new-doc-btn:hover {
    background: var(--color-accent-hover);
  }

  .document-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-2);
  }

  .document-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    text-align: left;
    transition: background 0.15s;
    margin-bottom: 2px;
  }

  .document-item:hover {
    background: var(--color-bg-tertiary);
  }

  .document-item.active {
    background: var(--color-accent);
    color: white;
  }

  .document-item.active .doc-meta {
    color: rgba(255, 255, 255, 0.75);
  }

  .doc-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .doc-meta {
    display: flex;
    gap: var(--space-2);
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .empty-state {
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .sidebar-footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--color-border-light);
  }
</style>
