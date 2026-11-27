export interface WheelEntry {
  id: string;
  text: string;
  weight: number;
  color?: string;
  enabled: boolean;
}

export interface ComputedSlice {
  entry: WheelEntry;
  index: number;
  startAngle: number; // radians, 0..2PI
  endAngle: number; // radians, 0..2PI
  midAngle: number;
  sweepAngle: number;
  color: string;
  textColor: string;
}

export interface WinnerRecord {
  id: string;
  entryId: string;
  text: string;
  color: string;
  timestamp: number;
  removed?: boolean;
}

export type TickSoundType = 'tick' | 'wood' | 'arcade' | 'none';
export type WinSoundType = 'fanfare' | 'chime' | 'pop' | 'none';
export type HubSize = 'small' | 'medium' | 'large';
export type EntryEditorMode = 'simple' | 'advanced';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export interface WheelSettings {
  title: string;
  subtitle: string;
  showTitle: boolean;
  enableSpinAnimation: boolean;
  spinDuration: number; // seconds, 1..20
  spinSlowly: boolean;
  tickSound: TickSoundType;
  winSound: WinSoundType;
  volume: number; // 0..1
  launchConfetti: boolean;
  showWinnerDialog: boolean;
  winnerMessage: string;
  showRemoveButton: boolean;
  paletteId: string;
  customColors: string[];
  hubSize: HubSize;
  showSliceBorders: boolean;
  showRimPegs: boolean;
  maxNamesVisible: number;
}

export interface SavedWheel {
  id: string;
  name: string;
  updatedAt: number;
  entries: WheelEntry[];
  settings: WheelSettings;
}

export type SpinPhase = 'idle' | 'spinning' | 'winner';
