import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { TickSoundType, WinSoundType } from '../types/wheel';
import {
  type InteractionSoundType,
  resolveEffectiveVolume,
  shouldPlaySound,
  soundEngine,
} from '../utils/sound';
import { loadMuted, saveMuted } from '../utils/storage';

export interface AudioContextValue {
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  unlockAudio: () => void;
  playSpinStart: () => void;
  playTick: (overrideType?: TickSoundType) => void;
  playWin: (overrideType?: WinSoundType) => void;
  playEliminated: () => void;
  playChampion: () => void;
  playInteraction: (kind?: InteractionSoundType) => void;
}

const AudioReactContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  volume: number;
  tickSound: TickSoundType;
  winSound: WinSoundType;
  children: ReactNode;
}

export function AudioProvider({
  volume,
  tickSound,
  winSound,
  children,
}: AudioProviderProps) {
  const [isMuted, setIsMutedState] = useState<boolean>(() => loadMuted());

  // Keep live audio settings in a ref so callbacks stay referentially stable
  // for RAF animation loops and memoized handlers.
  const configRef = useRef({ isMuted, volume, tickSound, winSound });
  configRef.current = { isMuted, volume, tickSound, winSound };

  useEffect(() => {
    saveMuted(isMuted);
  }, [isMuted]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    configRef.current.isMuted = muted;
    if (!muted) {
      soundEngine.unlock();
      const eff = resolveEffectiveVolume(configRef.current.volume, false);
      if (eff > 0) {
        soundEngine.playInteraction('toggle', eff);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      configRef.current.isMuted = next;
      if (!next) {
        soundEngine.unlock();
        const eff = resolveEffectiveVolume(configRef.current.volume, false);
        if (eff > 0) {
          soundEngine.playInteraction('toggle', eff);
        }
      }
      return next;
    });
  }, []);

  const unlockAudio = useCallback(() => {
    if (!configRef.current.isMuted) {
      soundEngine.unlock();
    }
  }, []);

  const playSpinStart = useCallback(() => {
    const { isMuted: muted, volume: vol } = configRef.current;
    if (!shouldPlaySound(vol, muted)) return;
    soundEngine.playSpinStart(resolveEffectiveVolume(vol, muted));
  }, []);

  const playTick = useCallback((overrideType?: TickSoundType) => {
    const { isMuted: muted, volume: vol, tickSound: defaultTick } = configRef.current;
    const type = overrideType ?? defaultTick;
    if (!shouldPlaySound(vol, muted, type)) return;
    soundEngine.playTick(type, resolveEffectiveVolume(vol, muted));
  }, []);

  const playWin = useCallback((overrideType?: WinSoundType) => {
    const { isMuted: muted, volume: vol, winSound: defaultWin } = configRef.current;
    const type = overrideType ?? defaultWin;
    if (!shouldPlaySound(vol, muted, type)) return;
    soundEngine.playWin(type, resolveEffectiveVolume(vol, muted));
  }, []);

  const playEliminated = useCallback(() => {
    const { isMuted: muted, volume: vol } = configRef.current;
    if (!shouldPlaySound(vol, muted)) return;
    soundEngine.playEliminated(resolveEffectiveVolume(vol, muted));
  }, []);

  const playChampion = useCallback(() => {
    const { isMuted: muted, volume: vol } = configRef.current;
    if (!shouldPlaySound(vol, muted)) return;
    soundEngine.playChampion(resolveEffectiveVolume(vol, muted));
  }, []);

  const playInteraction = useCallback((kind: InteractionSoundType = 'click') => {
    const { isMuted: muted, volume: vol } = configRef.current;
    if (!shouldPlaySound(vol, muted)) return;
    soundEngine.playInteraction(kind, resolveEffectiveVolume(vol, muted));
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      isMuted,
      setMuted,
      toggleMute,
      unlockAudio,
      playSpinStart,
      playTick,
      playWin,
      playEliminated,
      playChampion,
      playInteraction,
    }),
    [
      isMuted,
      setMuted,
      toggleMute,
      unlockAudio,
      playSpinStart,
      playTick,
      playWin,
      playEliminated,
      playChampion,
      playInteraction,
    ]
  );

  return <AudioReactContext.Provider value={value}>{children}</AudioReactContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioReactContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}
