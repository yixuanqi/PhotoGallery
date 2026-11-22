// Echo Arenas, Altar Rest/Respawn, Death/Victory, Start/NG+ & 4-Act Ending Cinematic (split from src/ui.js in v32.0)
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
  ensureNpcQuests, hasKeeperBlessing,
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
import {
  HUD_DOM, uiState, uiHooks, getLocalizedVowShorts, formatPlayTime,
  hideAllOverlays, openModal, closeModal, syncRoomThemeAndResetAudio
} from './uiShared.js';
import { renderParchmentMap, renderMapPinToolbar } from './mapUi.js';

export function returnToTitle() {
  clearOutcomeTimer();
  if (G.worldState) saveProgress(false);
  G.echoSession = null;
  if (G.boss) G.boss.awake = false;
  if (G.boss2) G.boss2.awake = false;
  if (G.boss3) G.boss3.awake = false;
  if (G.boss4) G.boss4.awake = false;
  if (HUD_DOM.bossHud) HUD_DOM.bossHud.classList.remove('visible');
  syncRoomThemeAndResetAudio(null, null, true);
  hideAllOverlays();
  G.gameState = 'title';
  uiHooks.refreshTitleSaveUI();
  const titleEl = document.getElementById('title-screen');
  if (titleEl) titleEl.classList.remove('hidden');
}

export function evaluateEchoGrade(mode, elapsedSec, dmgTaken) {
  if (dmgTaken === 0) return { code: 'S+', label: t('grade.S+') };
  const targetSec = mode === 'seven_bells' ? 480 : mode === 'rush' ? 235 : mode === 'warden_rush' ? 195 : mode === 'zhu' ? 120 : mode === 'yuan' ? 105 : 78;
  if (dmgTaken <= 30 && elapsedSec <= targetSec) return { code: 'S', label: t('grade.S') };
  if (dmgTaken <= 80) return { code: 'A', label: t('grade.A') };
  return { code: 'B', label: t('grade.B') };
}

export function setupEchoArena(stageBoss) {
  G.enemies = [];
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.boss4 = createBoss4();
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  if (G.wardenArenaFx) { G.wardenArenaFx.windDir = 0; G.wardenArenaFx.windTimer = 0; G.wardenArenaFx.blizzardAlpha = 0; G.wardenArenaFx.bellPulseTimer = 0; }
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0.18, color: COLORS.goldBright };

  if (stageBoss === 'hui') {
    G.boss.awake = true;
    G.boss2.alive = false;
    G.boss3.alive = false;
    G.player = createPlayer(2780, FLOOR_Y - 54);
    snapCameraToPlayer(8);
    triggerBossBanner(t('boss.echoHuiTitle'), t('boss.echoHuiQuote'), COLORS.parchment, 2.3);
  } else if (stageBoss === 'ji') {
    G.boss.alive = false;
    G.boss2.awake = true;
    G.boss3.alive = false;
    G.boss4.alive = false;
    const isCarry = !!(G.echoSession && (G.echoSession.mode === 'rush' || G.echoSession.mode === 'seven_bells') && G.player);
    const keepFlasks = isCarry ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = isCarry ? Math.min(G.player.maxHp, Math.max(60, G.player.hp + 45)) : getPlayerMaxHp();
    G.player = createPlayer(5710, WELL_BOTTOM_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    snapCameraToPlayer(8);
    triggerBossBanner(t('boss.echoJiTitle'), t('boss.echoJiQuote'), COLORS.goldBright, 2.3);
  } else if (stageBoss === 'warden_wind') {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.alive = false;
    G.boss4.alive = false;
    const isSeven = !!(G.echoSession && G.echoSession.mode === 'seven_bells' && G.player);
    const keepFlasks = isSeven ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = isSeven ? Math.min(G.player.maxHp, Math.max(60, G.player.hp + 45)) : getPlayerMaxHp();
    const w = makeWardenWind('warden_wind_boss', 7500, -192, 6920, 8080);
    w.roomId = 'r13_wind_peak';
    w.awake = true;
    w.state = 'stalk';
    w.stateTimer = 0.5;
    G.enemies = [w];
    G.player = createPlayer(7020, -174);
    G.player.facing = 1;
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    snapCameraToPlayer(8);
    triggerBossBanner(t('boss.echoWardenWindTitle'), t('boss.wardenWind.awakeQuote'), '#7dd3fc', 2.4);
  } else if (stageBoss === 'warden_forest') {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.alive = false;
    G.boss4.alive = false;
    const isCarry = !!(G.echoSession && (G.echoSession.mode === 'warden_rush' || G.echoSession.mode === 'seven_bells') && G.player);
    const keepFlasks = isCarry ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = isCarry ? Math.min(G.player.maxHp, Math.max(60, G.player.hp + 45)) : getPlayerMaxHp();
    const w = makeWardenForest('warden_forest_boss', 640, 2022, 220, 960);
    w.roomId = 'r15_woods_heart';
    w.awake = true;
    w.state = 'stalk';
    w.stateTimer = 0.55;
    G.enemies = [w];
    G.player = createPlayer(240, 2066);
    G.player.facing = 1;
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    snapCameraToPlayer(8);
    triggerBossBanner(t('boss.echoWardenForestTitle'), t('boss.wardenForest.awakeQuote'), '#6ee7b7', 2.4);
  } else if (stageBoss === 'warden_mountain') {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.alive = false;
    G.boss4.alive = false;
    const isCarry = !!(G.echoSession && (G.echoSession.mode === 'warden_rush' || G.echoSession.mode === 'seven_bells') && G.player);
    const keepFlasks = isCarry ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = isCarry ? Math.min(G.player.maxHp, Math.max(60, G.player.hp + 50)) : getPlayerMaxHp();
    const w = makeWardenMountain('warden_mountain_boss', 8970, -194, 8440, 9500);
    w.roomId = 'r17_frost_summit';
    w.awake = true;
    w.state = 'stalk';
    w.stateTimer = 0.5;
    G.enemies = [w];
    G.player = createPlayer(8500, -174);
    G.player.facing = 1;
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    snapCameraToPlayer(8);
    triggerBossBanner(t('boss.echoWardenMountainTitle'), t('boss.wardenMountain.awakeQuote'), '#bae6fd', 2.4);
  } else if (stageBoss === 'zhu') {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.alive = false;
    G.boss4.alive = true;
    G.boss4.awake = true;
    const isSeven = !!(G.echoSession && G.echoSession.mode === 'seven_bells' && G.player);
    const keepFlasks = isSeven ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 2) : getPlayerMaxFlasks();
    const keepHp = isSeven ? Math.min(G.player.maxHp, Math.max(90, G.player.hp + 85)) : getPlayerMaxHp();
    G.player = createPlayer(8480, FLOOR_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    if (isSeven) G.player.seals = Math.min(G.player.maxSeals, (G.player.seals || 0) + 1);
    snapCameraToPlayer(10);
    triggerBossBanner(t('boss.echoZhuTitle'), t('boss.echoZhuQuote'), COLORS.goldBright, 2.8);
  } else {
    G.boss.alive = false;
    G.boss2.alive = false;
    G.boss3.awake = true;
    G.boss4.alive = false;
    const isRush = !!(G.echoSession && G.echoSession.mode === 'rush' && G.player);
    const isSeven = !!(G.echoSession && G.echoSession.mode === 'seven_bells' && G.player);
    const keepFlasks = isSeven ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 2) : isRush ? Math.min(getPlayerMaxFlasks(), G.player.flasks + 1) : getPlayerMaxFlasks();
    const keepHp = isSeven ? Math.min(G.player.maxHp, Math.max(75, G.player.hp + 65)) : isRush ? Math.min(G.player.maxHp, Math.max(65, G.player.hp + 55)) : getPlayerMaxHp();
    G.player = createPlayer(8480, FLOOR_Y - 54);
    G.player.flasks = keepFlasks;
    G.player.hp = keepHp;
    snapCameraToPlayer(10);
    triggerBossBanner(t('boss.echoYuanTitle'), t('boss.echoYuanQuote'), COLORS.goldBright, 2.5);
  }
  hideAllOverlays();
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.playBellToll();
  uiHooks.syncHUD(true);
}

export function startEchoChallenge(mode) {
  clearOutcomeTimer();
  G.echoSession = {
    mode,
    stage: 0,
    startTime: performance.now(),
    parries: 0,
    executions: 0,
    damageTaken: 0,
    returnAltarId: G.worldState ? G.worldState.activeAltarId : 'altar_start'
  };
  const firstStage = mode === 'seven_bells'
    ? SEVEN_BELLS_ORDER[0]
    : mode === 'zhu'
      ? 'zhu'
      : mode === 'warden_rush'
        ? 'warden_wind'
        : (mode === 'warden_wind' || mode === 'warden_forest' || mode === 'warden_mountain')
          ? mode
          : (mode === 'yuan' ? 'yuan' : mode === 'ji' ? 'ji' : 'hui');
  setupEchoArena(firstStage);
}

export function advanceSevenBellsNext() {
  if (!G.echoSession || G.echoSession.mode !== 'seven_bells') return;
  const stg = SEVEN_BELLS_ORDER[G.echoSession.stage];
  if (stg) setupEchoArena(stg);
}

export function advanceEchoRushStage2() {
  if (!G.echoSession || G.echoSession.mode !== 'rush') return;
  setupEchoArena('ji');
}

export function advanceEchoRushStage3() {
  if (!G.echoSession || G.echoSession.mode !== 'rush') return;
  setupEchoArena('yuan');
}

export function advanceWardenRushStage2() {
  if (!G.echoSession || G.echoSession.mode !== 'warden_rush') return;
  setupEchoArena('warden_forest');
}

export function advanceWardenRushStage3() {
  if (!G.echoSession || G.echoSession.mode !== 'warden_rush') return;
  setupEchoArena('warden_mountain');
}

export function interactWithAltar(altar) {
  if (!G.worldState) return;
  const firstLight = !G.worldState.litAltars.has(altar.id);
  G.worldState.litAltars.add(altar.id);
  G.worldState.activeAltarId = altar.id;
  document.getElementById('altar-modal-title').textContent = locAltar(altar, 'shortName');
  if (firstLight) {
    spawnShockwave(altar.x, altar.y - 46, 130, COLORS.cyanBright, 4.5, 0.42);
    spawnParticles(altar.x, altar.y - 46, 30, { color: COLORS.cyanBright, speed: 220, spark: true, life: 0.6 });
    spawnFloatText(altar.x, altar.y - 96, t('altar.litToast', locAltar(altar, 'shortName')), COLORS.cyanBright, 20, 1.5);
  }
  restAtAltar();
}

export function restAtAltar() {
  if (!G.player) return;
  clearOutcomeTimer();
  G.player.hp = G.player.maxHp;
  G.player.grayHp = 0;
  G.player.grayTimer = 0;
  G.player.soul = G.player.maxSoul;
  G.player.maxFlasks = getPlayerMaxFlasks();
  G.player.flasks = G.player.maxFlasks;
  G.player.maxSeals = getPlayerMaxSeals();
  G.player.seals = 0;
  G.player.vx = 0;
  G.player.vy = 0;
  G.player.hurtTimer = 0;
  G.player.iframeTimer = 0;
  G.player.parryActive = false;
  G.player.isCharging = false;
  G.player.attackTimer = 0;
  G.player.attackCd = 0;
  G.player.activeAttack = null;
  G.player.sealLunge = null;
  G.player.jumpBufTimer = 0;
  G.player.attackBufTimer = 0;
  G.player.parryBufTimer = 0;
  G.player.dashBufTimer = 0;
  G.player.castBufTimer = 0;
  G.player.grappleBufTimer = 0;
  G.player.sealBufTimer = 0;

  // Resting at the altar restores route enemies & lanterns while preserving world unlocks and slain Bosses.
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.boss4 = createBoss4();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  if (G.worldState && G.worldState.boss3Defeated) G.boss3.alive = false;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  if (G.wardenArenaFx) { G.wardenArenaFx.windDir = 0; G.wardenArenaFx.windTimer = 0; G.wardenArenaFx.blizzardAlpha = 0; G.wardenArenaFx.bellPulseTimer = 0; }
  G.projectiles = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.minimapDirty = true;
  saveProgress(true);
  uiHooks.renderRelicChoices();
  syncRoomThemeAndResetAudio(G.player.x + G.player.w * 0.5, G.player.y + G.player.h * 0.5, false);
  uiHooks.syncHUD(true);
  audio.playBellToll();
  openModal('altar');
}

export function respawnAtActiveAltar() {
  clearOutcomeTimer();
  if (!G.player || !G.worldState) {
    startGame();
    return;
  }
  G.echoSession = null;
  const altar = getActiveAltar();
  G.player = createPlayer(altar.x - 14, altar.y - 54);
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.boss4 = createBoss4();
  if (G.worldState && G.worldState.bossDefeated) G.boss.alive = false;
  if (G.worldState && G.worldState.boss2Defeated) G.boss2.alive = false;
  if (G.worldState && G.worldState.boss3Defeated) G.boss3.alive = false;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  if (G.wardenArenaFx) { G.wardenArenaFx.windDir = 0; G.wardenArenaFx.windTimer = 0; G.wardenArenaFx.blizzardAlpha = 0; G.wardenArenaFx.bellPulseTimer = 0; }
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  snapCameraToPlayer(0);
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };
  markMapExplored(altar.x, altar.y - 40);
  hideAllOverlays();
  G.minimapDirty = true;
  G.gameState = 'playing';
  syncRoomThemeAndResetAudio(altar.x, altar.y - 40, false);
  uiHooks.syncHUD(true);
}

export function resetToAltar() {
  respawnAtActiveAltar();
}

export function showDeath() {
  clearOutcomeTimer();
  if (!G.player || G.player.hp > 0 || G.gameState === 'dead' || G.gameState === 'victory') return;
  hideAllOverlays();
  G.gameState = 'dead';
  const retryEchoBtn = document.getElementById('btn-retry-echo');
  const retryAltarBtn = document.getElementById('btn-retry');
  const deathSub = document.getElementById('death-sub');
  if (G.echoSession) {
    retryEchoBtn.style.display = 'inline-block';
    retryAltarBtn.textContent = t('death.retryAltar');
    deathSub.textContent = t('death.subEcho');
  } else {
    retryEchoBtn.style.display = 'none';
    retryAltarBtn.textContent = t('death.retry');
    deathSub.textContent = (G.worldState && G.worldState.lastDeathEchoMsg)
      ? G.worldState.lastDeathEchoMsg
      : t('death.sub');
  }
  document.getElementById('death-modal').classList.remove('hidden');
}

export function showVictory(bossId = 'boss_hui') {
  clearOutcomeTimer();
  if (G.gameState === 'victory' || G.gameState === 'dead') return;
  const titleEl = document.getElementById('victory-title');
  const subEl = document.getElementById('victory-sub');
  const statsEl = document.getElementById('victory-stats');
  const btnEchoAgain = document.getElementById('btn-echo-again');
  const btnEnterWell = document.getElementById('btn-enter-well');
  const btnPlayAgain = document.getElementById('btn-play-again');

  if (G.echoSession) {
    const mode = G.echoSession.mode;
    const elapsed = Math.max(0, (performance.now() - G.echoSession.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    const grade = evaluateEchoGrade(mode, elapsed, G.echoSession.damageTaken);
    const activeVowInfo = getActiveVowStats();
    const vowCnt = activeVowInfo.count;
    let recordNote = '';
    if (G.worldState) {
      if (!G.worldState.echoRecords) G.worldState.echoRecords = { hui: null, ji: null, yuan: null, rush: null, warden_wind: null, warden_forest: null, warden_mountain: null, warden_rush: null, zhu: null, seven_bells: null };
      const prev = G.worldState.echoRecords[mode];
      const isNewBestGrade = !prev || (ECHO_GRADE_ORDER[grade.code] > (ECHO_GRADE_ORDER[prev.bestGrade] || 0));
      const isNewBestTime = !prev || elapsed < prev.bestTimeSec;
      const isNewBestVows = !prev || vowCnt > (prev.bestVows || 0);
      G.worldState.echoRecords[mode] = {
        bestGrade: isNewBestGrade ? grade.code : prev.bestGrade,
        bestTimeSec: isNewBestTime ? Math.round(elapsed * 10) / 10 : prev.bestTimeSec,
        bestVows: isNewBestVows ? vowCnt : (prev.bestVows || 0),
        clears: (prev ? (prev.clears || 0) : 0) + 1,
        noHit: (prev && prev.noHit) || G.echoSession.damageTaken === 0
      };
      if (isNewBestGrade || isNewBestTime || (vowCnt > 0 && isNewBestVows)) recordNote = t('victory.echoNewBest');
      checkAchievements({ echoNoHit: G.echoSession.damageTaken === 0, echoMode: mode, echoVows: vowCnt });
      saveProgress(false);
    }
    titleEl.textContent = vowCnt >= 4 ? t('victory.echoTitleVow') : t('victory.echoTitle');
    const modeTitle = mode === 'seven_bells'
      ? t('victory.echoSevenTitle')
      : mode === 'zhu'
        ? locBoss({ id: 'boss_zhu', name: '初铸残影 · 铸' }, 'name')
      : mode === 'rush'
      ? t('victory.echoRushTitle')
      : mode === 'warden_rush'
        ? t('victory.echoWardenRushTitle')
        : mode === 'warden_wind'
          ? locBoss({ id: 'warden_wind_boss', name: '截风巡塔使 · 朔' }, 'name')
          : mode === 'warden_forest'
            ? locBoss({ id: 'warden_forest_boss', name: '盘根古钟精 · 枯' }, 'name')
            : mode === 'warden_mountain'
              ? locBoss({ id: 'warden_mountain_boss', name: '断剑霜侯 · 凛' }, 'name')
              : mode === 'yuan'
                ? locBoss({ id: 'boss_yuan', name: '初钟圣骸 · 渊' }, 'name')
                : mode === 'ji'
                  ? locBoss({ id: 'boss_ji', name: '沉渊铸钟师 · 寂' }, 'name')
                  : locBoss({ id: 'boss_hui', name: '断钟骑士 · 晦' }, 'name');
    const vowSuffix = vowCnt > 0 ? t('victory.echoVowSuffix', vowCnt, getLocalizedVowShorts()) : '';
    subEl.textContent = t('victory.echoSub', modeTitle, grade.label, vowSuffix);
    statsEl.textContent = t('victory.echoStats', grade.label, vowSuffix, minutes, seconds, G.echoSession.parries, G.echoSession.executions, G.echoSession.damageTaken, recordNote);
    btnEchoAgain.style.display = 'inline-block';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('death.retryAltar');
    btnPlayAgain.style.display = 'none';
  } else if (bossId === 'boss_ji') {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = t('victory.jiTitle');
    subEl.textContent = t('victory.jiSub');
    statsEl.textContent = t('victory.jiStats', getExplorationPercent(), minutes, seconds, G.stats.parries, G.stats.executions, G.stats.damageTaken);
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('victory.jiNext');
    btnPlayAgain.style.display = 'inline-block';
  } else {
    const elapsed = Math.max(0, (performance.now() - G.stats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    titleEl.textContent = t('victory.huiTitle');
    subEl.textContent = t('victory.huiSub');
    statsEl.textContent = t('victory.huiStats', minutes, seconds, G.stats.parries, G.stats.executions, G.stats.damageTaken);
    btnEchoAgain.style.display = 'none';
    btnEnterWell.style.display = 'inline-block';
    btnEnterWell.textContent = t('victory.huiNext');
    btnPlayAgain.style.display = 'inline-block';
  }
  hideAllOverlays();
  G.gameState = 'victory';
  const vm = document.getElementById('victory-modal');
  const vcard = vm && vm.querySelector('.modal-card');
  if (vcard) vcard.scrollTop = 0;
  if (vm) vm.classList.remove('hidden');
}

export function startGame() {
  if (!G.levelBundle) return;
  clearOutcomeTimer();
  hideAllOverlays();
  G.worldState = createFreshWorldState();
  G.equippedRelics = [RELICS[0], null];
  G.currentRelic = RELICS[0];
  G.activeRelicSlot = 1;
  const previewCoords = G.isEditorPreview ? getPreviewSpawnCoords() : null;
  const previewRoomId = G.isEditorPreview ? getPreviewSpawnRoomId() : null;
  const spawnPt = previewCoords
    ? previewCoords
    : (previewRoomId
        ? getRoomSpawnPoint(previewRoomId)
        : (ALTARS[0] ? { x: ALTARS[0].x - 14, y: ALTARS[0].y - 54 } : { x: 316, y: FLOOR_Y - 54 }));
  G.player = createPlayer(spawnPt.x, spawnPt.y);
  markMapExplored(spawnPt.x + 14, spawnPt.y + 14);
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.boss4 = createBoss4();
  G.bossBanner = null;
  G.endingState = null;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  if (G.wardenArenaFx) { G.wardenArenaFx.windDir = 0; G.wardenArenaFx.windTimer = 0; G.wardenArenaFx.blizzardAlpha = 0; G.wardenArenaFx.bellPulseTimer = 0; }
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.grapplePreviewTarget = null;
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0, color: '#fff' };
  snapCameraToPlayer(0);
  G.playTimeSec = 0;
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  G.globalTime = 0;
  G.boilFrame = 0;
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.init();
  syncRoomThemeAndResetAudio(spawnPt.x + 14, spawnPt.y + 27, false);
  if (!G.isEditorPreview) saveProgress(false);
  uiHooks.syncHUD(true);
}

export function startNewGamePlus() {
  if (!G.levelBundle) return;
  if (!G.worldState) {
    startGame();
    return;
  }
  clearOutcomeTimer();
  hideAllOverlays();

  const prev = G.worldState;
  const nextCycle = Math.max(1, Math.floor(Number(prev.ngPlusCycle) || 1)) + 1;
  const keepEquipped = Array.isArray(G.equippedRelics) && G.equippedRelics.length >= 2
    ? [G.equippedRelics[0] || RELICS[0], G.equippedRelics[1] || null]
    : [G.currentRelic || RELICS[0], null];

  const fresh = createFreshWorldState();
  fresh.ngPlusCycle = nextCycle;
  fresh.activeVows = new Set(prev.activeVows ? [...prev.activeVows] : []);
  fresh.unlockedRelics = new Set(prev.unlockedRelics ? [...prev.unlockedRelics] : ['thorn', 'mirror', 'ember']);
  fresh.unlockedWeapons = new Set(prev.unlockedWeapons ? [...prev.unlockedWeapons] : ['blade']);
  fresh.equippedWeapon = prev.equippedWeapon || 'blade';
  fresh.unlockedWeaponTraits = new Set(prev.unlockedWeaponTraits ? [...prev.unlockedWeaponTraits] : []);
  fresh.weaponTraits = prev.weaponTraits ? { ...prev.weaponTraits } : { blade: null, hammer: null, bell: null };
  fresh.smithUpgrades = { ...(prev.smithUpgrades || { blade: 0, posture: 0, forge: 0 }) };
  fresh.bonusFlasks = Math.min(3, Number(prev.bonusFlasks) || 0);
  fresh.bonusMaxHp = Number(prev.bonusMaxHp) || 0;
  fresh.bonusMaxSoul = Number(prev.bonusMaxSoul) || 0;
  fresh.echoes = Math.max(0, Number(prev.echoes) || 0);
  fresh.endingsUnlocked = Array.isArray(prev.endingsUnlocked) ? [...prev.endingsUnlocked] : [];
  fresh.echoRecords = prev.echoRecords ? JSON.parse(JSON.stringify(prev.echoRecords)) : { hui: null, ji: null, yuan: null, rush: null };
  fresh.codex = prev.codex ? JSON.parse(JSON.stringify(prev.codex)) : fresh.codex;
  if (prev.npcQuests) {
    fresh.npcQuests = {
      metChronicler: !!prev.npcQuests.metChronicler,
      chroniclerClaims: Array.isArray(prev.npcQuests.chroniclerClaims) ? [...prev.npcQuests.chroniclerClaims] : [],
      metKeeper: !!prev.npcQuests.metKeeper,
      keeperWickGifted: !!prev.npcQuests.keeperWickGifted,
      keeperBlessingActive: false
    };
  }
  fresh.mapPins = [];
  // Fresh world progression (bosses, fog, gates, abilities, keyItems reset for full NG+ replay)
  G.worldState = fresh;
  G.equippedRelics = keepEquipped;
  G.currentRelic = keepEquipped[0] || RELICS[0];
  G.activeRelicSlot = keepEquipped[1] ? 0 : 1;

  const spawnPt = ALTARS[0] ? { x: ALTARS[0].x - 14, y: ALTARS[0].y - 54 } : { x: 316, y: FLOOR_Y - 54 };
  G.player = createPlayer(spawnPt.x, spawnPt.y);
  markMapExplored(spawnPt.x + 14, spawnPt.y + 14);
  G.echoSession = null;
  G.enemies = createSentinels();
  G.boss = createBoss();
  G.boss2 = createBoss2();
  G.boss3 = createBoss3();
  G.boss4 = createBoss4();
  G.endingState = null;
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  G.bellQuakes = [];
  G.sporeClouds = [];
  G.weaponUltimates = [];
  G.delayedStrikes = [];
  if (G.wardenArenaFx) { G.wardenArenaFx.windDir = 0; G.wardenArenaFx.windTimer = 0; G.wardenArenaFx.blizzardAlpha = 0; G.wardenArenaFx.bellPulseTimer = 0; }
  G.particles = [];
  G.slashes = [];
  G.shockwaves = [];
  G.impactBursts = [];
  G.hitMarks = [];
  G.floatTexts = [];
  G.afterimages = [];
  G.talismans = [];
  G.groundWaves = [];
  G.chapelTide = null;
  G.projectiles = [];
  G.grapplePreviewTarget = null;
  G.hitstopTimer = 0;
  G.invertTimer = 0;
  G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
  snapCameraToPlayer(10);
  G.stats = { parries: 0, executions: 0, damageTaken: 0, startTime: performance.now() };
  G.minimapDirty = true;
  G.gameState = 'playing';
  audio.init();
  syncRoomThemeAndResetAudio(spawnPt.x + 14, spawnPt.y + 27, false);
  audio.playBellToll();
  const sc = getCombatScaling(false);
  triggerBossBanner(
    t('ng.bannerTitle', nextCycle),
    t('ng.bannerQuote', sc.hpMult.toFixed(2), sc.echoMult.toFixed(2)),
    COLORS.goldBright,
    3.2
  );
  checkAchievements({ ngPlus: true });
  saveProgress(true);
  uiHooks.syncHUD(true);
}

export function continueIntoBellWell() {
  if (G.echoSession) {
    respawnAtActiveAltar();
    return;
  }
  if (G.player && G.player.hp <= 0) {
    G.player.hp = G.player.maxHp;
    G.player.grayHp = 0;
    G.player.deathTimer = 0;
    G.player.iframeTimer = 0.6;
  }
  hideAllOverlays();
  G.gameState = 'playing';
  audio.playBellToll();
  uiHooks.syncHUD(true);
  const intoAscent = !!(G.player && G.player.x > 5500);
  spawnFloatText(
    G.player.x + G.player.w / 2,
    G.player.y - 34,
    intoAscent ? t('victory.toastAscent') : t('victory.toastWell'),
    intoAscent ? COLORS.goldBright : COLORS.cyanBright,
    20,
    1.6
  );
}

/* ==================== FINALE: DUAL ENDING CHOICE & 4-ACT HAND-DRAWN INK CINEMATIC ==================== */
function renderEndingChoiceModal() {
  const hasDawn = !!(G.worldState && G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  const btnDawn = document.getElementById('btn-ending-dawn');
  const tagDawn = document.getElementById('ending-dawn-tag');
  const descDawn = document.getElementById('ending-dawn-desc');
  if (btnDawn) btnDawn.disabled = !hasDawn;
  if (tagDawn) tagDawn.textContent = hasDawn ? t('endChoice.tagBReady') : t('endChoice.tagBLocked');
  if (descDawn) descDawn.textContent = hasDawn ? t('endChoice.descBReady') : t('endChoice.descBLocked');
}

export function openEndingChoice() {
  clearOutcomeTimer();
  renderEndingChoiceModal();
  openModal('ending-choice');
}

export function startEndingCinematic(type = 'vow') {
  const key = type === 'dawn' ? 'dawn' : 'vow';
  if (G.worldState) {
    if (!Array.isArray(G.worldState.endingsUnlocked)) G.worldState.endingsUnlocked = [];
    if (!G.worldState.endingsUnlocked.includes(key)) G.worldState.endingsUnlocked.push(key);
    saveProgress(false);
  }
  G.endingState = { type: key, act: 0, t: 0, finished: false };
  const script = getEndingScript(key);
  document.getElementById('ending-cinema-header').textContent = script.title;
  document.getElementById('ending-cinema-header').style.color = key === 'dawn' ? '#fef08a' : '#bae6fd';
  document.getElementById('ending-act-text').style.display = 'block';
  document.getElementById('ending-epilogue-stats').style.display = 'none';
  document.getElementById('ending-act-controls').style.display = 'flex';
  document.getElementById('ending-epilogue-controls').style.display = 'none';
  syncEndingActUI();
  openModal('ending-cinematic');
  audio.playEndingChord(key === 'dawn', 0);
}

function syncEndingActUI() {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  document.getElementById('ending-cinema-header').textContent = script.title;
  const actObj = script.acts[G.endingState.act];
  document.getElementById('ending-cinema-sub').textContent = `${actObj.sub} (${G.endingState.act + 1} / ${script.acts.length})`;
  document.getElementById('ending-act-text').textContent = actObj.text;
  document.getElementById('btn-ending-next').textContent = G.endingState.act >= script.acts.length - 1 ? t('ending.finalStats') : t('ending.nextAct');
}

function renderEndingEpilogueUI() {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  const isDawn = G.endingState.type === 'dawn';
  const unlockedCount = G.worldState && Array.isArray(G.worldState.endingsUnlocked) ? G.worldState.endingsUnlocked.length : 1;
  const relicCnt = G.worldState ? G.worldState.unlockedRelics.size : 3;
  document.getElementById('ending-cinema-header').textContent = script.title;
  document.getElementById('ending-cinema-sub').textContent = isDawn
    ? t('ending.epilogueDawn', unlockedCount)
    : t('ending.epilogueVow', unlockedCount);
  const stEl = document.getElementById('ending-epilogue-stats');
  stEl.textContent = t('ending.epilogueStats', script.title, unlockedCount, getExplorationPercent(), relicCnt, RELICS.length, formatPlayTime(G.playTimeSec), G.stats.parries, G.stats.executions);
  const ngBtn = document.getElementById('btn-ending-ngplus');
  if (ngBtn) {
    const nextCyc = ((G.worldState && G.worldState.ngPlusCycle) ? G.worldState.ngPlusCycle : 1) + 1;
    ngBtn.textContent = t('ending.ngBtn', nextCyc);
  }
}

export function advanceEndingCinematic(skipAll = false) {
  if (!G.endingState) return;
  const script = getEndingScript(G.endingState.type);
  if (!skipAll && G.endingState.act < script.acts.length - 1) {
    G.endingState.act++;
    G.endingState.t = 0;
    syncEndingActUI();
    audio.playEndingChord(G.endingState.type === 'dawn', G.endingState.act);
    return;
  }
  G.endingState.finished = true;
  const isDawn = G.endingState.type === 'dawn';
  document.getElementById('ending-act-text').style.display = 'none';
  document.getElementById('ending-epilogue-stats').style.display = 'block';
  renderEndingEpilogueUI();
  document.getElementById('ending-act-controls').style.display = 'none';
  document.getElementById('ending-epilogue-controls').style.display = 'flex';
  audio.playEndingChord(isDawn, 3);
}

export function refreshActiveModalI18n() {
  if (G.activeModal === 'settings') uiHooks.renderSettingsModal();
  else if (G.activeModal === 'altar') {
    const altar = getActiveAltar();
    const titleEl = document.getElementById('altar-modal-title');
    if (titleEl && altar) titleEl.textContent = locAltar(altar, 'shortName');
    uiHooks.renderRelicChoices();
  } else if (G.activeModal === 'map') {
    renderMapPinToolbar();
    renderParchmentMap(HUD_DOM.fullMapCanvas, true);
  } else if (G.activeModal === 'codex') uiHooks.renderCodexModal();
  else if (G.activeModal === 'lore') uiHooks.renderLoreModal();
  else if (G.activeModal === 'smith') uiHooks.renderSmithModal();
  else if (G.activeModal === 'dummy') uiHooks.renderDummyModal();
  else if (G.activeModal === 'npc' && uiState.activeNpcModalRef) {
    if (uiState.activeNpcModalRef.kind === 'chronicler') uiHooks.renderChroniclerModal();
    else if (uiState.activeNpcModalRef.kind === 'keeper') uiHooks.renderKeeperModal();
  } else if (G.activeModal === 'pause') {
    const pt = document.querySelector('#pause-modal .modal-title');
    if (pt) pt.textContent = t('pause.title');
    const sub = document.getElementById('pause-slot-sub');
    if (sub) sub.textContent = t('pause.sub', G.activeSaveSlot + 1, getExplorationPercent(), formatPlayTime(G.playTimeSec));
  } else if (G.activeModal === 'ending-choice') renderEndingChoiceModal();
  else if (G.activeModal === 'ending-cinematic' && G.endingState) {
    if (G.endingState.finished) renderEndingEpilogueUI();
    else syncEndingActUI();
  }
}

export function updateAndRenderEndingCinematic(dt) {
  if (G.activeModal !== 'ending-cinematic' || !G.endingState) return;
  const cvs = document.getElementById('endingCanvas');
  if (!cvs) return;
  const c = cvs.getContext('2d');
  const w = cvs.width;
  const h = cvs.height;
  G.endingState.t += dt;
  const t = G.endingState.t;
  const act = G.endingState.act;
  const isDawn = G.endingState.type === 'dawn';
  c.clearRect(0, 0, w, h);

  const bg = c.createLinearGradient(0, 0, 0, h);
  if (isDawn && act >= 2) {
    bg.addColorStop(0, act === 3 ? '#3b2638' : '#26182c');
    bg.addColorStop(0.55, act === 3 ? '#c26d3a' : '#854d1e');
    bg.addColorStop(1, act === 3 ? '#fef08a' : '#291a16');
  } else if (isDawn) {
    bg.addColorStop(0, '#160d18'); bg.addColorStop(0.6, '#361a1d'); bg.addColorStop(1, '#0b080d');
  } else {
    bg.addColorStop(0, '#070c18'); bg.addColorStop(0.6, '#142238'); bg.addColorStop(1, '#05080f');
  }
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  c.fillStyle = isDawn && act >= 3 ? '#2c201b' : '#0b0f18';
  c.fillRect(0, h - 46, w, 46);
  c.strokeStyle = isDawn && act >= 2 ? 'rgba(254, 240, 138, 0.55)' : 'rgba(216, 207, 184, 0.35)';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, h - 46); c.lineTo(w, h - 46); c.stroke();

  const cx = w * 0.5;
  if (!isDawn || act <= 1) {
    const split = (isDawn && act === 1) ? Math.min(46, Math.max(0, (t - 0.55) * 65)) : 0;
    [-1, 1].forEach(side => {
      c.save();
      c.translate(cx + side * split, 16 + split * 0.45);
      c.rotate(side * split * 0.008);
      c.fillStyle = '#15121a';
      c.strokeStyle = isDawn ? '#fde047' : (act >= 1 ? '#38bdf8' : '#d8cfb8');
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(side * 34, 0);
      c.quadraticCurveTo(side * 76, 86, side * 98, 152);
      c.lineTo(0, 152); c.closePath(); c.fill(); c.stroke();
      c.restore();
    });
    if (isDawn && act === 1) {
      const flashA = Math.max(0, 1 - Math.abs(t - 0.55) * 3.2);
      c.strokeStyle = `rgba(254, 249, 195, ${Math.max(0.25, flashA).toFixed(2)})`;
      c.lineWidth = 4 + flashA * 10;
      c.beginPath(); c.moveTo(40, 118); c.lineTo(w - 40, 88); c.stroke();
    } else if (!isDawn && act >= 2) {
      for (let i = 0; i < 3; i++) {
        const rr = ((t * 75 + i * 75) % 230) + 28;
        c.strokeStyle = `rgba(56, 189, 248, ${(1 - rr / 260).toFixed(2)})`;
        c.lineWidth = 2.2;
        c.beginPath(); c.arc(cx, 115, rr, 0, Math.PI * 2); c.stroke();
      }
    }
  } else {
    const sunY = act === 3 ? 132 - Math.min(26, t * 8) : 168 - Math.min(34, t * 12);
    const sg = c.createRadialGradient(cx, sunY, 10, cx, sunY, 195);
    sg.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
    sg.addColorStop(0.42, 'rgba(245, 158, 11, 0.48)');
    sg.addColorStop(1, 'transparent');
    c.fillStyle = sg;
    c.beginPath(); c.arc(cx, sunY, 195, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fef9c3';
    c.beginPath(); c.arc(cx, sunY, 28, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30, 20, 18, 0.85)';
    c.lineWidth = 18;
    c.beginPath(); c.arc(cx, h - 44, 158, Math.PI, 0); c.stroke();
  }

  const px = isDawn && act === 3 ? cx + Math.min(95, t * 24) : cx;
  const py = h - 46;
  c.save();
  c.translate(px, py);
  c.fillStyle = '#0c101a';
  c.strokeStyle = isDawn && act >= 2 ? '#fef08a' : '#d8cfb8';
  c.lineWidth = 1.6;
  const sway = Math.sin(t * 2.8) * 5;
  c.beginPath();
  c.moveTo(-14, 0); c.lineTo(-9, -38); c.lineTo(9, -38); c.lineTo(15 + sway * 0.4, 0); c.closePath();
  c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -45, 8.5, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = isDawn ? '#fde047' : '#38bdf8';
  c.beginPath(); c.arc(isDawn ? 14 : 11, -24 - (act === 1 && !isDawn ? Math.min(48, t * 28) : 0), 4.5, 0, Math.PI * 2); c.fill();
  c.restore();

  for (let i = 0; i < 24; i++) {
    const mx = ((i * 73 + t * (isDawn ? 26 : -18)) % (w + 40) + w + 40) % (w + 40) - 20;
    const my = ((i * 41 - t * (isDawn ? 22 : 12)) % h + h) % h;
    c.fillStyle = isDawn ? 'rgba(254, 240, 138, 0.58)' : 'rgba(186, 230, 253, 0.36)';
    c.beginPath(); c.arc(mx, my, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2); c.fill();
  }
}
