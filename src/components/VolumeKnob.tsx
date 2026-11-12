import { useRef, useState, useCallback, useEffect, memo } from 'react';

interface VolumeKnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  size?: number;
  /** 主题：light 浅黄 / dark 深色暖调 */
  theme?: 'light' | 'dark';
}

/**
 * 圆形音量旋钮
 * - 拖动旋转：在旋钮上按下并上下/圆周拖动
 * - 滚轮调节
 * - 上下方向键调节（聚焦时）
 * 角度范围：约 -135° 到 135°，对应 0-100
 */
function VolumeKnob({ value, onChange, size = 56, theme = 'dark' }: VolumeKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; value: number }>({ y: 0, value: 0 });

  const angle = -135 + (value / 100) * 270; // -135° ~ 135°

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { y: e.clientY, value };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dy = dragStartRef.current.y - e.clientY;
    // 每 200px 拖动 = 100% 音量
    const delta = (dy / 200) * 100;
    const next = Math.max(0, Math.min(100, dragStartRef.current.value + delta));
    onChange(Math.round(next));
  }, [isDragging, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    onChange(Math.max(0, Math.min(100, value + delta)));
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.max(0, Math.min(100, value + 2)));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(0, Math.min(100, value - 2)));
    }
  }, [value, onChange]);

  // 防止页面滚动
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  // 深色主题色值
  const dark = theme === 'dark';
  const outerBg = dark ? '#221d19' : '';
  const innerBg = dark ? '#2d2620' : '';
  const borderColor = dark ? '#332c25' : '';
  const pointerColor = dark ? '#e8a86a' : '';
  const centerColor = dark ? '#e8a86a' : '';
  const ringColor = dark ? '#e8a86a' : '';

  return (
    <div
      ref={knobRef}
      role="slider"
      aria-label="音量"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      className="relative cursor-grab active:cursor-grabbing select-none outline-none focus-visible:ring-2 rounded-full"
      style={{
        width: size,
        height: size,
        ...(dark ? { '--tw-ring-color': ringColor } as React.CSSProperties : {}),
      }}
    >
      {/* 外圈刻度背景 */}
      <div
        className={dark ? 'absolute inset-0 rounded-full shadow-sm' : 'absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/60 shadow-sm'}
        style={dark ? { background: outerBg, border: `1px solid ${borderColor}` } : {}}
      />
      {/* 内圈旋钮盘 */}
      <div
        className={dark
          ? 'absolute rounded-full shadow-inner'
          : 'absolute inset-1.5 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 shadow-inner'
        }
        style={{
          top: size * 0.1,
          left: size * 0.1,
          right: size * 0.1,
          bottom: size * 0.1,
          transform: `rotate(${angle}deg)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          ...(dark ? {
            background: `linear-gradient(135deg, #352a21, #1f1814)`,
            border: `1px solid ${borderColor}`,
          } : {}),
        }}
      >
        {/* 指针 */}
        <div
          className={dark
            ? 'absolute left-1/2 -translate-x-1/2 rounded-full'
            : 'absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-amber-600 rounded-full'
          }
          style={dark ? {
            top: '6%',
            width: 2,
            height: '28%',
            background: pointerColor,
          } : {}}
        />
      </div>
      {/* 中心圆点 */}
      <div
        className={dark
          ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full'
          : 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-700/60'
        }
        style={dark ? {
          width: size * 0.14,
          height: size * 0.14,
          background: `radial-gradient(circle at 30% 30%, #f5c894, #c78a4d)`,
        } : {}}
      />
    </div>
  );
}

export default memo(VolumeKnob);
