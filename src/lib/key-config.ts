// EXPORTS: KEY_CONFIG_NORMAL, KEY_CONFIG_SLIDE, getKeyConfig, getPitchByKeyIndex

/**
 * 十二平均律按键配置
 *
 * 每个半音都是独立的一个按键，不再有「升降记号」这类需要额外操作的修饰：
 *   升 do 与降 re 本来就是同一个音，键面上直接并排标成「♯1/♭2」。
 *
 * 正常模式：4 列 × 3 行，按从左到右、从上到下音高递增排列（C4 → B4）
 * 滑键模式：4 列 × 4 行，最外一圈 12 个半音首尾相接，顺时针越来越高；
 *          中间 2×2 为空档（不发声，划过不掐断声音）
 */

export interface KeyConfig {
  /** 按键索引（在网格里的位置序号） */
  index: number;
  /** 基础音高字母与八度，如 C4；实际音高再叠加 accidental；空档为 null */
  pitch: string | null;
  /** 变音记号：1 = 升高一个半音，-1 = 降低一个半音，0 = 本位 */
  accidental: 0 | 1 | -1;
  /** 键面主标签 */
  label: string;
  /** 键面副标签（黑键用来标「等音」的另一半，如 ♭2） */
  subLabel?: string;
  /** 音轨底部用的短标签（黑键只写 ♯ 那一个写法，避免轨名过宽） */
  laneLabel: string;
  /** 所属音轨：同一条音轨上，「还原音」和它的「升/降音」共用一条，靠条上的记号区分 */
  lane: number;
  /** 高音键：数字上方单独绘制高音点 */
  dot?: boolean;
}

/** 正常模式：4 列 × 3 行，12 个半音刚好铺满，没有空档 */
export const KEY_CONFIG_NORMAL: KeyConfig[] = [
  { index: 0, pitch: 'C4', accidental: 0, label: '1', lane: 0, laneLabel: '1' },
  { index: 1, pitch: 'C4', accidental: 1, label: '♯1', subLabel: '♭2', lane: 0, laneLabel: '♯1' },
  { index: 2, pitch: 'D4', accidental: 0, label: '2', lane: 1, laneLabel: '2' },
  { index: 3, pitch: 'D4', accidental: 1, label: '♯2', subLabel: '♭3', lane: 1, laneLabel: '♯2' },
  { index: 4, pitch: 'E4', accidental: 0, label: '3', lane: 2, laneLabel: '3' },
  { index: 5, pitch: 'F4', accidental: 0, label: '4', lane: 3, laneLabel: '4' },
  { index: 6, pitch: 'F4', accidental: 1, label: '♯4', subLabel: '♭5', lane: 3, laneLabel: '♯4' },
  { index: 7, pitch: 'G4', accidental: 0, label: '5', lane: 4, laneLabel: '5' },
  { index: 8, pitch: 'G4', accidental: 1, label: '♯5', subLabel: '♭6', lane: 4, laneLabel: '♯5' },
  { index: 9, pitch: 'A4', accidental: 0, label: '6', lane: 5, laneLabel: '6' },
  { index: 10, pitch: 'A4', accidental: 1, label: '♯6', subLabel: '♭7', lane: 5, laneLabel: '♯6' },
  { index: 11, pitch: 'B4', accidental: 0, label: '7', lane: 6, laneLabel: '7' },
];

/**
 * 滑键模式：4 列 × 4 行
 *   外圈（12 个）顺时针 = C4 C♯4 D4 D♯4 E4 F4 F♯4 G4 G♯4 A4 A♯4 B4
 *   内圈 2×2 = 空档
 */
export const KEY_CONFIG_SLIDE: KeyConfig[] = [
  // 第 1 行：1 ♯1 2 ♯2
  { index: 0, pitch: 'C4', accidental: 0, label: '1', lane: 0, laneLabel: '1' },
  { index: 1, pitch: 'C4', accidental: 1, label: '♯1', subLabel: '♭2', lane: 0, laneLabel: '♯1' },
  { index: 2, pitch: 'D4', accidental: 0, label: '2', lane: 1, laneLabel: '2' },
  { index: 3, pitch: 'D4', accidental: 1, label: '♯2', subLabel: '♭3', lane: 1, laneLabel: '♯2' },
  // 第 2 行：7 〔空〕 〔空〕 3
  { index: 4, pitch: 'B4', accidental: 0, label: '7', lane: 2, laneLabel: '7' },
  { index: 5, pitch: null, accidental: 0, label: '', laneLabel: '', lane: -1 },
  { index: 6, pitch: null, accidental: 0, label: '', laneLabel: '', lane: -1 },
  { index: 7, pitch: 'E4', accidental: 0, label: '3', lane: 3, laneLabel: '3' },
  // 第 3 行：♯6 〔空〕 〔空〕 4
  { index: 8, pitch: 'A4', accidental: 1, label: '♯6', subLabel: '♭7', lane: 3, laneLabel: '♯6' },
  { index: 9, pitch: null, accidental: 0, label: '', laneLabel: '', lane: -1 },
  { index: 10, pitch: null, accidental: 0, label: '', laneLabel: '', lane: -1 },
  { index: 11, pitch: 'F4', accidental: 0, label: '4', lane: 4, laneLabel: '4' },
  // 第 4 行：6 ♯5 5 ♯4
  { index: 12, pitch: 'A4', accidental: 0, label: '6', lane: 4, laneLabel: '6' },
  { index: 13, pitch: 'G4', accidental: 1, label: '♯5', subLabel: '♭6', lane: 5, laneLabel: '♯5' },
  { index: 14, pitch: 'G4', accidental: 0, label: '5', lane: 5, laneLabel: '5' },
  { index: 15, pitch: 'F4', accidental: 1, label: '♯4', subLabel: '♭5', lane: 6, laneLabel: '♯4' },
];

export function getKeyConfig(mode: 'normal' | 'slide'): KeyConfig[] {
  return mode === 'normal' ? KEY_CONFIG_NORMAL : KEY_CONFIG_SLIDE;
}

/** 网格列数：两种模式都是 4 列 */
export function getKeyColumns(): number {
  return 4;
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
 * 计算当前音域范围（基于八度偏移与实际按键音高）
 * 两种模式的按键都是 C4 ~ B4 的十二个半音，所以音域一致：c¹ – b¹。
 */
export function getRangeDisplay(
  octaveOffset: number,
  mode: 'normal' | 'slide' = 'normal',
): {
  lowSolfège: string;
  highSolfège: string;
  lowPitch: string;
  highPitch: string;
  lowGroup: string;
  highGroup: string;
} {
  const notes = getKeyConfig(mode)
    .filter(k => k.pitch !== null)
    .map(k => ({ ...k, value: pitchValue(k.pitch!, k.accidental) }))
    .sort((a, b) => a.value - b.value);

  const lowest = notes[0];
  const highest = notes[notes.length - 1];
  const lowItem = pitchName(lowest.pitch!, lowest.accidental);
  const highItem = pitchName(highest.pitch!, highest.accidental);

  const lowOctave = Number(lowItem.pitch.slice(1)) + octaveOffset;
  const highOctave = Number(highItem.pitch.slice(1)) + octaveOffset;

  return {
    lowPitch: `${lowItem.pitch[0]}${lowOctave}`,
    highPitch: `${highItem.pitch[0]}${highOctave}`,
    lowSolfège: solfegeName(lowItem.letter, lowOctave) + lowItem.sign,
    highSolfège: solfegeName(highItem.letter, highOctave) + highItem.sign,
    lowGroup: groupName(lowOctave),
    highGroup: groupName(highOctave),
  };
}

/** 半音序号（八度 × 12 + 音级 + 变音） */
function pitchValue(pitch: string, accidental: 0 | 1 | -1 = 0): number {
  const semitone: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return Number(pitch.slice(1)) * 12 + (semitone[pitch[0]] ?? 0) + accidental;
}

export function comparePitch(a: string, b: string): number {
  return pitchValue(a) - pitchValue(b);
}

/** 变音后的实际音名写法 */
function pitchName(pitch: string, accidental: 0 | 1 | -1): {
  pitch: string;
  letter: 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b';
  sign: string;
} {
  return {
    pitch,
    letter: pitch[0].toLowerCase() as 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b',
    sign: accidental === 1 ? '♯' : accidental === -1 ? '♭' : '',
  };
}

/** 单个音名的乐理写法 */
function solfegeName(letter: 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b', octave: number): string {
  if (octave >= 4) {
    return `${letter}${toSuperscript(octave - 3)}`;
  }
  if (octave === 3) {
    return letter;
  }
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

/**
 * 乐谱音轨：升/降音与它的还原音共用一条音轨（靠条上的记号区分），
 * 所以 12 个半音只占 7 条轨（1 2 3 4 5 6 7），画面更干净、绘制更轻。
 */
export function getLanes(mode: 'normal' | 'slide'): {
  index: number;
  lane: number;
  label: string;
  dot?: boolean;
}[] {
  const map = new Map<number, { index: number; lane: number; label: string; dot?: boolean }>();
  getKeyConfig(mode)
    .filter(k => k.pitch !== null && k.lane >= 0)
    .forEach(k => {
      if (!map.has(k.lane)) {
        map.set(k.lane, { index: k.index, lane: k.lane, label: k.accidental === 0 ? k.label : k.label.replace('♯', ''), dot: k.dot });
      }
    });
  return Array.from(map.values()).sort((a, b) => a.lane - b.lane);
}
