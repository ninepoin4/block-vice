import { CutsceneCategory } from './types';

export interface PrologueScene {
  id: string;
  chapterLabel: string;
  title: string;
  narration: string;
  speaker: string;
  durationSec: number;
  visualTheme: 'skyline' | 'betrayal' | 'syndicate' | 'ledger' | 'showdown' | 'radio';
  accentColor: string;
}

export interface CutsceneShot {
  id: string;
  durationSec: number;
  locationTag: string;
  speaker: string;
  subtitle: string;
  camStart: [number, number, number];
  camEnd: [number, number, number];
  lookStart: [number, number, number];
  lookEnd: [number, number, number];
}

export interface CutsceneSequence {
  id: string;
  category: CutsceneCategory;
  title: string;
  shots: CutsceneShot[];
}

export const PROLOGUE_SCENES: PrologueScene[] = [
  {
    id: 'scene-city',
    chapterLabel: '序幕 01 · 宏大都市',
    title: '三倍扩张的像素港城 · BLOCK VICE',
    narration:
      '自由港城已扩张至 8×8 六十四座街区。内环霓虹闪烁，外环矗立着黑曜石议会大厦、九龙赌场、黑钢精炼厂与灯塔停机坪——整座港城都是你的猎场。',
    speaker: '旁白 · 都市档案',
    durationSec: 5.2,
    visualTheme: 'skyline',
    accentColor: '#38bdf8',
  },
  {
    id: 'scene-betrayal',
    chapterLabel: '序幕 02 · 陷害',
    title: '三年前的《灰烬账本》',
    narration:
      '你曾是议会最年轻的首席清算审计官，代号「零号」。当你发现议会私吞 1,200 万黑金债券的证据时，却被同僚反咬嫁祸，一夜之间沦为全城通缉犯。',
    speaker: '零号 · 主角回忆',
    durationSec: 5.2,
    visualTheme: 'betrayal',
    accentColor: '#f43f5e',
  },
  {
    id: 'scene-syndicate',
    chapterLabel: '序幕 03 · 暗影帝国',
    title: '外环工业与暗金动脉',
    narration:
      '三年过去，议会已将触手伸向外环：黑钢重工精炼厂夜间押运加密冷钱包服务器，九龙霓虹赌场则负责将血钱洗白，重重警网封锁了港城四境。',
    speaker: '铁锤 · 外环线人',
    durationSec: 5.2,
    visualTheme: 'syndicate',
    accentColor: '#f97316',
  },
  {
    id: 'scene-ledger',
    chapterLabel: '序幕 04 · 破局',
    title: '五把钥匙与反击链条',
    narration:
      '想要彻底清算黑曜石议会，必须串联五项行动：破门太平洋银行、清剿翡翠楼叛徒、截获码头走私跑车、强劫重工装甲车队，并攻入西北议会大厦！',
    speaker: '老K · 情报推演',
    durationSec: 5.2,
    visualTheme: 'ledger',
    accentColor: '#fbbf24',
  },
  {
    id: 'scene-showdown',
    chapterLabel: '序幕 05 · 黎明决战',
    title: '黑曜石主教与灯塔撤离',
    narration:
      '议会副首领「黑曜石主教」把守着总账母盘密钥，藏身于城北最高摩天大楼顶端。一旦得手，全城警笛将同时响起——只有冲到东南灯塔停机坪才能杀出血路。',
    speaker: '幽灵 · 前议会内线',
    durationSec: 5.2,
    visualTheme: 'showdown',
    accentColor: '#a855f7',
  },
  {
    id: 'scene-radio',
    chapterLabel: '序幕 06 · 集结',
    title: '全城频道已接通',
    narration:
      '「零号，欢迎回到中央大道。侦察机已经飞越内环与外环六大地标——先看清整座都市的战场坐标，随后按 [Tab] 或找街头联络人开火！」',
    speaker: '老K · Fixer K',
    durationSec: 4.5,
    visualTheme: 'radio',
    accentColor: '#34d399',
  },
];

export const IN_ENGINE_CUTSCENE_SHOTS: CutsceneShot[] = [
  {
    id: 'shot-bank',
    durationSec: 3.4,
    locationTag: '内环金融中心 · 太平洋体素银行',
    speaker: '老K（加密通话）',
    subtitle: '第一站：太平洋银行金库。议会的黑金债券就锁在门廊下的终端里——「OP-01 金库破门」。',
    camStart: [-22, 24, -18],
    camEnd: [-40, 14, -27],
    lookStart: [-45, 7, -45],
    lookEnd: [-45, 2, -41],
  },
  {
    id: 'shot-jade',
    durationSec: 3.4,
    locationTag: '内环唐人街 · 翡翠霓虹楼',
    speaker: '影刃（夜枭情报）',
    subtitle: '第二站：翡翠楼灯笼广场。叛徒「白衣蛇头」在此接应黑市交易——「OP-02 霓虹暗杀」。',
    camStart: [26, 18, -22],
    camEnd: [43, 10, -28],
    lookStart: [45, 5, -45],
    lookEnd: [45, 1.5, -40],
  },
  {
    id: 'shot-cargo',
    durationSec: 3.2,
    locationTag: '内环海港 · 码头走私仓库',
    speaker: '涡轮（车手经纪）',
    subtitle: '第三站：码头仓库。那辆青色改装跑车里藏着账本解密芯片——「OP-03 极速走私」。',
    camStart: [28, 15, 30],
    camEnd: [41, 8, 28],
    lookStart: [44, 2, 18],
    lookEnd: [44, 1, 20],
  },
  {
    id: 'shot-refinery',
    durationSec: 3.6,
    locationTag: '西南外环 · 黑钢重工精炼厂',
    speaker: '铁锤（重工爆破手）',
    subtitle: '第四站：外环精炼厂高炉区。装甲押运车正装载冷钱包服务器待命，击退护卫抢下它——「OP-04 铁血劫车」。',
    camStart: [-82, 24, 78],
    camEnd: [-96, 13, 86],
    lookStart: [-105, 6, 105],
    lookEnd: [-105, 2, 99],
  },
  {
    id: 'shot-spire',
    durationSec: 3.8,
    locationTag: '西北外环 · 黑曜石议会大厦',
    speaker: '幽灵（前议会内线）',
    subtitle: '终极目标：全城最高摩天大楼「黑曜石大厦」。主教与精英卫队就在广场后方——「OP-05 议会斩首」。',
    camStart: [-78, 34, -74],
    camEnd: [-96, 17, -82],
    lookStart: [-105, 15, -106],
    lookEnd: [-105, 3, -99],
  },
  {
    id: 'shot-handoff',
    durationSec: 3.2,
    locationTag: '中央大道 · 联络会师点',
    speaker: '老K · Fixer K',
    subtitle: '五大合约与八区路网已同步至你的 GPS。按 [M] 查看全城版图，按 [Tab] 随时接单！',
    camStart: [16, 20, 24],
    camEnd: [2, 15, 22],
    lookStart: [5, 1.5, 6],
    lookEnd: [0, 1.2, 8],
  },
];

export const MID_GAME_CUTSCENES: Record<string, CutsceneSequence> = {
  // --- 1. 任务开始剧情动画 (Mission Start Cutscenes) ---
  start_bank_heist: {
    id: 'start_bank_heist',
    category: 'mission_start',
    title: 'OP-01 金库破门 · 行动部署',
    shots: [
      {
        id: 'start-bank-1',
        durationSec: 3.4,
        locationTag: '金融中心 · 太平洋体素银行外围',
        speaker: '老K · Fixer K（加密频道）',
        subtitle: '债券押运刚完成入库。潜入银行正门门廊，先用解码器破解电子金库锁！',
        camStart: [-28, 16, -22],
        camEnd: [-41, 10, -29],
        lookStart: [-45, 5, -45],
        lookEnd: [-45, 1.8, -42],
      },
    ],
  },
  start_neon_assassination: {
    id: 'start_neon_assassination',
    category: 'mission_start',
    title: 'OP-02 霓虹暗杀 · 线报锁定',
    shots: [
      {
        id: 'start-jade-1',
        durationSec: 3.4,
        locationTag: '霓虹唐人街 · 翡翠楼灯笼广场',
        speaker: '影刃 · Shadow',
        subtitle: '「白衣蛇头」和他的保镖已经现身翡翠楼前。干掉他，把加密手提箱带去南区地铁口！',
        camStart: [30, 15, -24],
        camEnd: [42, 8.5, -29],
        lookStart: [45, 4, -44],
        lookEnd: [45, 1.6, -40],
      },
    ],
  },
  start_hot_cargo: {
    id: 'start_hot_cargo',
    category: 'mission_start',
    title: 'OP-03 极速走私 · 拦截指令',
    shots: [
      {
        id: 'start-cargo-1',
        durationSec: 3.4,
        locationTag: '海港码头 · 走私仓库货场',
        speaker: '涡轮 · Turbo',
        subtitle: '青色 Apex GT 就停在码头仓库南侧。按 [F] 抢下方向盘，冲过两个街头检查点把车开进地下车库！',
        camStart: [30, 14, 28],
        camEnd: [41, 7.5, 27],
        lookStart: [44, 2, 19],
        lookEnd: [44, 1.2, 20],
      },
    ],
  },
  start_convoy_ambush: {
    id: 'start_convoy_ambush',
    category: 'mission_start',
    title: 'OP-04 铁血劫车 · 猎杀车队',
    shots: [
      {
        id: 'start-convoy-1',
        durationSec: 3.0,
        locationTag: '西区联络点 · 铁锤接头',
        speaker: '铁锤 · Hammer',
        subtitle: '「零号，议会的冷钱包服务器刚运抵西南外环黑钢精炼厂。重工卫队火力很猛，先摸过去！」',
        camStart: [-54, 7.5, 31],
        camEnd: [-60, 4.5, 29],
        lookStart: [-65, 1.6, 24],
        lookEnd: [-65, 1.5, 24],
      },
      {
        id: 'start-convoy-2',
        durationSec: 3.6,
        locationTag: '西南外环 · 黑钢重工精炼厂北场',
        speaker: '铁锤 · 战术侦察',
        subtitle: '看到那辆黑色装甲押运车了吗？抢到车后一路冲向东北角九龙霓虹赌场，切碎议会的洗钱动脉！',
        camStart: [-86, 20, 82],
        camEnd: [-97, 10, 89],
        lookStart: [-105, 5, 106],
        lookEnd: [-105, 1.8, 99],
      },
    ],
  },
  start_obsidian_takedown: {
    id: 'start_obsidian_takedown',
    category: 'mission_start',
    title: 'OP-05 议会斩首 · 终局命令',
    shots: [
      {
        id: 'start-spire-1',
        durationSec: 3.0,
        locationTag: '东区暗影街头 · 幽灵接头',
        speaker: '幽灵 · Wraith',
        subtitle: '「时机到了。三年前篡改账本嫁祸你的黑曜石主教，今晚就在西北议会大厦正门设防。」',
        camStart: [55, 7.5, -31],
        camEnd: [60, 4.5, -29],
        lookStart: [65, 1.6, -24],
        lookEnd: [65, 1.5, -24],
      },
      {
        id: 'start-spire-2',
        durationSec: 3.8,
        locationTag: '西北外环 · 黑曜石议会大厦',
        speaker: '幽灵 · 加密通讯',
        subtitle: '黑入激光门禁、斩首主教并夺回母盘密钥，随后全城突围前往东南角自由港灯塔停机坪！',
        camStart: [-84, 10, -78],
        camEnd: [-95, 32, -84],
        lookStart: [-105, 4, -104],
        lookEnd: [-105, 18, -108],
      },
    ],
  },

  // --- 2. 任务中强制触发剧情动画 (Mid-Mission Mandatory Cutscenes) ---
  mid_bank_breach: {
    id: 'mid_bank_breach',
    category: 'mid_mission',
    title: '剧情强切 · 金库警报拉响',
    shots: [
      {
        id: 'mid-bank-1',
        durationSec: 2.8,
        locationTag: '太平洋银行 · 金库门廊',
        speaker: '零号 · 行动反馈',
        subtitle: '机械密码锁彻底弹开！两袋高额不记名债券现金已暴露在广场台阶前！',
        camStart: [-45, 3.8, -36],
        camEnd: [-41, 6.2, -31],
        lookStart: [-45, 1.2, -41],
        lookEnd: [-41, 0.8, -38.5],
      },
      {
        id: 'mid-bank-2',
        durationSec: 2.8,
        locationTag: '金融中心警戒区 · VCPD 响应',
        speaker: '老K（紧急插播）',
        subtitle: '静音警报已触发，市警巡逻车正在封锁金融大道！立刻扫光现金袋驱车逃往海港安全屋！',
        camStart: [-34, 14, -22],
        camEnd: [-46, 18, -20],
        lookStart: [-43, 2, -39],
        lookEnd: [-43, 1.5, -39],
      },
    ],
  },
  mid_convoy_intercept: {
    id: 'mid_convoy_intercept',
    category: 'mid_mission',
    title: '剧情强切 · 重工车队遭遇战',
    shots: [
      {
        id: 'mid-convoy-1',
        durationSec: 3.0,
        locationTag: '黑钢精炼厂 · 装甲装卸区',
        speaker: '铁锤（高爆频道）',
        subtitle: '「已目视目标车队！三名重工雇佣兵正守在押运车周围——他们发现你了！」',
        camStart: [-94, 8.5, 88],
        camEnd: [-112, 6.5, 92],
        lookStart: [-105, 1.8, 99],
        lookEnd: [-105, 1.5, 99],
      },
      {
        id: 'mid-convoy-2',
        durationSec: 2.8,
        locationTag: '装甲押运车 · 强夺目标',
        speaker: '零号 · 行动准备',
        subtitle: '放倒护卫或顶着火力靠近押运车驾驶室，按 [F] 强行接管方向盘冲出高炉区！',
        camStart: [-114, 5.2, 102],
        camEnd: [-98, 9.0, 94],
        lookStart: [-105, 1.6, 99],
        lookEnd: [-105, 1.5, 97],
      },
    ],
  },
  mid_bishop_confrontation: {
    id: 'mid_bishop_confrontation',
    category: 'mid_mission',
    title: '剧情强切 · 黑曜石主教现身',
    shots: [
      {
        id: 'mid-bishop-1',
        durationSec: 3.2,
        locationTag: '黑曜石议会大厦 · 激光门禁突破',
        speaker: '黑曜石主教 · Bishop',
        subtitle: '「零号……三年前在金库爆炸里居然没烧死你？不过你还是自己送上门来了。」',
        camStart: [-96, 5.5, -89],
        camEnd: [-103.5, 3.2, -93.5],
        lookStart: [-105, 1.8, -101],
        lookEnd: [-105, 1.6, -99],
      },
      {
        id: 'mid-bishop-2',
        durationSec: 3.0,
        locationTag: '议会前庭广场 · 最终交火触发',
        speaker: '零号 · 主角台词',
        subtitle: '「废话少说，主教。把《灰烬账本》总账密钥交出来——今天全城都会知道议会的真面目！」',
        camStart: [-112, 4.5, -94],
        camEnd: [-105, 11, -87],
        lookStart: [-105, 1.8, -99],
        lookEnd: [-105, 1.5, -99],
      },
    ],
  },

  // --- 3. 任务完成剧情动画 (Mission Completion & Extraction Cutscenes) ---
  complete_convoy_ambush: {
    id: 'complete_convoy_ambush',
    category: 'mission_complete',
    title: '合约完成 · 九龙赌场服务器入库',
    shots: [
      {
        id: 'comp-convoy-1',
        durationSec: 3.2,
        locationTag: '九龙霓虹赌场 · 后院洗钱卸货区',
        speaker: '铁锤 · Hammer',
        subtitle: '「漂亮极了！黑曜石的冷钱包服务器已经物理接入赌场地下机房——议会一半流动资金冻结！」',
        camStart: [92, 7.5, -86],
        camEnd: [117, 11, -88],
        lookStart: [105, 2.2, -98],
        lookEnd: [105, 4.5, -104],
      },
    ],
  },
  complete_obsidian_takedown: {
    id: 'complete_obsidian_takedown',
    category: 'mission_complete',
    title: '终局撤离 · 自由港灯塔升空',
    shots: [
      {
        id: 'comp-spire-1',
        durationSec: 3.6,
        locationTag: '东南角 · 自由港灯塔停机坪',
        speaker: '幽灵 · Wraith（接应直升机）',
        subtitle: '「总账母盘上传完成！全城暗网同时广播黑曜石议会的洗钱证据——快登机，警笛已经被甩在港湾后方了！」',
        camStart: [89, 14.5, 92],
        camEnd: [119, 19, 95],
        lookStart: [104, 12.5, 107],
        lookEnd: [104, 17, 107],
      },
      {
        id: 'comp-spire-2',
        durationSec: 3.6,
        locationTag: '自由港城夜空 · 灰烬账本终章',
        speaker: '零号 · 主角独白',
        subtitle: '「三年流亡到此为止。自由港城的霓虹今晚不再属于黑曜石议会——结算时刻到了。」',
        camStart: [120, 26, 86],
        camEnd: [76, 44, 62],
        lookStart: [104, 15, 107],
        lookEnd: [0, 8, 0],
      },
    ],
  },
  complete_default: {
    id: 'complete_default',
    category: 'mission_complete',
    title: '合约完成 · 安全脱身',
    shots: [
      {
        id: 'comp-def-1',
        durationSec: 3.0,
        locationTag: '自由港安全接应区',
        speaker: '联络人 · 加密结算通道',
        subtitle: '货物与情报已安全入库，警队追踪信号已干扰切断。正在核算行动评级与黑金赏金！',
        camStart: [16, 12, 16],
        camEnd: [-12, 16, 18],
        lookStart: [0, 1.5, 0],
        lookEnd: [0, 2.0, 0],
      },
    ],
  },
};

export function getMissionStartCutscene(missionId: string): CutsceneSequence | null {
  return MID_GAME_CUTSCENES[`start_${missionId}`] ?? null;
}

export function getMissionCompleteCutscene(missionId: string, anchorPos?: { x: number; z: number }): CutsceneSequence {
  const exact = MID_GAME_CUTSCENES[`complete_${missionId}`];
  if (exact) return exact;
  const ax = anchorPos?.x ?? 0;
  const az = anchorPos?.z ?? 0;
  return {
    ...MID_GAME_CUTSCENES.complete_default,
    shots: [
      {
        id: `comp-${missionId}-1`,
        durationSec: 3.0,
        locationTag: '自由港安全接应区 · 撤离成功',
        speaker: '联络人 · 加密结算通道',
        subtitle: '目标已顺利交割，警队追踪信号已被彻底清除。正在结算本次行动赏金与街头声望！',
        camStart: [ax + 12, 10, az + 14],
        camEnd: [ax - 12, 16, az + 18],
        lookStart: [ax, 1.6, az],
        lookEnd: [ax, 2.2, az],
      },
    ],
  };
}

export interface EvaluatedCutsceneFrame {
  finished: boolean;
  shotIndex: number;
  totalShots: number;
  progressPct: number;
  shot: CutsceneShot;
  camPos: [number, number, number];
  lookAt: [number, number, number];
}

export function getTotalCutsceneDuration(shots: CutsceneShot[] = IN_ENGINE_CUTSCENE_SHOTS): number {
  return shots.reduce((acc, s) => acc + s.durationSec, 0);
}

export function evaluateCutsceneAtTime(
  elapsedSec: number,
  shots: CutsceneShot[] = IN_ENGINE_CUTSCENE_SHOTS
): EvaluatedCutsceneFrame {
  const total = getTotalCutsceneDuration(shots);
  const clamped = Math.max(0, elapsedSec);

  if (clamped >= total) {
    const last = shots[shots.length - 1];
    return {
      finished: true,
      shotIndex: shots.length - 1,
      totalShots: shots.length,
      progressPct: 100,
      shot: last,
      camPos: last.camEnd,
      lookAt: last.lookEnd,
    };
  }

  let acc = 0;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (clamped < acc + shot.durationSec || i === shots.length - 1) {
      const localT = Math.min(1, Math.max(0, (clamped - acc) / shot.durationSec));
      const eased = localT * localT * (3 - 2 * localT);
      const lerp3 = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [
        a[0] + (b[0] - a[0]) * eased,
        a[1] + (b[1] - a[1]) * eased,
        a[2] + (b[2] - a[2]) * eased,
      ];
      return {
        finished: false,
        shotIndex: i,
        totalShots: shots.length,
        progressPct: Math.round((clamped / total) * 100),
        shot,
        camPos: lerp3(shot.camStart, shot.camEnd),
        lookAt: lerp3(shot.lookStart, shot.lookEnd),
      };
    }
    acc += shot.durationSec;
  }

  const first = shots[0];
  return {
    finished: false,
    shotIndex: 0,
    totalShots: shots.length,
    progressPct: 0,
    shot: first,
    camPos: first.camStart,
    lookAt: first.lookStart,
  };
}

export function getStoryLedgerStatus(completedIds: string[]): {
  cluesRecovered: number;
  totalClues: number;
  isFinaleUnlocked: boolean;
  summaryText: string;
} {
  const unique = new Set(completedIds);
  const count = unique.size;
  const total = 5;
  if (count >= total) {
    return {
      cluesRecovered: count,
      totalClues: total,
      isFinaleUnlocked: true,
      summaryText: '《灰烬账本》已完整重组，黑曜石议会金融网络与外环防线彻底崩盘！',
    };
  }
  return {
    cluesRecovered: count,
    totalClues: total,
    isFinaleUnlocked: false,
    summaryText: `《灰烬账本》线索回收进度：${count}/${total} 关键节点`,
  };
}
