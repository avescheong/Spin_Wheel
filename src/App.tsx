import { useCallback, useEffect, useMemo, useState } from 'react';
import { COLOR_PALETTES, DEFAULT_SETTINGS } from './data/presets';
import type { ComputedSlice, SavedWheel, SpinPhase, WheelEntry, WheelSettings, WinnerRecord } from './types/wheel';
import {
  computeSlices,
  createId,
  deduplicateEntries,
  pickSliceColor,
  removeEntryById,
  shuffleEntries,
  sortEntriesAZ,
} from './utils/wheelMath';
import {
  resolveEliminationStep,
  restoreEliminatedEntries,
  type EliminatedEntryRecord,
  type PodiumSpot,
  type WheelGameMode,
} from './utils/elimination';
import {
  loadEntries,
  loadHistory,
  loadSavedWheels,
  loadSettings,
  loadTheme,
  saveEntries,
  saveHistory,
  saveSavedWheels,
  saveSettings,
  saveTheme,
} from './utils/storage';
import { TopBar } from './components/TopBar';
import { WheelCanvas } from './components/WheelCanvas';
import { EntriesPanel } from './components/EntriesPanel';
import { WinnerModal } from './components/WinnerModal';
import { EliminationModal } from './components/EliminationModal';
import { CustomizeModal } from './components/CustomizeModal';
import { SavedWheelsModal } from './components/SavedWheelsModal';
import { AudioProvider, useAudio } from './context/AudioContext';

export default function App() {
  const [settings, setSettings] = useState<WheelSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <AudioProvider
      volume={settings.volume}
      tickSound={settings.tickSound}
      winSound={settings.winSound}
    >
      <SpinWheelWorkspace settings={settings} setSettings={setSettings} />
    </AudioProvider>
  );
}

interface SpinWheelWorkspaceProps {
  settings: WheelSettings;
  setSettings: React.Dispatch<React.SetStateAction<WheelSettings>>;
}

function SpinWheelWorkspace({ settings, setSettings }: SpinWheelWorkspaceProps) {
  const { playInteraction, playEliminated, playChampion } = useAudio();
  const [entries, setEntries] = useState<WheelEntry[]>(() => loadEntries());
  const [history, setHistory] = useState<WinnerRecord[]>(() => loadHistory());
  const [savedWheels, setSavedWheels] = useState<SavedWheel[]>(() => loadSavedWheels());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());

  const [gameMode, setGameMode] = useState<WheelGameMode>('classic');
  const [eliminatedOrder, setEliminatedOrder] = useState<EliminatedEntryRecord[]>([]);
  const [pendingEliminated, setPendingEliminated] = useState<{
    record: EliminatedEntryRecord;
    remainingCount: number;
    isFinalShowdown: boolean;
  } | null>(null);
  const [championModal, setChampionModal] = useState<{
    text: string;
    color: string;
    podium: PodiumSpot[];
  } | null>(null);
  const [confettiTriggerCount, setConfettiTriggerCount] = useState(0);

  const [panelOpen, setPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('idle');
  const [spinTriggerCount, setSpinTriggerCount] = useState(0);

  const [activeWinner, setActiveWinner] = useState<ComputedSlice | null>(null);
  const [activeWinnerRecordId, setActiveWinnerRecordId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [savedModalState, setSavedModalState] = useState<{ open: boolean; focusSave: boolean }>({
    open: false,
    focusSave: false,
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Persist user data automatically to localStorage
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveSavedWheels(savedWheels);
  }, [savedWheels]);

  // Listen to native fullscreen changes
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Resolve active palette colors
  const activePalette = useMemo(() => {
    if (settings.paletteId === 'custom') {
      return settings.customColors;
    }
    const found = COLOR_PALETTES.find((p) => p.id === settings.paletteId);
    return found ? found.colors : COLOR_PALETTES[0].colors;
  }, [settings.paletteId, settings.customColors]);

  // Compute wheel slices with weights & colors
  const slices = useMemo(() => computeSlices(entries, activePalette), [entries, activePalette]);

  // Global keyboard shortcut: Ctrl+Enter / Cmd+Enter to spin
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const minEntries = gameMode === 'elimination' ? 2 : 1;
        if (spinPhase === 'spinning' || slices.length < minEntries) return;
        e.preventDefault();
        setActiveWinner(null);
        setPendingEliminated(null);
        setChampionModal(null);
        setCustomizeOpen(false);
        setSavedModalState({ open: false, focusSave: false });
        setSpinTriggerCount((c) => c + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameMode, spinPhase, slices.length]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSpinStart = useCallback(() => {
    setActiveWinner(null);
    setPendingEliminated(null);
    setChampionModal(null);
    setSpinPhase('spinning');
  }, []);

  const handleSpinComplete = useCallback(
    (winningSlice: ComputedSlice) => {
      if (gameMode === 'elimination') {
        const step = resolveEliminationStep(
          entries,
          winningSlice.entry.id,
          winningSlice.color,
          eliminatedOrder,
          (entry, idx) => pickSliceColor(idx, entries.length, activePalette, entry.color)
        );

        if (!step) {
          setSpinPhase('idle');
          return;
        }

        setEntries(step.nextEntries);
        setEliminatedOrder(step.nextEliminatedOrder);

        const elimHistoryRecord: WinnerRecord = {
          id: createId('elim'),
          entryId: step.eliminatedRecord.entryId,
          text: `${step.eliminatedRecord.text} (#${step.eliminatedRecord.rank})`,
          color: step.eliminatedRecord.color,
          timestamp: Date.now(),
          removed: false,
        };

        if (step.champion) {
          const champHistoryRecord: WinnerRecord = {
            id: createId('champ'),
            entryId: step.champion.entry.id,
            text: `${step.champion.entry.text} (Champion)`,
            color: step.champion.color,
            timestamp: Date.now() + 1,
            removed: false,
          };
          setHistory((prev) => [champHistoryRecord, elimHistoryRecord, ...prev]);
          playChampion();
          setConfettiTriggerCount((c) => c + 1);
          setChampionModal({
            text: step.champion.entry.text,
            color: step.champion.color,
            podium: step.podium,
          });
          setSpinPhase('winner');
        } else {
          setHistory((prev) => [elimHistoryRecord, ...prev]);
          playEliminated();
          setPendingEliminated({
            record: step.eliminatedRecord,
            remainingCount: step.remainingCount,
            isFinalShowdown: step.isFinalShowdown,
          });
          setSpinPhase('winner');
        }
        return;
      }

      const recordId = createId('win');
      const record: WinnerRecord = {
        id: recordId,
        entryId: winningSlice.entry.id,
        text: winningSlice.entry.text,
        color: winningSlice.color,
        timestamp: Date.now(),
        removed: false,
      };
      setHistory((prev) => [record, ...prev]);

      if (settings.showWinnerDialog) {
        setActiveWinner(winningSlice);
        setActiveWinnerRecordId(recordId);
        setSpinPhase('winner');
      } else {
        setSpinPhase('idle');
      }
    },
    [
      activePalette,
      eliminatedOrder,
      entries,
      gameMode,
      playChampion,
      playEliminated,
      settings.showWinnerDialog,
    ]
  );

  const handleResetElimination = useCallback(() => {
    setEntries((prev) =>
      restoreEliminatedEntries(
        prev,
        eliminatedOrder.map((r) => r.entryId)
      )
    );
    setEliminatedOrder([]);
    setPendingEliminated(null);
    setChampionModal(null);
    setSpinPhase('idle');
  }, [eliminatedOrder]);

  const handleChangeGameMode = useCallback(
    (mode: WheelGameMode) => {
      if (mode === gameMode) return;
      if (eliminatedOrder.length > 0) {
        setEntries((prev) =>
          restoreEliminatedEntries(
            prev,
            eliminatedOrder.map((r) => r.entryId)
          )
        );
        setEliminatedOrder([]);
      }
      setPendingEliminated(null);
      setChampionModal(null);
      setGameMode(mode);
      setSpinPhase('idle');
    },
    [eliminatedOrder, gameMode]
  );

  const handleEliminationNextSpin = useCallback(() => {
    setPendingEliminated(null);
    setSpinPhase('idle');
    // Launch next spin on next tick so updated slices are active
    setTimeout(() => {
      setSpinTriggerCount((c) => c + 1);
    }, 30);
  }, []);

  const handlePauseAfterElimination = useCallback(() => {
    playInteraction('click');
    setPendingEliminated(null);
    setSpinPhase('idle');
  }, [playInteraction]);

  const handlePlayAgainElimination = useCallback(() => {
    playInteraction('click');
    handleResetElimination();
  }, [handleResetElimination, playInteraction]);

  const handleCloseChampion = useCallback(() => {
    playInteraction('click');
    setChampionModal(null);
    setSpinPhase('idle');
  }, [playInteraction]);

  const handleCloseWinner = useCallback(() => {
    setActiveWinner(null);
    setActiveWinnerRecordId(null);
    setSpinPhase('idle');
  }, []);

  const handleRemoveWinner = useCallback(() => {
    if (!activeWinner) return;
    playInteraction('remove');
    setEntries((prev) => removeEntryById(prev, activeWinner.entry.id));
    if (activeWinnerRecordId) {
      setHistory((prev) =>
        prev.map((h) => (h.id === activeWinnerRecordId ? { ...h, removed: true } : h))
      );
    }
    setActiveWinner(null);
    setActiveWinnerRecordId(null);
    setSpinPhase('idle');
  }, [activeWinner, activeWinnerRecordId, playInteraction]);

  const handleHideWinner = useCallback(() => {
    if (!activeWinner) return;
    playInteraction('toggle');
    setEntries((prev) =>
      prev.map((e) => (e.id === activeWinner.entry.id ? { ...e, enabled: false } : e))
    );
    setActiveWinner(null);
    setActiveWinnerRecordId(null);
    setSpinPhase('idle');
  }, [activeWinner, playInteraction]);

  const handleRestoreRemoved = useCallback(() => {
    const removedItems = history.filter((h) => h.removed);
    if (removedItems.length === 0) return;
    playInteraction('click');

    setEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const toAdd: WheelEntry[] = [];
      for (const item of removedItems) {
        if (!existingIds.has(item.entryId)) {
          existingIds.add(item.entryId);
          toAdd.push({
            id: item.entryId,
            text: item.text,
            weight: 1,
            enabled: true,
          });
        }
      }
      return [...prev, ...toAdd];
    });

    setHistory((prev) => prev.map((h) => ({ ...h, removed: false })));
  }, [history, playInteraction]);

  const handleSaveCurrentWheel = useCallback(
    (name: string) => {
      playInteraction('click');
      const newWheel: SavedWheel = {
        id: createId('wheel'),
        name,
        updatedAt: Date.now(),
        entries: entries.map((e) => ({ ...e })),
        settings: { ...settings, title: name },
      };
      setSavedWheels((prev) => [newWheel, ...prev]);
    },
    [entries, playInteraction, settings]
  );

  const handleLoadWheel = useCallback(
    (wheel: SavedWheel) => {
      playInteraction('click');
      setEntries(wheel.entries.map((e) => ({ ...e })));
      setSettings({ ...DEFAULT_SETTINGS, ...wheel.settings });
      setActiveWinner(null);
      setEliminatedOrder([]);
      setPendingEliminated(null);
      setChampionModal(null);
      setSpinPhase('idle');
    },
    [playInteraction, setSettings]
  );

  const handleDeleteSaved = useCallback(
    (id: string) => {
      playInteraction('remove');
      setSavedWheels((prev) => prev.filter((w) => w.id !== id));
    },
    [playInteraction]
  );

  const handleExportJson = useCallback(() => {
    const payload = {
      name: settings.title || 'My Wheel',
      entries,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(settings.title || 'spinwheel').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [entries, settings]);

  const handleImportJson = useCallback((raw: string): string | null => {
    try {
      const parsed = JSON.parse(raw) as { entries?: unknown; settings?: Partial<WheelSettings> };
      if (!Array.isArray(parsed.entries)) {
        return 'Invalid wheel file: missing entries array.';
      }
      const nextEntries: WheelEntry[] = parsed.entries
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item, idx) => ({
          id: typeof item.id === 'string' && item.id ? item.id : createId(`imp-${idx}`),
          text: typeof item.text === 'string' ? item.text : String(item.text ?? ''),
          weight: typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1,
          color: typeof item.color === 'string' ? item.color : undefined,
          enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        }))
        .filter((e) => e.text.trim().length > 0);

      if (nextEntries.length === 0) {
        return 'Imported file contained no valid entries.';
      }
      setEntries(nextEntries);
      if (parsed.settings && typeof parsed.settings === 'object') {
        setSettings((prev) => ({ ...prev, ...parsed.settings }));
      }
      setActiveWinner(null);
      setEliminatedOrder([]);
      setPendingEliminated(null);
      setChampionModal(null);
      setSpinPhase('idle');
      return null;
    } catch {
      return 'Could not parse JSON file.';
    }
  }, [setSettings]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar
        onOpenCustomize={() => setCustomizeOpen(true)}
        onOpenSaved={() => setSavedModalState({ open: true, focusSave: false })}
        onSaveQuick={() => setSavedModalState({ open: true, focusSave: true })}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex flex-1 flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
        <WheelCanvas
          slices={slices}
          settings={settings}
          theme={theme}
          gameMode={gameMode}
          eliminatedCount={eliminatedOrder.length}
          confettiTriggerCount={confettiTriggerCount}
          spinPhase={spinPhase}
          paused={Boolean(
            activeWinner || pendingEliminated || championModal || customizeOpen || savedModalState.open
          )}
          spinTriggerCount={spinTriggerCount}
          panelOpen={panelOpen}
          onChangeGameMode={handleChangeGameMode}
          onResetElimination={handleResetElimination}
          onTogglePanel={() => setPanelOpen((o) => !o)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onSpinStart={handleSpinStart}
          onSpinComplete={handleSpinComplete}
        />

        {panelOpen && (
          <EntriesPanel
            entries={entries}
            history={history}
            activePalette={activePalette}
            disabled={spinPhase === 'spinning'}
            onChangeEntries={setEntries}
            onShuffle={() => setEntries((prev) => shuffleEntries(prev))}
            onSort={() => setEntries((prev) => sortEntriesAZ(prev))}
            onDeduplicate={() => setEntries((prev) => deduplicateEntries(prev))}
            onClearHistory={() => {
              playInteraction('remove');
              setHistory([]);
            }}
            onSortHistory={() => {
              playInteraction('click');
              setHistory((prev) => [...prev].sort((a, b) => a.text.localeCompare(b.text)));
            }}
            onRestoreRemoved={handleRestoreRemoved}
          />
        )}
      </main>

      <WinnerModal
        winner={activeWinner}
        message={settings.winnerMessage}
        showRemoveButton={settings.showRemoveButton}
        onClose={handleCloseWinner}
        onRemoveWinner={handleRemoveWinner}
        onHideWinner={handleHideWinner}
      />

      <EliminationModal
        eliminated={pendingEliminated?.record ?? null}
        remainingCount={pendingEliminated?.remainingCount ?? slices.length}
        isFinalShowdown={pendingEliminated?.isFinalShowdown ?? false}
        champion={championModal}
        onNextSpin={handleEliminationNextSpin}
        onPauseAfterElimination={handlePauseAfterElimination}
        onPlayAgain={handlePlayAgainElimination}
        onCloseChampion={handleCloseChampion}
      />

      <CustomizeModal
        open={customizeOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setCustomizeOpen(false)}
      />

      <SavedWheelsModal
        open={savedModalState.open}
        initialFocusSave={savedModalState.focusSave}
        currentTitle={settings.title}
        savedWheels={savedWheels}
        onSaveCurrent={handleSaveCurrentWheel}
        onLoadWheel={handleLoadWheel}
        onDeleteSaved={handleDeleteSaved}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClose={() => setSavedModalState({ open: false, focusSave: false })}
      />
    </div>
  );
}
