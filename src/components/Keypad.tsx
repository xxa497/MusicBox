import { useCallback, useRef, memo } from 'react';
import { KeyConfig } from '@/lib/key-config';

interface KeypadProps {
  keys: KeyConfig[];
  activeKeyIndices: Set<number>;
  /** 按下或滑动进入某键时触发（source 区分来源） */
  onKeyDown?: (index: number, pointerId: number, source: 'press' | 'slide') => void;
  /** 松开或滑动离开某键时触发 */
  onKeyUp?: (index: number, pointerId: number, source: 'release' | 'slide') => void;
}

function Keypad({
  keys,
  activeKeyIndices,
  onKeyDown,
  onKeyUp,
}: KeypadProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // 每个 pointer 当前所在按键索引
  const pointerKeyMapRef = useRef<Map<number, number>>(new Map());

  const getKeyFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const keyEl = el.closest('[data-key-index]') as HTMLElement | null;
    if (!keyEl || !grid.contains(keyEl)) return null;
    const idx = keyEl.getAttribute('data-key-index');
    return idx !== null ? parseInt(idx, 10) : null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const idx = getKeyFromPoint(e.clientX, e.clientY);
    if (idx === null) return;

    e.preventDefault();
    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }

    pointerKeyMapRef.current.set(e.pointerId, idx);
    onKeyDown?.(idx, e.pointerId, 'press');
  }, [getKeyFromPoint, onKeyDown]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 只处理正在按下的 pointer
    if (!pointerKeyMapRef.current.has(e.pointerId)) return;

    const idx = getKeyFromPoint(e.clientX, e.clientY);
    const prev = pointerKeyMapRef.current.get(e.pointerId) ?? null;

    if (idx === prev) return; // 没换键

    const pid = e.pointerId;

    // 离开旧键
    if (prev !== null) {
      onKeyUp?.(prev, pid, 'slide');
    }

    if (idx !== null) {
      // 进入新键
      pointerKeyMapRef.current.set(pid, idx);
      onKeyDown?.(idx, pid, 'slide');
    } else {
      // 移出网格
      pointerKeyMapRef.current.delete(pid);
    }
  }, [getKeyFromPoint, onKeyDown, onKeyUp]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pid = e.pointerId;
    const idx = pointerKeyMapRef.current.get(pid);
    if (idx !== undefined) {
      onKeyUp?.(idx, pid, 'release');
      pointerKeyMapRef.current.delete(pid);
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(pid);
    } catch { /* ignore */ }
  }, [onKeyUp]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pid = e.pointerId;
    const idx = pointerKeyMapRef.current.get(pid);
    if (idx !== undefined) {
      onKeyUp?.(idx, pid, 'release');
      pointerKeyMapRef.current.delete(pid);
    }
  }, [onKeyUp]);

  const handleLostPointerCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pid = e.pointerId;
    const idx = pointerKeyMapRef.current.get(pid);
    if (idx !== undefined) {
      onKeyUp?.(idx, pid, 'release');
      pointerKeyMapRef.current.delete(pid);
    }
  }, [onKeyUp]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 gap-2 sm:gap-2.5 touch-none select-none w-full max-w-[320px] mx-auto"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      {keys.map((k) => {
        const isActive = activeKeyIndices.has(k.index);
        const isNeutral = k.pitch === null;
        return (
          <button
            key={k.index}
            data-key-index={k.index}
            type="button"
            aria-label={k.pitch ?? '中立区'}
            disabled={isNeutral}
            className={[
              'aspect-square rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-medium transition-all duration-75',
              'border shadow-sm pointer-events-auto',
              isNeutral
                ? 'bg-[#1a1613] border-[#332c25] text-[#5a4f42] cursor-default'
                : isActive
                ? 'bg-[#e8a86a] border-[#f5c894] text-[#2b241d] shadow-inner scale-[0.97]'
                : 'bg-gradient-to-b from-[#f7efe2] to-[#e9dcc7] border-[#d9ccb6] text-[#2b241d] active:scale-[0.97]',
            ].join(' ')}
            style={{ touchAction: 'none' }}
          >
            <span className="leading-none">{k.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(Keypad);
