import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu, Info, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppDrawer from '@/components/AppDrawer';
import MusicStaff, { NoteBarData, getAmberColor } from '@/components/MusicStaff';
import VolumeKnob from '@/components/VolumeKnob';
import Keypad from '@/components/Keypad';
import { pianoEngine } from '@/lib/audio-engine';
import { getKeyConfig, getRangeDisplay } from '@/lib/key-config';
import { loadPrefs, savePrefs, type IMusicBoxPrefs } from '@/lib/prefs';

export default function PlayPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefs, setPrefs] = useState<IMusicBoxPrefs>(() => loadPrefs());

  const [notes, setNotes] = useState<NoteBarData[]>([]);
  const [activeKeyIndices, setActiveKeyIndices] = useState<Set<number>>(new Set());

  // 每个 pointerId 对应的音符（按 pointer 独立跟踪，防止音泄漏）
  const pointerNoteMapRef = useRef<Map<number, { noteId: string; index: number; lane: number }>>(new Map());
  // 当前乐谱使用的列数：只在需要时增加，保证已有音符的横向位置不跳动
  const laneCountRef = useRef(1);
  const [laneCount, setLaneCount] = useState(1);

  // 保存偏好 + 同步音量
  useEffect(() => {
    savePrefs(prefs);
    pianoEngine.setVolume(prefs.volume);
  }, [prefs]);

  const keys = useMemo(() => getKeyConfig(prefs.mode), [prefs.mode]);
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
   * 分列规则：按「时间重叠」占列——当前仍按住（尚未松开）的音各自占一列，
   * 新音落在第一个空列上。这样：
   *  - 滑键模式两指同时按，会各占一列，不会再叠成一条
   *  - 长按一个键期间再按别的键，新音另起一列，不会叠在长条上
   */
  const startNote = useCallback((index: number, pointerId: number) => {
    const key = keys[index];
    if (!key || key.pitch === null) return; // 中立区不发音

    const now = performance.now();
    const pitch = key.pitch;

    // 已占用列（仍按住、尚未松开的音）
    const lanesInUse = new Set<number>();
    pointerNoteMapRef.current.forEach(v => lanesInUse.add(v.lane));

    let lane = 0;
    while (lanesInUse.has(lane)) lane += 1;

    // 列数只增不减：新音需要更多列时扩展，已有音位置保持
    const nextLaneCount = Math.max(laneCountRef.current, lane + 1);
    if (nextLaneCount !== laneCountRef.current) {
      laneCountRef.current = nextLaneCount;
      setLaneCount(nextLaneCount);
    }

    const noteId = `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${pointerId}`;
    pointerNoteMapRef.current.set(pointerId, { noteId, index, lane });

    const newNote: NoteBarData = {
      id: noteId,
      pitch,
      label: key.label,
      startTime: now,
      endTime: null,
      lane,
      color: getAmberColor(pitch),
    };

    setNotes(prev => [...prev, newNote]);
    setActiveKeyIndices(prev => new Set(prev).add(index));
    pianoEngine.noteOn(pitch, prefs.octaveOffset);
  }, [keys, prefs.octaveOffset]);

  /**
   * 停止一个 pointer 对应的音（只停这一路）
   */
  const stopNote = useCallback((index: number, pointerId: number) => {
    const tracking = pointerNoteMapRef.current.get(pointerId);
    if (!tracking) {
      // 没有跟踪记录也兜底停一下这个键的音（防御性）
      const key = keys[index];
      if (key?.pitch) pianoEngine.noteOff(key.pitch);
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
      pianoEngine.noteOff(key.pitch);
    }

    const now = performance.now();
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, endTime: now } : n));
    setActiveKeyIndices(prev => {
      const next = new Set(prev);
      next.delete(trackedIndex);
      return next;
    });

    pointerNoteMapRef.current.delete(pointerId);
  }, [keys]);

  const handleKeyDown = useCallback((index: number, pointerId: number, _source: 'press' | 'slide') => {
    const key = keys[index];
    if (!key || key.pitch === null) return;
    startNote(index, pointerId);
  }, [keys, startNote]);

  const handleKeyUp = useCallback((index: number, pointerId: number, _source: 'release' | 'slide') => {
    stopNote(index, pointerId);
  }, [stopNote]);

  // 八度切换
  const octaveUp = useCallback(() => {
    setPrefs(p => ({ ...p, octaveOffset: Math.min(2, p.octaveOffset + 1) }));
    toast.success('音域升高一个八度');
  }, []);

  const octaveDown = useCallback(() => {
    setPrefs(p => ({ ...p, octaveOffset: Math.max(-2, p.octaveOffset - 1) }));
    toast.success('音域降低一个八度');
  }, []);

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
    laneCountRef.current = 1;
    setLaneCount(1);
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
          <MusicStaff notes={notes} laneCount={laneCount} />
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
      <div className="flex-1 w-full px-2 sm:px-4 pb-4 sm:pb-6 pt-2 flex items-start justify-center">
        <div className="flex gap-3 sm:gap-5 w-full max-w-[420px]">
          {/* 左侧工具栏 */}
          <div className="flex-shrink-0 flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={octaveUp}
              className="size-11 rounded-xl border flex items-center justify-center transition-colors shadow-sm"
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
              onClick={octaveDown}
              className="size-11 rounded-xl border flex items-center justify-center transition-colors shadow-sm"
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
              onClick={toggleMode}
              className="size-11 rounded-xl border flex flex-col items-center justify-center transition-colors shadow-sm"
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
              onClick={clearStaff}
              disabled={isPlaying}
              className="size-11 rounded-xl border flex items-center justify-center transition-colors shadow-sm disabled:cursor-not-allowed"
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
          </div>

          {/* 中间按键组 */}
          <div className="flex-1 flex items-start justify-center pt-1">
            <Keypad
              keys={keys}
              activeKeyIndices={activeKeyIndices}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
          </div>

          {/* 右侧空栏（保留位置） */}
          <div className="flex-shrink-0 w-11 sm:w-14" />
        </div>
      </div>

      {/* 抽屉 */}
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
