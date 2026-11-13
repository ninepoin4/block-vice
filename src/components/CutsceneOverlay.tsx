import { useEffect } from 'react';
import { FastForward, MapPin } from 'lucide-react';
import { CutsceneStateSnapshot } from '../game/types';

interface CutsceneOverlayProps {
  cutscene: CutsceneStateSnapshot;
  onSkip: () => void;
}

const CATEGORY_BADGE: Record<CutsceneStateSnapshot['category'], { label: string; color: string }> = {
  intro: { label: '开场实机导览', color: '#38bdf8' },
  mission_start: { label: '任务开始 · 行动简报', color: '#fbbf24' },
  mid_mission: { label: '剧情强制过场', color: '#f43f5e' },
  mission_complete: { label: '任务完成 · 撤离结算', color: '#34d399' },
};

export function CutsceneOverlay({ cutscene, onSkip }: CutsceneOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const badge = CATEGORY_BADGE[cutscene.category] ?? CATEGORY_BADGE.intro;
  const skipLabel =
    cutscene.category === 'intro'
      ? '跳过实机动画 · 立即开战 [Space]'
      : cutscene.category === 'mission_complete'
        ? '跳过动画 · 立即结算 [Space]'
        : '跳过过场动画 [Space]';

  return (
    <div
      data-testid="cutscene-overlay"
      className="fixed inset-0 z-30 flex flex-col justify-between pointer-events-none"
    >
      {/* Top Cinema Letterbox Bar */}
      <div className="bg-[#05080f]/95 border-b border-[#1e293b] px-3 sm:px-6 md:px-10 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide text-[#05080f] shrink-0"
            style={{ backgroundColor: badge.color }}
          >
            {badge.label}
          </span>
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fbbf24] shrink-0 hidden sm:block" />
          <span className="font-display text-xs sm:text-base font-bold text-white truncate">
            {cutscene.title || cutscene.locationTag}
          </span>
          <span className="text-[#475569] shrink-0 hidden md:inline">·</span>
          <span className="font-mono-num text-[11px] text-[#94a3b8] shrink-0 hidden sm:inline">
            镜头 {cutscene.shotIndex + 1}/{cutscene.totalShots} · {cutscene.locationTag}
          </span>
        </div>

        <button
          type="button"
          data-skip-cutscene="true"
          onClick={onSkip}
          className="px-3 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span className="sm:hidden">跳过</span>
          <span className="hidden sm:inline">{skipLabel}</span>
        </button>
      </div>

      {/* Middle 80% 3D Voxel City remains 100% unobstructed */}
      <div className="flex-1" />

      {/* Bottom Cinema Letterbox Bar with Live Speaker & Subtitle */}
      <div className="bg-[#05080f]/95 border-t border-[#1e293b] px-3 sm:px-6 md:px-10 py-3 sm:py-4 pointer-events-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="font-mono-num text-[11px] sm:text-xs font-bold text-[#38bdf8] truncate">
              {cutscene.speaker}
            </span>
            <span className="font-mono-num text-[11px] text-[#94a3b8] shrink-0">
              {cutscene.shotIndex + 1}/{cutscene.totalShots} · {cutscene.progressPct}%
            </span>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-[#f1f5f9] leading-relaxed mb-2.5 sm:mb-3">
            {cutscene.subtitle}
          </p>
          <div className="h-1 bg-[#1e293b] overflow-hidden">
            <div
              className="h-full bg-[#fbbf24] transition-all duration-150"
              style={{ width: `${cutscene.progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
