import { useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  Check,
  Copy,
  FilterX,
  Plus,
  RotateCcw,
  Shuffle,
  Sliders,
  Trash2,
} from 'lucide-react';
import type { EntryEditorMode, WheelEntry, WinnerRecord } from '../types/wheel';
import { createId, entriesToLines, parseLinesToEntries } from '../utils/wheelMath';
import { useAudio } from '../context/AudioContext';

interface EntriesPanelProps {
  entries: WheelEntry[];
  history: WinnerRecord[];
  activePalette: string[];
  disabled: boolean;
  onChangeEntries: (next: WheelEntry[]) => void;
  onShuffle: () => void;
  onSort: () => void;
  onDeduplicate: () => void;
  onClearHistory: () => void;
  onSortHistory: () => void;
  onRestoreRemoved: () => void;
}

export function EntriesPanel({
  entries,
  history,
  activePalette,
  disabled,
  onChangeEntries,
  onShuffle,
  onSort,
  onDeduplicate,
  onClearHistory,
  onSortHistory,
  onRestoreRemoved,
}: EntriesPanelProps) {
  const [activeTab, setActiveTab] = useState<'entries' | 'results'>('entries');
  const [editorMode, setEditorMode] = useState<EntryEditorMode>('simple');
  const [newEntryText, setNewEntryText] = useState('');
  const [copiedResults, setCopiedResults] = useState(false);
  const { playInteraction } = useAudio();

  // Track raw text separately while typing in simple mode so newlines / trailing spaces feel natural
  const [draftText, setDraftText] = useState<string | null>(null);

  const activeCount = useMemo(
    () => entries.filter((e) => e.enabled && e.text.trim().length > 0).length,
    [entries]
  );

  const removedCount = useMemo(
    () => history.filter((h) => h.removed).length,
    [history]
  );

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const e of entries) {
      const k = e.text.trim().toLowerCase();
      if (!k) continue;
      if (seen.has(k)) dupes += 1;
      else seen.add(k);
    }
    return dupes;
  }, [entries]);

  const displayedText = draftText !== null ? draftText : entriesToLines(entries);

  const handleTextareaChange = (value: string) => {
    setDraftText(value);
    const hiddenEntries = entries.filter((e) => !e.enabled);
    const parsedVisible = parseLinesToEntries(value, entries.filter((e) => e.enabled));
    onChangeEntries([...parsedVisible, ...hiddenEntries]);
  };

  const handleTextareaBlur = () => {
    setDraftText(null);
  };

  const handleToolbarAction = (action: () => void, soundKind: 'click' | 'remove' = 'click') => {
    setDraftText(null);
    playInteraction(soundKind);
    action();
  };

  const handleAddAdvancedEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEntryText.trim();
    if (!trimmed) return;
    playInteraction('click');
    onChangeEntries([
      ...entries,
      {
        id: createId('entry'),
        text: trimmed,
        weight: 1,
        enabled: true,
      },
    ]);
    setNewEntryText('');
  };

  const updateEntry = (id: string, patch: Partial<WheelEntry>) => {
    onChangeEntries(entries.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const deleteEntry = (id: string) => {
    playInteraction('remove');
    onChangeEntries(entries.filter((item) => item.id !== id));
  };

  const handleCopyResults = async () => {
    if (history.length === 0) return;
    const text = history.map((h, i) => `${i + 1}. ${h.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResults(true);
      setTimeout(() => setCopiedResults(false), 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  const formatTime = (ts: number) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  return (
    <aside
      aria-label="Entries and results panel"
      className="flex w-full lg:w-[390px] xl:w-[410px] shrink-0 flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      {/* Top Segmented Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div
          role="tablist"
          aria-label="Panel views"
          className="grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'entries'}
            onClick={() => {
              playInteraction('click');
              setActiveTab('entries');
            }}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
              activeTab === 'entries'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Entries</span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'results'}
            onClick={() => {
              playInteraction('click');
              setActiveTab('results');
            }}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
              activeTab === 'results'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Results</span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {/* Entries View */}
      {activeTab === 'entries' && (
        <div className="flex flex-1 flex-col min-h-0">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={disabled || entries.length < 2}
                onClick={() => handleToolbarAction(onShuffle)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Shuffle</span>
              </button>

              <button
                type="button"
                disabled={disabled || entries.length < 2}
                onClick={() => handleToolbarAction(onSort)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sort</span>
              </button>

              {duplicateCount > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToolbarAction(onDeduplicate)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-40 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dedupe</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDraftText(null);
                playInteraction('toggle');
                setEditorMode((m) => (m === 'simple' ? 'advanced' : 'simple'));
              }}
              aria-pressed={editorMode === 'advanced'}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
                editorMode === 'advanced'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{editorMode === 'advanced' ? 'Simple Text' : 'Advanced'}</span>
            </button>
          </div>

          {/* Simple Textarea Mode */}
          {editorMode === 'simple' ? (
            <div className="flex flex-1 flex-col p-4 min-h-[260px]">
              <label htmlFor="entries-textarea" className="sr-only">
                Wheel entries, one per line
              </label>
              <textarea
                id="entries-textarea"
                value={displayedText}
                disabled={disabled}
                onChange={(e) => handleTextareaChange(e.target.value)}
                onBlur={handleTextareaBlur}
                spellCheck={false}
                placeholder={'Enter one name per line...\nAli\nBeatriz\nCharles'}
                className="flex-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none disabled:opacity-60"
              />
              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>One entry per line</span>
                {entries.some((e) => !e.enabled) && (
                  <button
                    type="button"
                    onClick={() => onChangeEntries(entries.map((e) => ({ ...e, enabled: true })))}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show {entries.filter((e) => !e.enabled).length} hidden
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Advanced Mode: Weights, Custom Colors & Visibility Toggles */
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[420px] lg:max-h-none">
                {entries.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No entries yet. Add your first item below.
                  </div>
                ) : (
                  entries.map((entry, idx) => {
                    const effectiveColor =
                      entry.color || activePalette[idx % Math.max(1, activePalette.length)] || '#2563EB';
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                          entry.enabled
                            ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            : 'border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/50 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          disabled={disabled}
                          aria-label={`Include ${entry.text || 'entry'} on wheel`}
                          onChange={(e) => updateEntry(entry.id, { enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        />

                        <label className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
                          <span className="sr-only">Color for {entry.text}</span>
                          <input
                            type="color"
                            value={effectiveColor}
                            disabled={disabled}
                            onChange={(e) => updateEntry(entry.id, { color: e.target.value })}
                            className="absolute -inset-2 h-10 w-10 cursor-pointer border-0 p-0"
                          />
                        </label>

                        <input
                          type="text"
                          value={entry.text}
                          disabled={disabled}
                          aria-label={`Entry name ${idx + 1}`}
                          onChange={(e) => updateEntry(entry.id, { text: e.target.value })}
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-400">wt</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            step={1}
                            value={entry.weight}
                            disabled={disabled}
                            aria-label={`Weight for ${entry.text}`}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              updateEntry(entry.id, {
                                weight: Number.isFinite(parsed) && parsed >= 1 ? Math.min(50, parsed) : 1,
                              });
                            }}
                            className="w-12 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => deleteEntry(entry.id)}
                          aria-label={`Delete ${entry.text}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleAddAdvancedEntry}
                className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3.5"
              >
                <label htmlFor="add-advanced-entry" className="sr-only">
                  Add new entry
                </label>
                <input
                  id="add-advanced-entry"
                  type="text"
                  value={newEntryText}
                  disabled={disabled}
                  onChange={(e) => setNewEntryText(e.target.value)}
                  placeholder="Add an entry..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={disabled || !newEntryText.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Results History View */}
      {activeTab === 'results' && (
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={history.length < 2}
                onClick={onSortHistory}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sort</span>
              </button>

              <button
                type="button"
                disabled={history.length === 0}
                onClick={handleCopyResults}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {copiedResults ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1">
              {removedCount > 0 && (
                <button
                  type="button"
                  onClick={onRestoreRemoved}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Restore ({removedCount})</span>
                </button>
              )}

              <button
                type="button"
                disabled={history.length === 0}
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[420px] lg:max-h-none">
            {history.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center px-4">
                <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-300">
                  No spins yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[220px]">
                  Spin the wheel and every winning result will be logged here in order.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {history.map((item, idx) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500 w-5 text-right shrink-0">
                        {history.length - idx}.
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {item.removed && <span>Removed</span>}
                      <span className="font-mono tabular-nums">{formatTime(item.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
