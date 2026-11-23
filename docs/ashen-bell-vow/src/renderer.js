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

  if (G.screenFlash.alpha > 0) {
    G.ctx.fillStyle = G.screenFlash.color;
    G.ctx.globalAlpha = G.screenFlash.alpha;
    G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);
    G.ctx.globalAlpha = 1;
  }

  // Lightweight GPU-friendly execution inversion flash (replaces slow full-screen ctx.filter)
  if (G.invertTimer > 0) {
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
