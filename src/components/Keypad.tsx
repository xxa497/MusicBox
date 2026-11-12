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

/** -1 表示手指在网格内但落在按键缝隙上（不发声，但仍保持跟踪） */
const GAP = -1;

function Keypad({
  keys,
  activeKeyIndices,
  onKeyDown,
  onKeyUp,
}: KeypadProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // 每个 pointer 当前所在按键索引（GAP 表示在缝隙里）
  const pointerKeyMapRef = useRef<Map<number, number>>(new Map());

  /**
   * 命中测试：只有真正落在键上才发声。
   * 按键之间的缝隙是「空档」——返回 GAP，既不发声、也不吸附到最近的键，
   * 手指需要在空档里停一下再移到目标键，避免划奏时撞到旁边的键。
   */
  const getKeyFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    const grid = gridRef.current;
    if (!grid) return null;

    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const keyEl = el?.closest('[data-key-index]') as HTMLElement | null;
    if (keyEl && grid.contains(keyEl)) {
      const attr = keyEl.getAttribute('data-key-index');
      if (attr !== null) {
        const parseIdx = parseInt(attr, 10);
        // 中立区（滑键模式正中）同样视为空档
        if (parseIdx >= 0) return parseIdx;
      }
    }

    const gridRect = grid.getBoundingClientRect();
    if (
      clientX < gridRect.left ||
      clientX > gridRect.right ||
      clientY < gridRect.top ||
      clientY > gridRect.bottom
    ) {
      return null;
    }
    // 在网格内但没命中键：空档
    return GAP;
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
    if (idx !== GAP) onKeyDown?.(idx, e.pointerId, 'press');
  }, [getKeyFromPoint, onKeyDown]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 只处理正在按下的 pointer
    if (!pointerKeyMapRef.current.has(e.pointerId)) return;

    const idx = getKeyFromPoint(e.clientX, e.clientY);
    const prev = pointerKeyMapRef.current.get(e.pointerId) ?? GAP;
    const next = idx === null ? GAP : idx;

    if (next === prev) return; // 没换键

    const pid = e.pointerId;

    // 离开旧键（旧标记是缝隙时无需停音）
    if (prev !== GAP) {
      onKeyUp?.(prev, pid, 'slide');
    }

    // 始终保留跟踪，滑出缝隙 / 移出网格后仍能重新进入按键
    pointerKeyMapRef.current.set(pid, next);
    if (next !== GAP) {
      onKeyDown?.(next, pid, 'slide');
    }
  }, [getKeyFromPoint, onKeyDown, onKeyUp]);

  const releasePointer = useCallback((pointerId: number, source: 'release' | 'slide') => {
    const idx = pointerKeyMapRef.current.get(pointerId);
    if (idx !== undefined && idx !== GAP) {
      onKeyUp?.(idx, pointerId, source);
    }
    pointerKeyMapRef.current.delete(pointerId);
  }, [onKeyUp]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(e.pointerId, 'release');
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
  }, [releasePointer]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(e.pointerId, 'release');
  }, [releasePointer]);

  const handleLostPointerCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(e.pointerId, 'release');
  }, [releasePointer]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 gap-5 sm:gap-6 touch-none select-none w-full max-w-[344px] mx-auto"
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
            <span className="relative inline-flex items-center justify-center leading-none">
              <span className="leading-none">{k.label}</span>
              {/* 高音点：绝对定位在数字正上方，数字本身仍与其它键对齐 */}
              {k.dot && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-0.64em',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0.13em',
                    height: '0.13em',
                    minWidth: 4,
                    minHeight: 4,
                    borderRadius: '50%',
                    background: '#2b241d',
                  }}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(Keypad);
