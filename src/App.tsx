import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Gamepad2,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Pause,
  PhoneCall,
  Play,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ContractPhoneModal } from './components/ContractPhoneModal';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { FullCityMapModal } from './components/FullCityMapModal';
import { LockpickModal } from './components/LockpickModal';
import { MobileFullscreenBanner } from './components/MobileFullscreenBanner';
import { OpeningPrologueOverlay } from './components/OpeningPrologueOverlay';
import { SettlementModal } from './components/SettlementModal';
import { TacticalMinimap } from './components/TacticalMinimap';
import { TitleOverlay } from './components/TitleOverlay';
import { VirtualControls } from './components/VirtualControls';
import { getDistrictAt, PLAYER_SPAWN } from './game/cityGrid';
import { getRankTitle, MISSIONS } from './game/missionEngine';
import { soundEngine } from './game/soundEngine';
import { IN_ENGINE_CUTSCENE_SHOTS } from './game/storyData';
import {
  CutsceneStateSnapshot,
  HudSnapshot,
  RewardBreakdown,
  Vec2,
  VirtualInputState,
} from './game/types';
import { VoxelCityWorld } from './game/VoxelCityWorld';
import { useMobileDevice } from './hooks/useMobileDevice';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  cash: 2500,
  rep: 50,
  rankTitle: getRankTitle(50),
  hp: 100,
  maxHp: 100,
  armor: 50,
  wantedStars: 0,
  wantedCooldownPct: 0,
  inVehicle: false,
  vehicleLabel: '步行模式',
  speedKmh: 0,
  district: getDistrictAt(PLAYER_SPAWN.x, PLAYER_SPAWN.z),
  playerX: PLAYER_SPAWN.x,
  playerZ: PLAYER_SPAWN.z,
  playerAngle: 0,
  activeMission: null,
  activeStep: null,
  stepIndex: 0,
  totalSteps: 0,
  missionElapsedSec: 0,
  missionTimeLimitSec: 0,
  distanceToTarget: 0,
  gpsPath: [],
  customWaypoint: null,
  nearbyPrompt: null,
  completedMissionIds: [],
  minimapVehicles: [],
  minimapEnemies: [],
  toastMessage: null,
  lockpickActive: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<VoxelCityWorld | null>(null);

  const mobile = useMobileDevice();
  const [virtualControlsOverride, setVirtualControlsOverride] = useState<boolean | null>(null);
  const virtualControlsActive = virtualControlsOverride ?? mobile.isMobile;

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [mapOpen, setMapOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [lockpickOpen, setLockpickOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reward, setReward] = useState<RewardBreakdown | null>(null);
  const [failReason, setFailReason] = useState('');
  const [cutscene, setCutscene] = useState<CutsceneStateSnapshot>({
    category: 'intro',
    title: '全城战场导览',
    shotIndex: 0,
    totalShots: IN_ENGINE_CUTSCENE_SHOTS.length,
    progressPct: 0,
    locationTag: '',
    speaker: '',
    subtitle: '',
  });

  const modalStateRef = useRef({ mapOpen, phoneOpen, lockpickOpen, phase: hud.phase });
  modalStateRef.current = { mapOpen, phoneOpen, lockpickOpen, phase: hud.phase };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';

    const world = new VoxelCityWorld(
      container,
      {
        onHudUpdate: (snap) => {
          setHud(snap);
        },
        onCutsceneUpdate: (snap) => {
          setCutscene(snap);
        },
        onMissionPassed: (res) => {
          setReward(res);
          setMapOpen(false);
          setPhoneOpen(false);
          setLockpickOpen(false);
        },
        onMissionFailed: (reason) => {
          setFailReason(reason);
          setMapOpen(false);
          setPhoneOpen(false);
          setLockpickOpen(false);
        },
        onOpenLockpick: () => {
          setLockpickOpen(true);
        },
        onToggleMap: () => {
          setPhoneOpen(false);
          setMapOpen((prev) => !prev);
        },
        onTogglePhone: () => {
          setMapOpen(false);
          setPhoneOpen((prev) => !prev);
        },
        onTogglePause: () => {
          const cur = modalStateRef.current;
          if (cur.mapOpen) {
            setMapOpen(false);
            return;
          }
          if (cur.phoneOpen) {
            setPhoneOpen(false);
            return;
          }
          if (cur.lockpickOpen) {
            setLockpickOpen(false);
            worldRef.current?.setLockpickOpen(false);
            return;
          }
          if (cur.phase === 'playing') {
            worldRef.current?.setPhase('paused');
          } else if (cur.phase === 'paused') {
            worldRef.current?.setPhase('playing');
          }
        },
      },
      autostart
    );

    worldRef.current = world;
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  const handleStartStory = useCallback(() => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    worldRef.current?.setPhase('prologue');
  }, []);

  const handleQuickPlay = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    worldRef.current?.startGame();
  }, []);

  const handlePrologueComplete = useCallback(() => {
    worldRef.current?.startInEngineCutscene();
  }, []);

  const handleSkipCutscene = useCallback(() => {
    worldRef.current?.finishInEngineCutscene();
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleAcceptMission = useCallback((id: string) => {
    setMapOpen(false);
    setPhoneOpen(false);
    worldRef.current?.acceptMission(id);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleAbandonMission = useCallback(() => {
    worldRef.current?.abandonMission();
  }, []);

  const handleSetWaypoint = useCallback((pos: Vec2 | null) => {
    worldRef.current?.setCustomWaypoint(pos);
  }, []);

  const handleTriggerPrompt = useCallback(() => {
    const p = hud.nearbyPrompt;
    if (!p) return;
    if (p.actionType === 'ACCEPT_MISSION' && p.missionId) {
      worldRef.current?.acceptMission(p.missionId);
    } else if (p.actionType === 'CRACK_SAFE') {
      worldRef.current?.setLockpickOpen(true);
      setLockpickOpen(true);
    }
  }, [hud.nearbyPrompt]);

  const handleVirtualInput = useCallback((patch: Partial<VirtualInputState>) => {
    worldRef.current?.setVirtualInput(patch);
  }, []);

  const handleVirtualAction = useCallback((action: 'interact' | 'vehicle') => {
    worldRef.current?.triggerVirtualAction(action);
  }, []);

  const timeRemaining = Math.max(0, hud.missionTimeLimitSec - hud.missionElapsedSec);
  const showVirtualButtons =
    hud.phase === 'playing' &&
    virtualControlsActive &&
    !mapOpen &&
    !phoneOpen &&
    !lockpickOpen;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0e131b] touch-none">
      {/* Isolated 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        data-testid="voxel-city-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* Mobile Fullscreen Request Prompt */}
      {mobile.showFullscreenPrompt &&
        !mapOpen &&
        !phoneOpen &&
        !lockpickOpen &&
        hud.phase !== 'title' && (
          <MobileFullscreenBanner
            fullscreenError={mobile.fullscreenError}
            onEnterFullscreen={() => {
              void mobile.requestFullscreen();
            }}
            onDismiss={mobile.dismissFullscreenPrompt}
          />
        )}

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <TitleOverlay
          isMobile={mobile.isMobile}
          isFullscreen={mobile.isFullscreen}
          onRequestFullscreen={() => {
            void mobile.requestFullscreen();
          }}
          onStartStory={handleStartStory}
          onQuickPlay={handleQuickPlay}
        />
      )}

      {/* Opening Story Prologue Animation */}
      {hud.phase === 'prologue' && (
        <OpeningPrologueOverlay
          onComplete={handlePrologueComplete}
          onSkipAll={handleQuickPlay}
        />
      )}

      {/* Live 3D In-Engine Mission Origin Cutscene */}
      {hud.phase === 'cutscene' && (
        <CutsceneOverlay cutscene={cutscene} onSkip={handleSkipCutscene} />
      )}

      {/* Active Gameplay HUD (Pointer pass-through wrapper) */}
      {hud.phase !== 'title' && hud.phase !== 'prologue' && hud.phase !== 'cutscene' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 md:p-5">
          {/* Mobile (<640px): Top Vitals Bar + Second Row (Mission Left + Minimap Right)
              Landscape/Desktop (>=640px): Side-by-side Mission Left + Vitals/Minimap Right */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            {/* Vitals & Utility Bar: shown first on narrow portrait (<640px), moved right on sm+ */}
            <div className="pointer-events-auto flex flex-col items-stretch sm:items-end gap-1.5 sm:gap-2 sm:order-2">
              <div className="bg-[#0e131b]/92 border-2 border-[#334155] shadow-[4px_4px_0_#05080f] px-2.5 py-1.5 sm:px-4 sm:py-2.5 flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] sm:text-[11px] text-[#94a3b8] hidden sm:block">
                      {hud.rankTitle}
                    </div>
                    <div
                      data-testid="hud-cash"
                      className="font-mono-num text-sm sm:text-xl font-bold text-[#34d399] leading-tight"
                    >
                      ${hud.cash.toLocaleString()}
                    </div>
                  </div>

                  {/* Vitals */}
                  <div className="w-20 sm:w-28 space-y-1 border-l border-[#1e293b] pl-2 sm:pl-3">
                    <div>
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-mono-num text-[#cbd5e1] mb-0.5">
                        <span>HP</span>
                        <span>{hud.hp}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-[#1e293b] overflow-hidden">
                        <div
                          className="h-full bg-[#ef4444] transition-all duration-150"
                          style={{ width: `${Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-mono-num text-[#cbd5e1] mb-0.5">
                        <span>AR</span>
                        <span>{hud.armor}</span>
                      </div>
                      <div className="h-1.5 bg-[#1e293b] overflow-hidden">
                        <div
                          className="h-full bg-[#38bdf8] transition-all duration-150"
                          style={{ width: `${Math.max(0, Math.min(100, hud.armor))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Utility Icons */}
                <div className="flex items-center gap-1 sm:gap-1.5 border-l border-[#1e293b] pl-2 sm:pl-3 shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setMapOpen(false);
                      setPhoneOpen((p) => !p);
                    }}
                    aria-label="任务终端"
                    title="暗网任务终端 [Tab]"
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[#fbbf24] cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setVirtualControlsOverride(!(virtualControlsOverride ?? mobile.isMobile));
                    }}
                    aria-label={virtualControlsActive ? '隐藏虚拟按键' : '显示虚拟按键'}
                    title="虚拟摇杆与按键开关"
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border cursor-pointer ${
                      virtualControlsActive
                        ? 'bg-[#172536] border-[#38bdf8] text-[#38bdf8]'
                        : 'bg-[#151c28] hover:bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      mobile.toggleFullscreen();
                    }}
                    aria-label={mobile.isFullscreen ? '退出全屏' : '启动全屏'}
                    title={mobile.isFullscreen ? '退出全屏' : '启动全屏'}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border cursor-pointer ${
                      mobile.isFullscreen
                        ? 'bg-[#172536] border-[#38bdf8] text-[#38bdf8]'
                        : 'bg-[#151c28] hover:bg-[#1e293b] border-[#334155] text-[#cbd5e1]'
                    }`}
                  >
                    {mobile.isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleToggleMute}
                    aria-label={muted ? '取消静音' : '静音'}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[#cbd5e1] cursor-pointer hidden sm:flex"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      worldRef.current?.setPhase(hud.phase === 'paused' ? 'playing' : 'paused');
                    }}
                    aria-label="暂停游戏"
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#151c28] hover:bg-[#1e293b] border border-[#334155] text-[#cbd5e1] cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {/* Wanted Stars Bar */}
              {hud.wantedStars > 0 && (
                <div
                  data-testid="wanted-stars"
                  className="self-end bg-[#1b1016]/95 border-2 border-[#ef4444] px-2.5 py-1 flex items-center gap-1 shadow-[4px_4px_0_#05080f]"
                >
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#fca5a5] mr-1">通缉</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        s <= hud.wantedStars
                          ? 'text-[#fbbf24] fill-[#fbbf24]'
                          : 'text-[#334155]'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Compact Minimap on sm+ (landscape phone & virtual mode); on <640px it sits neatly beside Mission Tracker below */}
              {(mobile.isMobile || virtualControlsActive) && (
                <div className="hidden sm:flex items-start gap-2">
                  {hud.inVehicle && (
                    <div className="bg-[#0e131b]/92 border-2 border-[#334155] shadow-[4px_4px_0_#05080f] px-2.5 py-1.5 text-right">
                      <div className="text-[10px] text-[#94a3b8] truncate max-w-[90px]">
                        {hud.vehicleLabel.split(' · ')[0]}
                      </div>
                      <div className="font-mono-num text-base font-bold text-[#38bdf8]">
                        {hud.speedKmh} <span className="text-[10px] text-[#94a3b8]">KM/H</span>
                      </div>
                    </div>
                  )}
                  <TacticalMinimap
                    hud={hud}
                    compact
                    onOpenMap={() => {
                      setPhoneOpen(false);
                      setMapOpen(true);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Mission Tracker + (<640px Compact Minimap side-by-side) */}
            <div className="flex items-start justify-between gap-2 sm:order-1">
              <div className="pointer-events-auto flex-1 min-w-0 sm:flex-none sm:max-w-sm bg-[#0e131b]/92 border-2 border-[#334155] shadow-[4px_4px_0_#05080f] px-2.5 py-2 sm:px-4 sm:py-3">
                {hud.activeMission && hud.activeStep ? (
                  <div>
                    <div className="flex items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-[11px] mb-0.5 sm:mb-1">
                      <span className="font-mono-num font-bold text-[#fbbf24] truncate">
                        {hud.activeMission.code} · {hud.activeMission.title} ({hud.stepIndex + 1}/{hud.totalSteps})
                      </span>
                      <span
                        className={`font-mono-num font-bold shrink-0 ${
                          timeRemaining <= 25 ? 'text-[#ef4444]' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {timeRemaining}s
                      </span>
                    </div>
                    <div className="font-display text-xs sm:text-base font-bold text-white leading-snug truncate">
                      {hud.activeStep.title}
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#cbd5e1] mt-0.5 leading-snug line-clamp-2">
                      {hud.activeStep.instruction}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] sm:text-xs border-t border-[#1e293b] pt-1">
                      <span className="text-[#94a3b8]">目标距离</span>
                      <span className="font-mono-num font-bold text-[#fbbf24]">
                        {hud.distanceToTarget}m
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-mono-num text-[#38bdf8] mb-0.5">
                      自由探索 · {hud.completedMissionIds.length}/{MISSIONS.length} 合约
                    </div>
                    <div className="font-display text-xs sm:text-sm font-bold text-white leading-snug">
                      接取任务：前往联络人光圈或打开终端
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMapOpen(false);
                          setPhoneOpen(true);
                        }}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-[11px] sm:text-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>{mobile.isMobile ? '接取合约' : '暗网任务终端 [Tab]'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneOpen(false);
                          setMapOpen(true);
                        }}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#e2e8f0] border border-[#475569] font-semibold text-[11px] sm:text-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <MapIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38bdf8]" />
                        <span>{mobile.isMobile ? '地图' : '地图 [M]'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Portrait (<640px) Compact Minimap + Vehicle Readout */}
              {(mobile.isMobile || virtualControlsActive) && (
                <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0 sm:hidden">
                  <TacticalMinimap
                    hud={hud}
                    compact
                    onOpenMap={() => {
                      setPhoneOpen(false);
                      setMapOpen(true);
                    }}
                  />
                  {hud.inVehicle && (
                    <div className="bg-[#0e131b]/92 border-2 border-[#334155] shadow-[4px_4px_0_#05080f] px-2 py-1 text-right">
                      <div className="font-mono-num text-sm font-bold text-[#38bdf8]">
                        {hud.speedKmh} <span className="text-[10px] text-[#94a3b8]">KM/H</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Toast Banner (Top-center safe margin) */}
          {hud.toastMessage && (
            <div className="fixed top-16 sm:top-4 left-1/2 -translate-x-1/2 bg-[#0e131b]/95 border-2 border-[#fbbf24] px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-[#fef08a] shadow-[4px_4px_0_#05080f] whitespace-nowrap max-w-[90vw] truncate">
              {hud.toastMessage}
            </div>
          )}

          {/* Desktop Bottom Row: Tactical Minimap (Left) + Context Prompt / Vehicle Readout (Right) */}
          {!mobile.isMobile && !virtualControlsActive && (
            <div className="flex items-end justify-between gap-4">
              <div className="pointer-events-auto">
                <TacticalMinimap
                  hud={hud}
                  onOpenMap={() => {
                    setPhoneOpen(false);
                    setMapOpen(true);
                  }}
                />
              </div>

              <div className="flex flex-col items-end gap-2">
                {hud.nearbyPrompt && (
                  <button
                    type="button"
                    onClick={handleTriggerPrompt}
                    className="pointer-events-auto bg-[#0e131b]/95 border-2 border-[#fbbf24] shadow-[4px_4px_0_#05080f] px-4 py-2 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="font-mono-num text-xs font-bold bg-[#fbbf24] text-[#0f172a] px-2 py-0.5">
                      {hud.nearbyPrompt.key}
                    </span>
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {hud.nearbyPrompt.label}
                    </span>
                  </button>
                )}

                {hud.inVehicle && (
                  <div className="bg-[#0e131b]/92 border-2 border-[#334155] shadow-[4px_4px_0_#05080f] px-4 py-2 text-right">
                    <div className="text-[11px] text-[#94a3b8]">{hud.vehicleLabel}</div>
                    <div className="font-mono-num text-xl font-bold text-[#38bdf8]">
                      {hud.speedKmh} <span className="text-xs text-[#94a3b8]">KM/H</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Center-Bottom Context Prompt Chip (above virtual thumb controls) */}
          {(mobile.isMobile || virtualControlsActive) && hud.nearbyPrompt && (
            <div className="fixed bottom-34 sm:bottom-36 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                type="button"
                onClick={handleTriggerPrompt}
                className="bg-[#0e131b]/95 border-2 border-[#fbbf24] shadow-[4px_4px_0_#05080f] px-3 py-1.5 flex items-center gap-2 cursor-pointer"
              >
                <span className="font-mono-num text-[11px] font-bold bg-[#fbbf24] text-[#0f172a] px-1.5 py-0.5">
                  {hud.nearbyPrompt.key}
                </span>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {hud.nearbyPrompt.label}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Multi-Touch Virtual Controls (Mobile & Toggleable) */}
      {showVirtualButtons && (
        <VirtualControls
          hud={hud}
          compact={mobile.isPhoneSize}
          onInputChange={handleVirtualInput}
          onAction={handleVirtualAction}
        />
      )}

      {/* Full City Tactical Map Modal */}
      {mapOpen && hud.phase === 'playing' && (
        <FullCityMapModal
          hud={hud}
          onClose={() => setMapOpen(false)}
          onSetWaypoint={handleSetWaypoint}
          onAcceptMission={handleAcceptMission}
        />
      )}

      {/* Fixer Contract Dispatch Phone Modal */}
      {phoneOpen && hud.phase === 'playing' && (
        <ContractPhoneModal
          hud={hud}
          onClose={() => setPhoneOpen(false)}
          onAcceptMission={handleAcceptMission}
          onAbandonMission={handleAbandonMission}
        />
      )}

      {/* Bank Vault Lockpick Action Modal */}
      {lockpickOpen && hud.phase === 'playing' && (
        <LockpickModal
          onSuccess={() => {
            setLockpickOpen(false);
            worldRef.current?.completeLockpickSuccess();
          }}
          onCancel={() => {
            setLockpickOpen(false);
            worldRef.current?.setLockpickOpen(false);
          }}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a10]/85 p-4 pointer-events-auto">
          <div className="w-full max-w-sm bg-[#0e131b] border-2 border-[#334155] shadow-[8px_8px_0_#04060a] p-6">
            <h2 className="font-display text-2xl font-bold text-white mb-1">行动暂停</h2>
            <p className="text-xs text-[#94a3b8] mb-5">
              当前城区：{hud.district.name} · 资金 ${hud.cash.toLocaleString()}
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => worldRef.current?.setPhase('playing')}
                className="w-full px-4 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>继续行动</span>
              </button>
              {hud.activeMission && (
                <button
                  type="button"
                  onClick={() => {
                    handleAbandonMission();
                    worldRef.current?.setPhase('playing');
                  }}
                  className="w-full px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#f87171] border border-[#475569] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>中止当前任务</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => worldRef.current?.setPhase('prologue')}
                className="w-full px-4 py-2.5 bg-[#151c28] hover:bg-[#1e293b] text-[#38bdf8] border border-[#334155] font-semibold text-sm cursor-pointer"
              >
                重温开场动画与实机导览
              </button>
              <button
                type="button"
                onClick={() => worldRef.current?.setPhase('title')}
                className="w-full px-4 py-2.5 bg-[#151c28] hover:bg-[#1e293b] text-[#cbd5e1] border border-[#334155] font-semibold text-sm cursor-pointer"
              >
                返回标题界面
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement / Failed Modal */}
      {(hud.phase === 'settlement' || hud.phase === 'failed') && (
        <SettlementModal
          mode={hud.phase}
          reward={reward}
          failReason={failReason}
          currentCash={hud.cash}
          rankTitle={hud.rankTitle}
          onContinue={() => {
            setReward(null);
            worldRef.current?.setPhase('playing');
          }}
          onRetry={() => {
            setFailReason('');
            worldRef.current?.respawnAfterFailure();
          }}
        />
      )}
    </div>
  );
}
