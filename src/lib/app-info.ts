import { loadPrefs } from '@/lib/prefs';
import { getTimbre } from '@/lib/audio-engine';

/** 应用版本号：只在这一个地方维护，抽屉、使用说明页底部都用它 */
export const APP_VERSION = '4.4.7';

/** 当前音色名（读本地设置，保证和演奏页一致） */
export function getTimbreLabel(): string {
  try {
    return getTimbre(loadPrefs().timbre).name;
  } catch {
    return '钢琴';
  }
}
