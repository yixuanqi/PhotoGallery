// Versioned 3-slot persistence built on StorageAdapter (ready for Electron FS / Steam Cloud)
import {
  COLORS, RELICS, DEFAULT_KEYBINDS, ALTARS, MAP_COLS, MAP_ROWS,
  SAVE_KEY, LEGACY_SAVE_KEY_V9, LEGACY_SAVE_KEY_V8, SETTINGS_KEY
} from './config.js';
import { G, hooks, createFreshWorldState, getExplorationPercent } from './state.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { syncControlModeUI } from './input.js';
import { spawnFloatText } from './vfx.js';

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
}

export function readSaveSlot(slot = G.activeSaveSlot) {
  migrateLegacySaveIfNeeded();
  const data = storage.getJSON(slotKey(slot));
  if (!data || ![8, 9, 10, 11, 12, 15, 17].includes(data.v)) return null;
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
  if (!G.worldState) return;
  const exploredStr = G.worldState.explored
    .map(row => row.map(cell => (cell ? '1' : '0')).join(''))
    .join('|');
  const eqIds = (G.equippedRelics || [G.currentRelic, null]).map(r => (r ? r.id : null));
  const payload = {
    v: 17,
    slot: G.activeSaveSlot,
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
    keyItems: { dawnSigil: !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil) },
    endingsUnlocked: Array.isArray(G.worldState.endingsUnlocked) ? [...G.worldState.endingsUnlocked] : [],
    echoRecords: G.worldState.echoRecords || { hui: null, ji: null, yuan: null, rush: null },
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
    unlockedRelics: [...G.worldState.unlockedRelics],
    exploredStr,
    explorePct: getExplorationPercent()
  };
  storage.setJSON(slotKey(G.activeSaveSlot), payload);
  G.saveDirtyTimer = 0;
  if (G.gameState === 'title') hooks.refreshTitleSaveUI();
  if (showToast && G.player && G.gameState === 'playing') {
    spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 68, `档案 ${G.activeSaveSlot + 1} · 灯火已铭刻`, COLORS.cyanBright, 14, 1.0);
  }
}

export function applySaveData(data) {
  G.worldState = createFreshWorldState();
  G.playTimeSec = Math.max(0, Number(data.playTimeSec) || 0);
  G.worldState.litAltars = new Set(Array.isArray(data.litAltars) && data.litAltars.length ? data.litAltars : ['altar_start']);
  G.worldState.activeAltarId = ALTARS.some(a => a.id === data.activeAltarId) ? data.activeAltarId : 'altar_start';
  G.worldState.bossDefeated = !!data.bossDefeated;
  G.worldState.boss2Defeated = !!data.boss2Defeated;
  G.worldState.boss3Defeated = !!data.boss3Defeated;
  G.worldState.chapelExitAnim = G.worldState.bossDefeated ? 1 : 0;
  G.worldState.foundryGateAnim = (data.abilities && data.abilities.doubleJump) ? 1 : 0;
  G.worldState.foundryExitAnim = G.worldState.boss2Defeated ? 1 : 0;
  G.worldState.keyItems = { dawnSigil: !!(data.keyItems && data.keyItems.dawnSigil) };
  G.worldState.endingsUnlocked = Array.isArray(data.endingsUnlocked) ? [...new Set(data.endingsUnlocked)] : [];
  G.worldState.echoRecords = {
    hui: data.echoRecords && data.echoRecords.hui ? data.echoRecords.hui : null,
    ji: data.echoRecords && data.echoRecords.ji ? data.echoRecords.ji : null,
    yuan: data.echoRecords && data.echoRecords.yuan ? data.echoRecords.yuan : null,
    rush: data.echoRecords && data.echoRecords.rush ? data.echoRecords.rush : null
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
  G.worldState.abilities = {
    doubleJump: !!(data.abilities && data.abilities.doubleJump),
    shadeDash: !!(data.abilities && data.abilities.shadeDash)
  };
  G.worldState.unlockedRelics = new Set(Array.isArray(data.unlockedRelics) && data.unlockedRelics.length ? data.unlockedRelics : ['thorn', 'mirror', 'ember']);

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
    for (let r = 0; r < Math.min(MAP_ROWS, rows.length); r++) {
      for (let c = 0; c < Math.min(MAP_COLS, rows[r].length); c++) {
        G.worldState.explored[r][c] = rows[r][c] === '1';
      }
    }
  }

  const resolveUnlocked = id => RELICS.find(r => r.id === id && (!r.hidden || G.worldState.unlockedRelics.has(r.id))) || null;
  const rawIds = Array.isArray(data.equippedRelicIds) && data.equippedRelicIds.length ? data.equippedRelicIds : [data.relicId, null];
  const slot0 = resolveUnlocked(rawIds[0]) || RELICS[0];
  let slot1 = resolveUnlocked(rawIds[1]);
  if (slot1 && slot1.id === slot0.id) slot1 = null;
  G.equippedRelics = [slot0, slot1];
  G.currentRelic = slot0;
  if (data.controlMode === 'kbmouse' || data.controlMode === 'keyboard') {
    G.controlMode = data.controlMode;
    syncControlModeUI();
  }
  if (typeof data.muted === 'boolean') {
    audio.setMuted(data.muted);
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) muteBtn.textContent = audio.muted ? '音效: 关' : '音效: 开';
  }
  G.exploreDirty = true;
  G.minimapDirty = true;
}
