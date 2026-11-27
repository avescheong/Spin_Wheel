import { Bookmark, Moon, SlidersHorizontal, Sun, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

interface TopBarProps {
  onOpenCustomize: () => void;
  onOpenSaved: () => void;
  onSaveQuick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function TopBar({
  onOpenCustomize,
  onOpenSaved,
  onSaveQuick,
  theme,
  onToggleTheme,
}: TopBarProps) {
  const { isMuted, toggleMute, playInteraction } = useAudio();

  return (
    <header className="sticky top-0 z-30 h-14 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6">
        {/* Zone 1: Single-element Brand Wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10.5" className="stroke-slate-900 dark:stroke-slate-100" strokeWidth="1.5" />
            <path d="M12 12L12 2.2A9.8 9.8 0 0 1 21.8 12Z" fill="#2563EB" />
            <path d="M12 12L21.8 12A9.8 9.8 0 0 1 12 21.8Z" fill="#E11D48" />
            <path d="M12 12L12 21.8A9.8 9.8 0 0 1 2.2 12Z" fill="#F59E0B" />
            <path d="M12 12L2.2 12A9.8 9.8 0 0 1 12 2.2Z" fill="#059669" />
            <circle cx="12" cy="12" r="3" className="fill-white dark:fill-slate-900 stroke-slate-900 dark:stroke-slate-100" strokeWidth="1.4" />
          </svg>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            SpinWheel
          </span>
        </div>

        {/* Zone 2: Concise single-line navigation / tool actions */}
        <nav aria-label="Wheel tools" className="flex items-center gap-0.5 sm:gap-6">
          <button
            type="button"
            onClick={() => {
              playInteraction('click');
              onOpenCustomize();
            }}
            aria-label="Customize wheel"
            title="Customize"
            className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Customize</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playInteraction('click');
              onOpenSaved();
            }}
            aria-label="Saved wheels and templates"
            title="Wheels"
            className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Wheels</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            title={isMuted ? 'Unmute' : 'Sound'}
            className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden md:inline">{isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playInteraction('toggle');
              onToggleTheme();
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden md:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              playInteraction('click');
              onSaveQuick();
            }}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Wheel</span>
          </button>
        </div>
      </div>
    </header>
  );
}
