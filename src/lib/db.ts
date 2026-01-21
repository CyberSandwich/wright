import Dexie, { type Table } from 'dexie';

export interface Document {
  id?: number;
  title: string;
  content: string;
  folderId: number | null;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
}

export interface Folder {
  id?: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface HistorySnapshot {
  id?: number;
  documentId: number;
  content: string;
  createdAt: Date;
}

export class WrightDB extends Dexie {
  documents!: Table<Document>;
  folders!: Table<Folder>;
  settings!: Table<Setting>;
  history!: Table<HistorySnapshot>;

  constructor() {
    super('WrightEditor');
    this.version(1).stores({
      documents: '++id, folderId, updatedAt, title, [folderId+updatedAt]',
      folders: '++id, parentId, name',
      settings: 'key',
      history: '++id, documentId, createdAt'
    });
  }
}

export const db = new WrightDB();

// Helper functions
export async function createDocument(title: string = 'Untitled', content: string = '', folderId: number | null = null): Promise<number> {
  const now = new Date();
  return await db.documents.add({
    title,
    content,
    folderId,
    createdAt: now,
    updatedAt: now,
    wordCount: countWords(content)
  });
}

export async function updateDocument(id: number, updates: Partial<Document>): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;

  const updatedData: Partial<Document> = {
    ...updates,
    updatedAt: new Date()
  };

  if (updates.content !== undefined) {
    updatedData.wordCount = countWords(updates.content);
  }

  await db.documents.update(id, updatedData);
}

export async function deleteDocument(id: number): Promise<void> {
  await db.documents.delete(id);
  await db.history.where('documentId').equals(id).delete();
}

export async function getDocuments(folderId: number | null = null): Promise<Document[]> {
  if (folderId === null) {
    return await db.documents.where('folderId').equals(null as unknown as number).reverse().sortBy('updatedAt');
  }
  return await db.documents.where('folderId').equals(folderId).reverse().sortBy('updatedAt');
}

export async function getAllDocuments(): Promise<Document[]> {
  return await db.documents.reverse().sortBy('updatedAt');
}

export async function getDocument(id: number): Promise<Document | undefined> {
  return await db.documents.get(id);
}

export async function createFolder(name: string, parentId: number | null = null): Promise<number> {
  return await db.folders.add({
    name,
    parentId,
    createdAt: new Date()
  });
}

export async function deleteFolder(id: number): Promise<void> {
  // Move documents in this folder to root
  await db.documents.where('folderId').equals(id).modify({ folderId: null });
  // Delete child folders recursively
  const children = await db.folders.where('parentId').equals(id).toArray();
  for (const child of children) {
    if (child.id) await deleteFolder(child.id);
  }
  await db.folders.delete(id);
}

export async function getFolders(parentId: number | null = null): Promise<Folder[]> {
  if (parentId === null) {
    return await db.folders.where('parentId').equals(null as unknown as number).sortBy('name');
  }
  return await db.folders.where('parentId').equals(parentId).sortBy('name');
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await db.settings.get(key);
  return setting ? (setting.value as T) : defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function saveSnapshot(documentId: number, content: string): Promise<void> {
  await db.history.add({
    documentId,
    content,
    createdAt: new Date()
  });

  // Keep only last 50 snapshots per document
  const snapshots = await db.history
    .where('documentId')
    .equals(documentId)
    .reverse()
    .sortBy('createdAt');

  if (snapshots.length > 50) {
    const toDelete = snapshots.slice(50);
    await db.history.bulkDelete(toDelete.map(s => s.id!));
  }
}

// Utility functions
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().match(/[\w'-]+/g)?.length || 0;
}

export function countCharacters(text: string, withSpaces: boolean = true): number {
  if (!text) return 0;
  return withSpaces ? text.length : text.replace(/\s/g, '').length;
}

export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.match(/[.!?]+/g)?.length || 0;
}

export function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 238);
}

export function calculateSpeakingTime(wordCount: number): number {
  return Math.ceil(wordCount / 130);
}
