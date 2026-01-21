import nlp from 'compromise';
import type { SyntaxHighlightType } from '../stores/settings';

// Cache for processed text to avoid re-processing
let lastText = '';
let lastModes: SyntaxHighlightType[] = [];
let lastHighlightedWords: Map<string, SyntaxHighlightType[]> = new Map();

export function getWordsToHighlight(text: string, modes: SyntaxHighlightType[]): Map<string, SyntaxHighlightType[]> {
  if (modes.length === 0) return new Map();

  // Return cached result if same input
  const modesKey = modes.sort().join(',');
  const lastModesKey = lastModes.sort().join(',');
  if (text === lastText && modesKey === lastModesKey) {
    return lastHighlightedWords;
  }

  const doc = nlp(text);
  const wordMap = new Map<string, SyntaxHighlightType[]>();

  // Process each selected mode
  modes.forEach(mode => {
    let words: string[] = [];

    switch (mode) {
      case 'nouns':
        words = doc.nouns().out('array');
        break;
      case 'verbs':
        words = doc.verbs().out('array');
        break;
      case 'adjectives':
        words = doc.adjectives().out('array');
        break;
      case 'adverbs':
        words = doc.adverbs().out('array');
        break;
      case 'conjunctions':
        words = doc.conjunctions().out('array');
        break;
    }

    // Add words to map with their types
    words.forEach(phrase => {
      phrase.toLowerCase().split(/\s+/).forEach(word => {
        const cleaned = word.replace(/[^a-z'-]/gi, '');
        if (cleaned) {
          const existing = wordMap.get(cleaned) || [];
          if (!existing.includes(mode)) {
            wordMap.set(cleaned, [...existing, mode]);
          }
        }
      });
    });
  });

  // Cache results
  lastText = text;
  lastModes = [...modes];
  lastHighlightedWords = wordMap;

  return wordMap;
}

// Note: Direct DOM manipulation conflicts with ProseMirror
// This is a simplified version that applies data attributes for CSS styling
export function applySyntaxHighlighting(
  container: HTMLElement,
  text: string,
  modes: SyntaxHighlightType[]
): void {
  if (modes.length === 0) {
    clearSyntaxHighlighting(container);
    return;
  }

  // Just set the data attribute for CSS styling
  // Full word-by-word highlighting would require ProseMirror decorations
  container.setAttribute('data-syntax-modes', modes.join(' '));
}

export function clearSyntaxHighlighting(container: HTMLElement): void {
  container.removeAttribute('data-syntax-modes');
}
