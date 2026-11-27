import type { ComputedSlice, WheelEntry } from '../types/wheel';

export const TWO_PI = Math.PI * 2;

/**
 * Normalizes any angle in radians into [0, 2π).
 */
export function normalizeAngle(angle: number): number {
  const mod = angle % TWO_PI;
  return mod < 0 ? mod + TWO_PI : mod;
}

/**
 * Computes WCAG-friendly foreground text color (#FFFFFF or #0F172A) for any hex background.
 */
export function getContrastTextColor(hex: string): string {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return '#FFFFFF';
  }

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.42 ? '#0F172A' : '#FFFFFF';
}

/**
 * Computes non-clashing wheel slice colors so the last slice doesn't match the first slice
 * when palette length > 2 and slice count % palette length === 1.
 */
export function pickSliceColor(
  sliceIndex: number,
  totalSlices: number,
  palette: string[],
  customColor?: string
): string {
  if (customColor && /^#[0-9a-fA-F]{3,6}$/.test(customColor)) {
    return customColor;
  }
  const safePalette = palette.length > 0 ? palette : ['#3369E8', '#D50F25', '#EEB211', '#009925'];
  if (
    totalSlices > 1 &&
    safePalette.length > 2 &&
    sliceIndex === totalSlices - 1 &&
    sliceIndex % safePalette.length === 0
  ) {
    return safePalette[1];
  }
  return safePalette[sliceIndex % safePalette.length];
}

/**
 * Builds angular geometry for all enabled entries respecting their positive weights.
 */
export function computeSlices(entries: WheelEntry[], palette: string[]): ComputedSlice[] {
  const active = entries.filter((e) => e.enabled && e.text.trim().length > 0);
  if (active.length === 0) return [];

  const totalWeight = active.reduce((sum, e) => sum + Math.max(0.1, Number.isFinite(e.weight) ? e.weight : 1), 0);
  let cursor = 0;

  return active.map((entry, index) => {
    const safeWeight = Math.max(0.1, Number.isFinite(entry.weight) ? entry.weight : 1);
    const sweepAngle = (safeWeight / totalWeight) * TWO_PI;
    const startAngle = cursor;
    const endAngle = index === active.length - 1 ? TWO_PI : cursor + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    cursor = endAngle;

    const color = pickSliceColor(index, active.length, palette, entry.color);
    const textColor = getContrastTextColor(color);

    return {
      entry,
      index,
      startAngle,
      endAngle,
      midAngle,
      sweepAngle,
      color,
      textColor,
    };
  });
}

/**
 * Given the wheel's current rotation angle (clockwise in canvas coordinates, radians),
 * determines which slice lies under the pointer at `pointerAngle` (default 0 = 3 o'clock).
 */
export function getSliceAtPointer(
  slices: ComputedSlice[],
  rotation: number,
  pointerAngle = 0
): ComputedSlice | null {
  if (slices.length === 0) return null;

  // A point at canvas angle `pointerAngle` corresponds to local wheel angle `(pointerAngle - rotation)`.
  const localAngle = normalizeAngle(pointerAngle - rotation);

  for (const slice of slices) {
    if (localAngle >= slice.startAngle && localAngle < slice.endAngle) {
      return slice;
    }
  }
  return slices[slices.length - 1];
}

/**
 * Counts how many slice boundaries (pegs) passed under the pointer when rotating
 * forward from `prevRotation` to `nextRotation` (where nextRotation >= prevRotation).
 */
export function countPegCrossings(
  slices: ComputedSlice[],
  prevRotation: number,
  nextRotation: number,
  pointerAngle = 0
): number {
  if (slices.length === 0) return 0;
  const delta = nextRotation - prevRotation;
  if (delta <= 0) return 0;

  const fullTurns = Math.floor(delta / TWO_PI);
  let crossings = fullTurns * slices.length;

  // Check remaining partial arc
  const remPrev = normalizeAngle(pointerAngle - prevRotation);
  const remDelta = delta - fullTurns * TWO_PI;
  // As wheel rotates clockwise by remDelta, local pointer angle moves counter-clockwise from remPrev to remPrev - remDelta
  const remNext = remPrev - remDelta;

  for (const slice of slices) {
    const boundary = slice.startAngle;
    if (remNext >= 0) {
      // No wrap across 0
      if (boundary <= remPrev && boundary > remNext) {
        crossings += 1;
      }
    } else {
      // Wrapped across 0 into [remNext + TWO_PI, TWO_PI)
      const wrappedNext = remNext + TWO_PI;
      if ((boundary <= remPrev && boundary >= 0) || (boundary > wrappedNext && boundary < TWO_PI)) {
        crossings += 1;
      }
    }
  }

  return crossings;
}

/**
 * Quintic ease-out curve for realistic heavy-wheel deceleration.
 */
export function easeOutSpin(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 4.2);
}

/**
 * Picks an instant uniform random wheel rotation in [0, 2π) and resolves the
 * winning slice under the pointer (preserving weighted slice probabilities).
 */
export function computeInstantSpinResult(
  slices: ComputedSlice[],
  rng: () => number = Math.random,
  pointerAngle = 0
): { rotation: number; winner: ComputedSlice } | null {
  if (slices.length === 0) return null;
  const rotation = normalizeAngle(rng() * TWO_PI);
  const winner = getSliceAtPointer(slices, rotation, pointerAngle);
  if (!winner) return null;
  return { rotation, winner };
}

/**
 * Generates a unique id for entries/records.
 */
export function createId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Syncs raw textarea lines to WheelEntry[] while preserving existing metadata (weight, color, id)
 * for matching entries by position or text.
 */
export function parseLinesToEntries(rawText: string, existing: WheelEntry[] = []): WheelEntry[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Pool existing entries by text to preserve custom color/weight when lines are edited/reordered
  const pool = new Map<string, WheelEntry[]>();
  for (const entry of existing) {
    const list = pool.get(entry.text) ?? [];
    list.push(entry);
    pool.set(entry.text, list);
  }

  return lines.map((text, idx) => {
    const bucket = pool.get(text);
    const matched = bucket && bucket.length > 0 ? bucket.shift() : undefined;
    if (matched) {
      return {
        ...matched,
        text,
        enabled: true,
      };
    }
    return {
      id: `entry-${idx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      weight: 1,
      enabled: true,
    };
  });
}

/**
 * Converts enabled entries to plain textarea text (one per line).
 */
export function entriesToLines(entries: WheelEntry[]): string {
  return entries
    .filter((e) => e.enabled)
    .map((e) => e.text)
    .join('\n');
}

/**
 * Non-mutating Fisher-Yates shuffle.
 */
export function shuffleEntries<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Case-insensitive A-Z sort.
 */
export function sortEntriesAZ(entries: WheelEntry[]): WheelEntry[] {
  return [...entries].sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base', numeric: true }));
}

/**
 * Removes duplicate entry texts (case-insensitive, keeping first occurrence).
 */
export function deduplicateEntries(entries: WheelEntry[]): WheelEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.text.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Removes a single entry by ID.
 */
export function removeEntryById(entries: WheelEntry[], entryId: string): WheelEntry[] {
  return entries.filter((e) => e.id !== entryId);
}
