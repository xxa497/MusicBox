import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu, Info, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppDrawer from '@/components/AppDrawer';
import MusicStaff, { NoteBarData, LaneInfo, getAmberColor } from '@/components/MusicStaff';
import VolumeKnob from '@/components/VolumeKnob';
import Keypad from '@/components/Keypad';
import { pianoEngine } from '@/lib/audio-engine';
import { getKeyConfig, getRangeDisplay, getLanes } from '@/lib/key-config';
import { loadPrefs, savePrefs, type IMusicBoxPrefs } from '@/lib/prefs';

export default function PlayPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefs, setPrefs] = useState<IMusicBoxPrefs>(() => loadPrefs());

  const [notes, setNotes] = useState<NoteBarData[]>([]);
  const [activeKeyIndices, setActiveKeyIndices] = useState<Set<number>>(new Set());

  // 延音踏板：状态 + ref（供音频回调读取最新值）
  const [sustain, setSustain] = useState(prefs.sustain);
  const sustainRef = useRef(prefs.sustain);

  // 每个 pointerId 对应的音符（按 pointer 独立跟踪，防止音泄漏）
  const pointerNoteMapRef = useRef<Map<number, { noteId: string; index: number; lane: number }>>(new Map());


  // 保存偏好 + 同步音量
  useEffect(() => {
    savePrefs(prefs);
    pianoEngine.setVolume(prefs.volume);
  }, [prefs]);

  // 延音踏板：同步到音频引擎（关掉时把还在衰减的音快速收掉）
  useEffect(() => {
    sustainRef.current = sustain;
    pianoEngine.setSustain(sustain);
  }, [sustain]);

  const toggleSustain = useCallback(() => {
    setSustain((prev) => {
      const next = !prev;
      setPrefs(p => ({ ...p, sustain: next }));
      toast.success(next ? '延音已开启（踏板踩下）' : '延音已关闭');
      return next;
    });
  }, []);

  const keys = useMemo(() => getKeyConfig(prefs.mode), [prefs.mode]);
  // 固定音轨：每个发声的按键固定占一条轨道，按音高从低到高排列
  // 正常模式 9 条：1 2 3 4 5 6 7 高音1 高音2；滑键模式中立区不发声，8 条：1 2 3 4 5 6 7 高音1
  const lanes = useMemo<LaneInfo[]>(
    () => getLanes(prefs.mode).map(l => ({ ...l })),
    [prefs.mode],
  );
  const range = useMemo(() => getRangeDisplay(prefs.octaveOffset, prefs.mode), [prefs.octaveOffset, prefs.mode]);

  // 清理已完全滚出屏幕的音符
  useEffect(() => {
    const interval = setInterval(() => {
      setNotes(prev => prev.filter(n => {
        if (n.endTime === null) return true;
        return performance.now() - n.endTime < 4000;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 触发一个音符开始
   *
   * 每个按键固定对应一条音轨（lane = 按键索引），音符的横向位置永远不变：
   * 第一下按在哪儿，后续同音的条就出现在哪儿，不会因为按了别的键而漂到边上。
   */
  const startNote = useCallback((index: number, pointerId: number, weak: boolean = false) => {
    const key = keys[index];
    if (!key || key.pitch === null) return; // 中立区不发音

    const now = performance.now();
    const pitch = key.pitch;

    const noteId = `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${pointerId}`;
    pointerNoteMapRef.current.set(pointerId, { noteId, index, lane: index });

    const newNote: NoteBarData = {
      id: noteId,
      pitch,
      label: key.label,
      startTime: now,
      endTime: null,
      lane: index,
      color: getAmberColor(pitch),
      accidental: prefs.accidental,
    };

    setNotes(prev => [...prev, newNote]);
    setActiveKeyIndices(prev => new Set(prev).add(index));
    pianoEngine.noteOn(pitch, prefs.octaveOffset, prefs.accidental, weak ? 0.5 : 1);
  }, [keys, prefs.octaveOffset, prefs.accidental]);

  /**
   * 停止一个 pointer 对应的音（只停这一路）
   */
  const stopNote = useCallback((index: number, pointerId: number, source: 'release' | 'slide' = 'release') => {
    const tracking = pointerNoteMapRef.current.get(pointerId);
    if (!tracking) {
      // 没有跟踪记录也兜底停一下这个键的音（防御性）
      const key = keys[index];
      if (key?.pitch) pianoEngine.noteOff(key.pitch, 0.6);
      setActiveKeyIndices(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    const { noteId, index: trackedIndex } = tracking;
    const key = keys[trackedIndex];
    if (key?.pitch) {
      // 滑键模式换音要干净利落（短衰减）；踩了延音就拖长但一定会衰减到停
      const release = sustainRef.current
        ? 1.2
        : prefs.mode === 'slide' && source === 'slide'
          ? 0.08
          : 0.6;
      pianoEngine.noteOff(key.pitch, release);
    }

    const now = performance.now();
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, endTime: now } : n));
    setActiveKeyIndices(prev => {
      const next = new Set(prev);
      next.delete(trackedIndex);
      return next;
    });

    pointerNoteMapRef.current.delete(pointerId);
  }, [keys, prefs.mode]);

  const handleKeyDown = useCallback(
    (index: number, pointerId: number, source: 'press' | 'slide', weak = false) => {
      const key = keys[index];
      if (!key || key.pitch === null) return;
      // 滑键换档时给一点很轻的「咔哒」，强化档位感
      if (source === 'slide' && prefs.mode === 'slide' && !weak) pianoEngine.tick(0.04);
      startNote(index, pointerId, weak);
    },
    [keys, startNote, prefs.mode],
  );

  const handleKeyUp = useCallback(
    (index: number, pointerId: number, source: 'release' | 'slide') => {
      stopNote(index, pointerId, source);
    },
    [stopNote],
  );

  /**
   * 换八度时处理按住中的音：
   * 把正在按住的音符在当前时刻收尾，再在同一条音轨上开一段新的（split 标记），
   * 两段紧贴在一起、中间画一条细接缝，所以看得出一条被断成了两段。
   */
  const splitHeldNotes = useCallback((next: { octaveOffset: number; accidental: 0 | 1 | -1 }) => {
    const held = Array.from(pointerNoteMapRef.current.entries());
    if (held.length === 0) return;

    const now = performance.now();

    // 老段收尾
    setNotes(prev =>
      prev.map(n => (n.endTime === null ? { ...n, endTime: now, splitTail: true } : n)),
    );

    const segments: NoteBarData[] = [];
    held.forEach(([pointerId, rec]) => {
      const key = keys[rec.index];
      if (!key?.pitch) return;

      // 声音：停掉旧八度的音，按新八度重新发声，听感上不断
      pianoEngine.noteOff(key.pitch);
      pianoEngine.noteOn(key.pitch, next.octaveOffset, next.accidental);

      const noteId = `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${pointerId}`;
      pointerNoteMapRef.current.set(pointerId, { noteId, index: rec.index, lane: rec.index });

      segments.push({
        id: noteId,
        pitch: key.pitch,
        label: key.label,
        startTime: now,
        endTime: null,
        lane: rec.index,
        split: true,
        color: getAmberColor(key.pitch),
        accidental: next.accidental,
      });
    });

    if (segments.length > 0) setNotes(prev => [...prev, ...segments]);
  }, [keys]);

  // 八度切换
  /** 升号 / 降号：同一个键再按一次回到还原 */
  const toggleAccidental = useCallback((value: 1 | -1) => {
    const next = prefs.accidental === value ? 0 : value;
    // 记号只作用于「之后按下的音」：正在按住的音保持原音高继续响，
    // 不重启、不叠第二下 attack（否则按住 6 时点 ♯ 会听到一次多余的 ♯6）。
    setPrefs(p => ({ ...p, accidental: next }));
    toast.success(next === 1 ? '升记号（♯）' : next === -1 ? '降记号（♭）' : '还原');
  }, [prefs.accidental]);

  const octaveUp = useCallback(() => {
    const next = Math.min(2, prefs.octaveOffset + 1);
    if (next === prefs.octaveOffset) return;
    splitHeldNotes({ octaveOffset: next, accidental: prefs.accidental });
    setPrefs(p => ({ ...p, octaveOffset: next }));
    toast.success('音域升高一个八度');
  }, [prefs.octaveOffset, prefs.accidental, splitHeldNotes]);

  const octaveDown = useCallback(() => {
    const next = Math.max(-2, prefs.octaveOffset - 1);
    if (next === prefs.octaveOffset) return;
    splitHeldNotes({ octaveOffset: next, accidental: prefs.accidental });
    setPrefs(p => ({ ...p, octaveOffset: next }));
    toast.success('音域降低一个八度');
  }, [prefs.octaveOffset, prefs.accidental, splitHeldNotes]);

  // 模式切换
  const toggleMode = useCallback(() => {
    // 兜底停止所有正在发声的音
    pianoEngine.allNotesOff();
    setActiveKeyIndices(new Set());
    pointerNoteMapRef.current.clear();
    const now = performance.now();
    setNotes(prev => prev.map(n => n.endTime === null ? { ...n, endTime: now } : n));

    setPrefs(p => ({ ...p, mode: p.mode === 'normal' ? 'slide' : 'normal' }));
  }, []);

  // 清空瀑布流
  const clearStaff = useCallback(() => {
    pianoEngine.allNotesOff();
    setActiveKeyIndices(new Set());
    pointerNoteMapRef.current.clear();
    setNotes([]);
    toast.success('已清空乐谱');
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setPrefs(p => ({ ...p, volume: v }));
  }, []);

  // 演奏中（还有键被按住）：音域上下、模式切换、音量仍可用，清空禁用以免误触
  const isPlaying = activeKeyIndices.size > 0;

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: '#14110f' }}
    >
      {/* 顶部栏 */}
      <header
        className="sticky top-0 z-40 w-full border-b"
        style={{ background: 'rgba(20, 17, 15, 0.85)', borderColor: '#332c25', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between h-14 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="size-10 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#f1e7d9' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#221d19'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="菜单"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-base font-semibold tracking-wide" style={{ color: '#f1e7d9' }}>
            Music Box
          </h1>
          <button
            type="button"
            onClick={() => navigate('/license')}
            className="size-10 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#f1e7d9' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#221d19'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="开源协议"
          >
            <Info className="size-5" />
          </button>
        </div>
      </header>

      {/* 乐谱区 */}
      <div className="w-full px-3 sm:px-4 pt-3 pb-2">
        <div
          className="w-full h-[180px] sm:h-[220px] md:h-[260px] rounded-xl border overflow-hidden"
          style={{ borderColor: '#332c25' }}
        >
          <MusicStaff notes={notes} lanes={lanes} minBarHeight={prefs.mode === 'slide' ? 14 : 8} />
        </div>
      </div>

      {/* 音域 + 音量 显示区 */}
      <div className="w-full px-3 sm:px-4 py-2">
        <div className="flex items-center gap-3">
          {/* 音域显示框（方角） */}
          <div
            className="flex-shrink-0 px-3 py-2 border min-w-[90px] text-center"
            style={{ borderColor: '#e8a86a', background: '#1a1613' }}
          >
            <div className="text-sm font-semibold tabular-nums" style={{ color: '#f1e7d9' }}>
              {range.lowSolfège} – {range.highSolfège}
            </div>
            <div className="text-[10px] tabular-nums mt-0.5" style={{ color: '#9a8d7d' }}>
              {range.lowPitch} – {range.highPitch}
            </div>
          </div>

          {/* 音量显示框（方角） */}
          <div
            className="flex-shrink-0 px-3 py-2 border min-w-[64px] text-center"
            style={{ borderColor: '#e8a86a', background: '#1a1613' }}
          >
            <div className="text-sm font-semibold tabular-nums" style={{ color: '#f1e7d9' }}>
              {Math.round(prefs.volume)}%
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#9a8d7d' }}>音量</div>
          </div>

          {/* 音量旋钮 */}
          <div className="flex-shrink-0 pl-1">
            <VolumeKnob value={prefs.volume} onChange={handleVolumeChange} size={54} theme="dark" />
          </div>

          {/* 右侧留空 */}
          <div className="flex-1" />
        </div>
      </div>

      {/* 主体区：左工具栏 + 中按键组 + 右空栏 */}
      <div className="flex-1 w-full px-1 sm:px-4 pb-4 sm:pb-6 pt-2 flex items-start justify-center">
        <div className="flex gap-2 sm:gap-4 w-full max-w-[460px]">
          {/* 左侧工具栏 */}
          <div className="flex-shrink-0 flex flex-col gap-1 pt-1 self-stretch">
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); octaveUp(); }}
              className="w-11 flex-1 min-h-[32px] rounded-xl border flex items-center justify-center transition-colors shadow-sm"
              style={{ background: '#221d19', borderColor: '#332c25', color: '#f1e7d9' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2d2620'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#221d19'; }}
              onMouseDown={(e) => { e.currentTarget.style.background = '#3a3128'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = '#221d19'; }}
              aria-label="升高八度"
            >
              <ArrowUp className="size-5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); octaveDown(); }}
              className="w-11 flex-1 min-h-[32px] rounded-xl border flex items-center justify-center transition-colors shadow-sm"
              style={{ background: '#221d19', borderColor: '#332c25', color: '#f1e7d9' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2d2620'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#221d19'; }}
              onMouseDown={(e) => { e.currentTarget.style.background = '#3a3128'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = '#221d19'; }}
              aria-label="降低八度"
            >
              <ArrowDown className="size-5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); toggleMode(); }}
              className="w-11 flex-1 min-h-[32px] rounded-xl border flex flex-col items-center justify-center transition-colors shadow-sm"
              style={{ background: '#221d19', borderColor: '#332c25', color: '#f1e7d9' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2d2620'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#221d19'; }}
              onMouseDown={(e) => { e.currentTarget.style.background = '#3a3128'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = '#221d19'; }}
              aria-label="切换模式"
            >
              <span className="text-[11px] font-medium leading-tight">切换</span>
              <span className="text-[9px] leading-tight mt-0.5" style={{ color: '#e8a86a' }}>
                {prefs.mode === 'normal' ? '正常' : '滑键'}
              </span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); if (!isPlaying) clearStaff(); }}
              disabled={isPlaying}
              className="w-11 flex-1 min-h-[32px] rounded-xl border flex items-center justify-center transition-colors shadow-sm disabled:cursor-not-allowed"
              style={{
                background: isPlaying ? '#1a1613' : '#221d19',
                borderColor: '#332c25',
                color: isPlaying ? '#5a4f42' : '#f1e7d9',
                opacity: isPlaying ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!isPlaying) e.currentTarget.style.background = '#2d2620'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isPlaying ? '#1a1613' : '#221d19'; }}
              onMouseDown={(e) => { if (!isPlaying) e.currentTarget.style.background = '#3a3128'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = isPlaying ? '#1a1613' : '#221d19'; }}
              aria-label="清空"
            >
              <Trash2 className="size-4" />
            </button>

            {/* 升降记号：按一次生效，再按一次回到还原；演奏中按住琴键也能按 */}
            {([
              { value: 1 as const, glyph: '♯', label: '升记号', tip: '升' },
              { value: -1 as const, glyph: '♭', label: '降记号', tip: '降' },
            ]).map((btn) => {
              const active = prefs.accidental === btn.value;
              return (
                <button
                  key={btn.label}
                  type="button"
                  onPointerDown={(e) => { e.stopPropagation(); toggleAccidental(btn.value); }}
                  className="w-11 flex-1 min-h-[32px] rounded-xl border flex flex-col items-center justify-center transition-colors shadow-sm"
                  style={{
                    background: active ? '#3a2c1e' : '#221d19',
                    borderColor: active ? '#e8a86a' : '#332c25',
                    color: active ? '#f5c894' : '#9a8d7d',
                  }}
                  aria-label={btn.label}
                  aria-pressed={active}
                >
                  <span className="text-base leading-none">{btn.glyph}</span>
                  <span
                    className="text-[9px] leading-none mt-0.5"
                    style={{ color: active ? '#f5c894' : '#7d7266' }}
                  >
                    {btn.tip}
                  </span>
                </button>
              );
            })}

            {/* 延音踏板：踩下后松手的声音会自然衰减到停止 */}
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); toggleSustain(); }}
              className="w-11 flex-1 min-h-[32px] rounded-xl border flex flex-col items-center justify-center transition-colors shadow-sm"
              style={{
                background: sustain ? '#3a2c1e' : '#221d19',
                borderColor: sustain ? '#e8a86a' : '#332c25',
                color: sustain ? '#f5c894' : '#9a8d7d',
              }}
              aria-label="延音"
              aria-pressed={sustain}
            >
              <span className="text-[11px] font-medium leading-none">延音</span>
              <span
                className="text-[9px] leading-none mt-0.5"
                style={{ color: sustain ? '#f5c894' : '#7d7266' }}
              >
                {sustain ? '开' : '关'}
              </span>
            </button>
          </div>

          {/* 中间按键组 */}
          <div className="flex-1 flex items-start justify-center pt-1">
            <Keypad
              keys={keys}
              activeKeyIndices={activeKeyIndices}
              slideMode={prefs.mode === 'slide'}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
          </div>

          {/* 右侧空栏（保留位置） */}
          <div className="flex-shrink-0 w-0 sm:w-14" />
        </div>
      </div>

      {/* 抽屉 */}
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
