import { writable, derived, get } from 'svelte/store';
import {
  db,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  getAllDocuments,
  type Document
} from '../lib/db';

// Current document being edited
export const currentDocumentId = writable<number | null>(null);
export const currentDocument = writable<Document | null>(null);

// All documents list
export const documents = writable<Document[]>([]);

// Save status
export const saveStatus = writable<'saved' | 'saving' | 'unsaved'>('saved');

// Debounce timer for auto-save
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Extract title from content (first non-empty line, stripping markdown formatting)
function extractTitleFromContent(content: string): string | null {
  // Get first non-empty line
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      // Strip markdown formatting: headings, bold, italic, etc.
      let title = trimmed
        .replace(/^#{1,6}\s+/, '')  // Remove heading markers
        .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
        .replace(/\*(.+?)\*/g, '$1')  // Remove italic
        .replace(/__(.+?)__/g, '$1')  // Remove bold (alt)
        .replace(/_(.+?)_/g, '$1')  // Remove italic (alt)
        .replace(/~~(.+?)~~/g, '$1')  // Remove strikethrough
        .replace(/`(.+?)`/g, '$1')  // Remove inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // Remove links, keep text
        .replace(/<[^>]*>/g, '')  // Remove any HTML tags
        .trim();
      // Skip lines that are only whitespace or HTML artifacts after stripping
      if (title && !/^[\s]*$/.test(title)) {
        return title;
      }
    }
  }
  return null;
}

// Load all documents
export async function loadDocuments(): Promise<void> {
  const docs = await getAllDocuments();
  documents.set(docs);
}

// Load a specific document
export async function loadDocument(id: number): Promise<void> {
  const doc = await getDocument(id);
  if (doc) {
    currentDocument.set(doc);
    currentDocumentId.set(id);
  }
}

// Create a new document
export async function newDocument(): Promise<number> {
  const id = await createDocument('Untitled', '');
  await loadDocuments();
  await loadDocument(id);
  return id;
}

// Update current document content with debounced save
export function updateContent(content: string): void {
  const doc = get(currentDocument);
  if (!doc) return;

  // Extract title from first # heading
  const extractedTitle = extractTitleFromContent(content);
  const newTitle = extractedTitle || 'Untitled';
  const titleChanged = newTitle !== doc.title;

  // Update local state immediately
  currentDocument.set({ ...doc, content, title: newTitle });
  saveStatus.set('unsaved');

  // Debounce the save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    saveStatus.set('saving');
    try {
      if (doc.id) {
        const updateData: { content: string; title?: string } = { content };
        if (titleChanged) {
          updateData.title = newTitle;
        }
        await updateDocument(doc.id, updateData);
        // Optimistic update: only update the document in the list instead of reloading all
        documents.update(docs => {
          const index = docs.findIndex(d => d.id === doc.id);
          if (index !== -1) {
            docs[index] = { ...docs[index], content, title: newTitle, updatedAt: new Date() };
          }
          return docs;
        });
      }
      saveStatus.set('saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      saveStatus.set('unsaved');
    }
  }, 1000);
}

// Update document title (updates the first line of content)
export async function updateTitle(title: string): Promise<void> {
  const doc = get(currentDocument);
  if (!doc || !doc.id) return;

  // Replace first line with new title, or add it if content is empty
  let newContent = doc.content;
  const lines = newContent.split('\n');

  if (lines.length > 0 && lines[0].trim()) {
    // Replace first line
    lines[0] = title;
    newContent = lines.join('\n');
  } else if (newContent.trim() === '') {
    // Empty document, just set the title
    newContent = title + '\n';
  } else {
    // First line is empty, prepend title
    newContent = title + '\n' + newContent;
  }

  currentDocument.set({ ...doc, title, content: newContent });
  await updateDocument(doc.id, { title, content: newContent });
  await loadDocuments();
}

// Delete current document
export async function deleteCurrentDocument(): Promise<void> {
  const doc = get(currentDocument);
  if (!doc || !doc.id) return;

  await deleteDocument(doc.id);
  currentDocument.set(null);
  currentDocumentId.set(null);
  await loadDocuments();

  // Load the first available document or create a new one
  const docs = get(documents);
  if (docs.length > 0 && docs[0].id) {
    await loadDocument(docs[0].id);
  } else {
    await newDocument();
  }
}

// Force save immediately
export async function saveNow(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  const doc = get(currentDocument);
  if (!doc || !doc.id) return;

  saveStatus.set('saving');
  try {
    await updateDocument(doc.id, { content: doc.content });
    // Optimistic update instead of full reload
    documents.update(docs => {
      const index = docs.findIndex(d => d.id === doc.id);
      if (index !== -1) {
        docs[index] = { ...docs[index], content: doc.content, updatedAt: new Date() };
      }
      return docs;
    });
    saveStatus.set('saved');
  } catch (error) {
    console.error('Failed to save document:', error);
    saveStatus.set('unsaved');
  }
}

// Initialize - load documents and select first or create new
export async function initializeDocuments(): Promise<void> {
  await loadDocuments();
  const docs = get(documents);

  if (docs.length > 0 && docs[0].id) {
    await loadDocument(docs[0].id);
  } else {
    await newDocument();
  }
}
