// Versioned localStorage persistence (v9 with seamless v8 migration)
import {
  COLORS, RELICS, ALTARS, MAP_COLS, MAP_ROWS, SAVE_KEY, LEGACY_SAVE_KEY_V9, LEGACY_SAVE_KEY_V8
} from './config.js';
import { G, hooks, createFreshWorldState, getExplorationPercent } from './state.js';
import { audio } from './audio.js';
import { syncControlModeUI } from './input.js';
import { spawnFloatText } from './vfx.js';

export function readSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY_V9) || localStorage.getItem(LEGACY_SAVE_KEY_V8);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || (data.v !== 8 && data.v !== 9 && data.v !== 10)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveProgress(showToast = false) {
  if (!G.worldState) return;
  try {
    const exploredStr = G.worldState.explored
      .map(row => row.map(cell => (cell ? '1' : '0')).join(''))
      .join('|');
    const eqIds = (G.equippedRelics || [G.currentRelic, null]).map(r => (r ? r.id : null));
    const payload = {
      v: 10,
      savedAt: Date.now(),
      controlMode: G.controlMode,
      muted: audio.muted,
      relicId: eqIds[0] || G.currentRelic.id,
      equippedRelicIds: eqIds,
      litAltars: [...G.worldState.litAltars],
      activeAltarId: G.worldState.activeAltarId,
      bossDefeated: !!G.worldState.bossDefeated,
      boss2Defeated: !!G.worldState.boss2Defeated,
      echoRecords: G.worldState.echoRecords || { hui: null, ji: null, rush: null },
      shortcutOpen: !!G.worldState.shortcutOpen,
      solvedPuzzles: [...(G.worldState.solvedPuzzles || [])],
      brokenWalls: G.worldState.secretWalls.filter(w => w.broken).map(w => w.id),
      collectedPickups: G.worldState.pickups.filter(p => p.collected).map(p => p.id),
      bonusFlasks: G.worldState.bonusFlasks,
      bonusMaxHp: G.worldState.bonusMaxHp || 0,
      bonusMaxSoul: G.worldState.bonusMaxSoul || 0,
      abilities: { doubleJump: !!G.worldState.abilities.doubleJump },
      unlockedRelics: [...G.worldState.unlockedRelics],
      exploredStr,
      explorePct: getExplorationPercent()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    G.saveDirtyTimer = 0;
    hooks.refreshTitleSaveUI();
    if (showToast && G.player && G.gameState === 'playing') {
      spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 68, '灯火已铭刻', COLORS.cyanBright, 14, 1.0);
    }
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}

export function applySaveData(data) {
  G.worldState = createFreshWorldState();
  G.worldState.litAltars = new Set(Array.isArray(data.litAltars) && data.litAltars.length ? data.litAltars : ['altar_start']);
  G.worldState.activeAltarId = ALTARS.some(a => a.id === data.activeAltarId) ? data.activeAltarId : 'altar_start';
  G.worldState.bossDefeated = !!data.bossDefeated;
  G.worldState.boss2Defeated = !!data.boss2Defeated;
  G.worldState.chapelExitAnim = G.worldState.bossDefeated ? 1 : 0;
  G.worldState.foundryGateAnim = (data.abilities && data.abilities.doubleJump) ? 1 : 0;
  G.worldState.echoRecords = {
    hui: data.echoRecords && data.echoRecords.hui ? data.echoRecords.hui : null,
    ji: data.echoRecords && data.echoRecords.ji ? data.echoRecords.ji : null,
    rush: data.echoRecords && data.echoRecords.rush ? data.echoRecords.rush : null
  };
  G.worldState.shortcutOpen = !!data.shortcutOpen;
  G.worldState.shortcutAnim = G.worldState.shortcutOpen ? 1 : 0;
  G.worldState.solvedPuzzles = new Set(Array.isArray(data.solvedPuzzles) ? data.solvedPuzzles : []);
  G.worldState.bonusFlasks = Number(data.bonusFlasks) || 0;
  G.worldState.bonusMaxHp = Number(data.bonusMaxHp) || 0;
  G.worldState.bonusMaxSoul = Number(data.bonusMaxSoul) || 0;
  G.worldState.abilities = { doubleJump: !!(data.abilities && data.abilities.doubleJump) };
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
