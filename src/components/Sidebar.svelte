<script lang="ts">
  import { documents, currentDocumentId, loadDocument, newDocument } from '../stores/documents';
  import { settings } from '../stores/settings';
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

  function handleDocumentClick(doc: Document) {
    if (doc.id) {
      loadDocument(doc.id);
    }
  }
</script>

{#if $settings.sidebarOpen}
  <aside class="sidebar" aria-label="Document library">
    <div class="sidebar-actions">
      <button class="new-doc-btn" on:click={newDocument} aria-label="Create new document">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New Document
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
            <span class="doc-date">{formatDate(doc.updatedAt)}</span>
            <span class="doc-words">{doc.wordCount} words</span>
          </div>
        </button>
      {/each}

      {#if $documents.length === 0}
        <div class="empty-state">
          <p>No documents yet</p>
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    height: 100%;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--color-border-light);
    flex-shrink: 0;
    padding-top: var(--space-4);
  }

  .sidebar-actions {
    padding: 0 var(--space-4) var(--space-4);
  }

  .new-doc-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-4);
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-xl);
    font-size: 1rem;
    font-weight: 600;
    transition: all var(--transition-fast);
    box-shadow: var(--glow-accent);
  }

  .new-doc-btn:hover {
    background: var(--color-accent-hover);
    transform: translateY(-1px);
  }

  .document-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-3);
  }

  .document-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-xl);
    text-align: left;
    transition: all var(--transition-fast);
    margin-bottom: var(--space-3);
    background: transparent;
  }

  .document-item:hover {
    background: var(--color-bg-tertiary);
  }

  .document-item.active {
    background: var(--color-accent);
    color: white;
    box-shadow: var(--glow-accent);
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
    gap: var(--space-3);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .empty-state {
    padding: var(--space-8) var(--space-4);
    text-align: center;
  }

  .empty-state p {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin: 0;
  }
</style>
