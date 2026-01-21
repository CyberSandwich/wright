import { writable, get } from 'svelte/store';
import { getSetting, setSetting } from '../lib/db';

export type Theme = 'light' | 'dark';
export type FontFamily = 'mono' | 'serif' | 'sans';

export interface Settings {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  focusMode: boolean;
  typewriterMode: boolean;
  showWordCount: boolean;
  showReadingTime: boolean;
  sidebarOpen: boolean;
  showFormatting: boolean;
}

const defaultSettings: Settings = {
  theme: 'dark',
  fontFamily: 'mono',
  fontSize: 18,
  lineHeight: 1.6,
  focusMode: false,
  typewriterMode: false,
  showWordCount: true,
  showReadingTime: true,
  sidebarOpen: false,
  showFormatting: false
};

export const settings = writable<Settings>(defaultSettings);

// Apply theme to document
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

// Load settings from IndexedDB
export async function loadSettings(): Promise<void> {
  const savedSettings = await getSetting<Partial<Settings>>('settings', {});
  // Migrate old 'system' theme to 'dark'
  if ((savedSettings as any).theme === 'system') {
    savedSettings.theme = 'dark';
  }
  const merged = { ...defaultSettings, ...savedSettings };
  settings.set(merged);
  applyTheme(merged.theme);
}

// Save settings to IndexedDB
export async function saveSettings(): Promise<void> {
  await setSetting('settings', get(settings));
}

// Update a single setting
export async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  settings.update(s => ({ ...s, [key]: value }));

  if (key === 'theme') {
    applyTheme(value as Theme);
  }

  await saveSettings();
}

// Toggle sidebar
export async function toggleSidebar(): Promise<void> {
  const current = get(settings);
  await updateSetting('sidebarOpen', !current.sidebarOpen);
}

// Toggle focus mode
export async function toggleFocusMode(): Promise<void> {
  const current = get(settings);
  await updateSetting('focusMode', !current.focusMode);
}

// Toggle typewriter mode
export async function toggleTypewriterMode(): Promise<void> {
  const current = get(settings);
  await updateSetting('typewriterMode', !current.typewriterMode);
}

// Toggle formatting toolbar
export async function toggleFormatting(): Promise<void> {
  const current = get(settings);
  await updateSetting('showFormatting', !current.showFormatting);
}
