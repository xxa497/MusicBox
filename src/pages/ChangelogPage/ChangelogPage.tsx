import { ArrowLeft, Bug, Sparkles, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CHANGELOGS } from '@/data/changelog-page';
import { motion } from 'framer-motion';

const typeConfig: Record<string, { label: string; icon: typeof Bug }> = {
  fix: { label: '修复', icon: Bug },
  new: { label: '新增', icon: Sparkles },
  adjust: { label: '调整', icon: Settings2 },
};

export default function ChangelogPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full" style={{ background: '#14110f' }}>
      {/* 顶部栏 */}
      <header
        className="sticky top-0 z-40 w-full border-b"
        style={{ background: 'rgba(20, 17, 15, 0.85)', borderColor: '#332c25', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center h-14 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="size-10 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#f1e7d9' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#221d19'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="返回"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-base font-semibold ml-2" style={{ color: '#f1e7d9' }}>更新日志</h1>
        </div>
      </header>

      {/* 内容 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {MOCK_CHANGELOGS.map((entry, i) => {
          const cfg = typeConfig[entry.items[0]?.type] ?? typeConfig.adjust;
          return (
            <motion.article
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-5 shadow-sm border"
              style={{ background: '#1a1613', borderColor: '#332c25' }}
            >
              <header className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: '#f1e7d9' }}>{entry.version}</h2>
                {entry.date && (
                  <time className="text-xs tabular-nums" style={{ color: '#9a8d7d' }}>{entry.date}</time>
                )}
              </header>
              <ul className="space-y-3">
                {entry.items.map((item, idx) => {
                  const tcfg = typeConfig[item.type] ?? typeConfig.adjust;
                  const Icon = tcfg.icon;
                  return (
                    <li key={idx} className="flex gap-3 items-start">
                      <span
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium"
                        style={{
                          borderColor: '#332c25',
                          background: '#221d19',
                          color: '#e8a86a',
                        }}
                      >
                        <Icon className="size-3" />
                        {tcfg.label}
                      </span>
                      <p
                        className="text-sm leading-relaxed flex-1"
                        style={{ color: '#d9ccb6' }}
                      >
                        {item.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 pt-3 border-t" style={{ borderColor: '#2d2620' }}>
                <div className="text-[11px]" style={{ color: '#6a5d50' }}>
                  Music Box · {entry.version}
                </div>
              </div>
            </motion.article>
          );
        })}
      </main>
    </div>
  );
}
