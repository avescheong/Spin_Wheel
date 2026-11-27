import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine, resolveEffectiveVolume, shouldPlaySound } from './sound';

test('resolveEffectiveVolume zeroes output when muted and clamps to [0, 1]', () => {
  assert.equal(resolveEffectiveVolume(0.75, true), 0);
  assert.equal(resolveEffectiveVolume(0.75, false), 0.75);
  assert.equal(resolveEffectiveVolume(1.8, false), 1);
  assert.equal(resolveEffectiveVolume(-0.2, false), 0);
  assert.equal(resolveEffectiveVolume(Number.NaN, false), 0);
});

test('shouldPlaySound enforces mute, volume, and sound type none guards', () => {
  assert.equal(shouldPlaySound(0.6, false, 'tick'), true);
  assert.equal(shouldPlaySound(0.6, true, 'tick'), false);
  assert.equal(shouldPlaySound(0, false, 'tick'), false);
  assert.equal(shouldPlaySound(0.6, false, 'none'), false);
});

test('SoundEngine safely no-ops in non-browser environments without throwing', () => {
  const engine = new SoundEngine();
  assert.doesNotThrow(() => {
    engine.unlock();
    engine.playSpinStart(0.6);
    engine.playInteraction('click', 0.6);
    engine.playInteraction('toggle', 0.6);
    engine.playInteraction('remove', 0.6);
    engine.playTick('tick', 0.6);
    engine.playWin('fanfare', 0.6);
    engine.playEliminated(0.6);
    engine.playChampion(0.6);
  });
});
