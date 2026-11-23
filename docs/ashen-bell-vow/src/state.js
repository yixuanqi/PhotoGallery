// Central mutable game state container (G) and cross-module hook registry (hooks)
import {
  RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DEFAULT_KEYBINDS, ROOMS, ALTARS, FLOOR_Y, WORLD_MIN_X, WORLD_MIN_Y, MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H,
  SECRET_WALLS_DEF, PICKUPS_DEF, RESONANCE_PUZZLES_DEF, CRUMBLE_PLATFORMS_DEF, LANTERNS_DEF,
  BREAKABLE_FLOORS_DEF, ICE_PILLARS_DEF, WIND_ZONES, WIND_VANES
} from './config.js';
import { WEAPON_ORDER, normalizeWeaponId, getWeaponById, getForgeTraitById } from './weapons.js';

export const G = {
  currentRelic: RELICS[0],
  equippedRelics: [RELICS[0], null, null],
  activeRelicSlot: 0,

  // Canvas & procedural frame state
  canvas: null,
  ctx: null,
  canvasW: 1280,
  renderScale: 1,
  canvasH: 720,
  globalTime: 0,
  boilFrame: 0,
  paperPattern: null,

  // Loaded Room JSON bundle & current room state
  levelBundle: null,
  isEditorPreview: false,
  currentRoomId: null,
  roomOcclusion: {},
  visibleRoomIds: new Set(),

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
    mobileFloatingJoy: true,
    mobileCombatAssist: true,
    mobileBtnScale: 1.0,
    mobileBtnOpacity: 0.90,
    mobileEcoMode: false,
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
  sporeClouds: [],
  weaponUltimates: [],
  delayedStrikes: [],
  dummyAutoFullSeals: false,
  dummyRefillTimer: 0,
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
  cam: { x: 0, y: 0, shake: 0, kickX: 0, kickY: 0, zoom: 1, vLookY: 0, roomTransTimer: 0 },
  wardenArenaFx: { windDir: 0, windTimer: 0, blizzardAlpha: 0, bellPulseTimer: 0 },
  smithForge: { cycleIdx: -1, flash: 0 },
  causalityNotified: { foundryCooled: false },
  stats: { parries: 0, executions: 0, damageTaken: 0, startTime: 0 },

  // Actors
  player: null,
  enemies: [],
  boss: null,
  boss2: null,
  boss3: null,
  boss4: null,
  bossBanner: null,
  bossIntro: null,
  bossKillSlowmo: null,
  zoneBanner: null,
  lastZoneName: '',
  foundryCrucibles: [],
  bestiaryToast: null,
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
  cycleWeapon: () => {},
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
    boss4Defeated: false,
    defeatedMiniBosses: new Set(),
    chapelExitAnim: 0,
    foundryGateAnim: 0,
    foundryExitAnim: 0,
    skyBridgeGateAnim: 0,
    riverDrainAnim: 0,
    foundryVentAnim: 0,
    mirrorAbyssAnim: 0,
    switchGateAnims: {},
    worldSwitches: {
      riverDrained: false, foundryValveOpen: false,
      belfryHatchOpen: false, forestHatchOpen: false, cryptHatchOpen: false,
      windAscentOpen: false, windWestOpen: false,
      galleryWindOpen: false, cisternWestOpen: false
    },
    realmSeals: { wind: false, forest: false, mountain: false },
    echoRecords: { hui: null, ji: null, yuan: null, rush: null, warden_wind: null, warden_forest: null, warden_mountain: null, warden_rush: null, zhu: null, seven_bells: null },
    keyItems: { dawnSigil: false },
    endingsUnlocked: [],
    shortcutOpen: false,
    shortcutAnim: 0, // 0 = closed, 1 = fully raised
    secretWalls: SECRET_WALLS_DEF.map(w => ({ ...w, type: 'pillar', hp: w.maxHp, broken: false, shake: 0 })),
    breakableFloors: BREAKABLE_FLOORS_DEF.map(f => ({ ...f, type: 'pillar', broken: false, shake: 0 })),
    icePillars: ICE_PILLARS_DEF.map(ip => ({ ...ip, state: 'hanging', fallY: ip.topY + ip.len, vy: 0, hitIds: new Set(), flash: 0 })),
    awakenedPads: new Set(),
    windVaneDirs: {},
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
    abilities: { grappleHook: false, doubleJump: false, shadeDash: false, bellDive: false },
    equippedWeapon: 'blade',
    unlockedWeapons: new Set(['blade']),
    weaponTraits: { blade: null, hammer: null, bell: null },
    unlockedWeaponTraits: new Set(),
    skillNodes: new Set(),
    unlockedRelics: new Set(['thorn', 'mirror', 'ember']),
    refinedRelics: new Set(),
    explored: Array.from({ length: MAP_ROWS }, () => new Array(MAP_COLS).fill(false))
  };
}

export function isWeaponUnlocked(id) {
  const norm = normalizeWeaponId(id);
  if (norm === 'blade') return true;
  return !!(G.worldState && G.worldState.unlockedWeapons && G.worldState.unlockedWeapons.has(norm));
}

export function getUnlockedWeaponIds() {
  return WEAPON_ORDER.filter(id => isWeaponUnlocked(id));
}

export function unlockWeapon(id) {
  const norm = normalizeWeaponId(id);
  if (!G.worldState) return false;
  if (!G.worldState.unlockedWeapons) G.worldState.unlockedWeapons = new Set(['blade']);
  const isNew = !G.worldState.unlockedWeapons.has(norm);
  G.worldState.unlockedWeapons.add(norm);
  return isNew;
}

export function getActiveWeaponId() {
  const raw = G.worldState && G.worldState.equippedWeapon ? G.worldState.equippedWeapon : 'blade';
  const norm = normalizeWeaponId(raw);
  return isWeaponUnlocked(norm) ? norm : 'blade';
}

export function getActiveWeapon() {
  return getWeaponById(getActiveWeaponId());
}

export function isWeaponTraitUnlocked(traitId) {
  return !!(traitId && G.worldState && G.worldState.unlockedWeaponTraits && G.worldState.unlockedWeaponTraits.has(traitId));
}

export function getActiveWeaponTraitId(weaponId = getActiveWeaponId()) {
  const norm = normalizeWeaponId(weaponId);
  if (!G.worldState || !G.worldState.weaponTraits) return null;
  const tid = G.worldState.weaponTraits[norm] || null;
  return (tid && isWeaponTraitUnlocked(tid)) ? tid : null;
}

export function hasActiveWeaponTrait(traitId) {
  const tr = getForgeTraitById(traitId);
  if (!tr) return false;
  return getActiveWeaponId() === tr.weaponId && getActiveWeaponTraitId(tr.weaponId) === traitId;
}

export function unlockWeaponTrait(traitId) {
  const tr = getForgeTraitById(traitId);
  if (!tr || !G.worldState) return false;
  if (!G.worldState.unlockedWeaponTraits) G.worldState.unlockedWeaponTraits = new Set();
  if (!G.worldState.weaponTraits) G.worldState.weaponTraits = { blade: null, hammer: null, bell: null };
  const isNew = !G.worldState.unlockedWeaponTraits.has(traitId);
  G.worldState.unlockedWeaponTraits.add(traitId);
  G.worldState.weaponTraits[tr.weaponId] = traitId;
  return isNew;
}

export function setActiveWeaponTrait(weaponId, traitId) {
  const norm = normalizeWeaponId(weaponId);
  if (!G.worldState) return false;
  if (!G.worldState.weaponTraits) G.worldState.weaponTraits = { blade: null, hammer: null, bell: null };
  if (traitId === null) {
    G.worldState.weaponTraits[norm] = null;
    return true;
  }
  const tr = getForgeTraitById(traitId);
  if (!tr || tr.weaponId !== norm || !isWeaponTraitUnlocked(traitId)) return false;
  G.worldState.weaponTraits[norm] = traitId;
  return true;
}

export function getActiveAltar() {
  const id = G.worldState ? G.worldState.activeAltarId : 'altar_start';
  return ALTARS.find(a => a.id === id) || ALTARS[0];
}

let _relicCacheKey = '';
let _cachedSynergies = [];
let _cachedRelicStats = null;

export function getRealmSealCount() {
  const rs = G.worldState && G.worldState.realmSeals;
  if (!rs) return 0;
  return (rs.wind ? 1 : 0) + (rs.forest ? 1 : 0) + (rs.mountain ? 1 : 0);
}

export function hasThirdRelicSlot() {
  return getRealmSealCount() >= 3;
}

export function isWorldSwitchOn(key) {
  return !!(key && G.worldState && G.worldState.worldSwitches && G.worldState.worldSwitches[key]);
}
export function isRiverDrained() { return isWorldSwitchOn('riverDrained'); }
export function isWindZoneActive(wz) {
  if (!wz) return false;
  if (wz.requiresSwitch && !isWorldSwitchOn(wz.requiresSwitch)) return false;
  if (wz.requiresBoss4Unlocked && !isBoss4Unlocked()) return false;
  return true;
}
export function isBouncePadAwake(bp) { return !!(bp && (!bp.dormant || (G.worldState && G.worldState.awakenedPads && G.worldState.awakenedPads.has(bp.id)))); }
export function isSwitchUnlocked(sw) {
  if (!sw) return false;
  if (!sw.requiresBoss) return true;
  if (!G.worldState) return false;
  if (sw.requiresBoss === 'boss_hui') return !!G.worldState.bossDefeated;
  if (sw.requiresBoss === 'boss_ji') return !!G.worldState.boss2Defeated;
  if (sw.requiresBoss === 'boss_yuan') return !!G.worldState.boss3Defeated;
  return !!(G.worldState.defeatedMiniBosses && G.worldState.defeatedMiniBosses.has(sw.requiresBoss));
}
export function syncWindVanesFromWorldState() {
  const dirs = (G.worldState && G.worldState.windVaneDirs) ? G.worldState.windVaneDirs : {};
  for (let i = 0; i < WIND_ZONES.length; i++) {
    WIND_ZONES[i].vx = WIND_ZONES[i].baseVx !== undefined ? WIND_ZONES[i].baseVx : WIND_ZONES[i].vx;
  }
  for (let i = 0; i < WIND_VANES.length; i++) {
    const wv = WIND_VANES[i];
    const saved = dirs[wv.id];
    wv.dir = (saved === 1 || saved === -1) ? saved : (wv.defaultDir || 1);
    if (saved === 1 || saved === -1) {
      for (let j = 0; j < wv.targetZoneIds.length; j++) {
        const wz = WIND_ZONES.find(z => z.id === wv.targetZoneIds[j]);
        if (wz) wz.vx = wv.dir * wv.boostVx;
      }
    }
  }
}

export function isSkyBridgeOpen() {
  if (!G.worldState) return false;
  const dm = G.worldState.defeatedMiniBosses;
  const rs = G.worldState.realmSeals;
  return !!(
    (dm && (dm.has('warden_wind_boss') || dm.has('warden_mountain_boss'))) ||
    (rs && (rs.wind || rs.mountain))
  );
}

export function getRealmSealBonusMult() {
  const cnt = getRealmSealCount();
  return cnt >= 3 ? 1.12 : cnt === 2 ? 1.08 : cnt === 1 ? 1.04 : 1.0;
}

export function isSkillNodeUnlocked(skillId) {
  return !!(skillId && G.worldState && G.worldState.skillNodes && G.worldState.skillNodes.has(skillId));
}

export function unlockSkillNode(skillId) {
  if (!skillId || !G.worldState) return false;
  if (!G.worldState.skillNodes) G.worldState.skillNodes = new Set();
  const isNew = !G.worldState.skillNodes.has(skillId);
  G.worldState.skillNodes.add(skillId);
  return isNew;
}

export function getSwitchStrikeWindowSec() {
  const lv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.blade || 0) : 0;
  return lv >= 5 ? 0.62 : 0.44;
}

export function isRelicRefined(id) {
  return !!(id && G.worldState && G.worldState.refinedRelics && G.worldState.refinedRelics.has(id));
}

export function refineRelic(id) {
  if (!id || !G.worldState) return false;
  if (!G.worldState.refinedRelics) G.worldState.refinedRelics = new Set();
  const isNew = !G.worldState.refinedRelics.has(id);
  G.worldState.refinedRelics.add(id);
  _relicCacheKey = '';
  return isNew;
}

export function getEffectiveRelic(relic) {
  if (!relic) return null;
  if (relic.refined && isRelicRefined(relic.id)) {
    return { ...relic, ...relic.refined, isRefined: true };
  }
  return relic;
}

function _ensureRelicCache() {
  const eq = G.equippedRelics;
  const thirdOpen = hasThirdRelicSlot();
  const r0 = (eq && eq[0]) || G.currentRelic || RELICS[0];
  const r1 = (eq && eq[1]) || null;
  const r2 = (thirdOpen && eq && eq[2]) ? eq[2] : null;
  const ref0 = r0 && isRelicRefined(r0.id) ? 1 : 0;
  const ref1 = r1 && isRelicRefined(r1.id) ? 1 : 0;
  const ref2 = r2 && isRelicRefined(r2.id) ? 1 : 0;
  const pMult = (G.settings && G.settings.parryWindowMult) ? G.settings.parryWindowMult : 1.0;
  const wId = getActiveWeaponId();
  const wTrait = getActiveWeaponTraitId(wId) || '';
  const sealCnt = getRealmSealCount();
  const drainedFlag = isRiverDrained() ? 1 : 0;
  const mobAssist = (G.isMobile && (!G.settings || G.settings.mobileCombatAssist !== false)) ? 1 : 0;
  const key = `${r0 ? r0.id : ''}:${ref0}|${r1 ? r1.id : ''}:${ref1}|${r2 ? r2.id : ''}:${ref2}|${pMult}|${wId}|${wTrait}|${sealCnt}|${drainedFlag}|${mobAssist}`;
  if (key === _relicCacheKey && _cachedRelicStats) return;
  _relicCacheKey = key;

  const active = [r0, r1, r2].filter(Boolean).map(getEffectiveRelic);
  const has = id => active.some(r => r && r.id === id);
  const mirrorRelic = active.find(r => r && r.id === 'mirror') || null;
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

  const wp = getWeaponById(wId).passives;
  const traitParryBonus = wTrait === 'parry_seal' ? 15 : 0;
  const traitSpellMult = wTrait === 'echo_ring' ? 1.18 : 1.0;
  const mobParryBonus = mobAssist ? 25 : 0;
  const baseParryWin = mirrorRelic ? (mirrorRelic.parryWindowMs || 100) : Math.max(...active.map(r => r.parryWindowMs || 140));
  const baseBlockWin = mirrorRelic ? (mirrorRelic.blockWindowMs || 225) : Math.max(...active.map(r => r.blockWindowMs || 260));
  let parryWindowMs = Math.max(70, Math.round((baseParryWin + (wp.parryWindowBonusMs || 0) + traitParryBonus + mobParryBonus) * pMult));
  let blockWindowMs = Math.max(parryWindowMs + 60, Math.round((baseBlockWin + (wp.blockWindowBonusMs || 0) + mobParryBonus) * (1 + (pMult - 1) * 0.65)));
  let blockChipMult = wp.blockChipMult || 1.0;
  let parryPostureMult = active.reduce((acc, r) => acc * (r.parryPostureMult || 1.0), 1.0) * (wp.parryPostureMult || 1.0);
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
  const drainedSpellReduce = drainedFlag ? active.reduce((acc, r) => acc + (r.drainedSpellCostReduce || 0), 0) : 0;
  const drainedSpellMult = drainedFlag ? active.reduce((acc, r) => acc * (r.drainedSpellDmgMult || 1.0), 1.0) : 1.0;
  let spellCost = Math.max(12, Math.round(Math.min(30, ...active.map(r => r.spellCost || 30)) * (wp.spellCostMult || 1.0)) - drainedSpellReduce);
  let quakeCost = Math.max(18, Math.round(Math.min(40, ...active.map(r => r.quakeCost || (r.id === 'bellthread' ? 32 : 40))) * (wp.spellCostMult || 1.0)) - drainedSpellReduce);
  let spellPostureBonus = active.reduce((acc, r) => acc + (r.spellPostureBonus || 0), 0);
  let heavySkillMult = active.reduce((acc, r) => acc * (r.heavySkillMult || 1.0), 1.0);
  let soulGainMult = active.reduce((acc, r) => acc * (r.soulGainMult || 1.0), 1.0) * (wp.soulGainMult || 1.0);
  let spellDmgMult = active.reduce((acc, r) => acc * (r.spellDmgMult || 1.0), 1.0) * (wp.spellDmgMult || 1.0) * traitSpellMult * drainedSpellMult;
  let wetConductSoul = active.reduce((acc, r) => acc + (r.wetConductSoul || 0), 0);
  let spellRadiusMult = active.reduce((acc, r) => acc * (r.spellRadiusMult || 1.0), 1.0);
  let postureDmgMult = active.reduce((acc, r) => acc * (r.postureDmgMult || 1.0), 1.0) * (wp.postureDmgMult || 1.0);
  let iaiChargeTime = Math.max(0.24, Math.min(0.42, ...active.map(r => r.iaiChargeTime || 0.42)) * (wp.chargeTimeMult || 1.0));
  let moveSpeedMult = (wp.moveSpeedMult || 1.0) * (1 + active.reduce((acc, r) => acc + (r.moveSpeedBonus || 0), 0));
  let aerialDmgMult = active.reduce((acc, r) => acc * (r.aerialDmgMult || 1.0), 1.0);
  let sporeImmune = active.some(r => !!r.sporeImmune);
  let sporePurifySoul = active.reduce((acc, r) => acc + (r.sporePurifySoul || 0), 0);
  let sporePurifyHeal = active.reduce((acc, r) => acc + (r.sporePurifyHeal || 0), 0);
  let frostResistMult = active.reduce((acc, r) => acc * (r.frostResistMult || 1.0), 1.0);
  let frostShatterPosture = active.reduce((acc, r) => acc + (r.frostShatterPosture || 0), 0);
  let bellTimerBonus = active.reduce((acc, r) => acc + (r.bellTimerBonus || 0), 0);
  let shadeDashCd = Math.min(1.6, ...active.map(r => r.shadeDashCd || 1.6));
  let shadeBurstMult = active.reduce((acc, r) => acc * (r.shadeBurstMult || 1.0), 1.0);
  let shadePassHeal = active.reduce((acc, r) => acc + (r.shadePassHeal || 0), 0);

  _cachedRelicStats = {
    parryWindowMs, blockWindowMs, blockChipMult, parryPostureMult, parryReflectDmg, parryHeal,
    grayDuration, rallyMult, maxFlasks, maxSeals, execHealPct, execFullSoul,
    grappleCd, spellCost, quakeCost, spellPostureBonus, heavySkillMult,
    soulGainMult, spellDmgMult, spellRadiusMult, postureDmgMult,
    iaiChargeTime, moveSpeedMult, aerialDmgMult, sporeImmune, sporePurifySoul, sporePurifyHeal,
    frostResistMult, frostShatterPosture, bellTimerBonus, shadeDashCd, shadeBurstMult, shadePassHeal, wetConductSoul,
    synergies,
    synGrappleQuake: !!synFlags.synGrappleQuake,
    synMirrorEmber: !!synFlags.synMirrorEmber,
    synBloodIai: !!synFlags.synBloodIai,
    synCoreCounter: !!synFlags.synCoreCounter,
    synShadeThread: !!synFlags.synShadeThread,
    synGaleThread: !!synFlags.synGaleThread,
    synSporeClapper: !!synFlags.synSporeClapper,
    synFrostIron: !!synFlags.synFrostIron,
    synTideClapper: !!synFlags.synTideClapper,
    hasGalefather: has('galefather'),
    hasSporeseal: has('sporeseal'),
    hasFrostcore: has('frostcore'),
    hasTidebell: has('tidebell')
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
      metChronicler: false, chroniclerClaims: [], metKeeper: false, keeperWickGifted: false, keeperBlessingActive: false,
      metScavenger: false, boughtSecretMap: false, boughtBellSatchel: false
    };
  }
  const nq = G.worldState.npcQuests;
  if (!Array.isArray(nq.chroniclerClaims)) nq.chroniclerClaims = [];
  if (nq.metScavenger === undefined) nq.metScavenger = false;
  if (nq.boughtSecretMap === undefined) nq.boughtSecretMap = false;
  if (nq.boughtBellSatchel === undefined) nq.boughtBellSatchel = false;
  return nq;
}

export function getEffectiveNpcPos(npc) {
  if (!npc) return { x: 0, y: 0, roomId: 'r01_sanctuary', migrated: false };
  const nq = G.worldState && G.worldState.npcQuests;
  if (nq) {
    if (npc.kind === 'chronicler' && Array.isArray(nq.chroniclerClaims) && nq.chroniclerClaims.length >= 1) return { x: 455, y: 580, roomId: 'r01_sanctuary', migrated: true };
    if (npc.kind === 'keeper' && nq.keeperWickGifted) return { x: 565, y: 580, roomId: 'r01_sanctuary', migrated: true };
    if (npc.kind === 'scavenger' && nq.metScavenger) return { x: 675, y: 580, roomId: 'r01_sanctuary', migrated: true };
  }
  return { x: npc.x, y: npc.y, roomId: npc.roomId, migrated: false };
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
  return (1 + lv * 0.10) * getRealmSealBonusMult();
}

export function getSmithPostureMult() {
  const lv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.posture || 0) : 0;
  return (1 + lv * 0.09) * getRealmSealBonusMult();
}

export function getPlayerMaxHp() {
  const forgeLv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.forge || 0) : 0;
  const satchel = (G.worldState && G.worldState.npcQuests && G.worldState.npcQuests.boughtBellSatchel) ? 15 : 0;
  return 100 + (G.worldState ? (G.worldState.bonusMaxHp || 0) : 0) + forgeLv * 15 + satchel;
}

export function getPlayerMaxSoul() {
  const forgeLv = (G.worldState && G.worldState.smithUpgrades) ? (G.worldState.smithUpgrades.forge || 0) : 0;
  const satchel = (G.worldState && G.worldState.npcQuests && G.worldState.npcQuests.boughtBellSatchel) ? 15 : 0;
  return 100 + (G.worldState ? (G.worldState.bonusMaxSoul || 0) : 0) + forgeLv * 15 + satchel;
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
  // Strictly clip revealed fog cells to the room currently containing (px, py) so fog NEVER bleeds through stone ceilings or into empty void!
  let curBounds = null;
  for (let i = 0; i < ROOMS.length; i++) {
    const b = ROOMS[i].bounds;
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
      curBounds = b;
      break;
    }
  }
  const col = Math.floor((px - WORLD_MIN_X) / MAP_CELL_W);
  const row = Math.floor((py - WORLD_MIN_Y) / MAP_CELL_H);
  let changed = false;
  for (let dr = -2; dr <= 2; dr++) {
    const r = row + dr;
    if (r < 0 || r >= MAP_ROWS) continue;
    const cellCy = WORLD_MIN_Y + (r + 0.5) * MAP_CELL_H;
    if (curBounds && (cellCy < curBounds.y - 12 || cellCy > curBounds.y + curBounds.h + 12)) continue;
    for (let dc = -2; dc <= 2; dc++) {
      const c = col + dc;
      if (c < 0 || c >= MAP_COLS) continue;
      const cellCx = WORLD_MIN_X + (c + 0.5) * MAP_CELL_W;
      if (curBounds && (cellCx < curBounds.x - 12 || cellCx > curBounds.x + curBounds.w + 12)) continue;
      if (!G.worldState.explored[r][c]) {
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
  const c = Math.max(0, Math.min(MAP_COLS - 1, Math.floor((x - WORLD_MIN_X) / MAP_CELL_W)));
  const r = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor((y - WORLD_MIN_Y) / MAP_CELL_H)));
  return G.worldState.explored[r][c];
}

export function getExplorationPercent() {
  if (!G.worldState) return 0;
  if (!G.exploreDirty) return G.cachedExplorePct;
  let total = 0;
  let seen = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const cy = WORLD_MIN_Y + (r + 0.5) * MAP_CELL_H;
    for (let c = 0; c < MAP_COLS; c++) {
      const cx = WORLD_MIN_X + (c + 0.5) * MAP_CELL_W;
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

export function createFoundryCrucibles() {
  return [
    { id: 'crucible_west', x: 5880, y: 1005, baseY: 1005, anchorY: 820, vy: 0, state: 'hanging', respawnTimer: 0, roomId: 'r05_foundry' },
    { id: 'crucible_east', x: 6420, y: 1005, baseY: 1005, anchorY: 820, vy: 0, state: 'hanging', respawnTimer: 0, roomId: 'r05_foundry' }
  ];
}

export function triggerBossIntro(boss, title, quote = '', color = '#fde047', duration = 1.55) {
  triggerBossBanner(title, quote, color, Math.max(2.6, duration + 1.1));
  if (G.benchActive || !boss) return;
  G.bossIntro = { boss, timer: duration, maxTimer: duration, color };
  if (G.player) {
    G.player.iframeTimer = Math.max(G.player.iframeTimer, duration + 0.35);
    G.player.vx = 0;
  }
}

export function triggerBossKillSlowmo(duration = 0.85) {
  if (G.benchActive) return;
  G.bossKillSlowmo = { timer: duration, maxTimer: duration };
}

export function triggerZoneBanner(title, sub = '', color = '#fde047', duration = 2.85) {
  if (!title || G.benchActive) return;
  G.zoneBanner = { title, sub, color, life: duration, maxLife: duration };
}

export function isPlayerInRoomId(roomId, pad = 24) {
  if (!roomId || !G.player) return true;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (r.id === roomId && r.bounds) {
      const b = r.bounds;
      return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
    }
  }
  return true;
}

export function getAwakeBoss() {
  const list = [G.boss, G.boss2, G.boss3, G.boss4];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!b || !b.awake || !b.alive) continue;
    if (G.echoSession || !b.roomId || isPlayerInRoomId(b.roomId, 60)) return b;
  }
  return null;
}

export function isBoss4Unlocked() {
  if (!G.worldState) return false;
  const dm = G.worldState.defeatedMiniBosses;
  return !!(
    G.worldState.boss3Defeated &&
    dm &&
    dm.has('warden_wind_boss') &&
    dm.has('warden_forest_boss') &&
    dm.has('warden_mountain_boss')
  );
}

export function getHudBoss() {
  const main = getAwakeBoss();
  if (main) return main;
  if (G.enemies) {
    const px = G.player ? (G.player.x + G.player.w * 0.5) : 0;
    const py = G.player ? (G.player.y + G.player.h * 0.5) : 0;
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e || !e.alive || !e.isMiniBoss || !e.awake) continue;
      if (G.echoSession) return e;
      if (e.roomId && !isPlayerInRoomId(e.roomId, 16)) continue;
      if (G.player) {
        const dx = Math.abs(px - (e.x + e.w * 0.5));
        const dy = Math.abs(py - (e.y + e.h * 0.5));
        if (dx > 760 || dy > 360) continue;
      }
      return e;
    }
  }
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
  if (G.boss4 && G.boss4.alive) list.push(G.boss4);
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
