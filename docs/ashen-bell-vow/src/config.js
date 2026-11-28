// Core game rules, palette, relics & live-hydrated room/world registries (populated by levelLoader.js from data/rooms/*.json)

export const COLORS = {
  ink: '#080b11',
  parchment: '#d8cfb8',
  gold: '#f59e0b',
  goldBright: '#fde047',
  crimson: '#dc2626',
  crimsonBright: '#f87171',
  cyan: '#38bdf8',
  cyanBright: '#bae6fd',
  violet: '#a855f7',
  violetBright: '#d8b4fe'
};

export const RELIC_REFINE_COST = 450;

export const RELICS = [
  {
    id: 'thorn',
    name: '噬痛荆棘',
    tag: '抢血续航',
    effect: '灰血留存翻倍 · 攻击吸血 +65%',
    refinedEffect: '灰血留存 6.8s · 攻击吸血 +105% · 处决回血 16%',
    shortEffect: '灰血×2 · 吸血+65%',
    shortRefined: '灰血6.8s · 吸血+105%',
    usage: '格挡吃内伤后立刻挥刀吸回实血',
    desc: '灰血留存翻倍，挥刀强效吸回实血。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.0,
    parryReflectDmg: 0,
    grayDuration: 5.5,
    rallyMult: 1.65,
    maxFlasks: 3,
    execHealPct: 0.12,
    refined: {
      grayDuration: 6.8,
      rallyMult: 2.05,
      execHealPct: 0.16
    }
  },
  {
    id: 'mirror',
    name: '碎镜之眼',
    tag: '极限弹反',
    effect: '弹反削势 ×1.6 + 反伤 16（窗口 100ms）',
    refinedEffect: '弹反削势 ×1.85 + 反伤 26（窗口 112ms）',
    shortEffect: '弹反削势×1.6 · 反伤16',
    shortRefined: '弹反×1.85 · 112ms/反26',
    usage: '抓金芒精准打铁，极速震崩首领架势',
    desc: '弹反窗口 100ms，完美弹反附带反伤与 1.6 倍削势。',
    parryWindowMs: 100,
    blockWindowMs: 220,
    parryPostureMult: 1.6,
    parryReflectDmg: 16,
    grayDuration: 3.0,
    rallyMult: 1.0,
    maxFlasks: 3,
    execHealPct: 0.12,
    refined: {
      parryWindowMs: 112,
      blockWindowMs: 235,
      parryPostureMult: 1.85,
      parryReflectDmg: 26
    }
  },
  {
    id: 'ember',
    name: '孤灯余烬',
    tag: '处决回满',
    effect: '处决回血 35% + 回满魂火（灯油 -1）',
    refinedEffect: '处决回血 48% + 回满魂火 · 弹反削势 ×1.28 / 反伤 10',
    shortEffect: '处决回血35%+满魂',
    shortRefined: '处决回血48% · 弹反×1.28',
    usage: '打崩敌方架势近身处决，以战养战',
    desc: '灯油 -1，处决立刻回血 35% 并回满魂火。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.15,
    parryReflectDmg: 4,
    grayDuration: 3.6,
    rallyMult: 1.15,
    maxFlasks: 2,
    execHealPct: 0.35,
    refined: {
      execHealPct: 0.48,
      parryPostureMult: 1.28,
      parryReflectDmg: 10
    }
  },
  {
    id: 'bellthread',
    name: '幽丝断钟',
    tag: '钩索灵刃',
    effect: '钩索冷却减半 · 灵刃耗魂降至 22',
    refinedEffect: '钩索冷却 0.20s · 灵刃耗魂 18 · 法术削势 +20',
    shortEffect: '钩索冷却半减 · 灵刃22魂',
    shortRefined: '钩索0.20s · 灵刃18魂',
    usage: '高频钩跃追击，穿插灵刃远程破势',
    hint: '起点左上高空 · 钩索攀跃击碎暗墙',
    desc: '钩索冷却 0.28s，灵刃耗魂降至 22 并额外削势。',
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
    hidden: true,
    refined: {
      grappleCd: 0.20,
      spellCost: 18,
      spellPostureBonus: 20
    }
  },
  {
    id: 'bellcore',
    name: '古钟心核',
    tag: '终极打铁',
    effect: '墨印上限 4 · 弹反回血 6 · 居合/反击 +25%',
    refinedEffect: '墨印上限 4 · 弹反回血 10 / 反伤 12 · 居合/反击 +38%',
    shortEffect: '4墨印 · 弹反+6血 · 居合+25%',
    shortRefined: '4墨印 · 弹反+10血 · 居合+38%',
    usage: '弹反接断钟返或居合爆发，攒 4 印贴符',
    hint: '起点悬灯苍穹高阁 · 需「墨翼步」抵达',
    desc: '墨印上限 4，弹反回血 6，居合与断钟返增伤 25%。',
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
    hidden: true,
    refined: {
      parryPostureMult: 1.35,
      parryReflectDmg: 12,
      parryHeal: 10,
      heavySkillMult: 1.38
    }
  },
  {
    id: 'clapper',
    name: '回响钟舌',
    tag: '魂火震域',
    effect: '回魂 +35% · 法术伤害 +30% / 范围 +25%',
    refinedEffect: '回魂 +55% · 法术伤害 +46% / 范围 +38% · 钟鸣耗魂 26',
    shortEffect: '回魂+35% · 法伤+30%',
    shortRefined: '回魂+55% · 法伤+46%',
    usage: '多用 W+法术「镇魂钟鸣」范围清场破盾',
    hint: '枯骨长廊 · 限时齐鸣三口青铜共鸣钟',
    desc: '回魂 +35%，灵刃与镇魂钟鸣伤害 +30%、范围 +25%。',
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
    hidden: true,
    refined: {
      soulGainMult: 1.55,
      spellDmgMult: 1.46,
      spellRadiusMult: 1.38,
      quakeCost: 26
    }
  },
  {
    id: 'ironheart',
    name: '裂钟铁心',
    tag: '速蓄居合',
    effect: '全招式削势 +25% · 居合蓄力缩至 0.30s',
    refinedEffect: '全招式削势 +38% · 弹反削势 ×1.36 · 居合蓄力 0.25s',
    shortEffect: '全削势+25% · 居合0.30s',
    shortRefined: '全削势+38% · 居合0.25s',
    usage: '长按攻击极速收刀居合，正面劈碎重盾',
    hint: '沉渊钟井上层 · 限时齐鸣三口青铜钟',
    desc: '全招式削势 +25%，居合蓄力缩至 0.30s。',
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
    hidden: true,
    refined: {
      parryPostureMult: 1.36,
      postureDmgMult: 1.38,
      iaiChargeTime: 0.25
    }
  },
  {
    id: 'shadecurtain',
    name: '幽影钟幕',
    tag: '穿影刺杀',
    effect: '穿身冷却 0.95s · 残爆 +55% · 穿敌回血 8',
    refinedEffect: '穿身冷却 0.72s · 残爆 +85% · 穿敌回血 13',
    shortEffect: '穿身0.95s · 残爆+55%',
    shortRefined: '穿身0.72s · 残爆+85%',
    usage: '按 Shift 穿透敌身引爆残爆并刷新闪避',
    hint: '起点最西侧暗蚀结界后 · 需「幽影穿身」',
    desc: '穿身冷却 0.95s，残爆 +55%，穿敌回血 8 并刷新闪避。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.05,
    parryReflectDmg: 0,
    grayDuration: 3.6,
    rallyMult: 1.15,
    maxFlasks: 3,
    execHealPct: 0.14,
    shadeDashCd: 0.95,
    shadeBurstMult: 1.55,
    shadePassHeal: 8,
    hidden: true,
    refined: {
      shadeDashCd: 0.72,
      shadeBurstMult: 1.85,
      shadePassHeal: 13
    }
  },
  {
    id: 'galefather',
    name: '朔风铃羽',
    tag: '御风凌空',
    effect: '移速 +12% · 空中/上挑/下劈伤害 +30%',
    refinedEffect: '移速 +18% · 空中/上挑/下劈伤害 +45% · 弹反削势 ×1.15',
    shortEffect: '移速+12% · 空中伤+30%',
    shortRefined: '移速+18% · 空中伤+45%',
    usage: '借罡风、二段跳或钩索升空连劈，居高临下压制强敌',
    hint: '绝风断塔 · 击败守誓精英「截风巡塔使 · 朔」后赐予',
    desc: '移动速度 +12%，空中攻击、上挑斩与下劈伤害 +30%。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.05,
    parryReflectDmg: 0,
    grayDuration: 3.5,
    rallyMult: 1.05,
    maxFlasks: 3,
    execHealPct: 0.14,
    moveSpeedBonus: 0.12,
    aerialDmgMult: 1.30,
    hidden: true,
    refined: {
      moveSpeedBonus: 0.18,
      aerialDmgMult: 1.45,
      parryPostureMult: 1.15
    }
  },
  {
    id: 'sporeseal',
    name: '枯根菌印',
    tag: '净孢反噬',
    effect: '免疫毒孢侵蚀 · 钟鸣净孢回魂 +22 并回血 8',
    refinedEffect: '免疫毒孢 · 净孢回魂 +32 / 回血 14 · 攻击吸血 +35%',
    shortEffect: '免毒孢 · 净孢+22魂/+8血',
    shortRefined: '免毒孢 · 净孢+32魂/+14血',
    usage: '穿行古林毒雾零伤，施放「镇魂钟鸣」净孢回魂续战',
    hint: '枯墨古林 · 击败守誓精英「盘根古钟精 · 枯」后赐予',
    desc: '完全免疫毒孢云侵蚀；镇魂钟鸣每净化一团毒孢云回复 22 魂火与 8 气血。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.1,
    parryReflectDmg: 0,
    grayDuration: 4.0,
    rallyMult: 1.2,
    maxFlasks: 3,
    execHealPct: 0.16,
    sporeImmune: true,
    sporePurifySoul: 22,
    sporePurifyHeal: 8,
    hidden: true,
    refined: {
      sporePurifySoul: 32,
      sporePurifyHeal: 14,
      rallyMult: 1.35
    }
  },
  {
    id: 'frostcore',
    name: '霜脊断魄',
    tag: '凝霜碎势',
    effect: '寒霜积蓄 -70% · 重击/居合/反击附加碎冰削势 +18',
    refinedEffect: '寒霜积蓄 -85% · 碎冰削势 +28 · 弹反反伤 12',
    shortEffect: '寒霜-70% · 重击碎冰+18势',
    shortRefined: '寒霜-85% · 碎冰+28势',
    usage: '直面霜脊寒流不惧冻伤，以重击与居合引爆冰晶碎裂',
    hint: '霜骸圣脊 · 击败守誓精英「断剑霜侯 · 凛」后赐予',
    desc: '寒霜积蓄速度降低 70%；重击、居合与断钟返触发碎冰震荡额外削势 +18。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.15,
    parryReflectDmg: 6,
    grayDuration: 3.6,
    rallyMult: 1.05,
    maxFlasks: 3,
    execHealPct: 0.15,
    frostResistMult: 0.30,
    frostShatterPosture: 18,
    hidden: true,
    refined: {
      frostResistMult: 0.15,
      frostShatterPosture: 28,
      parryReflectDmg: 12
    }
  },
  {
    id: 'tidebell',
    name: '退潮沉钟印',
    tag: '泄洪共鸣',
    effect: '法术/下砸范围 +18% · 潮湿导电回魂 +12 · 暗河泄洪后法伤 +16% 且耗魂 -4',
    refinedEffect: '范围 +26% · 导电回魂 +18 · 暗河泄洪后法伤 +24% 且耗魂 -6',
    shortEffect: '法术+18%范围 · 泄洪法伤+16%/耗-4',
    shortRefined: '法术+26%范围 · 泄洪法伤+24%/耗-6',
    usage: '排干全境暗河后唤醒沉渊共鸣，大幅强化镇魂钟鸣与镇岳下砸',
    hint: '沉钟水牢 · 开启暗河泄洪闸后于「断索水闸」干涸河底拾得',
    desc: '沉于水牢河底的青铜泄洪古印：扩大法术与下砸范围 18%，潮湿导电额外回魂 12；一旦开启暗河泄洪青铜闸，常驻法术与下砸伤害 +16%、法术耗魂 -4。',
    parryWindowMs: 140,
    blockWindowMs: 260,
    parryPostureMult: 1.05,
    parryReflectDmg: 0,
    grayDuration: 3.4,
    rallyMult: 1.0,
    maxFlasks: 3,
    execHealPct: 0.14,
    spellRadiusMult: 1.18,
    wetConductSoul: 12,
    drainedSpellDmgMult: 1.16,
    drainedSpellCostReduce: 4,
    hidden: true,
    refined: {
      spellRadiusMult: 1.26,
      wetConductSoul: 18,
      drainedSpellDmgMult: 1.24,
      drainedSpellCostReduce: 6
    }
  }
];

export const GRAVITY = 1580;
export const MAP_COLS = 52;
export const MAP_ROWS = 32;

// Live ES Module bindings updated automatically when levelLoader.js hydrates data/world.json + data/rooms/*.json
export let WORLD_MIN_X = 0;
export let WORLD_MIN_Y = 0;
export let WORLD_W = 11180;
export let WORLD_H = 2260;
export let WORLD_SPAN_W = WORLD_W - WORLD_MIN_X;
export let WORLD_SPAN_H = WORLD_H - WORLD_MIN_Y;
export let FLOOR_Y = 580;
export let WELL_BOTTOM_Y = 1380;
export let MAP_CELL_W = WORLD_SPAN_W / MAP_COLS;
export let MAP_CELL_H = WORLD_SPAN_H / MAP_ROWS;

export function setWorldMetrics(w, h, floorY, wellBottomY, minX = 0, minY = 0) {
  WORLD_MIN_X = Number.isFinite(Number(minX)) ? Number(minX) : 0;
  WORLD_MIN_Y = Number.isFinite(Number(minY)) ? Number(minY) : 0;
  WORLD_W = Math.max(WORLD_MIN_X + 960, Number(w) || 11180);
  WORLD_H = Math.max(WORLD_MIN_Y + 720, Number(h) || 2260);
  WORLD_SPAN_W = Math.max(960, WORLD_W - WORLD_MIN_X);
  WORLD_SPAN_H = Math.max(720, WORLD_H - WORLD_MIN_Y);
  FLOOR_Y = Number(floorY) || 580;
  WELL_BOTTOM_Y = Number(wellBottomY) || 1380;
  MAP_CELL_W = WORLD_SPAN_W / MAP_COLS;
  MAP_CELL_H = WORLD_SPAN_H / MAP_ROWS;
}

// Live mutable world registries hydrated from data/rooms/*.json
export const ROOMS = [];
export const SOLIDS = [];
export const ALTARS = [];
export const NPCS = [];
export const ALTAR_POS = { id: 'altar_start', x: 330, y: 580 };
export const LORE_TABLETS = [];
export const SHORTCUT_GATE_DEF = { id: 'gate_skyway', x: 1380, y: 0, w: 0, h: 0, leverX: 1495, leverY: 245 };
export const CHAPEL_EXIT_GATE_DEF = { id: 'gate_chapel_exit', x: 3740, y: 480, w: 0, h: 0 };
export const FOUNDRY_ENTRY_GATE_DEF = { id: 'gate_foundry_entry', x: 5540, y: 1240, w: 0, h: 0 };
export const FOUNDRY_EXIT_GATE_DEF = { id: 'gate_foundry_exit', x: 6700, y: 1240, w: 0, h: 0 };
export const SKY_BRIDGE_GATE_DEF = { id: 'gate_sky_bridge', x: 8260, y: -320, w: 0, h: 0 };
export const FOUNDRY_VENT_GATE_DEF = { id: 'gate_foundry_vent', x: 5835, y: 780, w: 0, h: 0 };
export const MIRROR_ABYSS_GATE_DEF = { id: 'gate_mirror_abyss', x: 7960, y: -858, w: 0, h: 0 };
export const FIRST_BELL_CORE_POS = { x: 9000, y: 580 };
export const SECRET_WALLS_DEF = [];
export const VOID_BARRIERS = [];
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
export const STAMPS = [];
export const WIND_ZONES = [];
export const BOUNCE_PADS = [];
export const BREAKABLE_FLOORS_DEF = [];
export const WORLD_SWITCHES_DEF = [];
export const WIND_VANES = [];
export const ICE_PILLARS_DEF = [];
export const SLICK_WALLS = [];
export const SWITCH_GATES = [];

export const RELIC_SYNERGIES = [
  {
    id: 'grapple_quake',
    relics: ['bellthread', 'clapper'],
    name: '幽鸣共振',
    flag: 'synGrappleQuake',
    desc: '钩索撞敌自动爆发免费「镇魂钟鸣」，范围破盾并震响悬灯与共鸣钟。',
    shortDesc: '钩索撞敌 自动震出免费「镇魂钟鸣」',
  },
  {
    id: 'mirror_ember',
    relics: ['mirror', 'ember'],
    name: '镜烬印记',
    flag: 'synMirrorEmber',
    desc: '3 连完美弹反后，下次近战命中免费贴 1 枚引爆墨印符箓。',
    shortDesc: '3连弹反 下击免费贴1枚引爆墨印',
  },
  {
    id: 'blood_iai',
    relics: ['thorn', 'ironheart'],
    name: '血铁居合',
    flag: 'synBloodIai',
    desc: '带灰血时居合再提速 28%，额外斩出穿透「猩红剑气」并强效回血。',
    shortDesc: '灰血居合提速28% + 斩出猩红剑气',
  },
  {
    id: 'core_counter',
    relics: ['bellcore', 'mirror'],
    name: '碎心绝响',
    flag: 'synCoreCounter',
    desc: '断钟返削势 ×1.5，命中立刻引爆目标身上墨印造成 1.35 倍爆伤。',
    shortDesc: '断钟返削势×1.5 + 瞬爆墨印1.35倍',
  },
  {
    id: 'shade_thread',
    relics: ['shadecurtain', 'bellthread'],
    name: '墨影断鸣',
    flag: 'synShadeThread',
    desc: '幽影穿敌立刻刷新钩索冷却，2.2s 内下次钩袭双倍破势并大幅回魂。',
    shortDesc: '穿敌刷钩索 · 下次钩袭双倍破势',
  },
  {
    id: 'gale_thread',
    relics: ['galefather', 'bellthread'],
    name: '朔风幽丝',
    flag: 'synGaleThread',
    desc: '钩索或二段跳后蓄满 2.6s「朔风锐势」，下次攻击伤害 +30% 且附带罡风破势。',
    shortDesc: '钩索/二段跳 下击+30%伤+罡风破势',
  },
  {
    id: 'spore_clapper',
    relics: ['sporeseal', 'clapper'],
    name: '净孢回响',
    flag: 'synSporeClapper',
    desc: '镇魂钟鸣或灵刃净化毒孢云时引爆翡翠共振波，对周围敌兵造成 38 伤害并额外回血 10。',
    shortDesc: '净孢引爆翡翠波 38伤 + 回血10',
  },
  {
    id: 'frost_iron',
    relics: ['frostcore', 'ironheart'],
    name: '冰铁碎骨',
    flag: 'synFrostIron',
    desc: '居合一闪与重击终结技释放凛霜碎骨波，削势 +35% 并直接击碎重盾与盘根树铠。',
    shortDesc: '居合/重斩 碎骨波削势+35%破全盾',
  },
  {
    id: 'tide_clapper',
    relics: ['tidebell', 'clapper'],
    name: '渊潮震鸣',
    flag: 'synTideClapper',
    desc: '镇魂钟鸣与镇岳下砸常驻触发潮湿导电增幅，并向两侧激荡双道破盾「渊潮震波」。',
    shortDesc: '钟鸣/下砸 常驻导电 + 双向渊潮震波',
  }
];

export const DEFAULT_KEYBINDS = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  jump: 'Space',
  attack: 'KeyJ',
  parry: 'KeyK',
  dash: 'ShiftLeft',
  spell: 'KeyU',
  grapple: 'KeyI',
  seal: 'KeyL',
  heal: 'KeyH',
  interact: 'KeyE',
  map: 'KeyM'
};

export const ACTION_META = [
  { id: 'left', label: '向左移动', alts: ['ArrowLeft'] },
  { id: 'right', label: '向右移动', alts: ['ArrowRight'] },
  { id: 'up', label: '上推 / 上挑', alts: ['ArrowUp'] },
  { id: 'down', label: '下蹲 / 下劈', alts: ['ArrowDown'] },
  { id: 'jump', label: '跳跃 / 墨翼步', alts: [] },
  { id: 'attack', label: '断刃斩 / 长按居合', alts: [] },
  { id: 'parry', label: '精准弹反', alts: [] },
  { id: 'dash', label: '墨影闪避', alts: ['ShiftRight'] },
  { id: 'spell', label: '幽鸣灵刃 / 钟鸣', alts: ['KeyR'] },
  { id: 'grapple', label: '幽丝钩索', alts: ['KeyF'] },
  { id: 'seal', label: '墨印引爆斩', alts: ['KeyC'] },
  { id: 'heal', label: '饮用灯油回血', alts: ['KeyQ'] },
  { id: 'interact', label: '祭坛 / 残碑交互', alts: [] },
  { id: 'map', label: '展开晦渊舆图', alts: ['Tab'] }
];

export const SAVE_KEY = 'ashen_bell_vow_save_v10';
export const LEGACY_SAVE_KEY_V9 = 'ashen_bell_vow_save_v9';
export const LEGACY_SAVE_KEY_V8 = 'ashen_bell_vow_save_v8';
export const SETTINGS_KEY = 'ashen_bell_vow_settings_v13';
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
  },
  crypt: {
    label: '幽窖墨烛',
    skyTop: [12, 9, 22],
    skyMid: [22, 16, 38],
    skyBot: [7, 5, 13],
    mist: [28, 18, 48],
    accent: [167, 139, 250],
    weather: 'ash'
  },
  ascent: {
    label: '初钟圣阶',
    skyTop: [16, 11, 24],
    skyMid: [34, 21, 36],
    skyBot: [9, 6, 14],
    mist: [42, 22, 34],
    accent: [245, 158, 11],
    weather: 'embers'
  },
  heart: {
    label: '初钟圣心',
    skyTop: [22, 10, 14],
    skyMid: [44, 18, 22],
    skyBot: [10, 5, 8],
    mist: [52, 18, 18],
    accent: [253, 224, 71],
    weather: 'snow'
  },
  wind: {
    label: '绝风断塔',
    skyTop: [10, 18, 30],
    skyMid: [20, 36, 52],
    skyBot: [7, 12, 20],
    mist: [22, 46, 66],
    accent: [186, 230, 253],
    weather: 'ash'
  },
  forest: {
    label: '枯墨古林',
    skyTop: [6, 16, 19],
    skyMid: [12, 30, 34],
    skyBot: [4, 10, 12],
    mist: [14, 38, 42],
    accent: [110, 231, 183],
    weather: 'mist'
  },
  mountain: {
    label: '霜骸圣脊',
    skyTop: [12, 18, 32],
    skyMid: [26, 36, 56],
    skyBot: [8, 12, 22],
    mist: [34, 48, 72],
    accent: [224, 242, 254],
    weather: 'snow'
  },
  cistern: {
    label: '沉钟水牢',
    skyTop: [4, 15, 24],
    skyMid: [8, 32, 46],
    skyBot: [3, 9, 16],
    mist: [10, 48, 66],
    accent: [56, 189, 248],
    weather: 'mist'
  }
};

export const SMITH_UPGRADES = [
  {
    id: 'blade',
    name: '淬炼断刃',
    desc: '每级永久提升断刃近战伤害 +10%，并增强刀锋冷淬流光。',
    costs: [70, 130, 210, 300, 410],
    bonusLabel: lv => `近战伤害 +${lv * 10}%`
  },
  {
    id: 'posture',
    name: '重铸钟势',
    desc: '每级永久提升全招式与弹反的架势摧毁 +9%，更快打崩强敌架势。',
    costs: [90, 170, 280],
    bonusLabel: lv => `削势倍率 +${lv * 9}%`
  },
  {
    id: 'forge',
    name: '魂炉扩焰',
    desc: '每级永久提升最大生命 +15 与最大魂火 +15，续航与法术更从容。',
    costs: [90, 170, 260],
    bonusLabel: lv => `生命/魂火 +${lv * 15}`
  }
];

export const VOW_CONSTRAINTS = [
  {
    id: 'noFlasks',
    name: '断油之誓',
    short: '断油',
    bonusPct: 25,
    desc: '灯油瓶归零，仅靠吸血与处决续航 · 残响 +25%'
  },
  {
    id: 'doubleDmg',
    name: '脆骨之誓',
    short: '脆骨',
    bonusPct: 30,
    desc: '承受全部伤害提至 180% · 残响 +30%'
  },
  {
    id: 'noGrayBlock',
    name: '无暇之誓',
    short: '无暇',
    bonusPct: 30,
    desc: '格挡无灰血，失误直扣 75% 实血 · 残响 +30%'
  },
  {
    id: 'fierceFoes',
    name: '狂钟之誓',
    short: '狂钟',
    bonusPct: 25,
    desc: '敌势 +30%，连招节奏加快 18% · 残响 +25%'
  }
];

export const DUMMY_MODES = [
  { id: 'cycle', label: '全招式循环', tip: '轮流演练：金芒斩 → 快慢二连 → 猩红危刺 → 青铜重盾' },
  { id: 'parryOnly', label: '打铁弹反专练', tip: '循环金芒单斩与快慢二连，专注练习弹反与断钟返' },
  { id: 'redOnly', label: '危技见切专练', tip: '循环猩红「危」突刺，专注练习 Shift 见切闪避' },
  { id: 'dormant', label: '静立木桩', tip: '静立承受伤害与连招，实时统计 DPS / 削势，测试构筑爆发' },
  { id: 'biomeWind', label: '绝风模拟 · 风刃', tip: '间歇发射可弹反朔风双刃，专练远距弹反归元与空中走位' },
  { id: 'biomeForest', label: '古林模拟 · 孢甲', tip: '举盾护甲并间歇喷吐毒孢云，专练重劈破甲与镇魂净孢' },
  { id: 'biomeMountain', label: '霜脊模拟 · 寒戟', tip: '施放附带寒霜积蓄的寒戟连斩与冰晶弹，专练霜压打铁' }
];

export const ENEMY_ECHO_REWARDS = {
  dummy: 0,
  leech: 14,
  wraith: 18,
  sentinel: 22,
  falcon: 26,
  priest: 28,
  fungus: 32,
  duelist: 36,
  drowned: 34,
  golem: 42,
  frostguard: 46,
  anchorite: 48, weaver: 34, crawler: 40, cantor: 44,
  warden_wind: 150,
  warden_forest: 180,
  warden_mountain: 210,
  boss: 150,
  boss2: 210,
  boss3: 320,
  boss4: 420
};

export const SEVEN_BELLS_ORDER = ['hui', 'ji', 'warden_wind', 'warden_forest', 'warden_mountain', 'yuan', 'zhu'];

export const ECHO_GRADE_ORDER = { 'B': 1, 'A': 2, 'S': 3, 'S+': 4 };
