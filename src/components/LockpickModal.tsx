import { useCallback, useEffect, useRef, useState } from 'react';
import { LockKeyhole, Unlock } from 'lucide-react';
import { soundEngine } from '../game/soundEngine';

interface LockpickModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PIN_ZONES = [
  { start: 34, end: 56 },
  { start: 58, end: 78 },
  { start: 22, end: 42 },
];

export function LockpickModal({ onSuccess, onCancel }: LockpickModalProps) {
  const [pinIndex, setPinIndex] = useState(0);
  const [cursorPct, setCursorPct] = useState(10);
  const [feedback, setFeedback] = useState<string>('校准激光指针进入金色锁孔区间，按 [Space] 或点击锁定');
  const dirRef = useRef(1);
  const pctRef = useRef(10);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 95 + pinIndex * 22;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pctRef.current += dirRef.current * speed * dt;
      if (pctRef.current >= 96) {
        pctRef.current = 96;
        dirRef.current = -1;
      } else if (pctRef.current <= 4) {
        pctRef.current = 4;
        dirRef.current = 1;
      }
      setCursorPct(pctRef.current);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pinIndex]);

  const attemptPin = useCallback(() => {
    const zone = PIN_ZONES[pinIndex];
    const current = pctRef.current;
    if (current >= zone.start - 2 && current <= zone.end + 2) {
      soundEngine.playLockPin();
      if (pinIndex + 1 >= PIN_ZONES.length) {
        setFeedback('全部锁芯解除！金库大门开启！');
        onSuccess();
      } else {
        setPinIndex((p) => p + 1);
        setFeedback(`第 ${pinIndex + 1} 颗弹子锁定成功，继续下一颗！`);
      }
    } else {
      soundEngine.playLockFail();
      setFeedback('偏移目标区间！重新对准金色高亮段');
    }
  }, [pinIndex, onSuccess]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        attemptPin();
      } else if (e.code === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attemptPin, onCancel]);

  const zone = PIN_ZONES[pinIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a10]/85 p-4 pointer-events-auto">
      <div className="w-full max-w-md bg-[#0e131b] border-2 border-[#38bdf8] shadow-[8px_8px_0_#04060a] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <LockKeyhole className="w-5 h-5 text-[#38bdf8]" />
            <h2 className="font-display text-lg font-bold text-white">
              金库机械密码锁破解
            </h2>
          </div>
          <span className="font-mono-num text-xs font-bold text-[#fbbf24]">
            弹子 {pinIndex + 1} / {PIN_ZONES.length}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {PIN_ZONES.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2.5 border ${
                idx < pinIndex
                  ? 'bg-[#34d399] border-[#10b981]'
                  : idx === pinIndex
                    ? 'bg-[#1e293b] border-[#fbbf24]'
                    : 'bg-[#111827] border-[#334155]'
              }`}
            />
          ))}
        </div>

        {/* Timing Bar */}
        <div className="relative h-10 bg-[#151c28] border-2 border-[#334155] mb-3 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-[#fbbf24]/30 border-x-2 border-[#fbbf24]"
            style={{
              left: `${zone.start}%`,
              width: `${zone.end - zone.start}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-[#38bdf8]"
            style={{ left: `calc(${cursorPct}% - 3px)` }}
          />
        </div>

        <p className="text-xs text-[#cbd5e1] mb-5">{feedback}</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={attemptPin}
            className="flex-1 px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>锁定弹子 [Space]</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#e2e8f0] border border-[#475569] text-xs font-semibold cursor-pointer"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
