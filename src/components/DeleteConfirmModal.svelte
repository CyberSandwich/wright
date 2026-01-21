<script lang="ts">
  import { currentDocument, deleteCurrentDocument } from '../stores/documents';
  import { modalState, closeModal } from '../stores/ui';

  async function handleDelete() {
    await deleteCurrentDocument();
    closeModal();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if $modalState.isOpen && $modalState.type === 'delete-confirm'}
  <div
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeyDown}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="delete-title"
    aria-describedby="delete-description"
    tabindex="-1"
  >
    <div class="modal">
      <div class="modal-header">
        <h2 id="delete-title">Delete Document</h2>
      </div>

      <div class="modal-body">
        <p id="delete-description">
          Are you sure you want to delete "{$currentDocument?.title || 'Untitled'}"? This action cannot be undone.
        </p>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={closeModal}>
          Cancel
        </button>
        <button class="btn btn-danger" on:click={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--color-bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 400px;
    overflow: hidden;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
  }

  .modal-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-primary);
  }

  .modal-body {
    padding: var(--space-4) var(--space-6);
  }

  .modal-body p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-secondary);
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .btn-secondary {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .btn-secondary:hover {
    background: var(--color-border);
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }
</style>
