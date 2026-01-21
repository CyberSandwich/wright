<script lang="ts">
  import { settings } from '../stores/settings';
  import { formatReadingTime, formatWordCount, type TextStats } from '../lib/stats';

  export let stats: TextStats;
</script>

<div class="stats" role="status" aria-live="polite">
  {#if $settings.showWordCount}
    <span class="stat" title="Word count">
      {formatWordCount(stats.words)} words
    </span>
  {/if}

  {#if $settings.showReadingTime && stats.words > 0}
    <span class="stat" title="Estimated reading time">
      {formatReadingTime(stats.readingTime)} read
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
