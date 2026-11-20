// Entry point: wires cross-module hooks, canvas lifecycle, UI listeners & main gameLoop
window.__ABV_MODULE_LOADED__ = true;
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
import { updateEnemy, updateBoss, updateBoss2, updateBoss3 } from './ai.js';
import { updateWorldEffects, updateCamera, updateAmbientOnly } from './world.js';
import { render } from './renderer.js';
import { readSaveData, saveProgress, loadUserSettings, saveUserSettings } from './save.js';
import { t, setLocale, loadSavedLocale } from './i18n.js';
import {
  HUD_DOM, refreshTitleSaveUI, syncHUD, openModal, closeModal, renderParchmentMap, renderSettingsModal,
  openSmithModal, openLoreModal, openMapModal, openPauseModal, returnToTitle, interactWithAltar, respawnAtActiveAltar,
  startEchoChallenge, advanceEchoRushStage2, advanceEchoRushStage3, showDeath, showVictory,
  startGame, continueSavedGame, continueIntoBellWell,
  openEndingChoice, startEndingCinematic, advanceEndingCinematic, updateAndRenderEndingCinematic
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
  openEndingChoice,
  interactWithAltar,
  openSmithModal,
  openLoreModal,
  openMapModal,
  openPauseModal,
  returnToTitle,
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
  const { mobile } = updateMobileOrientationLayout();
  G.isMobile = !!mobile;
  const root = document.getElementById('game-root');
  const maxDpr = mobile ? 1.25 : (window.innerWidth >= 1440 ? 1.5 : 1.75);
  const dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
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
let lastStaticRenderKey = '';

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
    G.playTimeSec += dt;
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
    audio.updateAmbience(dt, !!curBoss, curBoss ? (curBoss.phase || 1) : 0, inCombat, G.player ? G.player.parryStreak : 0);
    if (G.hitstopTimer > 0) {
      G.hitstopTimer = Math.max(0, G.hitstopTimer - dt);
    } else if (G.player) {
      updatePlayer(dt);
      const px = G.player.x;
      const py = G.player.y;
      for (let i = 0; i < G.enemies.length; i++) {
        const enemy = G.enemies[i];
        if (!enemy || !enemy.alive) continue;
        if (Math.abs(enemy.x - px) > 1350 || Math.abs(enemy.y - py) > 820) continue;
        updateEnemy(enemy, dt);
      }
      updateBoss(G.boss, dt);
      updateBoss2(G.boss2, dt);
      updateBoss3(G.boss3, dt);
      updateWorldEffects(dt);
      updateCamera(dt);
    }
    if (G.saveDirtyTimer > 0) {
      G.saveDirtyTimer -= dt;
      const busyAction = G.player && (G.player.grappleState !== 'none' || G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.attackTimer > 0);
      if (G.saveDirtyTimer <= 0 && !busyAction) saveProgress(false);
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

  if (G.activeModal === 'ending-cinematic') updateAndRenderEndingCinematic(dt);
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
document.getElementById('btn-pause-settings').addEventListener('click', () => openModal('settings'));
document.getElementById('btn-pause-respawn').addEventListener('click', respawnAtActiveAltar);
document.getElementById('btn-pause-title').addEventListener('click', returnToTitle);
const langZh = document.getElementById('btn-lang-zh');
const langEn = document.getElementById('btn-lang-en');
if (langZh) langZh.addEventListener('click', () => {
  setLocale('zh-CN', true);
  renderSettingsModal();
  refreshTitleSaveUI();
  syncHUD(true);
});
if (langEn) langEn.addEventListener('click', () => {
  setLocale('en-US', true);
  renderSettingsModal();
  refreshTitleSaveUI();
  syncHUD(true);
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
const mobilePauseBtn = document.getElementById('btn-pause');
if (mobilePauseBtn) mobilePauseBtn.addEventListener('click', openPauseModal);
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.getAttribute('data-close-modal');
    if (m === 'settings') saveUserSettings();
    closeModal(m);
  });
});
['altar', 'map', 'lore', 'help', 'smith', 'settings', 'pause', 'ending-choice'].forEach(m => {
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
document.getElementById('btn-ending-new-run').addEventListener('click', startGame);

window.addEventListener('keydown', e => {
  if (isCapturingKey()) return;
  const mapCode = getActionKeyCode('map');
  if ((e.code === 'Tab' || e.code === mapCode) && (G.gameState === 'playing' || G.activeModal === 'map')) {
    e.preventDefault();
    if (!e.repeat) openMapModal();
  } else if (e.code === 'Escape' && G.gameState === 'playing' && !e.repeat) {
    openPauseModal();
  } else if (e.code === 'Escape' && G.gameState === 'modal' && G.activeModal && !e.repeat) {
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
