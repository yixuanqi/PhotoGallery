// Entry point: wires cross-module hooks, canvas lifecycle, UI listeners & main gameLoop
import { ALTARS, WORLD_W, WORLD_H, FLOOR_Y } from './config.js';
import { G, hooks, createFreshWorldState, markMapExplored, createLanterns, createResonancePuzzles, createCrumblePlatforms, getAwakeBoss } from './state.js';
import { loadWorldData, getPreviewSpawnRoomId } from './levelLoader.js';
import { audio } from './audio.js';
import { buildParchmentPattern, buildGlowSprites, initAmbientMotes } from './vfx.js';
import {
  clearFrameInputs, syncControlModeUI, pollGamepad, initInputListeners,
  updateMobileOrientationLayout, requestMobileLandscapeFullscreen,
  getActionKeyCode, isCapturingKey, resetDefaultKeybinds, triggerHaptic
} from './input.js';
import { capturePlayerInputBuffers, updatePlayer } from './player.js';
import { updateEnemy, updateBoss, updateBoss2 } from './ai.js';
import { updateWorldEffects, updateCamera, updateAmbientOnly } from './world.js';
import { render } from './renderer.js';
import { readSaveData, saveProgress, loadUserSettings, saveUserSettings } from './save.js';
import {
  HUD_DOM, refreshTitleSaveUI, syncHUD, openModal, closeModal, renderParchmentMap, renderSettingsModal,
  openSmithModal, openLoreModal, openMapModal, interactWithAltar, respawnAtActiveAltar,
  startEchoChallenge, advanceEchoRushStage2, showDeath, showVictory,
  startGame, continueSavedGame, continueIntoBellWell
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
  interactWithAltar,
  openSmithModal,
  openLoreModal,
  openMapModal,
  closeModal,
  startGame,
  continueSavedGame,
  respawnAtActiveAltar,
  startEchoChallenge,
  continueIntoBellWell
});

// Initialize Canvas context on central state
G.canvas = document.getElementById('gameCanvas');
G.ctx = G.canvas.getContext('2d');

function resizeCanvas() {
  updateMobileOrientationLayout();
  const root = document.getElementById('game-root');
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const cssW = Math.max(320, (root && root.clientWidth) || window.innerWidth || 1280);
  const cssH = Math.max(240, (root && root.clientHeight) || window.innerHeight || 720);
  // Auto zoom-out on short mobile landscape screens (< 540px tall) for wide Metroidvania visibility
  const viewScale = cssH < 540 ? Math.max(0.66, cssH / 540) : 1;
  G.canvasW = Math.round(cssW / viewScale);
  G.canvasH = Math.round(cssH / viewScale);
  G.canvas.width = Math.round(cssW * dpr);
  G.canvas.height = Math.round(cssH * dpr);
  G.ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, 0, 0);
  G.cam.x = Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), G.cam.x));
  G.cam.y = Math.min(WORLD_H - G.canvasH, Math.max(-40, G.cam.y));
  G.paperPattern = null;
  buildParchmentPattern();
}

let resizeTimer = null;
function scheduleResize() {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    resizeCanvas();
  }, 90);
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);

let lastFrameTime = 0;
let boilAccumulator = 0;

function gameLoop(timestamp) {
  const elapsed = lastFrameTime ? (timestamp - lastFrameTime) / 1000 : 0;
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
    capturePlayerInputBuffers();
    const curBoss = getAwakeBoss();
    let inCombat = false;
    if (!curBoss && G.player && G.player.hp > 0) {
      const px = G.player.x + G.player.w * 0.5;
      const py = G.player.y + G.player.h * 0.5;
      for (let i = 0; i < G.enemies.length; i++) {
        const e = G.enemies[i];
        if (e && e.alive && e.state !== 'patrol' && e.state !== 'cling' && Math.hypot(e.x - px, e.y - py) < 520) {
          inCombat = true; break;
        }
      }
    }
    audio.updateAmbience(dt, !!curBoss, !!(curBoss && curBoss.phase === 2), inCombat, G.player ? G.player.parryStreak : 0);
    if (G.hitstopTimer > 0) {
      G.hitstopTimer = Math.max(0, G.hitstopTimer - dt);
    } else if (G.player) {
      updatePlayer(dt);
      for (const enemy of G.enemies) updateEnemy(enemy, dt);
      updateBoss(G.boss, dt);
      updateBoss2(G.boss2, dt);
      updateWorldEffects(dt);
      updateCamera(dt);
    }
    if (G.saveDirtyTimer > 0) {
      G.saveDirtyTimer -= dt;
      if (G.saveDirtyTimer <= 0) saveProgress(false);
    }
    syncHUD();
  } else if (G.gameState === 'title') {
    updateAmbientOnly(dt);
    for (const lantern of G.lanterns) {
      const wind = Math.sin(G.globalTime * 1.4 + lantern.x * 0.01) * 0.35;
      lantern.angVel = (lantern.angVel - 14.5 * Math.sin(lantern.angle) * dt + wind * dt) * 0.986;
      lantern.angle += lantern.angVel * dt;
    }
  }

  clearFrameInputs();
  render();
  window.__ABV_BOOTED__ = true;
requestAnimationFrame(gameLoop);
}

// Wire DOM UI actions
initInputListeners();
document.getElementById('btn-continue').addEventListener('click', () => {
  requestMobileLandscapeFullscreen();
  continueSavedGame();
});
document.getElementById('btn-start').addEventListener('click', () => {
  requestMobileLandscapeFullscreen();
  startGame();
});
document.getElementById('btn-ctrl').addEventListener('click', () => {
  G.controlMode = G.controlMode === 'kbmouse' ? 'keyboard' : 'kbmouse';
  syncControlModeUI();
  if (G.gameState !== 'title') saveProgress(false);
});
const auxBtn = document.getElementById('btn-mobile-aux');
const auxWrap = document.getElementById('mobile-aux-controls');
if (auxBtn && auxWrap) {
  auxBtn.addEventListener('click', () => {
    const isHidden = auxWrap.classList.toggle('hidden');
    auxBtn.textContent = isHidden ? '辅键: 关' : '辅键: 开';
  });
}
const fsBtn = document.getElementById('btn-fullscreen');
if (fsBtn) {
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) { try { const p = exitFs.call(document); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch {} }
    } else {
      requestMobileLandscapeFullscreen();
    }
    scheduleResize();
  });
}
document.getElementById('btn-map').addEventListener('click', openMapModal);
document.getElementById('minimap-strip').addEventListener('click', openMapModal);
document.getElementById('btn-help').addEventListener('click', () => openModal('help'));
document.getElementById('btn-settings').addEventListener('click', () => openModal('settings'));
document.getElementById('btn-close-settings').addEventListener('click', () => {
  saveUserSettings();
  closeModal('settings');
});
document.getElementById('btn-close-smith').addEventListener('click', () => closeModal('smith'));
document.getElementById('btn-music-toggle').addEventListener('click', () => {
  const next = G.settings.musicEnabled === false;
  G.settings.musicEnabled = next;
  audio.setMusicEnabled(next);
  saveUserSettings();
  renderSettingsModal();
});
document.getElementById('btn-haptics-toggle').addEventListener('click', () => {
  G.settings.haptics = !G.settings.haptics;
  saveUserSettings();
  renderSettingsModal();
  if (G.settings.haptics) triggerHaptic('test', 0.7);
});
document.getElementById('btn-test-haptic').addEventListener('click', () => {
  const ok = triggerHaptic('test', 1.0);
  const b = document.getElementById('btn-test-haptic');
  if (b) {
    b.textContent = ok ? '已发送震动!' : '未检测到手柄';
    setTimeout(() => { b.textContent = '测试震动'; }, 1200);
  }
});
document.getElementById('btn-reset-keys').addEventListener('click', () => {
  resetDefaultKeybinds();
  saveUserSettings();
  renderSettingsModal();
});
document.getElementById('btn-mute').addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  document.getElementById('btn-mute').textContent = audio.muted ? '音效: 关' : '音效: 开';
  if (G.gameState !== 'title') saveProgress(false);
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

window.addEventListener('keydown', e => {
  if (isCapturingKey()) return;
  const mapCode = getActionKeyCode('map');
  if ((e.code === 'Tab' || e.code === mapCode) && (G.gameState === 'playing' || G.activeModal === 'map')) {
    e.preventDefault();
    if (!e.repeat) openMapModal();
  } else if (e.code === 'Escape' && G.gameState === 'modal' && G.activeModal) {
    closeModal(G.activeModal);
  } else if (e.code === 'Enter' && G.gameState === 'title') {
    if (readSaveData()) continueSavedGame();
    else startGame();
  }
});

document.addEventListener('visibilitychange', () => {
  audio.setBackgroundDuck(document.hidden);
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
  loadUserSettings();
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
  refreshTitleSaveUI();
  resizeCanvas();
  G.lanterns = createLanterns();
  G.resonancePuzzles = createResonancePuzzles();
  G.crumblePlatforms = createCrumblePlatforms();
  initAmbientMotes();
  renderParchmentMap(HUD_DOM.minimapCanvas, false);
  if (G.isEditorPreview) {
    const pill = document.getElementById('editor-preview-pill');
    if (pill) pill.classList.remove('hidden');
    startGame();
  }
  requestAnimationFrame(gameLoop);
}

bootstrapGame().catch(err => {
  console.error('Failed to load room JSON data:', err);
  window.dispatchEvent(new ErrorEvent('error', { message: err && err.message ? err.message : String(err) }));
});
