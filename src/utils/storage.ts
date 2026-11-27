import { DEFAULT_ENTRIES, DEFAULT_SETTINGS } from '../data/presets';
import type { SavedWheel, WheelEntry, WheelSettings, WinnerRecord } from '../types/wheel';

const STORAGE_KEYS = {
  ENTRIES: 'spinwheel:entries:v1',
  SETTINGS: 'spinwheel:settings:v1',
  HISTORY: 'spinwheel:history:v1',
  SAVED_WHEELS: 'spinwheel:saved:v1',
  THEME: 'spinwheel:theme:v1',
  MUTED: 'spinwheel:muted:v1',
} as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadEntries(): WheelEntry[] {
  const parsed = safeParse<WheelEntry[]>(localStorage.getItem(STORAGE_KEYS.ENTRIES));
  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `entry-${idx}`,
      text: typeof item.text === 'string' ? item.text : '',
      weight: typeof item.weight === 'number' && Number.isFinite(item.weight) && item.weight > 0 ? item.weight : 1,
      color: typeof item.color === 'string' ? item.color : undefined,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    }));
  }
  return DEFAULT_ENTRIES;
}

export function saveEntries(entries: WheelEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSettings(): WheelSettings {
  const parsed = safeParse<Partial<WheelSettings>>(localStorage.getItem(STORAGE_KEYS.SETTINGS));
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_SETTINGS;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    customColors: Array.isArray(parsed.customColors) && parsed.customColors.length > 0
      ? parsed.customColors
      : DEFAULT_SETTINGS.customColors,
  };
}

export function saveSettings(settings: WheelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadHistory(): WinnerRecord[] {
  const parsed = safeParse<WinnerRecord[]>(localStorage.getItem(STORAGE_KEYS.HISTORY));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveHistory(history: WinnerRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedWheels(): SavedWheel[] {
  const parsed = safeParse<SavedWheel[]>(localStorage.getItem(STORAGE_KEYS.SAVED_WHEELS));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveSavedWheels(wheels: SavedWheel[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_WHEELS, JSON.stringify(wheels));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // Ignore storage quota errors
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.MUTED) === 'true';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MUTED, muted ? 'true' : 'false');
  } catch {
    // Ignore storage quota errors
  }
}
