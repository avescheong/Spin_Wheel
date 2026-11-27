import { useEffect, useRef } from 'react';
import { EyeOff, Trash2, X } from 'lucide-react';
import type { ComputedSlice } from '../types/wheel';

interface WinnerModalProps {
  winner: ComputedSlice | null;
  message: string;
  showRemoveButton: boolean;
  onClose: () => void;
  onRemoveWinner: () => void;
  onHideWinner: () => void;
}

export function WinnerModal({
  winner,
  message,
  showRemoveButton,
  onClose,
  onRemoveWinner,
  onHideWinner,
}: WinnerModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!winner) return;
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [winner, onClose]);

  if (!winner) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Colored top band matching the winning slice */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: winner.color, color: winner.textColor }}
        >
          <h2 id="winner-dialog-title" className="font-display text-lg font-bold tracking-tight">
            {message.trim() || 'We have a winner!'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close winner dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-current"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Winner name showcase */}
        <div className="px-6 py-10 text-center">
          <p
            data-testid="winner-name"
            className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words [text-wrap:balance]"
          >
            {winner.entry.text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-6 py-4">
          <button
            type="button"
            onClick={onHideWinner}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            <span>Hide</span>
          </button>

          {showRemoveButton && (
            <button
              type="button"
              onClick={onRemoveWinner}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Remove</span>
            </button>
          )}

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
