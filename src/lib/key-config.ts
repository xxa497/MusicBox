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
  /** 简谱显示文本 */
  label: string;
  /** 高音键：数字上方单独绘制高音点 */
  dot?: boolean;
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
  { index: 7, pitch: 'C5', label: '1', dot: true },
  { index: 8, pitch: 'D5', label: '2', dot: true },
];

// 滑键模式：中间 4 为中立区，周围 8 键环绕
// 第一行：1(C4) 2(D4) 3(E4)
// 第二行：高音1(C5) — 4(F4)
// 第三行：7(B4) 6(A4) 5(G4)
export const KEY_CONFIG_SLIDE: KeyConfig[] = [
  { index: 0, pitch: 'C4', label: '1' },
  { index: 1, pitch: 'D4', label: '2' },
  { index: 2, pitch: 'E4', label: '3' },
  { index: 3, pitch: 'C5', label: '1', dot: true },
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
 *
 * 乐理记法（按《音乐理论基础》通用写法）：
 *   小字一组   c¹  d¹  —— 中央 C 所在的一组（C4 = c¹）
 *   小字二组   c²  d²
 *   小字组     c   d    （无组号）
 *   大字组     C   D    （大写，无下标）
 *   大字一组   C₁  D₁
 *   大字二组   C₂  D₂
 * 即：octave ≥ 4 为小写＋上标(octave-3)，octave = 3 为小写无标号，
 *     octave ≤ 2 为大写＋下标(2-octave)（octave=2 无下标）。
 */
export function getRangeDisplay(octaveOffset: number): {
  /** 乐理记法：c¹ – d² */
  lowSolfège: string;
  highSolfège: string;
  /** 国际记法：C4 – D5 */
  lowPitch: string;
  highPitch: string;
  /** 中文组名：小字一组 / 小字二组 */
  lowGroup: string;
  highGroup: string;
} {
  const lowOctave = 4 + octaveOffset;  // 低音为 C
  const highOctave = 5 + octaveOffset; // 高音为 D
  return {
    lowPitch: `C${lowOctave}`,
    highPitch: `D${highOctave}`,
    lowSolfège: solfegeName('c', lowOctave),
    highSolfège: solfegeName('d', highOctave),
    lowGroup: groupName(lowOctave),
    highGroup: groupName(highOctave),
  };
}

/** 单个音名的乐理写法 */
function solfegeName(letter: 'c' | 'd', octave: number): string {
  if (octave >= 4) {
    // 小字一组及以上：小写 + 上标组号
    return `${letter}${toSuperscript(octave - 3)}`;
  }
  if (octave === 3) {
    // 小字组：小写，无组号
    return letter;
  }
  // 大字组及以下：大写 + 下标（大字组本身无下标）
  const sub = 2 - octave;
  return `${letter.toUpperCase()}${sub > 0 ? toSubscript(sub) : ''}`;
}

/** 组名（中文） */
function groupName(octave: number): string {
  if (octave >= 4) return `小字${toCnNumber(octave - 3)}组`;
  if (octave === 3) return '小字组';
  const sub = 2 - octave;
  return sub > 0 ? `大字${toCnNumber(sub)}组` : '大字组';
}

function toCnNumber(n: number): string {
  const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五' };
  return map[n] ?? String(n);
}

function toSuperscript(n: number): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  return String(n).split('').map(d => map[d] ?? d).join('');
}

function toSubscript(n: number): string {
  const map: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  };
  return String(n).split('').map(d => map[d] ?? d).join('');
}
