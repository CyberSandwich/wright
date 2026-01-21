import nlp from 'compromise';
import type { SyntaxHighlightMode } from '../stores/settings';

// Cache for processed text to avoid re-processing
let lastText = '';
let lastMode: SyntaxHighlightMode = 'off';
let lastHighlightedWords: Set<string> = new Set();

export function getWordsToHighlight(text: string, mode: SyntaxHighlightMode): Set<string> {
  if (mode === 'off') return new Set();

  // Return cached result if same input
  if (text === lastText && mode === lastMode) {
    return lastHighlightedWords;
  }

  const doc = nlp(text);
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

  // Create set of individual words (lowercase for matching)
  const wordSet = new Set<string>();
  words.forEach(phrase => {
    // Split phrases into individual words and add each
    phrase.toLowerCase().split(/\s+/).forEach(word => {
      // Clean punctuation from words
      const cleaned = word.replace(/[^a-z'-]/gi, '');
      if (cleaned) wordSet.add(cleaned);
    });
  });

  // Cache results
  lastText = text;
  lastMode = mode;
  lastHighlightedWords = wordSet;

  return wordSet;
}

export function applySyntaxHighlighting(
  container: HTMLElement,
  text: string,
  mode: SyntaxHighlightMode
): void {
  if (mode === 'off') {
    clearSyntaxHighlighting(container);
    return;
  }

  const wordsToHighlight = getWordsToHighlight(text, mode);
  if (wordsToHighlight.size === 0) return;

  // Add data attribute to container for CSS styling
  container.setAttribute('data-syntax-mode', mode);

  // Walk through all text nodes and wrap matching words
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && node.textContent.trim()) {
      textNodes.push(node);
    }
  }

  // Process text nodes in reverse to avoid index issues
  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;

    // Skip if already processed or if parent is a syntax-highlight span
    if (parent instanceof HTMLElement && parent.classList.contains('syntax-hl')) return;

    const text = textNode.textContent || '';

    // Check if any word needs highlighting
    const regex = /\b[\w'-]+\b/g;
    let match;
    let lastIndex = 0;
    const fragments: (string | HTMLSpanElement)[] = [];
    let hasHighlight = false;

    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      const wordLower = word.toLowerCase();

      if (wordsToHighlight.has(wordLower)) {
        hasHighlight = true;

        // Add text before the match
        if (match.index > lastIndex) {
          fragments.push(text.slice(lastIndex, match.index));
        }

        // Create highlighted span
        const span = document.createElement('span');
        span.className = `syntax-hl syntax-${mode}`;
        span.textContent = word;
        fragments.push(span);

        lastIndex = match.index + word.length;
      }
    }

    // Only modify DOM if we found highlights
    if (hasHighlight) {
      // Add remaining text
      if (lastIndex < text.length) {
        fragments.push(text.slice(lastIndex));
      }

      // Create a document fragment with all the pieces
      const frag = document.createDocumentFragment();
      fragments.forEach(f => {
        if (typeof f === 'string') {
          frag.appendChild(document.createTextNode(f));
        } else {
          frag.appendChild(f);
        }
      });

      // Replace the text node with our fragment
      parent.replaceChild(frag, textNode);
    }
  });
}

export function clearSyntaxHighlighting(container: HTMLElement): void {
  container.removeAttribute('data-syntax-mode');

  // Find all syntax highlight spans and unwrap them
  const spans = container.querySelectorAll('.syntax-hl');
  spans.forEach(span => {
    const parent = span.parentNode;
    if (parent) {
      const text = document.createTextNode(span.textContent || '');
      parent.replaceChild(text, span);
    }
  });

  // Normalize to merge adjacent text nodes
  container.normalize();
}
