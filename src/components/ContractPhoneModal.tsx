import { CheckCircle2, PhoneCall, ShieldAlert, X } from 'lucide-react';
import { MISSIONS } from '../game/missionEngine';
import { getStoryLedgerStatus } from '../game/storyData';
import { HudSnapshot } from '../game/types';

interface ContractPhoneModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onAcceptMission: (missionId: string) => void;
  onAbandonMission: () => void;
}

export function ContractPhoneModal({
  hud,
  onClose,
  onAcceptMission,
  onAbandonMission,
}: ContractPhoneModalProps) {
  const ledger = getStoryLedgerStatus(hud.completedMissionIds);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a10]/85 p-2.5 sm:p-4 pointer-events-auto">
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-[#0e131b] border-2 border-[#334155] shadow-[8px_8px_0_#04060a] p-3.5 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 sm:pb-3 mb-3 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <PhoneCall className="w-5 h-5 text-[#38bdf8] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-tight truncate">
                暗网合约终端 · Fixer Dispatch
              </h2>
              <div className="text-[11px] sm:text-xs text-[#fbbf24] mt-0.5 truncate">{ledger.summaryText}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭任务终端"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-[#e2e8f0] border border-[#475569] cursor-pointer whitespace-nowrap shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">关闭 [Tab]</span>
            <span className="sm:hidden">关闭</span>
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
          {MISSIONS.map((m) => {
            const isActive = hud.activeMission?.id === m.id;
            const isCompleted = hud.completedMissionIds.includes(m.id);
            const categoryLabel =
              m.category === 'HEIST'
                ? '抢劫行动'
                : m.category === 'ASSASSINATION'
                  ? '定点清除'
                  : '极速押运';

            return (
              <div
                key={m.id}
                className={`p-3 border transition-colors ${
                  isActive
                    ? 'bg-[#172030] border-[#fbbf24]'
                    : 'bg-[#131924] border-[#263244] hover:border-[#475569]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#94a3b8] mb-1">
                      <span className="font-mono-num text-[#fbbf24] font-bold">{m.code}</span>
                      <span>·</span>
                      <span>{categoryLabel}</span>
                      <span>·</span>
                      <span>联络人：{m.fixerName}</span>
                      <span>·</span>
                      <span>限时 {m.timeLimitSec}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-white">{m.title}</h3>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#34d399]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          已完成
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#cbd5e1] mt-1 leading-relaxed max-w-xl">
                      {m.briefing}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-[#94a3b8]">基础报酬</div>
                      <div className="font-mono-num text-lg font-bold text-[#34d399]">
                        ${m.baseReward.toLocaleString()}
                      </div>
                    </div>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAbandonMission();
                          onClose();
                        }}
                        className="px-4 py-2 bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>中止当前任务</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onAcceptMission(m.id);
                          onClose();
                        }}
                        className="px-4 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        {isCompleted ? '重玩此合约' : '接取任务'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
