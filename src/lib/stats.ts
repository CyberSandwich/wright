export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  speakingTimeSeconds: number;
}

export function calculateStats(text: string): TextStats {
  if (!text || !text.trim()) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      speakingTimeSeconds: 0
    };
  }

  // Word count (handles hyphenated words, contractions)
  const words = text.trim().match(/[\w'-]+/g)?.length || 0;

  // Character counts
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  // Sentence count
  const sentences = text.match(/[.!?]+/g)?.length || 0;

  // Paragraph count (non-empty lines separated by blank lines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || 1;

  // Speaking time in seconds (110 WPM)
  const speakingTimeSeconds = Math.round((words / 110) * 60);

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    speakingTimeSeconds
  };
}

export function formatTime(seconds: number): string {
  if (seconds === 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Debounce utility for stats calculation
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
