import { memo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { BookOpen, ScrollText, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AppDrawer({ open, onOpenChange }: AppDrawerProps) {
  const navigate = useNavigate();

  const handleGuide = () => {
    onOpenChange(false);
    navigate('/guide');
  };

  const handleChangelog = () => {
    onOpenChange(false);
    navigate('/changelog');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] sm:w-[320px] backdrop-blur-md border-r p-0 flex flex-col"
        style={{ background: '#1a1613', borderColor: '#332c25' }}
      >
        <SheetHeader
          className="p-6 border-b"
          style={{ borderColor: '#332c25' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f5c894, #e8a86a)', color: '#2b241d' }}
            >
              <Music className="size-5" />
            </div>
            <div>
              <SheetTitle style={{ color: '#f1e7d9' }} className="text-lg font-semibold">
                Music Box
              </SheetTitle>
              <SheetDescription style={{ color: '#9a8d7d' }} className="text-xs mt-0.5">
                v2.2.2
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 px-3 py-4 space-y-1">
          <button
            type="button"
            onClick={handleGuide}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left"
            style={{ color: '#f1e7d9' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#221d19'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <BookOpen className="size-5" style={{ color: '#e8a86a' }} />
            <span className="text-sm font-medium">使用说明</span>
          </button>
          <button
            type="button"
            onClick={handleChangelog}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left"
            style={{ color: '#f1e7d9' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#221d19'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ScrollText className="size-5" style={{ color: '#e8a86a' }} />
            <span className="text-sm font-medium">更新日志</span>
          </button>

          <div className="pt-4 px-4">
            <p className="text-xs" style={{ color: '#6a5d50' }}>更多入口将在后续版本加入</p>
          </div>
        </div>

        <div className="p-6 border-t" style={{ borderColor: '#332c25' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9a8d7d' }}>
            <Music className="size-3.5" />
            <span>音色：大钢琴</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default memo(AppDrawer);
