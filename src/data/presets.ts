import type { ColorPalette, SavedWheel, WheelEntry, WheelSettings } from '../types/wheel';

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'classic',
    name: 'Classic Vivid',
    colors: ['#3369E8', '#D50F25', '#EEB211', '#009925'],
  },
  {
    id: 'editorial',
    name: 'Studio Spectrum',
    colors: ['#2563EB', '#E11D48', '#F59E0B', '#059669', '#7C3AED', '#0891B2'],
  },
  {
    id: 'ocean',
    name: 'Ocean Depth',
    colors: ['#0F4C81', '#0284C7', '#0D9488', '#38BDF8', '#1D4ED8', '#14B8A6'],
  },
  {
    id: 'citrus',
    name: 'Sunset Citrus',
    colors: ['#EA580C', '#DC2626', '#F59E0B', '#D97706', '#F43F5E', '#EAB308'],
  },
  {
    id: 'botanical',
    name: 'Botanical Garden',
    colors: ['#15803D', '#0D9488', '#65A30D', '#047857', '#CA8A04', '#0F766E'],
  },
  {
    id: 'pastel',
    name: 'Soft Chalk',
    colors: ['#93C5FD', '#FCA5A5', '#FDE68A', '#86EFAC', '#C4B5FD', '#FDBA74'],
  },
  {
    id: 'monochrome',
    name: 'Graphite Ink',
    colors: ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1'],
  },
  {
    id: 'custom',
    name: 'Custom Palette',
    colors: ['#2563EB', '#EC4899', '#F59E0B', '#10B981'],
  },
];

export const DEFAULT_SETTINGS: WheelSettings = {
  title: 'My Decision Wheel',
  subtitle: '',
  showTitle: false,
  enableSpinAnimation: true,
  spinDuration: 6,
  spinSlowly: true,
  tickSound: 'tick',
  winSound: 'fanfare',
  volume: 0.65,
  launchConfetti: true,
  showWinnerDialog: true,
  winnerMessage: 'We have a winner!',
  showRemoveButton: true,
  paletteId: 'classic',
  customColors: ['#2563EB', '#E11D48', '#F59E0B', '#059669'],
  hubSize: 'medium',
  showSliceBorders: true,
  showRimPegs: true,
  maxNamesVisible: 100,
};

export function makeEntriesFromNames(names: string[], prefix = 'entry'): WheelEntry[] {
  return names.map((text, idx) => ({
    id: `${prefix}-${idx + 1}-${text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`,
    text,
    weight: 1,
    enabled: true,
  }));
}

export const DEFAULT_ENTRIES: WheelEntry[] = makeEntriesFromNames(
  ['Ali', 'Beatriz', 'Charles', 'Diya', 'Eric', 'Fatima', 'Gabriel', 'Hanna'],
  'default'
);

export const STARTER_PRESETS: SavedWheel[] = [
  {
    id: 'preset-names',
    name: 'Classic Names',
    updatedAt: 1700000000000,
    entries: DEFAULT_ENTRIES,
    settings: {
      ...DEFAULT_SETTINGS,
      title: 'Team Picker',
      paletteId: 'classic',
    },
  },
  {
    id: 'preset-lunch',
    name: 'Lunch Decider',
    updatedAt: 1700000001000,
    entries: makeEntriesFromNames(
      ['Ramen', 'Wood-Fired Pizza', 'Tacos', 'Poke Bowl', 'Thai Curry', 'Smash Burger', 'Sushi', 'Mediterranean Wrap'],
      'lunch'
    ),
    settings: {
      ...DEFAULT_SETTINGS,
      title: 'Where Should We Eat?',
      showTitle: true,
      paletteId: 'citrus',
      winnerMessage: 'Lunch is decided!',
    },
  },
  {
    id: 'preset-yesno',
    name: 'Yes / No / Maybe',
    updatedAt: 1700000002000,
    entries: makeEntriesFromNames(['Yes', 'No', 'Yes', 'No', 'Maybe', 'Definitely'], 'yesno'),
    settings: {
      ...DEFAULT_SETTINGS,
      title: 'Quick Decision',
      showTitle: true,
      paletteId: 'ocean',
      winnerMessage: 'The wheel has spoken!',
    },
  },
  {
    id: 'preset-movie',
    name: 'Movie Night Genre',
    updatedAt: 1700000003000,
    entries: makeEntriesFromNames(
      ['Sci-Fi Thriller', 'Comedy', 'Animated Classic', 'Mystery', 'Documentary', 'Action Adventure'],
      'movie'
    ),
    settings: {
      ...DEFAULT_SETTINGS,
      title: 'Tonight’s Movie Genre',
      showTitle: true,
      paletteId: 'editorial',
      winnerMessage: 'Pop the popcorn!',
    },
  },
];
