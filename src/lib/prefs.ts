import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY = 'musicbox_prefs';

export interface IMusicBoxPrefs {
  volume: number;
  octaveOffset: number;
  mode: 'normal' | 'slide';
}

const DEFAULT_PREFS: IMusicBoxPrefs = {
  volume: 70,
  octaveOffset: 0,
  mode: 'normal',
};

export function loadPrefs(): IMusicBoxPrefs {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<IMusicBoxPrefs>;
    return {
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(100, parsed.volume)) : DEFAULT_PREFS.volume,
      octaveOffset: typeof parsed.octaveOffset === 'number' ? parsed.octaveOffset : DEFAULT_PREFS.octaveOffset,
      mode: parsed.mode === 'slide' ? 'slide' : 'normal',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: IMusicBoxPrefs): void {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
