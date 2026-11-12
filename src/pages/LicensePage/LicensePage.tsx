import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LICENSE_META, LICENSE_SECTIONS } from '@/data/license-page';
import { motion } from 'framer-motion';

export default function LicensePage() {
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
          <h1 className="text-base font-semibold ml-2" style={{ color: '#f1e7d9' }}>开源协议</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 协议概览 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl p-5 border"
          style={{ background: '#1a1613', borderColor: '#332c25' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="size-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f5c894, #e8a86a)', color: '#2b241d' }}
            >
              <Scale className="size-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold" style={{ color: '#f1e7d9' }}>
                {LICENSE_META.name}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#9a8d7d' }}>
                {LICENSE_META.short} · {LICENSE_META.type}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-4" style={{ color: '#d9ccb6' }}>
            本项目源码公开在 GitHub，使用、修改与分发均遵循 MPL-2.0：
            <br />
            <span style={{ color: '#e8a86a', wordBreak: 'break-all' }}>{LICENSE_META.repo}</span>
          </p>
          <p className="text-xs leading-relaxed mt-2" style={{ color: '#9a8d7d' }}>
            完整协议原文：
            <span style={{ color: '#e8a86a', wordBreak: 'break-all' }}>{LICENSE_META.licenseFile}</span>
          </p>
        </motion.section>

        {/* 要点 */}
        {LICENSE_SECTIONS.map((section, i) => (
          <motion.article
            key={section.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: (i + 1) * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl p-5 border"
            style={{ background: '#1a1613', borderColor: '#332c25' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#f1e7d9' }}>
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.paragraphs.map((p, idx) => (
                <p key={idx} className="text-sm leading-relaxed" style={{ color: '#d9ccb6' }}>
                  {p}
                </p>
              ))}
            </div>
          </motion.article>
        ))}

        <div className="text-[11px] text-center pt-2 pb-4" style={{ color: '#6a5d50' }}>
          Music Box · MPL-2.0 · 要点说明以 LICENSE 原文为准
        </div>
      </main>
    </div>
  );
}
