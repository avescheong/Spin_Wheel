import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Trash2, Volume2, X } from 'lucide-react';
import { COLOR_PALETTES, DEFAULT_SETTINGS } from '../data/presets';
import type { HubSize, TickSoundType, WheelSettings, WinSoundType } from '../types/wheel';
import { useAudio } from '../context/AudioContext';

interface CustomizeModalProps {
  open: boolean;
  settings: WheelSettings;
  onChange: (next: WheelSettings) => void;
  onClose: () => void;
}

type CustomizeTab = 'spin' | 'after' | 'appearance';

export function CustomizeModal({ open, settings, onChange, onClose }: CustomizeModalProps) {
  const [tab, setTab] = useState<CustomizeTab>('spin');
  const { isMuted, setMuted, playTick, playWin, playInteraction } = useAudio();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<WheelSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const handleCustomColorChange = (index: number, color: string) => {
    const next = [...settings.customColors];
    next[index] = color;
    update({ customColors: next, paletteId: 'custom' });
  };

  const handleAddCustomColor = () => {
    if (settings.customColors.length >= 12) return;
    const fallbackPalette = ['#6366F1', '#14B8A6', '#F97316', '#EC4899', '#84CC16', '#06B6D4'];
    const nextColor = fallbackPalette[settings.customColors.length % fallbackPalette.length];
    update({ customColors: [...settings.customColors, nextColor], paletteId: 'custom' });
  };

  const handleRemoveCustomColor = (index: number) => {
    if (settings.customColors.length <= 2) return;
    update({
      customColors: settings.customColors.filter((_, i) => i !== index),
      paletteId: 'custom',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 id="customize-dialog-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Customize Wheel
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customize dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <div role="tablist" aria-label="Customization sections" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
            {([
              ['spin', 'During Spin'],
              ['after', 'After Spin'],
              ['appearance', 'Appearance'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => {
                  playInteraction('click');
                  setTab(key);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {tab === 'spin' && (
            <>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                <div>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Enable spin animation
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Turn off for a simpler, instant pick without spinning physics
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSpinAnimation}
                  onChange={(e) => {
                    playInteraction('toggle');
                    update({ enableSpinAnimation: e.target.checked });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className={settings.enableSpinAnimation ? '' : 'opacity-50'}>
                <div className="flex items-center justify-between">
                  <label htmlFor="spin-duration-range" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Spin duration
                  </label>
                  <span className="font-mono text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">
                    {settings.enableSpinAnimation ? `${settings.spinDuration}s` : 'Instant'}
                  </span>
                </div>
                <input
                  id="spin-duration-range"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  disabled={!settings.enableSpinAnimation}
                  value={settings.spinDuration}
                  onChange={(e) => update({ spinDuration: Number(e.target.value) })}
                  className="mt-2.5 w-full accent-blue-600 disabled:cursor-not-allowed"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-slate-400">
                  <span>1s (Quick)</span>
                  <span>10s</span>
                  <span>20s (Suspense)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={settings.enableSpinAnimation ? '' : 'opacity-50'}>
                  <label htmlFor="tick-sound-select" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Ticking sound
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      id="tick-sound-select"
                      disabled={!settings.enableSpinAnimation}
                      value={settings.tickSound}
                      onChange={(e) => {
                        const val = e.target.value as TickSoundType;
                        update({ tickSound: val });
                        playTick(val);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed"
                    >
                      <option value="tick">Mechanical Peg</option>
                      <option value="wood">Soft Woodblock</option>
                      <option value="arcade">Arcade Blip</option>
                      <option value="none">Silent</option>
                    </select>
                    <button
                      type="button"
                      disabled={!settings.enableSpinAnimation || isMuted}
                      onClick={() => playTick(settings.tickSound)}
                      aria-label="Preview ticking sound"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="sound-volume-range" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Volume
                    </label>
                    {isMuted ? (
                      <button
                        type="button"
                        onClick={() => setMuted(false)}
                        className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Muted · Unmute
                      </button>
                    ) : (
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {Math.round(settings.volume * 100)}%
                      </span>
                    )}
                  </div>
                  <input
                    id="sound-volume-range"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(settings.volume * 100)}
                    onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
                    className="mt-4 w-full accent-blue-600"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                <div>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Slow idle spin
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Gently rotate the wheel while waiting for a spin
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.spinSlowly}
                  onChange={(e) => {
                    playInteraction('toggle');
                    update({ spinSlowly: e.target.checked });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </>
          )}

          {tab === 'after' && (
            <>
              <div>
                <label htmlFor="win-sound-select" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Celebration sound
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    id="win-sound-select"
                    value={settings.winSound}
                    onChange={(e) => {
                      const val = e.target.value as WinSoundType;
                      update({ winSound: val });
                      playWin(val);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="fanfare">Fanfare Triad</option>
                    <option value="chime">Bright Chime</option>
                    <option value="pop">Subtle Pop</option>
                    <option value="none">Silent</option>
                  </select>
                  <button
                    type="button"
                    disabled={isMuted}
                    onClick={() => playWin(settings.winSound)}
                    aria-label="Preview celebration sound"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="winner-message-input" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Winner popup heading
                </label>
                <input
                  id="winner-message-input"
                  type="text"
                  value={settings.winnerMessage}
                  onChange={(e) => update({ winnerMessage: e.target.value })}
                  placeholder="We have a winner!"
                  className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                  <div>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Launch confetti
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Burst colored confetti when a winner is chosen
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.launchConfetti}
                    onChange={(e) => update({ launchConfetti: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                  <div>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Display winner popup
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Show a modal announcement after each spin
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showWinnerDialog}
                    onChange={(e) => update({ showWinnerDialog: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                  <div>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Show &ldquo;Remove&rdquo; button on popup
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Quickly eliminate winners for multi-round raffles
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showRemoveButton}
                    onChange={(e) => update({ showRemoveButton: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </>
          )}

          {tab === 'appearance' && (
            <>
              {/* Wheel Title */}
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Show title above wheel
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.showTitle}
                    onChange={(e) => update({ showTitle: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                {settings.showTitle && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="wheel-title-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Title
                      </label>
                      <input
                        id="wheel-title-input"
                        type="text"
                        value={settings.title}
                        onChange={(e) => update({ title: e.target.value })}
                        placeholder="My Decision Wheel"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="wheel-subtitle-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Subtitle (optional)
                      </label>
                      <input
                        id="wheel-subtitle-input"
                        type="text"
                        value={settings.subtitle}
                        onChange={(e) => update({ subtitle: e.target.value })}
                        placeholder="Click to pick randomly"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Color Palettes */}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Color theme</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {COLOR_PALETTES.map((palette) => {
                    const selected = settings.paletteId === palette.id;
                    const swatches = palette.id === 'custom' ? settings.customColors : palette.colors;
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => update({ paletteId: palette.id })}
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {palette.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {swatches.slice(0, 6).map((c, i) => (
                            <span
                              key={`${palette.id}-${i}`}
                              className="h-4 flex-1 rounded-xs"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Palette Swatches Editor */}
              {settings.paletteId === 'custom' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Custom colors ({settings.customColors.length})
                    </span>
                    <button
                      type="button"
                      disabled={settings.customColors.length >= 12}
                      onClick={handleAddCustomColor}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Add color</span>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {settings.customColors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        <input
                          type="color"
                          value={color}
                          aria-label={`Custom color ${idx + 1}`}
                          onChange={(e) => handleCustomColorChange(idx, e.target.value)}
                          className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        {settings.customColors.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomColor(idx)}
                            aria-label={`Remove custom color ${idx + 1}`}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hub Size & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Center hub size
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
                    {(['small', 'medium', 'large'] as HubSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => update({ hubSize: size })}
                        className={`rounded-md py-1.5 text-xs font-semibold capitalize transition-colors ${
                          settings.hubSize === size
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2.5">
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSliceBorders}
                      onChange={(e) => update({ showSliceBorders: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span>Show slice borders</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showRimPegs}
                      onChange={(e) => update({ showRimPegs: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span>Show rim pegs</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-6 py-3.5">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SETTINGS)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
