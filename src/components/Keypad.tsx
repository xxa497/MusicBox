import { useCallback, useRef, useEffect, memo } from 'react';
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
/** 鼠标不走触摸 identifier，用固定 id 区分 */
const MOUSE_ID = 100000;

function Keypad({
  keys,
  activeKeyIndices,
  slideMode = false,
  onKeyDown,
  onKeyUp,
}: KeypadProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  /** 停在过渡区超过这个时间就当作“想停下来”，切断当前音；只是划过则不断 */
  const TRANSITION_DWELL_MS = 220;
  /** 手指滑出键盘后给 120ms 宽限：边界抖动又滑回同一键时不中断、不拆成两段 */
  const LEAVE_GRACE_MS = 120;
  const leaveTimerRef = useRef<Map<number, number>>(new Map());
  const leaveKeyRef = useRef<Map<number, number>>(new Map());
  /** 每个 pointer 在过渡区里的驻留计时器 */
  const transitionTimerRef = useRef<Map<number, number>>(new Map());
  /** 每个 pointer 上一次的采样点与时间（用于预判速度和路径插值） */
  const lastPointRef = useRef<Map<number, { x: number; y: number; t: number }>>(new Map());
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

  const clearDwell = useCallback((pointerId: number) => {
    const timer = transitionTimerRef.current.get(pointerId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      transitionTimerRef.current.delete(pointerId);
    }
  }, []);

  const clearLeave = useCallback((pointerId: number) => {
    const timer = leaveTimerRef.current.get(pointerId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      leaveTimerRef.current.delete(pointerId);
    }
    leaveKeyRef.current.delete(pointerId);
  }, []);

  const releasePointer = useCallback((pointerId: number, source: 'release' | 'slide') => {
    clearDwell(pointerId);
    // 如果手指刚好在「滑出键盘」的宽限期内抬起，要把挂起的那个音收掉，
    // 否则它会一直响到下次再按同一个键
    const pendingKey = leaveKeyRef.current.get(pointerId);
    clearLeave(pointerId);
    lastPointRef.current.delete(pointerId);
    const idx = pointerKeyMapRef.current.get(pointerId);
    if (idx !== undefined && idx !== GAP) {
      onKeyUp?.(idx, pointerId, source);
    } else if (pendingKey !== undefined && pendingKey !== GAP && keys[pendingKey]?.pitch) {
      onKeyUp?.(pendingKey, pointerId, 'release');
    }
    pointerKeyMapRef.current.delete(pointerId);
  }, [onKeyUp, clearDwell, clearLeave, keys]);

  /** 开始按下一个指针（触摸用 identifier，鼠标用固定 id） */
  const beginAt = useCallback((clientX: number, clientY: number, pid: number) => {
    const idx = getKeyFromPoint(clientX, clientY);
    if (idx === null) {
      // 从键盘外的空白处按下：也登记这个手指（状态记为空档），
      // 这样之后滑进任意按键就能正常发声。落在按钮等控件上则不参与演奏。
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (el && el.closest('button, a, [role="button"], input, select, textarea')) return;
      clearLeave(pid);
      pointerKeyMapRef.current.set(pid, GAP);
      lastPointRef.current.set(pid, { x: clientX, y: clientY, t: performance.now() });
      return;
    }
    if (pointerKeyMapRef.current.has(pid)) releasePointer(pid, 'release');
    pointerKeyMapRef.current.set(pid, idx);
    lastPointRef.current.set(pid, { x: clientX, y: clientY, t: performance.now() });
    if (idx !== GAP) onKeyDown?.(idx, pid, 'press');
  }, [getKeyFromPoint, onKeyDown, releasePointer, clearLeave]);

  /**
   * 处理一个采样点。滑键模式下：
   *  - 缝隙与中立格是「过渡区」，不切断当前音；
   *  - 快速划动时按路径补齐经过的键，中间掠过的键发弱音，落点发正常音；
   *  - 静止在缝隙里但明显朝某个键移动时，提前一点触发，不用「划过去再划回来」。
   */
  const applyPoint = useCallback((x: number, y: number, pointerId: number, speed: number, weak: boolean) => {
    const idx = getKeyFromPoint(x, y);
    const prev = pointerKeyMapRef.current.get(pointerId);

    // 在滑键模式里，某键没有音高（中立格）等同于过渡区
    const isTransition = idx === GAP || (idx !== null && idx >= 0 && keys[idx]?.pitch === null);

    if (idx === null) {
      clearDwell(pointerId);
      // 离开整个键盘（空白处）：保留手指跟踪，并给 120ms 宽限再停音。
      // 手指只是在边界抖了一下又滑回同一个键时，音不断、也不会拆成两段。
      if (prev !== undefined && prev !== GAP && prev >= 0 && keys[prev]?.pitch) {
        leaveKeyRef.current.set(pointerId, prev);
        if (!leaveTimerRef.current.has(pointerId)) {
          const timer = window.setTimeout(() => {
            leaveTimerRef.current.delete(pointerId);
            const key = leaveKeyRef.current.get(pointerId);
            leaveKeyRef.current.delete(pointerId);
            if (key !== undefined && pointerKeyMapRef.current.get(pointerId) === GAP) {
              onKeyUp?.(key, pointerId, 'slide');
            }
          }, LEAVE_GRACE_MS);
          leaveTimerRef.current.set(pointerId, timer);
        }
      }
      pointerKeyMapRef.current.set(pointerId, GAP);
      return;
    }

    if (isTransition) {
      if (slideMode) {
        // 过渡区（缝隙 / 中间中立格）：
        // 只是划过 → 保持当前音不断；停下来驻留超过 220ms → 当作想收声，切断当前音
        if (prev !== undefined) pointerKeyMapRef.current.set(pointerId, prev);
        if (prev !== undefined && prev !== GAP && keys[prev]?.pitch && !transitionTimerRef.current.has(pointerId)) {
          const timer = window.setTimeout(() => {
            transitionTimerRef.current.delete(pointerId);
            const cur = pointerKeyMapRef.current.get(pointerId);
            if (cur !== undefined && cur !== GAP && keys[cur]?.pitch) {
              onKeyUp?.(cur, pointerId, 'release');
            }
            pointerKeyMapRef.current.set(pointerId, GAP);
          }, TRANSITION_DWELL_MS);
          transitionTimerRef.current.set(pointerId, timer);
        }
        return;
      }
      // 正常模式：缝隙即空档，直接停音
      if (prev !== undefined && prev !== GAP) onKeyUp?.(prev, pointerId, 'slide');
      pointerKeyMapRef.current.set(pointerId, GAP);
      return;
    }

    // 落在有音高的键上：取消过渡区的驻留计时
    clearDwell(pointerId);

    // 从空白处滑回来：宽限内回到同一个键，视为没有离开，继续这个音
    const pendingLeave = leaveKeyRef.current.get(pointerId);
    if (pendingLeave !== undefined) {
      clearLeave(pointerId);
      if (pendingLeave === idx) {
        pointerKeyMapRef.current.set(pointerId, idx);
        lastPointRef.current.set(pointerId, { x, y, t: performance.now() });
        return;
      }
      if (pendingLeave !== GAP && keys[pendingLeave]?.pitch) {
        onKeyUp?.(pendingLeave, pointerId, 'slide');
      }
    }

    if (prev === undefined) return;
    if (prev === idx) return;

    if (prev !== GAP && keys[prev]?.pitch) {
      onKeyUp?.(prev, pointerId, 'slide');
    }
    pointerKeyMapRef.current.set(pointerId, idx);
    onKeyDown?.(idx, pointerId, 'slide', weak);
  }, [getKeyFromPoint, keys, onKeyDown, onKeyUp, slideMode, clearDwell, clearLeave]);

  const moveTo = useCallback((clientX: number, clientY: number, pointerId: number) => {
    if (!pointerKeyMapRef.current.has(pointerId)) return;

    const now = performance.now();
    const last = lastPointRef.current.get(pointerId);

    const startX = last?.x ?? clientX;
    const startY = last?.y ?? clientY;
    const dt = last ? Math.max(1, now - last.t) : 16;
    const totalDx = clientX - startX;
    const totalDy = clientY - startY;
    const speed = Math.hypot(totalDx, totalDy) / dt * 1000; // px/s

    // 路径插值：把上一次点到这一次点之间按 5px 采样，补齐掠过的键
    // 但从键盘外（空白处）滑进来时不插值，只在落点判一次，避免第一下补音被当成两次判定
    const startedOutside = getKeyFromPoint(startX, startY) === null;
    const dist = Math.hypot(totalDx, totalDy);
    const steps = startedOutside ? 1 : Math.min(48, Math.max(1, Math.round(dist / 5)));
    const weakForPass = steps > 2;

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      applyPoint(startX + totalDx * t, startY + totalDy * t, pointerId, speed, weakForPass && i < steps);
    }

    // 预判：停在过渡区但明显朝某键快速移动时，提前判定落到该键上
    if (slideMode) {
      const cur = pointerKeyMapRef.current.get(pointerId);
      const idxNow = getKeyFromPoint(clientX, clientY);
      const inTransition = idxNow === GAP || idxNow === null;
      if (inTransition && speed > 320 && dt > 0) {
        const lead = 34; // 提前量（毫秒）
        const px = clientX + (totalDx / dt) * lead;
        const py = clientY + (totalDy / dt) * lead;
        const predicted = getKeyFromPoint(px, py);
        if (predicted !== null && predicted !== GAP && keys[predicted]?.pitch && predicted !== cur) {
          if (cur !== undefined && cur !== GAP && keys[cur]?.pitch) onKeyUp?.(cur, pointerId, 'slide');
          pointerKeyMapRef.current.set(pointerId, predicted);
          onKeyDown?.(predicted, pointerId, 'slide', false);
        }
      }
    }

    lastPointRef.current.set(pointerId, { x: clientX, y: clientY, t: now });
  }, [applyPoint, getKeyFromPoint, keys, onKeyDown, onKeyUp, slideMode]);

  // 触摸走 Touch Events（按 identifier 跟踪，Android / WebView 上多指最可靠）；
  // 鼠标走 Pointer Events。两套互不干扰，避免多指同时按下时被系统的指针分发掐掉。
  const moveRef = useRef(moveTo);
  moveRef.current = moveTo;
  const releaseRef = useRef(releasePointer);
  releaseRef.current = releasePointer;
  const beginRef = useRef(beginAt);
  beginRef.current = beginAt;

  /** 用当前仍在屏幕上的触点集合，清掉已经消失但没有收到 touchend 的手指（防卡音） */
  const pruneLost = useCallback((live: TouchList) => {
    const alive = new Set<number>();
    for (let i = 0; i < live.length; i += 1) alive.add(live[i].identifier);
    Array.from(pointerKeyMapRef.current.keys()).forEach((pid) => {
      if (!alive.has(pid)) releaseRef.current(pid, 'release');
    });
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (getKeyFromPoint(t.clientX, t.clientY) !== null) e.preventDefault();
        beginRef.current(t.clientX, t.clientY, t.identifier);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      let handled = false;
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (pointerKeyMapRef.current.has(t.identifier)) handled = true;
        moveRef.current(t.clientX, t.clientY, t.identifier);
      }
      if (handled) e.preventDefault();
      if (pointerKeyMapRef.current.size > 0) pruneLost(e.touches);
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        releaseRef.current(e.changedTouches[i].identifier, 'release');
      }
    };
    const onTouchCancel = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        releaseRef.current(e.changedTouches[i].identifier, 'release');
      }
    };

    // 只服务真正的鼠标：触摸（含部分 WebView 报空 pointerType 的情况）一律走 Touch Events，
    // 两套同时生效会让同一根手指产生两路跟踪、音符叠加
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      beginRef.current(e.clientX, e.clientY, MOUSE_ID);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      moveRef.current(e.clientX, e.clientY, MOUSE_ID);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      releaseRef.current(MOUSE_ID, 'release');
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchCancel);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [getKeyFromPoint]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 gap-6 sm:gap-7 touch-none select-none w-full max-w-[420px] mx-auto"
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
