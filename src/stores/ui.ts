import { writable } from 'svelte/store';

// Find and replace state
export interface FindState {
  isOpen: boolean;
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  matchCount: number;
  currentMatch: number;
}

export const findState = writable<FindState>({
  isOpen: false,
  query: '',
  replaceText: '',
  caseSensitive: false,
  matchCount: 0,
  currentMatch: 0
});

// Command palette state
export const commandPaletteOpen = writable(false);

// Modal/dialog state
export interface ModalState {
  isOpen: boolean;
  type: 'settings' | 'export' | 'about' | 'delete-confirm' | null;
}

export const modalState = writable<ModalState>({
  isOpen: false,
  type: null
});

// Toast notifications
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export const toasts = writable<Toast[]>([]);

let toastId = 0;

export function showToast(message: string, type: Toast['type'] = 'info', duration: number = 3000): void {
  const id = `toast-${toastId++}`;
  toasts.update(t => [...t, { id, message, type, duration }]);

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

export function dismissToast(id: string): void {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

// Screen reader announcements
export function announceStatus(message: string): void {
  const statusEl = document.getElementById('editor-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

// Open/close functions
export function openFind(): void {
  findState.update(s => ({ ...s, isOpen: true }));
}

export function closeFind(): void {
  findState.update(s => ({ ...s, isOpen: false, query: '', replaceText: '' }));
}

export function openCommandPalette(): void {
  commandPaletteOpen.set(true);
}

export function closeCommandPalette(): void {
  commandPaletteOpen.set(false);
}

export function openModal(type: ModalState['type']): void {
  modalState.set({ isOpen: true, type });
}

export function closeModal(): void {
  modalState.set({ isOpen: false, type: null });
}
