import type { TickSoundType, WinSoundType } from '../types/wheel';

export type InteractionSoundType = 'click' | 'toggle' | 'remove';

/**
 * Clamps volume to [0, 1] and zeroes it when muted.
 */
export function resolveEffectiveVolume(volume: number, isMuted: boolean): number {
  if (isMuted || !Number.isFinite(volume)) return 0;
  return Math.max(0, Math.min(1, volume));
}

/**
 * Pure guard determining whether a sound cue should play given volume, mute state, and sound type.
 */
export function shouldPlaySound(
  volume: number,
  isMuted: boolean,
  soundType: string = 'active'
): boolean {
  if (soundType === 'none') return false;
  return resolveEffectiveVolume(volume, isMuted) > 0;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private lastTickMs = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public playSpinStart(volume: number): void {
    const eff = resolveEffectiveVolume(volume, false);
    if (eff <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const peak = Math.min(0.35, Math.max(0.02, eff * 0.28));

    // Tactile rising release chirp + crisp mechanical click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.11);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playInteraction(kind: InteractionSoundType, volume: number): void {
    const eff = resolveEffectiveVolume(volume, false);
    if (eff <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const peak = Math.min(0.22, Math.max(0.015, eff * 0.18));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.032);
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.038);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.042);
    } else if (kind === 'toggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.045);
      gain.gain.setValueAtTime(peak * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      // 'remove': gentle downward pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.075);
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public playTick(type: TickSoundType, volume: number): void {
    if (!shouldPlaySound(volume, false, type)) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Rate-limit ticks when spinning very fast to avoid audio clipping
    if (nowMs - this.lastTickMs < 24) return;
    this.lastTickMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const eff = resolveEffectiveVolume(volume, false);
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const peak = Math.min(0.45, Math.max(0.02, eff * 0.35));

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.028);

      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'wood') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

      gain.gain.setValueAtTime(peak * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'arcade') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.025);

      gain.gain.setValueAtTime(peak * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.032);
    }
  }

  public playWin(type: WinSoundType, volume: number): void {
    if (!shouldPlaySound(volume, false, type)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const eff = resolveEffectiveVolume(volume, false);
    const now = ctx.currentTime;
    const baseGain = Math.min(0.45, Math.max(0.04, eff * 0.32));

    if (type === 'fanfare') {
      const notes = [
        { freq: 523.25, start: 0, dur: 0.14 },
        { freq: 659.25, start: 0.11, dur: 0.14 },
        { freq: 783.99, start: 0.22, dur: 0.16 },
        { freq: 1046.5, start: 0.34, dur: 0.55 },
        { freq: 783.99, start: 0.34, dur: 0.5 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        g.gain.setValueAtTime(0.0001, now + start);
        g.gain.linearRampToValueAtTime(baseGain * 0.75, now + start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0008, now + start + dur);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      });
    } else if (type === 'chime') {
      const freqs = [587.33, 880, 1174.66];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        g.gain.setValueAtTime(0.0001, now + i * 0.08);
        g.gain.linearRampToValueAtTime(baseGain * 0.65, now + i * 0.08 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.08 + 0.65);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.7);
      });
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.14);
      g.gain.setValueAtTime(baseGain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  public playEliminated(volume: number): void {
    const eff = resolveEffectiveVolume(volume, false);
    if (eff <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const peak = Math.min(0.35, Math.max(0.03, eff * 0.28));
    // Crisp descending two-note knockout cue
    const notes = [
      { freq: 392.0, start: 0, dur: 0.14 }, // G4
      { freq: 261.63, start: 0.12, dur: 0.26 }, // C4
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.88, now + start + dur);

      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.linearRampToValueAtTime(peak, now + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, now + start + dur);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  }

  public playChampion(volume: number): void {
    const eff = resolveEffectiveVolume(volume, false);
    if (eff <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const peak = Math.min(0.45, Math.max(0.04, eff * 0.34));
    // Grand ascending tournament victory chord progression
    const notes = [
      { freq: 523.25, start: 0, dur: 0.14 }, // C5
      { freq: 659.25, start: 0.1, dur: 0.14 }, // E5
      { freq: 783.99, start: 0.2, dur: 0.14 }, // G5
      { freq: 1046.5, start: 0.3, dur: 0.2 }, // C6
      { freq: 1318.5, start: 0.44, dur: 0.65 }, // E6
      { freq: 1046.5, start: 0.44, dur: 0.65 }, // C6 harmony
      { freq: 783.99, start: 0.44, dur: 0.6 }, // G5 harmony
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.linearRampToValueAtTime(peak * 0.72, now + start + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0008, now + start + dur);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  }
}

export const soundEngine = new SoundEngine();
