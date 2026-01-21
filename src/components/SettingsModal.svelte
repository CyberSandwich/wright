<script lang="ts">
  import { settings, updateSetting, type Theme, type FontFamily } from '../stores/settings';
  import { modalState, closeModal } from '../stores/ui';

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

{#if $modalState.isOpen && $modalState.type === 'settings'}
  <div
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
  >
    <div class="modal">
      <div class="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button
          class="close-button"
          on:click={closeModal}
          aria-label="Close settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <section class="settings-section">
          <h3>Appearance</h3>

          <div class="setting-row">
            <label for="theme-select">Theme</label>
            <select
              id="theme-select"
              value={$settings.theme}
              on:change={(e) => updateSetting('theme', e.currentTarget.value as Theme)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div class="setting-row">
            <label for="font-select">Font</label>
            <select
              id="font-select"
              value={$settings.fontFamily}
              on:change={(e) => updateSetting('fontFamily', e.currentTarget.value as FontFamily)}
            >
              <option value="mono">Monospace</option>
              <option value="serif">Serif</option>
              <option value="sans">Sans-serif</option>
            </select>
          </div>

          <div class="setting-row">
            <label for="font-size">Font Size</label>
            <div class="slider-group">
              <input
                id="font-size"
                type="range"
                min="14"
                max="24"
                value={$settings.fontSize}
                on:input={(e) => updateSetting('fontSize', parseInt(e.currentTarget.value))}
              />
              <span class="slider-value">{$settings.fontSize}px</span>
            </div>
          </div>

          <div class="setting-row">
            <label for="line-height">Line Height</label>
            <div class="slider-group">
              <input
                id="line-height"
                type="range"
                min="1.2"
                max="2"
                step="0.1"
                value={$settings.lineHeight}
                on:input={(e) => updateSetting('lineHeight', parseFloat(e.currentTarget.value))}
              />
              <span class="slider-value">{$settings.lineHeight}</span>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Statistics</h3>

          <div class="setting-row">
            <label for="show-word-count">Show Word Count</label>
            <button
              id="show-word-count"
              class="toggle"
              class:active={$settings.showWordCount}
              on:click={() => updateSetting('showWordCount', !$settings.showWordCount)}
              role="switch"
              aria-checked={$settings.showWordCount}
              aria-label="Toggle word count display"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>

          <div class="setting-row">
            <label for="show-reading-time">Show Reading Time</label>
            <button
              id="show-reading-time"
              class="toggle"
              class:active={$settings.showReadingTime}
              on:click={() => updateSetting('showReadingTime', !$settings.showReadingTime)}
              role="switch"
              aria-checked={$settings.showReadingTime}
              aria-label="Toggle reading time display"
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
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
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 440px;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .close-button:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .modal-body {
    padding: var(--space-5) var(--space-6);
    overflow-y: auto;
  }

  .settings-section {
    margin-bottom: var(--space-6);
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h3 {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-4);
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
  }

  .setting-row label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  .setting-row select {
    padding: var(--space-2) var(--space-4);
    padding-right: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .setting-row select:hover {
    border-color: var(--color-accent);
  }

  .setting-row select:focus {
    border-color: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .slider-group input[type="range"] {
    width: 100px;
    accent-color: var(--color-accent);
  }

  .slider-value {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    min-width: 45px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .toggle {
    position: relative;
    width: 48px;
    height: 28px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .toggle:hover {
    background: var(--color-border);
  }

  .toggle.active {
    background: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  .toggle-slider {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .toggle.active .toggle-slider {
    transform: translateX(20px);
  }
</style>
