import { useEffect, useRef, useCallback, memo } from 'react';

export interface NoteBarData {
  id: string;
  pitch: string;
  label: string;
  startTime: number;
  endTime: number | null;
  /** 批次内列索引，0 起 */
  columnIndex: number;
  /** 同批总数，用于分列 */
  totalInBatch: number;
  /** 颜色 */
  color: string;
}

interface MusicStaffProps {
  notes: NoteBarData[];
  /** 瀑布流滚动速度 px/s */
  scrollSpeed?: number;
  /** 每毫秒对应多少像素的音符长度（按住时长→视觉长度） */
  pxPerMs?: number;
}

// 统一琥珀色系（深浅两档：长音亮、短音深，同一支色）
const AMBER_LIGHT = '#f5c894';
const AMBER_MAIN = '#e8a86a';
const AMBER_DEEP = '#c78a4d';

function MusicStaff({ notes, scrollSpeed = 120, pxPerMs = 0.12 }: MusicStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    const baselineY = h - 2; // 基准线在底部

    // 画基准线
    ctx.strokeStyle = 'rgba(232, 168, 106, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(w, baselineY);
    ctx.stroke();

    // 画顶部渐隐（深色主题：上暗下亮，顶部渐隐到深色背景）
    const fadeH = Math.min(h * 0.35, 100);
    const grad = ctx.createLinearGradient(0, 0, 0, fadeH);
    grad.addColorStop(0, 'rgba(20, 17, 15, 1)');
    grad.addColorStop(1, 'rgba(20, 17, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, fadeH);

    // 画音符条
    for (const note of notes) {
      const now = performance.now();
      const holdDuration = note.endTime ? note.endTime - note.startTime : now - note.startTime;
      const barHeight = Math.max(8, holdDuration * pxPerMs);

      let bottomY: number;
      if (note.endTime !== null) {
        const elapsed = (now - note.endTime) / 1000;
        bottomY = baselineY - elapsed * scrollSpeed;
      } else {
        bottomY = baselineY;
      }
      const topY = bottomY - barHeight;

      if (bottomY < 0) continue;

      // 分列计算 x 坐标与宽度
      const totalCols = note.totalInBatch;
      const marginX = 40;
      const usableW = w - marginX * 2;
      const colW = usableW / Math.max(totalCols, 1);
      const barW = Math.min(40, colW * 0.75);
      const colX = marginX + note.columnIndex * colW + (colW - barW) / 2;

      const x = colX;
      const y = topY;
      const bw = barW;
      const bh = bottomY - topY;
      const r = Math.min(8, bw / 2, bh / 2);

      // 琥珀色渐变填充（亮→主→深，沿长度方向）
      const barGrad = ctx.createLinearGradient(x, y, x, y + bh);
      barGrad.addColorStop(0, AMBER_LIGHT);
      barGrad.addColorStop(0.4, AMBER_MAIN);
      barGrad.addColorStop(1, AMBER_DEEP);

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + bw - r, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
      ctx.lineTo(x + bw, y + bh - r);
      ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
      ctx.lineTo(x + r, y + bh);
      ctx.quadraticCurveTo(x, y + bh, x, y + bh - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // 顶部高光
      ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
      ctx.fillRect(x + 2, y + 2, bw - 4, 3);
    }
  }, [notes, scrollSpeed, pxPerMs]);

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
