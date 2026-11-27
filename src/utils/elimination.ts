import type { WheelEntry } from '../types/wheel';

export type WheelGameMode = 'classic' | 'elimination';

export interface EliminatedEntryRecord {
  entryId: string;
  text: string;
  color: string;
  rank: number; // e.g. 8th place, 7th place, ..., 2nd place
}

export interface PodiumSpot {
  place: 1 | 2 | 3;
  text: string;
  color: string;
}

export interface EliminationStepResult {
  nextEntries: WheelEntry[];
  eliminatedRecord: EliminatedEntryRecord;
  nextEliminatedOrder: EliminatedEntryRecord[];
  remainingCount: number;
  isFinalShowdown: boolean;
  champion: {
    entry: WheelEntry;
    color: string;
  } | null;
  podium: PodiumSpot[];
}

/**
 * Resolves a single knockout in Elimination ("Last One Standing") mode.
 * Disables the landed entry (preserving its weight/color for Play Again),
 * calculates its finishing rank, and immediately crowns the last remaining
 * survivor if only 1 active entry remains.
 */
export function resolveEliminationStep(
  entries: WheelEntry[],
  landedEntryId: string,
  landedColor: string,
  eliminatedSoFar: EliminatedEntryRecord[],
  resolveSliceColor: (entry: WheelEntry, index: number) => string
): EliminationStepResult | null {
  const activeBefore = entries.filter((e) => e.enabled && e.text.trim().length > 0);
  const landed = activeBefore.find((e) => e.id === landedEntryId);
  if (!landed) return null;

  const rank = activeBefore.length;
  const eliminatedRecord: EliminatedEntryRecord = {
    entryId: landed.id,
    text: landed.text,
    color: landedColor,
    rank,
  };

  const nextEntries = entries.map((e) =>
    e.id === landedEntryId ? { ...e, enabled: false } : e
  );
  const nextEliminatedOrder = [eliminatedRecord, ...eliminatedSoFar];
  const remainingActive = nextEntries.filter((e) => e.enabled && e.text.trim().length > 0);

  if (remainingActive.length === 1) {
    const champEntry = remainingActive[0];
    const champIndex = entries.findIndex((e) => e.id === champEntry.id);
    const champColor = resolveSliceColor(champEntry, Math.max(0, champIndex));

    const podium: PodiumSpot[] = [
      { place: 1, text: champEntry.text, color: champColor },
    ];
    if (nextEliminatedOrder[0]) {
      podium.push({
        place: 2,
        text: nextEliminatedOrder[0].text,
        color: nextEliminatedOrder[0].color,
      });
    }
    if (nextEliminatedOrder[1]) {
      podium.push({
        place: 3,
        text: nextEliminatedOrder[1].text,
        color: nextEliminatedOrder[1].color,
      });
    }

    return {
      nextEntries,
      eliminatedRecord,
      nextEliminatedOrder,
      remainingCount: 1,
      isFinalShowdown: false,
      champion: { entry: champEntry, color: champColor },
      podium,
    };
  }

  return {
    nextEntries,
    eliminatedRecord,
    nextEliminatedOrder,
    remainingCount: remainingActive.length,
    isFinalShowdown: remainingActive.length === 2,
    champion: null,
    podium: [],
  };
}

/**
 * Re-enables all entries eliminated during an Elimination round so the user
 * can replay with the exact same roster, weights, and custom colors.
 */
export function restoreEliminatedEntries(
  entries: WheelEntry[],
  eliminatedIds: string[]
): WheelEntry[] {
  if (eliminatedIds.length === 0) return entries;
  const idSet = new Set(eliminatedIds);
  return entries.map((e) => (idSet.has(e.id) ? { ...e, enabled: true } : e));
}
