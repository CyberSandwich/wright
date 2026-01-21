import { writable, get } from 'svelte/store';
import { getSetting, setSetting } from '../lib/db';

export type Theme = 'light' | 'dark';
export type FontFamily = 'mono' | 'serif' | 'sans';
export type AccentColor = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'green' | 'teal';

export interface Settings {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  focusMode: boolean;
  typewriterMode: boolean;
  showWordCount: boolean;
  showLetterCount: boolean;
  showReadingTime: boolean;
  sidebarOpen: boolean;
  showFormatting: boolean;
  accentColor: AccentColor;
}

const defaultSettings: Settings = {
  theme: 'dark',
  fontFamily: 'mono',
  fontSize: 18,
  lineHeight: 1.6,
  focusMode: false,
  typewriterMode: false,
  showWordCount: true,
  showLetterCount: true,
  showReadingTime: true,
  sidebarOpen: false,
  showFormatting: false,
  accentColor: 'blue'
};

export const settings = writable<Settings>(defaultSettings);

// Apply theme to document
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

// Apply accent color to document
function applyAccentColor(color: AccentColor): void {
  document.documentElement.setAttribute('data-accent', color);
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
  applyAccentColor(merged.accentColor);
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
  if (key === 'accentColor') {
    applyAccentColor(value as AccentColor);
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
