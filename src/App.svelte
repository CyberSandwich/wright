<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeDocuments, currentDocument } from './stores/documents';
  import { loadSettings } from './stores/settings';
  import Sidebar from './components/Sidebar.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import Editor from './components/Editor.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import DeleteConfirmModal from './components/DeleteConfirmModal.svelte';
  import './styles/global.css';

  let isLoading = true;

  onMount(async () => {
    await loadSettings();
    await initializeDocuments();
    isLoading = false;
  });
</script>

<svelte:head>
  <title>{$currentDocument?.title || 'Wright'} - Wright</title>
</svelte:head>

{#if isLoading}
  <div class="loading">
    <div class="loading-spinner"></div>
    <p>Loading...</p>
  </div>
{:else}
  <div class="app">
    <Sidebar />
    <main class="main-content">
      <Toolbar />
      <Editor />
    </main>
  </div>

  <SettingsModal />
  <DeleteConfirmModal />

  <!-- Screen reader status announcements -->
  <div id="editor-status" role="status" aria-live="polite" class="sr-only"></div>
{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: var(--space-4);
    color: var(--color-text-secondary);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
