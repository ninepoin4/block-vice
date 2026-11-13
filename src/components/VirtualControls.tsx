import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Car,
  Crosshair,
  Hand,
  Zap,
} from 'lucide-react';
import { HudSnapshot, VirtualInputState } from '../game/types';

interface VirtualControlsProps {
  hud: HudSnapshot;
  compact: boolean;
  onInputChange: (patch: Partial<VirtualInputState>) => void;
  onAction: (action: 'interact' | 'vehicle') => void;
}

export function VirtualControls({
  hud,
  compact,
  onInputChange,
  onAction,
}: VirtualControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [firing, setFiring] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [steerLeft, setSteerLeft] = useState(false);
  const [steerRight, setSteerRight] = useState(false);
  const [gas, setGas] = useState(false);
  const [brake, setBrake] = useState(false);

  // Sync driving buttons cleanly whenever vehicle mode switches or unmounts
  useEffect(() => {
    onInputChange({
      steer: (steerLeft ? 1 : 0) - (steerRight ? 1 : 0),
      throttle: (gas ? 1 : 0) - (brake ? 1 : 0),
    });
  }, [steerLeft, steerRight, gas, brake, onInputChange]);

  useEffect(() => {
    setKnob({ x: 0, y: 0 });
    joyPointerIdRef.current = null;
    setFiring(false);
    setSprinting(false);
    setSteerLeft(false);
    setSteerRight(false);
    setGas(false);
    setBrake(false);
    onInputChange({
      moveX: 0,
      moveZ: 0,
      throttle: 0,
      steer: 0,
      sprint: false,
      firing: false,
    });
  }, [hud.inVehicle, onInputChange]);

  const maxRadius = compact ? 36 : 42;

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxRadius, dist);
    const nx = dist > 0.01 ? (dx / dist) * (clamped / maxRadius) : 0;
    const ny = dist > 0.01 ? (dy / dist) * (clamped / maxRadius) : 0;

    setKnob({
      x: dist > 0.01 ? (dx / dist) * clamped : 0,
      y: dist > 0.01 ? (dy / dist) * clamped : 0,
    });
    onInputChange({ moveX: nx, moveZ: ny });
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onInputChange({ moveX: 0, moveZ: 0 });
  };

  const canInteractE =
    hud.nearbyPrompt &&
    (hud.nearbyPrompt.actionType === 'ACCEPT_MISSION' ||
      hud.nearbyPrompt.actionType === 'CRACK_SAFE' ||
      hud.nearbyPrompt.actionType === 'PICKUP' ||
      hud.nearbyPrompt.actionType === 'HACK');

  const canVehicleF =
    hud.inVehicle ||
    hud.nearbyPrompt?.actionType === 'ENTER_VEHICLE' ||
    hud.nearbyPrompt?.actionType === 'EXIT_VEHICLE';

  return (
    <div
      data-testid="virtual-controls"
      className="fixed inset-x-0 bottom-0 z-25 pointer-events-none flex items-end justify-between px-3 pb-3 sm:px-5 sm:pb-5"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {/* Left Thumb Zone: Analog Joystick (On-Foot) OR Steering Pad (Driving) */}
      <div className="pointer-events-auto touch-none select-none">
        {hud.inVehicle ? (
          <div
            data-testid="virtual-drive-steer"
            className="flex items-center gap-2.5"
          >
            <button
              type="button"
              aria-label="左转"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setSteerLeft(true);
              }}
              onPointerUp={() => setSteerLeft(false)}
              onPointerCancel={() => setSteerLeft(false)}
              className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex flex-col items-center justify-center shadow-[3px_3px_0_#05080f] cursor-pointer ${
                steerLeft
                  ? 'bg-[#38bdf8] border-white text-[#05080f]'
                  : 'bg-[#0e131b]/88 border-[#475569] text-[#e2e8f0]'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="text-[10px] font-bold">左转</span>
            </button>
            <button
              type="button"
              aria-label="右转"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setSteerRight(true);
              }}
              onPointerUp={() => setSteerRight(false)}
              onPointerCancel={() => setSteerRight(false)}
              className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex flex-col items-center justify-center shadow-[3px_3px_0_#05080f] cursor-pointer ${
                steerRight
                  ? 'bg-[#38bdf8] border-white text-[#05080f]'
                  : 'bg-[#0e131b]/88 border-[#475569] text-[#e2e8f0]'
              }`}
            >
              <ArrowRight className="w-6 h-6" />
              <span className="text-[10px] font-bold">右转</span>
            </button>
          </div>
        ) : (
          <div
            ref={padRef}
            data-testid="virtual-joystick"
            onPointerDown={(e) => {
              e.stopPropagation();
              joyPointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateJoystick(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (joyPointerIdRef.current !== e.pointerId) return;
              updateJoystick(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (joyPointerIdRef.current !== e.pointerId) return;
              resetJoystick();
            }}
            onPointerCancel={(e) => {
              if (joyPointerIdRef.current !== e.pointerId) return;
              resetJoystick();
            }}
            className={`relative ${
              compact ? 'w-26 h-26' : 'w-30 h-30'
            } bg-[#0e131b]/80 border-2 border-[#475569] shadow-[4px_4px_0_#05080f] flex items-center justify-center`}
          >
            {/* Crosshair Grid Guides */}
            <div className="absolute inset-x-3 top-1/2 h-px bg-[#334155]" />
            <div className="absolute inset-y-3 left-1/2 w-px bg-[#334155]" />
            <span className="absolute top-1 text-[9px] font-mono-num text-[#64748b]">W</span>
            <span className="absolute bottom-1 text-[9px] font-mono-num text-[#64748b]">S</span>
            <span className="absolute left-1.5 text-[9px] font-mono-num text-[#64748b]">A</span>
            <span className="absolute right-1.5 text-[9px] font-mono-num text-[#64748b]">D</span>

            {/* Draggable Voxel Thumb Knob */}
            <div
              className="w-10 h-10 bg-[#fbbf24] border-2 border-[#0f172a] shadow-[2px_2px_0_#05080f] pointer-events-none"
              style={{
                transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Right Thumb Zone: Combat / Interaction / Pedals */}
      <div
        data-testid="virtual-actions"
        className="pointer-events-auto touch-none select-none flex flex-col items-end gap-2"
      >
        {/* Secondary Context Row: Interact [E] + Vehicle [F] + Sprint/Nitro */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-virtual-btn="interact"
            onPointerDown={(e) => {
              e.stopPropagation();
              onAction('interact');
            }}
            className={`px-3 h-11 border-2 flex items-center gap-1.5 text-xs font-bold shadow-[3px_3px_0_#05080f] cursor-pointer ${
              canInteractE
                ? 'bg-[#fbbf24] border-white text-[#0f172a] animate-pulse'
                : 'bg-[#0e131b]/82 border-[#334155] text-[#94a3b8]'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{canInteractE ? '交互 E' : 'E'}</span>
          </button>

          <button
            type="button"
            data-virtual-btn="vehicle"
            onPointerDown={(e) => {
              e.stopPropagation();
              onAction('vehicle');
            }}
            className={`px-3 h-11 border-2 flex items-center gap-1.5 text-xs font-bold shadow-[3px_3px_0_#05080f] cursor-pointer ${
              canVehicleF
                ? 'bg-[#38bdf8] border-white text-[#05080f]'
                : 'bg-[#0e131b]/82 border-[#334155] text-[#94a3b8]'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>{hud.inVehicle ? '下车 F' : canVehicleF ? '上车 F' : 'F'}</span>
          </button>

          <button
            type="button"
            data-virtual-btn="sprint"
            aria-label={hud.inVehicle ? '氮气加速' : '冲刺'}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setSprinting(true);
              onInputChange({ sprint: true });
            }}
            onPointerUp={() => {
              setSprinting(false);
              onInputChange({ sprint: false });
            }}
            onPointerCancel={() => {
              setSprinting(false);
              onInputChange({ sprint: false });
            }}
            className={`w-11 h-11 border-2 flex flex-col items-center justify-center shadow-[3px_3px_0_#05080f] cursor-pointer ${
              sprinting
                ? 'bg-[#fbbf24] border-white text-[#05080f]'
                : 'bg-[#0e131b]/88 border-[#475569] text-[#cbd5e1]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[9px] font-bold">{hud.inVehicle ? '氮气' : '冲刺'}</span>
          </button>
        </div>

        {/* Primary Thumb Action Row */}
        {hud.inVehicle ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-virtual-btn="brake"
              aria-label="刹车倒车"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setBrake(true);
              }}
              onPointerUp={() => setBrake(false)}
              onPointerCancel={() => setBrake(false)}
              className={`w-14 h-14 sm:w-16 sm:h-16 border-2 flex flex-col items-center justify-center shadow-[3px_3px_0_#05080f] cursor-pointer ${
                brake
                  ? 'bg-[#ef4444] border-white text-white'
                  : 'bg-[#1b1216]/90 border-[#7f1d1d] text-[#fca5a5]'
              }`}
            >
              <ArrowDown className="w-5 h-5" />
              <span className="text-[10px] font-bold">刹车/倒</span>
            </button>
            <button
              type="button"
              data-virtual-btn="gas"
              aria-label="油门加速"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setGas(true);
              }}
              onPointerUp={() => setGas(false)}
              onPointerCancel={() => setGas(false)}
              className={`w-16 h-16 sm:w-18 sm:h-18 border-2 flex flex-col items-center justify-center shadow-[3px_3px_0_#05080f] cursor-pointer ${
                gas
                  ? 'bg-[#34d399] border-white text-[#05080f]'
                  : 'bg-[#0e131b]/90 border-[#34d399] text-[#34d399]'
              }`}
            >
              <ArrowUp className="w-6 h-6" />
              <span className="text-xs font-bold">油门</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-virtual-btn="fire"
            aria-label="开火射击"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setFiring(true);
              onInputChange({ firing: true });
            }}
            onPointerUp={() => {
              setFiring(false);
              onInputChange({ firing: false });
            }}
            onPointerCancel={() => {
              setFiring(false);
              onInputChange({ firing: false });
            }}
            className={`w-18 h-18 sm:w-20 sm:h-20 border-2 flex flex-col items-center justify-center shadow-[4px_4px_0_#05080f] cursor-pointer ${
              firing
                ? 'bg-[#ef4444] border-white text-white scale-95'
                : 'bg-[#7f1d1d]/92 border-[#ef4444] text-white'
            }`}
          >
            <Crosshair className="w-7 h-7" />
            <span className="text-xs font-bold mt-0.5">开火</span>
          </button>
        )}
      </div>
    </div>
  );
}
