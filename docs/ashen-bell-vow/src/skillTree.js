// Data-driven Visual Bell-Vein Skill Tree (三脉钟纹星图) — zero-circularity leaf module
import { WEAPON_FORGE_TRAIT_COST } from './weapons.js';

export const SKILL_TREE_VIEWBOX = { w: 460, h: 370 };

export const SKILL_BRANCHES = {
  core:    { id: 'core',    name: '初钟脉核', nameEn: 'Bell Core',    color: '#fef08a' },
  edge:    { id: 'edge',    name: '断锋脉',   nameEn: 'Edge Vein',    color: '#f87171' },
  bell:    { id: 'bell',    name: '钟魄脉',   nameEn: 'Bell Vein',    color: '#fde047' },
  lantern: { id: 'lantern', name: '提灯脉',   nameEn: 'Lantern Vein', color: '#38bdf8' }
};

export const BELL_SKILL_NODES = [
  {
    id: 'bell_heart',
    branch: 'core',
    kind: 'root',
    shape: 'core',
    x: 230, y: 38,
    glyph: '钟', glyphEn: 'I',
    name: '初钟脉核', nameEn: 'First Bell Core',
    chips: ['三脉共鸣起点', '以残响点亮星图'],
    chipsEn: ['Origin of Three Veins', 'Spend Echoes to Kindle'],
    cost: 0,
    requires: [],
    preview: 'core'
  },

  // ==================== LEFT VEIN · 断锋脉 (Edge / Attack & Offensive Traits) ====================
  {
    id: 'blade_1',
    branch: 'edge',
    kind: 'smith', smithId: 'blade', smithRank: 1,
    shape: 'stat',
    x: 142, y: 84,
    glyph: '锋', glyphEn: '+1',
    name: '锻锋 I', nameEn: 'Edge I',
    chips: ['近战伤害 +10%'],
    chipsEn: ['Melee DMG +10%'],
    cost: 70,
    requires: ['bell_heart'],
    preview: 'blade_stat'
  },
  {
    id: 'blade_2',
    branch: 'edge',
    kind: 'smith', smithId: 'blade', smithRank: 2,
    shape: 'stat',
    x: 104, y: 148,
    glyph: '锋', glyphEn: '+2',
    name: '锻锋 II', nameEn: 'Edge II',
    chips: ['近战伤害 +20%'],
    chipsEn: ['Melee DMG +20%'],
    cost: 130,
    requires: ['blade_1'],
    preview: 'blade_stat'
  },
  {
    id: 'blade_3',
    branch: 'edge',
    kind: 'smith', smithId: 'blade', smithRank: 3,
    shape: 'stat',
    x: 78, y: 216,
    glyph: '锋', glyphEn: '+3',
    name: '锻锋 III', nameEn: 'Edge III',
    chips: ['近战伤害 +30%'],
    chipsEn: ['Melee DMG +30%'],
    cost: 210,
    requires: ['blade_2'],
    preview: 'blade_stat'
  },
  {
    id: 'blade_4',
    branch: 'edge',
    kind: 'smith', smithId: 'blade', smithRank: 4,
    shape: 'stat',
    x: 68, y: 284,
    glyph: '锋', glyphEn: '+4',
    name: '锻锋 IV', nameEn: 'Edge IV',
    chips: ['近战伤害 +40%'],
    chipsEn: ['Melee DMG +40%'],
    cost: 300,
    requires: ['blade_3'],
    preview: 'blade_stat'
  },
  {
    id: 'blade_5',
    branch: 'edge',
    kind: 'smith', smithId: 'blade', smithRank: 5,
    shape: 'keystone',
    x: 120, y: 336,
    glyph: '绝', glyphEn: 'MAX',
    name: '绝锋终淬', nameEn: 'Apex Edge',
    chips: ['近战伤害 +50%', '切刃窗口延长至 0.62s'],
    chipsEn: ['Melee DMG +50%', 'Switch Window → 0.62s'],
    cost: 410,
    requires: ['blade_4'],
    preview: 'blade_stat'
  },
  {
    id: 'trait:shadow_twin',
    branch: 'edge',
    kind: 'trait', weaponId: 'blade', traitId: 'shadow_twin',
    shape: 'keystone',
    x: 158, y: 178,
    glyph: '影', glyphEn: 'ST',
    name: '影闪双斩', nameEn: 'Phantom Twin-Cut',
    chips: ['居合/切刃 追发残影斩', '三连终斩范围 +16%'],
    chipsEn: ['Iai/Switch: Twin Phantom Cut', '3rd Cleave Reach +16%'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['blade_1'],
    preview: 'shadow_twin'
  },
  {
    id: 'trait:quake_echo',
    branch: 'edge',
    kind: 'trait', weaponId: 'hammer', traitId: 'quake_echo',
    shape: 'keystone',
    x: 142, y: 246,
    glyph: '岳', glyphEn: 'QE',
    name: '震岳余波', nameEn: 'Seismic Aftershock',
    chips: ['重砸/切刃 双向裂地波', '破盾削势 +22%'],
    chipsEn: ['Slams: Twin Seismic Waves', 'Posture DMG +22%'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['blade_2'],
    preview: 'quake_echo'
  },
  {
    id: 'trait:echo_ring',
    branch: 'edge',
    kind: 'trait', weaponId: 'bell', traitId: 'echo_ring',
    shape: 'keystone',
    x: 172, y: 304,
    glyph: '环', glyphEn: 'ER',
    name: '回响连环', nameEn: 'Resonant Volley',
    chips: ['音环命中 分裂追踪矢', '法伤 +18% · 弹速 +20%'],
    chipsEn: ['Ring Hits Split Homing Dart', 'Spell +18% · Speed +20%'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['blade_3'],
    preview: 'echo_ring'
  },

  // ==================== CENTER VEIN · 钟魄脉 (Bell / Posture & Counter Traits) ====================
  {
    id: 'posture_1',
    branch: 'bell',
    kind: 'smith', smithId: 'posture', smithRank: 1,
    shape: 'stat',
    x: 230, y: 108,
    glyph: '势', glyphEn: 'P1',
    name: '钟势 I', nameEn: 'Bell Weight I',
    chips: ['全招式/弹反 削势 +9%'],
    chipsEn: ['All Posture DMG +9%'],
    cost: 90,
    requires: ['bell_heart'],
    preview: 'posture_stat'
  },
  {
    id: 'posture_2',
    branch: 'bell',
    kind: 'smith', smithId: 'posture', smithRank: 2,
    shape: 'stat',
    x: 230, y: 190,
    glyph: '势', glyphEn: 'P2',
    name: '钟势 II', nameEn: 'Bell Weight II',
    chips: ['全招式/弹反 削势 +18%'],
    chipsEn: ['All Posture DMG +18%'],
    cost: 170,
    requires: ['posture_1'],
    preview: 'posture_stat'
  },
  {
    id: 'posture_3',
    branch: 'bell',
    kind: 'smith', smithId: 'posture', smithRank: 3,
    shape: 'keystone',
    x: 230, y: 274,
    glyph: '震', glyphEn: 'P3',
    name: '震钟终势', nameEn: 'Shatter Bell',
    chips: ['全招式/弹反 削势 +27%'],
    chipsEn: ['All Posture DMG +27%'],
    cost: 280,
    requires: ['posture_2'],
    preview: 'posture_stat'
  },
  {
    id: 'trait:parry_seal',
    branch: 'bell',
    kind: 'trait', weaponId: 'blade', traitId: 'parry_seal',
    shape: 'keystone',
    x: 286, y: 148,
    glyph: '印', glyphEn: 'PS',
    name: '见切回印', nameEn: 'Riposte Seal-Flow',
    chips: ['弹反窗口 +15ms', '断钟返 +1墨印 · +18魂'],
    chipsEn: ['Parry Window +15ms', 'Riposte +1 Seal & +18 Soul'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['posture_1'],
    preview: 'parry_seal'
  },
  {
    id: 'trait:iron_bulwark',
    branch: 'bell',
    kind: 'trait', weaponId: 'hammer', traitId: 'iron_bulwark',
    shape: 'keystone',
    x: 288, y: 224,
    glyph: '壁', glyphEn: 'IB',
    name: '铁壁反震', nameEn: 'Iron-Bell Bulwark',
    chips: ['霸体延长 · 受创 -35%', '硬抗震出钟波 +1墨印'],
    chipsEn: ['Longer Armor · -35% DMG', 'Counter Pulse +1 Seal'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['posture_2'],
    preview: 'iron_bulwark'
  },
  {
    id: 'trait:soul_gather',
    branch: 'bell',
    kind: 'trait', weaponId: 'bell', traitId: 'soul_gather',
    shape: 'keystone',
    x: 282, y: 306,
    glyph: '魂', glyphEn: 'SG',
    name: '摄魂聚印', nameEn: 'Soul-Harvest Seal',
    chips: ['蓄力齐射 4追踪铃矢', '每3次命中 +1墨印'],
    chipsEn: ['Charged: 4 Homing Darts', 'Every 3 Hits: +1 Seal'],
    cost: WEAPON_FORGE_TRAIT_COST,
    requires: ['posture_2'],
    preview: 'soul_gather'
  },

  // ==================== RIGHT VEIN · 提灯脉 (Lantern / Vitality, Soul & Flow Keystones) ====================
  {
    id: 'forge_1',
    branch: 'lantern',
    kind: 'smith', smithId: 'forge', smithRank: 1,
    shape: 'stat',
    x: 320, y: 84,
    glyph: '灯', glyphEn: 'L1',
    name: '魂炉 I', nameEn: 'Soul Furnace I',
    chips: ['血量上限 +15', '魂火上限 +15'],
    chipsEn: ['Max HP +15', 'Max Soul +15'],
    cost: 90,
    requires: ['bell_heart'],
    preview: 'forge_stat'
  },
  {
    id: 'forge_2',
    branch: 'lantern',
    kind: 'smith', smithId: 'forge', smithRank: 2,
    shape: 'stat',
    x: 362, y: 160,
    glyph: '灯', glyphEn: 'L2',
    name: '魂炉 II', nameEn: 'Soul Furnace II',
    chips: ['血量上限 +30', '魂火上限 +30'],
    chipsEn: ['Max HP +30', 'Max Soul +30'],
    cost: 170,
    requires: ['forge_1'],
    preview: 'forge_stat'
  },
  {
    id: 'forge_3',
    branch: 'lantern',
    kind: 'smith', smithId: 'forge', smithRank: 3,
    shape: 'keystone',
    x: 380, y: 246,
    glyph: '明', glyphEn: 'L3',
    name: '永明魂炉', nameEn: 'Everlit Furnace',
    chips: ['血量上限 +45', '魂火上限 +45'],
    chipsEn: ['Max HP +45', 'Max Soul +45'],
    cost: 260,
    requires: ['forge_2'],
    preview: 'forge_stat'
  },
  {
    id: 'skill:air_flask',
    branch: 'lantern',
    kind: 'skill', skillId: 'air_flask',
    shape: 'keystone',
    x: 396, y: 110,
    glyph: '浮', glyphEn: 'AIR',
    name: '凌空饮灯', nameEn: 'Aerial Lantern',
    chips: ['空中可饮灯油', '饮灯短暂浮空滞留'],
    chipsEn: ['Drink Oil Mid-Air', 'Brief Air-Hover Sustain'],
    cost: 180,
    requires: ['forge_1'],
    preview: 'air_flask'
  },
  {
    id: 'skill:exec_surge',
    branch: 'lantern',
    kind: 'skill', skillId: 'exec_surge',
    shape: 'keystone',
    x: 392, y: 322,
    glyph: '掠', glyphEn: 'FLW',
    name: '掠影续势', nameEn: 'Reaper Momentum',
    chips: ['击杀/处决 刷新闪避与钩索', '1.6s 移速 +20%'],
    chipsEn: ['Kill/Exec Resets Dash & Hook', '1.6s Move Speed +20%'],
    cost: 220,
    requires: ['forge_2'],
    preview: 'exec_surge'
  }
];

const NODE_MAP = Object.create(null);
for (const n of BELL_SKILL_NODES) NODE_MAP[n.id] = n;

export function getSkillNodeById(id) {
  return NODE_MAP[id] || null;
}

export const BELL_SKILL_EDGES = [];
for (const n of BELL_SKILL_NODES) {
  for (const req of (n.requires || [])) {
    BELL_SKILL_EDGES.push({ from: req, to: n.id, branch: n.branch });
  }
}
