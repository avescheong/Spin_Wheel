import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TWO_PI,
  computeInstantSpinResult,
  computeSlices,
  countPegCrossings,
  deduplicateEntries,
  easeOutSpin,
  entriesToLines,
  getContrastTextColor,
  getSliceAtPointer,
  normalizeAngle,
  parseLinesToEntries,
  removeEntryById,
  shuffleEntries,
  sortEntriesAZ,
} from './wheelMath';
import type { WheelEntry } from '../types/wheel';

const makeEntry = (id: string, text: string, weight = 1, enabled = true, color?: string): WheelEntry => ({
  id,
  text,
  weight,
  enabled,
  color,
});

test('normalizeAngle wraps negative and multi-turn angles into [0, 2π)', () => {
  assert.equal(normalizeAngle(0), 0);
  assert.ok(Math.abs(normalizeAngle(TWO_PI + 0.5) - 0.5) < 1e-9);
  assert.ok(Math.abs(normalizeAngle(-Math.PI / 2) - (3 * Math.PI) / 2) < 1e-9);
});

test('computeSlices handles equal weights, custom weights, and disabled entries', () => {
  const entries = [
    makeEntry('1', 'Alpha', 1, true),
    makeEntry('2', 'Beta', 3, true),
    makeEntry('3', 'Hidden', 5, false),
  ];
  const slices = computeSlices(entries, ['#111111', '#EEEEEE']);

  assert.equal(slices.length, 2);
  assert.ok(Math.abs(slices[0].sweepAngle - TWO_PI * 0.25) < 1e-9);
  assert.ok(Math.abs(slices[1].sweepAngle - TWO_PI * 0.75) < 1e-9);
  assert.equal(slices[0].startAngle, 0);
  assert.equal(slices[1].endAngle, TWO_PI);
  assert.equal(slices[0].textColor, '#FFFFFF');
  assert.equal(slices[1].textColor, '#0F172A');
});

test('computeSlices avoids first/last color clash when palette has 3+ colors', () => {
  const entries = [
    makeEntry('1', 'A'),
    makeEntry('2', 'B'),
    makeEntry('3', 'C'),
    makeEntry('4', 'D'),
    makeEntry('5', 'E'),
  ];
  const slices = computeSlices(entries, ['#3369E8', '#D50F25', '#EEB211', '#009925']);
  assert.notEqual(slices[0].color, slices[slices.length - 1].color);
});

test('getSliceAtPointer resolves exact slice under 3 o’clock pointer across rotations', () => {
  const entries = [
    makeEntry('1', 'North'),
    makeEntry('2', 'East'),
    makeEntry('3', 'South'),
    makeEntry('4', 'West'),
  ];
  const slices = computeSlices(entries, ['#3369E8', '#D50F25', '#EEB211', '#009925']);

  // Rotation 0 -> local pointer angle 0 -> slice 0 ('North')
  assert.equal(getSliceAtPointer(slices, 0)?.entry.text, 'North');

  // Rotate clockwise by 45 deg (π/4) -> local pointer angle is -π/4 -> 7π/4 -> slice 3 ('West')
  assert.equal(getSliceAtPointer(slices, Math.PI / 4)?.entry.text, 'West');

  // Rotate clockwise by 135 deg (3π/4) -> local pointer angle is 5π/4 -> slice 2 ('South')
  assert.equal(getSliceAtPointer(slices, (3 * Math.PI) / 4)?.entry.text, 'South');

  // Multi-turn rotation: 10 full turns + 225 deg (5π/4) -> local angle 3π/4 -> slice 1 ('East')
  assert.equal(getSliceAtPointer(slices, 10 * TWO_PI + (5 * Math.PI) / 4)?.entry.text, 'East');
});

test('countPegCrossings counts exact slice boundaries passing under pointer', () => {
  const entries = [makeEntry('1', 'A'), makeEntry('2', 'B'), makeEntry('3', 'C'), makeEntry('4', 'D')];
  const slices = computeSlices(entries, ['#3369E8', '#D50F25']);

  // Full turn crosses all 4 pegs
  assert.equal(countPegCrossings(slices, 0.1, 0.1 + TWO_PI), 4);
  // Small step crossing no peg (0.1 -> 0.2 stays inside slice 3)
  assert.equal(countPegCrossings(slices, 0.1, 0.2), 0);
  // Crossing boundary at rotation π/2 (local angle crosses 3π/2)
  assert.equal(countPegCrossings(slices, Math.PI / 2 - 0.05, Math.PI / 2 + 0.05), 1);
  // Crossing 2 boundaries
  assert.equal(countPegCrossings(slices, 0.1, 0.1 + Math.PI), 2);
});

test('getContrastTextColor picks white for dark colors and dark slate for light colors', () => {
  assert.equal(getContrastTextColor('#0F172A'), '#FFFFFF');
  assert.equal(getContrastTextColor('#3369E8'), '#FFFFFF');
  assert.equal(getContrastTextColor('#FDE68A'), '#0F172A');
  assert.equal(getContrastTextColor('#FFFFFF'), '#0F172A');
});

test('parseLinesToEntries trims empty lines and preserves existing weights/colors', () => {
  const existing = [makeEntry('e1', 'Pizza', 3, true, '#FF0000')];
  const parsed = parseLinesToEntries('\n  Pizza \n\nSushi\n  ', existing);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, 'e1');
  assert.equal(parsed[0].weight, 3);
  assert.equal(parsed[0].color, '#FF0000');
  assert.equal(parsed[1].text, 'Sushi');
  assert.equal(parsed[1].weight, 1);
  assert.equal(entriesToLines(parsed), 'Pizza\nSushi');
});

test('shuffle, sort, deduplicate, and removeEntryById work deterministically', () => {
  const list = [
    makeEntry('1', 'Charlie'),
    makeEntry('2', 'alice'),
    makeEntry('3', 'Bob'),
    makeEntry('4', 'Alice'),
  ];

  const sorted = sortEntriesAZ(list);
  assert.deepEqual(
    sorted.map((e) => e.text),
    ['alice', 'Alice', 'Bob', 'Charlie']
  );

  const deduped = deduplicateEntries(list);
  assert.deepEqual(
    deduped.map((e) => e.text),
    ['Charlie', 'alice', 'Bob']
  );

  const removed = removeEntryById(deduped, '2');
  assert.deepEqual(
    removed.map((e) => e.text),
    ['Charlie', 'Bob']
  );

  const shuffled = shuffleEntries([1, 2, 3, 4], () => 0.25);
  assert.equal(shuffled.length, 4);
  assert.deepEqual([...shuffled].sort(), [1, 2, 3, 4]);
});

test('easeOutSpin starts at 0, ends at 1, and decelerates monotonically', () => {
  assert.equal(easeOutSpin(0), 0);
  assert.equal(easeOutSpin(1), 1);
  const a = easeOutSpin(0.2);
  const b = easeOutSpin(0.5);
  const c = easeOutSpin(0.8);
  assert.ok(a > 0 && a < b && b < c && c < 1);
  // First 20% covers more distance than last 20%
  assert.ok(a > 1 - c);
});

test('computeInstantSpinResult returns null for empty slices and resolves weighted winner deterministically', () => {
  assert.equal(computeInstantSpinResult([]), null);

  const slices = computeSlices(
    [makeEntry('1', 'Small', 1), makeEntry('2', 'Big', 3)],
    ['#3369E8', '#D50F25']
  );

  // rng = 0 -> rotation 0 -> local pointer angle 0 -> 'Small' ([0, π/2))
  const r1 = computeInstantSpinResult(slices, () => 0);
  assert.ok(r1);
  assert.equal(r1.winner.entry.text, 'Small');
  assert.equal(getSliceAtPointer(slices, r1.rotation)?.entry.id, r1.winner.entry.id);

  // rng = 0.5 -> rotation π -> local pointer angle π -> 'Big' ([π/2, 2π))
  const r2 = computeInstantSpinResult(slices, () => 0.5);
  assert.ok(r2);
  assert.equal(r2.winner.entry.text, 'Big');
  assert.equal(getSliceAtPointer(slices, r2.rotation)?.entry.id, r2.winner.entry.id);
});
