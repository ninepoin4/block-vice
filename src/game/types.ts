export type GamePhase = 'title' | 'prologue' | 'cutscene' | 'playing' | 'paused' | 'settlement' | 'failed';

export type CutsceneCategory = 'intro' | 'mission_start' | 'mid_mission' | 'mission_complete';

export interface CutsceneStateSnapshot {
  category: CutsceneCategory;
  title: string;
  shotIndex: number;
  totalShots: number;
  progressPct: number;
  locationTag: string;
  speaker: string;
  subtitle: string;
}

export type MissionCategory = 'HEIST' | 'ASSASSINATION' | 'DELIVERY';

export type StepActionType =
  | 'NAVIGATE'
  | 'SAFE_CRACK'
  | 'PICKUP_LOOT'
  | 'ELIMINATE_TARGET'
  | 'HACK_BRIEFCASE'
  | 'HIJACK_VEHICLE'
  | 'DRIVE_CHECKPOINT'
  | 'ESCAPE_ZONE';

export interface Vec2 {
  x: number;
  z: number;
}

export interface BuildingCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  district: DistrictId;
  color: number;
  accentColor: number;
  label?: string;
  landmark?:
    | 'bank'
    | 'jade'
    | 'warehouse'
    | 'garage'
    | 'safehouse'
    | 'subway'
    | 'spire'
    | 'casino'
    | 'refinery'
    | 'helipad';
}

export type DistrictId = 'financial' | 'chinatown' | 'industrial' | 'harbor';

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  nameEn: string;
  color: string;
}

export interface MissionStep {
  id: string;
  title: string;
  instruction: string;
  type: StepActionType;
  targetPos: Vec2;
  radius: number;
  beaconColor: number;
}

export interface MissionDefinition {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  category: MissionCategory;
  fixerName: string;
  fixerRole: string;
  fixerPos: Vec2;
  difficulty: 1 | 2 | 3;
  baseReward: number;
  repReward: number;
  parTimeSec: number;
  timeLimitSec: number;
  briefing: string;
  steps: MissionStep[];
}

export interface MissionMetrics {
  elapsedSec: number;
  damageTaken: number;
  maxWantedReached: number;
  enemiesNeutralized: number;
  accuracyBonus: boolean;
}

export interface RewardBreakdown {
  missionId: string;
  missionTitle: string;
  basePayout: number;
  timeBonus: number;
  stealthBonus: number;
  combatBonus: number;
  medicalDeduction: number;
  totalPayout: number;
  repEarned: number;
  rankGrade: 'S' | 'A' | 'B' | 'C';
  elapsedSec: number;
}

export interface MissionRuntimeState {
  activeMissionId: string | null;
  currentStepIndex: number;
  lootCollected: number;
  lootRequired: number;
  targetEliminated: boolean;
  safeCracked: boolean;
  metrics: MissionMetrics;
  completedMissionIds: string[];
}

export interface VehicleSnapshot {
  id: string;
  kind: 'muscle' | 'police' | 'van' | 'taxi' | 'cargo';
  label: string;
  x: number;
  z: number;
  angle: number;
  speed: number;
  color: number;
  occupied: boolean;
}

export interface EnemySnapshot {
  id: string;
  role: 'guard' | 'vip' | 'police';
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  cash: number;
  rep: number;
  rankTitle: string;
  hp: number;
  maxHp: number;
  armor: number;
  wantedStars: number;
  wantedCooldownPct: number;
  inVehicle: boolean;
  vehicleLabel: string;
  speedKmh: number;
  district: DistrictInfo;
  playerX: number;
  playerZ: number;
  playerAngle: number;
  activeMission: MissionDefinition | null;
  activeStep: MissionStep | null;
  stepIndex: number;
  totalSteps: number;
  missionElapsedSec: number;
  missionTimeLimitSec: number;
  distanceToTarget: number;
  gpsPath: Vec2[];
  customWaypoint: Vec2 | null;
  nearbyPrompt: {
    key: string;
    label: string;
    actionType: 'ENTER_VEHICLE' | 'EXIT_VEHICLE' | 'ACCEPT_MISSION' | 'CRACK_SAFE' | 'PICKUP' | 'HACK';
    missionId?: string;
  } | null;
  completedMissionIds: string[];
  minimapVehicles: Array<{ x: number; z: number; kind: VehicleSnapshot['kind']; occupied: boolean }>;
  minimapEnemies: Array<{ x: number; z: number; role: EnemySnapshot['role'] }>;
  toastMessage: string | null;
  lockpickActive: boolean;
}

export interface VirtualInputState {
  moveX: number;
  moveZ: number;
  throttle: number;
  steer: number;
  sprint: boolean;
  firing: boolean;
}
