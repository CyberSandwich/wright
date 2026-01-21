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

// Extract title from content (first # heading)
function extractTitleFromContent(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
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
  const id = await createDocument('Untitled', '# Untitled\n\n');
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
        await loadDocuments();
      }
      saveStatus.set('saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      saveStatus.set('unsaved');
    }
  }, 1000);
}

// Update document title (now updates the content's first heading)
export async function updateTitle(title: string): Promise<void> {
  const doc = get(currentDocument);
  if (!doc || !doc.id) return;

  // Update the first # heading in content, or add one
  let newContent = doc.content;
  const hasHeading = /^#\s+.+$/m.test(newContent);

  if (hasHeading) {
    newContent = newContent.replace(/^#\s+.+$/m, `# ${title}`);
  } else {
    newContent = `# ${title}\n\n${newContent}`;
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
    await loadDocuments();
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
