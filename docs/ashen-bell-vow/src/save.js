// Versioned 3-slot persistence built on StorageAdapter (ready for Electron FS / Steam Cloud)
import {
  COLORS, RELICS, DEFAULT_KEYBINDS, ALTARS, WORLD_MIN_X, WORLD_MIN_Y, MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H,
  SAVE_KEY, LEGACY_SAVE_KEY_V9, LEGACY_SAVE_KEY_V8, SETTINGS_KEY
} from './config.js';
import { G, hooks, createFreshWorldState, getExplorationPercent } from './state.js';
import { WEAPON_ORDER, normalizeWeaponId, getWeaponById } from './weapons.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { syncControlModeUI, rebuildActionCodesCache } from './input.js';
import { spawnFloatText } from './vfx.js';
import { t } from './i18n.js';

export const SAVE_SLOT_COUNT = 3;
const SLOT_KEY_PREFIX = 'ashen_bell_vow_slot_';

function slotKey(slot) {
  const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Number(slot) || 0));
  return `${SLOT_KEY_PREFIX}${s}`;
}

export function migrateLegacySaveIfNeeded() {
  if (storage.get(slotKey(0))) return;
  const legacyRaw = storage.get(SAVE_KEY) || storage.get(LEGACY_SAVE_KEY_V9) || storage.get(LEGACY_SAVE_KEY_V8);
  if (!legacyRaw) return;
  try {
    const parsed = JSON.parse(legacyRaw);
    if (parsed && [8, 9, 10, 11, 12, 15].includes(parsed.v)) {
      storage.set(slotKey(0), legacyRaw);
    }
  } catch {
    // Ignore corrupt legacy data
  }
}

export function saveUserSettings() {
  storage.setJSON(SETTINGS_KEY, {
    parryWindowMult: G.settings.parryWindowMult,
    damageTakenMult: G.settings.damageTakenMult,
    haptics: !!G.settings.haptics,
    dynamicLighting: G.settings.dynamicLighting !== false,
    showPerf: !!G.settings.showPerf,
    fpsDivisor: Math.max(1, Math.min(4, Number(G.settings.fpsDivisor) || 1)),
    hitstopMode: ['standard', 'light', 'off'].includes(G.settings.hitstopMode) ? G.settings.hitstopMode : 'standard',
    musicEnabled: G.settings.musicEnabled !== false,
    masterVol: G.settings.masterVol,
    musicVol: G.settings.musicVol,
    sfxVol: G.settings.sfxVol,
    keybinds: { ...G.settings.keybinds }
  });
}

export function loadUserSettings() {
  const s = storage.getJSON(SETTINGS_KEY);
  if (!s || typeof s !== 'object') {
    audio.setVolumes(G.settings.masterVol, G.settings.musicVol, G.settings.sfxVol);
    return;
  }
  if ([1.0, 1.35, 1.7].includes(Number(s.parryWindowMult))) G.settings.parryWindowMult = Number(s.parryWindowMult);
  if ([1.0, 0.7, 0.5].includes(Number(s.damageTakenMult))) G.settings.damageTakenMult = Number(s.damageTakenMult);
  if (typeof s.haptics === 'boolean') G.settings.haptics = s.haptics;
  if (typeof s.dynamicLighting === 'boolean') G.settings.dynamicLighting = s.dynamicLighting;
  if (typeof s.showPerf === 'boolean') G.settings.showPerf = s.showPerf;
  if ([1, 2, 3, 4].includes(Number(s.fpsDivisor))) G.settings.fpsDivisor = Number(s.fpsDivisor);
  else G.settings.fpsDivisor = 1; // Migrate off legacy non-integer fpsCap cleanly
  if (['standard', 'light', 'off'].includes(s.hitstopMode)) G.settings.hitstopMode = s.hitstopMode;
  if (typeof s.musicEnabled === 'boolean') {
    G.settings.musicEnabled = s.musicEnabled;
    audio.setMusicEnabled(s.musicEnabled);
  }
  if (typeof s.masterVol === 'number' && !Number.isNaN(s.masterVol)) G.settings.masterVol = Math.max(0, Math.min(1, s.masterVol));
  if (typeof s.musicVol === 'number' && !Number.isNaN(s.musicVol)) G.settings.musicVol = Math.max(0, Math.min(1, s.musicVol));
  if (typeof s.sfxVol === 'number' && !Number.isNaN(s.sfxVol)) G.settings.sfxVol = Math.max(0, Math.min(1, s.sfxVol));
  audio.setVolumes(G.settings.masterVol, G.settings.musicVol, G.settings.sfxVol);

  if (s.keybinds && typeof s.keybinds === 'object') {
    G.settings.keybinds = { ...DEFAULT_KEYBINDS };
    for (const k of Object.keys(DEFAULT_KEYBINDS)) {
      if (typeof s.keybinds[k] === 'string' && s.keybinds[k].length > 0) {
        G.settings.keybinds[k] = s.keybinds[k];
      }
    }
  }
  rebuildActionCodesCache();
}

export function readSaveSlot(slot = G.activeSaveSlot) {
  migrateLegacySaveIfNeeded();
  const data = storage.getJSON(slotKey(slot));
  if (!data || ![8, 9, 10, 11, 12, 15, 17, 18, 19, 20, 25, 26, 30, 33, 34, 35].includes(data.v)) return null;
  return data;
}

export function readSaveData() {
  return readSaveSlot(G.activeSaveSlot);
}

export function listSaveSlots() {
  migrateLegacySaveIfNeeded();
  const list = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    list.push({ slot: i, data: readSaveSlot(i) });
  }
  return list;
}

export function deleteSaveSlot(slot) {
  storage.remove(slotKey(slot));
  if (slot === 0) {
    storage.remove(SAVE_KEY);
  }
  hooks.refreshTitleSaveUI();
}

export function saveProgress(showToast = false) {
  if (!G.worldState || G.benchActive) return;
  const exploredStr = G.worldState.explored
    .map(row => row.map(cell => (cell ? '1' : '0')).join(''))
    .join('|');
  const eqIds = (G.equippedRelics || [G.currentRelic, null, null]).slice(0, 3).map(r => (r ? r.id : null));
  const rawCodex = G.worldState.codex || { readTablets: [], bestiary: {}, achievements: [], discoveredSynergies: [] };
  const rawNq = G.worldState.npcQuests || { metChronicler: false, chroniclerClaims: [], metKeeper: false, keeperWickGifted: false, keeperBlessingActive: false };
  const payload = {
    v: 35,
    npcQuests: {
      metChronicler: !!rawNq.metChronicler,
      chroniclerClaims: Array.isArray(rawNq.chroniclerClaims) ? [...new Set(rawNq.chroniclerClaims)] : [],
      metKeeper: !!rawNq.metKeeper,
      keeperWickGifted: !!rawNq.keeperWickGifted,
      keeperBlessingActive: !!rawNq.keeperBlessingActive
    },
    slot: G.activeSaveSlot,
    ngPlusCycle: Math.max(1, Math.floor(Number(G.worldState.ngPlusCycle) || 1)),
    activeVows: G.worldState.activeVows ? [...G.worldState.activeVows] : [],
    codex: {
      readTablets: Array.isArray(rawCodex.readTablets) ? [...new Set(rawCodex.readTablets)] : [],
      bestiary: rawCodex.bestiary && typeof rawCodex.bestiary === 'object' ? JSON.parse(JSON.stringify(rawCodex.bestiary)) : {},
      achievements: Array.isArray(rawCodex.achievements) ? [...new Set(rawCodex.achievements)] : [],
      discoveredSynergies: Array.isArray(rawCodex.discoveredSynergies) ? [...new Set(rawCodex.discoveredSynergies)] : []
    },
    mapPins: Array.isArray(G.worldState.mapPins) ? G.worldState.mapPins.slice(0, 36).map(p => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), type: p.type })) : [],
    savedAt: Date.now(),
    playTimeSec: Math.floor(G.playTimeSec || 0),
    controlMode: G.controlMode,
    muted: audio.muted,
    relicId: eqIds[0] || G.currentRelic.id,
    equippedRelicIds: eqIds,
    litAltars: [...G.worldState.litAltars],
    activeAltarId: G.worldState.activeAltarId,
    bossDefeated: !!G.worldState.bossDefeated,
    boss2Defeated: !!G.worldState.boss2Defeated,
    boss3Defeated: !!G.worldState.boss3Defeated,
    boss4Defeated: !!G.worldState.boss4Defeated,
    defeatedMiniBosses: G.worldState.defeatedMiniBosses ? [...G.worldState.defeatedMiniBosses] : [],
    realmSeals: G.worldState.realmSeals ? { wind: !!G.worldState.realmSeals.wind, forest: !!G.worldState.realmSeals.forest, mountain: !!G.worldState.realmSeals.mountain } : { wind: false, forest: false, mountain: false },
    keyItems: { dawnSigil: !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil) },
    endingsUnlocked: Array.isArray(G.worldState.endingsUnlocked) ? [...G.worldState.endingsUnlocked] : [],
    echoRecords: G.worldState.echoRecords || { hui: null, ji: null, yuan: null, rush: null, warden_wind: null, warden_forest: null, warden_mountain: null, warden_rush: null, zhu: null, seven_bells: null },
    shortcutOpen: !!G.worldState.shortcutOpen,
    solvedPuzzles: [...(G.worldState.solvedPuzzles || [])],
    brokenWalls: G.worldState.secretWalls.filter(w => w.broken).map(w => w.id),
    collectedPickups: G.worldState.pickups.filter(p => p.collected).map(p => p.id),
    bonusFlasks: G.worldState.bonusFlasks,
    bonusMaxHp: G.worldState.bonusMaxHp || 0,
    bonusMaxSoul: G.worldState.bonusMaxSoul || 0,
    echoes: G.worldState.echoes || 0,
    lostEchoes: G.worldState.lostEchoes ? { ...G.worldState.lostEchoes } : null,
    smithUpgrades: { ...(G.worldState.smithUpgrades || { blade: 0, posture: 0, forge: 0 }) },
    abilities: { doubleJump: !!G.worldState.abilities.doubleJump, shadeDash: !!G.worldState.abilities.shadeDash },
    equippedWeapon: normalizeWeaponId(G.worldState.equippedWeapon || 'blade'),
    unlockedWeapons: G.worldState.unlockedWeapons ? [...G.worldState.unlockedWeapons] : ['blade'],
    weaponTraits: G.worldState.weaponTraits ? { ...G.worldState.weaponTraits } : { blade: null, hammer: null, bell: null },
    unlockedWeaponTraits: G.worldState.unlockedWeaponTraits ? [...G.worldState.unlockedWeaponTraits] : [],
    skillNodes: G.worldState.skillNodes ? [...G.worldState.skillNodes] : [],
    unlockedRelics: [...G.worldState.unlockedRelics],
    refinedRelics: G.worldState.refinedRelics ? [...G.worldState.refinedRelics] : [],
    exploredStr,
    explorePct: getExplorationPercent()
  };
  const targetKey = slotKey(G.activeSaveSlot);
  G.saveDirtyTimer = 0;
  if (!showToast && G.gameState === 'playing') {
    const writeNow = () => storage.setJSON(targetKey, payload);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(writeNow, { timeout: 1200 });
    } else {
      window.setTimeout(writeNow, 16);
    }
  } else {
    storage.setJSON(targetKey, payload);
  }
  if (G.gameState === 'title') hooks.refreshTitleSaveUI();
  if (showToast && G.player && G.gameState === 'playing') {
    spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 68, t('save.toast', G.activeSaveSlot + 1), COLORS.cyanBright, 14, 1.0);
  }
}

export function applySaveData(data) {
  G.worldState = createFreshWorldState();
  G.worldState.ngPlusCycle = Math.max(1, Math.floor(Number(data.ngPlusCycle) || 1));
  G.worldState.activeVows = new Set(Array.isArray(data.activeVows) ? data.activeVows.filter(v => ['noFlasks', 'doubleDmg', 'noGrayBlock', 'fierceFoes'].includes(v)) : []);
  if (data.codex && typeof data.codex === 'object') {
    G.worldState.codex = {
      readTablets: Array.isArray(data.codex.readTablets) ? [...new Set(data.codex.readTablets)] : [],
      bestiary: data.codex.bestiary && typeof data.codex.bestiary === 'object' ? JSON.parse(JSON.stringify(data.codex.bestiary)) : {},
      achievements: Array.isArray(data.codex.achievements) ? [...new Set(data.codex.achievements)] : [],
      discoveredSynergies: Array.isArray(data.codex.discoveredSynergies) ? [...new Set(data.codex.discoveredSynergies)] : []
    };
  }
  G.worldState.mapPins = Array.isArray(data.mapPins)
    ? data.mapPins
        .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && ['wall', 'barrier', 'foe'].includes(p.type))
        .slice(0, 36)
        .map((p, idx) => ({ id: p.id || `pin_${idx}`, x: Math.round(p.x), y: Math.round(p.y), type: p.type }))
    : [];
  G.playTimeSec = Math.max(0, Number(data.playTimeSec) || 0);
  G.worldState.litAltars = new Set(Array.isArray(data.litAltars) && data.litAltars.length ? data.litAltars : ['altar_start']);
  G.worldState.activeAltarId = ALTARS.some(a => a.id === data.activeAltarId) ? data.activeAltarId : 'altar_start';
  G.worldState.bossDefeated = !!data.bossDefeated;
  G.worldState.boss2Defeated = !!data.boss2Defeated;
  G.worldState.boss3Defeated = !!data.boss3Defeated;
  G.worldState.boss4Defeated = !!data.boss4Defeated;
  G.worldState.defeatedMiniBosses = new Set(Array.isArray(data.defeatedMiniBosses) ? data.defeatedMiniBosses : []);
  G.worldState.chapelExitAnim = G.worldState.bossDefeated ? 1 : 0;
  G.worldState.foundryGateAnim = (data.abilities && data.abilities.doubleJump) ? 1 : 0;
  G.worldState.foundryExitAnim = G.worldState.boss2Defeated ? 1 : 0;
  const rawSeals = data.realmSeals && typeof data.realmSeals === 'object' ? data.realmSeals : null;
  G.worldState.realmSeals = {
    wind: !!(rawSeals ? rawSeals.wind : G.worldState.defeatedMiniBosses.has('warden_wind_boss')),
    forest: !!(rawSeals ? rawSeals.forest : G.worldState.defeatedMiniBosses.has('warden_forest_boss')),
    mountain: !!(rawSeals ? rawSeals.mountain : G.worldState.defeatedMiniBosses.has('warden_mountain_boss'))
  };
  G.worldState.skyBridgeGateAnim = (G.worldState.realmSeals.wind || G.worldState.realmSeals.mountain || G.worldState.defeatedMiniBosses.has('warden_wind_boss') || G.worldState.defeatedMiniBosses.has('warden_mountain_boss')) ? 1 : 0;
  G.worldState.keyItems = { dawnSigil: !!(data.keyItems && data.keyItems.dawnSigil) };
  G.worldState.endingsUnlocked = Array.isArray(data.endingsUnlocked) ? [...new Set(data.endingsUnlocked)] : [];
  G.worldState.echoRecords = {
    hui: data.echoRecords && data.echoRecords.hui ? data.echoRecords.hui : null,
    ji: data.echoRecords && data.echoRecords.ji ? data.echoRecords.ji : null,
    yuan: data.echoRecords && data.echoRecords.yuan ? data.echoRecords.yuan : null,
    rush: data.echoRecords && data.echoRecords.rush ? data.echoRecords.rush : null,
    warden_wind: data.echoRecords && data.echoRecords.warden_wind ? data.echoRecords.warden_wind : null,
    warden_forest: data.echoRecords && data.echoRecords.warden_forest ? data.echoRecords.warden_forest : null,
    warden_mountain: data.echoRecords && data.echoRecords.warden_mountain ? data.echoRecords.warden_mountain : null,
    warden_rush: data.echoRecords && data.echoRecords.warden_rush ? data.echoRecords.warden_rush : null,
    zhu: data.echoRecords && data.echoRecords.zhu ? data.echoRecords.zhu : null,
    seven_bells: data.echoRecords && data.echoRecords.seven_bells ? data.echoRecords.seven_bells : null
  };
  G.worldState.shortcutOpen = !!data.shortcutOpen;
  G.worldState.shortcutAnim = G.worldState.shortcutOpen ? 1 : 0;
  G.worldState.solvedPuzzles = new Set(Array.isArray(data.solvedPuzzles) ? data.solvedPuzzles : []);
  G.worldState.bonusFlasks = Number(data.bonusFlasks) || 0;
  G.worldState.bonusMaxHp = Number(data.bonusMaxHp) || 0;
  G.worldState.bonusMaxSoul = Number(data.bonusMaxSoul) || 0;
  G.worldState.echoes = Math.max(0, Number(data.echoes) || 0);
  G.worldState.lostEchoes = (data.lostEchoes && Number(data.lostEchoes.amount) > 0)
    ? {
        amount: Math.floor(Number(data.lostEchoes.amount)),
        x: Number(data.lostEchoes.x) || 330,
        y: Number(data.lostEchoes.y) || 548,
        roomId: data.lostEchoes.roomId || 'r01_sanctuary'
      }
    : null;
  G.worldState.smithUpgrades = {
    blade: Math.max(0, Math.min(5, Number(data.smithUpgrades && data.smithUpgrades.blade) || 0)),
    posture: Math.max(0, Math.min(3, Number(data.smithUpgrades && data.smithUpgrades.posture) || 0)),
    forge: Math.max(0, Math.min(3, Number(data.smithUpgrades && data.smithUpgrades.forge) || 0))
  };
  if (data.npcQuests && typeof data.npcQuests === 'object') {
    G.worldState.npcQuests = {
      metChronicler: !!data.npcQuests.metChronicler,
      chroniclerClaims: Array.isArray(data.npcQuests.chroniclerClaims) ? [...new Set(data.npcQuests.chroniclerClaims)] : [],
      metKeeper: !!data.npcQuests.metKeeper,
      keeperWickGifted: !!data.npcQuests.keeperWickGifted,
      keeperBlessingActive: !!data.npcQuests.keeperBlessingActive
    };
  }
  G.worldState.abilities = {
    doubleJump: !!(data.abilities && data.abilities.doubleJump),
    shadeDash: !!(data.abilities && data.abilities.shadeDash)
  };
  const rawUnlW = Array.isArray(data.unlockedWeapons) && data.unlockedWeapons.length
    ? data.unlockedWeapons.map(normalizeWeaponId)
    : ['blade'];
  G.worldState.unlockedWeapons = new Set(['blade', ...rawUnlW]);
  const pickedListForW = Array.isArray(data.collectedPickups) ? data.collectedPickups : [];
  if (pickedListForW.includes('pickup_weapon_bell')) G.worldState.unlockedWeapons.add('bell');
  const eqNorm = normalizeWeaponId(data.equippedWeapon || 'blade');
  if (data.equippedWeapon === 'shield') G.worldState.unlockedWeapons.add('hammer');
  G.worldState.equippedWeapon = G.worldState.unlockedWeapons.has(eqNorm) ? eqNorm : 'blade';
  const rawTraits = Array.isArray(data.unlockedWeaponTraits) ? data.unlockedWeaponTraits.filter(x => typeof x === 'string') : [];
  G.worldState.unlockedWeaponTraits = new Set(rawTraits);
  G.worldState.skillNodes = new Set(Array.isArray(data.skillNodes) ? data.skillNodes.filter(x => typeof x === 'string') : []);
  const wtObj = data.weaponTraits && typeof data.weaponTraits === 'object' ? data.weaponTraits : {};
  G.worldState.weaponTraits = {
    blade: (wtObj.blade && G.worldState.unlockedWeaponTraits.has(wtObj.blade)) ? wtObj.blade : null,
    hammer: (wtObj.hammer && G.worldState.unlockedWeaponTraits.has(wtObj.hammer)) ? wtObj.hammer : null,
    bell: (wtObj.bell && G.worldState.unlockedWeaponTraits.has(wtObj.bell)) ? wtObj.bell : null
  };
  G.worldState.unlockedRelics = new Set(Array.isArray(data.unlockedRelics) && data.unlockedRelics.length ? data.unlockedRelics : ['thorn', 'mirror', 'ember']);
  G.worldState.refinedRelics = new Set(Array.isArray(data.refinedRelics) ? data.refinedRelics.filter(id => typeof id === 'string' && RELICS.some(r => r.id === id)) : []);

  const brokenSet = new Set(Array.isArray(data.brokenWalls) ? data.brokenWalls : []);
  for (const w of G.worldState.secretWalls) {
    if (brokenSet.has(w.id)) { w.broken = true; w.hp = 0; }
  }
  const pickedSet = new Set(Array.isArray(data.collectedPickups) ? data.collectedPickups : []);
  for (const p of G.worldState.pickups) {
    if (pickedSet.has(p.id)) p.collected = true;
  }

  if (typeof data.exploredStr === 'string') {
    const rows = data.exploredStr.split('|');
    const oldR = rows.length;
    const oldC = oldR > 0 ? rows[0].length : 0;
    if (oldR === MAP_ROWS && oldC === MAP_COLS && data.v >= 30) {
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          G.worldState.explored[r][c] = rows[r][c] === '1';
        }
      }
    } else if (oldR > 0 && oldC > 0) {
      // Seamless world-space reprojection for legacy v8-v26 saves (mapped 0..9680 x 0..1520)
      const legacyW = oldC >= 44 ? 9680 : 6740;
      const legacyH = 1520;
      for (let r = 0; r < oldR; r++) {
        const wy = ((r + 0.5) / oldR) * legacyH;
        const nr = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor((wy - WORLD_MIN_Y) / MAP_CELL_H)));
        for (let c = 0; c < Math.min(oldC, rows[r].length); c++) {
          if (rows[r][c] !== '1') continue;
          const wx = ((c + 0.5) / oldC) * legacyW;
          const nc = Math.max(0, Math.min(MAP_COLS - 1, Math.floor((wx - WORLD_MIN_X) / MAP_CELL_W)));
          G.worldState.explored[nr][nc] = true;
        }
      }
    }
  }

  const resolveUnlocked = id => RELICS.find(r => r.id === id && (!r.hidden || G.worldState.unlockedRelics.has(r.id))) || null;
  const rawIds = Array.isArray(data.equippedRelicIds) && data.equippedRelicIds.length ? data.equippedRelicIds : [data.relicId, null, null];
  const slot0 = resolveUnlocked(rawIds[0]) || RELICS[0];
  let slot1 = resolveUnlocked(rawIds[1]);
  if (slot1 && slot1.id === slot0.id) slot1 = null;
  let slot2 = resolveUnlocked(rawIds[2]);
  if (slot2 && (slot2.id === slot0.id || (slot1 && slot2.id === slot1.id))) slot2 = null;
  G.equippedRelics = [slot0, slot1, slot2];
  G.currentRelic = slot0;
  if (data.controlMode === 'kbmouse' || data.controlMode === 'keyboard') {
    G.controlMode = data.controlMode;
    syncControlModeUI();
  }
  if (typeof data.muted === 'boolean') {
    audio.setMuted(data.muted);
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) muteBtn.textContent = audio.muted ? t('hud.muteOff') : t('hud.muteOn');
  }
  G.exploreDirty = true;
  G.minimapDirty = true;
}
