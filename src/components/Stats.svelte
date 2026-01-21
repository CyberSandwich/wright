<script lang="ts">
  import { settings } from '../stores/settings';
  import { formatTime, type TextStats } from '../lib/stats';

  export let stats: TextStats;
</script>

<div class="stats" role="status" aria-live="polite">
  {#if $settings.showWordCount}
    <span class="stat" aria-label="Word count">
      {stats.words} {stats.words === 1 ? 'word' : 'words'}
    </span>
  {/if}

  {#if $settings.showReadingTime && stats.words > 0}
    <span class="stat" aria-label="Estimated speaking time">
      {formatTime(stats.speakingTimeSeconds)}
    </span>
  {/if}
</div>

<style>
  .stats {
    display: flex;
    gap: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
</style>
