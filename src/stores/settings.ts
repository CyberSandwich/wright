import { writable, get } from 'svelte/store';
import { getSetting, setSetting } from '../lib/db';

export type Theme = 'light' | 'dark' | 'system';
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
}

const defaultSettings: Settings = {
  theme: 'system',
  fontFamily: 'mono',
  fontSize: 18,
  lineHeight: 1.6,
  focusMode: false,
  typewriterMode: false,
  showWordCount: true,
  showReadingTime: true,
  sidebarOpen: false
};

export const settings = writable<Settings>(defaultSettings);

// Apply theme to document
function applyTheme(theme: Theme): void {
  let resolvedTheme: 'light' | 'dark';

  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolvedTheme = theme;
  }

  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

// Load settings from IndexedDB
export async function loadSettings(): Promise<void> {
  const savedSettings = await getSetting<Partial<Settings>>('settings', {});
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

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = get(settings);
    if (current.theme === 'system') {
      applyTheme('system');
    }
  });
}
