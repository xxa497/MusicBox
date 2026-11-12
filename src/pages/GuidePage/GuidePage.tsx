import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_GUIDE_SECTIONS } from '@/data/guide-page';
import { motion } from 'framer-motion';

export default function GuidePage() {
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
          <h1 className="text-base font-semibold ml-2" style={{ color: '#f1e7d9' }}>使用说明</h1>
        </div>
      </header>

      {/* 内容 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {MOCK_GUIDE_SECTIONS.map((section, i) => (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl p-5 shadow-sm border"
            style={{ background: '#1a1613', borderColor: '#332c25' }}
          >
            <h2 className="text-base font-semibold mb-2" style={{ color: '#f1e7d9' }}>{section.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#d9ccb6' }}>{section.content}</p>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-xs pt-2 pb-6"
          style={{ color: '#6a5d50' }}
        >
          Music Box v1.0.0 · 音色：大钢琴
        </motion.div>
      </main>
    </div>
  );
}
