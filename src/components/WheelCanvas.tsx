import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Play, RotateCcw } from 'lucide-react';
import type { ComputedSlice, SpinPhase, WheelSettings } from '../types/wheel';
import type { WheelGameMode } from '../utils/elimination';
import {
  TWO_PI,
  computeInstantSpinResult,
  countPegCrossings,
  easeOutSpin,
  getSliceAtPointer,
  normalizeAngle,
} from '../utils/wheelMath';
import { useAudio } from '../context/AudioContext';

interface WheelCanvasProps {
  slices: ComputedSlice[];
  settings: WheelSettings;
  theme: 'light' | 'dark';
  gameMode: WheelGameMode;
  eliminatedCount: number;
  confettiTriggerCount: number;
  spinPhase: SpinPhase;
  paused?: boolean;
  spinTriggerCount: number;
  panelOpen: boolean;
  onChangeGameMode: (mode: WheelGameMode) => void;
  onResetElimination: () => void;
  onTogglePanel: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSpinStart: () => void;
  onSpinComplete: (winner: ComputedSlice) => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
}

const HUB_RADIUS_RATIO = {
  small: 0.125,
  medium: 0.165,
  large: 0.215,
};

/**
 * Pre-renders the wheel disc (slices, borders, radial text, rim vignette, pegs)
 * into an offscreen canvas so the 60fps animation loop only performs a single
 * rotated drawImage blit instead of re-rasterizing paths and text every frame.
 */
function buildWheelBuffer(
  slices: ComputedSlice[],
  settings: WheelSettings,
  theme: 'light' | 'dark',
  size: number,
  dpr: number
): HTMLCanvasElement {
  const offscreen = document.createElement('canvas');
  const px = Math.max(1, Math.round(size * dpr));
  offscreen.width = px;
  offscreen.height = px;

  const ctx = offscreen.getContext('2d');
  if (!ctx) return offscreen;

  ctx.scale(dpr, dpr);
  const cx = size / 2;
  const cy = size / 2;
  const outerMargin = Math.max(24, size * 0.055);
  const radius = size / 2 - outerMargin;
  const isDark = theme === 'dark';

  ctx.save();
  ctx.translate(cx, cy);

  const sliceCount = slices.length;
  const hubRadius = radius * HUB_RADIUS_RATIO[settings.hubSize];
  const labelRightInset = Math.max(24, radius * 0.1);
  const maxTextWidth = Math.max(24, radius - hubRadius - labelRightInset - 10);

  // Slices
  for (let i = 0; i < sliceCount; i++) {
    const slice = slices[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, slice.startAngle, slice.endAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();

    if (settings.showSliceBorders && sliceCount > 1) {
      ctx.lineWidth = sliceCount > 40 ? 0.75 : 1.5;
      ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();
    }
  }

  // Subtle dimensional vignette near rim
  const rimGrad = ctx.createRadialGradient(0, 0, radius * 0.72, 0, 0, radius);
  rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
  rimGrad.addColorStop(1, 'rgba(0,0,0,0.11)');
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TWO_PI);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Radially aligned labels with safe clearance from pointer and rim pegs
  if (sliceCount <= settings.maxNamesVisible) {
    for (let i = 0; i < sliceCount; i++) {
      const slice = slices[i];
      const arcChord = 2 * radius * 0.65 * Math.sin(Math.min(Math.PI, slice.sweepAngle) / 2);
      if (arcChord < 9 && sliceCount > 36) continue;

      const baseFont = Math.min(Math.max(11, radius * 0.102), Math.max(10, arcChord * 0.5));
      const fontSize = Math.max(10, Math.min(25, Math.round(baseFont)));

      ctx.save();
      ctx.rotate(slice.midAngle);
      ctx.fillStyle = slice.textColor;
      ctx.font = `600 ${fontSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      let label = slice.entry.text;
      if (ctx.measureText(label).width > maxTextWidth) {
        while (label.length > 1 && ctx.measureText(`${label}…`).width > maxTextWidth) {
          label = label.slice(0, -1);
        }
        label = `${label}…`;
      }

      if (slice.textColor === '#FFFFFF') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
      }
      ctx.fillText(label, radius - labelRightInset, 0);
      ctx.restore();
    }
  }

  // Rim pegs at slice boundaries
  if (settings.showRimPegs && sliceCount <= 60) {
    const pegDist = radius - 3;
    const pegRadius = sliceCount > 24 ? 2.4 : 3.4;
    for (let i = 0; i < sliceCount; i++) {
      const angle = slices[i].startAngle;
      const pxPos = Math.cos(angle) * pegDist;
      const pyPos = Math.sin(angle) * pegDist;

      ctx.beginPath();
      ctx.arc(pxPos, pyPos, pegRadius, 0, TWO_PI);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.stroke();
    }
  }

  ctx.restore();
  return offscreen;
}

export function WheelCanvas({
  slices,
  settings,
  theme,
  gameMode,
  eliminatedCount,
  confettiTriggerCount,
  spinPhase,
  paused = false,
  spinTriggerCount,
  panelOpen,
  onChangeGameMode,
  onResetElimination,
  onTogglePanel,
  isFullscreen,
  onToggleFullscreen,
  onSpinStart,
  onSpinComplete,
}: WheelCanvasProps) {
  const { unlockAudio, playSpinStart, playTick, playWin, playInteraction } = useAudio();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenBufferRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable animation state kept in refs to avoid 60Hz React re-renders
  const rotationRef = useRef(0);
  const flapperAngleRef = useRef(0);
  const flapperVelRef = useRef(0);
  const isSpinningRef = useRef(false);
  const spinStartTimeRef = useRef(0);
  const spinStartAngleRef = useRef(0);
  const spinTargetAngleRef = useRef(0);
  const spinDurationMsRef = useRef(6000);
  const lastFrameTimeRef = useRef(0);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const confettiHadParticlesRef = useRef(false);
  const needsDrawRef = useRef(true);

  // Sync latest props into refs for RAF loop
  const slicesRef = useRef(slices);
  const settingsRef = useRef(settings);
  const themeRef = useRef(theme);
  const gameModeRef = useRef(gameMode);
  const pausedRef = useRef(paused);
  const onSpinCompleteRef = useRef(onSpinComplete);

  slicesRef.current = slices;
  settingsRef.current = settings;
  themeRef.current = theme;
  gameModeRef.current = gameMode;
  pausedRef.current = paused;
  onSpinCompleteRef.current = onSpinComplete;

  const [canvasDim, setCanvasDim] = useState(540);
  const [liveLabel, setLiveLabel] = useState<string>('');
  const liveLabelRef = useRef('');

  // Rebuild offscreen cached wheel disc whenever visual inputs change
  useEffect(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (slices.length > 0) {
      offscreenBufferRef.current = buildWheelBuffer(slices, settings, theme, canvasDim, dpr);
    } else {
      offscreenBufferRef.current = null;
    }
    needsDrawRef.current = true;
  }, [slices, settings, theme, canvasDim]);

  // Also rebuild once web fonts finish loading so Canvas uses Outfit cleanly
  useEffect(() => {
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (cancelled || slicesRef.current.length === 0) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        offscreenBufferRef.current = buildWheelBuffer(
          slicesRef.current,
          settingsRef.current,
          themeRef.current,
          canvasDim,
          dpr
        );
        needsDrawRef.current = true;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [canvasDim]);

  // Launch confetti particles from wheel center
  const spawnConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const colors =
      slicesRef.current.length > 0
        ? Array.from(new Set(slicesRef.current.map((s) => s.color)))
        : ['#2563EB', '#E11D48', '#F59E0B', '#059669'];

    const particles: ConfettiParticle[] = [];
    for (let i = 0; i < 85; i++) {
      const angle = Math.random() * TWO_PI;
      const speed = 220 + Math.random() * 480;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 180,
        size: 5 + Math.random() * 5,
        color: colors[i % colors.length],
        rotation: Math.random() * TWO_PI,
        vRot: (Math.random() - 0.5) * 11,
        life: 0,
        maxLife: 1.4 + Math.random() * 0.9,
      });
    }
    confettiRef.current = particles;
    confettiHadParticlesRef.current = true;
  }, []);

  // Trigger external confetti burst (e.g. Champion celebration in Elimination mode)
  const prevConfettiRef = useRef(confettiTriggerCount);
  useEffect(() => {
    if (confettiTriggerCount !== prevConfettiRef.current) {
      prevConfettiRef.current = confettiTriggerCount;
      const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (settingsRef.current.launchConfetti && !prefersReducedMotion) {
        spawnConfetti();
      }
    }
  }, [confettiTriggerCount, spawnConfetti]);

  const startSpin = useCallback(() => {
    const minNeeded = gameModeRef.current === 'elimination' ? 2 : 1;
    if (isSpinningRef.current || slicesRef.current.length < minNeeded) return;

    unlockAudio();
    const cfg = settingsRef.current;

    if (!cfg.enableSpinAnimation) {
      const instant = computeInstantSpinResult(slicesRef.current);
      if (!instant) return;

      rotationRef.current = instant.rotation;
      flapperAngleRef.current = 0;
      flapperVelRef.current = 0;
      needsDrawRef.current = true;

      liveLabelRef.current = instant.winner.entry.text;
      setLiveLabel(instant.winner.entry.text);

      if (gameModeRef.current === 'classic') {
        const prefersReducedMotion =
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        playWin();
        if (cfg.launchConfetti && !prefersReducedMotion) {
          spawnConfetti();
        }
      }
      onSpinCompleteRef.current(instant.winner);
      return;
    }

    playSpinStart();

    const durSec = Math.max(1, Math.min(20, cfg.spinDuration));
    const minTurns = Math.max(4, Math.round(durSec * 1.35));
    const extraTurns = minTurns + Math.floor(Math.random() * 3);
    const randomFinalOffset = Math.random() * TWO_PI;

    isSpinningRef.current = true;
    spinStartTimeRef.current = performance.now();
    spinStartAngleRef.current = rotationRef.current;
    spinTargetAngleRef.current = rotationRef.current + extraTurns * TWO_PI + randomFinalOffset;
    spinDurationMsRef.current = durSec * 1000;
    needsDrawRef.current = true;

    const initialSlice = getSliceAtPointer(slicesRef.current, rotationRef.current);
    const initialText = initialSlice?.entry.text ?? '';
    liveLabelRef.current = initialText;
    setLiveLabel(initialText);

    onSpinStart();
  }, [onSpinStart, playSpinStart, playWin, spawnConfetti, unlockAudio]);

  // Support external trigger (Ctrl+Enter keyboard shortcut)
  const prevTriggerRef = useRef(spinTriggerCount);
  useEffect(() => {
    if (spinTriggerCount !== prevTriggerRef.current) {
      prevTriggerRef.current = spinTriggerCount;
      startSpin();
    }
  }, [spinTriggerCount, startSpin]);

  // Measure container size responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const maxW = Math.max(260, rect.width - 32);
      const maxH = Math.max(260, rect.height - 108);
      const dim = Math.floor(Math.min(maxW, maxH, 590));
      setCanvasDim(dim);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fast per-frame composite using cached wheel buffer (zero expensive shadowBlur per frame)
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const currentSlices = slicesRef.current;
    const cfg = settingsRef.current;
    const isDark = themeRef.current === 'dark';

    const cx = size / 2;
    const cy = size / 2;
    const outerMargin = Math.max(24, size * 0.055);
    const radius = size / 2 - outerMargin;

    ctx.clearRect(0, 0, size, size);

    // Soft radial ground shadow (fast gradient, no Gaussian shadowBlur)
    const shadowGrad = ctx.createRadialGradient(cx, cy + 4, radius * 0.92, cx, cy + 6, radius + 18);
    shadowGrad.addColorStop(0, isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.14)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy + 5, radius + 18, 0, TWO_PI);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    // Outer bezel ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, TWO_PI);
    ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? '#334155' : '#CBD5E1';
    ctx.stroke();

    // Empty wheel state
    if (currentSlices.length === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TWO_PI);
      ctx.fillStyle = isDark ? '#0F172A' : '#F1F5F9';
      ctx.fill();
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDark ? '#334155' : '#CBD5E1';
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.font = `600 ${Math.max(14, Math.round(size * 0.036))}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add entries to spin', cx, cy);
      ctx.restore();
      return;
    }

    // Blit cached wheel disc rotated by current rotation
    const buffer = offscreenBufferRef.current;
    if (buffer) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationRef.current);
      ctx.drawImage(buffer, -cx, -cy, size, size);
      ctx.restore();
    }

    // Center hub cap with fast layered depth ring
    const hubRadius = radius * HUB_RADIUS_RATIO[cfg.hubSize];
    ctx.beginPath();
    ctx.arc(cx, cy + 2, hubRadius + 4, 0, TWO_PI);
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(15, 23, 42, 0.14)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, TWO_PI);
    ctx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isDark ? '#334155' : '#E2E8F0';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, hubRadius - 6), 0, TWO_PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.32)';
    ctx.stroke();

    // Mechanical pointer / flapper at 3 o'clock (angle 0)
    const pointerTipX = cx + radius - 6;
    const pointerBaseX = cx + radius + outerMargin - 4;
    const pointerHalfH = Math.max(11, Math.min(18, size * 0.03));

    ctx.save();
    ctx.translate(pointerBaseX, cy);
    ctx.rotate(flapperAngleRef.current);

    // Offset shadow silhouette
    ctx.beginPath();
    ctx.moveTo(pointerTipX - pointerBaseX, 2);
    ctx.lineTo(0, -pointerHalfH + 2);
    ctx.quadraticCurveTo(6, 2, 0, pointerHalfH + 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fill();

    // Main pointer body
    ctx.beginPath();
    ctx.moveTo(pointerTipX - pointerBaseX, 0);
    ctx.lineTo(0, -pointerHalfH);
    ctx.quadraticCurveTo(6, 0, 0, pointerHalfH);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#0F172A' : '#FFFFFF';
    ctx.stroke();

    // Pivot pin
    ctx.beginPath();
    ctx.arc(-4, 0, 3.2, 0, TWO_PI);
    ctx.fillStyle = isDark ? '#334155' : '#CBD5E1';
    ctx.fill();
    ctx.restore();
  }, []);

  // Main animation loop (mounted once, demand-aware)
  useEffect(() => {
    let rafId = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = (now: number) => {
      const dt = lastFrameTimeRef.current ? Math.min(0.05, (now - lastFrameTimeRef.current) / 1000) : 0.016;
      lastFrameTimeRef.current = now;

      const currentSlices = slicesRef.current;
      const cfg = settingsRef.current;
      let shouldDrawWheel = needsDrawRef.current;

      if (isSpinningRef.current) {
        shouldDrawWheel = true;
        const elapsed = now - spinStartTimeRef.current;
        const progress = Math.min(1, elapsed / spinDurationMsRef.current);
        const eased = easeOutSpin(progress);

        const prevRot = rotationRef.current;
        const nextRot =
          spinStartAngleRef.current + (spinTargetAngleRef.current - spinStartAngleRef.current) * eased;
        rotationRef.current = nextRot;

        const crossed = countPegCrossings(currentSlices, prevRot, nextRot);
        if (crossed > 0) {
          flapperAngleRef.current = Math.max(-0.52, flapperAngleRef.current - 0.32);
          flapperVelRef.current = -1.6;
          playTick();
        }

        const currentSlice = getSliceAtPointer(currentSlices, nextRot);
        if (currentSlice && currentSlice.entry.text !== liveLabelRef.current) {
          liveLabelRef.current = currentSlice.entry.text;
          setLiveLabel(currentSlice.entry.text);
        }

        if (progress >= 1) {
          isSpinningRef.current = false;
          rotationRef.current = normalizeAngle(nextRot);
          const winningSlice = getSliceAtPointer(currentSlices, rotationRef.current);
          if (winningSlice) {
            liveLabelRef.current = winningSlice.entry.text;
            setLiveLabel(winningSlice.entry.text);
            if (gameModeRef.current === 'classic') {
              playWin();
              if (cfg.launchConfetti && !prefersReducedMotion) {
                spawnConfetti();
              }
            }
            onSpinCompleteRef.current(winningSlice);
          }
        }
      } else if (cfg.spinSlowly && currentSlices.length > 0 && !pausedRef.current && !prefersReducedMotion) {
        rotationRef.current = normalizeAngle(rotationRef.current + dt * 0.16);
        shouldDrawWheel = true;
      }

      // Spring-damper physics for pointer flapper
      if (Math.abs(flapperAngleRef.current) > 0.001 || Math.abs(flapperVelRef.current) > 0.001) {
        shouldDrawWheel = true;
        const stiffness = 240;
        const damping = 18;
        const accel = -stiffness * flapperAngleRef.current - damping * flapperVelRef.current;
        flapperVelRef.current += accel * dt;
        flapperAngleRef.current += flapperVelRef.current * dt;
        if (Math.abs(flapperAngleRef.current) < 0.002 && Math.abs(flapperVelRef.current) < 0.01) {
          flapperAngleRef.current = 0;
          flapperVelRef.current = 0;
        }
      }

      if (shouldDrawWheel) {
        const canvas = wheelCanvasRef.current;
        if (canvas) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const cssSize = canvas.clientWidth || canvasDim;
          const targetPx = Math.round(cssSize * dpr);
          if (canvas.width !== targetPx || canvas.height !== targetPx) {
            canvas.width = targetPx;
            canvas.height = targetPx;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            drawFrame(ctx, cssSize);
            ctx.restore();
          }
        }
        needsDrawRef.current = false;
      }

      // Only touch confetti canvas when particles exist or just finished
      const particles = confettiRef.current;
      if (particles.length > 0 || confettiHadParticlesRef.current) {
        const cCanvas = confettiCanvasRef.current;
        if (cCanvas) {
          const rect = cCanvas.getBoundingClientRect();
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const w = Math.max(1, Math.round(rect.width * dpr));
          const h = Math.max(1, Math.round(rect.height * dpr));
          if (cCanvas.width !== w || cCanvas.height !== h) {
            cCanvas.width = w;
            cCanvas.height = h;
          }
          const cCtx = cCanvas.getContext('2d');
          if (cCtx) {
            cCtx.clearRect(0, 0, w, h);
            if (particles.length > 0) {
              cCtx.save();
              cCtx.scale(dpr, dpr);
              const nextParticles: ConfettiParticle[] = [];
              for (const p of particles) {
                p.life += dt;
                if (p.life >= p.maxLife) continue;
                p.vy += 680 * dt;
                p.vx *= 0.99;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rotation += p.vRot * dt;

                const alpha = Math.max(0, 1 - p.life / p.maxLife);
                cCtx.save();
                cCtx.globalAlpha = alpha;
                cCtx.translate(p.x, p.y);
                cCtx.rotate(p.rotation);
                cCtx.fillStyle = p.color;
                cCtx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
                cCtx.restore();

                nextParticles.push(p);
              }
              confettiRef.current = nextParticles;
              cCtx.restore();
            } else {
              confettiHadParticlesRef.current = false;
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [canvasDim, drawFrame, playTick, playWin, spawnConfetti]);

  const minEntriesForMode = gameMode === 'elimination' ? 2 : 1;
  const canSpin = slices.length >= minEntriesForMode && spinPhase !== 'spinning';
  const isFinalShowdown = gameMode === 'elimination' && slices.length === 2;

  return (
    <section
      ref={containerRef}
      data-testid="wheel-stage"
      data-phase={spinPhase}
      data-mode={gameMode}
      data-slice-count={slices.length}
      aria-label="Spinning wheel stage"
      className="relative flex flex-1 flex-col items-center justify-between overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-4 select-none min-h-[420px]"
    >
      {/* Confetti overlay canvas */}
      <canvas
        ref={confettiCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />

      {/* Stage Header Row: Mode Switcher (left) + Fullscreen & Panel controls (right) */}
      <div className="z-10 flex w-full items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Wheel game mode"
          className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5"
        >
          <button
            type="button"
            disabled={spinPhase === 'spinning'}
            aria-pressed={gameMode === 'classic'}
            onClick={() => {
              playInteraction('toggle');
              onChangeGameMode('classic');
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 ${
              gameMode === 'classic'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Classic
          </button>
          <button
            type="button"
            disabled={spinPhase === 'spinning'}
            aria-pressed={gameMode === 'elimination'}
            onClick={() => {
              playInteraction('toggle');
              onChangeGameMode('elimination');
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 ${
              gameMode === 'elimination'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Elimination
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playInteraction('click');
              onToggleFullscreen();
            }}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playInteraction('toggle');
              onTogglePanel();
            }}
            aria-label={panelOpen ? 'Hide entries panel' : 'Show entries panel'}
            title={panelOpen ? 'Hide panel' : 'Show panel'}
            className="hidden lg:inline-flex h-9 items-center gap-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {panelOpen ? (
              <>
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                <span>Hide Panel</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                <span>Show Panel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Stage Stack: Title / Survivor Strip + Wheel */}
      <div className="mt-3 lg:mt-0 flex flex-1 flex-col items-center justify-center w-full">
        {/* Optional Editable Wheel Title */}
        {settings.showTitle && (settings.title.trim() || settings.subtitle.trim()) && (
          <div className="mb-2 text-center max-w-xl px-4">
            {settings.title.trim() && (
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 [text-wrap:balance]">
                {settings.title}
              </h1>
            )}
            {settings.subtitle.trim() && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {settings.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Elimination Mode Survivor Readout (clean unboxed metadata) */}
        {gameMode === 'elimination' && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {isFinalShowdown ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Final Showdown
              </span>
            ) : (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Last One Standing
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {slices.length} remaining
            </span>
            {eliminatedCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {eliminatedCount} eliminated
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  disabled={spinPhase === 'spinning'}
                  onClick={() => {
                    playInteraction('click');
                    onResetElimination();
                  }}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset Round</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Wheel Interactive Container */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: canvasDim, height: canvasDim }}
        >
          <canvas
            ref={wheelCanvasRef}
            data-testid="wheel-canvas"
            onClick={canSpin ? startSpin : undefined}
            style={{ width: canvasDim, height: canvasDim }}
            className={`block rounded-full transition-transform duration-150 ${
              canSpin ? 'cursor-pointer active:scale-[0.995]' : 'cursor-default'
            }`}
          />

          {/* Accessible Center Spin Trigger Button */}
          {slices.length > 0 && (
            <button
              type="button"
              onClick={startSpin}
              disabled={!canSpin}
              aria-label={spinPhase === 'spinning' ? 'Wheel is spinning' : 'Spin the wheel'}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-full text-center transition-transform duration-150 hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              style={{
                width: Math.max(64, Math.round(canvasDim * HUB_RADIUS_RATIO[settings.hubSize] * 1.75)),
                height: Math.max(64, Math.round(canvasDim * HUB_RADIUS_RATIO[settings.hubSize] * 1.75)),
              }}
            >
              <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
                {spinPhase === 'spinning' ? 'Spinning' : 'Spin'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Footer readout: live pointer entry while spinning, or keyboard hint when idle */}
      <div className="mt-2 flex h-7 items-center justify-center text-sm">
        {spinPhase === 'spinning' ? (
          <p className="font-display text-base font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs">
            {liveLabel || 'Spinning…'}
          </p>
        ) : canSpin ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={startSpin}
              className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>
                {gameMode === 'elimination' ? 'Spin to eliminate' : 'Click wheel to spin'}
              </span>
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px]">Ctrl + Enter</span>
          </div>
        ) : gameMode === 'elimination' && eliminatedCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              playInteraction('click');
              onResetElimination();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Restore all entries to start a new Elimination round</span>
          </button>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {gameMode === 'elimination'
              ? 'Add at least 2 entries in the panel to start an Elimination round.'
              : 'Enter at least one name in the panel to start spinning.'}
          </p>
        )}
      </div>
    </section>
  );
}
