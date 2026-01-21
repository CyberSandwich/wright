<script lang="ts">
  import { settings, updateSetting, type Theme, type FontFamily, type AccentColor } from '../stores/settings';
  import { modalState, closeModal } from '../stores/ui';

  const accentColors: { value: AccentColor; color: string }[] = [
    { value: 'blue', color: '#3B82F6' },
    { value: 'purple', color: '#8B5CF6' },
    { value: 'pink', color: '#EC4899' },
    { value: 'red', color: '#EF4444' },
    { value: 'orange', color: '#F97316' },
    { value: 'green', color: '#22C55E' },
    { value: 'teal', color: '#14B8A6' }
  ];

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

  function setTheme(theme: Theme) {
    updateSetting('theme', theme);
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
            <span class="setting-label">Theme</span>
            <div class="theme-buttons">
              <button
                class="theme-btn"
                class:active={$settings.theme === 'light'}
                on:click={() => setTheme('light')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                </svg>
                Light
              </button>
              <button
                class="theme-btn"
                class:active={$settings.theme === 'dark'}
                on:click={() => setTheme('dark')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                Dark
              </button>
            </div>
          </div>

          <div class="setting-row">
            <span class="setting-label">Font</span>
            <div class="font-buttons">
              <button
                class="font-btn"
                class:active={$settings.fontFamily === 'mono'}
                on:click={() => updateSetting('fontFamily', 'mono')}
              >
                Mono
              </button>
              <button
                class="font-btn"
                class:active={$settings.fontFamily === 'serif'}
                on:click={() => updateSetting('fontFamily', 'serif')}
              >
                Serif
              </button>
              <button
                class="font-btn"
                class:active={$settings.fontFamily === 'sans'}
                on:click={() => updateSetting('fontFamily', 'sans')}
              >
                Sans
              </button>
            </div>
          </div>

          <div class="setting-row slider-row">
            <span class="setting-label">Font Size</span>
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

          <div class="setting-row slider-row">
            <span class="setting-label">Line Height</span>
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
              <span class="slider-value">{$settings.lineHeight.toFixed(1)}</span>
            </div>
          </div>

          <div class="setting-row">
            <span class="setting-label">Accent Color</span>
            <div class="color-buttons">
              {#each accentColors as { value, color }}
                <button
                  class="color-btn"
                  class:active={$settings.accentColor === value}
                  on:click={() => updateSetting('accentColor', value)}
                  aria-label="{value} accent color"
                  style="--btn-color: {color}"
                >
                  <span class="color-swatch"></span>
                </button>
              {/each}
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>Display</h3>

          <div class="setting-row toggle-row">
            <span class="setting-label">Word Count</span>
            <button
              class="toggle"
              class:active={$settings.showWordCount}
              on:click={() => updateSetting('showWordCount', !$settings.showWordCount)}
              role="switch"
              aria-checked={$settings.showWordCount}
            >
              <span class="toggle-slider"></span>
            </button>
          </div>

          <div class="setting-row toggle-row">
            <span class="setting-label">Letter Count</span>
            <button
              class="toggle"
              class:active={$settings.showLetterCount}
              on:click={() => updateSetting('showLetterCount', !$settings.showLetterCount)}
              role="switch"
              aria-checked={$settings.showLetterCount}
            >
              <span class="toggle-slider"></span>
            </button>
          </div>

          <div class="setting-row toggle-row">
            <span class="setting-label">Speaking Time</span>
            <button
              class="toggle"
              class:active={$settings.showReadingTime}
              on:click={() => updateSetting('showReadingTime', !$settings.showReadingTime)}
              role="switch"
              aria-checked={$settings.showReadingTime}
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
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-xl);
    width: 90%;
    max-width: 480px;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.25s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.96);
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
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .close-button:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .modal-body {
    padding: var(--space-6);
    overflow-y: auto;
  }

  .settings-section {
    margin-bottom: var(--space-8);
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
    margin-bottom: var(--space-5);
  }

  .setting-row {
    margin-bottom: var(--space-5);
  }

  .setting-row:last-child {
    margin-bottom: 0;
  }

  .setting-label {
    display: block;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: var(--space-3);
  }

  /* Theme buttons */
  .theme-buttons {
    display: flex;
    gap: var(--space-3);
  }

  .theme-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-tertiary);
    border: 2px solid transparent;
    border-radius: var(--radius-xl);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .theme-btn:hover {
    border-color: var(--color-border);
    color: var(--color-text-primary);
  }

  .theme-btn.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .theme-btn.active:hover {
    box-shadow: var(--glow-accent);
  }

  /* Font buttons */
  .font-buttons {
    display: flex;
    gap: var(--space-2);
  }

  .font-btn {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-tertiary);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .font-btn:hover {
    border-color: var(--color-border);
    color: var(--color-text-primary);
  }

  .font-btn.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .font-btn.active:hover {
    box-shadow: var(--glow-accent);
  }

  /* Slider rows */
  .slider-row .setting-label {
    margin-bottom: var(--space-4);
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .slider-group input[type="range"] {
    flex: 1;
    height: 8px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    appearance: none;
    cursor: pointer;
  }

  .slider-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: transform var(--transition-fast);
  }

  .slider-group input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: var(--glow-accent);
  }

  .slider-value {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    min-width: 50px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    background: var(--color-bg-tertiary);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
  }

  /* Toggle rows */
  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle-row .setting-label {
    margin-bottom: 0;
  }

  .toggle {
    position: relative;
    width: 56px;
    height: 32px;
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
  }

  .toggle.active:hover {
    box-shadow: var(--glow-accent);
  }

  .toggle-slider {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .toggle.active .toggle-slider {
    transform: translateX(24px);
  }

  /* Setting description */
  .setting-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: var(--space-1) 0 var(--space-3) 0;
  }

  /* Color picker buttons */
  .color-buttons {
    display: flex;
    gap: var(--space-2);
  }

  .color-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .color-btn:hover {
    transform: scale(1.1);
  }

  .color-btn.active {
    background: var(--color-bg-tertiary);
  }

  .color-btn .color-swatch {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--btn-color);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1), var(--shadow-sm);
    transition: all var(--transition-fast);
  }

  .color-btn.active .color-swatch {
    box-shadow: 0 0 0 2px var(--color-bg-secondary), 0 0 0 4px var(--btn-color);
  }
</style>
