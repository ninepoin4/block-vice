import { useEffect, useRef } from 'react';
import { CITY_BUILDINGS, CITY_HALF_SIZE } from '../game/cityGrid';
import { MISSIONS } from '../game/missionEngine';
import { HudSnapshot } from '../game/types';

interface TacticalMinimapProps {
  hud: HudSnapshot;
  onOpenMap: () => void;
  compact?: boolean;
}

export function TacticalMinimap({ hud, onOpenMap, compact = false }: TacticalMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / (CITY_HALF_SIZE * 2);
    const toPx = (x: number, z: number) => ({
      px: (x + CITY_HALF_SIZE) * scale,
      py: (z + CITY_HALF_SIZE) * scale,
    });

    // Dark slate road surface
    ctx.fillStyle = '#18202c';
    ctx.fillRect(0, 0, w, h);

    // Building footprints
    for (const b of CITY_BUILDINGS) {
      const p0 = toPx(b.minX, b.minZ);
      const bw = (b.maxX - b.minX) * scale;
      const bh = (b.maxZ - b.minZ) * scale;
      ctx.fillStyle = b.landmark ? '#334155' : '#263142';
      ctx.fillRect(p0.px, p0.py, bw, bh);
      if (b.landmark) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(p0.px, p0.py, bw, bh);
      }
    }

    // GPS Path
    if (hud.gpsPath.length >= 2) {
      ctx.strokeStyle = hud.activeStep ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hud.gpsPath.forEach((pt, idx) => {
        const { px, py } = toPx(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Fixer markers when no active mission
    if (!hud.activeMission) {
      for (const m of MISSIONS) {
        const { px, py } = toPx(m.fixerPos.x, m.fixerPos.z);
        ctx.fillStyle = m.category === 'HEIST' ? '#fbbf24' : m.category === 'ASSASSINATION' ? '#f43f5e' : '#34d399';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 4, py - 4, 8, 8);
      }
    }

    // Active Objective or Custom Waypoint
    const target = hud.activeStep?.targetPos ?? hud.customWaypoint;
    if (target) {
      const { px, py } = toPx(target.x, target.z);
      ctx.fillStyle = hud.activeStep ? '#fbbf24' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Vehicles
    for (const v of hud.minimapVehicles) {
      if (v.occupied) continue;
      const { px, py } = toPx(v.x, v.z);
      ctx.fillStyle = v.kind === 'police' ? '#3b82f6' : v.kind === 'cargo' ? '#10b981' : '#94a3b8';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // Enemies
    for (const e of hud.minimapEnemies) {
      const { px, py } = toPx(e.x, e.z);
      ctx.fillStyle = e.role === 'vip' ? '#ffffff' : '#ef4444';
      ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }

    // Player Arrow
    const p = toPx(hud.playerX, hud.playerZ);
    ctx.save();
    ctx.translate(p.px, p.py);
    ctx.rotate(-hud.playerAngle);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }, [hud]);

  return (
    <button
      type="button"
      onClick={onOpenMap}
      aria-label="打开城市战术地图"
      className={`group relative block bg-[#0e131b]/95 border-2 border-[#334155] hover:border-[#fbbf24] shadow-[4px_4px_0_#05080f] ${
        compact ? 'p-1' : 'p-1.5'
      } transition-colors cursor-pointer`}
    >
      <canvas
        ref={canvasRef}
        width={176}
        height={176}
        className={`block pixelated ${
          compact ? 'w-[88px] h-[88px] sm:w-[104px] sm:h-[104px]' : 'w-[176px] h-[176px]'
        }`}
      />
      <div
        className={`${
          compact ? 'mt-1 px-0.5 text-[10px]' : 'mt-1.5 px-1 text-[11px]'
        } flex items-center justify-between leading-none gap-1`}
      >
        <span
          className={`font-semibold text-[#cbd5e1] truncate ${
            compact ? 'max-w-[54px]' : 'max-w-[115px]'
          }`}
        >
          {hud.district.name}
        </span>
        <span className="font-mono-num text-[#fbbf24] shrink-0">
          {compact ? '地图' : '[M] 地图'}
        </span>
      </div>
    </button>
  );
}
