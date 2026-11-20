// Core game rules, palette, relics & live-hydrated room/world registries (populated by levelLoader.js from data/rooms/*.json)

export const COLORS = {
  ink: '#080b11',
  parchment: '#d8cfb8',
  gold: '#f59e0b',
  goldBright: '#fde047',
  crimson: '#dc2626',
  crimsonBright: '#f87171',
  cyan: '#38bdf8',
  cyanBright: '#bae6fd'
};

export const RELICS = [
  {
    id: 'thorn',
    name: '噬痛荆棘',
    desc: '标准弹反窗口 (140ms)；普通格挡产生的内伤灰血持续加倍，挥刀命中可大幅吸回实血。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.0,
    parryReflectDmg: 0,
    grayDuration: 5.5,
    rallyMult: 1.65,
    maxFlasks: 3,
    execHealPct: 0.12
  },
  {
    id: 'mirror',
    name: '碎镜之眼',
    desc: '极限打铁流：弹反窗口收窄至 100ms，但完美弹反附带反伤并造成 1.6 倍架势摧毁。',
    parryWindowMs: 100,
    blockWindowMs: 220,
    parryPostureMult: 1.6,
    parryReflectDmg: 16,
    grayDuration: 3.0,
    rallyMult: 1.0,
    maxFlasks: 3,
    execHealPct: 0.12
  },
  {
    id: 'ember',
    name: '孤灯余烬',
    desc: '处决续航流：灯油上限减 1（共 2 瓶），但每次成功处决立刻回复 35% 最大生命并充满魂火。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.15,
    parryReflectDmg: 4,
    grayDuration: 3.6,
    rallyMult: 1.15,
    maxFlasks: 2,
    execHealPct: 0.35
  },
  {
    id: 'bellthread',
    name: '幽丝断钟',
    desc: '隐藏圣物 · 机动法术流：幽丝钩索冷却减半 (0.28s)，幽鸣灵刃魂耗降至 22 且额外摧毁架势。',
    parryWindowMs: 130,
    blockWindowMs: 250,
    parryPostureMult: 1.15,
    parryReflectDmg: 0,
    grayDuration: 3.4,
    rallyMult: 1.1,
    maxFlasks: 3,
    execHealPct: 0.15,
    grappleCd: 0.28,
    spellCost: 22,
    spellPostureBonus: 12,
    hidden: true
  },
  {
    id: 'bellcore',
    name: '古钟心核',
    desc: '苍穹秘宝 · 终极打铁流：墨印上限增至 4 枚，每次完美弹反回复 6 点生命，居合与断钟返伤害提升 25%。',
    parryWindowMs: 145,
    blockWindowMs: 265,
    parryPostureMult: 1.25,
    parryReflectDmg: 6,
    parryHeal: 6,
    grayDuration: 4.0,
    rallyMult: 1.25,
    maxFlasks: 3,
    maxSeals: 4,
    heavySkillMult: 1.25,
    execHealPct: 0.20,
    hidden: true
  },
  {
    id: 'clapper',
    name: '回响钟舌',
    desc: '共鸣秘宝 · 法术震域流：魂火获取 +35%，灵刃与镇魂钟鸣伤害 +30% 且范围扩大 25%，钟鸣耗魂降至 30。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.05,
    parryReflectDmg: 0,
    grayDuration: 3.4,
    rallyMult: 1.0,
    maxFlasks: 3,
    execHealPct: 0.14,
    soulGainMult: 1.35,
    spellDmgMult: 1.30,
    spellRadiusMult: 1.25,
    quakeCost: 30,
    bellTimerBonus: 2.5,
    hidden: true
  },
  {
    id: 'ironheart',
    name: '裂钟铁心',
    desc: '深井秘宝 · 重势破防流：全招式架势摧毁 +25%，居合一闪蓄力大幅缩短 (0.30s)，内伤灰血持续 +1.5 秒。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.25,
    parryReflectDmg: 5,
    grayDuration: 4.5,
    grayDurationBonus: 1.5,
    rallyMult: 1.15,
    maxFlasks: 3,
    execHealPct: 0.16,
    postureDmgMult: 1.25,
    iaiChargeTime: 0.30,
    hidden: true
  }
];

export const GRAVITY = 1580;
export const MAP_COLS = 44;
export const MAP_ROWS = 10;

// Live ES Module bindings updated automatically when levelLoader.js hydrates data/world.json + data/rooms/*.json
export let WORLD_W = 6740;
export let WORLD_H = 1520;
export let FLOOR_Y = 580;
export let WELL_BOTTOM_Y = 1380;
export let MAP_CELL_W = WORLD_W / MAP_COLS;
export let MAP_CELL_H = WORLD_H / MAP_ROWS;

export function setWorldMetrics(w, h, floorY, wellBottomY) {
  WORLD_W = Math.max(960, Number(w) || 6740);
  WORLD_H = Math.max(720, Number(h) || 1520);
  FLOOR_Y = Number(floorY) || 580;
  WELL_BOTTOM_Y = Number(wellBottomY) || 1380;
  MAP_CELL_W = WORLD_W / MAP_COLS;
  MAP_CELL_H = WORLD_H / MAP_ROWS;
}

// Live mutable world registries hydrated from data/rooms/*.json
export const ROOMS = [];
export const SOLIDS = [];
export const ALTARS = [];
export const ALTAR_POS = { id: 'altar_start', x: 330, y: 580 };
export const LORE_TABLETS = [];
export const SHORTCUT_GATE_DEF = { id: 'gate_skyway', x: 1380, y: 0, w: 0, h: 0, leverX: 1495, leverY: 245 };
export const CHAPEL_EXIT_GATE_DEF = { id: 'gate_chapel_exit', x: 3740, y: 480, w: 0, h: 0 };
export const FOUNDRY_ENTRY_GATE_DEF = { id: 'gate_foundry_entry', x: 5540, y: 1240, w: 0, h: 0 };
export const SECRET_WALLS_DEF = [];
export const PICKUPS_DEF = [];
export const RESONANCE_PUZZLES_DEF = [];
export const CRUMBLE_PLATFORMS_DEF = [];
export const PENDULUMS = [];
export const ABYSSAL_RIVERS = [];
export const ABYSSAL_RIVER = { x: 4180, w: 0, y: 1368 };
export const WALL_INSCRIPTIONS = [];
export const GRAPPLE_ANCHORS = [];
export const LANTERNS_DEF = [];
export const ENEMIES_DEF = [];
export const BOSSES_DEF = {};
export const PUDDLES = [];
export const BANNERS = [];
export const CANDLE_CLUSTERS = [];
export const BONE_CAIRNS = [];

export const SAVE_KEY = 'ashen_bell_vow_save_v10';
export const LEGACY_SAVE_KEY_V9 = 'ashen_bell_vow_save_v9';
export const LEGACY_SAVE_KEY_V8 = 'ashen_bell_vow_save_v8';
export const PREVIEW_STORAGE_KEY = 'ashen_bell_vow_editor_preview_v11';

export const ROOM_THEMES = {
  sanctuary: {
    label: '熄灯冷境',
    skyTop: [8, 14, 26],
    skyMid: [16, 28, 44],
    skyBot: [5, 9, 16],
    mist: [14, 28, 46],
    accent: [56, 189, 248],
    weather: 'ash'
  },
  corridor: {
    label: '墨雨长廊',
    skyTop: [9, 13, 21],
    skyMid: [18, 24, 35],
    skyBot: [6, 9, 14],
    mist: [12, 18, 28],
    accent: [182, 200, 222],
    weather: 'rain'
  },
  chapel: {
    label: '绯灰圣殿',
    skyTop: [19, 11, 18],
    skyMid: [31, 16, 25],
    skyBot: [9, 5, 10],
    mist: [30, 12, 19],
    accent: [248, 113, 113],
    weather: 'snow'
  },
  bell_well: {
    label: '碧渊潮雾',
    skyTop: [5, 13, 21],
    skyMid: [10, 27, 40],
    skyBot: [4, 8, 14],
    mist: [12, 44, 64],
    accent: [56, 189, 248],
    weather: 'mist'
  },
  foundry: {
    label: '熔金古炉',
    skyTop: [24, 12, 10],
    skyMid: [44, 20, 12],
    skyBot: [12, 6, 5],
    mist: [48, 22, 10],
    accent: [245, 158, 11],
    weather: 'embers'
  }
};

export const ECHO_GRADE_ORDER = { 'B': 1, 'A': 2, 'S': 3, 'S+': 4 };
