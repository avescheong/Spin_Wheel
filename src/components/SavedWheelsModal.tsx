import { useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, Save, Trash2, Upload, X } from 'lucide-react';
import { STARTER_PRESETS } from '../data/presets';
import type { SavedWheel } from '../types/wheel';

interface SavedWheelsModalProps {
  open: boolean;
  initialFocusSave?: boolean;
  currentTitle: string;
  savedWheels: SavedWheel[];
  onSaveCurrent: (name: string) => void;
  onLoadWheel: (wheel: SavedWheel) => void;
  onDeleteSaved: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => string | null;
  onClose: () => void;
}

export function SavedWheelsModal({
  open,
  initialFocusSave = false,
  currentTitle,
  savedWheels,
  onSaveCurrent,
  onLoadWheel,
  onDeleteSaved,
  onExportJson,
  onImportJson,
  onClose,
}: SavedWheelsModalProps) {
  const [wheelName, setWheelName] = useState(currentTitle || '');
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setWheelName(currentTitle || '');
    setFormError(null);
    setImportStatus(null);
    if (initialFocusSave) {
      setTimeout(() => nameInputRef.current?.focus(), 40);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, initialFocusSave, currentTitle, onClose]);

  if (!open) return null;

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = wheelName.trim();
    if (!trimmed) {
      setFormError('Please enter a name for this wheel.');
      return;
    }
    setFormError(null);
    onSaveCurrent(trimmed);
    setWheelName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const err = onImportJson(content);
      setImportStatus(err ?? 'Wheel imported successfully.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-wheels-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 id="saved-wheels-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Saved Wheels &amp; Presets
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved wheels dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Save current wheel form */}
        <form onSubmit={handleSaveSubmit} className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <label htmlFor="save-wheel-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Save current wheel to this browser
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={nameInputRef}
              id="save-wheel-name"
              type="text"
              value={wheelName}
              onChange={(e) => {
                setWheelName(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="e.g. Friday Lunch Spots"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Save</span>
            </button>
          </div>
          {formError && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}
        </form>

        {/* Scrollable Lists */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Personal Saved Wheels */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              My Saved Wheels ({savedWheels.length})
            </h3>
            {savedWheels.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                You haven&rsquo;t saved any wheels yet. Give your current wheel a name above to save it locally.
              </p>
            ) : (
              <ul className="mt-2.5 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {savedWheels.map((wheel) => (
                  <li key={wheel.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {wheel.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {wheel.entries.filter((e) => e.enabled).length} entries
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadWheel(wheel);
                          onClose();
                        }}
                        aria-label={`Load saved wheel ${wheel.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Load</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSaved(wheel.id)}
                        aria-label={`Delete saved wheel ${wheel.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Starter Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Starter Templates
            </h3>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STARTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onLoadWheel(preset);
                    onClose();
                  }}
                  className="flex flex-col items-start rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 text-left hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {preset.name}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate w-full">
                    {preset.entries.slice(0, 4).map((e) => e.text).join(', ')}
                    {preset.entries.length > 4 ? '…' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with JSON Export / Import */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importStatus ? (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{importStatus}</span>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
