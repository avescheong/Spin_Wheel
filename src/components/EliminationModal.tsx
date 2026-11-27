import { useEffect, useRef } from 'react';
import { FastForward, Pause, RotateCcw, Trophy, X } from 'lucide-react';
import type { EliminatedEntryRecord, PodiumSpot } from '../utils/elimination';
import { getContrastTextColor } from '../utils/wheelMath';

interface EliminationModalProps {
  eliminated: EliminatedEntryRecord | null;
  remainingCount: number;
  isFinalShowdown: boolean;
  champion: {
    text: string;
    color: string;
    podium: PodiumSpot[];
  } | null;
  onNextSpin: () => void;
  onPauseAfterElimination: () => void;
  onPlayAgain: () => void;
  onCloseChampion: () => void;
}

const PLACE_LABEL: Record<1 | 2 | 3, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
};

export function EliminationModal({
  eliminated,
  remainingCount,
  isFinalShowdown,
  champion,
  onNextSpin,
  onPauseAfterElimination,
  onPlayAgain,
  onCloseChampion,
}: EliminationModalProps) {
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = Boolean(eliminated || champion);

  useEffect(() => {
    if (!isOpen) return;
    primaryBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (champion) onCloseChampion();
        else onPauseAfterElimination();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, champion, onCloseChampion, onPauseAfterElimination]);

  if (!isOpen) return null;

  // Grand Champion Podium Dialog
  if (champion) {
    const headerTextColor = getContrastTextColor(champion.color);
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="champion-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCloseChampion();
        }}
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ backgroundColor: champion.color, color: headerTextColor }}
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h2 id="champion-dialog-title" className="font-display text-lg font-bold tracking-tight">
                Last One Standing
              </h2>
            </div>
            <button
              type="button"
              onClick={onCloseChampion}
              aria-label="Close champion dialog"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-current"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 pt-8 pb-6 text-center">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Grand Champion
            </p>
            <p
              data-testid="champion-name"
              className="mt-1.5 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words [text-wrap:balance]"
            >
              {champion.text}
            </p>

            {/* Clean Top 3 Podium Standings */}
            {champion.podium.length > 1 && (
              <div className="mt-7 border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Final Standings
                </p>
                <ol className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {champion.podium.map((spot) => (
                    <li
                      key={spot.place}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400 w-7 shrink-0">
                          {PLACE_LABEL[spot.place]}
                        </span>
                        <span
                          className="h-2.5 w-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: spot.color }}
                          aria-hidden="true"
                        />
                        <span
                          className={`truncate text-sm ${
                            spot.place === 1
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {spot.text}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        {spot.place === 1 ? 'Champion' : spot.place === 2 ? 'Runner-up' : 'Third'}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-6 py-4">
            <button
              type="button"
              onClick={onCloseChampion}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Close
            </button>
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={onPlayAgain}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Play Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Elimination Step Dialog (knocked out, more rounds left)
  if (!eliminated) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eliminated-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onPauseAfterElimination();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-800 px-6 py-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <h2 id="eliminated-dialog-title" className="font-display text-lg font-bold tracking-tight">
              Eliminated
            </h2>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="font-mono text-sm tabular-nums text-slate-300">
              #{eliminated.rank}
            </span>
          </div>
          <button
            type="button"
            onClick={onPauseAfterElimination}
            aria-label="Close elimination dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-9 text-center">
          <p
            data-testid="eliminated-name"
            className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white line-through decoration-rose-500/80 decoration-2 break-words [text-wrap:balance]"
          >
            {eliminated.text}
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            {isFinalShowdown
              ? 'Final Showdown next — 2 remaining'
              : `${remainingCount} survivors remaining`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-6 py-4">
          <button
            type="button"
            onClick={onPauseAfterElimination}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
            <span>Pause</span>
          </button>
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={onNextSpin}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap"
          >
            <FastForward className="h-4 w-4" aria-hidden="true" />
            <span>{isFinalShowdown ? 'Spin Final Showdown' : 'Next Spin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
