// EXPORTS: KEY_CONFIG_NORMAL, KEY_CONFIG_SLIDE, getKeyConfig, getPitchByKeyIndex

/**
 * 九键音高配置
 * 索引 0~8 对应 3x3 按键从左到右、从上到下：
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */

export interface KeyConfig {
  /** 按键索引 0-8 */
  index: number;
  /** 音高标识，C4 D4 等；中立区为 null */
  pitch: string | null;
  /** 简谱显示文本，含高音点 */
  label: string;
}

// 正常模式
export const KEY_CONFIG_NORMAL: KeyConfig[] = [
  { index: 0, pitch: 'C4', label: '1' },
  { index: 1, pitch: 'D4', label: '2' },
  { index: 2, pitch: 'E4', label: '3' },
  { index: 3, pitch: 'F4', label: '4' },
  { index: 4, pitch: 'G4', label: '5' },
  { index: 5, pitch: 'A4', label: '6' },
  { index: 6, pitch: 'B4', label: '7' },
  { index: 7, pitch: 'C5', label: '1̇' },
  { index: 8, pitch: 'D5', label: '2̇' },
];

// 滑键模式：中间 4 为中立区，周围 8 键环绕
// 第一行：1(C4) 2(D4) 3(E4)
// 第二行：高音1(C5) — 4(F4)
// 第三行：7(B4) 6(A4) 5(G4)
export const KEY_CONFIG_SLIDE: KeyConfig[] = [
  { index: 0, pitch: 'C4', label: '1' },
  { index: 1, pitch: 'D4', label: '2' },
  { index: 2, pitch: 'E4', label: '3' },
  { index: 3, pitch: 'C5', label: '1̇' },
  { index: 4, pitch: null, label: '—' },
  { index: 5, pitch: 'F4', label: '4' },
  { index: 6, pitch: 'B4', label: '7' },
  { index: 7, pitch: 'A4', label: '6' },
  { index: 8, pitch: 'G4', label: '5' },
];

export function getKeyConfig(mode: 'normal' | 'slide'): KeyConfig[] {
  return mode === 'normal' ? KEY_CONFIG_NORMAL : KEY_CONFIG_SLIDE;
}

export function getPitchByKeyIndex(index: number, mode: 'normal' | 'slide'): string | null {
  const configs = getKeyConfig(mode);
  return configs[index]?.pitch ?? null;
}

export function getLabelByKeyIndex(index: number, mode: 'normal' | 'slide'): string {
  const configs = getKeyConfig(mode);
  return configs[index]?.label ?? '';
}

/**
 * 计算当前音域范围（基于八度偏移）
 * 中文记法：小字一组 c¹ = C4，小字二组 c² = C5，以此类推
 * 即音名后的数字 - 3 = 上标数字（小字 n 组）
 */
export function getRangeDisplay(octaveOffset: number): {
  lowPitch: string;
  highPitch: string;
  lowSolfège: string;
  highSolfège: string;
} {
  // 基准音域 C4 - D5（偏移 0）
  const baseLowOctave = 4 + octaveOffset;   // C 的八度号
  const baseHighOctave = 5 + octaveOffset;  // D 的八度号
  // 小字组：C4 -> 小字一组 -> 上标 1 = 4 - 3
  const lowSup = baseLowOctave - 3;
  const highSup = baseHighOctave - 3;
  return {
    lowPitch: `C${baseLowOctave}`,
    highPitch: `D${baseHighOctave}`,
    lowSolfège: `c${superscriptOrEmpty(lowSup)}`,
    highSolfège: `d${superscriptOrEmpty(highSup)}`,
  };
}

/** 上标数字：n<=0 返回空串（大字组/中央C以下暂简化为空），n>=1 返回对应上标 */
function superscriptOrEmpty(n: number): string {
  if (n <= 0) return '';
  return superscript(n);
}

function superscript(n: number): string {
  const map: Record<number, string> = {
    0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
    5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
  };
  if (n >= 0) {
    return String(n).split('').map(d => map[Number(d)] ?? d).join('');
  }
  return '₋' + String(Math.abs(n)).split('').map(d => map[Number(d)] ?? d).join('');
}
