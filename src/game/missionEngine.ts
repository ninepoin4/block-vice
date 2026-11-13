import {
  MissionDefinition,
  MissionMetrics,
  MissionRuntimeState,
  RewardBreakdown,
} from './types';

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'bank_heist',
    code: 'OP-01',
    title: '金库破门',
    subtitle: 'Pacific Bank Vault Heist',
    category: 'HEIST',
    fixerName: '老K · Fixer K',
    fixerRole: '地下情报中间人',
    fixerPos: { x: 6.4, z: 6.4 },
    difficulty: 3,
    baseReward: 12000,
    repReward: 350,
    parTimeSec: 95,
    timeLimitSec: 180,
    briefing:
      '太平洋体素银行刚运入一批不记名债券。潜入金融中心银行广场，破解金库机械密码锁，清点两袋现金后立即驱车撤离至海港安全屋。',
    steps: [
      {
        id: 'heist-nav',
        title: '潜入银行广场',
        instruction: '跟随黄色 GPS 路线前往金融中心「太平洋体素银行」',
        type: 'NAVIGATE',
        targetPos: { x: -45, z: -38 },
        radius: 6,
        beaconColor: 0xfbbf24,
      },
      {
        id: 'heist-crack',
        title: '破解金库密码锁',
        instruction: '靠近银行金库终端按 [E] 进行三针同步开锁（注意警卫巡逻）',
        type: 'SAFE_CRACK',
        targetPos: { x: -45, z: -41 },
        radius: 4.5,
        beaconColor: 0x38bdf8,
      },
      {
        id: 'heist-loot',
        title: '抢夺现金袋',
        instruction: '拾取金库前散落的 2 袋体素现钞（靠近自动或按 [E] 拾取）',
        type: 'PICKUP_LOOT',
        targetPos: { x: -41, z: -38 },
        radius: 4.5,
        beaconColor: 0x34d399,
      },
      {
        id: 'heist-escape',
        title: '甩开追兵并撤离',
        instruction: '通缉警报拉响！全速前往东南角「海港安全屋」完成洗钱结算',
        type: 'ESCAPE_ZONE',
        targetPos: { x: 45, z: 38 },
        radius: 6.5,
        beaconColor: 0xfbbf24,
      },
    ],
  },
  {
    id: 'neon_assassination',
    code: 'OP-02',
    title: '霓虹暗杀',
    subtitle: 'Jade Plaza VIP Elimination',
    category: 'ASSASSINATION',
    fixerName: '影刃 · Shadow',
    fixerRole: '夜枭暗杀联络人',
    fixerPos: { x: 26, z: -8 },
    difficulty: 2,
    baseReward: 9500,
    repReward: 280,
    parTimeSec: 75,
    timeLimitSec: 150,
    briefing:
      '帮派叛徒「白衣蛇头」今晚在霓虹唐人街翡翠楼露面。清理目标并回收他随身携带的加密手提箱，随后从南区地铁口脱身。',
    steps: [
      {
        id: 'hit-nav',
        title: '抵达翡翠霓虹广场',
        instruction: '沿 GPS 前往东北区「翡翠霓虹广场」侦察目标位置',
        type: 'NAVIGATE',
        targetPos: { x: 45, z: -36 },
        radius: 7,
        beaconColor: 0xf43f5e,
      },
      {
        id: 'hit-elim',
        title: '清除白衣目标',
        instruction: '使用武器（左键 / Space）击倒白衣 Syndicate VIP',
        type: 'ELIMINATE_TARGET',
        targetPos: { x: 45, z: -40 },
        radius: 12,
        beaconColor: 0xf43f5e,
      },
      {
        id: 'hit-intel',
        title: '回收加密手提箱',
        instruction: '靠近目标掉落点按 [E] 夺取加密交易手提箱',
        type: 'HACK_BRIEFCASE',
        targetPos: { x: 45, z: -40 },
        radius: 4.5,
        beaconColor: 0x38bdf8,
      },
      {
        id: 'hit-escape',
        title: '地铁口撤离',
        instruction: '携带情报前往南区「地铁接应点」脱离封锁圈',
        type: 'ESCAPE_ZONE',
        targetPos: { x: -16, z: 38 },
        radius: 6.5,
        beaconColor: 0xfbbf24,
      },
    ],
  },
  {
    id: 'hot_cargo',
    code: 'OP-03',
    title: '极速走私',
    subtitle: 'Hot Cargo Intercept & Run',
    category: 'DELIVERY',
    fixerName: '涡轮 · Turbo',
    fixerRole: '地下车手经纪人',
    fixerPos: { x: -24, z: 24 },
    difficulty: 2,
    baseReward: 8500,
    repReward: 240,
    parTimeSec: 70,
    timeLimitSec: 135,
    briefing:
      '码头仓库停放着一辆装满走私芯片的改装肌肉车。按 [F] 劫持该车，在规定时间内连续冲过街头检查点，安全停入地下改装车库。',
    steps: [
      {
        id: 'cargo-hijack',
        title: '劫持走私跑车',
        instruction: '前往海港「码头仓库」旁，靠近发光的青色走私跑车按 [F] 上车',
        type: 'HIJACK_VEHICLE',
        targetPos: { x: 44, z: 20 },
        radius: 6,
        beaconColor: 0x34d399,
      },
      {
        id: 'cargo-cp1',
        title: '突破南大道检查点',
        instruction: '驾驶走私车全速冲过第 1 街头检查点',
        type: 'DRIVE_CHECKPOINT',
        targetPos: { x: 0, z: 30 },
        radius: 7,
        beaconColor: 0xfbbf24,
      },
      {
        id: 'cargo-cp2',
        title: '突破西环路检查点',
        instruction: '甩开截击警车，全速冲过第 2 街头检查点',
        type: 'DRIVE_CHECKPOINT',
        targetPos: { x: -30, z: 0 },
        radius: 7,
        beaconColor: 0xfbbf24,
      },
      {
        id: 'cargo-drop',
        title: '停入地下改装车库',
        instruction: '将走私车辆完好停入西南角「地下改装车库」交付区',
        type: 'ESCAPE_ZONE',
        targetPos: { x: -45, z: 38 },
        radius: 6.5,
        beaconColor: 0x34d399,
      },
    ],
  },
  {
    id: 'convoy_ambush',
    code: 'OP-04',
    title: '铁血劫车',
    subtitle: 'Blacksteel Convoy Intercept',
    category: 'DELIVERY',
    fixerName: '铁锤 · Hammer',
    fixerRole: '外环重工爆破手',
    fixerPos: { x: -65, z: 24 },
    difficulty: 3,
    baseReward: 13500,
    repReward: 400,
    parTimeSec: 110,
    timeLimitSec: 210,
    briefing:
      '黑曜石议会的冷钱包服务器正装在西南外环「黑钢重工精炼厂」的装甲押运车内。突袭护卫并强行劫车，冲破南环高速检查点后直接送往东北外环「九龙霓虹赌场」后院洗白。',
    steps: [
      {
        id: 'convoy-nav',
        title: '奔袭黑钢精炼厂',
        instruction: '沿黄色 GPS 驱车前往西南外环「黑钢重工精炼厂」车队停靠点',
        type: 'NAVIGATE',
        targetPos: { x: -105, z: 96 },
        radius: 8,
        beaconColor: 0xf97316,
      },
      {
        id: 'convoy-hijack',
        title: '强夺装甲押运车',
        instruction: '清除或甩开重工护卫，靠近装甲押运车按 [F] 上车劫持',
        type: 'HIJACK_VEHICLE',
        targetPos: { x: -105, z: 99 },
        radius: 7,
        beaconColor: 0xfbbf24,
      },
      {
        id: 'convoy-cp',
        title: '冲破南环高速路障',
        instruction: '驾驶装甲押运车全速冲过南外环 90 号大道检查点',
        type: 'DRIVE_CHECKPOINT',
        targetPos: { x: 0, z: 90 },
        radius: 8,
        beaconColor: 0xfbbf24,
      },
      {
        id: 'convoy-drop',
        title: '交付九龙霓虹赌场',
        instruction: '甩开警队围堵，将装甲服务器车停入东北角「九龙霓虹赌场」后院卸货区',
        type: 'ESCAPE_ZONE',
        targetPos: { x: 105, z: -97 },
        radius: 7.5,
        beaconColor: 0x34d399,
      },
    ],
  },
  {
    id: 'obsidian_takedown',
    code: 'OP-05',
    title: '议会斩首',
    subtitle: 'Obsidian Spire Final Takedown',
    category: 'ASSASSINATION',
    fixerName: '幽灵 · Wraith',
    fixerRole: '前议会深层内线',
    fixerPos: { x: 65, z: -24 },
    difficulty: 3,
    baseReward: 18000,
    repReward: 550,
    parTimeSec: 130,
    timeLimitSec: 240,
    briefing:
      '终局行动！当年亲手嫁祸你的「黑曜石主教」正躲在西北外环摩天大楼「黑曜石议会大厦」广场。黑入激光门禁、清理精英卫队并斩首主教，夺回总账密钥后直奔东南角「自由港灯塔停机坪」乘机撤离！',
    steps: [
      {
        id: 'spire-nav',
        title: '突袭黑曜石大厦',
        instruction: '沿 GPS 全速赶往西北外环「黑曜石议会大厦」正门广场',
        type: 'NAVIGATE',
        targetPos: { x: -105, z: -96 },
        radius: 8,
        beaconColor: 0xf43f5e,
      },
      {
        id: 'spire-crack',
        title: '黑入议会激光门禁',
        instruction: '靠近议会安防终端按 [E] 完成三针同步解码（警惕精英卫队火力）',
        type: 'SAFE_CRACK',
        targetPos: { x: -105, z: -102 },
        radius: 4.5,
        beaconColor: 0x38bdf8,
      },
      {
        id: 'spire-elim',
        title: '清除黑曜石主教',
        instruction: '使用武器击倒白金西装目标「黑曜石主教」',
        type: 'ELIMINATE_TARGET',
        targetPos: { x: -105, z: -99 },
        radius: 14,
        beaconColor: 0xf43f5e,
      },
      {
        id: 'spire-intel',
        title: '夺回总账密钥箱',
        instruction: '靠近主教掉落点按 [E] 回收《灰烬账本》母盘密钥箱',
        type: 'HACK_BRIEFCASE',
        targetPos: { x: -105, z: -99 },
        radius: 4.5,
        beaconColor: 0x38bdf8,
      },
      {
        id: 'spire-escape',
        title: '灯塔停机坪大撤离',
        instruction: '全城最高警戒！火速穿城抵达东南角「自由港灯塔停机坪」完成终局撤离',
        type: 'ESCAPE_ZONE',
        targetPos: { x: 105, z: 97 },
        radius: 7.5,
        beaconColor: 0xfbbf24,
      },
    ],
  },
];

export function createInitialMissionRuntime(): MissionRuntimeState {
  return {
    activeMissionId: null,
    currentStepIndex: 0,
    lootCollected: 0,
    lootRequired: 2,
    targetEliminated: false,
    safeCracked: false,
    metrics: {
      elapsedSec: 0,
      damageTaken: 0,
      maxWantedReached: 0,
      enemiesNeutralized: 0,
      accuracyBonus: true,
    },
    completedMissionIds: [],
  };
}

export function getMissionById(id: string | null): MissionDefinition | null {
  if (!id) return null;
  return MISSIONS.find((m) => m.id === id) ?? null;
}

export function acceptMissionState(
  prev: MissionRuntimeState,
  missionId: string
): MissionRuntimeState {
  const mission = getMissionById(missionId);
  if (!mission) return prev;
  return {
    ...prev,
    activeMissionId: missionId,
    currentStepIndex: 0,
    lootCollected: 0,
    lootRequired: missionId === 'bank_heist' ? 2 : 0,
    targetEliminated: false,
    safeCracked: false,
    metrics: {
      elapsedSec: 0,
      damageTaken: 0,
      maxWantedReached: 0,
      enemiesNeutralized: 0,
      accuracyBonus: true,
    },
  };
}

export function advanceMissionStep(prev: MissionRuntimeState): {
  next: MissionRuntimeState;
  completed: boolean;
} {
  const mission = getMissionById(prev.activeMissionId);
  if (!mission) return { next: prev, completed: false };

  const nextIdx = prev.currentStepIndex + 1;
  if (nextIdx >= mission.steps.length) {
    const completedSet = prev.completedMissionIds.includes(mission.id)
      ? prev.completedMissionIds
      : [...prev.completedMissionIds, mission.id];

    return {
      next: {
        ...prev,
        activeMissionId: null,
        currentStepIndex: 0,
        completedMissionIds: completedSet,
      },
      completed: true,
    };
  }

  return {
    next: {
      ...prev,
      currentStepIndex: nextIdx,
    },
    completed: false,
  };
}

export function calculateMissionReward(
  mission: MissionDefinition,
  metrics: MissionMetrics
): RewardBreakdown {
  const basePayout = mission.baseReward;
  const secondsSaved = Math.max(0, Math.round(mission.parTimeSec - metrics.elapsedSec));
  const timeBonus = Math.min(3500, secondsSaved * 45);
  const stealthBonus = metrics.maxWantedReached <= 2 ? 1500 : metrics.maxWantedReached === 3 ? 600 : 0;
  const combatBonus = Math.min(1800, metrics.enemiesNeutralized * 300);
  const medicalDeduction = Math.min(
    Math.round(basePayout * 0.25),
    Math.round(metrics.damageTaken * 18)
  );

  const totalPayout = Math.max(
    1500,
    basePayout + timeBonus + stealthBonus + combatBonus - medicalDeduction
  );

  const scoreRatio = totalPayout / basePayout;
  let rankGrade: RewardBreakdown['rankGrade'] = 'B';
  if (scoreRatio >= 1.28 && metrics.damageTaken <= 25) rankGrade = 'S';
  else if (scoreRatio >= 1.12) rankGrade = 'A';
  else if (scoreRatio < 0.95) rankGrade = 'C';

  const repMultiplier = rankGrade === 'S' ? 1.35 : rankGrade === 'A' ? 1.15 : rankGrade === 'B' ? 1.0 : 0.85;
  const repEarned = Math.round(mission.repReward * repMultiplier);

  return {
    missionId: mission.id,
    missionTitle: mission.title,
    basePayout,
    timeBonus,
    stealthBonus,
    combatBonus,
    medicalDeduction,
    totalPayout,
    repEarned,
    rankGrade,
    elapsedSec: Math.round(metrics.elapsedSec),
  };
}

export function getRankTitle(rep: number): string {
  if (rep >= 1800) return '自由港之王 · Vice Legend';
  if (rep >= 1200) return '都市教父 · Crime Boss';
  if (rep >= 750) return '帮派执行官 · Enforcer';
  if (rep >= 350) return '职业枪手 · Professional';
  if (rep >= 100) return '街头跑腿 · Hustler';
  return '无名新手 · Rookie';
}
