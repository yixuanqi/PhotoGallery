// Entry point: wires cross-module hooks, canvas lifecycle, UI listeners & main gameLoop
window.__ABV_MODULE_LOADED__ = true;
import { ALTARS, STAMPS, WORLD_W, WORLD_H, FLOOR_Y } from './config.js';
import { G, hooks, createFreshWorldState, markMapExplored, createLanterns, createResonancePuzzles, createCrumblePlatforms, getAwakeBoss, getHudBoss, setTextFast, damp } from './state.js';
import { loadWorldData, getPreviewSpawnRoomId } from './levelLoader.js';
import { audio } from './audio.js';
import { buildParchmentPattern, buildGlowSprites, initAmbientMotes } from './vfx.js';
import { startTitleIntro, skipTitleIntro, isTitleIntroActive, isTitleIntroPlaying, updateTitleIntro, beginSceneFade } from './render/titleIntro.js';
import {
  clearFrameInputs, syncControlModeUI, pollGamepad, initInputListeners,
  isEmbeddedH5Container, updateMobileOrientationLayout, requestMobileLandscapeFullscreen, setForceLandscapeFallback, isViewportLandscape, applyMobileTouchPrefs,
  getActionKeyCode, isCapturingKey, resetDefaultKeybinds, triggerHaptic
} from './input.js';
import { capturePlayerInputBuffers, updatePlayer } from './player.js';
import { equipWeapon, cycleWeapon } from './combat.js';
import { updateEnemy, updateEnemyHitFeel, updateBoss, updateBoss2, updateBoss3, updateBoss4, triggerBoss4UltimateReaction, resetWardenState } from './ai.js';
import { updateWorldEffects, updateCamera, updateAmbientOnly, snapCameraToPlayer } from './world.js';
import { render } from './renderer.js';
import { prewarmStampsForList } from './stampAtlas.js';
import { prewarmTerrainChunks, invalidateTerrainCache } from './renderTerrain.js';
import { prewarmGlyphAtlas, clearGlyphAtlas, getGlyphAtlasStats } from './render/glyphAtlas.js';
import { getBackdropCacheStats } from './render/backdropCache.js';
import { prof } from './profiler.js';
import { isBenchmarkActive, startCombatBenchmark, cancelCombatBenchmark, tickCombatBenchmark, openBenchmarkReportModal, copyBenchmarkReport } from './benchmark.js';
import { readSaveData, saveProgress, loadUserSettings, saveUserSettings } from './save.js';
import { t, setLocale, toggleLocale, loadSavedLocale, onLocaleChange, applyStaticI18n } from './i18n.js';
import {
  HUD_DOM, refreshTitleSaveUI, refreshActiveModalI18n, syncHUD, openModal, closeModal, renderParchmentMap, renderSettingsModal, openSettingsJournal,
  openSmithModal, openNpcModal, openDummyModal, openLoreModal, openMapModal, openCodexModal, openPauseModal, returnToTitle, interactWithAltar, respawnAtActiveAltar,
  startEchoChallenge, advanceEchoRushStage2, advanceEchoRushStage3, advanceWardenRushStage2, advanceWardenRushStage3, advanceSevenBellsNext, showDeath, showVictory,
  startGame, startNewGamePlus, continueSavedGame, continueIntoBellWell,
  openEndingChoice, startEndingCinematic, advanceEndingCinematic, updateAndRenderEndingCinematic, updateAndRenderSkillPreview
} from './ui.js';

// Register cross-layer hooks (eliminates all circular ES Module dependencies)
Object.assign(hooks, {
  syncHUD,
  saveProgress,
  readSaveData,
  refreshTitleSaveUI,
  showDeath,
  showVictory,
  advanceEchoRushStage2,
  advanceEchoRushStage3,
  advanceWardenRushStage2,
  advanceWardenRushStage3,
  advanceSevenBellsNext,
  triggerBoss4UltimateReaction,
  openEndingChoice,
  interactWithAltar,
  openSmithModal,
  openNpcModal,
  openDummyModal,
  openLoreModal,
  openMapModal,
  cycleWeapon,
  openCodexModal,
  openPauseModal,
  returnToTitle,
  openModal,
  closeModal,
  startGame,
  startNewGamePlus,
  continueSavedGame,
  respawnAtActiveAltar,
  startEchoChallenge,
  continueIntoBellWell,
  resizeCanvas
});

// Initialize Canvas context on central state
G.canvas = document.getElementById('gameCanvas');
// Standard 2D context without alpha:false prevents Windows DWM/MPO opaque overlay freeze on 144Hz monitors
G.ctx = G.canvas.getContext('2d');

let _lastMobileFlag = null;
function resizeCanvas() {
  const { mobile } = updateMobileOrientationLayout();
  G.isMobile = !!mobile;
  if (_lastMobileFlag !== G.isMobile) {
    _lastMobileFlag = G.isMobile;
    applyStaticI18n();
    if (window.__ABV_BOOTED__) refreshTitleSaveUI();
  }
  const root = document.getElementById('game-root');
  const cssW = Math.max(320, (root && root.clientWidth) || window.innerWidth || 1280);
  const cssH = Math.max(180, (root && root.clientHeight) || window.innerHeight || 720);
  if (root) {
    root.style.setProperty('--stage-w', `${cssW}px`);
    root.style.setProperty('--stage-h', `${cssH}px`);
  }
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.body.classList.toggle('is-fullscreen', isFs);
  document.body.classList.toggle('is-short-viewport', mobile && cssH < 305);

  // v44.7 Mobile Retina Clarity (Matches PC Sharpness across BOTH Standalone Browser & TapTap H5!):
  // 'high' (default): 2.4x DPR (max 2400px) | 'retina': 3.0x native DPR (max 2880px) | 'eco': 1.5x DPR (max 1440px)
  const mobQual = (G.settings && ['high', 'retina', 'eco'].includes(G.settings.mobileQuality))
    ? G.settings.mobileQuality
    : ((G.settings && G.settings.mobileEcoMode) ? 'eco' : 'high');
  const lightMode = !!(G.settings && G.settings.dynamicLighting === false);
  const rawMaxDpr = mobile
    ? (mobQual === 'retina' ? 3.0 : (mobQual === 'eco' ? 1.5 : 2.4))
    : (lightMode ? 1.0 : (window.innerWidth >= 1440 ? 1.5 : 1.75));
  const maxGpuW = mobile
    ? (mobQual === 'retina' ? 2880 : (mobQual === 'eco' ? 1440 : 2400))
    : 4096;
  const gpuCapDpr = mobile ? Math.max(1.4, maxGpuW / Math.max(640, cssW)) : rawMaxDpr;
  const dpr = Math.min(rawMaxDpr, gpuCapDpr, Math.max(1, window.devicePixelRatio || 1));

  // Tighter mobile targetH (480) keeps sprites & in-game text crisp and large on handheld screens
  const targetH = mobile ? 480 : 660;
  const maxLogicalW = mobile ? 1080 : 1280;
  const viewScale = Math.max(cssH / targetH, cssW / maxLogicalW);
  G.canvasW = Math.round(cssW / viewScale);
  G.canvasH = Math.round(cssH / viewScale);
  G.canvas.width = Math.round(cssW * dpr);
  G.canvas.height = Math.round(cssH * dpr);
  G.renderScale = dpr * viewScale;
  G.ctx.setTransform(G.renderScale, 0, 0, G.renderScale, 0, 0);
  G.ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in G.ctx) G.ctx.imageSmoothingQuality = 'high';
  if (G.player) {
    snapCameraToPlayer(G.cam.shake);
  } else {
    G.cam.x = Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), G.cam.x));
    G.cam.y = Math.max(0, Math.min(Math.max(0, 720 - G.canvasH), G.cam.y));
  }
  G.paperPattern = null;
  buildParchmentPattern();
  if (G.levelBundle) invalidateTerrainCache();
}

let resizeTimer = null;
function scheduleResize() {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    resizeCanvas();
  }, 90);
}
function scheduleOrientationRecheck() {
  resizeCanvas();
  setTimeout(resizeCanvas, 120);
  setTimeout(resizeCanvas, 320);
  setTimeout(resizeCanvas, 620);
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleOrientationRecheck);
document.addEventListener('fullscreenchange', scheduleOrientationRecheck);
document.addEventListener('webkitfullscreenchange', scheduleOrientationRecheck);
if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
  window.screen.orientation.addEventListener('change', scheduleOrientationRecheck);
}
if (window.matchMedia) {
  const mql = window.matchMedia('(orientation: landscape)');
  if (mql.addEventListener) mql.addEventListener('change', scheduleOrientationRecheck);
  else if (mql.addListener) mql.addListener(scheduleOrientationRecheck);
}
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);

let lastFrameTime = 0;
let boilAccumulator = 0;
let lastStaticRenderKey = '';
let perfUiAccumMs = 0;
const perfEl = document.getElementById('perf-hud');
const profDrawerEl = document.getElementById('profiler-drawer');
const profStatsEl = document.getElementById('prof-stats-grid');
const profSparkCanvas = document.getElementById('prof-sparkline');
const profSparkCtx = profSparkCanvas ? profSparkCanvas.getContext('2d') : null;

// Build F8 profiler DOM rows ONCE (zero innerHTML / zero detached DOM node leak / zero C++ GC churn!)
const PROF_MOD_META = [
  ['update', 'prof.modUpdate'],
  ['audio', 'prof.modAudio'],
  ['lighting', 'prof.modLighting'],
  ['world', 'prof.modWorld'],
  ['entities', 'prof.modEntities'],
  ['vfx', 'prof.modVfx'],
  ['hud', 'prof.modHud']
];
let _profDomInit = false;
let _profMetaNode = null;
const _profLblNodes = [];
const _profFills = [];
const _profValNodes = [];

function ensureProfilerDom() {
  if (_profDomInit || !profStatsEl) return;
  _profDomInit = true;
  profStatsEl.textContent = '';
  const metaEl = document.createElement('div');
  metaEl.className = 'prof-meta';
  _profMetaNode = document.createTextNode('');
  metaEl.appendChild(_profMetaNode);
  profStatsEl.appendChild(metaEl);
  for (let i = 0; i < PROF_MOD_META.length; i++) {
    const row = document.createElement('div');
    row.className = 'prof-bar-row';
    const lbl = document.createElement('span');
    lbl.className = 'prof-lbl';
    const lblNode = document.createTextNode(t(PROF_MOD_META[i][1]));
    lbl.appendChild(lblNode);
    _profLblNodes.push(lblNode);
    const track = document.createElement('span');
    track.className = 'prof-track';
    const fill = document.createElement('span');
    fill.className = 'prof-fill';
    fill.style.width = '100%';
    fill.style.transformOrigin = 'left center';
    fill.style.transform = 'scaleX(0)';
    track.appendChild(fill);
    const val = document.createElement('span');
    val.className = 'prof-val';
    const valNode = document.createTextNode('');
    val.appendChild(valNode);
    row.append(lbl, track, val);
    profStatsEl.appendChild(row);
    _profFills.push(fill);
    _profValNodes.push(valNode);
  }
}

function renderLiveProfilerUI(stats, divisor) {
  if (!perfEl || !stats) return;
  setTextFast(perfEl, t('prof.hudPill', Math.round(stats.avgFps), Math.round(stats.onePctLowFps), stats.p99.toFixed(1), stats.jsP99.toFixed(1)));

  const showDetail = !!(G.settings && G.settings.showPerf && G.settings.showProfilerDetail && !isBenchmarkActive());
  if (profDrawerEl) profDrawerEl.classList.toggle('hidden', !showDetail);
  if (!showDetail) return;

  if (profStatsEl) {
    ensureProfilerDom();
    for (let i = 0; i < PROF_MOD_META.length; i++) {
      if (_profLblNodes[i]) _profLblNodes[i].nodeValue = t(PROF_MOD_META[i][1]);
    }
    const m = stats.modules;
    const stallTxt = stats.longStalls > 0 ? t('prof.stallSeg', stats.longStalls, Math.round(stats.maxStallMs)) : '';
    const heapTxt = stats.heapMB > 0 ? ` · ${stats.heapMB.toFixed(0)}MB` : '';
    const gSt = getGlyphAtlasStats();
    const bSt = getBackdropCacheStats();
    _profMetaNode.nodeValue = t('prof.metaLine', prof.getRefreshHz(), divisor, stats.p50.toFixed(1), stats.p95.toFixed(1), stats.dropPct.toFixed(1), stats.gcDrops, stallTxt, heapTxt, gSt.hitRate.toFixed(0), gSt.entries, bSt.panels);
    const denom = Math.max(2.0, stats.budgetMs * 0.5);
    for (let i = 0; i < PROF_MOD_META.length; i++) {
      const mv = m[PROF_MOD_META[i][0]];
      const ratio = Math.min(1, mv.p99 / denom);
      _profFills[i].style.transform = `scaleX(${ratio.toFixed(3)})`;
      _profValNodes[i].nodeValue = `${mv.avg.toFixed(2)} / ${mv.p99.toFixed(2)}ms`;
    }
  }

  if (profSparkCanvas && profSparkCtx) {
    const sctx = profSparkCtx;
    const w = profSparkCanvas.width;
    const h = profSparkCanvas.height;
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = 'rgba(6, 9, 16, 0.85)';
    sctx.fillRect(0, 0, w, h);
    const budget = stats.budgetMs;
    const maxScale = Math.max(18, budget * 2.6);
    const y1x = h - (budget / maxScale) * h;
    const y2x = h - ((budget * 2) / maxScale) * h;
    sctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    sctx.setLineDash([3, 3]);
    sctx.beginPath(); sctx.moveTo(0, y1x); sctx.lineTo(w, y1x); sctx.stroke();
    sctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
    sctx.beginPath(); sctx.moveTo(0, y2x); sctx.lineTo(w, y2x); sctx.stroke();
    sctx.setLineDash([]);

    const samples = prof.getRecentFrameTimes(w);
    const n = samples.length;
    const offX = w - n;
    for (let i = 0; i < n; i++) {
      const v = samples[i];
      const bh = Math.min(h, (v / maxScale) * h);
      sctx.fillStyle = v > stats.dropThreshMs ? '#f87171' : (v > budget * 1.12 ? '#fde047' : '#38bdf8');
      sctx.fillRect(offX + i, h - bh, 1, bh);
    }
  }
}

let _frameErrCount = 0;
function reportVisibleRuntimeError(tag, err) {
  console.error(`[AshenBellVow] ${tag}:`, err);
  if (typeof window !== 'undefined' && typeof window.__ABV_SHOW_FATAL__ === 'function') {
    const msg = (err && err.stack) ? String(err.stack).split('\n').slice(0, 3).join(' | ') : (err && err.message ? err.message : String(err));
    window.__ABV_SHOW_FATAL__(tag + ': ' + msg);
  }
}

function gameLoop(timestamp) {
  // Schedule next frame up front so a single unexpected exception can never permanently deadlock rAF
  requestAnimationFrame(gameLoop);
  try {
    runGameFrame(timestamp);
    _frameErrCount = 0;
  } catch (err) {
    _frameErrCount++;
    console.error('[AshenBellVow] Frame error recovered:', err);
    if (_frameErrCount === 1 || _frameErrCount === 5) {
      reportVisibleRuntimeError('FrameError', err);
    }
  }
}

function runGameFrame(timestamp) {
  // 1. Feed raw rAF timestamp BEFORE skipping so refresh rate detection is 100% accurate
  prof.onRawRaf(timestamp);

  // 2. Exact integer VSync divisor skipping (eliminates 144Hz -> 120FPS pulldown judder!)
  const benchOn = isBenchmarkActive();
  let divisor = benchOn ? 1 : Math.max(1, Number(G.settings && G.settings.fpsDivisor) || 1);
  if (!benchOn && G.isMobile && G.settings && G.settings.mobileEcoMode && divisor === 1) {
    const curHz = prof.getRefreshHz();
    if (curHz >= 90) divisor = Math.max(2, Math.round(curHz / 60));
  }
  if (prof.shouldSkipFrame(divisor)) return;

  const jsStart = performance.now();
  prof.beginFrame();
  const rawMs = lastFrameTime ? (timestamp - lastFrameTime) : (1000 / prof.getRefreshHz());
  const elapsed = rawMs / 1000;
  const dt = Math.min(0.033, Math.max(0, elapsed));
  lastFrameTime = timestamp;

  G.globalTime += dt;
  boilAccumulator += dt;
  while (boilAccumulator >= 1 / 7) {
    G.boilFrame++;
    boilAccumulator -= 1 / 7;
  }

  if (G.invertTimer > 0) G.invertTimer = Math.max(0, G.invertTimer - dt);

  pollGamepad();

  if (G.gameState === 'playing') {
    G.playTimeSec += dt;
    if (benchOn) {
      tickCombatBenchmark(dt);
    } else {
      capturePlayerInputBuffers();
    }
    const updT0 = performance.now();
    const curBoss = getAwakeBoss();
    const curHudBoss = curBoss || getHudBoss();
    let inCombat = false;
    if (!curHudBoss && G.player && G.player.hp > 0) {
      const px = G.player.x + G.player.w * 0.5;
      const py = G.player.y + G.player.h * 0.5;
      for (let i = 0; i < G.enemies.length; i++) {
        const e = G.enemies[i];
        if (!e || !e.alive || e.isDummy) continue;
        if (e.isMiniBoss && !e.awake) continue;
        if (e.state === 'patrol' || e.state === 'cling' || e.state === 'hover' || e.state === 'idle') continue;
        if (e.roomId && G.currentRoomId && e.roomId !== G.currentRoomId) continue;
        if (Math.abs(e.y - py) < 260 && Math.hypot(e.x - px, e.y - py) < 500) {
          inCombat = true; break;
        }
      }
    }
    const curBiome = G.themeBlend ? G.themeBlend.activeTheme : 'sanctuary';
    const bossPhaseAmb = curHudBoss
      ? (curHudBoss.kind === 'boss4' && curHudBoss.phase >= 3 ? 4 : (curHudBoss.phase || 1))
      : 0;
    audio.updateAmbience(dt, !!curHudBoss, bossPhaseAmb, inCombat, G.player ? G.player.parryStreak : 0, curBiome);
    let simDt = dt;
    if (G.bossKillSlowmo && G.bossKillSlowmo.timer > 0) {
      G.bossKillSlowmo.timer = Math.max(0, G.bossKillSlowmo.timer - dt);
      simDt = dt * 0.24;
      if (G.bossKillSlowmo.timer <= 0) G.bossKillSlowmo = null;
    }
    if (G.bossIntro && G.bossIntro.timer > 0 && G.player) {
      G.bossIntro.timer = Math.max(0, G.bossIntro.timer - dt);
      G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.25);
      updateWorldEffects(dt); updateCamera(dt);
      if (G.bossIntro.timer <= 0) G.bossIntro = null;
    } else if (G.hitstopTimer > 0) {
      G.hitstopTimer = Math.max(0, G.hitstopTimer - dt);
      if (G.player) { updateWorldEffects(dt * 0.85); updateCamera(dt); }
    } else if (G.player) {
      updatePlayer(simDt);
      const px = G.player.x, py = G.player.y;
      for (let i = 0; i < G.enemies.length; i++) {
        const enemy = G.enemies[i];
        if (!enemy || !enemy.alive) continue;
        if (Math.abs(enemy.x - px) > 1350 || Math.abs(enemy.y - py) > 820) {
          if (enemy.isMiniBoss && enemy.awake && !G.echoSession) resetWardenState(enemy);
          continue;
        }
        updateEnemy(enemy, simDt);
      }
      if (G.boss && G.boss.alive && !updateEnemyHitFeel(G.boss, simDt)) updateBoss(G.boss, simDt);
      if (G.boss2 && G.boss2.alive && !updateEnemyHitFeel(G.boss2, simDt)) updateBoss2(G.boss2, simDt);
      if (G.boss3 && G.boss3.alive && !updateEnemyHitFeel(G.boss3, simDt)) updateBoss3(G.boss3, simDt);
      if (G.boss4 && G.boss4.alive && !updateEnemyHitFeel(G.boss4, simDt)) updateBoss4(G.boss4, simDt);
      updateWorldEffects(simDt);
      updateCamera(dt);
    }
    prof.addModuleTime('update', Math.max(0, (performance.now() - updT0) - prof._cur.audio));
    if (G.saveDirtyTimer > 0 && !benchOn) {
      G.saveDirtyTimer -= dt;
      if (G.saveDirtyTimer <= 0) {
        const busyAction = G.player && (G.player.grappleState !== 'none' || G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.attackTimer > 0);
        if (busyAction) G.saveDirtyTimer = 0.6;
        else saveProgress(false);
      }
    }
    const hudT0 = performance.now();
    syncHUD();
    prof.addModuleTime('hud', performance.now() - hudT0);
  } else if (G.gameState === 'title') {
    updateAmbientOnly(dt);
    const lDmp = damp(0.986, dt);
    for (const lantern of G.lanterns) {
      const wind = Math.sin(G.globalTime * 1.4 + lantern.x * 0.01) * 0.35;
      lantern.angVel = (lantern.angVel - 14.5 * Math.sin(lantern.angle) * dt + wind * dt) * lDmp;
      lantern.angle += lantern.angVel * dt;
    }
    if (ALTARS[0]) {
      const targetCamX = Math.max(0, ALTARS[0].x - G.canvasW * 0.64 + Math.sin(G.globalTime * 0.24) * 18);
      const targetCamY = Math.max(0, ALTARS[0].y - G.canvasH * 0.72 + Math.cos(G.globalTime * 0.20) * 6);
      G.cam.x += (targetCamX - G.cam.x) * Math.min(1, dt * 2.5);
      G.cam.y += (targetCamY - G.cam.y) * Math.min(1, dt * 2.5);
    }
  }
  const isPortraitGuard = document.body.classList.contains('is-portrait');
  if (isPortraitGuard) {
    // Watchdog: recover automatically if browser updated dimensions without firing resize/orientationchange
    if (isViewportLandscape()) resizeCanvas();
  } else {
    updateTitleIntro(dt);
  }
  // v43.5 State-driven body[data-game-state] so HUD & Mobile Touch Controls are 100% hidden during intro/title/cinematics/modals!
  const nextBodyState = isTitleIntroPlaying()
    ? 'intro'
    : (G.gameState === 'playing' && ((G.bossIntro && G.bossIntro.timer > 0) || (G.bossKillSlowmo && G.bossKillSlowmo.timer > 0)))
      ? 'cinematic'
      : (G.gameState || 'title');
  if (document.body.dataset.gameState !== nextBodyState) {
    document.body.dataset.gameState = nextBodyState;
  }

  if (G.activeModal === 'ending-cinematic') updateAndRenderEndingCinematic(dt);
  if (G.activeModal === 'smith') updateAndRenderSkillPreview(dt);
  clearFrameInputs();
  const isStaticOverlay = G.gameState === 'modal' || G.gameState === 'dead' || G.gameState === 'victory';
  if (isStaticOverlay) {
    const key = `${G.gameState}:${G.activeModal || ''}:${G.canvasW}x${G.canvasH}`;
    if (key !== lastStaticRenderKey) {
      render();
      lastStaticRenderKey = key;
    }
  } else {
    lastStaticRenderKey = '';
    render();
  }

  const jsMs = performance.now() - jsStart;
  prof.endFrame(rawMs, jsMs);

  if (perfEl) {
    const show = !!(G.settings && G.settings.showPerf && !benchOn);
    perfEl.classList.toggle('hidden', !show);
    if (!show && profDrawerEl) profDrawerEl.classList.add('hidden');
    if (show && rawMs > 0) {
      perfUiAccumMs += Math.min(500, rawMs);
      if (perfUiAccumMs >= 300) {
        perfUiAccumMs = 0;
        const stats = prof.computeRollingStats(divisor);
        if (stats) renderLiveProfilerUI(stats, divisor);
      }
    }
  }
  window.__ABV_BOOTED__ = true;
}

// Wire DOM UI actions
initInputListeners();
let _startOverwriteArmTimer = null;
let _startOverwriteArmed = false;
function disarmStartOverwrite() {
  _startOverwriteArmed = false;
  if (_startOverwriteArmTimer !== null) {
    clearTimeout(_startOverwriteArmTimer);
    _startOverwriteArmTimer = null;
  }
}

document.getElementById('btn-continue').addEventListener('click', () => {
  if (isTitleIntroActive()) { skipTitleIntro(); return; }
  disarmStartOverwrite();
  try { audio.init(); audio.playBellToll(); } catch {}
  beginSceneFade(() => continueSavedGame(), isEmbeddedH5Container() ? 0.18 : 0.36);
});
document.getElementById('btn-start').addEventListener('click', () => {
  if (isTitleIntroActive()) { skipTitleIntro(); return; }
  if (readSaveData()) {
    // v44.5 Mobile/WebView-safe inline 2-tap overwrite confirmation (avoids frozen window.confirm in TapTap WebView!)
    if (G.isMobile) {
      const sb = document.getElementById('btn-start');
      if (!_startOverwriteArmed) {
        _startOverwriteArmed = true;
        if (sb) {
          sb.textContent = t('title.confirmOverwriteMob', G.activeSaveSlot + 1);
          sb.classList.add('armed-danger');
        }
        _startOverwriteArmTimer = setTimeout(() => {
          disarmStartOverwrite();
          if (sb) sb.classList.remove('armed-danger');
          refreshTitleSaveUI();
        }, 4200);
        return;
      }
      disarmStartOverwrite();
      if (sb) sb.classList.remove('armed-danger');
    } else if (!window.confirm(t('confirm.overwriteSlot', G.activeSaveSlot + 1))) {
      return;
    }
  }
  try { audio.init(); audio.playBellToll(); } catch {}
  beginSceneFade(() => startGame(), isEmbeddedH5Container() ? 0.18 : 0.36);
});
const btnTitleSlots = document.getElementById('btn-title-slots');
const slotsDrawer = document.getElementById('title-slots-drawer');
const btnCloseSlotsDrawer = document.getElementById('btn-close-slots-drawer');
if (btnTitleSlots && slotsDrawer) {
  btnTitleSlots.addEventListener('click', () => {
    refreshTitleSaveUI();
    slotsDrawer.classList.toggle('hidden');
  });
}
if (btnCloseSlotsDrawer && slotsDrawer) {
  btnCloseSlotsDrawer.addEventListener('click', () => slotsDrawer.classList.add('hidden'));
}
const btnTitleControls = document.getElementById('btn-title-controls');
if (btnTitleControls) {
  btnTitleControls.addEventListener('click', () => openModal('help'));
}
const btnTitleSettings = document.getElementById('btn-title-settings');
if (btnTitleSettings) {
  btnTitleSettings.addEventListener('click', () => openModal('settings'));
}
const btnTitleFs = document.getElementById('btn-title-fullscreen');
if (btnTitleFs) {
  btnTitleFs.addEventListener('click', e => {
    e.stopPropagation();
    try { audio.init(); } catch {}
    requestMobileLandscapeFullscreen(true);
    scheduleOrientationRecheck();
  });
}
const btnTitleReplayIntro = document.getElementById('btn-title-replay-intro');
if (btnTitleReplayIntro) {
  btnTitleReplayIntro.addEventListener('click', () => {
    audio.init();
    startTitleIntro(false);
  });
}
const titleScreenEl = document.getElementById('title-screen');
if (titleScreenEl) {
  titleScreenEl.addEventListener('mousedown', () => {
    if (isTitleIntroActive()) skipTitleIntro();
  });
  titleScreenEl.addEventListener('touchstart', () => {
    if (isTitleIntroActive()) skipTitleIntro();
  }, { passive: true });
}
document.getElementById('btn-ctrl').addEventListener('click', () => {
  G.controlMode = G.controlMode === 'kbmouse' ? 'keyboard' : 'kbmouse';
  syncControlModeUI();
  if (G.gameState !== 'title') saveProgress(false);
});
const rotFsBtn = document.getElementById('btn-rotate-fullscreen');
if (rotFsBtn) {
  rotFsBtn.addEventListener('click', () => {
    try { audio.init(); } catch {}
    requestMobileLandscapeFullscreen(true);
    scheduleOrientationRecheck();
    // If browser (WeChat / iOS Safari / OS rotation lock) refuses native landscape after 320ms, seamlessly enter CSS fallback landscape!
    setTimeout(() => {
      if (document.body.classList.contains('is-portrait')) {
        setForceLandscapeFallback(true);
        resizeCanvas();
      }
    }, 320);
  });
}
const rotForceBtn = document.getElementById('btn-rotate-force');
if (rotForceBtn) {
  rotForceBtn.addEventListener('click', () => {
    try { audio.init(); } catch {}
    setForceLandscapeFallback(true);
    resizeCanvas();
  });
}
const fsBtn = document.getElementById('btn-fullscreen');
if (fsBtn) {
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) { try { const p = exitFs.call(document); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch {} }
    } else {
      requestMobileLandscapeFullscreen(true);
    }
    scheduleResize();
  });
}
document.getElementById('btn-map').addEventListener('click', openMapModal);
document.getElementById('minimap-strip').addEventListener('click', openMapModal);
document.getElementById('btn-help').addEventListener('click', () => openModal('help'));
document.getElementById('btn-settings').addEventListener('click', () => openSettingsJournal('settings'));
document.getElementById('btn-close-settings').addEventListener('click', () => {
  saveUserSettings();
  closeModal('settings');
});
document.getElementById('btn-close-smith').addEventListener('click', () => closeModal('smith'));
const closeDummyBtn = document.getElementById('btn-close-dummy');
if (closeDummyBtn) closeDummyBtn.addEventListener('click', () => closeModal('dummy'));
const closeNpcBtn = document.getElementById('btn-close-npc');
if (closeNpcBtn) closeNpcBtn.addEventListener('click', () => closeModal('npc'));
document.getElementById('btn-music-toggle').addEventListener('click', () => {
  const next = G.settings.musicEnabled === false;
  G.settings.musicEnabled = next;
  audio.setMusicEnabled(next);
  saveUserSettings();
  renderSettingsModal();
});
const wireVolSlider = (id, key) => {
  const el = document.getElementById(id);
  const lbl = document.getElementById(`${id}-val`);
  if (!el) return;
  el.addEventListener('input', () => {
    const pct = Math.max(0, Math.min(100, Number(el.value) || 0));
    G.settings[key] = pct / 100;
    if (lbl) lbl.textContent = `${pct}%`;
    audio.setVolumes(G.settings.masterVol, G.settings.musicVol, G.settings.sfxVol);
  });
  el.addEventListener('change', () => saveUserSettings());
};
wireVolSlider('vol-master', 'masterVol');
wireVolSlider('vol-music', 'musicVol');
wireVolSlider('vol-sfx', 'sfxVol');
document.getElementById('btn-pause-resume').addEventListener('click', () => closeModal('pause'));
const pauseCodexBtn = document.getElementById('btn-pause-codex');
if (pauseCodexBtn) pauseCodexBtn.addEventListener('click', () => openCodexModal());
document.getElementById('btn-pause-settings').addEventListener('click', () => openSettingsJournal('settings'));
const mapToCodex = document.getElementById('btn-map-to-codex');
if (mapToCodex) mapToCodex.addEventListener('click', () => openCodexModal());
const altarToCodex = document.getElementById('btn-altar-to-codex');
if (altarToCodex) altarToCodex.addEventListener('click', () => openCodexModal());
const codexToMap = document.getElementById('btn-codex-to-map');
if (codexToMap) codexToMap.addEventListener('click', () => openMapModal());
const settingsToMap = document.getElementById('btn-settings-to-map');
if (settingsToMap) settingsToMap.addEventListener('click', () => openMapModal());
const closeCodexBtn = document.getElementById('btn-close-codex');
if (closeCodexBtn) closeCodexBtn.addEventListener('click', () => closeModal('codex'));
document.getElementById('btn-pause-respawn').addEventListener('click', respawnAtActiveAltar);
document.getElementById('btn-pause-title').addEventListener('click', returnToTitle);
function refreshAllDynamicLocaleUI() {
  clearGlyphAtlas();
  prewarmGlyphAtlas();
  syncControlModeUI();
  const muteEl = document.getElementById('btn-mute');
  if (muteEl) muteEl.textContent = audio.muted ? t('hud.muteOff') : t('hud.muteOn');
  refreshTitleSaveUI();
  refreshActiveModalI18n();
  if (G.player) syncHUD(true);
}
onLocaleChange(refreshAllDynamicLocaleUI);

const titleLangBtn = document.getElementById('btn-title-lang');
if (titleLangBtn) titleLangBtn.addEventListener('click', () => toggleLocale(true));

const langZh = document.getElementById('btn-lang-zh');
const langEn = document.getElementById('btn-lang-en');
if (langZh) langZh.addEventListener('click', () => setLocale('zh-CN', true));
if (langEn) langEn.addEventListener('click', () => setLocale('en-US', true));
const lightBtn = document.getElementById('btn-lighting-toggle');
if (lightBtn) {
  lightBtn.addEventListener('click', () => {
    G.settings.dynamicLighting = G.settings.dynamicLighting === false;
    saveUserSettings();
    resizeCanvas();
    renderSettingsModal();
  });
}
const perfBtn = document.getElementById('btn-perf-toggle');
if (perfBtn) {
  perfBtn.addEventListener('click', () => {
    G.settings.showPerf = !G.settings.showPerf;
    saveUserSettings();
    renderSettingsModal();
  });
}
if (perfEl) {
  perfEl.addEventListener('click', () => {
    G.settings.showProfilerDetail = !G.settings.showProfilerDetail;
    const stats = prof.computeRollingStats(G.settings.fpsDivisor || 1);
    if (stats) renderLiveProfilerUI(stats, G.settings.fpsDivisor || 1);
  });
}
const wireBenchStart = id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => startCombatBenchmark());
};
wireBenchStart('btn-run-bench');
wireBenchStart('btn-prof-bench');
wireBenchStart('btn-bench-rerun');
const benchLastBtn = document.getElementById('btn-view-bench-report');
if (benchLastBtn) benchLastBtn.addEventListener('click', () => openBenchmarkReportModal());
const benchCopyBtn = document.getElementById('btn-bench-copy');
if (benchCopyBtn) {
  benchCopyBtn.addEventListener('click', async () => {
    const ok = await copyBenchmarkReport();
    benchCopyBtn.textContent = ok ? t('bench.copied') : t('bench.copyFail');
    setTimeout(() => { benchCopyBtn.textContent = t('bench.copy'); }, 1800);
  });
}
const benchCloseBtn = document.getElementById('btn-close-bench');
if (benchCloseBtn) benchCloseBtn.addEventListener('click', () => closeModal('bench'));
document.getElementById('btn-haptics-toggle').addEventListener('click', () => {
  G.settings.haptics = !G.settings.haptics;
  saveUserSettings();
  renderSettingsModal();
  if (G.settings.haptics) triggerHaptic('test', 0.7);
});
const mobFloatBtn = document.getElementById('btn-mob-float-joy');
if (mobFloatBtn) {
  mobFloatBtn.addEventListener('click', () => {
    G.settings.mobileFloatingJoy = G.settings.mobileFloatingJoy === false;
    applyMobileTouchPrefs();
    saveUserSettings();
    renderSettingsModal();
  });
}
const mobMergedBtn = document.getElementById('btn-mob-merged-parry');
if (mobMergedBtn) {
  mobMergedBtn.addEventListener('click', () => {
    G.settings.mobileMergedParry = G.settings.mobileMergedParry === false;
    applyMobileTouchPrefs();
    saveUserSettings();
    renderSettingsModal();
    syncHUD(true);
  });
}
const mobAssistBtn = document.getElementById('btn-mob-combat-assist');
if (mobAssistBtn) {
  mobAssistBtn.addEventListener('click', () => {
    G.settings.mobileCombatAssist = G.settings.mobileCombatAssist === false;
    saveUserSettings();
    renderSettingsModal();
  });
}
const mobScaleInp = document.getElementById('mob-btn-scale');
if (mobScaleInp) {
  mobScaleInp.addEventListener('input', () => {
    const pct = Math.max(80, Math.min(120, Number(mobScaleInp.value) || 100));
    G.settings.mobileBtnScale = pct / 100;
    const lbl = document.getElementById('mob-btn-scale-val');
    if (lbl) lbl.textContent = `${pct}%`;
    applyMobileTouchPrefs();
  });
  mobScaleInp.addEventListener('change', () => saveUserSettings());
}
const mobOpInp = document.getElementById('mob-btn-opacity');
if (mobOpInp) {
  mobOpInp.addEventListener('input', () => {
    const pct = Math.max(45, Math.min(100, Number(mobOpInp.value) || 90));
    G.settings.mobileBtnOpacity = pct / 100;
    const lbl = document.getElementById('mob-btn-opacity-val');
    if (lbl) lbl.textContent = `${pct}%`;
    applyMobileTouchPrefs();
  });
  mobOpInp.addEventListener('change', () => saveUserSettings());
}
// Mobile 3-tier quality segmented control is wired inside renderSettingsModal()
document.getElementById('btn-test-haptic').addEventListener('click', () => {
  const ok = triggerHaptic('test', 1.0);
  const b = document.getElementById('btn-test-haptic');
  if (b) {
    b.textContent = ok ? t('settings.hapticSent') : t('settings.hapticNone');
    setTimeout(() => { b.textContent = t('settings.testHaptic'); }, 1200);
  }
});
document.getElementById('btn-reset-keys').addEventListener('click', () => {
  resetDefaultKeybinds();
  saveUserSettings();
  renderSettingsModal();
});
document.getElementById('btn-mute').addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  document.getElementById('btn-mute').textContent = audio.muted ? t('hud.muteOff') : t('hud.muteOn');
  if (G.gameState !== 'title') saveProgress(false);
});
const mobilePauseBtn = document.getElementById('btn-pause');
if (mobilePauseBtn) mobilePauseBtn.addEventListener('click', openPauseModal);
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.getAttribute('data-close-modal');
    if (m === 'settings') saveUserSettings();
    closeModal(m);
  });
});
['altar', 'map', 'codex', 'lore', 'help', 'smith', 'npc', 'settings', 'pause', 'ending-choice', 'bench'].forEach(m => {
  const ov = document.getElementById(`${m}-modal`);
  if (!ov) return;
  ov.addEventListener('click', e => {
    if (e.target === ov && G.activeModal === m) {
      if (m === 'settings') saveUserSettings();
      closeModal(m);
    }
  });
});
document.getElementById('btn-respawn').addEventListener('click', respawnAtActiveAltar);
document.getElementById('btn-close-altar').addEventListener('click', () => closeModal('altar'));
document.getElementById('btn-close-map').addEventListener('click', () => closeModal('map'));
document.getElementById('btn-close-lore').addEventListener('click', () => closeModal('lore'));
document.getElementById('btn-close-help').addEventListener('click', () => closeModal('help'));
document.getElementById('btn-retry-echo').addEventListener('click', () => {
  if (G.echoSession) startEchoChallenge(G.echoSession.mode);
  else respawnAtActiveAltar();
});
document.getElementById('btn-retry').addEventListener('click', respawnAtActiveAltar);
document.getElementById('btn-echo-again').addEventListener('click', () => {
  if (G.echoSession) startEchoChallenge(G.echoSession.mode);
  else respawnAtActiveAltar();
});
document.getElementById('btn-enter-well').addEventListener('click', continueIntoBellWell);
document.getElementById('btn-play-again').addEventListener('click', startGame);
document.getElementById('btn-ending-vow').addEventListener('click', () => startEndingCinematic('vow'));
document.getElementById('btn-ending-dawn').addEventListener('click', () => startEndingCinematic('dawn'));
document.getElementById('btn-ending-defer').addEventListener('click', () => closeModal('ending-choice'));
document.getElementById('btn-ending-next').addEventListener('click', () => advanceEndingCinematic(false));
document.getElementById('btn-ending-skip').addEventListener('click', () => advanceEndingCinematic(true));
document.getElementById('btn-ending-to-altar').addEventListener('click', respawnAtActiveAltar);
document.getElementById('btn-ending-keep-roam').addEventListener('click', () => closeModal('ending-cinematic'));
const ngEndBtn = document.getElementById('btn-ending-ngplus');
if (ngEndBtn) ngEndBtn.addEventListener('click', startNewGamePlus);
document.getElementById('btn-ending-new-run').addEventListener('click', startGame);

window.addEventListener('keydown', e => {
  if (isCapturingKey()) return;
  if (e.code === 'F8' && !e.repeat) {
    e.preventDefault();
    G.settings.showPerf = true;
    G.settings.showProfilerDetail = !G.settings.showProfilerDetail;
    saveUserSettings();
    const stats = prof.computeRollingStats(G.settings.fpsDivisor || 1);
    if (stats) renderLiveProfilerUI(stats, G.settings.fpsDivisor || 1);
    return;
  }
  if (e.code === 'F9' && !e.repeat) {
    e.preventDefault();
    if (isBenchmarkActive()) cancelCombatBenchmark();
    else startCombatBenchmark();
    return;
  }
  if (e.code === 'Escape' && isBenchmarkActive() && !e.repeat) {
    cancelCombatBenchmark();
    return;
  }
  const mapCode = getActionKeyCode('map');
  if ((e.code === 'Tab' || e.code === mapCode) && (G.gameState === 'playing' || G.activeModal === 'map' || G.activeModal === 'codex')) {
    e.preventDefault();
    if (!e.repeat) openMapModal();
  } else if (G.gameState === 'playing' && !e.repeat && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'KeyX')) {
    if (e.code === 'Digit1') equipWeapon('blade');
    else if (e.code === 'Digit2') equipWeapon('hammer');
    else if (e.code === 'Digit3') equipWeapon('bell');
    else cycleWeapon(1);
  } else if (e.code === 'KeyB' && (G.gameState === 'playing' || G.activeModal === 'codex' || G.activeModal === 'settings' || G.activeModal === 'map')) {
    e.preventDefault();
    if (!e.repeat) openCodexModal();
  } else if (e.code === 'Escape' && G.gameState === 'playing' && !e.repeat) {
    openPauseModal();
  } else if (e.code === 'Escape' && G.gameState === 'modal' && G.activeModal && !e.repeat) {
    closeModal(G.activeModal);
  } else if (G.gameState === 'title' && isTitleIntroActive() && !e.repeat) {
    e.preventDefault();
    skipTitleIntro();
  } else if (e.code === 'Enter' && G.gameState === 'title' && !e.repeat) {
    audio.init();
    audio.playBellToll();
    if (readSaveData()) beginSceneFade(() => continueSavedGame(), 0.44);
    else beginSceneFade(() => startGame(), 0.44);
  }
});

// v44.2 Mobile Background-Return & Lock-Screen Audio Keep-Alive (iOS Safari / Android Chrome / WeChat safe)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.setBackgroundDuck(true);
    if (G.saveDirtyTimer > 0 && G.worldState) saveProgress(false);
  } else {
    audio.setBackgroundDuck(false);
    audio.keepAliveResume(false);
  }
});
window.addEventListener('pageshow', () => {
  audio.setBackgroundDuck(false);
  audio.keepAliveResume(false);
});
window.addEventListener('focus', () => {
  if (!document.hidden) audio.keepAliveResume(false);
});
window.addEventListener('pagehide', () => {
  if (G.saveDirtyTimer > 0 && G.worldState) saveProgress(false);
  audio.emergencySuspend();
});
const _recoverAudioOnGesture = () => {
  if (audio.needsRecovery()) audio.keepAliveResume(true);
};
window.addEventListener('touchstart', _recoverAudioOnGesture, { capture: true, passive: true });
window.addEventListener('pointerdown', _recoverAudioOnGesture, { capture: true, passive: true });
window.addEventListener('keydown', _recoverAudioOnGesture, { capture: true, passive: true });

// v44.2 PWA Offline Service Worker & One-Tap Add-to-Home-Screen Install Pill (HTTPS / localhost only)
let _deferredPwaPrompt = null;
const pwaInstallBtn = document.getElementById('btn-pwa-install');
const isStandalonePwa = !!(
  (window.matchMedia && (window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches)) ||
  window.navigator.standalone === true
);
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPwaPrompt = e;
  if (pwaInstallBtn && !isStandalonePwa) pwaInstallBtn.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  _deferredPwaPrompt = null;
  if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
});
if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', () => {
    if (!_deferredPwaPrompt) return;
    const promptEv = _deferredPwaPrompt;
    _deferredPwaPrompt = null;
    try {
      promptEv.prompt();
      if (promptEv.userChoice && typeof promptEv.userChoice.then === 'function') {
        promptEv.userChoice.then(() => pwaInstallBtn.classList.add('hidden')).catch(() => {});
      } else {
        pwaInstallBtn.classList.add('hidden');
      }
    } catch {
      pwaInstallBtn.classList.add('hidden');
    }
  });
}
if ('serviceWorker' in navigator && !window.__ABV_OFFLINE_WORLD__) {
  const proto = window.location.protocol;
  const host = window.location.hostname;
  if (proto === 'https:' || host === 'localhost' || host === '127.0.0.1') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}
window.addEventListener('error', () => {
  audio.emergencySuspend();
});

// Internal dev-only preview return button (only visible when launched from editor.html?preview=1)
const backEditorBtn = document.getElementById('btn-back-editor');
if (backEditorBtn) {
  backEditorBtn.addEventListener('click', () => {
    const rid = G.currentRoomId || getPreviewSpawnRoomId();
    window.location.href = rid ? `./editor.html?room=${encodeURIComponent(rid)}` : './editor.html';
  });
}

// Async Bootstrap: load room-based JSON data stream before initializing scene
async function bootstrapGame() {
  document.body.dataset.gameState = 'intro';
  const initLayout = updateMobileOrientationLayout();
  G.isMobile = !!initLayout.mobile;
  loadUserSettings();
  applyMobileTouchPrefs();
  loadSavedLocale();
  buildGlowSprites();
  await loadWorldData();
  const bootSave = readSaveData();
  if (bootSave && (bootSave.controlMode === 'kbmouse' || bootSave.controlMode === 'keyboard')) {
    G.controlMode = bootSave.controlMode;
  }
  updateMobileOrientationLayout();
  syncControlModeUI();
  G.worldState = createFreshWorldState();
  if (ALTARS[0]) markMapExplored(ALTARS[0].x, ALTARS[0].y - 40);
  const diagBox = document.getElementById('file-protocol-warning');
  if (diagBox) diagBox.style.display = 'none';
  const startBtnEl = document.getElementById('btn-start');
  const contBtnEl = document.getElementById('btn-continue');
  if (startBtnEl) { startBtnEl.disabled = false; startBtnEl.style.opacity = ''; }
  if (contBtnEl) { contBtnEl.disabled = false; contBtnEl.style.opacity = ''; }
  refreshTitleSaveUI();
  resizeCanvas();
  snapCameraToPlayer(0);
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  initAmbientMotes();
  G.player = null;
  if (ALTARS[0]) {
    G.cam.x = Math.max(0, ALTARS[0].x - G.canvasW * 0.64);
    G.cam.y = Math.max(0, ALTARS[0].y - G.canvasH * 0.72);
  }
  if (G.isEditorPreview) {
    startTitleIntro(true);
    const pill = document.getElementById('editor-preview-pill');
    if (pill) pill.classList.remove('hidden');
    startGame();
  } else {
    startTitleIntro(false);
  }
  requestAnimationFrame(gameLoop);

  // v44.6 Non-blocking staggered prewarm AFTER frame 1 paints so TapTap/Android WebView never stalls on black screen!
  setTimeout(() => {
    try { prewarmStampsForList(STAMPS); } catch {}
    try { renderParchmentMap(HUD_DOM.minimapCanvas, false); } catch {}
  }, 60);
  setTimeout(() => {
    try { prewarmTerrainChunks(G.cam.x, G.cam.y, G.canvasW, G.canvasH); } catch {}
    try { prewarmGlyphAtlas(); } catch {}
  }, 220);
}

bootstrapGame().catch(err => {
  reportVisibleRuntimeError('BootstrapError', err);
});
