// Shared UI DOM cache, modal visibility lifecycle, formatting helpers & acyclic uiHooks (v32.0)
import {
  COLORS, RELICS, RELIC_SYNERGIES, VOW_CONSTRAINTS, DUMMY_MODES, SMITH_UPGRADES, ACTION_META, ROOMS, SOLIDS, ALTARS, NPCS, LORE_TABLETS, PICKUPS_DEF, ENEMIES_DEF, BOSSES_DEF,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, VOID_BARRIERS,
  ABYSSAL_RIVERS, WIND_ZONES, BOUNCE_PADS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, WORLD_SPAN_W, WORLD_SPAN_H, FLOOR_Y, WELL_BOTTOM_Y,
  MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H, ECHO_GRADE_ORDER, SEVEN_BELLS_ORDER
} from '../config.js';
import { getRoomAt, getZoneLabelAt, getPreviewSpawnRoomId, getPreviewSpawnCoords, getRoomSpawnPoint } from '../levelLoader.js';
import {
  G, createFreshWorldState, getActiveAltar, getActiveSynergies, getRelicStats, getActiveVowStats, getCombatScaling, getEquippedRelicLabel, getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  isWeaponTraitUnlocked, getActiveWeaponTraitId, unlockWeaponTrait, setActiveWeaponTrait,
  ensureNpcQuests, hasKeeperBlessing, isRelicRefined,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, getPlayerMaxSeals,
  markMapExplored, getExplorationPercent, createLanterns,
  createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, getHudBoss, isBoss4Unlocked, clearOutcomeTimer, triggerBossBanner, setTextFast
} from '../state.js';
import { audio } from '../audio.js';
import {
  isActionHeld, syncHelpModalText, getActionKeyLabel, startKeyCapture, cancelKeyCapture, triggerHaptic
} from '../input.js';
import { isPickupUnlocked, equipWeapon } from '../combat.js';
import { spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { snapCameraToPlayer } from '../world.js';
import { createPlayer, createSentinels, createBoss, createBoss2, createBoss3, createBoss4, makeWardenWind, makeWardenForest, makeWardenMountain } from '../entities.js';
import { readSaveData, listSaveSlots, deleteSaveSlot, saveProgress, applySaveData, saveUserSettings } from '../save.js';
import {
  t, getLocale, isEn, getLocaleVersion, getCanvasFont,
  locZoneName, locRoomName, locAltar, locTablet, locPickup, locNpcName,
  locRelic, locSynergy, locSmithUpgrade, locVow, locBestiary, locAchievement,
  locPin, locBoss, locDummyMode, locActionLabel, getEndingScript
} from '../i18n.js';
import { SLOT_EMBLEMS, getRelicEmblemSvg, getBestiaryEmblemSvg, getWeaponEmblemSvg } from '../emblems.js';
import { WEAPON_ORDER, WEAPONS, WEAPON_FORGE_TRAIT_COST, getWeaponForgeTraits, getWeaponUltimateDef } from '../weapons.js';
import { prof } from '../profiler.js';
import {
  BESTIARY_ENTRIES, ACHIEVEMENTS_DEF, MAP_PIN_TYPES, ensureCodexState,
  recordTabletRead, recordSynergyDiscovered, checkAchievements, getRoomCollectibleStats
} from '../codex.js';

export const uiState = {
  activeNpcModalRef: null
};

// Late-bound intra-UI callbacks populated by src/ui.js facade to guarantee a 100% acyclic module DAG
export const uiHooks = {
  syncHUD: () => {},
  refreshTitleSaveUI: () => {},
  renderSettingsModal: () => {},
  renderRelicChoices: () => {},
  renderCodexModal: () => {},
  renderChroniclerModal: () => {},
  renderKeeperModal: () => {},
  renderSmithModal: () => {},
  renderDummyModal: () => {},
  renderLoreModal: () => {},
  startGame: () => {},
  startNewGamePlus: () => {},
  respawnAtActiveAltar: () => {},
  startEchoChallenge: () => {},
  startEndingCinematic: () => {}
};

export const HUD_DOM = {
  hpReal: document.getElementById('hp-real'),
  hpGray: document.getElementById('hp-gray'),
  hpText: document.getElementById('hp-text'),
  relicTag: document.getElementById('relic-tag'),
  abilityGrappleTag: document.getElementById('ability-grapple-tag'),
  abilityTag: document.getElementById('ability-tag'),
  abilityShadeTag: document.getElementById('ability-shade-tag'),
  abilityDiveTag: document.getElementById('ability-dive-tag'),
  keyDawnTag: document.getElementById('key-dawn-tag'),
  blessingTag: document.getElementById('blessing-tag'),
  realmSealsTag: document.getElementById('realm-seals-tag'),
  vowCycleTag: document.getElementById('vow-cycle-tag'),
  soulFill: document.getElementById('soul-fill'),
  soulText: document.getElementById('soul-text'),
  flaskWrap: document.getElementById('flask-pips'),
  sealWrap: document.getElementById('seal-pips'),
  sealsBtn: document.getElementById('seals-btn'),
  echoesText: document.getElementById('echoes-text'),
  zoneEl: document.getElementById('zone-banner'),
  explorePct: document.getElementById('explore-pct'),
  minimapCanvas: document.getElementById('minimapCanvas'),
  fullMapCanvas: document.getElementById('fullMapCanvas'),
  bossHud: document.getElementById('boss-hud'),
  bossNameLabel: document.getElementById('boss-name-label'),
  bossHpFill: document.getElementById('boss-hp-fill'),
  bossPostureFill: document.getElementById('boss-posture-fill'),
  bossPhaseTag: document.getElementById('boss-phase-tag'),
  titleSaveInfo: document.getElementById('title-save-info'),
  btnContinue: document.getElementById('btn-continue'),
  btnStart: document.getElementById('btn-start'),
  fanSpell: document.getElementById('fan-spell'),
  fanSpellSub: document.getElementById('fan-spell-sub'),
  fanDash: document.getElementById('fan-dash'),
  fanHeal: document.getElementById('fan-heal'),
  fanHealCnt: document.getElementById('fan-heal-cnt'),
  fanGrapple: document.getElementById('fan-grapple'),
  fanSwap: document.getElementById('fan-swap'),
  fanSwapSub: document.getElementById('fan-swap-sub'),
  fanSeal: document.getElementById('fan-seal'),
  fanSealLabel: document.getElementById('fan-seal-label'),
  fanSealSub: document.getElementById('fan-seal-sub'),
  fanAttack: document.getElementById('fan-attack'),
  fanAttackRing: document.getElementById('fan-attack-ring'),
  fanAttackSub: document.getElementById('fan-attack-sub'),
  weaponHudBar: document.getElementById('weapon-hud-bar'),
  mobileInteract: document.getElementById('mobile-interact-btn')
};

export function getLocalizedRelicLabel() {
  const active = (G.equippedRelics || [G.currentRelic]).filter(Boolean);
  if (active.length === 0) return locRelic(RELICS[0], 'name');
  return active.map(r => locRelic(r, 'name') + (isRelicRefined(r.id) ? '★' : '')).join(' · ');
}

export function getLocalizedVowShorts() {
  const vs = G.worldState && G.worldState.activeVows ? G.worldState.activeVows : null;
  if (!vs || vs.size === 0) return '';
  return VOW_CONSTRAINTS.filter(vc => vs.has(vc.id)).map(vc => locVow(vc, 'short')).join('·');
}

export function formatPlayTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(r).padStart(2, '0')}s`;
}

export function hideAllOverlays() {
  document.querySelectorAll('.overlay-screen').forEach(el => el.classList.add('hidden'));
  G.activeModal = null;
}

export function openModal(name) {
  if (G.gameState === 'dead' || G.gameState === 'victory') return;
  const modal = document.getElementById(`${name}-modal`);
  if (!modal) return;

  if (G.gameState !== 'modal') G.modalReturnState = G.gameState;
  hideAllOverlays();
  G.gameState = 'modal';
  G.activeModal = name;
  if (name === 'help') syncHelpModalText();
  if (name === 'settings') uiHooks.renderSettingsModal();
  const card = modal.querySelector('.modal-card');
  if (card) card.scrollTop = 0;
  modal.classList.remove('hidden');
}

export function closeModal(name = G.activeModal) {
  cancelKeyCapture();
  if (!name) return;
  const modal = document.getElementById(`${name}-modal`);
  if (modal) modal.classList.add('hidden');
  if (G.activeModal === name) G.activeModal = null;
  if (G.gameState === 'modal') {
    if (G.modalReturnState === 'title') {
      G.gameState = 'title';
      const ts = document.getElementById('title-screen');
      if (ts) ts.classList.remove('hidden');
    } else {
      G.gameState = 'playing';
    }
  }
}


export function syncRoomThemeAndResetAudio(worldX = null, worldY = null, forceSanctuary = false) {
  let themeKey = 'sanctuary';
  if (!forceSanctuary && worldX !== null && worldY !== null) {
    const rm = getRoomAt(worldX, worldY);
    if (rm && rm.id) G.currentRoomId = rm.id;
    if (rm && rm.theme) themeKey = rm.theme;
  } else {
    G.currentRoomId = (ROOMS[0] && ROOMS[0].id) || 'r01_sanctuary';
  }
  if (G.themeBlend) G.themeBlend.activeTheme = themeKey;
  audio.resetToExplore(themeKey);
}
