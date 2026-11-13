import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { CITY_BUILDINGS, CITY_HALF_SIZE, DISTRICTS, resolveCircleAABB, STREET_CENTERS } from '../game/cityGrid';
import { MISSIONS } from '../game/missionEngine';
import { HudSnapshot, MissionDefinition, Vec2 } from '../game/types';

interface FullCityMapModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSetWaypoint: (pos: Vec2 | null) => void;
  onAcceptMission: (missionId: string) => void;
}

export function FullCityMapModal({
  hud,
  onClose,
  onSetWaypoint,
  onAcceptMission,
}: FullCityMapModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionDefinition>(
    hud.activeMission ?? MISSIONS[0]
  );

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

    ctx.fillStyle = '#141c27';
    ctx.fillRect(0, 0, w, h);

    // Quadrant district subtle tint
    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillStyle = 'rgba(251, 113, 133, 0.05)';
    ctx.fillRect(w / 2, 0, w / 2, h / 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
    ctx.fillRect(0, h / 2, w / 2, h / 2);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.05)';
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);

    // Street grid lines (9x9 avenues across 272m x 272m city)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.14)';
    ctx.lineWidth = 1;
    for (const s of STREET_CENTERS) {
      const p = toPx(s, s);
      ctx.beginPath();
      ctx.moveTo(0, p.py);
      ctx.lineTo(w, p.py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.px, 0);
      ctx.lineTo(p.px, h);
      ctx.stroke();
    }

    // Buildings & landmark labels
    for (const b of CITY_BUILDINGS) {
      const p0 = toPx(b.minX, b.minZ);
      const bw = (b.maxX - b.minX) * scale;
      const bh = (b.maxZ - b.minZ) * scale;
      ctx.fillStyle = b.landmark ? '#334155' : '#242f3f';
      ctx.fillRect(p0.px, p0.py, bw, bh);
      ctx.strokeStyle = b.landmark ? '#94a3b8' : '#1e293b';
      ctx.lineWidth = b.landmark ? 1.5 : 1;
      ctx.strokeRect(p0.px, p0.py, bw, bh);

      if (b.label) {
        ctx.font = 'bold 8.5px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(b.label).width + 5;
        const lx = p0.px + bw / 2;
        const ly = p0.py + bh / 2;
        ctx.fillStyle = 'rgba(10, 15, 24, 0.88)';
        ctx.fillRect(lx - tw / 2, ly - 6, tw, 12);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(b.label, lx, ly + 3);
      }
    }

    // GPS Path
    if (hud.gpsPath.length >= 2) {
      ctx.strokeStyle = hud.activeStep ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      hud.gpsPath.forEach((pt, idx) => {
        const { px, py } = toPx(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Mission Fixer Pins
    for (const m of MISSIONS) {
      const { px, py } = toPx(m.fixerPos.x, m.fixerPos.z);
      const isSelected = selectedMission.id === m.id;
      const color = m.category === 'HEIST' ? '#fbbf24' : m.category === 'ASSASSINATION' ? '#f43f5e' : '#34d399';
      ctx.fillStyle = color;
      ctx.fillRect(px - 9, py - 9, 18, 18);
      ctx.strokeStyle = isSelected ? '#ffffff' : '#0f172a';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(px - 9, py - 9, 18, 18);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.code.replace('OP-', ''), px, py + 4);
    }

    // Active Target
    if (hud.activeStep) {
      const { px, py } = toPx(hud.activeStep.targetPos.x, hud.activeStep.targetPos.z);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Custom Waypoint
    if (hud.customWaypoint) {
      const { px, py } = toPx(hud.customWaypoint.x, hud.customWaypoint.z);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player marker
    const p = toPx(hud.playerX, hud.playerZ);
    ctx.save();
    ctx.translate(p.px, p.py);
    ctx.rotate(-hud.playerAngle);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }, [hud, selectedMission]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nz = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const wx = nx * CITY_HALF_SIZE;
    const wz = nz * CITY_HALF_SIZE;

    // Check if user clicked near a mission fixer pin
    for (const m of MISSIONS) {
      if (Math.hypot(m.fixerPos.x - wx, m.fixerPos.z - wz) < 7) {
        setSelectedMission(m);
        return;
      }
    }

    const safePos = resolveCircleAABB(wx, wz, 1.0, CITY_BUILDINGS);
    onSetWaypoint(safePos);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a10]/85 p-2.5 sm:p-4 pointer-events-auto">
      <div className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto bg-[#0e131b] border-2 border-[#334155] shadow-[8px_8px_0_#04060a] p-3.5 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5 sm:pb-3 mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-[#fbbf24] shrink-0" />
            <h2 className="font-display text-base sm:text-xl font-bold tracking-wide text-[#f8fafc] truncate">
              城市战术地图与 GPS 导航
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭城市地图"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-[#e2e8f0] border border-[#475569] whitespace-nowrap cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">关闭 [M]</span>
            <span className="sm:hidden">关闭</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 sm:gap-6 items-start">
          <div>
            <canvas
              ref={canvasRef}
              width={440}
              height={440}
              onClick={handleCanvasClick}
              className="w-full max-w-[340px] sm:max-w-[440px] mx-auto block aspect-square border-2 border-[#334155] pixelated cursor-crosshair"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] sm:text-xs text-[#94a3b8]">
              <span>点击地图任意街道设定自定义蓝标 GPS 路线</span>
              {hud.customWaypoint && (
                <button
                  type="button"
                  onClick={() => onSetWaypoint(null)}
                  className="text-[#38bdf8] hover:underline cursor-pointer shrink-0 ml-2"
                >
                  清除导航点
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.values(DISTRICTS).map((d) => (
                <div key={d.id} className="bg-[#151c28] border border-[#243042] px-3 py-2">
                  <div className="font-semibold text-[#f1f5f9]">{d.name}</div>
                  <div className="text-[#94a3b8] text-[11px]">{d.nameEn}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#151c28] border border-[#2c3a4f] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-num text-xs text-[#fbbf24]">
                  {selectedMission.code} · {selectedMission.fixerName}
                </span>
                <span className="font-mono-num text-sm font-bold text-[#34d399]">
                  ${selectedMission.baseReward.toLocaleString()}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                {selectedMission.title}
              </h3>
              <p className="text-xs leading-relaxed text-[#cbd5e1] mb-4">
                {selectedMission.briefing}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAcceptMission(selectedMission.id);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-xs tracking-wide cursor-pointer whitespace-nowrap"
                >
                  立即接取并导航
                </button>
                <button
                  type="button"
                  onClick={() => onSetWaypoint(selectedMission.fixerPos)}
                  className="px-3 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#e2e8f0] border border-[#475569] text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>标记联络点</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {MISSIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMission(m)}
                  className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                    selectedMission.id === m.id
                      ? 'bg-[#1e293b] border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#111722] border-[#263244] text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {m.code} {m.title}
                  {hud.completedMissionIds.includes(m.id) ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
