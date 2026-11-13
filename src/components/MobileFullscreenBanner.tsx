import { Maximize2, Smartphone, X } from 'lucide-react';

interface MobileFullscreenBannerProps {
  fullscreenError: string | null;
  onEnterFullscreen: () => void;
  onDismiss: () => void;
}

export function MobileFullscreenBanner({
  fullscreenError,
  onEnterFullscreen,
  onDismiss,
}: MobileFullscreenBannerProps) {
  return (
    <div
      data-testid="mobile-fullscreen-prompt"
      className="fixed inset-x-3 top-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 bg-[#0e131b]/96 border-2 border-[#38bdf8] shadow-[6px_6px_0_#04060a] p-3 pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 bg-[#152235] border border-[#38bdf8] flex items-center justify-center text-[#38bdf8]">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-xs sm:text-sm font-bold text-white leading-tight">
              检测到移动屏幕 · 建议启动全屏体验
            </div>
            <p className="text-[11px] text-[#cbd5e1] mt-0.5 leading-snug">
              {fullscreenError || '开启全屏可隐藏系统地址栏并完整释放虚拟摇杆与动作键位。'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭全屏提示"
          className="w-7 h-7 shrink-0 flex items-center justify-center bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[#94a3b8] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[11px] font-semibold text-[#cbd5e1] cursor-pointer"
        >
          暂不全屏
        </button>
        <button
          type="button"
          data-enter-fullscreen="true"
          onClick={onEnterFullscreen}
          className="px-3.5 py-1.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#05080f] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>立即全屏</span>
        </button>
      </div>
    </div>
  );
}
