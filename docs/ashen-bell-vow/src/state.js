// Central mutable game state container (G) and cross-module hook registry (hooks)
import {
  RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DEFAULT_KEYBINDS, ROOMS, ALTARS, FLOOR_Y, MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H,
  SECRET_WALLS_DEF, PICKUPS_DEF, RESONANCE_PUZZLES_DEF, CRUMBLE_PLATFORMS_DEF, LANTERNS_DEF
} from './config.js';

export const G = {
  currentRelic: RELICS[0],
  equippedRelics: [RELICS[0], null],
  activeRelicSlot: 0,

  // Canvas & procedural frame state
  canvas: null,
  ctx: null,
  canvasW: 1280,
  canvasH: 720,
  globalTime: 0,
  boilFrame: 0,
  paperPattern: null,

  // Loaded Room JSON bundle & current room state
  levelBundle: null,
  isEditorPreview: false,
  currentRoomId: null,

  // Persistent world & exploration state
  worldState: null,
  exploreDirty: true,
  cachedExplorePct: 0,
  minimapDirty: true,
  lastMinimapRenderTime: -1,
  saveDirtyTimer: 0,

  // Control mode, active input device, save slot & user settings
  controlMode: 'kbmouse',
  inputDevice: 'kbmouse', // 'kbmouse' | 'gamepad'
  activeSaveSlot: 0,
  playTimeSec: 0,
  locale: 'zh-CN',
  settings: {
    parryWindowMult: 1.0,
    damageTakenMult: 1.0,
    haptics: true,
    dynamicLighting: true,
    showPerf: false,
    showProfilerDetail: false,
    fpsDivisor: 1,
    hitstopMode: 'standard', // 'standard' | 'light' | 'off'
    musicEnabled: true,
    masterVol: 0.85,
    musicVol: 0.75,
    sfxVol: 0.90,
    keybinds: { ...DEFAULT_KEYBINDS }
  },

  // VFX & dynamic pools
  particles: [],
  slashes: [],
  shockwaves: [],
  impactBursts: [],
  hitMarks: [],
  floatTexts: [],
  afterimages: [],
  talismans: [],
  groundWaves: [],
  chapelTide: null,
  projectiles: [],
  bellQuakes: [],
  crumblePlatforms: [],
  resonancePuzzles: [],
  ambientMotes: [],
  weatherParticles: [],
  weatherRipples: [],
  themeBlend: {
    activeTheme: 'sanctuary',
    weather: 'ash',
    skyTop: [8, 14, 26],
    skyMid: [16, 28, 44],
    skyBot: [5, 9, 16],
    mist: [14, 28, 46],
    accent: [56, 189, 248]
  },
  lanterns: [],
  grapplePreviewTarget: null,

  // Runtime gameplay state
  gameState: 'title',
  hitstopTimer: 0,
  invertTimer: 0,
  screenFlash: { alpha: 0, color: '#fff' },
  cam: { x: 0, y: 0, shake: 0, kickX: 0, kickY: 0, zoom: 1 },
  stats: { parries: 0, executions: 0, damageTaken: 0, startTime: 0 },

  // Actors
  player: null,
  enemies: [],
  boss: null,
  boss2: null,
  boss3: null,
  bossBanner: null,
  achievementBanner: null,
  achievementQueue: [],
  endingState: null,
  echoSession: null,
  outcomeTimer: null,

  // Runtime benchmark flag & modal state
  benchActive: false,
  activeModal: null,
  modalReturnState: 'playing'
};

// Populated once at startup in main.js to avoid circular imports between gameplay & UI layers
export const hooks = {
  syncHUD: () => {},
  saveProgress: () => {},
  readSaveData: () => null,
  refreshTitleSaveUI: () => {},
  showDeath: () => {},
  showVictory: () => {},
  advanceEchoRushStage2: () => {},
  advanceEchoRushStage3: () => {},
  openEndingChoice: () => {},
  interactWithAltar: () => {},
  openSmithModal: () => {},
  openNpcModal: () => {},
  openLoreModal: () => {},
  openMapModal: () => {},
  openCodexModal: () => {},
  openPauseModal: () => {},
  returnToTitle: () => {},
  openModal: () => {},
  closeModal: () => {},
  startGame: () => {},
  startNewGamePlus: () => {},
  continueSavedGame: () => {},
  respawnAtActiveAltar: () => {},
  startEchoChallenge: () => {},
  continueIntoBellWell: () => {},
  resizeCanvas: () => {}
};

export function createFreshWorldState() {
  G.exploreDirty = true;
  G.minimapDirty = true;
  return {
    ngPlusCycle: 1,
    activeVows: new Set(),
    codex: {
      readTablets: [],
      bestiary: {},
      achievements: [],
      discoveredSynergies: []
    },
    mapPins: [],
    litAltars: new Set(['altar_start']),
    activeAltarId: 'altar_start',
    bossDefeated: false,
    boss2Defeated: false,
    boss3Defeated: false,
    chapelExitAnim: 0,
    foundryGateAnim: 0,
    foundryExitAnim: 0,
    echoRecords: { hui: null, ji: null, yuan: null, rush: null },
    keyItems: { dawnSigil: false },
    endingsUnlocked: [],
    shortcutOpen: false,
    shortcutAnim: 0, // 0 = closed, 1 = fully raised
    secretWalls: SECRET_WALLS_DEF.map(w => ({ ...w, type: 'pillar', hp: w.maxHp, broken: false, shake: 0 })),
    pickups: PICKUPS_DEF.map(p => ({ ...p, collected: false })),
    solvedPuzzles: new Set(),
    bonusFlasks: 0,
    bonusMaxHp: 0,
    bonusMaxSoul: 0,
    echoes: 0,
    lostEchoes: null,
    lastDeathEchoMsg: '',
    smithUpgrades: { blade: 0, posture: 0, forge: 0 },
    npcQuests: {
      metChronicler: false,
      chroniclerClaims: [],
      metKeeper: false,
      keeperWickGifted: false,
      keeperBlessingActive: false
    },
    abilities: { doubleJump: false, shadeDash: false },
    unlockedRelics: new Set(['thorn', 'mirror', 'ember']),
    explored: Array.from({ length: MAP_ROWS }, () => new Array(MAP_COLS).fill(false))
  };
}

export function getActiveAltar() {
  const id = G.worldState ? G.worldState.activeAltarId : 'altar_start';
  return ALTARS.find(a => a.id === id) || ALTARS[0];
}

let _relicCacheKey = '';
let _cachedSynergies = [];
let _cachedRelicStats = null;

function _ensureRelicCache() {
  const eq = G.equippedRelics;
  const r0 = (eq && eq[0]) || G.currentRelic || RELICS[0];
  const r1 = (eq && eq[1]) || null;
  const pMult = (G.settings && G.settings.parryWindowMult) ? G.settings.parryWindowMult : 1.0;
  const key = `${r0 ? r0.id : ''}|${r1 ? r1.id : ''}|${pMult}`;
  if (key === _relicCacheKey && _cachedRelicStats) return;
  _relicCacheKey = key;

  const active = r1 ? [r0, r1] : [r0];
  const has = id => (r0 && r0.id === id) || (r1 && r1.id === id);
  const synergies = [];
  const synFlags = {};
  for (let i = 0; i < RELIC_SYNERGIES.length; i++) {
    const syn = RELIC_SYNERGIES[i];
    if (has(syn.relics[0]) && has(syn.relics[1])) {
      synergies.push(syn);
      synFlags[syn.flag] = true;
    }
  }
  _cachedSynergies = synergies;

  let parryWindowMs = Math.round((has('mirror') ? 100 : Math.max(...active.map(r => r.parryWindowMs || 140))) * pMult);
  let blockWindowMs = Math.round((has('mirror') ? 225 : Math.max(...active.map(r => r.blockWindowMs || 260))) * (1 + (pMult - 1) * 0.65));
  let parryPostureMult = active.reduce((acc, r) => acc * (r.parryPostureMult || 1.0), 1.0);
  let parryReflectDmg = active.reduce((acc, r) => acc + (r.parryReflectDmg || 0), 0);
  let parryHeal = active.reduce((acc, r) => acc + (r.parryHeal || 0), 0);
  let grayDuration = Math.max(...active.map(r => r.grayDuration || 3.4)) + active.reduce((acc, r) => acc + (r.grayDurationBonus || 0), 0);
  let rallyMult = 1.0 + active.reduce((acc, r) => acc + Math.max(0, (r.rallyMult || 1.0) - 1.0), 0);
  let flaskPenalty = has('ember') ? -1 : 0;
  let maxFlasks = Math.max(2, 3 + flaskPenalty);
  let maxSeals = Math.max(3, ...active.map(r => r.maxSeals || 3));
  let execHealPct = Math.max(...active.map(r => r.execHealPct || 0.12));
  let execFullSoul = has('ember');
  let grappleCd = Math.min(0.52, ...active.map(r => r.grappleCd || 0.52));
  let spellCost = Math.min(30, ...active.map(r => r.spellCost || 30));
  let quakeCost = Math.min(40, ...active.map(r => r.quakeCost || (r.id === 'bellthread' ? 32 : 40)));
  let spellPostureBonus = active.reduce((acc, r) => acc + (r.spellPostureBonus || 0), 0);
  let heavySkillMult = active.reduce((acc, r) => acc * (r.heavySkillMult || 1.0), 1.0);
  let soulGainMult = active.reduce((acc, r) => acc * (r.soulGainMult || 1.0), 1.0);
  let spellDmgMult = active.reduce((acc, r) => acc * (r.spellDmgMult || 1.0), 1.0);
  let spellRadiusMult = active.reduce((acc, r) => acc * (r.spellRadiusMult || 1.0), 1.0);
  let postureDmgMult = active.reduce((acc, r) => acc * (r.postureDmgMult || 1.0), 1.0);
  let iaiChargeTime = Math.min(0.42, ...active.map(r => r.iaiChargeTime || 0.42));
  let bellTimerBonus = active.reduce((acc, r) => acc + (r.bellTimerBonus || 0), 0);
  let shadeDashCd = Math.min(1.6, ...active.map(r => r.shadeDashCd || 1.6));
  let shadeBurstMult = active.reduce((acc, r) => acc * (r.shadeBurstMult || 1.0), 1.0);
  let shadePassHeal = active.reduce((acc, r) => acc + (r.shadePassHeal || 0), 0);

  _cachedRelicStats = {
    parryWindowMs, blockWindowMs, parryPostureMult, parryReflectDmg, parryHeal,
    grayDuration, rallyMult, maxFlasks, maxSeals, execHealPct, execFullSoul,
    grappleCd, spellCost, quakeCost, spellPostureBonus, heavySkillMult,
    soulGainMult, spellDmgMult, spellRadiusMult, postureDmgMult,
    iaiChargeTime, bellTimerBonus, shadeDashCd, shadeBurstMult, shadePassHeal,
    synergies,
    synGrappleQuake: !!synFlags.synGrappleQuake,
    synMirrorEmber: !!synFlags.synMirrorEmber,
    synBloodIai: !!synFlags.synBloodIai,
    synCoreCounter: !!synFlags.synCoreCounter,
    synShadeThread: !!synFlags.synShadeThread
  };
}

export function getActiveSynergies() {
  _ensureRelicCache();
  return _cachedSynergies;
}

export function getRelicStats() {
  _ensureRelicCache();
  return _cachedRelicStats;
}

export function getEquippedRelicLabel() {
  const active = (G.equippedRelics || [G.currentRelic]).filter(Boolean);
  if (active.length === 0) return RELICS[0].name;
  return active.map(r => r.name).join(' · ');
}

export function ensureNpcQuests() {
  if (!G.worldState) return null;
  if (!G.worldState.npcQuests || typeof G.worldState.npcQuests !== 'object') {
    G.worldState.npcQuests = {
      metChronicler: false,
      chroniclerClaims: [],
      metKeeper: false,
      keeperWickGifted: false,
      keeperBlessingActive: false
    };
  }
  const nq = G.worldState.npcQuests;
  if (!Array.isArray(nq.chroniclerClaims)) nq.chroniclerClaims = [];
  return nq;
}

export function getBossBonusDamageMult() {
  const nq = G.worldState && G.worldState.npcQuests;
  return (nq && Array.isArray(nq.chroniclerClaims) && nq.chroniclerClaims.includes('vol3')) ? 1.08 : 1.0;
}

export function getFlaskHealPct() {
  const nq = G.worldState && G.worldState.npcQuests;
  return (nq && nq.keeperWickGifted) ? 0.58 : 0.45;
}

export function hasKeeperBlessing() {
  const nq = G.worldState && G.worldState.npcQuests;
  return !!(nq && nq.keeperBlessingActive);
}

export function getBladeDamageMult() {
  const lv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.blade || 0) : 0;
  return 1 + lv * 0.14;
}

export function getSmithPostureMult() {
  const lv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.posture || 0) : 0;
  return 1 + lv * 0.12;
}

export function getPlayerMaxHp() {
  const forgeLv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.forge || 0) : 0;
  return 100 + (G.worldState ? (G.worldState.bonusMaxHp || 0) : 0) + forgeLv * 15;
}

export function getPlayerMaxSoul() {
  const forgeLv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.forge || 0) : 0;
  return 100 + (G.worldState ? (G.worldState.bonusMaxSoul || 0) : 0) + forgeLv * 15;
}

let _vowCacheKey = '';
let _cachedVowStats = null;

export function getActiveVowStats() {
  const vs = G.worldState && G.worldState.activeVows ? G.worldState.activeVows : null;
  const f1 = vs && vs.has('noFlasks') ? 1 : 0;
  const f2 = vs && vs.has('doubleDmg') ? 1 : 0;
  const f3 = vs && vs.has('noGrayBlock') ? 1 : 0;
  const f4 = vs && vs.has('fierceFoes') ? 1 : 0;
  const key = `${f1}${f2}${f3}${f4}`;
  if (key === _vowCacheKey && _cachedVowStats) return _cachedVowStats;
  _vowCacheKey = key;
  let bonusPct = 0;
  let count = 0;
  const shorts = [];
  for (let i = 0; i < VOW_CONSTRAINTS.length; i++) {
    const vc = VOW_CONSTRAINTS[i];
    if (vs && vs.has(vc.id)) {
      count++;
      bonusPct += vc.bonusPct;
      shorts.push(vc.short);
    }
  }
  _cachedVowStats = {
    count,
    noFlasks: !!f1,
    doubleDmg: !!f2,
    noGrayBlock: !!f3,
    fierceFoes: !!f4,
    dmgMult: f2 ? 1.8 : 1.0,
    foePostureMult: f4 ? 1.30 : 1.0,
    foeSpeedMult: f4 ? 1.18 : 1.0,
    echoBonusMult: 1 + bonusPct / 100,
    shortsLabel: shorts.join('·')
  };
  return _cachedVowStats;
}

export function getCombatScaling(isEcho = !!G.echoSession) {
  const rawCycle = (G.worldState && Number(G.worldState.ngPlusCycle)) ? Math.max(1, Math.floor(G.worldState.ngPlusCycle)) : 1;
  const cycle = isEcho ? 1 : rawCycle;
  const n = Math.max(0, cycle - 1);
  const vows = getActiveVowStats();
  return {
    cycle: rawCycle,
    hpMult: 1 + n * 0.42,
    postureMult: (1 + n * 0.25) * vows.foePostureMult,
    dmgMult: (1 + n * 0.28) * vows.dmgMult,
    aggroMult: Math.min(1.48, (1 + n * 0.14) * vows.foeSpeedMult),
    echoMult: (1 + n * 0.50) * vows.echoBonusMult
  };
}

export function getPlayerMaxFlasks() {
  if (getActiveVowStats().noFlasks) return 0;
  return Math.min(6, getRelicStats().maxFlasks + (G.worldState ? G.worldState.bonusFlasks : 0));
}

export function getPlayerMaxSeals() {
  return getRelicStats().maxSeals;
}

export function createResonancePuzzles() {
  const solvedSet = G.worldState && G.worldState.solvedPuzzles ? G.worldState.solvedPuzzles : new Set();
  return RESONANCE_PUZZLES_DEF.map(p => {
    const solved = solvedSet.has(p.id);
    return {
      ...p,
      solved,
      timer: 0,
      maxTimer: p.timeLimit,
      cageAnim: solved ? 1 : 0,
      bells: p.bells.map(b => ({
        ...b,
        lit: solved,
        swing: 0,
        swingVel: 0,
        hitCd: 0,
        flash: 0
      }))
    };
  });
}

export function createCrumblePlatforms() {
  return CRUMBLE_PLATFORMS_DEF.map(p => ({
    ...p,
    type: 'platform',
    crumble: true,
    state: 'solid', // solid | shaking | broken
    timer: 0
  }));
}

export function markMapExplored(px, py = FLOOR_Y - 60) {
  if (!G.worldState) return;
  const col = Math.floor(px / MAP_CELL_W);
  const row = Math.floor(py / MAP_CELL_H);
  let changed = false;
  for (let dr = -2; dr <= 2; dr++) {
    const r = row + dr;
    if (r < 0 || r >= MAP_ROWS) continue;
    for (let dc = -2; dc <= 2; dc++) {
      const c = col + dc;
      if (c >= 0 && c < MAP_COLS && !G.worldState.explored[r][c]) {
        G.worldState.explored[r][c] = true;
        changed = true;
      }
    }
  }
  if (changed) {
    G.exploreDirty = true;
    G.minimapDirty = true;
    if (G.gameState === 'playing' && G.saveDirtyTimer <= 0) G.saveDirtyTimer = 10.0;
  }
}

export function isWorldPosExplored(x, y) {
  if (!G.worldState) return false;
  const c = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(x / MAP_CELL_W)));
  const r = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(y / MAP_CELL_H)));
  return G.worldState.explored[r][c];
}

export function getExplorationPercent() {
  if (!G.worldState) return 0;
  if (!G.exploreDirty) return G.cachedExplorePct;
  // Dynamically count cells inside any loaded room's bounds so custom rooms work automatically!
  let total = 0;
  let seen = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const cy = (r + 0.5) * MAP_CELL_H;
    for (let c = 0; c < MAP_COLS; c++) {
      const cx = (c + 0.5) * MAP_CELL_W;
      let playable = ROOMS.length === 0;
      for (let i = 0; i < ROOMS.length; i++) {
        const b = ROOMS[i].bounds;
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
          playable = true;
          break;
        }
      }
      if (!playable) continue;
      total++;
      if (G.worldState.explored[r][c]) seen++;
    }
  }
  G.cachedExplorePct = total > 0 ? Math.min(100, Math.round((seen / total) * 100)) : 0;
  G.exploreDirty = false;
  return G.cachedExplorePct;
}

export function createLanterns() {
  return LANTERNS_DEF.map(l => ({
    ...l,
    angle: l.angle !== undefined ? l.angle : 0.05,
    angVel: 0,
    hitCd: 0,
    ringFlash: 0
  }));
}

export function triggerBossBanner(title, quote = '', color = '#fde047', duration = 2.6) {
  G.bossBanner = { title, quote, color, life: duration, maxLife: duration };
}

export function getAwakeBoss() {
  if (G.boss && G.boss.awake && G.boss.alive) return G.boss;
  if (G.boss2 && G.boss2.awake && G.boss2.alive) return G.boss2;
  if (G.boss3 && G.boss3.awake && G.boss3.alive) return G.boss3;
  return null;
}

export function getLivingFoes() {
  const list = [];
  for (let i = 0; i < G.enemies.length; i++) {
    if (G.enemies[i] && G.enemies[i].alive) list.push(G.enemies[i]);
  }
  if (G.boss && G.boss.alive) list.push(G.boss);
  if (G.boss2 && G.boss2.alive) list.push(G.boss2);
  if (G.boss3 && G.boss3.alive) list.push(G.boss3);
  return list;
}

export function clearOutcomeTimer() {
  if (G.outcomeTimer !== null) {
    clearTimeout(G.outcomeTimer);
    G.outcomeTimer = null;
  }
}

export function scheduleOutcome(fn, delayMs, forceOverride = false) {
  if (G.outcomeTimer !== null) {
    if (!forceOverride) return;
    clearTimeout(G.outcomeTimer);
  }
  G.outcomeTimer = setTimeout(() => {
    G.outcomeTimer = null;
    fn();
  }, delayMs);
}

export function addShake(amount) {
  G.cam.shake = Math.min(20, Math.max(G.cam.shake, amount));
}

export function kickCamera(kx, ky) {
  G.cam.kickX = Math.max(-18, Math.min(18, G.cam.kickX + kx));
  G.cam.kickY = Math.max(-12, Math.min(12, G.cam.kickY + ky));
}

export function punchZoom(targetZoom) {
  G.cam.zoom = Math.min(1.065, Math.max(G.cam.zoom, targetZoom));
}

// Centralized Hitstop (打击顿帧) scaling: supports 'standard' (100%), 'light' (40%), and 'off' (0%)
export function triggerHitstop(duration, useMax = false) {
  const mode = (G.settings && G.settings.hitstopMode) || 'standard';
  if (mode === 'off') return;
  const scaled = mode === 'light' ? Math.min(0.024, duration * 0.4) : duration;
  G.hitstopTimer = useMax ? Math.max(G.hitstopTimer, scaled) : scaled;
}

// Zero-DOM-Node-churn in-place TextNode updater (prevents Blink C++ #text node creation/destruction)
export function setTextFast(el, str) {
  if (!el) return;
  let tn = el._txtNode;
  if (!tn) {
    if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
      tn = el.firstChild;
    } else {
      el.textContent = '';
      tn = document.createTextNode(str);
      el.appendChild(tn);
      el._txtNode = tn;
      return;
    }
    el._txtNode = tn;
  }
  if (tn.nodeValue !== str) tn.nodeValue = str;
}

// Frame-rate-independent exponential damping (f60 = per-frame decay factor tuned at 60 FPS)
export function damp(f60, dt) {
  return Math.pow(f60, dt * 60);
}
