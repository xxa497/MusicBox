/**
 * 简易合成器音色引擎
 * 使用 Web Audio API 合成，一种音色 = 一组泛音 + 包络 + 滤波
 */

const NOTE_FREQ_MAP: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
  'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
  'B4': 493.88, 'C5': 523.25, 'D5': 587.33,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81,
  'F3': 174.61, 'G3': 196.00, 'A3': 220.00,
  'B3': 246.94, 'C6': 1046.50, 'D6': 1174.66,
  'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98,
  'A6': 1760.00, 'B6': 1975.53,
};

/** 可选的音色 */
export type TimbreId =
  | 'piano' | 'marimba' | 'musicbox' | 'bell' | 'strings' | 'organ' | 'flute'
  | 'chip' | 'saw' | 'lead' | 'bass' | 'eguitar' | 'dist';

interface Partial {
  /** 相对基频的倍数 */
  ratio: number;
  type: OscillatorType;
  /** 混合权重 */
  gain: number;
}

export interface TimbreDef {
  id: TimbreId;
  /** 列表里显示的名字 */
  name: string;
  /** 一句话说明 */
  hint: string;
  partials: Partial[];
  /** 起振时间（秒） */
  attack: number;
  /** 从峰值衰减到 sustain 的时间（秒） */
  decay: number;
  /** sustain 相对峰值的比例（0~1），越小越“一击即散” */
  sustainLevel: number;
  filterStart: (freq: number) => number;
  filterEnd: (freq: number) => number;
  /** 滤波 Q 值 */
  q: number;
}

export const TIMBRES: TimbreDef[] = [
  {
    id: 'piano',
    name: '钢琴',
    hint: '',
    partials: [
      { ratio: 1, type: 'triangle', gain: 0.6 },
      { ratio: 2, type: 'sine', gain: 0.25 },
      { ratio: 3, type: 'sine', gain: 0.08 },
    ],
    attack: 0.008,
    decay: 0.12,
    sustainLevel: 0.53,
    filterStart: (f) => 4000 + f * 2,
    filterEnd: (f) => 2000 + f,
    q: 0.8,
  },
  {
    id: 'marimba',
    name: '木琴',
    hint: '',
    partials: [
      { ratio: 1, type: 'sine', gain: 0.62 },
      { ratio: 2, type: 'sine', gain: 0.18 },
      { ratio: 4.2, type: 'sine', gain: 0.1 },
    ],
    attack: 0.003,
    decay: 0.06,
    sustainLevel: 0.05,
    filterStart: (f) => 4200 + f * 2,
    filterEnd: (f) => 1500 + f,
    q: 0.7,
  },
  {
    id: 'musicbox',
    name: '八音盒',
    hint: '',
    partials: [
      { ratio: 1, type: 'sine', gain: 0.4 },
      { ratio: 2, type: 'triangle', gain: 0.26 },
      { ratio: 3.01, type: 'sine', gain: 0.18 },
    ],
    attack: 0.005,
    decay: 0.09,
    sustainLevel: 0.16,
    filterStart: (f) => 6000 + f * 2,
    filterEnd: (f) => 3400 + f,
    q: 1.4,
  },
  {
    id: 'bell',
    name: '钟声',
    hint: '',
    partials: [
      { ratio: 1, type: 'sine', gain: 0.42 },
      { ratio: 2.76, type: 'sine', gain: 0.24 },
      { ratio: 5.4, type: 'sine', gain: 0.16 },
    ],
    attack: 0.006,
    decay: 0.18,
    sustainLevel: 0.03,
    filterStart: (f) => 7000 + f * 2,
    filterEnd: (f) => 4200 + f,
    q: 1.6,
  },
  {
    id: 'strings',
    name: '弦乐',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.3 },
      { ratio: 2, type: 'triangle', gain: 0.18 },
      { ratio: 3, type: 'sine', gain: 0.1 },
    ],
    attack: 0.12,
    decay: 0.15,
    sustainLevel: 0.72,
    filterStart: (f) => 3200 + f * 2,
    filterEnd: (f) => 2400 + f,
    q: 0.5,
  },
  {
    id: 'organ',
    name: '管风琴',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.32 },
      { ratio: 2, type: 'sine', gain: 0.3 },
      { ratio: 3, type: 'sine', gain: 0.2 },
      { ratio: 4, type: 'sine', gain: 0.1 },
    ],
    attack: 0.05,
    decay: 0.06,
    sustainLevel: 0.86,
    filterStart: (f) => 3800 + f * 2,
    filterEnd: (f) => 3400 + f,
    q: 0.5,
  },
  {
    id: 'flute',
    name: '长笛',
    hint: '',
    partials: [
      { ratio: 1, type: 'sine', gain: 0.5 },
      { ratio: 2, type: 'sine', gain: 0.08 },
      { ratio: 3, type: 'sine', gain: 0.04 },
    ],
    attack: 0.07,
    decay: 0.1,
    sustainLevel: 0.75,
    filterStart: (f) => 2600 + f * 2,
    filterEnd: (f) => 2000 + f,
    q: 0.4,
  },
  {
    id: 'chip',
    name: '方波',
    hint: '',
    partials: [
      { ratio: 1, type: 'square', gain: 0.36 },
      { ratio: 2, type: 'square', gain: 0.12 },
    ],
    attack: 0.005,
    decay: 0.05,
    sustainLevel: 0.4,
    filterStart: (f) => 6000 + f * 2,
    filterEnd: (f) => 3200 + f,
    q: 0.6,
  },
  {
    id: 'saw',
    name: '锯齿波',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.4 },
      { ratio: 2, type: 'sawtooth', gain: 0.14 },
    ],
    attack: 0.005,
    decay: 0.07,
    sustainLevel: 0.6,
    filterStart: (f) => f * 24,
    filterEnd: (f) => f * 18,
    q: 0.7,
  },
  {
    id: 'lead',
    name: '合成主音',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.26 },
      { ratio: 1.004, type: 'sawtooth', gain: 0.26 },
      { ratio: 2, type: 'square', gain: 0.14 },
    ],
    attack: 0.025,
    decay: 0.12,
    sustainLevel: 0.7,
    filterStart: (f) => f * 9,
    filterEnd: (f) => f * 4.2,
    q: 2.4,
  },
  {
    id: 'bass',
    name: '合成贝斯',
    hint: '',
    partials: [
      { ratio: 1, type: 'sine', gain: 0.5 },
      { ratio: 0.5, type: 'sawtooth', gain: 0.26 },
      { ratio: 2, type: 'triangle', gain: 0.1 },
    ],
    attack: 0.012,
    decay: 0.09,
    sustainLevel: 0.6,
    filterStart: (f) => 1600 + f * 2,
    filterEnd: (f) => 900 + f,
    q: 1.4,
  },
  {
    id: 'eguitar',
    name: '电吉他',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.3 },
      { ratio: 2, type: 'square', gain: 0.14 },
      { ratio: 4, type: 'sine', gain: 0.07 },
    ],
    attack: 0.002,
    decay: 0.055,
    sustainLevel: 0.38,
    filterStart: (f) => f * 8,
    filterEnd: (f) => f * 3,
    q: 3.0,
  },
  {
    id: 'dist',
    name: '失真吉他',
    hint: '',
    partials: [
      { ratio: 1, type: 'sawtooth', gain: 0.3 },
      { ratio: 1.008, type: 'sawtooth', gain: 0.26 },
      { ratio: 2, type: 'square', gain: 0.12 },
      { ratio: 3, type: 'sawtooth', gain: 0.08 },
    ],
    attack: 0.003,
    decay: 0.08,
    sustainLevel: 0.58,
    filterStart: (f) => f * 11,
    filterEnd: (f) => f * 3.5,
    q: 1.9,
  },
];

export function getTimbre(id: TimbreId): TimbreDef {
  return TIMBRES.find((t) => t.id === id) ?? TIMBRES[0];
}

interface ActiveNote {
  oscs: OscillatorNode[];
  gain: GainNode;
  filter: BiquadFilterNode;
  pitch: string;
  released: boolean;
}

export class PianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNotes: Map<string, ActiveNote> = new Map();
  /** 已松开但还在衰减、尚未停止的音（延音踏板用） */
  private ringingNotes: Set<ActiveNote> = new Set();
  private sustain: boolean = false;
  private volume: number = 0.7;
  private timbre: TimbreId = 'piano';

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(percent: number) {
    this.volume = Math.max(0, Math.min(1, percent / 100));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  /** 切换音色：只影响之后按下的音，正在响的音不会被切断 */
  setTimbre(id: TimbreId): void {
    this.timbre = id;
  }

  getTimbre(): TimbreId {
    return this.timbre;
  }

  getFrequency(pitch: string, octaveOffset: number, accidental: number = 0): number {
    const base = NOTE_FREQ_MAP[pitch];
    if (!base) return 440;
    return base * Math.pow(2, octaveOffset) * Math.pow(2, accidental / 12);
  }

  /** 延音踏板：开 / 关。关掉时把还在衰减的音快速收掉，不会一直响 */
  setSustain(on: boolean): void {
    this.sustain = on;
    if (on || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.ringingNotes.forEach((note) => {
      try {
        note.gain.gain.cancelScheduledValues(now);
        note.gain.gain.setValueAtTime(note.gain.gain.value, now);
        note.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        note.oscs.forEach((osc) => osc.stop(now + 0.16));
      } catch { /* ignore */ }
    });
    this.ringingNotes.clear();
  }

  isSustainOn(): boolean {
    return this.sustain;
  }

  /** 换档时的一点“咔哒”反馈，很轻，只在滑键换音时用 */
  tick(strength: number = 0.05): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 2200;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(strength, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.03);
    setTimeout(() => { try { osc.disconnect(); gain.disconnect(); } catch { /* ignore */ } }, 120);
  }

  /** 试听某个音色（不登记进 activeNotes，自己会收掉） */
  previewTimbre(id: TimbreId, pitch: string = 'C4'): void {
    const def = getTimbre(id);
    const ctx = this.ensureContext();
    const freq = NOTE_FREQ_MAP[pitch] ?? 261.63;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = def.filterStart(freq);
    filter.Q.value = def.q;
    const oscs: OscillatorNode[] = [];
    const mixGains: GainNode[] = [];
    def.partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.value = freq * p.ratio;
      const mix = ctx.createGain();
      mix.gain.value = p.gain;
      osc.connect(mix).connect(gain);
      oscs.push(osc);
      mixGains.push(mix);
    });
    gain.connect(filter).connect(this.masterGain!);
    const peak = 0.5;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + def.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * def.sustainLevel, 0.001), now + def.attack + def.decay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    filter.frequency.exponentialRampToValueAtTime(def.filterEnd(freq), now + Math.max(def.decay, 0.12));
    oscs.forEach((o) => o.start(now));
    oscs.forEach((o) => o.stop(now + 0.5));
    setTimeout(() => {
      try {
        oscs.forEach((o) => o.disconnect());
        mixGains.forEach((m) => m.disconnect());
        gain.disconnect();
        filter.disconnect();
      } catch { /* ignore */ }
    }, 700);
  }

  /** 音符身份 = 音名 + 八度偏移 + 变音，三者任一不同就是两个不同的音（可以同时响） */
  private makeKey(pitch: string, octaveOffset: number, accidental: number): string {
    return `${pitch}|${octaveOffset}|${accidental}`;
  }

  noteOn(pitch: string, octaveOffset: number = 0, accidental: number = 0, gainScale: number = 1): void {
    const ctx = this.ensureContext();
    const noteKey = this.makeKey(pitch, octaveOffset, accidental);
    // 同一个音（同音名、同八度、同变音）已经在响，先停掉再重新触发，避免叠音失控
    if (this.activeNotes.has(noteKey)) {
      this.noteOff(pitch, 0.05, octaveOffset, accidental);
    }

    const def = getTimbre(this.timbre);
    const freq = this.getFrequency(pitch, octaveOffset, accidental);
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = def.filterStart(freq);
    filter.Q.value = def.q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);

    const oscs: OscillatorNode[] = [];
    def.partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.value = freq * p.ratio;
      const mix = ctx.createGain();
      mix.gain.value = p.gain;
      osc.connect(mix).connect(gain);
      oscs.push(osc);
    });

    gain.connect(filter);
    filter.connect(this.masterGain!);

    const peak = 0.85 * gainScale;
    const hold = Math.max(peak * def.sustainLevel, 0.001);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + def.attack);
    gain.gain.exponentialRampToValueAtTime(hold, now + def.attack + def.decay);
    gain.gain.setValueAtTime(hold, now + def.attack + def.decay);

    filter.frequency.setValueAtTime(def.filterStart(freq), now);
    filter.frequency.exponentialRampToValueAtTime(def.filterEnd(freq), now + Math.max(def.decay, 0.12));

    oscs.forEach((o) => o.start(now));

    this.activeNotes.set(noteKey, { oscs, gain, filter, pitch, released: false });
  }

  /**
   * 释放一个音符
   * @param releaseTime 衰减到无声所需的秒数（滑键换音很短、普通松开 0.6s、踩延音 ~1.2s）
   */
  noteOff(pitch: string, releaseTime: number = 0.6, octaveOffset: number = 0, accidental: number = 0): void {
    const noteKey = this.makeKey(pitch, octaveOffset, accidental);
    const note = this.activeNotes.get(noteKey);
    if (!note || !this.ctx) return;

    const now = this.ctx.currentTime;
    const { oscs, gain, filter } = note;
    const rt = Math.max(0.02, releaseTime);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + rt);

    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(filter.frequency.value, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + Math.min(rt, 0.5));

    oscs.forEach((o) => o.stop(now + rt + 0.08));

    note.released = true;
    this.activeNotes.delete(noteKey);
    if (rt > 0.15) {
      this.ringingNotes.add(note);
      setTimeout(() => this.ringingNotes.delete(note), (rt + 0.15) * 1000);
    }

    // 防泄漏：稍长时间后断开连接
    setTimeout(() => {
      try {
        oscs.forEach((o) => o.disconnect());
        gain.disconnect();
        filter.disconnect();
      } catch { /* ignore */ }
    }, 750);
  }

  /**
   * 停止所有正在发声的音符
   */
  allNotesOff(): void {
    for (const [key, note] of Array.from(this.activeNotes.entries())) {
      const octaveOffset = Number(key.split('|')[1] ?? 0);
      const accidental = Number(key.split('|')[2] ?? 0);
      this.noteOff(note.pitch, 0.6, octaveOffset, accidental);
    }
  }

  isNoteActive(pitch: string, octaveOffset: number = 0, accidental: number = 0): boolean {
    return this.activeNotes.has(this.makeKey(pitch, octaveOffset, accidental));
  }

  getActiveCount(): number {
    return this.activeNotes.size;
  }
}

export const pianoEngine = new PianoEngine();
