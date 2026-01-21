export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
  speakingTime: number;
}

export function calculateStats(text: string): TextStats {
  if (!text || !text.trim()) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTime: 0,
      speakingTime: 0
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

  // Reading time (based on Marc Brysbaert 2019 research - 238 WPM)
  const readingTime = Math.ceil(words / 238);

  // Speaking time (for presentations - 130 WPM)
  const speakingTime = Math.ceil(words / 130);

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingTime,
    speakingTime
  };
}

export function formatReadingTime(minutes: number): string {
  if (minutes === 0) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
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

// Throttle utility for scroll sync
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
