import { useEffect } from 'react';
import { Maximize2, Play } from 'lucide-react';

interface TitleOverlayProps {
  isMobile: boolean;
  isFullscreen: boolean;
  onRequestFullscreen: () => void;
  onStartStory: () => void;
  onQuickPlay: () => void;
}

export function TitleOverlay({
  isMobile,
  isFullscreen,
  onRequestFullscreen,
  onStartStory,
  onQuickPlay,
}: TitleOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartStory();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartStory]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-8 md:p-12 bg-gradient-to-r from-[#090d14]/90 via-[#090d14]/55 to-transparent pointer-events-auto overflow-y-auto">
      <div />

      <div className="max-w-xl my-auto py-4">
        {/* Bespoke SVG Title Emblem */}
        <svg
          viewBox="0 0 420 96"
          className="w-full max-w-[290px] sm:max-w-[380px] mb-3 sm:mb-4 drop-shadow-[4px_4px_0_#05080f]"
          aria-label="Block Vice 像素罪恶都市"
        >
          <rect x="2" y="8" width="12" height="80" fill="#fbbf24" />
          <rect x="18" y="8" width="6" height="80" fill="#38bdf8" />
          <text
            x="38"
            y="50"
            fill="#f8fafc"
            fontSize="40"
            fontWeight="700"
            fontFamily="Chakra Petch, sans-serif"
            letterSpacing="3"
          >
            BLOCK VICE
          </text>
          <text
            x="40"
            y="80"
            fill="#fbbf24"
            fontSize="20"
            fontWeight="700"
            fontFamily="Noto Sans SC, sans-serif"
            letterSpacing="2"
          >
            灰烬账本 · 像素罪恶都市
          </text>
        </svg>

        <p className="text-xs sm:text-sm md:text-base text-[#cbd5e1] leading-relaxed mb-5 sm:mb-7 max-w-md">
          三年前被黑曜石议会嫁祸流亡的「零号」重返自由港城。观看 6 幕序章动画与实机导览，横跨 64 街区、接取五大合约夺回《灰烬账本》。
        </p>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartStory}
            className="px-5 py-3 sm:px-7 sm:py-3.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-sm sm:text-base tracking-wide shadow-[4px_4px_0_#05080f] inline-flex items-center gap-2 cursor-pointer transition-transform active:translate-y-0.5 whitespace-nowrap"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>进入都市 · 序章开局</span>
          </button>

          <button
            type="button"
            onClick={onQuickPlay}
            className="px-4 py-3 sm:px-5 sm:py-3.5 bg-[#151c28]/95 hover:bg-[#1e293b] text-[#cbd5e1] border-2 border-[#334155] font-semibold text-xs sm:text-sm shadow-[4px_4px_0_#05080f] cursor-pointer whitespace-nowrap"
          >
            跳过动画直接行动
          </button>

          {isMobile && !isFullscreen && (
            <button
              type="button"
              onClick={onRequestFullscreen}
              className="px-4 py-3 bg-[#0e1b2e]/95 hover:bg-[#172a45] text-[#38bdf8] border-2 border-[#38bdf8] font-bold text-xs sm:text-sm shadow-[4px_4px_0_#05080f] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Maximize2 className="w-4 h-4" />
              <span>启动全屏模式</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] sm:text-xs text-[#cbd5e1] font-mono-num tracking-wide pt-2">
        {isMobile
          ? '手机触控模式已激活 · 左侧虚拟摇杆移动/转向 · 右侧射击/加速/交互/上下车 · 支持全屏沉浸浏览'
          : 'WASD 移动与驾驶 · F 上下车 · 左键 / Space 射击 · E 交互 · Tab 暗网终端 · M 城市地图 · Esc 暂停'}
      </div>
    </div>
  );
}
