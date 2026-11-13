import { Award, RotateCcw } from 'lucide-react';
import { RewardBreakdown } from '../game/types';

interface SettlementModalProps {
  mode: 'settlement' | 'failed';
  reward: RewardBreakdown | null;
  failReason: string;
  currentCash: number;
  rankTitle: string;
  onContinue: () => void;
  onRetry: () => void;
}

export function SettlementModal({
  mode,
  reward,
  failReason,
  currentCash,
  rankTitle,
  onContinue,
  onRetry,
}: SettlementModalProps) {
  if (mode === 'failed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090508]/88 p-4 pointer-events-auto">
        <div className="w-full max-w-md bg-[#110c10] border-2 border-[#ef4444] shadow-[8px_8px_0_#040203] p-6 text-center">
          <div className="font-display text-3xl font-bold tracking-wider text-[#ef4444] mb-1">
            WASTED · 行动失败
          </div>
          <p className="text-sm text-[#cbd5e1] mb-6">{failReason}</p>

          <div className="bg-[#1b1216] border border-[#3f1d24] p-4 mb-6 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">急救住院费用</span>
              <span className="font-mono-num text-[#f87171]">-$350</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">剩余资金</span>
              <span className="font-mono-num text-white">${currentCash.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={onRetry}
            className="w-full px-5 py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>出院重整 · 返回都市</span>
          </button>
        </div>
      </div>
    );
  }

  if (!reward) return null;

  const gradeColor =
    reward.rankGrade === 'S'
      ? 'text-[#fbbf24] border-[#fbbf24]'
      : reward.rankGrade === 'A'
        ? 'text-[#34d399] border-[#34d399]'
        : 'text-[#38bdf8] border-[#38bdf8]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06090f]/88 p-3 sm:p-4 pointer-events-auto">
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#0e131b] border-2 border-[#fbbf24] shadow-[8px_8px_0_#04060a] p-4 sm:p-6">
        <div className="flex items-start justify-between border-b border-[#1e293b] pb-4 mb-5">
          <div>
            <div className="text-xs font-semibold text-[#fbbf24] tracking-wider mb-1">
              MISSION PASSED · 任务完成结算
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {reward.missionTitle}
            </h2>
            <div className="text-xs text-[#94a3b8] mt-1">
              耗时 {reward.elapsedSec}s · 当前头衔：{rankTitle}
            </div>
          </div>

          <div
            className={`w-14 h-14 border-2 flex flex-col items-center justify-center bg-[#151c28] ${gradeColor}`}
          >
            <span className="text-[10px] text-[#94a3b8] leading-none">评级</span>
            <span className="font-display text-3xl font-bold leading-tight">
              {reward.rankGrade}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 text-sm mb-5">
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span>合约基础报酬</span>
            <span className="font-mono-num text-white">+${reward.basePayout.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span>极速执行奖金</span>
            <span className="font-mono-num text-[#34d399]">+${reward.timeBonus.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span>低通缉潜行奖金</span>
            <span className="font-mono-num text-[#34d399]">+${reward.stealthBonus.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span>战术压制奖金</span>
            <span className="font-mono-num text-[#38bdf8]">+${reward.combatBonus.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[#cbd5e1]">
            <span>战损医疗扣除</span>
            <span className="font-mono-num text-[#f87171]">-${reward.medicalDeduction.toLocaleString()}</span>
          </div>

          <div className="border-t border-[#263244] pt-3 mt-3 flex items-center justify-between">
            <span className="font-bold text-white">净结算入账</span>
            <span className="font-mono-num text-2xl font-bold text-[#fbbf24]">
              +${reward.totalPayout.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span>声望经验提升</span>
            <span className="font-mono-num text-[#38bdf8] font-bold">+{reward.repEarned} REP</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span>最新账户余额</span>
            <span className="font-mono-num text-white font-bold">${currentCash.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onContinue}
          className="w-full px-5 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>领取赏金 · 返回都市</span>
        </button>
      </div>
    </div>
  );
}
