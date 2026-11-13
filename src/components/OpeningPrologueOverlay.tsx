import { useEffect, useRef, useState } from 'react';
import { ChevronRight, FastForward } from 'lucide-react';
import { soundEngine } from '../game/soundEngine';
import { PROLOGUE_SCENES, PrologueScene } from '../game/storyData';

interface OpeningPrologueOverlayProps {
  onComplete: () => void;
  onSkipAll: () => void;
}

function drawPrologueScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: PrologueScene,
  t: number
) {
  // Deep noir backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#070b14');
  grad.addColorStop(1, '#111a2b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Pixel grid horizon glow
  ctx.fillStyle = `${scene.accentColor}14`;
  ctx.fillRect(0, h * 0.56, w, h * 0.44);

  if (scene.visualTheme === 'skyline') {
    // Parallax moon & sweeping spotlight
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(w * 0.78, h * 0.16, 44, 44);
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(w * 0.78 + 10, h * 0.16 + 6, 12, 12);

    // Sweeping searchlight beam
    const sweepX = w * 0.5 + Math.sin(t * 1.1) * (w * 0.35);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.92);
    ctx.lineTo(sweepX - 70, 0);
    ctx.lineTo(sweepX + 70, 0);
    ctx.closePath();
    ctx.fill();

    // Multi-tier voxel skyline silhouettes with lit pixel windows
    const buildings = [
      { x: 0.04, bw: 0.12, bh: 0.52, c: '#162033' },
      { x: 0.14, bw: 0.14, bh: 0.68, c: '#1c283d' },
      { x: 0.27, bw: 0.11, bh: 0.44, c: '#131b2b' },
      { x: 0.37, bw: 0.16, bh: 0.76, c: '#1f2d44' },
      { x: 0.52, bw: 0.13, bh: 0.58, c: '#172235' },
      { x: 0.64, bw: 0.15, bh: 0.71, c: '#1b2840' },
      { x: 0.78, bw: 0.18, bh: 0.48, c: '#151e30' },
    ];
    buildings.forEach((b, idx) => {
      const bx = Math.floor(b.x * w);
      const bw = Math.floor(b.bw * w);
      const bh = Math.floor(b.bh * h);
      const by = h - bh;
      ctx.fillStyle = b.c;
      ctx.fillRect(bx, by, bw, bh);

      // Rooftop neon accent
      ctx.fillStyle = idx % 2 === 0 ? '#38bdf8' : '#fbbf24';
      ctx.fillRect(bx, by, bw, 4);

      // Lit windows
      for (let wy = by + 16; wy < h - 40; wy += 18) {
        for (let wx = bx + 10; wx < bx + bw - 14; wx += 16) {
          const on = ((wx * 13 + wy * 7 + idx * 19) % 11) > 4;
          if (!on) continue;
          const flicker = Math.sin(t * 2 + wx) > 0.96;
          ctx.fillStyle = flicker ? '#fbbf24' : '#fde68a';
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
    });
  } else if (scene.visualTheme === 'betrayal') {
    // Vault corridor + crimson laser alarm grid + ledger betrayal motif
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = h * 0.2 + i * 48 + Math.sin(t * 2 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (i % 2 === 0 ? 30 : -30));
      ctx.stroke();
    }

    // Center voxel safe vault emblem + "$12,000,000" red stamp
    const cx = w * 0.5;
    const cy = h * 0.44;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 110, cy - 90, 220, 180);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 110, cy - 90, 220, 180);

    // Rotating vault dial
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.9);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(-36, -36, 72, 72);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();

    // Falling shredded pixel ledger sheets
    for (let i = 0; i < 18; i++) {
      const px = ((i * 89 + t * 28) % w);
      const py = ((i * 53 + t * 90) % h);
      ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : '#e2e8f0';
      ctx.fillRect(px, py, 10, 14);
    }
  } else if (scene.visualTheme === 'syndicate') {
    // Outer-ring industrial refinery & casino laundering pipeline + sweeping radar
    const cx = w * 0.5;
    const cy = h * 0.46;

    // Radar circle & rotating sweep
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.stroke();

    const angle = t * 1.4;
    ctx.fillStyle = 'rgba(249, 115, 22, 0.16)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 130, angle - 0.4, angle);
    ctx.closePath();
    ctx.fill();

    // Refinery smokestacks silhouette (left) & Casino crown (right)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(w * 0.14, h * 0.42, 110, 120);
    ctx.fillRect(w * 0.17, h * 0.24, 20, 85);
    ctx.fillRect(w * 0.22, h * 0.24, 20, 85);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(w * 0.17, h * 0.28, 20, 8);
    ctx.fillRect(w * 0.22, h * 0.28, 20, 8);

    ctx.fillStyle = '#2e1065';
    ctx.fillRect(w * 0.72, h * 0.36, 120, 145);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(w * 0.74, h * 0.32, 80, 14);

    // Moving armored convoy icon along bottom highway
    const truckX = ((t * 140) % (w + 120)) - 60;
    ctx.fillStyle = '#475569';
    ctx.fillRect(truckX, h * 0.74, 72, 26);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(truckX + 54, h * 0.74 + 6, 14, 10);
  } else if (scene.visualTheme === 'showdown') {
    // Towering Obsidian Spire + crimson energy pulse + extraction chopper
    const cx = w * 0.5;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 56, h * 0.16, 112, h * 0.72);
    ctx.fillRect(cx - 34, h * 0.08, 68, 44);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx - 6, h * 0.02, 12, 34);

    // Pulsing vertical crimson core
    const glowAlpha = 0.5 + Math.sin(t * 5) * 0.35;
    ctx.fillStyle = `rgba(244, 63, 94, ${glowAlpha.toFixed(2)})`;
    ctx.fillRect(cx - 8, h * 0.22, 16, h * 0.55);

    // Hovering pixel helicopter (top right)
    const hx = w * 0.76 + Math.sin(t * 2.2) * 14;
    const hy = h * 0.28 + Math.cos(t * 3) * 8;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(hx - 28, hy, 56, 20);
    ctx.fillRect(hx - 48, hy + 6, 24, 6);
    const rotorW = 36 + Math.abs(Math.sin(t * 28)) * 44;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(hx - rotorW / 2, hy - 10, rotorW, 4);
  } else if (scene.visualTheme === 'ledger') {
    // 5-node tactical conspiracy network across the 3x city
    const nodes = [
      { x: w * 0.22, y: h * 0.32, label: 'OP-01 银行金库', color: '#fbbf24' },
      { x: w * 0.78, y: h * 0.32, label: 'OP-02 翡翠密文箱', color: '#f43f5e' },
      { x: w * 0.72, y: h * 0.64, label: 'OP-03 走私芯片车', color: '#34d399' },
      { x: w * 0.28, y: h * 0.64, label: 'OP-04 重工押运车', color: '#f97316' },
      { x: w * 0.5, y: h * 0.46, label: 'OP-05 议会斩首', color: '#a855f7' },
    ];

    // Animated dashed circuit lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 48;
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    ctx.lineTo(nodes[1].x, nodes[1].y);
    ctx.lineTo(nodes[2].x, nodes[2].y);
    ctx.lineTo(nodes[3].x, nodes[3].y);
    ctx.closePath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    ctx.lineTo(nodes[4].x, nodes[4].y);
    ctx.lineTo(nodes[1].x, nodes[1].y);
    ctx.moveTo(nodes[3].x, nodes[3].y);
    ctx.lineTo(nodes[4].x, nodes[4].y);
    ctx.lineTo(nodes[2].x, nodes[2].y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const n of nodes) {
      const pulse = 22 + Math.sin(t * 4) * 4;
      ctx.fillStyle = '#0e131b';
      ctx.fillRect(n.x - 28, n.y - 28, 56, 56);
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(n.x - 28, n.y - 28, 56, 56);

      ctx.fillStyle = n.color;
      ctx.fillRect(n.x - pulse * 0.4, n.y - pulse * 0.4, pulse * 0.8, pulse * 0.8);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 48);
    }
  } else {
    // Fixer K encrypted radio waveform & voxel portrait silhouette
    const cx = w * 0.5;
    const cy = h * 0.42;

    // Voxel silhouette head + fedora
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 42, cy - 58, 84, 72);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 58, cy - 68, 116, 12);
    ctx.fillRect(cx - 38, cy - 92, 76, 24);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(cx - 28, cy - 34, 20, 8);
    ctx.fillRect(cx + 8, cy - 34, 20, 8);

    // Live audio equalizer bars
    const barCount = 28;
    const startX = cx - barCount * 10;
    for (let i = 0; i < barCount; i++) {
      const barH = 12 + Math.abs(Math.sin(t * 7 + i * 0.55)) * 46;
      ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#38bdf8';
      ctx.fillRect(startX + i * 20, cy + 70 - barH / 2, 12, barH);
    }
  }

  // Diagonal pixel rain overlay
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  for (let i = 0; i < 65; i++) {
    const rx = ((i * 67 + t * 95) % (w + 60)) - 30;
    const ry = ((i * 97 + t * 340) % (h + 40)) - 20;
    ctx.fillRect(rx, ry, 2, 12);
  }
}

export function OpeningPrologueOverlay({
  onComplete,
  onSkipAll,
}: OpeningPrologueOverlayProps) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentScene = PROLOGUE_SCENES[sceneIdx];

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const pct = Math.min(100, (elapsed / currentScene.durationSec) * 100);
      setProgressPct(pct);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPrologueScene(ctx, canvas.width, canvas.height, currentScene, elapsed);
        }
      }

      if (elapsed >= currentScene.durationSec) {
        if (sceneIdx + 1 < PROLOGUE_SCENES.length) {
          soundEngine.playStepComplete();
          setSceneIdx((idx) => idx + 1);
        } else {
          onComplete();
        }
        return;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sceneIdx, currentScene, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        soundEngine.unlock();
        if (sceneIdx + 1 < PROLOGUE_SCENES.length) {
          soundEngine.playStepComplete();
          setSceneIdx((idx) => idx + 1);
        } else {
          onComplete();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onSkipAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sceneIdx, onComplete, onSkipAll]);

  const handleNext = () => {
    soundEngine.unlock();
    if (sceneIdx + 1 < PROLOGUE_SCENES.length) {
      soundEngine.playStepComplete();
      setSceneIdx((idx) => idx + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div
      data-testid="opening-prologue"
      className="fixed inset-0 z-40 flex flex-col justify-between bg-[#070b14] pointer-events-auto"
    >
      {/* Top Cinema Letterbox Bar */}
      <div className="h-12 sm:h-16 bg-[#05080f] border-b border-[#1e293b] px-3 sm:px-6 md:px-10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-mono-num text-[11px] sm:text-xs font-bold truncate"
            style={{ color: currentScene.accentColor }}
          >
            {currentScene.chapterLabel}
          </span>
          <span className="text-[#475569] hidden sm:inline">·</span>
          <span className="text-[11px] sm:text-xs text-[#94a3b8] shrink-0">
            ({sceneIdx + 1}/{PROLOGUE_SCENES.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onSkipAll}
          className="px-2.5 py-1.5 bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[11px] sm:text-xs font-semibold text-[#cbd5e1] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <FastForward className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span className="sm:hidden">跳过剧情</span>
          <span className="hidden sm:inline">跳过全部剧情 [Esc]</span>
        </button>
      </div>

      {/* Center Animated Pixel-Noir Motion Canvas */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={460}
          className="w-full h-full object-cover pixelated"
        />

        {/* Narrative Card Docked Cleanly Over Bottom Edge */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/94 to-transparent pt-8 sm:pt-12 pb-3 sm:pb-6 px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono-num mb-1" style={{ color: currentScene.accentColor }}>
              <span>{currentScene.speaker}</span>
            </div>
            <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
              {currentScene.title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#e2e8f0] leading-relaxed max-w-3xl">
              {currentScene.narration}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Cinema Letterbox Bar + Controls */}
      <div className="bg-[#05080f] border-t border-[#1e293b] px-3 sm:px-6 md:px-10 py-2.5 sm:py-3.5 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
          <div className="flex-1 flex items-center gap-1.5 sm:gap-2">
            {PROLOGUE_SCENES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`跳转至序幕 ${idx + 1}`}
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playStepComplete();
                  setSceneIdx(idx);
                }}
                className="flex-1 py-1.5 sm:py-2 cursor-pointer group"
              >
                <div className="h-1.5 bg-[#1e293b] group-hover:bg-[#334155] overflow-hidden">
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      backgroundColor: currentScene.accentColor,
                      width:
                        idx < sceneIdx ? '100%' : idx === sceneIdx ? `${progressPct}%` : '0%',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onComplete}
              className="px-3 py-1.5 sm:py-2 bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[11px] sm:text-xs font-semibold text-[#cbd5e1] cursor-pointer whitespace-nowrap"
            >
              跳过至实机演练
            </button>
            <button
              type="button"
              data-prologue-next="true"
              onClick={handleNext}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>
                {sceneIdx + 1 < PROLOGUE_SCENES.length ? '下一幕' : '进入实机动画'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
