// Art-directed dark hand-drawn Canvas 2D rendering pipeline facade (v32.0 modularized under src/render/)
import { G, getAwakeBoss } from './state.js';
import { prof } from './profiler.js';
import { drawLanternCastShadows, drawVolumetricLanternLights } from './renderLighting.js';
import { rgbStr, drawParallaxBackground, drawForegroundSilhouettes } from './renderParallax.js';
import { drawStampsLayer } from './stampAtlas.js';
import { drawWorldArchitecture } from './renderTerrain.js';
import { isRoomOccluded } from './world.js';
import { drawAchievementBanner, drawBestiaryToast } from './codex.js';
import { isInView, drawContactShadow } from './render/renderShared.js';
import {
  drawWorldBackdrop, drawWeatherRipples, drawRoomOcclusionMasks, drawWallInscriptions,
  drawAltars, drawNpcs, drawShortcutGate, drawChapelExitGate, drawFoundryEntryGate,
  drawFoundryExitGate, drawSkyBridgeGate, drawFirstBellCore, drawPendulums, drawSecretWalls, drawVoidBarriers,
  drawLostEchoes, drawPickups, drawWindZones, drawBouncePads, drawCrumblePlatforms,
  drawResonancePuzzles, drawLoreTablets, drawLanterns, drawGrappleAnchors,
  drawGrappleReticle, drawGrappleThread, drawMistBarrier
} from './render/worldRenderer.js';
import { drawPuppet } from './render/playerRenderer.js';
import { drawEnemy } from './render/enemyRenderer.js';
import { drawFoundryVentGate, drawMirrorAbyssGate, drawBreakableFloors, drawWorldSwitches, drawWindVanes, drawIcePillars, drawSlickWalls, drawSwitchGates } from './render/puzzleRenderer.js';
import { drawFoundryCrucibles, drawCinematicLetterbox, drawZoneCalligraphyBanner } from './render/cinematicRenderer.js';
import { drawTitleIntroOverlay } from './render/titleIntro.js';
import { drawBoss, drawBoss2, drawBoss3, drawBoss4MirrorFloor, drawBoss4, drawBossBanner } from './render/bossRenderer.js';
import { drawArenaHazards } from './render/arenaHazardRenderer.js';
import {
  drawProjectiles, drawTalismans, drawChapelTide, drawGroundWaves, drawSporeClouds,
  drawFrostOverlay, drawBellQuakes, drawDelayedStrikes, drawWeaponUltimates,
  drawSlashes, drawHitMarks, drawImpactBursts, drawShockwaves, drawParticles,
  drawWorldPrompts, drawFloatingTexts, drawWeatherLayer, drawForegroundMotes
} from './render/vfxRenderer.js';

// Pre-baked screen-space Vignette + Paper Grain cache (avoids full-screen radial gradient + tiled pattern overdraw every frame)
let _vigNormalCanvas = null;
let _vigPhase2Canvas = null;
let _vigCacheW = 0;
let _vigCacheH = 0;
function getCachedVignette(isPhase2) {
  const w = Math.max(320, Math.round(G.canvasW * 0.5));
  const h = Math.max(180, Math.round(G.canvasH * 0.5));
  if (!_vigNormalCanvas || _vigCacheW !== w || _vigCacheH !== h) {
    _vigCacheW = w;
    _vigCacheH = h;
    const buildVig = (outerCol) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const vctx = c.getContext('2d');
      const vg = vctx.createRadialGradient(w * 0.5, h * 0.48, w * 0.25, w * 0.5, h * 0.5, w * 0.72);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, outerCol);
      vctx.fillStyle = vg;
      vctx.fillRect(0, 0, w, h);
      if (G.paperPattern && !G.isMobile) {
        vctx.fillStyle = G.paperPattern;
        vctx.fillRect(0, 0, w, h);
      }
      return c;
    };
    _vigNormalCanvas = buildVig('rgba(4, 6, 10, 0.72)');
    _vigPhase2Canvas = buildVig('rgba(20, 4, 8, 0.78)');
  }
  return isPhase2 ? _vigPhase2Canvas : _vigNormalCanvas;
}

export function render() {
  if (G.renderScale) {
    G.ctx.setTransform(G.renderScale, 0, 0, G.renderScale, 0, 0);
  }
  G.ctx.save();

  const activeBoss = getAwakeBoss();
  const isPhase2 = !!(activeBoss && activeBoss.phase >= 2);

  let _t0 = performance.now();
  // 1. Background Sky & 3-Layer Gothic Parallax Ruins
  drawParallaxBackground(isPhase2);

  // 2. Camera Transform + Micro-Zoom Punch + Directional Kick + Screen Shake
  const sx = (Math.random() - 0.5) * G.cam.shake * 2;
  const sy = (Math.random() - 0.5) * G.cam.shake * 2;
  G.ctx.save();
  if (G.cam.zoom !== 1) {
    G.ctx.translate(G.canvasW * 0.5, G.canvasH * 0.5);
    G.ctx.scale(G.cam.zoom, G.cam.zoom);
    G.ctx.translate(-G.canvasW * 0.5, -G.canvasH * 0.5);
  }
  // Sub-pixel smooth translation eliminates 2px/3px stair-step judder on 144Hz monitors!
  const camOriginX = G.cam.x + sx + G.cam.kickX;
  const camOriginY = G.cam.y + sy + G.cam.kickY;
  G.ctx.translate(-camOriginX, -camOriginY);

  // 3. World Backdrop + Procedural Background Ink Stamps + Atmospheric Depth Veil + Lighting + Architecture
  drawWorldBackdrop();
  drawStampsLayer('bg');
  // Subtle atmospheric haze separates background ruins/arches cleanly from foreground terrain & actors
  if (G.themeBlend) {
    G.ctx.fillStyle = rgbStr(G.themeBlend.skyMid, 0.25);
    G.ctx.fillRect(camOriginX - 40, camOriginY - 40, G.canvasW + 80, G.canvasH + 80);
  }
  let _t1 = performance.now();
  prof.addModuleTime('world', _t1 - _t0);

  drawLanternCastShadows(camOriginX, camOriginY);
  let _t2 = performance.now();
  prof.addModuleTime('lighting', _t2 - _t1);

  drawWorldArchitecture();
  drawWeatherRipples();

  // 4. Diegetic Wall Inscriptions, Wind Updrafts, Spore Bounce Caps, Altars, Gates, Crumbling Stones, Puzzles, Pickups & Lore
  drawWallInscriptions();
  drawWindZones();
  drawBouncePads();
  drawBreakableFloors();
  drawCrumblePlatforms();
  drawWorldSwitches();
  drawWindVanes();
  drawIcePillars();
  drawAltars();
  drawNpcs();
  drawShortcutGate();
  drawFirstBellCore();
  drawVoidBarriers();
  drawLostEchoes();
  drawPickups();
  drawResonancePuzzles();
  drawLoreTablets();

  // 5. Hanging Brass Lanterns, Swinging Pendulums & Grapple Bell Anchors
  drawLanterns();
  drawFoundryCrucibles();
  drawPendulums();
  drawGrappleAnchors();

  // 6. Boss Ink Mist Barrier
  if (activeBoss) drawMistBarrier(activeBoss);
  let _t3 = performance.now();
  prof.addModuleTime('world', _t3 - _t2);

  // 7. Afterimages
  for (const a of G.afterimages) {
    G.ctx.save();
    G.ctx.globalAlpha = (a.life / a.maxLife) * 0.45;
    drawPuppet(a.x, a.y, a.facing, true, a.color);
    G.ctx.restore();
  }

  // 8. Contact Grounding Shadows + Enemies & Bosses (2D Frustum + Room Occlusion Culled)
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (!e || !e.alive || isRoomOccluded(e.roomId) || !isInView(e.x, e.y, e.w, e.h, 130)) continue;
    drawContactShadow(e.x + e.w / 2, e.y + e.h, e.kind === 'warden_forest' ? 34 : e.isMiniBoss ? 26 : (e.kind === 'wraith' || e.kind === 'falcon') ? 16 : 22);
    drawEnemy(e);
  }
  if (G.boss && G.boss.alive) {
    drawContactShadow(G.boss.x + G.boss.w / 2, G.boss.y + G.boss.h, 38);
    drawBoss(G.boss);
  }
  if (G.boss2 && G.boss2.alive) {
    drawContactShadow(G.boss2.x + G.boss2.w / 2, G.boss2.y + G.boss2.h, 34);
    drawBoss2(G.boss2);
  }
  if (G.boss3 && G.boss3.alive) {
    drawContactShadow(G.boss3.x + G.boss3.w / 2, G.boss3.y + G.boss3.h, 40);
    drawBoss3(G.boss3);
  }
  if (G.boss4 && G.boss4.alive) {
    drawBoss4MirrorFloor();
    drawBoss4(G.boss4);
  }

  // 9. Grapple Thread & Upgraded Protagonist (including crumbling death animation)
  if (G.player && (G.player.hp > 0 || G.player.deathTimer > 0)) {
    drawContactShadow(G.player.x + G.player.w / 2, G.player.y + G.player.h, 17);
    if (G.player.hp > 0) drawGrappleThread();
    drawPuppet(G.player.x, G.player.y, G.player.facing, false);
  }
  let _t4 = performance.now();
  prof.addModuleTime('entities', _t4 - _t3);

  // 10. Projectiles, Talismans, Chapel Ink Tide, Ground Waves, Slashes, Shockwaves, Particles
  drawProjectiles();
  drawTalismans();
  drawChapelTide();
  drawGroundWaves();
  drawArenaHazards();
  drawSporeClouds();
  drawBellQuakes();
  drawWeaponUltimates();
  drawDelayedStrikes();
  drawSlashes();
  drawHitMarks();
  drawShockwaves();
  drawImpactBursts();
  drawParticles();
  drawStampsLayer('fg');
  // 10.2 Room Occlusion Masks: seal stacked floors & undiscovered secret rooms behind solid abyssal rock
  drawRoomOcclusionMasks();
  // Border gates & breakable secret walls sit on room thresholds, so draw cleanly above the occlusion seam
  drawChapelExitGate();
  drawFoundryEntryGate();
  drawFoundryExitGate();
  drawSkyBridgeGate();
  drawFoundryVentGate();
  drawMirrorAbyssGate();
  drawSwitchGates();
  drawSlickWalls();
  drawSecretWalls();
  let _t5 = performance.now();
  prof.addModuleTime('vfx', _t5 - _t4);

  // 10.5 Real-Time Volumetric Lantern Light Shafts (blocked by stone geometry)
  drawVolumetricLanternLights(camOriginX, camOriginY);
  let _t6 = performance.now();
  prof.addModuleTime('lighting', _t6 - _t5);

  // 11. Grapple Reticle, World Prompts & Floating Calligraphy
  drawGrappleReticle();
  drawWorldPrompts();
  drawFloatingTexts();

  G.ctx.restore(); // End Camera Space

  // 12. Foreground 1.28x Parallax Silhouettes, Procedural Room Weather & Dust
  drawForegroundSilhouettes();
  drawWeatherLayer(isPhase2);
  drawForegroundMotes(isPhase2);

  // 13. Pre-Baked Vignette + Paper Grain Overlay (1 fast blit, 0 per-frame gradient/pattern rebuild)
  const vigImg = getCachedVignette(isPhase2);
  if (vigImg) G.ctx.drawImage(vigImg, 0, 0, G.canvasW, G.canvasH);

  const flashMode = (G.settings && G.settings.flashMode) || 'soft';
  if (G.screenFlash.alpha > 0 && flashMode !== 'off') {
    const rawCol = G.screenFlash.color || '#f59e0b';
    if (flashMode === 'classic') {
      G.ctx.fillStyle = rawCol;
      G.ctx.globalAlpha = Math.min(0.32, G.screenFlash.alpha);
      G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);
      G.ctx.globalAlpha = 1;
    } else {
      // v46.2 Eye-Safe Soft Mode: map glaring near-whites to warm dark amber & render as peripheral edge-glow vignette!
      const isGlareWhite = rawCol === '#fff' || rawCol === '#ffffff' || rawCol === '#fef9c3' || rawCol === '#fef08a';
      const safeCol = isGlareWhite ? '#d97706' : rawCol;
      const cappedA = Math.min(0.11, G.screenFlash.alpha * 0.36);
      if (cappedA > 0.005) {
        const cxF = G.canvasW * 0.5;
        const cyF = G.canvasH * 0.5;
        const rIn = Math.min(G.canvasW, G.canvasH) * 0.34;
        const rOut = Math.hypot(cxF, cyF);
        const fg = G.ctx.createRadialGradient(cxF, cyF, rIn, cxF, cyF, rOut);
        fg.addColorStop(0, 'rgba(0,0,0,0)');
        fg.addColorStop(0.65, 'rgba(0,0,0,0)');
        fg.addColorStop(1, safeCol);
        G.ctx.save();
        G.ctx.globalAlpha = cappedA;
        G.ctx.fillStyle = fg;
        G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);
        G.ctx.restore();
      }
    }
  }

  // v46.2 Eye-Safe Execution & Boss-Kill Impact: Peripheral Ink-Vignette Squeeze + Localized Crimson-Gold Slash Burst!
  if (G.execKillFocus && G.execKillFocus.timer > 0 && flashMode !== 'off') {
    const ef = G.execKillFocus;
    const p = Math.max(0, Math.min(1, ef.timer / Math.max(0.01, ef.maxTimer)));
    const sx = Math.max(40, Math.min(G.canvasW - 40, ef.x - G.cam.x));
    const sy = Math.max(40, Math.min(G.canvasH - 40, ef.y - G.cam.y));
    const outerR = Math.hypot(G.canvasW, G.canvasH) * 0.72;
    const clearR = ef.isBoss ? 148 : 112;
    G.ctx.save();
    // 1) Darken outer ink perimeter momentarily -> high dramatic contrast with LOWER overall screen luminance!
    const sq = G.ctx.createRadialGradient(sx, sy, clearR, sx, sy, outerR);
    sq.addColorStop(0, 'rgba(3, 5, 10, 0)');
    sq.addColorStop(0.55, `rgba(4, 6, 12, ${(0.28 * p).toFixed(3)})`);
    sq.addColorStop(1, `rgba(2, 4, 8, ${(0.54 * p).toFixed(3)})`);
    G.ctx.fillStyle = sq;
    G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);
    // 2) Localized warm crimson-gold radial impact glow strictly around target
    const burstR = (ef.isBoss ? 185 : 138) * (1.18 - 0.25 * p);
    const bg = G.ctx.createRadialGradient(sx, sy, 4, sx, sy, burstR);
    bg.addColorStop(0, ef.isBoss ? `rgba(245, 158, 11, ${(0.34 * p).toFixed(3)})` : `rgba(220, 38, 38, ${(0.36 * p).toFixed(3)})`);
    bg.addColorStop(0.5, `rgba(180, 83, 9, ${(0.16 * p).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    G.ctx.fillStyle = bg;
    G.ctx.beginPath();
    G.ctx.arc(sx, sy, burstR, 0, Math.PI * 2);
    G.ctx.fill();
    // 3) Crisp localized crimson-gold kill slash line across target
    const cutLen = (ef.isBoss ? 155 : 108) * (0.85 + 0.35 * (1 - p));
    G.ctx.strokeStyle = ef.isBoss ? `rgba(251, 191, 36, ${(0.82 * p).toFixed(3)})` : `rgba(248, 113, 113, ${(0.88 * p).toFixed(3)})`;
    G.ctx.lineWidth = Math.max(1.5, (ef.isBoss ? 4.2 : 3.2) * p);
    G.ctx.lineCap = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(sx - cutLen * 0.88, sy + cutLen * 0.34);
    G.ctx.lineTo(sx + cutLen * 0.88, sy - cutLen * 0.34);
    G.ctx.stroke();
    G.ctx.restore();
  }

  // Classic full-screen difference invert preserved ONLY when player explicitly selects Classic flash mode
  if (G.invertTimer > 0 && flashMode === 'classic') {
    G.ctx.globalCompositeOperation = 'difference';
    G.ctx.fillStyle = '#f5f2ea';
    G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);
    G.ctx.globalCompositeOperation = 'source-over';
  }

  drawFrostOverlay();
  drawCinematicLetterbox();
  drawZoneCalligraphyBanner();
  drawBossBanner();
  drawAchievementBanner();
  drawBestiaryToast();
  drawTitleIntroOverlay();
  prof.addModuleTime('vfx', performance.now() - _t6);

  G.ctx.restore();
}
