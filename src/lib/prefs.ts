import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY = 'musicbox_prefs';

export interface IMusicBoxPrefs {
  volume: number;
  octaveOffset: number;
  mode: 'normal' | 'slide';
  /** 升降记号：0 还原、1 升号（♯）、-1 降号（♭） */
  accidental: 0 | 1 | -1;
}

const DEFAULT_PREFS: IMusicBoxPrefs = {
  volume: 70,
  octaveOffset: 0,
  mode: 'normal',
  accidental: 0,
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
      accidental: parsed.accidental === 1 || parsed.accidental === -1 ? parsed.accidental : 0,
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
