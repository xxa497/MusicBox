import { useEffect, useRef, useCallback, memo } from 'react';

export interface NoteBarData {
  id: string;
  pitch: string;
  label: string;
  startTime: number;
  endTime: number | null;
  /** 所在音轨：等于按键索引（0-8），每条音轨固定对应一个按键 */
  lane: number;
  /** 换音域时断出的后半段：顶部改成平角并画接缝，与前半段区分 */
  split?: boolean;
  /** 换音域时被断开的上一段：底部改成平角，与后半段对齐，避免多出圆角尖角 */
  splitTail?: boolean;
  /** 升降记号：1 升号 ♯、-1 降号 ♭、0 还原 */
  accidental?: 0 | 1 | -1;
  /** 颜色 */
  color: string;
}

export interface LaneInfo {
  /** 对应的按键索引 */
  index: number;
  /** 音轨标签（简谱数字） */
  label: string;
  /** 是否为高音（标签上方画点） */
  dot?: boolean;
}

interface MusicStaffProps {
  notes: NoteBarData[];
  /** 音符条的最小可视高度（滑键模式下快速划出的音太短会看不见） */
  minBarHeight?: number;
  /** 固定音轨列表：每条音轨固定一个按键，顺序即从左到右的位置 */
  lanes: LaneInfo[];
  /** 瀑布流滚动速度 px/s */
  scrollSpeed?: number;
  /** 每毫秒对应多少像素的音符长度（按住时长→视觉长度） */
  pxPerMs?: number;
}

// 统一琥珀色系（深浅两档：长音亮、短音深，同一支色）
const AMBER_LIGHT = '#f5c894';
const AMBER_MAIN = '#e8a86a';
const AMBER_DEEP = '#c78a4d';

function MusicStaff({ notes, lanes, scrollSpeed = 120, pxPerMs = 0.12, minBarHeight = 8 }: MusicStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const labelH = 20;              // 底部标签占位高度
    const baselineY = h - labelH;   // 时间基准线（标签上方）
    const marginX = 6;
    const usableW = w - marginX * 2;
    const totalCols = Math.max(lanes.length, 1);
    const colW = usableW / totalCols;
    const barW = Math.max(10, Math.min(28, colW * 0.6));

    // 音轨分隔竖线（很淡，用来指示每条音轨的范围）
    ctx.strokeStyle = 'rgba(232, 168, 106, 0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < totalCols; i += 1) {
      const x = marginX + i * colW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, baselineY);
      ctx.stroke();
    }

    // 时间基准线
    ctx.strokeStyle = 'rgba(232, 168, 106, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(w, baselineY);
    ctx.stroke();

    // 顶部渐隐（深色主题：上暗下亮，顶部渐隐到深色背景）
    const fadeH = Math.min(h * 0.35, 100);
    const grad = ctx.createLinearGradient(0, 0, 0, fadeH);
    grad.addColorStop(0, 'rgba(20, 17, 15, 1)');
    grad.addColorStop(1, 'rgba(20, 17, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, fadeH);

    // 画音符条：每条音轨固定 x 位置，位置不会随按键顺序变化
    const lanePos = new Map<number, number>();
    lanes.forEach((l, i) => lanePos.set(l.index, i));

    for (const note of notes) {
      const pos = lanePos.get(note.lane);
      if (pos === undefined) continue;

      const now = performance.now();
      const holdDuration = note.endTime ? note.endTime - note.startTime : now - note.startTime;
      const barHeight = Math.max(minBarHeight, holdDuration * pxPerMs);

      let bottomY: number;
      if (note.endTime !== null) {
        const elapsed = (now - note.endTime) / 1000;
        bottomY = baselineY - elapsed * scrollSpeed;
      } else {
        bottomY = baselineY;
      }
      const topY = bottomY - barHeight;

      if (bottomY < 0) continue;

      const x = marginX + pos * colW + (colW - barW) / 2;
      const y = topY;
      const bw = barW;
      const bh = bottomY - topY;
      const r = Math.min(8, bw / 2, bh / 2);
      const rTop = note.split ? 0 : r;
      const rBottom = note.splitTail ? 0 : r;

      // 琥珀色渐变填充（亮→主→深，沿长度方向）
      const barGrad = ctx.createLinearGradient(x, y, x, y + bh);
      barGrad.addColorStop(0, AMBER_LIGHT);
      barGrad.addColorStop(0.4, AMBER_MAIN);
      barGrad.addColorStop(1, AMBER_DEEP);

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.moveTo(x + rTop, y);
      ctx.lineTo(x + bw - rTop, y);
      if (rTop > 0) ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
      ctx.lineTo(x + bw, y + bh - rBottom);
      if (rBottom > 0) ctx.quadraticCurveTo(x + bw, y + bh, x + bw - rBottom, y + bh);
      ctx.lineTo(x + rBottom, y + bh);
      if (rBottom > 0) ctx.quadraticCurveTo(x, y + bh, x, y + bh - rBottom);
      ctx.lineTo(x, y + rTop);
      if (rTop > 0) ctx.quadraticCurveTo(x, y, x + rTop, y);
      ctx.closePath();
      ctx.fill();

      // 升降记号：直接标在这条音符上，不另开音轨。
      // 用条子末端的深色圆点当徽标，条子再短也能看清，不会为了塞字把条子撑高。
      if (note.accidental === 1 || note.accidental === -1) {
        const glyph = note.accidental === 1 ? '♯' : '♭';
        const rBadge = Math.min(8, Math.max(6, bw / 2 - 1));
        const cx = x + bw / 2;
        const cy = Math.max(rBadge + 1, bottomY - rBadge - 2);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rBadge, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(43, 36, 29, 0.92)';
        ctx.fill();

        ctx.fillStyle = '#f5c894';
        if (note.accidental === 1) {
          // ♯ 手画：部分系统字体把 musical sharp 显示成 #，画出来更稳
          const h = rBadge * 1.5;
          const w = rBadge * 1.5;
          const x0 = cx - w / 2;
          const y0 = cy - h / 2;
          ctx.strokeStyle = '#f5c894';
          ctx.lineWidth = Math.max(1, rBadge * 0.22);
          ctx.beginPath();
          ctx.moveTo(x0 + w * 0.38, y0);
          ctx.lineTo(x0 + w * 0.22, y0 + h);
          ctx.moveTo(x0 + w * 0.72, y0);
          ctx.lineTo(x0 + w * 0.56, y0 + h);
          ctx.moveTo(x0, y0 + h * 0.38);
          ctx.lineTo(x0 + w, y0 + h * 0.28);
          ctx.moveTo(x0, y0 + h * 0.74);
          ctx.lineTo(x0 + w, y0 + h * 0.64);
          ctx.stroke();
        } else {
          ctx.font = `600 ${Math.round(rBadge * 1.55)}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(glyph, cx, cy + 0.5);
        }
        ctx.restore();
      }

      // 接缝：断成两段时的分界线，画在上一段的最后一像素上，两段仍然严丝合缝
      if (note.split) {
        ctx.fillStyle = 'rgba(20, 17, 15, 0.95)';
        ctx.fillRect(x, y - 1, bw, 1);
      }

      // 顶部高光（断出的后半段不画，否则接缝处会多出一条亮边）
      if (!note.split) {
        ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
        ctx.fillRect(x + 2, y + 2, bw - 4, 3);
      }
    }

    // 底部音轨标签
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lanes.forEach((lane, i) => {
      const cx = marginX + i * colW + colW / 2;
      const cy = baselineY + labelH / 2 + 1;
      ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(154, 141, 125, 0.9)';
      ctx.fillText(lane.label, cx, lane.dot ? cy + 3 : cy);

      // 高音点：画在数字正上方
      if (lane.dot) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(154, 141, 125, 0.9)';
        ctx.arc(cx, cy - 5, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [notes, lanes, scrollSpeed, pxPerMs, minBarHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const loop = (t: number) => {
      lastTimeRef.current = t;
      const rect = container.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [draw]);

  const isEmpty = notes.length === 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg"
      style={{ background: '#1a1613' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm" style={{ color: '#9a8d7d' }}>按下按键开始演奏</span>
        </div>
      )}
    </div>
  );
}

export default memo(MusicStaff);
export { AMBER_MAIN as AMBER_COLOR };

/** 获取统一琥珀色（深色主题下所有音符条同色系渐变） */
export function getAmberColor(_pitch: string): string {
  return AMBER_MAIN;
}
