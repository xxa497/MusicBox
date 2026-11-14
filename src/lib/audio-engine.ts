/**
 * 简易钢琴音色合成器
 * 使用 Web Audio API 合成接近大钢琴的音色
 * 原理：多振荡器叠加 + ADSR 包络 + 低通滤波器
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

interface ActiveNote {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
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

  getFrequency(pitch: string, octaveOffset: number, accidental: number = 0): number {
    const base = NOTE_FREQ_MAP[pitch];
    if (!base) return 440;
    return base * Math.pow(2, octaveOffset) * Math.pow(2, accidental / 12);
  }

  /**
   * 触发一个音符的按下（Attack）
   */
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
        note.osc1.stop(now + 0.16);
        note.osc2.stop(now + 0.16);
        note.osc3.stop(now + 0.16);
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

  noteOn(pitch: string, octaveOffset: number = 0, accidental: number = 0, gainScale: number = 1): void {
    const ctx = this.ensureContext();
    const noteKey = pitch;
    // 如果这个音已经在响，先停掉再重新触发（避免叠音失控）
    if (this.activeNotes.has(noteKey)) {
      this.noteOff(pitch);
    }

    const freq = this.getFrequency(pitch, octaveOffset, accidental);
    const now = ctx.currentTime;

    // 三个振荡器叠加模拟钢琴泛音
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc3.type = 'sine';

    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 2;   // 一个八度
    osc3.frequency.value = freq * 3;   // 十二度 + 大三度近似

    // 低通滤波器，模拟钢琴共鸣衰减
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000 + freq * 2;
    filter.Q.value = 0.8;

    // 包络
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);

    // 混合比例：基频强，泛音弱
    const mix1 = ctx.createGain();
    const mix2 = ctx.createGain();
    const mix3 = ctx.createGain();
    mix1.gain.value = 0.6;
    mix2.gain.value = 0.25;
    mix3.gain.value = 0.08;

    osc1.connect(mix1).connect(gain);
    osc2.connect(mix2).connect(gain);
    osc3.connect(mix3).connect(gain);

    gain.connect(filter);
    filter.connect(this.masterGain!);

    // ADSR - Attack
    gain.gain.setValueAtTime(0, now);
    const peak = 0.85 * gainScale;
    const hold = 0.45 * gainScale;
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    // Decay to sustain
    gain.gain.exponentialRampToValueAtTime(Math.max(hold, 0.001), now + 0.12);
    // Sustain 阶段保持，等 noteOff
    gain.gain.setValueAtTime(Math.max(hold, 0.001), now + 0.12);

    // 滤波器包络
    filter.frequency.setValueAtTime(4000 + freq * 2, now);
    filter.frequency.exponentialRampToValueAtTime(2000 + freq, now + 0.15);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    this.activeNotes.set(noteKey, { osc1, osc2, osc3, gain, filter, pitch, released: false });
  }

  /**
   * 释放一个音符（Release）
   */
  /**
   * 释放一个音符
   * @param releaseTime 衰减到无声所需的秒数（滑键换音很短、普通松开 0.6s、踩延音 ~1.2s）
   */
  noteOff(pitch: string, releaseTime: number = 0.6): void {
    const note = this.activeNotes.get(pitch);
    if (!note || !this.ctx) return;

    const now = this.ctx.currentTime;
    const { osc1, osc2, osc3, gain, filter } = note;
    const rt = Math.max(0.02, releaseTime);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + rt);

    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(filter.frequency.value, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + Math.min(rt, 0.5));

    osc1.stop(now + rt + 0.08);
    osc2.stop(now + rt + 0.08);
    osc3.stop(now + rt + 0.08);

    note.released = true;
    this.activeNotes.delete(pitch);
    if (rt > 0.15) {
      this.ringingNotes.add(note);
      setTimeout(() => this.ringingNotes.delete(note), (rt + 0.15) * 1000);
    }

    // 防泄漏：稍长时间后断开连接
    setTimeout(() => {
      try {
        osc1.disconnect();
        osc2.disconnect();
        osc3.disconnect();
        gain.disconnect();
        filter.disconnect();
      } catch { /* ignore */ }
    }, 750);
  }

  /**
   * 停止所有正在发声的音符
   */
  allNotesOff(): void {
    for (const pitch of Array.from(this.activeNotes.keys())) {
      this.noteOff(pitch);
    }
  }

  isNoteActive(pitch: string): boolean {
    return this.activeNotes.has(pitch);
  }

  getActiveCount(): number {
    return this.activeNotes.size;
  }
}

export const pianoEngine = new PianoEngine();
