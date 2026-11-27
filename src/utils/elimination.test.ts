import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEliminationStep,
  restoreEliminatedEntries,
  type EliminatedEntryRecord,
} from './elimination';
import type { WheelEntry } from '../types/wheel';

const makeEntry = (id: string, text: string, weight = 1): WheelEntry => ({
  id,
  text,
  weight,
  enabled: true,
});

const colorResolver = (_entry: WheelEntry, idx: number) =>
  ['#2563EB', '#E11D48', '#F59E0B', '#059669'][idx % 4];

test('resolveEliminationStep tracks ranks, triggers Final Showdown at 2 left, and crowns champion at 1 left', () => {
  const initial = [
    makeEntry('a', 'Alice', 2),
    makeEntry('b', 'Bob', 1),
    makeEntry('c', 'Charlie', 1),
  ];

  // Round 1: Charlie eliminated in 3rd place -> 2 remaining (Final Showdown)
  const step1 = resolveEliminationStep(initial, 'c', '#F59E0B', [], colorResolver);
  assert.ok(step1);
  assert.equal(step1.eliminatedRecord.rank, 3);
  assert.equal(step1.eliminatedRecord.text, 'Charlie');
  assert.equal(step1.remainingCount, 2);
  assert.equal(step1.isFinalShowdown, true);
  assert.equal(step1.champion, null);

  // Round 2: Bob eliminated in 2nd place -> Alice crowned Champion!
  const step2 = resolveEliminationStep(
    step1.nextEntries,
    'b',
    '#E11D48',
    step1.nextEliminatedOrder,
    colorResolver
  );
  assert.ok(step2);
  assert.equal(step2.eliminatedRecord.rank, 2);
  assert.equal(step2.remainingCount, 1);
  assert.equal(step2.isFinalShowdown, false);
  assert.ok(step2.champion);
  assert.equal(step2.champion.entry.text, 'Alice');
  assert.deepEqual(
    step2.podium.map((p) => ({ place: p.place, text: p.text })),
    [
      { place: 1, text: 'Alice' },
      { place: 2, text: 'Bob' },
      { place: 3, text: 'Charlie' },
    ]
  );

  // Restore brings all eliminated entries back with original weights intact
  const restored = restoreEliminatedEntries(
    step2.nextEntries,
    step2.nextEliminatedOrder.map((r: EliminatedEntryRecord) => r.entryId)
  );
  assert.equal(restored.filter((e) => e.enabled).length, 3);
  assert.equal(restored[0].weight, 2);
});

test('resolveEliminationStep returns null if entry id is not active', () => {
  const entries = [makeEntry('a', 'Alice')];
  assert.equal(resolveEliminationStep(entries, 'missing', '#000000', [], colorResolver), null);
});
