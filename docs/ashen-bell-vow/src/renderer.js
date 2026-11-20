// Art-directed dark hand-drawn Canvas 2D rendering pipeline
import {
  COLORS, SOLIDS, ALTARS, NPCS, ALTAR_POS, LORE_TABLETS,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS,
  PENDULUMS, VOID_BARRIERS, ABYSSAL_RIVERS, WALL_INSCRIPTIONS, GRAPPLE_ANCHORS,
  PUDDLES, BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS, WORLD_W, FLOOR_Y, WELL_BOTTOM_Y
} from './config.js';
import { G, getAwakeBoss, getRelicStats } from './state.js';
import { getControlLabels, getActionKeyLabel } from './input.js';
import {
  drawGlowSprite, boilLine, boilLinePath, boilCircle, boilRectOutline, drawTaperedCrescent, drawCloakMesh, solve2BoneIK
} from './vfx.js';

import { drawLanternCastShadows, drawVolumetricLanternLights } from './renderLighting.js';
import { getGroundSurfaceY } from './physics.js';
import { isPickupUnlocked } from './combat.js';

function rgbStr(arr, alpha = 1) {
  const r = Math.round(arr[0]);
  const g = Math.round(arr[1]);
  const b = Math.round(arr[2]);
  return alpha >= 0.999 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

function isInView(x, y, w, h, pad = 100) {
  return x + w >= G.cam.x - pad && x <= G.cam.x + G.canvasW + pad &&
         y + h >= G.cam.y - pad && y <= G.cam.y + G.canvasH + pad;
}

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
  G.ctx.save();

  const activeBoss = getAwakeBoss();
  const isPhase2 = !!(activeBoss && activeBoss.phase >= 2);

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
  const camOriginX = Math.round(G.cam.x + sx + G.cam.kickX);
  const camOriginY = Math.round(G.cam.y + sy + G.cam.kickY);
  G.ctx.translate(-camOriginX, -camOriginY);

  // 3. World Backdrop + Real-Time 2D Lantern Hard Shadows + Collidable Architecture
  drawWorldBackdrop();
  drawLanternCastShadows(camOriginX, camOriginY);
  drawWorldArchitecture();
  drawWeatherRipples();

  // 4. Diegetic Wall Inscriptions, Altars, Gates, Crumbling Stones, Puzzles, Pickups & Lore
  drawWallInscriptions();
  drawCrumblePlatforms();
  drawAltars();
  drawNpcs();
  drawShortcutGate();
  drawChapelExitGate();
  drawFoundryEntryGate();
  drawFoundryExitGate();
  drawFirstBellCore();
  drawSecretWalls();
  drawVoidBarriers();
  drawLostEchoes();
  drawPickups();
  drawResonancePuzzles();
  drawLoreTablets();

  // 5. Hanging Brass Lanterns, Swinging Pendulums & Grapple Bell Anchors
  drawLanterns();
  drawPendulums();
  drawGrappleAnchors();

  // 6. Boss Ink Mist Barrier
  if (activeBoss) drawMistBarrier(activeBoss);

  // 7. Afterimages
  for (const a of G.afterimages) {
    G.ctx.save();
    G.ctx.globalAlpha = (a.life / a.maxLife) * 0.45;
    drawPuppet(a.x, a.y, a.facing, true, a.color);
    G.ctx.restore();
  }

  // 8. Contact Grounding Shadows + Enemies & Bosses (2D Frustum Culled)
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (!e || !e.alive || !isInView(e.x, e.y, e.w, e.h, 130)) continue;
    drawContactShadow(e.x + e.w / 2, e.y + e.h, e.kind === 'wraith' ? 18 : 22);
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

  // 9. Grapple Thread & Upgraded Protagonist (including crumbling death animation)
  if (G.player && (G.player.hp > 0 || G.player.deathTimer > 0)) {
    drawContactShadow(G.player.x + G.player.w / 2, G.player.y + G.player.h, 17);
    if (G.player.hp > 0) drawGrappleThread();
    drawPuppet(G.player.x, G.player.y, G.player.facing, false);
  }

  // 10. Projectiles, Talismans, Chapel Ink Tide, Ground Waves, Slashes, Shockwaves, Particles
  drawProjectiles();
  drawTalismans();
  drawChapelTide();
  drawGroundWaves();
  drawBellQuakes();
  drawSlashes();
  drawHitMarks();
  drawShockwaves();
  drawImpactBursts();
  drawParticles();

  // 10.5 Real-Time Volumetric Lantern Light Shafts (blocked by stone geometry)
  drawVolumetricLanternLights(camOriginX, camOriginY);

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

  drawBossBanner();

  G.ctx.restore();
}

function drawParallaxBackground(isPhase2) {
  const tb = G.themeBlend;
  const depthPct = Math.max(0, Math.min(1, (G.cam.y - 140) / 560));
  const bg = G.ctx.createLinearGradient(0, 0, 0, G.canvasH);
  bg.addColorStop(0, rgbStr(tb.skyTop));
  bg.addColorStop(0.55, rgbStr(tb.skyMid));
  bg.addColorStop(1, rgbStr(tb.skyBot));
  G.ctx.fillStyle = bg;
  G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);

  // Theme-tinted atmospheric upper wash
  const wash = G.ctx.createRadialGradient(G.canvasW * 0.5, G.canvasH * 0.18, 20, G.canvasW * 0.5, G.canvasH * 0.4, G.canvasW * 0.65);
  wash.addColorStop(0, rgbStr(tb.accent, isPhase2 ? 0.14 : 0.08));
  wash.addColorStop(1, 'transparent');
  G.ctx.fillStyle = wash;
  G.ctx.fillRect(0, 0, G.canvasW, G.canvasH);

  // Pale Cold Moon (fades smoothly as player descends deep into the Sunken Bell Well)
  const moonX = G.canvasW * 0.72 - G.cam.x * 0.04;
  const moonY = G.canvasH * 0.22 - G.cam.y * 0.18;
  if (depthPct < 0.9) {
    G.ctx.save();
    G.ctx.globalAlpha = 1 - depthPct;
    const mg = G.ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 155);
    mg.addColorStop(0, isPhase2 ? 'rgba(220, 38, 38, 0.28)' : rgbStr(tb.accent, 0.20));
    mg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = mg;
    G.ctx.beginPath(); G.ctx.arc(moonX, moonY, 155, 0, Math.PI * 2); G.ctx.fill();

    G.ctx.fillStyle = isPhase2 ? 'rgba(248, 113, 113, 0.48)' : 'rgba(226, 220, 202, 0.42)';
    boilCircle(G.ctx, moonX, moonY, 34, 90, 0.8, 18);
    G.ctx.fill();
    G.ctx.restore();
  }

  // Far Layer (0.14x): Giant Broken Bronze Bell Silhouette & Distant Spires
  G.ctx.save();
  const farX = -G.cam.x * 0.14;
  G.ctx.fillStyle = '#0c121e';
  for (let i = 0; i < 8; i++) {
    const bx = i * 320 + farX;
    G.ctx.beginPath();
    G.ctx.moveTo(bx, G.canvasH);
    G.ctx.lineTo(bx + 28, 170 + (i % 3) * 45);
    G.ctx.lineTo(bx + 56, G.canvasH);
    G.ctx.closePath();
    G.ctx.fill();
  }
  // Colossal cracked bell hanging in the far abyss
  const bellX = 560 + farX;
  G.ctx.fillStyle = '#0a0e16';
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.12)';
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(bellX - 45, 0);
  G.ctx.lineTo(bellX + 45, 0);
  G.ctx.quadraticCurveTo(bellX + 115, 220, bellX + 150, 340);
  G.ctx.lineTo(bellX - 150, 340);
  G.ctx.quadraticCurveTo(bellX - 115, 220, bellX - 45, 0);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  // Glowing crack inside giant bell
  G.ctx.strokeStyle = isPhase2 ? 'rgba(248, 113, 113, 0.45)' : 'rgba(245, 158, 11, 0.25)';
  G.ctx.beginPath();
  G.ctx.moveTo(bellX + 12, 95);
  G.ctx.lineTo(bellX - 16, 175);
  G.ctx.lineTo(bellX + 8, 250);
  G.ctx.lineTo(bellX - 12, 336);
  G.ctx.stroke();
  G.ctx.restore();

  // Mid Layer (0.36x): Gothic Ruined Arches
  G.ctx.save();
  const midX = -G.cam.x * 0.36;
  G.ctx.fillStyle = '#0d1320';
  for (let i = 0; i < 12; i++) {
    const ax = i * 240 + midX;
    G.ctx.fillRect(ax, 120, 26, G.canvasH);
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.08)';
    G.ctx.lineWidth = 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(ax + 26, 210);
    G.ctx.quadraticCurveTo(ax + 120, 85, ax + 240, 210);
    G.ctx.stroke();
  }
  G.ctx.restore();
}

function drawWorldBackdrop() {
  G.ctx.save();

  // A. Zone 1 Sanctuary Arch Canopy behind Extinguished Altar
  if (G.cam.x < 760) {
    const ax = ALTAR_POS.x;
    G.ctx.fillStyle = '#0e1420';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.24)';
    G.ctx.lineWidth = 2;
    G.ctx.beginPath();
    G.ctx.moveTo(ax - 95, FLOOR_Y);
    G.ctx.lineTo(ax - 95, 295);
    G.ctx.quadraticCurveTo(ax, 180, ax + 95, 295);
    G.ctx.lineTo(ax + 95, FLOOR_Y);
    G.ctx.lineTo(ax + 70, FLOOR_Y);
    G.ctx.lineTo(ax + 70, 315);
    G.ctx.quadraticCurveTo(ax, 220, ax - 70, 315);
    G.ctx.lineTo(ax - 70, FLOOR_Y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.26)';
    G.ctx.lineWidth = 1.4;
    boilCircle(G.ctx, ax, 250, 22, 210, 0.9, 14);
    G.ctx.stroke();
  }

  // B. Gothic Lancet Windows & Angled Moonbeams
  const lancets = [1080, 1460, 1840, 2220, 2790, 3610];
  for (const wx of lancets) {
    if (wx < G.cam.x - 160 || wx > G.cam.x + G.canvasW + 160) continue;
    const wGrad = G.ctx.createLinearGradient(wx, 140, wx, FLOOR_Y - 90);
    wGrad.addColorStop(0, 'rgba(34, 48, 72, 0.45)');
    wGrad.addColorStop(1, 'rgba(13, 18, 28, 0.12)');
    G.ctx.fillStyle = wGrad;
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.20)';
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    G.ctx.moveTo(wx - 44, FLOOR_Y - 90);
    G.ctx.lineTo(wx - 44, 240);
    G.ctx.quadraticCurveTo(wx, 138, wx + 44, 240);
    G.ctx.lineTo(wx + 44, FLOOR_Y - 90);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.13)';
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(wx, 180); G.ctx.lineTo(wx, FLOOR_Y - 90);
    G.ctx.moveTo(wx - 44, 320); G.ctx.lineTo(wx + 44, 320);
    G.ctx.moveTo(wx - 44, 405); G.ctx.lineTo(wx + 44, 405);
    G.ctx.stroke();

    const beam = G.ctx.createLinearGradient(wx, 210, wx - 70, FLOOR_Y);
    beam.addColorStop(0, 'rgba(180, 215, 240, 0.05)');
    beam.addColorStop(1, 'transparent');
    G.ctx.fillStyle = beam;
    G.ctx.beginPath();
    G.ctx.moveTo(wx - 36, 230);
    G.ctx.lineTo(wx + 36, 230);
    G.ctx.lineTo(wx - 35, FLOOR_Y);
    G.ctx.lineTo(wx - 120, FLOOR_Y);
    G.ctx.closePath();
    G.ctx.fill();
  }

  // Grand Ruined Rose Window in Boss Chapel
  if (G.cam.x + G.canvasW > 2920) {
    const rx = 3200, ry = 255;
    const isP2 = G.boss && G.boss.awake && G.boss.phase === 2;
    const rg = G.ctx.createRadialGradient(rx, ry, 18, rx, ry, 145);
    rg.addColorStop(0, isP2 ? 'rgba(239, 68, 68, 0.24)' : 'rgba(180, 210, 240, 0.18)');
    rg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = rg;
    G.ctx.beginPath(); G.ctx.arc(rx, ry, 145, 0, Math.PI * 2); G.ctx.fill();

    G.ctx.strokeStyle = isP2 ? 'rgba(239, 68, 68, 0.34)' : 'rgba(216, 207, 184, 0.24)';
    G.ctx.lineWidth = 2.4;
    boilCircle(G.ctx, rx, ry, 118, 3200, 1.4, 28);
    G.ctx.stroke();
    boilCircle(G.ctx, rx, ry, 62, 3210, 1.1, 20);
    G.ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      G.ctx.beginPath();
      G.ctx.moveTo(rx + Math.cos(ang) * 20, ry + Math.sin(ang) * 20);
      G.ctx.lineTo(rx + Math.cos(ang) * 118, ry + Math.sin(ang) * 118);
      G.ctx.stroke();
    }
    // Shattered bronze bell fragments on floor
    G.ctx.fillStyle = '#1b1815';
    G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    G.ctx.moveTo(3110, FLOOR_Y);
    G.ctx.lineTo(3145, FLOOR_Y - 36);
    G.ctx.lineTo(3185, FLOOR_Y - 18);
    G.ctx.lineTo(3210, FLOOR_Y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
  }

  // Grand Abyssal Bell-Casting Furnace inside Zone 5 Foundry
  if (G.cam.x + G.canvasW > 5540 && G.cam.y + G.canvasH > 800) {
    const fx = 6140;
    const fy = 1125;
    const isJiP2 = G.boss2 && G.boss2.awake && G.boss2.phase === 2;
    const fg = G.ctx.createRadialGradient(fx, fy, 20, fx, fy, 240);
    fg.addColorStop(0, isJiP2 ? 'rgba(245, 158, 11, 0.34)' : 'rgba(245, 158, 11, 0.20)');
    fg.addColorStop(0.55, isJiP2 ? 'rgba(220, 38, 38, 0.16)' : 'rgba(56, 189, 248, 0.08)');
    fg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = fg;
    G.ctx.beginPath(); G.ctx.arc(fx, fy, 240, 0, Math.PI * 2); G.ctx.fill();

    // Towering Bronze Casting Archway
    G.ctx.fillStyle = '#0f131d';
    G.ctx.strokeStyle = isJiP2 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(216, 207, 184, 0.22)';
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath();
    G.ctx.moveTo(fx - 170, WELL_BOTTOM_Y);
    G.ctx.lineTo(fx - 170, 960);
    G.ctx.quadraticCurveTo(fx, 815, fx + 170, 960);
    G.ctx.lineTo(fx + 170, WELL_BOTTOM_Y);
    G.ctx.lineTo(fx + 132, WELL_BOTTOM_Y);
    G.ctx.lineTo(fx + 132, 990);
    G.ctx.quadraticCurveTo(fx, 870, fx - 132, 990);
    G.ctx.lineTo(fx - 132, WELL_BOTTOM_Y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    // Suspended Cracked Giant Bell Mold in Background
    G.ctx.fillStyle = '#191410';
    G.ctx.strokeStyle = isJiP2 ? 'rgba(253, 224, 71, 0.55)' : 'rgba(245, 158, 11, 0.34)';
    G.ctx.lineWidth = 2.2;
    G.ctx.beginPath();
    G.ctx.moveTo(fx - 42, 955);
    G.ctx.lineTo(fx + 42, 955);
    G.ctx.quadraticCurveTo(fx + 90, 1085, fx + 114, 1190);
    G.ctx.lineTo(fx - 114, 1190);
    G.ctx.quadraticCurveTo(fx - 90, 1085, fx - 42, 955);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    // Glowing molten rune fissure in background bell
    G.ctx.strokeStyle = isJiP2 ? COLORS.goldBright : 'rgba(245, 158, 11, 0.52)';
    G.ctx.lineWidth = 2;
    G.ctx.beginPath();
    G.ctx.moveTo(fx - 10, 995); G.ctx.lineTo(fx + 14, 1065); G.ctx.lineTo(fx - 8, 1125); G.ctx.lineTo(fx + 12, 1185);
    G.ctx.stroke();
    // Molten bronze crucible trough
    const meltG = G.ctx.createLinearGradient(0, WELL_BOTTOM_Y - 14, 0, WELL_BOTTOM_Y);
    meltG.addColorStop(0, isJiP2 ? 'rgba(253, 224, 71, 0.55)' : 'rgba(245, 158, 11, 0.32)');
    meltG.addColorStop(1, 'transparent');
    G.ctx.fillStyle = meltG;
    G.ctx.fillRect(fx - 120, WELL_BOTTOM_Y - 14, 240, 14);
  }

  // Grand Primeval First Bell Monument inside Room 8 (初钟圣心)
  if (G.cam.x + G.canvasW > 8340 && G.cam.y < 720) {
    const hx = 9000;
    const hy = 250;
    const b3Phase = (G.boss3 && G.boss3.awake && G.boss3.alive) ? G.boss3.phase : 0;
    const defeated = !!(G.worldState && G.worldState.boss3Defeated);
    const haloCol = b3Phase === 3 || defeated ? 'rgba(254, 240, 138, 0.36)' : b3Phase === 2 ? 'rgba(192, 132, 252, 0.28)' : 'rgba(245, 158, 11, 0.22)';
    const hg = G.ctx.createRadialGradient(hx, hy, 24, hx, hy, 290);
    hg.addColorStop(0, haloCol);
    hg.addColorStop(0.55, b3Phase === 3 ? 'rgba(220, 38, 38, 0.16)' : 'rgba(15, 23, 42, 0.08)');
    hg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = hg;
    G.ctx.beginPath(); G.ctx.arc(hx, hy, 290, 0, Math.PI * 2); G.ctx.fill();

    // Concentric Astral Bell Rings behind Primeval Bell
    G.ctx.strokeStyle = b3Phase >= 3 || defeated ? 'rgba(253, 224, 71, 0.42)' : 'rgba(216, 207, 184, 0.22)';
    G.ctx.lineWidth = 2.2;
    boilCircle(G.ctx, hx, hy, 185, 8900, 1.8, 32); G.ctx.stroke();
    boilCircle(G.ctx, hx, hy, 138, 8910, 1.3, 24); G.ctx.stroke();

    // Colossal Hanging Primeval Bronze Bell
    const bellSway = Math.sin(G.globalTime * (b3Phase === 3 ? 3.2 : 1.1)) * (b3Phase >= 2 ? 0.045 : 0.015);
    G.ctx.save();
    G.ctx.translate(hx, 10);
    G.ctx.rotate(bellSway);
    G.ctx.fillStyle = '#151118';
    G.ctx.strokeStyle = b3Phase >= 3 || defeated ? COLORS.goldBright : 'rgba(245, 158, 11, 0.45)';
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath();
    G.ctx.moveTo(-58, 0); G.ctx.lineTo(58, 0);
    G.ctx.quadraticCurveTo(132, 190, 174, 345);
    G.ctx.lineTo(-174, 345);
    G.ctx.quadraticCurveTo(-132, 190, -58, 0);
    G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
    // Luminous Fracture Fissures widening across Phases 1 -> 3
    G.ctx.strokeStyle = b3Phase === 3 || defeated ? '#fef9c3' : b3Phase === 2 ? COLORS.violetBright : COLORS.gold;
    G.ctx.lineWidth = b3Phase === 3 || defeated ? 3.8 : 2.2;
    G.ctx.beginPath();
    G.ctx.moveTo(0, 62); G.ctx.lineTo(-22, 152); G.ctx.lineTo(18, 228); G.ctx.lineTo(-12, 340);
    if (b3Phase >= 2 || defeated) {
      G.ctx.moveTo(-22, 152); G.ctx.lineTo(-76, 212);
      G.ctx.moveTo(18, 228); G.ctx.lineTo(84, 286);
    }
    G.ctx.stroke();
    G.ctx.restore();
  }

  // C. Swaying Tattered Cathedral Banners
  BANNERS.forEach((bn, idx) => {
    if (!isInView(bn.x - 24, bn.y, 48, bn.len + 12, 80)) return;
    const sway = Math.sin(G.globalTime * 1.9 + idx * 1.3) * 9;
    G.ctx.fillStyle = bn.color;
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.28)';
    G.ctx.lineWidth = 1.4;
    G.ctx.beginPath();
    G.ctx.moveTo(bn.x - 16, bn.y);
    G.ctx.lineTo(bn.x + 16, bn.y);
    G.ctx.quadraticCurveTo(bn.x + 16 + sway * 0.5, bn.y + bn.len * 0.55, bn.x + 12 + sway, bn.y + bn.len);
    G.ctx.lineTo(bn.x + 2 + sway * 0.85, bn.y + bn.len - 22);
    G.ctx.lineTo(bn.x - 12 + sway, bn.y + bn.len - 5);
    G.ctx.quadraticCurveTo(bn.x - 16 + sway * 0.5, bn.y + bn.len * 0.55, bn.x - 16, bn.y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
    G.ctx.beginPath();
    G.ctx.moveTo(bn.x - 21, bn.y);
    G.ctx.lineTo(bn.x + 21, bn.y);
    G.ctx.stroke();
  });

  // D. Weathered Tombstones
  const graves = [460, 960, 1180, 1410, 2090, 2290, 2490];
  graves.forEach((gx, idx) => {
    if (gx < G.cam.x - 60 || gx > G.cam.x + G.canvasW + 60) return;
    const h = 38 + (idx % 3) * 16;
    G.ctx.save();
    G.ctx.translate(gx, FLOOR_Y);
    G.ctx.rotate((idx % 2 === 0 ? 1 : -1) * 0.08);
    G.ctx.fillStyle = '#151c29';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.34)';
    G.ctx.lineWidth = 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(-9, 0);
    G.ctx.lineTo(-8, -h + 8);
    G.ctx.quadraticCurveTo(0, -h - 4, 8, -h + 8);
    G.ctx.lineTo(9, 0);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    if (idx % 2 === 0) {
      G.ctx.beginPath();
      G.ctx.moveTo(0, -h + 12); G.ctx.lineTo(0, -h + 26);
      G.ctx.moveTo(-5, -h + 17); G.ctx.lineTo(5, -h + 17);
      G.ctx.stroke();
    }
    G.ctx.restore();
  });

  // E. Bone Cairns
  BONE_CAIRNS.forEach(bx => {
    if (bx < G.cam.x - 60 || bx > G.cam.x + G.canvasW + 60) return;
    G.ctx.fillStyle = '#202634';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.38)';
    G.ctx.lineWidth = 1.2;
    for (let k = -1; k <= 1; k++) {
      G.ctx.beginPath();
      G.ctx.arc(bx + k * 7, FLOOR_Y - 5 - (k === 0 ? 4 : 0), 5.5, 0, Math.PI * 2);
      G.ctx.fill();
      G.ctx.stroke();
    }
    G.ctx.fillStyle = '#090c12';
    G.ctx.fillRect(bx - 2.5, FLOOR_Y - 10, 2, 2);
    G.ctx.fillRect(bx + 1, FLOOR_Y - 10, 2, 2);
  });

  // F. Flickering Wax Candle Clusters
  CANDLE_CLUSTERS.forEach((cl, idx) => {
    if (!isInView(cl.x - 48, cl.y - 64, 96, 70, 80)) return;
    drawGlowSprite('gold', cl.x, cl.y - 16, 46, 0.24);
    for (let i = 0; i < cl.count; i++) {
      const cx = cl.x + (i - (cl.count - 1) / 2) * 8;
      const ch = 10 + ((idx + i * 3) % 3) * 5;
      G.ctx.fillStyle = '#cfc5ae';
      G.ctx.fillRect(cx - 2, cl.y - ch, 4, ch);
      const fl = Math.sin(G.globalTime * 15 + i * 2.1 + idx) * 1.6;
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.beginPath();
      G.ctx.ellipse(cx + fl * 0.3, cl.y - ch - 4, 2, 4 + fl * 0.4, 0, 0, Math.PI * 2);
      G.ctx.fill();
    }
  });

  G.ctx.restore();
}

function drawWorldArchitecture() {
  G.ctx.save();
  // G. Collidable Stone Architecture (2D Frustum Culled + Batched Stroke Paths)
  SOLIDS.forEach((s, idx) => {
    if (!isInView(s.x, s.y, s.w, s.h, 90)) return;
    if (s.type === 'ground') {
      const g = G.ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(220, s.h));
      g.addColorStop(0, s.y > 900 ? '#162130' : '#1c2434');
      g.addColorStop(0.18, '#131926');
      g.addColorStop(0.55, '#0b0f17');
      g.addColorStop(1, '#06080d');
      G.ctx.fillStyle = g;
      G.ctx.fillRect(s.x, s.y, s.w, s.h);

      // Exposed vertical shaft walls on carved ground edges
      if ((s.x > 0 && !s.seamLeft) || (s.x + s.w < WORLD_W && !s.seamRight)) {
        G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.34)';
        G.ctx.lineWidth = 1.8;
        G.ctx.beginPath();
        if (s.x > 0 && !s.seamLeft) boilLinePath(G.ctx, s.x, s.y, s.x, s.y + s.h, 600 + idx * 17, 1.2, 5);
        if (s.x + s.w < WORLD_W && !s.seamRight) boilLinePath(G.ctx, s.x + s.w, s.y, s.x + s.w, s.y + s.h, 650 + idx * 17, 1.2, 5);
        G.ctx.stroke();
      }

      const startX = Math.max(s.x, Math.floor(G.cam.x / 64) * 64 - 64);
      const endX = Math.min(s.x + s.w, G.cam.x + G.canvasW + 128);
      // Pass 1: Alternating stone slabs
      for (let bx = startX; bx < endX; bx += 64) {
        const segW = Math.min(64, s.x + s.w - bx);
        if (segW < 4) break;
        G.ctx.fillStyle = (Math.floor(bx / 64)) % 2 === 0 ? 'rgba(216, 207, 184, 0.045)' : 'rgba(10, 14, 22, 0.14)';
        G.ctx.fillRect(bx + 2, s.y + 2, Math.max(2, segW - 4), 18);
      }
      // Pass 2: Batched top-edge hand-drawn boil line (1 stroke total!)
      G.ctx.strokeStyle = s.y > 900 ? 'rgba(125, 211, 252, 0.38)' : 'rgba(216, 207, 184, 0.52)';
      G.ctx.lineWidth = 2.2;
      G.ctx.beginPath();
      for (let bx = startX; bx < endX; bx += 64) {
        const segW = Math.min(64, s.x + s.w - bx);
        if (segW < 4) break;
        boilLinePath(G.ctx, bx, s.y + 1, bx + segW, s.y + 1, 500 + bx + s.y, 1.25, 2);
      }
      G.ctx.stroke();
      // Pass 3: Batched stone seams & joints (1 stroke total!)
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.14)';
      G.ctx.lineWidth = 1.1;
      G.ctx.beginPath();
      for (let bx = startX; bx < endX; bx += 64) {
        const segW = Math.min(64, s.x + s.w - bx);
        if (segW < 4) break;
        G.ctx.moveTo(bx, s.y + 21); G.ctx.lineTo(bx + segW, s.y + 21);
        G.ctx.moveTo(bx, s.y + 2); G.ctx.lineTo(bx, s.y + 21);
      }
      G.ctx.stroke();
      // Pass 4: Batched swaying grass blades (1 stroke total!)
      if (s.y === FLOOR_Y) {
        G.ctx.strokeStyle = 'rgba(130, 150, 138, 0.42)';
        G.ctx.lineWidth = 1.3;
        G.ctx.beginPath();
        for (let bx = startX; bx < endX; bx += 64) {
          const segW = Math.min(64, s.x + s.w - bx);
          if (segW >= 32 && (Math.floor(bx / 64)) % 3 === 1) {
            const sway = Math.sin(G.globalTime * 2.5 + bx) * 2.5;
            G.ctx.moveTo(bx + 12, s.y);
            G.ctx.quadraticCurveTo(bx + 9 + sway, s.y - 8, bx + 6 + sway, s.y - 13);
            G.ctx.moveTo(bx + 14, s.y);
            G.ctx.quadraticCurveTo(bx + 17 + sway, s.y - 6, bx + 20 + sway, s.y - 10);
          }
        }
        G.ctx.stroke();
      }

      // Moonlit Puddles (upper corridor floor only)
      if (s.y === FLOOR_Y) for (const p of PUDDLES) {
        if (p.x < s.x || p.x + p.w > s.x + s.w) continue;
        if (p.x + p.w < G.cam.x - 40 || p.x > G.cam.x + G.canvasW + 40) continue;
        const pg = G.ctx.createLinearGradient(p.x, s.y, p.x + p.w, s.y);
        pg.addColorStop(0, 'transparent');
        pg.addColorStop(0.5, 'rgba(125, 211, 252, 0.28)');
        pg.addColorStop(1, 'transparent');
        G.ctx.fillStyle = pg;
        G.ctx.fillRect(p.x, s.y - 1, p.w, 4.5);
        G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
        G.ctx.lineWidth = 1;
        const rip = Math.sin(G.globalTime * 3 + p.x) * 6;
        G.ctx.beginPath();
        G.ctx.moveTo(p.x + p.w * 0.25 + rip, s.y + 1);
        G.ctx.lineTo(p.x + p.w * 0.55 + rip, s.y + 1);
        G.ctx.stroke();
      }
    } else if (s.type === 'pillar') {
      G.ctx.fillStyle = '#171f2e';
      G.ctx.fillRect(s.x, s.y, s.w, s.h);
      G.ctx.fillStyle = '#202a3d';
      G.ctx.fillRect(s.x - 5, s.y, s.w + 10, 14);
      G.ctx.fillRect(s.x - 5, s.y + s.h - 14, s.w + 10, 14);

      G.ctx.strokeStyle = 'rgba(9, 12, 18, 0.65)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      for (let fx = s.x + 10; fx < s.x + s.w - 6; fx += 12) {
        G.ctx.moveTo(fx, s.y + 16);
        G.ctx.lineTo(fx, s.y + s.h - 16);
      }
      G.ctx.stroke();
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.44)';
      G.ctx.lineWidth = 1.9;
      boilRectOutline(G.ctx, s.x, s.y, s.w, s.h, 1200 + idx * 97, 1.3);
      boilRectOutline(G.ctx, s.x - 5, s.y, s.w + 10, 14, 1240 + idx * 31, 1.0);
    } else {
      // Floating Stone Ledge with Jagged Strata, Batched Hatch Shading & Batched Vines
      G.ctx.fillStyle = '#1d2638';
      G.ctx.beginPath();
      G.ctx.moveTo(s.x, s.y);
      G.ctx.lineTo(s.x + s.w, s.y);
      G.ctx.lineTo(s.x + s.w - 4, s.y + s.h);
      const steps = Math.max(3, Math.floor(s.w / 32));
      for (let k = steps - 1; k >= 1; k--) {
        const jx = s.x + (s.w * k) / steps;
        const jy = s.y + s.h + (k % 2 === 0 ? 7 : 1);
        G.ctx.lineTo(jx, jy);
      }
      G.ctx.lineTo(s.x + 4, s.y + s.h);
      G.ctx.closePath();
      G.ctx.fill();

      G.ctx.fillStyle = 'rgba(216, 207, 184, 0.1)';
      G.ctx.fillRect(s.x + 2, s.y + 1, s.w - 4, 5);

      G.ctx.strokeStyle = 'rgba(9, 12, 18, 0.58)';
      G.ctx.lineWidth = 1.2;
      G.ctx.beginPath();
      for (let hx = s.x + 10; hx < s.x + s.w - 6; hx += 13) {
        G.ctx.moveTo(hx, s.y + 6);
        G.ctx.lineTo(hx - 6, s.y + s.h - 1);
      }
      G.ctx.stroke();

      G.ctx.strokeStyle = 'rgba(120, 145, 138, 0.46)';
      G.ctx.lineWidth = 1.3;
      G.ctx.beginPath();
      for (let vx = s.x + 18; vx < s.x + s.w - 14; vx += 46) {
        const vLen = 18 + ((vx + idx * 17) % 24);
        const vSway = Math.sin(G.globalTime * 2.2 + vx * 0.05) * 5;
        G.ctx.moveTo(vx, s.y + s.h + 2);
        G.ctx.quadraticCurveTo(vx + vSway * 0.5, s.y + s.h + vLen * 0.5, vx + vSway, s.y + s.h + vLen);
      }
      G.ctx.stroke();

      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.58)';
      G.ctx.lineWidth = 2;
      G.ctx.beginPath();
      boilLinePath(G.ctx, s.x, s.y, s.x + s.w, s.y, 1200 + idx * 97, 1.3, Math.max(3, Math.round(s.w / 42)));
      boilLinePath(G.ctx, s.x, s.y, s.x + 4, s.y + s.h, 1220 + idx * 97, 1.1, 2);
      boilLinePath(G.ctx, s.x + s.w, s.y, s.x + s.w - 4, s.y + s.h, 1240 + idx * 97, 1.1, 2);
      G.ctx.stroke();
    }
  });

  // Abyssal Ink Rivers Shimmer (data-driven across all rooms)
  for (const rv of ABYSSAL_RIVERS) {
    if (rv.w <= 0 || !isInView(rv.x, rv.y - 20, rv.w, 60, 40)) continue;
    const rg = G.ctx.createLinearGradient(0, rv.y - 10, 0, rv.y + 26);
    rg.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
    rg.addColorStop(0.5, 'rgba(12, 74, 110, 0.55)');
    rg.addColorStop(1, 'rgba(5, 8, 14, 0.85)');
    G.ctx.fillStyle = rg;
    G.ctx.fillRect(rv.x, rv.y, rv.w, 16);
    G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.58)';
    G.ctx.lineWidth = 1.6;
    for (let rx = rv.x + 12; rx < rv.x + rv.w - 30; rx += 84) {
      const wave = Math.sin(G.globalTime * 3.2 + rx * 0.03) * 8;
      G.ctx.beginPath();
      G.ctx.moveTo(rx + wave, rv.y + 3);
      G.ctx.lineTo(rx + 42 + wave, rv.y + 3);
      G.ctx.stroke();
      // Subtle rising corrosive ink bubbles
      const bubP = ((G.globalTime * 0.9 + rx * 0.017) % 1);
      const bx = rx + 20 + Math.sin(G.globalTime * 4 + rx) * 6;
      const by = rv.y + 2 - bubP * 20;
      G.ctx.fillStyle = `rgba(125, 211, 252, ${((1 - bubP) * 0.55).toFixed(2)})`;
      G.ctx.beginPath();
      G.ctx.arc(bx, by, 2.4 * (1 - bubP * 0.5), 0, Math.PI * 2);
      G.ctx.fill();
    }
  }

  // Low Creeping Theme-Tinted Ink Mist
  const mistG = G.ctx.createLinearGradient(0, FLOOR_Y - 52, 0, FLOOR_Y + 8);
  mistG.addColorStop(0, 'transparent');
  mistG.addColorStop(1, rgbStr(G.themeBlend.mist, 0.62));
  G.ctx.fillStyle = mistG;
  G.ctx.fillRect(G.cam.x - 20, FLOOR_Y - 52, Math.min(G.canvasW + 40, Math.max(0, 4140 - (G.cam.x - 20))), 60);
  G.ctx.restore();
}

function drawWeatherRipples() {
  if (!G.weatherRipples || G.weatherRipples.length === 0) return;
  G.ctx.save();
  G.ctx.lineWidth = 1.2;
  // Batch ripples into 2 alpha passes (fresh & fading) -> max 2 stroke calls total!
  for (let pass = 0; pass < 2; pass++) {
    G.ctx.strokeStyle = pass === 0 ? 'rgba(186, 230, 253, 0.44)' : 'rgba(186, 230, 253, 0.20)';
    G.ctx.beginPath();
    let any = false;
    for (let i = 0; i < G.weatherRipples.length; i++) {
      const rp = G.weatherRipples[i];
      const a = rp.life / rp.maxLife;
      if ((pass === 0 && a < 0.45) || (pass === 1 && a >= 0.45)) continue;
      if (!isInView(rp.x - rp.r, rp.y - 10, rp.r * 2, 20, 40)) continue;
      const ry = Math.max(1.2, rp.r * 0.22);
      G.ctx.moveTo(rp.x + rp.r, rp.y);
      G.ctx.ellipse(rp.x, rp.y, rp.r, ry, 0, 0, Math.PI * 2);
      any = true;
    }
    if (any) G.ctx.stroke();
  }
  G.ctx.restore();
}

function drawWallInscriptions() {
  G.ctx.save();
  G.ctx.font = '12.5px "Noto Serif SC", serif';
  G.ctx.textAlign = 'center';
  for (const ins of WALL_INSCRIPTIONS) {
    if (ins.hideWhenShortcutOpen && G.worldState && G.worldState.shortcutOpen) continue;
    if (ins.hideWhenDoubleJump && G.worldState && G.worldState.abilities.doubleJump) continue;
    if (ins.hideWhenShadeDash && G.worldState && G.worldState.abilities.shadeDash) continue;
    if (ins.hideWhenBoss2Defeated && G.worldState && G.worldState.boss2Defeated) continue;
    if (ins.hideWhenPuzzleSolved && G.worldState && G.worldState.solvedPuzzles && G.worldState.solvedPuzzles.has(ins.hideWhenPuzzleSolved)) continue;
    if (!isInView(ins.x - 120, ins.y - 24, 240, 48, 120)) continue;
    const dist = G.player ? Math.abs((G.player.x + G.player.w / 2) - ins.x) : 999;
    const proximity = Math.max(0, 1 - dist / 340);
    const alpha = 0.24 + proximity * 0.56;
    let label = ins.text;
    if (ins.dynamicKey) {
      const k = getControlLabels();
      if (ins.dynamicKey === 'grapple') label = `「幽丝攀环 · ${k.grapple}」`;
      else if (ins.dynamicKey === 'pogoSpell') label = `「下劈悬灯 S+斩 · 或以灵刃 ${k.spell} 击鸣」`;
      else if (ins.dynamicKey === 'parry') label = `「金芒借刃弹反 ${k.parry}→斩 · 猩红危兆须闪」`;
      else if (ins.dynamicKey === 'bellPuzzle') label = `「限时齐鸣三口青铜悬钟 · 可用 W+${k.spell} 镇魂钟鸣」`;
    }
    G.ctx.fillStyle = `rgba(216, 207, 184, ${alpha.toFixed(2)})`;
    G.ctx.fillText(label, ins.x, ins.y);
    G.ctx.strokeStyle = `rgba(216, 207, 184, ${(alpha * 0.32).toFixed(2)})`;
    G.ctx.lineWidth = 1;
    const halfW = Math.min(130, label.length * 5.8);
    boilLine(G.ctx, ins.x - halfW, ins.y + 6, ins.x + halfW, ins.y + 6, 4100 + ins.x, 0.7, 3);
  }
  G.ctx.restore();
}

function drawAltars() {
  for (const altar of ALTARS) {
    const { x, y } = altar;
    if (!isInView(x - 60, y - 100, 120, 110, 100)) continue;
    const isLit = !G.worldState || G.worldState.litAltars.has(altar.id);
    const isActive = G.worldState && G.worldState.activeAltarId === altar.id;

    G.ctx.save();
    if (isLit) {
      drawGlowSprite('cyan', x, y - 48, isActive ? 128 : 100, isActive ? 0.40 : 0.26);
    }

    // Stone Pedestal & Brazier
    G.ctx.fillStyle = isLit ? '#182132' : '#121620';
    G.ctx.strokeStyle = isLit ? COLORS.parchment : 'rgba(216, 207, 184, 0.45)';
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(x - 26, y);
    G.ctx.lineTo(x - 16, y - 34);
    G.ctx.lineTo(x + 16, y - 34);
    G.ctx.lineTo(x + 26, y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    // Secondary Altar Cracked Bell Arch Ornament
    if (altar.id === 'altar_chapel') {
      G.ctx.strokeStyle = isLit ? 'rgba(245, 158, 11, 0.45)' : 'rgba(216, 207, 184, 0.2)';
      G.ctx.lineWidth = 1.5;
      G.ctx.beginPath();
      G.ctx.arc(x, y - 46, 36, Math.PI, 0);
      G.ctx.stroke();
    }

    if (isLit) {
      // Hanging Soul Flame (pre-rendered glow sprite)
      const fl = Math.sin(G.globalTime * 9 + x) * 3;
      drawGlowSprite('cyan', x, y - 52 + fl * 0.5, 34, 0.72);
      G.ctx.fillStyle = COLORS.cyanBright;
      G.ctx.beginPath();
      G.ctx.moveTo(x, y - 72 + fl);
      G.ctx.quadraticCurveTo(x + 14, y - 50, x, y - 38);
      G.ctx.quadraticCurveTo(x - 14, y - 50, x, y - 72 + fl);
      G.ctx.fill();
    } else {
      // Unlit ash embers & faint wisp
      G.ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      G.ctx.beginPath();
      G.ctx.ellipse(x, y - 35, 11, 3.5, 0, 0, Math.PI * 2);
      G.ctx.fill();
      const drift = Math.sin(G.globalTime * 2.4) * 5;
      G.ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      G.ctx.lineWidth = 1.4;
      G.ctx.beginPath();
      G.ctx.moveTo(x, y - 38);
      G.ctx.quadraticCurveTo(x + drift, y - 54, x - drift * 0.6, y - 70);
      G.ctx.stroke();
    }
    G.ctx.restore();
  }
}

function drawNpcs() {
  for (const npc of NPCS) {
    const { x, y } = npc;
    if (x < G.cam.x - 160 || x > G.cam.x + G.canvasW + 160) continue;
    G.ctx.save();

    // Warm molten forge glow around Blind Bellsmith
    const pulse = 0.88 + Math.sin(G.globalTime * 6.5) * 0.12;
    const fg = G.ctx.createRadialGradient(x + 22, y - 22, 4, x + 12, y - 26, 118 * pulse);
    fg.addColorStop(0, 'rgba(245, 158, 11, 0.34)');
    fg.addColorStop(0.55, 'rgba(220, 38, 38, 0.10)');
    fg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = fg;
    G.ctx.beginPath(); G.ctx.arc(x + 12, y - 26, 118 * pulse, 0, Math.PI * 2); G.ctx.fill();

    // Stone Forge Brazier & Heavy Bronze Anvil (x + 28)
    const ax = x + 28;
    G.ctx.fillStyle = '#191d28';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.65)';
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    G.ctx.moveTo(ax - 18, y); G.ctx.lineTo(ax - 12, y - 18);
    G.ctx.lineTo(ax - 22, y - 24); G.ctx.lineTo(ax + 24, y - 24);
    G.ctx.lineTo(ax + 15, y - 16); G.ctx.lineTo(ax + 18, y);
    G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
    // Glowing ember ingot on anvil
    drawGlowSprite('gold', ax, y - 27, 22 * pulse, 0.72);
    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.fillRect(ax - 7, y - 28, 14, 4);

    // Blind Old Bellsmith Silhouette (Hunched Hooded Artisan)
    const tapCycle = Math.sin(G.globalTime * 3.4);
    const hammerLift = tapCycle > 0.3 ? (tapCycle - 0.3) * 1.1 : 0;
    G.ctx.translate(x - 6, y);
    // Heavy Leather Apron & Coat
    G.ctx.fillStyle = '#151924';
    G.ctx.strokeStyle = COLORS.parchment;
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(-16, 0); G.ctx.lineTo(-14, -44); G.ctx.quadraticCurveTo(0, -54, 14, -42);
    G.ctx.lineTo(17, 0); G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
    // Broad Hooded Head & Blindfold Bandage
    G.ctx.fillStyle = '#1e2433';
    G.ctx.beginPath(); G.ctx.arc(2, -52, 11, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
    G.ctx.strokeStyle = '#d8cfb8';
    G.ctx.lineWidth = 3;
    G.ctx.beginPath(); G.ctx.moveTo(-5, -53); G.ctx.lineTo(12, -51); G.ctx.stroke();
    // Long Ash Beard
    G.ctx.fillStyle = '#b7afa0';
    G.ctx.beginPath(); G.ctx.moveTo(2, -45); G.ctx.lineTo(11, -44); G.ctx.lineTo(6, -31); G.ctx.closePath(); G.ctx.fill();

    // Forging Hammer Arm
    G.ctx.save();
    G.ctx.translate(10, -34);
    G.ctx.rotate(-0.45 - hammerLift);
    G.ctx.strokeStyle = COLORS.parchment;
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(24, 6); G.ctx.stroke();
    G.ctx.fillStyle = '#3b2c1a';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.5;
    G.ctx.fillRect(20, 0, 9, 13); G.ctx.strokeRect(20, 0, 9, 13);
    G.ctx.restore();

    // Subtle Nameplate above NPC
    G.ctx.font = '11.5px "Noto Serif SC", serif';
    G.ctx.textAlign = 'center';
    G.ctx.fillStyle = 'rgba(253, 224, 71, 0.72)';
    G.ctx.fillText(npc.name || '老铸钟匠 · 砺', 10, -72);
    G.ctx.restore();
  }
}

function drawShortcutGate() {
  if (!G.worldState || SHORTCUT_GATE_DEF.w <= 0) return;
  const g = SHORTCUT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;

  // 1. Retractable Bronze Chain Portcullis
  const lift = G.worldState.shortcutAnim * (g.h - 24);
  const barH = g.h - lift;
  G.ctx.save();
  if (barH > 12) {
    G.ctx.fillStyle = '#14171f';
    G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
    G.ctx.strokeStyle = G.worldState.shortcutOpen ? 'rgba(245, 158, 11, 0.55)' : 'rgba(216, 207, 184, 0.62)';
    G.ctx.lineWidth = 2.2;
    // Vertical iron bars
    for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
      boilLine(G.ctx, bx, g.y, bx, g.y + barH, 6800 + bx, 0.9, 4);
    }
    // Cross braces
    for (let by = g.y + 42; by < g.y + barH - 12; by += 56) {
      boilLine(G.ctx, g.x + 2, by, g.x + g.w - 2, by, 6900 + by, 0.8, 2);
    }
    // Bottom spiked beam
    G.ctx.fillStyle = '#2a2219';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
    G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  }

  // 2. East-Side Bronze Chain Lever on Lore Balcony
  const lx = g.leverX;
  const ly = g.leverY;
  G.ctx.fillStyle = '#1b2231';
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 1.6;
  G.ctx.fillRect(lx - 10, ly - 14, 20, 14);
  G.ctx.strokeRect(lx - 10, ly - 14, 20, 14);

  const leverAng = G.worldState.shortcutOpen ? 0.62 : -0.58;
  G.ctx.save();
  G.ctx.translate(lx, ly - 12);
  G.ctx.rotate(leverAng);
  G.ctx.strokeStyle = G.worldState.shortcutOpen ? COLORS.goldBright : COLORS.parchment;
  G.ctx.lineWidth = 3;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(0, -34); G.ctx.stroke();
  G.ctx.fillStyle = G.worldState.shortcutOpen ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath(); G.ctx.arc(0, -36, 5.5, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();
  G.ctx.restore();
}

function drawChapelExitGate() {
  if (!G.worldState) return;
  const g = CHAPEL_EXIT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = G.worldState.chapelExitAnim * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  G.ctx.save();
  G.ctx.fillStyle = '#151218';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = G.worldState.bossDefeated ? COLORS.cyanBright : COLORS.crimsonBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7100 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#2a181b';
  G.ctx.strokeStyle = G.worldState.bossDefeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

function drawFoundryEntryGate() {
  if (!G.worldState) return;
  const g = FOUNDRY_ENTRY_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = G.worldState.foundryGateAnim * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  const unlocked = G.worldState.abilities.doubleJump || !!G.echoSession;
  G.ctx.save();
  G.ctx.fillStyle = '#121822';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = unlocked ? COLORS.goldBright : COLORS.cyanBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7250 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#1a2332';
  G.ctx.strokeStyle = unlocked ? COLORS.goldBright : COLORS.cyanBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

function drawFoundryExitGate() {
  if (!G.worldState || FOUNDRY_EXIT_GATE_DEF.w <= 0) return;
  const g = FOUNDRY_EXIT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = (G.worldState.foundryExitAnim || 0) * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  G.ctx.save();
  G.ctx.fillStyle = '#171210';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = G.worldState.boss2Defeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7360 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#2d1c12';
  G.ctx.strokeStyle = G.worldState.boss2Defeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

function drawFirstBellCore() {
  if (!G.worldState || !G.worldState.boss3Defeated || G.echoSession) return;
  const { x, y } = FIRST_BELL_CORE_POS;
  if (x < G.cam.x - 160 || x > G.cam.x + G.canvasW + 160) return;
  const bob = Math.sin(G.globalTime * 2.8) * 7;
  const cy = y - 64 + bob;
  const hasDawn = !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  G.ctx.save();
  drawGlowSprite('gold', x, cy, 86, 0.78);
  if (hasDawn) drawGlowSprite('cyan', x, cy, 52, 0.56);
  // Radiant Astral Pillar descending onto First Bell Core
  const pil = G.ctx.createLinearGradient(x, 0, x, y);
  pil.addColorStop(0, 'transparent');
  pil.addColorStop(0.55, hasDawn ? 'rgba(254, 240, 138, 0.20)' : 'rgba(245, 158, 11, 0.14)');
  pil.addColorStop(1, 'transparent');
  G.ctx.fillStyle = pil;
  G.ctx.fillRect(x - 38, 0, 76, y);
  // Rotating golden halo
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 2;
  boilCircle(G.ctx, x, cy, 30 + Math.sin(G.globalTime * 4) * 3, 9870, 1.4, 16);
  G.ctx.stroke();
  // Core Bell Heart Crystal
  G.ctx.fillStyle = '#fef9c3';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(x, cy - 22); G.ctx.lineTo(x + 15, cy); G.ctx.lineTo(x, cy + 22); G.ctx.lineTo(x - 15, cy);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();
}

function drawPendulums() {
  PENDULUMS.forEach((pd, idx) => {
    if (!isInView(pd.x - pd.len, pd.anchorY, pd.len * 2, pd.len + 40, 80)) return;
    const ang = Math.sin(G.globalTime * pd.speed + pd.phase) * pd.amp;
    const bx = pd.x + Math.sin(ang) * pd.len;
    const by = pd.anchorY + Math.cos(ang) * pd.len;
    G.ctx.save();
    // Heavy iron chain
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.45)';
    G.ctx.lineWidth = 2.6;
    boilLine(G.ctx, pd.x, pd.anchorY, bx, by, 7900 + idx * 31, 1.2, 5);
    // Ceiling gear mount
    G.ctx.fillStyle = '#1d2230';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath(); G.ctx.arc(pd.x, pd.anchorY, 8, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();

    // Crescent Bronze Pendulum Blade
    drawGlowSprite('crimson', bx, by, pd.r * 1.45, 0.42);
    G.ctx.translate(bx, by);
    G.ctx.rotate(-ang);
    G.ctx.fillStyle = '#261d19';
    G.ctx.strokeStyle = COLORS.crimsonBright;
    G.ctx.lineWidth = 2.2;
    G.ctx.beginPath();
    G.ctx.arc(0, -6, pd.r, 0.18, Math.PI - 0.18);
    G.ctx.quadraticCurveTo(0, 6, Math.cos(0.18) * pd.r, -6 + Math.sin(0.18) * pd.r);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    // Central bronze bell rivet
    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.beginPath(); G.ctx.arc(0, 2, 5.5, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  });
}

function drawSecretWalls() {
  if (!G.worldState) return;
  for (const w of G.worldState.secretWalls) {
    if (w.broken) continue;
    if (!isInView(w.x, w.y, w.w, w.h, 80)) continue;
    const sx = w.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    G.ctx.save();
    G.ctx.translate(sx, 0);
    G.ctx.fillStyle = '#151c2b';
    G.ctx.fillRect(w.x, w.y, w.w, w.h);

    // Subtle glowing ink fissures hinting it's breakable!
    const dmgRatio = 1 - w.hp / w.maxHp;
    const pulse = 0.55 + Math.sin(G.globalTime * 4.5) * 0.25 + dmgRatio * 0.35;
    G.ctx.strokeStyle = `rgba(125, 211, 252, ${Math.min(1, pulse).toFixed(2)})`;
    G.ctx.lineWidth = 1.6 + dmgRatio * 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(w.x + w.w * 0.72, w.y + w.h * 0.08);
    G.ctx.lineTo(w.x + w.w * 0.34, w.y + w.h * 0.30);
    G.ctx.lineTo(w.x + w.w * 0.68, w.y + w.h * 0.54);
    G.ctx.lineTo(w.x + w.w * 0.30, w.y + w.h * 0.76);
    G.ctx.lineTo(w.x + w.w * 0.58, w.y + w.h * 0.92);
    G.ctx.stroke();

    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.52)';
    G.ctx.lineWidth = 1.9;
    boilRectOutline(G.ctx, w.x, w.y, w.w, w.h, 7400, 1.3);
    G.ctx.restore();
  }
}

function drawVoidBarriers() {
  if (!VOID_BARRIERS.length) return;
  const unlocked = !!(G.worldState && G.worldState.abilities.shadeDash);
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    if (!isInView(vb.x, vb.y, vb.w, vb.h, 80)) continue;
    const cx = vb.x + vb.w * 0.5;
    const cy = vb.y + vb.h * 0.5;
    G.ctx.save();
    drawGlowSprite('violet', cx, cy, Math.max(44, vb.h * 0.52), unlocked ? 0.44 : 0.62);
    // Obsidian-violet ink curtain body
    const grad = G.ctx.createLinearGradient(vb.x, vb.y, vb.x + vb.w, vb.y);
    grad.addColorStop(0, 'rgba(30, 12, 48, 0.35)');
    grad.addColorStop(0.5, 'rgba(10, 5, 18, 0.94)');
    grad.addColorStop(1, 'rgba(30, 12, 48, 0.35)');
    G.ctx.fillStyle = grad;
    G.ctx.fillRect(vb.x, vb.y, vb.w, vb.h);
    // Shimmering vertical void-ink streams
    G.ctx.strokeStyle = unlocked ? 'rgba(216, 180, 254, 0.72)' : 'rgba(168, 85, 247, 0.88)';
    G.ctx.lineWidth = 1.8;
    boilLine(G.ctx, vb.x + 3, vb.y, vb.x + 3, vb.y + vb.h, 9600 + i * 31, 1.8, 5);
    boilLine(G.ctx, vb.x + vb.w - 3, vb.y, vb.x + vb.w - 3, vb.y + vb.h, 9650 + i * 31, 1.8, 5);
    // Rising spectral void particles inside the curtain
    G.ctx.fillStyle = COLORS.violetBright;
    for (let k = 0; k < 5; k++) {
      const p = ((G.globalTime * 0.65 + k * 0.21 + i * 0.13) % 1);
      const px = cx + Math.sin(G.globalTime * 5 + k * 2.1) * (vb.w * 0.28);
      const py = vb.y + vb.h - p * vb.h;
      G.ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
      G.ctx.beginPath(); G.ctx.arc(px, py, 2.2, 0, Math.PI * 2); G.ctx.fill();
    }
    // Top & bottom anchor seal plates
    G.ctx.globalAlpha = 1;
    G.ctx.fillStyle = '#1b1426';
    G.ctx.strokeStyle = COLORS.violetBright;
    G.ctx.lineWidth = 1.4;
    G.ctx.fillRect(vb.x - 4, vb.y - 3, vb.w + 8, 7);
    G.ctx.strokeRect(vb.x - 4, vb.y - 3, vb.w + 8, 7);
    G.ctx.fillRect(vb.x - 4, vb.y + vb.h - 4, vb.w + 8, 7);
    G.ctx.strokeRect(vb.x - 4, vb.y + vb.h - 4, vb.w + 8, 7);
    G.ctx.restore();
  }
}

function drawLostEchoes() {
  if (!G.worldState || !G.worldState.lostEchoes || G.echoSession) return;
  const le = G.worldState.lostEchoes;
  if (le.x < G.cam.x - 140 || le.x > G.cam.x + G.canvasW + 140) return;
  const bob = Math.sin(G.globalTime * 3.8) * 6;
  const x = le.x;
  const y = le.y + bob;
  G.ctx.save();
  drawGlowSprite('cyan', x, y, 56, 0.72);
  drawGlowSprite('gold', x, y, 28, 0.58);
  // Orbiting spectral ink-soul rings
  G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
  G.ctx.lineWidth = 1.6;
  boilCircle(G.ctx, x, y, 20 + Math.sin(G.globalTime * 6) * 2, 9820, 1.6, 14);
  G.ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const a = G.globalTime * 2.9 + (k * Math.PI * 2) / 3;
    const ox = x + Math.cos(a) * 22;
    const oy = y + Math.sin(a) * 12;
    G.ctx.fillStyle = k === 0 ? COLORS.goldBright : COLORS.cyanBright;
    G.ctx.beginPath(); G.ctx.arc(ox, oy, 2.8, 0, Math.PI * 2); G.ctx.fill();
  }
  // Spectral Lantern Shade silhouette
  G.ctx.fillStyle = '#0d1828';
  G.ctx.strokeStyle = COLORS.cyanBright;
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(x - 9, y - 14); G.ctx.lineTo(x + 9, y - 14);
  G.ctx.lineTo(x + 12, y + 8); G.ctx.lineTo(x, y + 18); G.ctx.lineTo(x - 12, y + 8);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.arc(x, y - 2, 4.8, 0, Math.PI * 2); G.ctx.fill();
  // Amount Label
  G.ctx.font = 'bold 12px "Noto Serif SC", serif';
  G.ctx.textAlign = 'center';
  G.ctx.fillStyle = '#06080d';
  G.ctx.fillText(`✦ 残响灯影 · ${le.amount}`, x + 1, y - 28);
  G.ctx.fillStyle = COLORS.cyanBright;
  G.ctx.fillText(`✦ 残响灯影 · ${le.amount}`, x, y - 29);
  G.ctx.restore();
}

function drawPickups() {
  if (!G.worldState) return;
  for (const p of G.worldState.pickups) {
    if (p.collected) continue;
    if (!isInView(p.x - 36, p.y - 60, 72, 70, 80)) continue;
    const bob = Math.sin(G.globalTime * 3.6 + p.x) * 5;
    const py = p.y - 28 + bob;
    const isFlask = p.kind === 'flaskCore';
    const isAbility = p.kind === 'ability';
    const isKey = p.kind === 'keyItem';
    const isShade = (isAbility && p.abilityId === 'shadeDash') || p.kind === 'statCore';
    const col = isKey ? '#fef9c3' : (isShade ? COLORS.violetBright : (isFlask || isAbility ? COLORS.cyanBright : COLORS.goldBright));

    G.ctx.save();
    drawGlowSprite(isShade ? 'violet' : (isFlask || isAbility ? 'cyan' : 'gold'), p.x, py, isAbility ? 60 : 46, isAbility ? 0.54 : 0.42);

    // Stone miniature shrine plinth
    G.ctx.fillStyle = '#182132';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.5)';
    G.ctx.lineWidth = 1.4;
    G.ctx.fillRect(p.x - 14, p.y - 10, 28, 10);
    G.ctx.strokeRect(p.x - 14, p.y - 10, 28, 10);

    // Floating glowing artifact icon
    G.ctx.translate(p.x, py);
    G.ctx.fillStyle = col;
    G.ctx.strokeStyle = '#ffffff';
    G.ctx.lineWidth = 1.4;
    if (isAbility) {
      // Twin Ink-Wing Emblem
      const flap = Math.sin(G.globalTime * 5) * 0.16;
      [-1, 1].forEach(side => {
        G.ctx.save();
        G.ctx.scale(side, 1);
        G.ctx.rotate(flap);
        G.ctx.beginPath();
        G.ctx.moveTo(2, 4);
        G.ctx.quadraticCurveTo(15, -14, 22, -6);
        G.ctx.quadraticCurveTo(16, 4, 4, 8);
        G.ctx.closePath();
        G.ctx.fill();
        G.ctx.stroke();
        G.ctx.restore();
      });
    } else if (isFlask) {
      G.ctx.beginPath();
      G.ctx.moveTo(0, -11);
      G.ctx.quadraticCurveTo(9, 0, 7, 8);
      G.ctx.quadraticCurveTo(0, 12, -7, 8);
      G.ctx.quadraticCurveTo(-9, 0, 0, -11);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    } else {
      G.ctx.rotate(Math.sin(G.globalTime * 2.5) * 0.14);
      G.ctx.beginPath();
      G.ctx.moveTo(-6, -10);
      G.ctx.lineTo(6, -10);
      G.ctx.quadraticCurveTo(11, 2, 13, 9);
      G.ctx.lineTo(-13, 9);
      G.ctx.quadraticCurveTo(-11, 2, -6, -10);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    }
    G.ctx.restore();
  }
}

function drawCrumblePlatforms() {
  if (!G.crumblePlatforms) return;
  G.crumblePlatforms.forEach((cp, idx) => {
    if (!isInView(cp.x, cp.y, cp.w, cp.h, 80)) return;
    G.ctx.save();
    if (cp.state === 'broken') {
      const regenP = 1 - Math.max(0, cp.timer / 3.2);
      G.ctx.setLineDash([5, 5]);
      G.ctx.strokeStyle = `rgba(125, 211, 252, ${(0.18 + regenP * 0.38).toFixed(2)})`;
      G.ctx.lineWidth = 1.4;
      G.ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      G.ctx.setLineDash([]);
      G.ctx.restore();
      return;
    }
    const jx = cp.state === 'shaking' ? (Math.random() - 0.5) * 6 : 0;
    const jy = cp.state === 'shaking' ? (Math.random() - 0.5) * 3 : 0;
    G.ctx.translate(jx, jy);
    G.ctx.fillStyle = cp.state === 'shaking' ? '#2c2220' : '#242b3b';
    G.ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
    // Glowing amber fracture seams signaling fragility
    G.ctx.strokeStyle = cp.state === 'shaking' ? COLORS.crimsonBright : 'rgba(245, 158, 11, 0.72)';
    G.ctx.lineWidth = cp.state === 'shaking' ? 2.0 : 1.4;
    G.ctx.beginPath();
    G.ctx.moveTo(cp.x + cp.w * 0.28, cp.y);
    G.ctx.lineTo(cp.x + cp.w * 0.36, cp.y + cp.h * 0.55);
    G.ctx.lineTo(cp.x + cp.w * 0.24, cp.y + cp.h);
    G.ctx.moveTo(cp.x + cp.w * 0.68, cp.y);
    G.ctx.lineTo(cp.x + cp.w * 0.60, cp.y + cp.h * 0.62);
    G.ctx.lineTo(cp.x + cp.w * 0.74, cp.y + cp.h);
    G.ctx.stroke();
    G.ctx.strokeStyle = cp.state === 'shaking' ? COLORS.goldBright : 'rgba(216, 207, 184, 0.65)';
    G.ctx.lineWidth = 1.8;
    boilRectOutline(G.ctx, cp.x, cp.y, cp.w, cp.h, 8400 + idx * 31, 1.2);
    G.ctx.restore();
  });
}

function drawResonancePuzzles() {
  if (!G.resonancePuzzles) return;
  for (const pz of G.resonancePuzzles) {
    const cx = pz.cageX;
    const cy = pz.cageY;
    // 1. Harmonic Golden Tether Lines from each Bell to Reliquary Cage
    if (!pz.solved || pz.cageAnim < 1) {
      G.ctx.save();
      const lineFade = pz.solved ? (1 - pz.cageAnim) : 1;
      for (const b of pz.bells) {
        if (Math.max(b.x, cx) < G.cam.x - 120 || Math.min(b.x, cx) > G.cam.x + G.canvasW + 120) continue;
        G.ctx.strokeStyle = b.lit
          ? `rgba(253, 224, 71, ${(0.55 * lineFade).toFixed(2)})`
          : `rgba(216, 207, 184, ${(0.14 * lineFade).toFixed(2)})`;
        G.ctx.lineWidth = b.lit ? 2.0 : 1.1;
        G.ctx.setLineDash(b.lit ? [] : [5, 7]);
        G.ctx.beginPath();
        G.ctx.moveTo(b.x, b.y + 12);
        G.ctx.quadraticCurveTo((b.x + cx) * 0.5, (b.y + cy - 35) * 0.5 + 32, cx, cy - 34);
        G.ctx.stroke();
      }
      G.ctx.setLineDash([]);
      G.ctx.restore();
    }

    // 2. Hanging Bronze Resonance Bells
    pz.bells.forEach((b, idx) => {
      if (b.x < G.cam.x - 100 || b.x > G.cam.x + G.canvasW + 100) return;
      G.ctx.save();
      G.ctx.strokeStyle = b.lit ? 'rgba(253, 224, 71, 0.55)' : 'rgba(216, 207, 184, 0.32)';
      G.ctx.lineWidth = 1.6;
      boilLine(G.ctx, b.x, b.topY, b.x, b.y - 16, 8600 + idx * 19, 0.9, 3);

      if (b.lit || b.flash > 0) {
        drawGlowSprite('gold', b.x, b.y, b.flash > 0 ? 52 : 34, b.flash > 0 ? 0.85 : 0.55);
      } else {
        drawGlowSprite('cyan', b.x, b.y, 24, 0.22);
      }

      G.ctx.translate(b.x, b.y);
      G.ctx.rotate(b.swing);
      G.ctx.fillStyle = b.lit ? '#422c12' : '#1b202c';
      G.ctx.strokeStyle = b.lit ? COLORS.goldBright : 'rgba(216, 207, 184, 0.72)';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(-8, -14);
      G.ctx.lineTo(8, -14);
      G.ctx.quadraticCurveTo(15, 2, 18, 13);
      G.ctx.lineTo(-18, 13);
      G.ctx.quadraticCurveTo(-15, 2, -8, -14);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();

      // Bell clapper & glowing rune dot
      G.ctx.fillStyle = b.lit ? COLORS.goldBright : COLORS.cyan;
      G.ctx.beginPath(); G.ctx.arc(0, 14, 3.8, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.beginPath(); G.ctx.arc(0, -2, 3.2, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.restore();
    });

    // 3. Sealed Bronze Reliquary Cage over Reward Pickup
    if (cx >= G.cam.x - 100 && cx <= G.cam.x + G.canvasW + 100 && pz.cageAnim < 1) {
      const lift = pz.cageAnim * 58;
      const alpha = 1 - pz.cageAnim;
      G.ctx.save();
      G.ctx.globalAlpha = alpha;
      G.ctx.strokeStyle = pz.timer > 0 ? COLORS.goldBright : 'rgba(245, 158, 11, 0.72)';
      G.ctx.fillStyle = 'rgba(12, 16, 24, 0.42)';
      G.ctx.lineWidth = 2.0;
      const topY = cy - 64 - lift;
      const h = 64;
      G.ctx.beginPath();
      G.ctx.moveTo(cx - 24, topY + h);
      G.ctx.lineTo(cx - 24, topY + 18);
      G.ctx.quadraticCurveTo(cx, topY - 8, cx + 24, topY + 18);
      G.ctx.lineTo(cx + 24, topY + h);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
      for (let bx = cx - 12; bx <= cx + 12; bx += 12) {
        G.ctx.beginPath(); G.ctx.moveTo(bx, topY + 8); G.ctx.lineTo(bx, topY + h); G.ctx.stroke();
      }
      // Active harmony countdown ring above the sealed cage
      if (!pz.solved && pz.timer > 0 && pz.maxTimer > 0) {
        const pct = Math.max(0, Math.min(1, pz.timer / pz.maxTimer));
        G.ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
        G.ctx.lineWidth = 4;
        G.ctx.beginPath(); G.ctx.arc(cx, topY - 16, 12, 0, Math.PI * 2); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.goldBright;
        G.ctx.lineWidth = 3;
        G.ctx.beginPath(); G.ctx.arc(cx, topY - 16, 12, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct); G.ctx.stroke();
      }
      G.ctx.restore();
    }
  }
}

function drawLoreTablets() {
  for (const lt of LORE_TABLETS) {
    const { x, y } = lt;
    if (x < G.cam.x - 100 || x > G.cam.x + G.canvasW + 100) continue;
    G.ctx.save();
    G.ctx.fillStyle = '#1b2436';
    G.ctx.strokeStyle = COLORS.parchment;
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(x - 18, y);
    G.ctx.lineTo(x - 15, y - 54);
    G.ctx.quadraticCurveTo(x, y - 66, x + 15, y - 54);
    G.ctx.lineTo(x + 18, y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
    G.ctx.lineWidth = 1.3;
    for (let r = 0; r < 3; r++) {
      boilLine(G.ctx, x - 9, y - 42 + r * 11, x + 9, y - 42 + r * 11, 3100 + x + r * 7, 0.7, 2);
    }
    G.ctx.restore();
  }
}

function drawLanterns() {
  G.lanterns.forEach((l, idx) => {
    const topY0 = l.topY !== undefined ? l.topY : 0;
    if (!isInView(l.x - 60, topY0, 120, (l.anchorY + l.len) - topY0 + 60, 100)) return;
    const lx = l.x + Math.sin(l.angle) * l.len;
    const ly = l.anchorY + Math.cos(l.angle) * l.len;
    G.ctx.save();
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.36)';
    G.ctx.lineWidth = 1.6;
    const topY = l.topY !== undefined ? l.topY : 0;
    if (l.anchorY > topY) boilLine(G.ctx, l.x, topY, l.x, l.anchorY, 1900 + idx * 11, 0.8, 3);
    boilLine(G.ctx, l.x, l.anchorY, lx, ly - 10, 1950 + idx * 13, 1.0, 3);

    drawGlowSprite('gold', lx, ly, l.ringFlash > 0 ? 82 : 46, l.ringFlash > 0 ? 0.72 : 0.38);

    G.ctx.translate(lx, ly);
    G.ctx.rotate(-l.angle);
    G.ctx.fillStyle = '#181c24';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(-9, -11); G.ctx.lineTo(9, -11); G.ctx.lineTo(12, 8); G.ctx.lineTo(-12, 8);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.beginPath(); G.ctx.arc(0, -1, 4.5, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  });
}

function drawGrappleAnchors() {
  GRAPPLE_ANCHORS.forEach((a, idx) => {
    const topY0 = a.topY !== undefined ? a.topY : 0;
    if (!isInView(a.x - 40, topY0, 80, a.y - topY0 + 40, 80)) return;
    G.ctx.save();
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.30)';
    G.ctx.lineWidth = 1.5;
    const topY = a.topY !== undefined ? a.topY : 0;
    boilLine(G.ctx, a.x, topY, a.x, a.y - 12, 2300 + idx * 17, 1.1, 4);

    const isTideBeacon = G.chapelTide && (a.id.startsWith('anc_boss') || a.id.startsWith('anc_ji') || a.id.startsWith('anc_heart'));
    const pulse = 0.65 + Math.sin(G.globalTime * (isTideBeacon ? 12 : 3.8) + idx) * 0.35;
    drawGlowSprite(isTideBeacon ? 'gold' : 'cyan', a.x, a.y, isTideBeacon ? 52 : 32, (isTideBeacon ? 0.56 : 0.30) * pulse);

    G.ctx.strokeStyle = COLORS.cyanBright;
    G.ctx.lineWidth = 2.2;
    boilCircle(G.ctx, a.x, a.y, 10, 2350 + idx * 13, 0.8, 12);
    G.ctx.stroke();
    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.beginPath(); G.ctx.arc(a.x, a.y, 3.2, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  });
}

function drawGrappleReticle() {
  if (!G.player || G.player.hp <= 0 || !G.grapplePreviewTarget || G.player.grappleState !== 'none' || G.gameState !== 'playing') return;
  const t = G.grapplePreviewTarget;
  const pulse = 1 + Math.sin(G.globalTime * 11) * 0.1;
  const rot = G.globalTime * 1.9;
  G.ctx.save();
  G.ctx.translate(t.x, t.y);
  G.ctx.scale(pulse, pulse);

  G.ctx.save();
  G.ctx.rotate(rot);
  G.ctx.strokeStyle = G.player.grappleCd <= 0 ? COLORS.cyanBright : 'rgba(148, 163, 184, 0.45)';
  G.ctx.lineWidth = 1.9;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    G.ctx.beginPath(); G.ctx.arc(0, 0, 22, a - 0.32, a + 0.32); G.ctx.stroke();
    G.ctx.beginPath();
    G.ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
    G.ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
    G.ctx.stroke();
  }
  G.ctx.restore();

  if (G.player.grappleCd <= 0) {
    G.ctx.font = '11px "Noto Serif SC", monospace';
    G.ctx.textAlign = 'center';
    G.ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
    G.ctx.fillRect(-19, 25, 38, 16);
    G.ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    G.ctx.lineWidth = 1;
    G.ctx.strokeRect(-19, 25, 38, 16);
    G.ctx.fillStyle = COLORS.cyanBright;
    G.ctx.fillText(getControlLabels().shortGrapple, 0, 37);
  }
  G.ctx.restore();
}

function drawGrappleThread() {
  if (G.player.grappleState === 'none') return;
  const sx = G.player.x + G.player.w / 2 + G.player.facing * 8;
  const sy = G.player.y + 22;
  let ex = G.player.grappleTx;
  let ey = G.player.grappleTy;
  if (G.player.grappleState === 'extending') {
    const p = 1 - Math.max(0, G.player.grappleTimer / 0.065);
    ex = sx + (G.player.grappleTx - sx) * p;
    ey = sy + (G.player.grappleTy - sy) * p;
  }
  G.ctx.save();
  G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  G.ctx.lineWidth = 6.5;
  boilLine(G.ctx, sx, sy, ex, ey, 7700, 1.6, 6);
  G.ctx.strokeStyle = COLORS.cyanBright;
  G.ctx.lineWidth = 2.4;
  boilLine(G.ctx, sx, sy, ex, ey, 7700, 1.6, 6);
  G.ctx.strokeStyle = '#ffffff';
  G.ctx.lineWidth = 1;
  G.ctx.beginPath(); G.ctx.moveTo(sx, sy); G.ctx.lineTo(ex, ey); G.ctx.stroke();
  drawGlowSprite('gold', ex, ey, 14, 0.85);
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();
}

function drawMistBarrier(activeBoss) {
  const x = activeBoss ? activeBoss.arenaMinX - 2 : 2646;
  const y0 = activeBoss ? activeBoss.arenaTopY : 0;
  const h = activeBoss ? (activeBoss.arenaFloorY - y0) : FLOOR_Y;
  G.ctx.save();
  const g = G.ctx.createLinearGradient(x - 16, 0, x + 20, 0);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.5, activeBoss && activeBoss.id === 'boss_ji' ? 'rgba(245, 158, 11, 0.34)' : 'rgba(180, 200, 230, 0.34)');
  g.addColorStop(1, 'transparent');
  G.ctx.fillStyle = g;
  G.ctx.fillRect(x - 16, y0, 36, h);
  G.ctx.restore();
}

function drawContactShadow(cx, footY, baseRadius) {
  const surfY = getGroundSurfaceY(cx, footY);
  const height = Math.max(0, surfY - footY);
  if (height > 260) return;
  const scale = Math.max(0.32, 1 - height / 280);
  const alpha = Math.max(0.08, 0.48 * scale);
  G.ctx.save();
  G.ctx.fillStyle = `rgba(3, 5, 9, ${alpha.toFixed(2)})`;
  G.ctx.beginPath();
  G.ctx.ellipse(cx, surfY + 1, baseRadius * scale, Math.max(2.5, 5.2 * scale), 0, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.restore();
}

/* ---------- UPGRADED PROTAGONIST: 暗黑提灯剑客 ---------- */
function drawPuppet(x, y, facing, isGhost = false, ghostColor = null) {
  const cx = x + G.player.w / 2;
  const footY = y + G.player.h;

  // Ultra-fast lightweight ghost silhouette for dash/grapple/iai afterimages (skips IK legs & detail strokes)
  if (isGhost) {
    G.ctx.save();
    G.ctx.translate(cx, footY);
    G.ctx.fillStyle = ghostColor || COLORS.cyanBright;
    G.ctx.beginPath();
    G.ctx.moveTo(-facing * 13, -10);
    G.ctx.lineTo(-facing * 9, -46);
    G.ctx.quadraticCurveTo(facing * 2, -57, facing * 9, -44);
    G.ctx.lineTo(facing * 11, -14);
    G.ctx.lineTo(facing * 5, 0);
    G.ctx.lineTo(-facing * 6, -4);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.restore();
    return;
  }

  G.ctx.save();
  if (!isGhost) {
    // Soft ambient soul lantern glow around protagonist
    drawGlowSprite(G.player.chargeReadyPlayed ? 'gold' : 'cyan', cx - facing * 4, y + 28, 92, G.player.chargeReadyPlayed ? 0.24 : 0.16);

    // Dual Spring-Physics Cloak + Torn Crimson-Ash Scarf (violet-lit rim when Shade Cloak burst is ready!)
    const shadeReady = !!(G.worldState && G.worldState.abilities.shadeDash && G.player.shadeDashCd <= 0);
    if (shadeReady) {
      drawGlowSprite('violet', cx, y + 26, 36, 0.34 + Math.sin(G.globalTime * 6) * 0.08);
    }
    drawCloakMesh(G.player.cloak, shadeReady ? '#191228' : '#101521', shadeReady ? 'rgba(216, 180, 254, 0.72)' : 'rgba(216, 207, 184, 0.52)', 17, 100);
    drawCloakMesh(G.player.scarf, '#4f1b24', 'rgba(248, 113, 113, 0.42)', 8.5, 200);
  }

  const isDying = !isGhost && G.player.hp <= 0;
  if (isDying) {
    const fade = Math.max(0, G.player.deathTimer / 0.65);
    G.ctx.globalAlpha = fade;
    G.ctx.translate(cx, footY + (1 - fade) * 14);
    G.ctx.rotate(-facing * (1 - fade) * 0.55);
    G.ctx.scale(1 + (1 - fade) * 0.15, Math.max(0.55, fade));
  } else {
    G.ctx.translate(cx, footY);
    G.ctx.scale(G.player.squashX, G.player.squashY);
  }

  const isHurt = !isGhost && G.player.hurtTimer > 0 && Math.floor(G.globalTime * 30) % 2 === 0;
  const bodyCol = isGhost ? (ghostColor || '#0b0f18') : (isHurt ? '#ffffff' : '#121824');
  const lineCol = isGhost ? (ghostColor || COLORS.cyanBright) : COLORS.parchment;
  const backLegCol = isGhost ? lineCol : '#8f8776';

  // Dynamic Landing Crouch & 2-Bone IK Articulated Legs (Terrain-Snapped!)
  const crouchDrop = isGhost ? 0 : ((G.player.landCrouch || 0) * 6.5 + (G.player.isCharging && G.player.chargeTime > 0.14 ? 5.5 : 0));
  const hipY = -19 + crouchDrop;
  const isRunning = G.player.grounded && Math.abs(G.player.vx) > 25;
  const isDashing = G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.detonateLungeTimer > 0;
  const snapFootY = localX => {
    if (isGhost || !G.player.grounded) return 0;
    const sy = getGroundSurfaceY(cx + localX, footY - 12);
    return Math.max(-5, Math.min(9, sy - footY));
  };

  const calcFootTarget = (isFront) => {
    if (isDashing) {
      return isFront ? { x: facing * 12, y: -3 } : { x: -facing * 12, y: -5 };
    }
    if (!G.player.grounded) {
      if (G.player.wallDir !== 0) {
        return isFront ? { x: G.player.wallDir * 9, y: -8 } : { x: G.player.wallDir * 5, y: -1 };
      }
      if (G.player.vy < 0) {
        return isFront ? { x: facing * 7.5, y: -9 } : { x: -facing * 7, y: -1 };
      }
      return isFront ? { x: facing * 6.5, y: -2 } : { x: -facing * 8, y: -7 };
    }
    if (isRunning) {
      const ph = G.player.runCycle + (isFront ? 0 : Math.PI);
      const sx = Math.sin(ph) * 11.5;
      const lift = Math.max(0, Math.cos(ph)) * 7.5;
      return { x: sx, y: lift > 0.5 ? -lift : snapFootY(sx) };
    }
    const idleX = isFront ? facing * 6.5 : -facing * 5.5;
    return { x: idleX, y: snapFootY(idleX) };
  };

  const drawIKLeg = (hipX, target, col) => {
    const ik = solve2BoneIK(hipX, hipY, target.x, target.y, 10.6, 10.6, facing);
    G.ctx.strokeStyle = col;
    G.ctx.lineWidth = 3.1;
    G.ctx.lineCap = 'round';
    G.ctx.lineJoin = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(hipX, hipY);
    G.ctx.lineTo(ik.kx, ik.ky);
    G.ctx.lineTo(ik.ex, ik.ey);
    // Boot tip toe
    G.ctx.lineTo(ik.ex + facing * 3.5, ik.ey);
    G.ctx.stroke();
  };

  drawIKLeg(-facing * 2.5, calcFootTarget(false), backLegCol);
  drawIKLeg(facing * 2.5, calcFootTarget(true), lineCol);

  // Pivot Upper Body around Pelvis with Dynamic Sprint / Brake / Parry Lean
  G.ctx.save();
  G.ctx.translate(0, hipY);
  if (!isGhost && !isDying) G.ctx.rotate(G.player.bodyLean || 0);
  G.ctx.translate(0, 19);

  // Hooded Hunter Coat Torso
  G.ctx.fillStyle = bodyCol;
  G.ctx.strokeStyle = lineCol;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -15);
  G.ctx.lineTo(-8, -36);
  G.ctx.lineTo(8, -36);
  G.ctx.lineTo(10, -15);
  G.ctx.lineTo(4, -12);
  G.ctx.lineTo(-4, -12);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Crimson Chest Sash
  if (!isGhost) {
    G.ctx.strokeStyle = '#9f1239';
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(-8, -34); G.ctx.lineTo(8, -22); G.ctx.stroke();
  }

  // Waist-Mounted Swinging Soul Lantern (Diegetic Soul Ready Glow)
  if (!isGhost && !isDying) {
    const rsHud = getRelicStats();
    const soulReady = G.player.soul >= rsHud.spellCost;
    G.ctx.save();
    G.ctx.translate(-facing * 9, -20);
    G.ctx.rotate(G.player.lanternSwing);
    G.ctx.fillStyle = '#181e2b';
    G.ctx.strokeStyle = soulReady ? COLORS.cyanBright : COLORS.gold;
    G.ctx.lineWidth = 1.2;
    G.ctx.fillRect(-3.5, 2, 7, 9);
    G.ctx.strokeRect(-3.5, 2, 7, 9);
    if (soulReady) {
      drawGlowSprite('cyan', 0, 6.5, 13 + Math.sin(G.globalTime * 8) * 2.5, 0.8);
    }
    G.ctx.fillStyle = soulReady ? '#e0f2fe' : 'rgba(56, 189, 248, 0.42)';
    G.ctx.beginPath(); G.ctx.arc(0, 6.5, soulReady ? 2.7 : 1.9, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();

    // Diegetic Floating Ink Seals Orbiting Behind Shoulder (1-3 Seals)
    for (let s = 0; s < G.player.seals; s++) {
      const ang = G.globalTime * 2.8 + s * ((Math.PI * 2) / Math.max(1, G.player.seals));
      const ox = -facing * 18 + Math.cos(ang) * 9;
      const oy = -36 + Math.sin(ang) * 7 - s * 3;
      G.ctx.save();
      G.ctx.translate(ox, oy);
      G.ctx.rotate(Math.sin(G.globalTime * 4 + s) * 0.25);
      G.ctx.fillStyle = '#b91c1c';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1;
      G.ctx.fillRect(-2.5, -5, 5, 10);
      G.ctx.strokeRect(-2.5, -5, 5, 10);
      G.ctx.restore();
    }
  }

  // Horned Cracked Bone-Porcelain Mask & Dark Hood
  const headBob = Math.sin(G.player.runCycle * 2) * 1.2;
  G.ctx.save();
  G.ctx.translate(0, -44 + headBob);

  // Dark pointed cowl behind mask
  G.ctx.fillStyle = isGhost ? bodyCol : '#0c1019';
  G.ctx.strokeStyle = lineCol;
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 13, 6);
  G.ctx.quadraticCurveTo(-facing * 15, -14, facing * 2, -13);
  G.ctx.quadraticCurveTo(facing * 12, -10, facing * 9, 8);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Bone Mask with Twin Short Curved Horns
  G.ctx.fillStyle = isGhost ? bodyCol : (isHurt ? '#ffffff' : '#e6dec8');
  G.ctx.strokeStyle = '#090c12';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-8, 6);
  G.ctx.quadraticCurveTo(-11, -6, -6, -12);
  G.ctx.lineTo(-9, -18); // Left horn
  G.ctx.lineTo(-2, -11);
  G.ctx.lineTo(3, -11);
  G.ctx.lineTo(9, -18); // Right horn
  G.ctx.lineTo(6, -11);
  G.ctx.quadraticCurveTo(11, -5, 8, 6);
  G.ctx.quadraticCurveTo(0, 10, -8, 6);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  if (!isGhost) {
    // Mask hairline crack
    G.ctx.strokeStyle = 'rgba(20, 24, 34, 0.55)';
    G.ctx.lineWidth = 1;
    G.ctx.beginPath();
    G.ctx.moveTo(-4, -10); G.ctx.lineTo(-1, -4); G.ctx.lineTo(-3, 0);
    G.ctx.stroke();

    // Glowing Cyan Eyes (Turn Gold when Iai Charged or Riposte Ready!)
    const eyeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const eyeCol = eyeGold ? COLORS.goldBright : COLORS.cyanBright;
    drawGlowSprite(eyeGold ? 'gold' : 'cyan', facing * 3, -1, 11, 0.7);
    G.ctx.fillStyle = eyeCol;
    G.ctx.beginPath();
    G.ctx.ellipse(facing * 3 - 2.5, -1, 2.2, 3.1, 0, 0, Math.PI * 2);
    G.ctx.ellipse(facing * 3 + 3.2, -1, 2.2, 3.1, 0, 0, Math.PI * 2);
    G.ctx.fill();
  }
  G.ctx.restore();

  // Articulated Arm & Wrapped Broken Odachi Blade
  if (!isGhost) {
    G.ctx.save();
    G.ctx.translate(facing * 4, -30);
    let bladeAng = facing > 0 ? -0.35 : Math.PI + 0.35;

    if (G.player.parryActive) {
      bladeAng = facing > 0 ? -1.15 : Math.PI + 1.15;
    } else if (G.player.isCharging && G.player.chargeTime > 0.14) {
      // Low sheathed Iai stance
      bladeAng = facing > 0 ? 2.65 : 0.49;
    } else if (G.player.attackTimer > 0) {
      const p = 1 - G.player.attackTimer / G.player.attackDuration;
      if (G.player.attackType === 'pogo') bladeAng = Math.PI * 0.5;
      else if (G.player.attackType === 'up') bladeAng = facing > 0 ? -1.6 : -1.5;
      else if (G.player.attackType === 'slash1') bladeAng = facing > 0 ? (1.2 - p * 2.6) : (Math.PI - 1.2 + p * 2.6);
      else bladeAng = facing > 0 ? (-1.4 + p * 2.8) : (Math.PI + 1.4 - p * 2.8);
    }

    G.ctx.rotate(bladeAng);
    // Hilt & cloth wrap
    G.ctx.strokeStyle = '#9f1239';
    G.ctx.lineWidth = 3.2;
    G.ctx.beginPath(); G.ctx.moveTo(-9, 0); G.ctx.lineTo(4, 0); G.ctx.stroke();
    // Guard (tsuba)
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(4, -5); G.ctx.lineTo(4, 5); G.ctx.stroke();
    // Curved Ashen Blade (Golden Riposte Glint or Crimson Mirror-Ember Free-Seal Glow!)
    const bladeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const bladeSealProc = !!G.player.freeSealProc;
    if (bladeSealProc) {
      drawGlowSprite('crimson', 24, 0, 22, 0.82);
    } else if (bladeGold) {
      drawGlowSprite('gold', 24, 0, 20, 0.72);
    }
    G.ctx.fillStyle = bladeSealProc ? COLORS.crimsonBright : (bladeGold ? COLORS.goldBright : '#d8d2c3');
    G.ctx.strokeStyle = '#090c12';
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(5, -2.6);
    G.ctx.quadraticCurveTo(26, -4.5, 42, -1);
    G.ctx.lineTo(36, 2.5);
    G.ctx.quadraticCurveTo(22, 1.8, 5, 2.2);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    G.ctx.restore();

    // Calligraphic 3-Tier Parry Guard Stance Feedback
    const rsDraw = getRelicStats();
    if (G.player.parryActive) {
      const isPerfectZone = G.player.parryElapsedMs <= rsDraw.parryWindowMs;
      const isBlockZone = G.player.parryElapsedMs <= rsDraw.blockWindowMs;
      const gx = facing * 14;
      const gy = -28;
      const a0 = facing > 0 ? -1.2 : Math.PI - 1.2;
      const a1 = facing > 0 ? 1.2 : Math.PI + 1.2;

      G.ctx.save();
      if (isPerfectZone) {
        const p = Math.min(1, G.player.parryElapsedMs / Math.max(1, rsDraw.parryWindowMs));
        drawGlowSprite('gold', gx + facing * 6, gy, 28, 0.72 * (1 - p * 0.35));
        // Outer ink-gold calligraphic crescent shield
        G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        G.ctx.lineWidth = 7.5;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.goldBright;
        G.ctx.lineWidth = 3.2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
        // Shrinking timing pulse arc
        G.ctx.strokeStyle = '#ffffff';
        G.ctx.lineWidth = 1.6;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 28 - p * 8, a0 + 0.18, a1 - 0.18); G.ctx.stroke();
        // Crisp star glint on blade guard
        drawParryStarGlint(gx + facing * 8, gy - 6, 9 * (1 - p * 0.3), COLORS.goldBright);
      } else if (isBlockZone) {
        drawGlowSprite('cyan', gx + facing * 4, gy, 20, 0.48);
        G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
        G.ctx.lineWidth = 5.5;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.cyanBright;
        G.ctx.lineWidth = 2.2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
      } else {
        // Vulnerable guard recovery — fractured crimson dashed arc
        G.ctx.setLineDash([4, 4]);
        G.ctx.strokeStyle = 'rgba(248, 113, 113, 0.52)';
        G.ctx.lineWidth = 2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 20, a0 + 0.25, a1 - 0.25); G.ctx.stroke();
        G.ctx.setLineDash([]);
      }
      G.ctx.restore();
    }

    // Iai Charge Glint at Waist
    if (G.player.isCharging && G.player.chargeTime > 0.15) {
      const pct = Math.min(1, G.player.chargeTime / rsDraw.iaiChargeTime);
      drawParryStarGlint(-facing * 10, -24, 8 + pct * 14, pct >= 1 ? COLORS.goldBright : COLORS.cyanBright);
    }
  }

  G.ctx.restore(); // End upper body lean pivot
  G.ctx.restore();
}

function drawSlowBladeRing(x, y, stateTimer, windupDuration, color = COLORS.goldBright) {
  if (!windupDuration || windupDuration <= 0.35 || stateTimer <= 0) return;
  const pct = Math.max(0, Math.min(1, stateTimer / windupDuration));
  const r = 10 + pct * 34;
  G.ctx.save();
  G.ctx.strokeStyle = color;
  G.ctx.globalAlpha = 0.32 + (1 - pct) * 0.62;
  G.ctx.lineWidth = pct < 0.35 ? 2.8 : 1.6;
  G.ctx.beginPath();
  G.ctx.arc(x, y, r, 0, Math.PI * 2);
  G.ctx.stroke();
  G.ctx.restore();
}

function drawParryStarGlint(x, y, size, color) {
  G.ctx.save();
  G.ctx.translate(x, y);
  drawGlowSprite(color === COLORS.cyanBright ? 'cyan' : 'gold', 0, 0, size * 1.45, 0.85);
  G.ctx.fillStyle = color;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -size); G.ctx.lineTo(size * 0.22, -size * 0.22);
  G.ctx.lineTo(size, 0); G.ctx.lineTo(size * 0.22, size * 0.22);
  G.ctx.lineTo(0, size); G.ctx.lineTo(-size * 0.22, size * 0.22);
  G.ctx.lineTo(-size, 0); G.ctx.lineTo(-size * 0.22, -size * 0.22);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.restore();
}

function drawExecutionSigil(cx, cy) {
  const pulse = 1 + Math.sin(G.globalTime * 12) * 0.14;
  G.ctx.save();
  G.ctx.translate(cx, cy);
  G.ctx.scale(pulse, pulse);
  G.ctx.fillStyle = 'rgba(220, 38, 38, 0.32)';
  G.ctx.beginPath(); G.ctx.arc(0, 0, 20, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.strokeStyle = COLORS.crimsonBright;
  G.ctx.lineWidth = 2.4;
  boilCircle(G.ctx, 0, 0, 14, 9900, 1.2, 12);
  G.ctx.stroke();
  G.ctx.fillStyle = '#fff';
  G.ctx.font = 'bold 13px "Noto Serif SC", serif';
  G.ctx.textAlign = 'center';
  G.ctx.fillText('斩', 0, 5);
  G.ctx.restore();
}

function drawEnemyOverheadBars(e) {
  if (e.isBoss || !e.alive) return;
  const bw = 48;
  const bx = e.x + e.w / 2 - bw / 2;
  const by = e.y - 18;
  G.ctx.fillStyle = 'rgba(6, 9, 14, 0.85)';
  G.ctx.fillRect(bx, by, bw, 5);
  G.ctx.fillStyle = '#c8323e';
  G.ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 5);
  G.ctx.fillStyle = 'rgba(6, 9, 14, 0.85)';
  G.ctx.fillRect(bx, by + 6, bw, 3.5);
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.fillRect(bx, by + 6, bw * (e.posture / e.maxPosture), 3.5);
}

/* ---------- ENEMIES: SENTINEL, WRAITH, GOLEM, PRIEST, DUELIST, LEECH ---------- */
function drawEnemy(e) {
  if (!e.alive) return;
  if (e.kind === 'wraith') drawWraith(e);
  else if (e.kind === 'golem') drawGolem(e);
  else if (e.kind === 'priest') drawPriest(e);
  else if (e.kind === 'duelist') drawDuelist(e);
  else if (e.kind === 'leech') drawLeech(e);
  else drawSentinel(e);
  if (e.wardShield > 0) drawWardShieldOverlay(e);
}

function drawWardShieldOverlay(e) {
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const rx = e.w * 0.85;
  const ry = e.h * 0.66;
  const pulse = 0.85 + Math.sin(G.globalTime * 9) * 0.15;
  G.ctx.save();
  drawGlowSprite('gold', cx, cy, Math.max(rx, ry) * 1.15, 0.36 * pulse);
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.stroke();
  G.ctx.restore();
}

function drawPriest(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isChant = e.state === 'chant';
  G.ctx.save();

  // Golden Bell-Chant Tether Beam to Blessed Ally
  if (isChant && e.chantTargetId) {
    const ally = G.enemies.find(a => a && a.alive && a.id === e.chantTargetId);
    if (ally) {
      G.ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
      G.ctx.lineWidth = 2.2;
      boilLine(G.ctx, cx, e.y + 8, ally.x + ally.w * 0.5, ally.y + ally.h * 0.45, 9200, 3.2, 6);
    }
  }

  drawCloakMesh(e.cloak, '#1d1626', 'rgba(253, 224, 71, 0.48)', 15, 610);
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 9);

  // Floating Golden Bell Halo behind Mitre
  drawGlowSprite('gold', 0, -56, isChant ? 38 : 22, isChant ? 0.78 : 0.42);
  G.ctx.strokeStyle = isChant ? COLORS.goldBright : 'rgba(245, 158, 11, 0.58)';
  G.ctx.lineWidth = isChant ? 2.2 : 1.4;
  boilCircle(G.ctx, 0, -56, isChant ? 19 : 14, 9240, 1.0, 14);
  G.ctx.stroke();

  // Tall Ceremonial Robe
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1f182c';
  G.ctx.strokeStyle = isChant ? COLORS.goldBright : 'rgba(216, 207, 184, 0.78)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-15, 0); G.ctx.lineTo(-10, -48); G.ctx.lineTo(10, -48); G.ctx.lineTo(15, 0);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  // Gold Stole Trim
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath(); G.ctx.moveTo(0, -46); G.ctx.lineTo(0, -4); G.ctx.stroke();

  // Tall Split Bell-Mitre Hat
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#2a2238';
  G.ctx.beginPath();
  G.ctx.moveTo(-9, -48); G.ctx.lineTo(-7, -72); G.ctx.lineTo(0, -64); G.ctx.lineTo(7, -72); G.ctx.lineTo(9, -48);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -6, -54, 5, 2.5);

  // Bronze Chime Staff
  const shake = isChant ? Math.sin(G.globalTime * 28) * 0.18 : 0;
  G.ctx.save();
  G.ctx.translate(e.facing * 14, -36);
  G.ctx.rotate(shake);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, 32); G.ctx.lineTo(0, -28); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.gold;
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.moveTo(-4, -28); G.ctx.lineTo(4, -28); G.ctx.lineTo(8, -16); G.ctx.lineTo(-8, -16); G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'pulse' && e.stateTimer < 0.28) {
    drawParryStarGlint(0, -42, 20, COLORS.goldBright);
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 32);
}

function drawDuelist(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redDash' && (e.state === 'windup' || e.state === 'attack');
  G.ctx.save();

  drawCloakMesh(e.cloak, '#3b111c', 'rgba(248, 113, 113, 0.55)', 12, 740);
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 10);

  // 2-Bone IK Agile Stride Legs
  const dWalk = e.walkCycle || 0;
  const dMoving = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = dWalk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 12 : (dMoving ? Math.sin(ph) * 13 : side * 7);
    const fyL = isStagger ? 0 : (dMoving ? -Math.max(0, Math.cos(ph)) * 7 : 0);
    const ik = solve2BoneIK(side * 3.5, -20, fx, fyL, 11, 11, e.facing);
    G.ctx.strokeStyle = side < 0 ? 'rgba(150, 142, 130, 0.82)' : COLORS.parchment;
    G.ctx.lineWidth = 3.1;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 3.5, -20); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // Lean Ronin Haori Torso
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#141824';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.82)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -15); G.ctx.lineTo(-9, -43); G.ctx.lineTo(9, -43); G.ctx.lineTo(11, -15);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  // Bamboo-Iron Conical Kasa Hat
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1e2434';
  G.ctx.beginPath();
  G.ctx.moveTo(-21, -48); G.ctx.lineTo(0, -64); G.ctx.lineTo(21, -48); G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Fierce Glowing Slit Eyes under Hat
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -8, -48, 7, 2.5);

  // Twin Curved Dark Blades
  const drawDuelBlade = (ox, oy, ang) => {
    G.ctx.save();
    G.ctx.translate(ox, oy);
    G.ctx.rotate(ang);
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (e.comboIdx === 2 && e.state === 'windup' ? COLORS.goldBright : '#e2dccb');
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.quadraticCurveTo(22, -4, 42, 0); G.ctx.stroke();
    G.ctx.restore();
  };
  let a1 = e.facing > 0 ? -0.45 : Math.PI + 0.45;
  let a2 = e.facing > 0 ? 0.55 : Math.PI - 0.55;
  if (e.state === 'windup') {
    a1 = e.facing > 0 ? -2.2 : Math.PI + 2.2;
    a2 = e.facing > 0 ? 2.1 : Math.PI - 2.1;
  } else if (e.state === 'attack') {
    a1 = e.facing > 0 ? 0.25 : Math.PI - 0.25;
    a2 = e.facing > 0 ? -0.35 : Math.PI + 0.35;
  }
  drawDuelBlade(-e.facing * 6, -32, a2);
  drawDuelBlade(e.facing * 8, -32, a1);

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -76, 20, 0.78);
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.font = 'bold 22px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillText('危', 0, -70);
    } else if (e.stateTimer < 0.23) {
      drawParryStarGlint(e.facing * 18, -34, e.comboIdx === 2 ? 22 : 16, COLORS.goldBright);
    }
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 28);
}

function drawLeech(e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const isStagger = e.state === 'stagger';
  const isCeiling = e.state === 'cling' || e.state === 'telegraph';
  const pulse = 1 + Math.sin(e.pulsePhase) * 0.08;
  G.ctx.save();
  G.ctx.translate(cx, cy);
  if (isCeiling) G.ctx.scale(pulse, 1 / pulse);
  else G.ctx.scale(1 / pulse, pulse);

  // Hanging ink tendrils
  G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  G.ctx.lineWidth = 1.6;
  for (let k = -1; k <= 1; k++) {
    const sw = Math.sin(G.globalTime * 7 + k * 1.4) * 4;
    G.ctx.beginPath();
    G.ctx.moveTo(k * 7, isCeiling ? 10 : -10);
    G.ctx.quadraticCurveTo(k * 9 + sw, isCeiling ? 19 : -19, k * 6 - sw, isCeiling ? 26 : -24);
    G.ctx.stroke();
  }

  // Glossy Abyssal Ink Sac Body
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f1626';
  G.ctx.strokeStyle = e.state === 'telegraph' || e.state === 'drop' ? COLORS.crimsonBright : COLORS.cyan;
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.ellipse(0, 0, 16, 15, 0, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  // Cluster of Eerie Ambush Eyes
  drawGlowSprite(e.state === 'telegraph' ? 'gold' : 'crimson', 0, isCeiling ? 4 : -2, 14, 0.65);
  G.ctx.fillStyle = e.state === 'telegraph' ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath();
  G.ctx.arc(-5, isCeiling ? 4 : -2, 2.4, 0, Math.PI * 2);
  G.ctx.arc(5, isCeiling ? 4 : -2, 2.4, 0, Math.PI * 2);
  G.ctx.arc(0, isCeiling ? 8 : -6, 1.8, 0, Math.PI * 2);
  G.ctx.fill();

  if (e.state === 'telegraph') {
    drawParryStarGlint(0, 16, 17, COLORS.goldBright);
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, cy);
}

function drawGolem(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redBash' && (e.state === 'windup' || e.state === 'attack');
  const shieldUp = !isStagger && e.shieldBrokenTimer <= 0 && (e.state === 'patrol' || e.state === 'chase' || e.state === 'recover');

  G.ctx.save();
  drawCloakMesh(e.cloak, '#141925', 'rgba(216, 207, 184, 0.35)', 18, 520);

  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 10);

  // Broad Iron Bell-Guard Armor
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1a2232';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.78)';
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-19, 0);
  G.ctx.lineTo(-17, -56);
  G.ctx.lineTo(17, -56);
  G.ctx.lineTo(19, 0);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Bell-Dome Greathelm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#262d3d';
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -56);
  G.ctx.quadraticCurveTo(-15, -78, 0, -82);
  G.ctx.quadraticCurveTo(15, -78, 14, -56);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Eye Slit
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 2 : -10, -67, 8, 3);

  // Heavy Bronze Censer Mace (back hand)
  G.ctx.save();
  G.ctx.translate(-e.facing * 8, -46);
  let maceAng = e.facing > 0 ? -0.8 : Math.PI + 0.8;
  if (e.state === 'windup' && e.attackKind === 'smash') maceAng = e.facing > 0 ? -2.35 : Math.PI + 2.35;
  else if (e.state === 'attack' && e.attackKind === 'smash') maceAng = e.facing > 0 ? 0.35 : Math.PI - 0.35;
  G.ctx.rotate(maceAng);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 3.2;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(52, 0); G.ctx.stroke();
  G.ctx.fillStyle = '#3b2c1a';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath(); G.ctx.arc(56, 0, 10, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  // Towering Front Bronze Bell-Shield!
  G.ctx.save();
  const shX = shieldUp ? e.facing * 20 : e.facing * 12;
  const shY = shieldUp ? -36 : -28;
  G.ctx.translate(shX, shY);
  if (!shieldUp) G.ctx.rotate(e.facing * 0.45);
  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#2e2419';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : shieldUp ? COLORS.goldBright : 'rgba(216, 207, 184, 0.5)';
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath();
  G.ctx.moveTo(-7, -28);
  G.ctx.lineTo(7, -28);
  G.ctx.lineTo(10, 22);
  G.ctx.lineTo(0, 32);
  G.ctx.lineTo(-10, 22);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  // Shield emblem crack
  G.ctx.strokeStyle = shieldUp ? COLORS.gold : 'rgba(148, 163, 184, 0.4)';
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, -18); G.ctx.lineTo(0, 18); G.ctx.stroke();
  G.ctx.restore();

  // Telegraph
  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -96, 22, 0.75);
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.font = 'bold 24px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillText('危', 0, -88);
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 16, -72, 20, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 36);
}

function drawWraith(e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const isStagger = e.state === 'stagger';
  G.ctx.save();

  drawGlowSprite(e.state === 'windup' ? 'gold' : 'cyan', cx, cy, 50, e.state === 'windup' ? 0.34 : 0.22);

  drawCloakMesh(e.cloak, '#121826', 'rgba(125, 211, 252, 0.42)', 13, 680);

  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#161e2e';
  G.ctx.strokeStyle = e.state === 'windup' ? COLORS.goldBright : 'rgba(216, 207, 184, 0.65)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(cx, e.y - 4);
  G.ctx.quadraticCurveTo(cx + 18, e.y + 10, cx + 15, e.y + 40);
  G.ctx.lineTo(cx + 6, e.y + 34);
  G.ctx.lineTo(cx, e.y + 46);
  G.ctx.lineTo(cx - 7, e.y + 34);
  G.ctx.lineTo(cx - 15, e.y + 40);
  G.ctx.quadraticCurveTo(cx - 18, e.y + 10, cx, e.y - 4);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.fillStyle = '#090c12';
  G.ctx.beginPath(); G.ctx.ellipse(cx + e.facing * 3, e.y + 15, 7, 9, 0, 0, Math.PI * 2); G.ctx.fill();
  drawGlowSprite(e.state === 'windup' ? 'gold' : 'crimson', cx + e.facing * 3.5, e.y + 14, 12, 0.72);
  G.ctx.fillStyle = e.state === 'windup' ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath();
  G.ctx.arc(cx + e.facing * 1, e.y + 14, 2.2, 0, Math.PI * 2);
  G.ctx.arc(cx + e.facing * 6, e.y + 14, 2.2, 0, Math.PI * 2);
  G.ctx.fill();

  const lx = cx + e.facing * 19;
  const ly = e.y + 22 + Math.sin(G.globalTime * 6 + e.bobPhase) * 3;
  G.ctx.fillStyle = e.state === 'windup' ? COLORS.goldBright : '#f43f5e';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.arc(lx, ly, e.state === 'windup' ? 7 : 5, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();

  if (e.state === 'windup' && e.stateTimer < 0.25) drawParryStarGlint(lx, ly, 18, COLORS.goldBright);
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, cy);
  G.ctx.restore();
}

function drawSentinel(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redLunge' && (e.state === 'windup' || e.state === 'attack');
  G.ctx.save();

  drawCloakMesh(e.cloak, '#141926', 'rgba(216, 207, 184, 0.35)', 15, 420);

  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 8);

  // 2-Bone IK Striding Legs beneath Tattered Sentinel Robe
  const sWalk = e.walkCycle || 0;
  const sMoving = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = sWalk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 10 : (sMoving ? Math.sin(ph) * 11 : side * 6);
    const fyL = isStagger ? 0 : (sMoving ? -Math.max(0, Math.cos(ph)) * 6 : 0);
    const ik = solve2BoneIK(side * 3.5, -18, fx, fyL, 10.5, 10.5, e.facing);
    G.ctx.strokeStyle = side < 0 ? 'rgba(148, 140, 122, 0.8)' : 'rgba(216, 207, 184, 0.9)';
    G.ctx.lineWidth = 3.2;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(side * 3.5, -18); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.stroke();
  });

  // Tattered Priest Robe & Armor
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#182030';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.72)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -12);
  G.ctx.lineTo(-10, -44);
  G.ctx.lineTo(10, -44);
  G.ctx.lineTo(14, -12);
  G.ctx.lineTo(6, -16);
  G.ctx.lineTo(0, -10);
  G.ctx.lineTo(-6, -16);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Pointed Iron Cage Helm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#242d3f';
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -44);
  G.ctx.lineTo(0, -68);
  G.ctx.lineTo(10, -44);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Eye Slit
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -7, -51, 6, 2.5);

  // Long Spear with Swaying Pennon
  const spearPull = e.state === 'windup' ? -18 : e.state === 'attack' ? 36 : 0;
  const sx = e.facing * (-28 + spearPull);
  const ex = e.facing * (54 + spearPull);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 2.6;
  G.ctx.beginPath(); G.ctx.moveTo(sx, -28); G.ctx.lineTo(ex, -28); G.ctx.stroke();

  // Spearhead
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#e2dccb';
  G.ctx.beginPath();
  G.ctx.moveTo(ex, -33);
  G.ctx.lineTo(ex + e.facing * 18, -28);
  G.ctx.lineTo(ex, -23);
  G.ctx.closePath();
  G.ctx.fill();

  // Telegraph Signal
  if (e.state === 'windup') {
    if (isRed) {
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.font = 'bold 22px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillText('危', 0, -76);
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(ex + e.facing * 10, -28, 19, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 28);
}

/* ---------- BOSS: 断钟骑士 · 晦 ---------- */
function drawBoss(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isRed = (b.moveKind === 'redLeap' || b.moveKind === 'inkTide') && (b.state === 'windup' || b.state === 'strike');

  G.ctx.save();
  drawCloakMesh(b.cloak, isP2 ? '#290d14' : '#131722', isP2 ? 'rgba(248, 113, 113, 0.5)' : 'rgba(216, 207, 184, 0.4)', 26, 800);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  const bCrouch = isStagger ? 15 : (b.state === 'windup' && (b.moveKind === 'redLeap' || b.moveKind === 'chargeThrust')) ? 8 : 0;

  // Heavy 2-Bone IK Armored Greaves (Kneels on one knee when Posture-Broken!)
  const bHipY = -31 + bCrouch;
  const bWalk = b.walkCycle || 0;
  const bMoving = Math.abs(b.vx) > 20 && b.grounded;
  const drawBossLeg = (isFront) => {
    const hx = (isFront ? 1 : -1) * b.facing * 9;
    let tx, ty;
    if (isStagger) {
      // Dramatic posture-break kneel: front foot braced forward, rear knee resting on floor
      tx = isFront ? b.facing * 18 : -b.facing * 22;
      ty = 0;
    } else if (!b.grounded) {
      tx = isFront ? b.facing * 16 : -b.facing * 14;
      ty = isFront ? -10 : -4;
    } else if (bMoving) {
      const ph = bWalk + (isFront ? 0 : Math.PI);
      tx = Math.sin(ph) * 20;
      ty = -Math.max(0, Math.cos(ph)) * 10;
    } else {
      const spread = bCrouch > 0 ? 18 : 13;
      tx = isFront ? b.facing * spread : -b.facing * spread;
      ty = 0;
    }
    const ik = solve2BoneIK(hx, bHipY, tx, ty, 17.5, 17.5, b.facing);
    G.ctx.strokeStyle = isFront ? (isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.85)') : 'rgba(130, 125, 114, 0.72)';
    G.ctx.lineWidth = 7.5;
    G.ctx.lineCap = 'round';
    G.ctx.lineJoin = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(hx, bHipY); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.stroke();
    // Inner dark plate fill + armored knee guard rivet
    G.ctx.strokeStyle = '#141925';
    G.ctx.lineWidth = 4.2;
    G.ctx.stroke();
    G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.gold;
    G.ctx.beginPath(); G.ctx.arc(ik.kx, ik.ky, 3, 0, Math.PI * 2); G.ctx.fill();
  };
  drawBossLeg(false);
  drawBossLeg(true);

  G.ctx.save();
  G.ctx.translate(0, bCrouch);

  // Chained Cracked Bronze Bell on Back
  G.ctx.save();
  G.ctx.translate(-b.facing * 20, -68);
  G.ctx.rotate(b.bellSwing);
  G.ctx.fillStyle = '#2d2318';
  G.ctx.strokeStyle = isP2 ? COLORS.crimsonBright : COLORS.gold;
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -16);
  G.ctx.lineTo(10, -16);
  G.ctx.quadraticCurveTo(18, 8, 22, 22);
  G.ctx.lineTo(-22, 22);
  G.ctx.quadraticCurveTo(-18, 8, -10, -16);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  // Glowing crack in back bell
  G.ctx.strokeStyle = isP2 ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.moveTo(2, -6); G.ctx.lineTo(-4, 6); G.ctx.lineTo(3, 18); G.ctx.stroke();
  G.ctx.restore();

  // Heavy Gothic Cuirass & Armored Tassets (exposing IK greaves below y=-26)
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#171c28';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.78)';
  G.ctx.lineWidth = 2.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-23, -24);
  G.ctx.lineTo(-22, -74);
  G.ctx.lineTo(22, -74);
  G.ctx.lineTo(23, -24);
  G.ctx.lineTo(10, -30);
  G.ctx.lineTo(0, -21);
  G.ctx.lineTo(-10, -30);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Spiked Pauldrons
  G.ctx.fillStyle = '#222838';
  G.ctx.beginPath();
  G.ctx.moveTo(-32, -66); G.ctx.lineTo(-14, -84); G.ctx.lineTo(14, -84); G.ctx.lineTo(32, -66);
  G.ctx.lineTo(20, -56); G.ctx.lineTo(-20, -56);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Horned Crown Greathelm
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#1d2230';
  G.ctx.beginPath();
  G.ctx.moveTo(-15, -78);
  G.ctx.lineTo(-13, -102);
  G.ctx.lineTo(-22, -118); // Left jagged crown horn
  G.ctx.lineTo(-6, -104);
  G.ctx.lineTo(6, -104);
  G.ctx.lineTo(22, -118); // Right horn
  G.ctx.lineTo(13, -102);
  G.ctx.lineTo(15, -78);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Visor Glow
  drawGlowSprite(isP2 ? 'crimson' : 'gold', b.facing > 0 ? 6 : -6, -91.5, 16, 0.78);
  G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(b.facing > 0 ? 1 : -11, -93, 10, 3.5);

  // Massive Rune Greatsword (Distinct Silhouettes per Move!)
  G.ctx.save();
  let handX = b.facing * 12;
  let handY = -56;
  let swAng = b.facing > 0 ? 0.5 : Math.PI - 0.5;
  if (b.state === 'windup') {
    if (b.moveKind === 'inkTide') {
      // Plunge sword downward into the chapel stones to summon the tide
      handX = b.facing * 6;
      handY = -52;
      swAng = Math.PI * 0.5 + Math.sin(G.globalTime * 36) * 0.04;
    } else if (b.moveKind === 'chargeThrust') {
      // Low crouched horizontal spear-pullback
      handX = -b.facing * 16;
      handY = -42;
      swAng = b.facing > 0 ? -0.02 : Math.PI + 0.02;
    } else if (b.moveKind === 'delaySlam') {
      // Towering overhead hold with trembling tension
      handX = -b.facing * 6;
      handY = -72;
      const tremor = Math.sin(G.globalTime * 42) * 0.05;
      swAng = (b.facing > 0 ? -2.55 : Math.PI + 2.55) + tremor;
    } else if (b.moveKind === 'redLeap') {
      // Deep coiled crouch before crimson aerial leap
      handX = -b.facing * 10;
      handY = -44;
      swAng = b.facing > 0 ? -2.1 : Math.PI + 2.1;
    } else if (b.comboIdx % 2 === 1) {
      // Low backhand upward-sweep windup
      handX = -b.facing * 8;
      handY = -36;
      swAng = b.facing > 0 ? 2.35 : Math.PI - 2.35;
    } else {
      // High sweeping slash windup
      swAng = b.facing > 0 ? -1.95 : Math.PI + 1.95;
    }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'inkTide') {
      handX = b.facing * 6;
      handY = -46;
      swAng = Math.PI * 0.5;
    } else if (b.moveKind === 'chargeThrust') {
      handX = b.facing * 24;
      handY = -44;
      swAng = b.facing > 0 ? 0.0 : Math.PI;
    } else if (b.comboIdx % 2 === 1 && (b.moveKind === 'combo2' || b.moveKind === 'flurry4')) {
      swAng = b.facing > 0 ? -0.55 : Math.PI + 0.55;
    } else {
      swAng = b.facing > 0 ? 0.28 : Math.PI - 0.28;
    }
  } else if (isStagger) {
    swAng = Math.PI * 0.5;
  }
  G.ctx.translate(handX, handY);
  G.ctx.rotate(swAng);

  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#2a303f';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.parchment;
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -6);
  G.ctx.lineTo(88, -8);
  G.ctx.lineTo(106, 0);
  G.ctx.lineTo(88, 8);
  G.ctx.lineTo(0, 6);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Sword Runes
  G.ctx.strokeStyle = isP2 || isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath(); G.ctx.moveTo(16, 0); G.ctx.lineTo(78, 0); G.ctx.stroke();
  G.ctx.restore();

  // Boss Attack Telegraph
  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -138, b.moveKind === 'inkTide' ? 48 : 30, 0.85);
      G.ctx.font = 'bold 30px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillStyle = '#06080d';
      G.ctx.fillText(b.moveKind === 'inkTide' ? '危 · 墨潮' : '危', 2, -126);
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.fillText(b.moveKind === 'inkTide' ? '危 · 墨潮' : '危', 0, -128);
    } else {
      if (b.isDelayedHit) drawSlowBladeRing(b.facing * 26, -92, b.stateTimer, b.windupDuration, COLORS.goldBright);
      if (b.stateTimer < 0.24) drawParryStarGlint(b.facing * 26, -92, b.isDelayedHit ? 28 : 24, COLORS.goldBright);
    }
  }

  G.ctx.restore(); // End bCrouch upper body
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 46);
}

/* ---------- BOSS 2: 沉渊铸钟师 · 寂 ---------- */
function drawBoss2(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isRed = (b.moveKind === 'redSweepHook' || b.moveKind === 'resonanceNova') && (b.state === 'windup' || b.state === 'strike');

  G.ctx.save();
  // Ambient furnace aura
  drawGlowSprite(isP2 ? 'gold' : 'cyan', cx, cy, isP2 ? 84 : 62, isP2 ? 0.5 : 0.32);
  drawCloakMesh(b.cloak, isP2 ? '#29150d' : '#111827', isP2 ? 'rgba(253, 224, 71, 0.55)' : 'rgba(125, 211, 252, 0.42)', 24, 920);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 12);

  // 3 Orbiting Miniature Cracked Bronze Bells
  for (let i = 0; i < 3; i++) {
    const ang = b.orbitAngle + (i * Math.PI * 2) / 3;
    const ox = Math.cos(ang) * 44;
    const oy = -52 + Math.sin(ang) * 20;
    G.ctx.save();
    G.ctx.translate(ox, oy);
    G.ctx.fillStyle = '#2d2215';
    G.ctx.strokeStyle = isP2 || isRed ? COLORS.goldBright : COLORS.gold;
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    G.ctx.moveTo(-5, -8); G.ctx.lineTo(5, -8); G.ctx.lineTo(9, 7); G.ctx.lineTo(-9, 7);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.cyanBright;
    G.ctx.beginPath(); G.ctx.arc(0, 6, 2.2, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  }

  // Flowing Floating Bellfounder Robes
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#141a26';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (isP2 ? COLORS.goldBright : 'rgba(216, 207, 184, 0.78)');
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-20, -4);
  G.ctx.quadraticCurveTo(-24, -44, -18, -74);
  G.ctx.lineTo(18, -74);
  G.ctx.quadraticCurveTo(24, -44, 20, -4);
  G.ctx.lineTo(9, -14);
  G.ctx.lineTo(0, -2);
  G.ctx.lineTo(-9, -14);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Foundry Furnace Core in Chest
  drawGlowSprite(isP2 ? 'crimson' : 'gold', 0, -46, 20, 0.78);
  G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -56); G.ctx.lineTo(8, -46); G.ctx.lineTo(0, -36); G.ctx.lineTo(-8, -46);
  G.ctx.closePath();
  G.ctx.fill();

  // Tall Iron Foundry Mitre / Bell-Crown Mask
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#1e2330';
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -72);
  G.ctx.lineTo(-10, -104);
  G.ctx.lineTo(0, -118);
  G.ctx.lineTo(10, -104);
  G.ctx.lineTo(14, -72);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Three Glowing Eye-Slits
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(b.facing * 2 - 6, -86, 4, 2.5);
  G.ctx.fillRect(b.facing * 2 + 2, -86, 4, 2.5);
  G.ctx.fillRect(b.facing * 2 - 2, -93, 4, 2.5);

  // Chained Bronze Foundry Censer-Hammer
  G.ctx.save();
  const censerAng = b.state === 'strike' && b.moveKind === 'redSweepHook'
    ? (b.facing > 0 ? 0.1 : Math.PI - 0.1)
    : b.state === 'windup' && b.moveKind === 'chainDropSlam'
      ? Math.PI * 0.5
      : (b.facing > 0 ? -0.45 : Math.PI + 0.45) + Math.sin(G.globalTime * 5) * 0.12;
  G.ctx.translate(b.facing * 14, -50);
  G.ctx.rotate(censerAng);
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.65)';
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(48, 0); G.ctx.stroke();
  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#3b2816';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(46, -12); G.ctx.lineTo(66, -16); G.ctx.lineTo(74, 0); G.ctx.lineTo(66, 16); G.ctx.lineTo(46, 12);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  G.ctx.restore();

  // Translucent Bronze Resonance Bell Shield during bellShieldCharge
  if (b.shieldUp && !isStagger) {
    G.ctx.save();
    drawGlowSprite('gold', b.facing * 26, -48, 42, 0.72);
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.fillStyle = 'rgba(245, 158, 11, 0.24)';
    G.ctx.lineWidth = 3;
    G.ctx.beginPath();
    G.ctx.arc(b.facing * 10, -48, 48, b.facing > 0 ? -1.15 : Math.PI - 1.15, b.facing > 0 ? 1.15 : Math.PI + 1.15);
    G.ctx.stroke();
    G.ctx.fill();
    G.ctx.restore();
  }

  // Telegraph Signal
  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -138, b.moveKind === 'resonanceNova' ? 48 : 30, 0.85);
      G.ctx.font = 'bold 28px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillStyle = '#06080d';
      G.ctx.fillText(b.moveKind === 'resonanceNova' ? '危 · 共振' : '危', 2, -126);
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.fillText(b.moveKind === 'resonanceNova' ? '危 · 共振' : '危', 0, -128);
    } else if (b.stateTimer < 0.25) {
      drawParryStarGlint(b.facing * 26, -88, 24, COLORS.goldBright);
    }
  }

  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 44);
}

/* ---------- FINAL BOSS: 初钟圣骸 · 渊 ---------- */
function drawBoss3(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isP3 = b.phase >= 3;
  const isRed = (b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter' || b.moveKind === 'eclipseTide') && (b.state === 'windup' || b.state === 'strike');

  G.ctx.save();
  G.ctx.globalAlpha = Math.max(0.15, b.blinkAlpha !== undefined ? b.blinkAlpha : 1);
  drawGlowSprite(isP3 ? 'gold' : isP2 ? 'violet' : 'crimson', cx, b.y + 52, isP3 ? 96 : 72, isP3 ? 0.56 : 0.36);
  drawCloakMesh(b.cloak, isP3 ? '#3b150e' : isP2 ? '#23102e' : '#16131f', isP3 ? 'rgba(254, 240, 138, 0.72)' : isP2 ? 'rgba(216, 180, 254, 0.58)' : 'rgba(245, 158, 11, 0.48)', 30, 960);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 7 : 0;
  G.ctx.translate(cx + joltX, fy);
  const crouch = isStagger ? 16 : (b.state === 'windup' && (b.moveKind === 'skyShatter' || b.moveKind === 'eclipseThrust')) ? 9 : 0;

  // 2-Bone IK Sovereign Greaves
  const hipY = -34 + crouch;
  const wCyc = b.walkCycle || 0;
  const moving = Math.abs(b.vx) > 20 && b.grounded;
  [false, true].forEach(isFront => {
    const hx = (isFront ? 1 : -1) * b.facing * 10;
    let tx, ty;
    if (isStagger) { tx = isFront ? b.facing * 20 : -b.facing * 24; ty = 0; }
    else if (!b.grounded) { tx = isFront ? b.facing * 18 : -b.facing * 14; ty = isFront ? -12 : -5; }
    else if (moving) { const ph = wCyc + (isFront ? 0 : Math.PI); tx = Math.sin(ph) * 22; ty = -Math.max(0, Math.cos(ph)) * 11; }
    else { tx = (isFront ? 1 : -1) * b.facing * 15; ty = 0; }
    const ik = solve2BoneIK(hx, hipY, tx, ty, 19, 19, b.facing);
    G.ctx.strokeStyle = isFront ? (isP3 ? COLORS.goldBright : COLORS.parchment) : 'rgba(148, 138, 124, 0.72)';
    G.ctx.lineWidth = 7.8;
    G.ctx.lineCap = 'round'; G.ctx.lineJoin = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(hx, hipY); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
    G.ctx.strokeStyle = '#12101a'; G.ctx.lineWidth = 4.2; G.ctx.stroke();
  });

  G.ctx.save();
  G.ctx.translate(0, crouch);
  // Fractured Astral Halo behind Sovereign
  G.ctx.save();
  G.ctx.translate(0, -86);
  G.ctx.rotate(b.haloAngle || 0);
  G.ctx.strokeStyle = isP3 ? '#fef9c3' : isP2 ? COLORS.violetBright : COLORS.goldBright;
  G.ctx.lineWidth = isP3 ? 2.6 : 1.9;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    G.ctx.beginPath(); G.ctx.arc(0, 0, 42, a + 0.16, a + Math.PI * 0.5 - 0.16); G.ctx.stroke();
  }
  G.ctx.restore();

  // Sovereign Bronze-Bone Torso & Ribbed Bell-Armor
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#171320';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (isP3 ? COLORS.goldBright : 'rgba(216, 207, 184, 0.85)');
  G.ctx.lineWidth = 2.3;
  G.ctx.beginPath();
  G.ctx.moveTo(-24, -26); G.ctx.lineTo(-26, -82); G.ctx.lineTo(26, -82); G.ctx.lineTo(24, -26);
  G.ctx.lineTo(12, -32); G.ctx.lineTo(0, -20); G.ctx.lineTo(-12, -32);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  // Glowing First-Bell Heart Core in Chest
  drawGlowSprite(isP3 ? 'gold' : isP2 ? 'violet' : 'crimson', 0, -56, 24, 0.85);
  G.ctx.fillStyle = isP3 ? '#fef9c3' : isP2 ? COLORS.violetBright : COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.moveTo(0, -68); G.ctx.lineTo(10, -56); G.ctx.lineTo(0, -44); G.ctx.lineTo(-10, -56); G.ctx.closePath(); G.ctx.fill();

  // Eclipse Bell-Crown Helm
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#201a2a';
  G.ctx.beginPath();
  G.ctx.moveTo(-16, -84); G.ctx.lineTo(-14, -108); G.ctx.lineTo(-26, -128); G.ctx.lineTo(-8, -112);
  G.ctx.lineTo(0, -132); G.ctx.lineTo(8, -112); G.ctx.lineTo(26, -128); G.ctx.lineTo(14, -108); G.ctx.lineTo(16, -84);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = isP3 ? '#ffffff' : (isP2 ? COLORS.violetBright : COLORS.goldBright);
  G.ctx.fillRect(b.facing > 0 ? 1 : -12, -98, 11, 3.5);

  // Primeval Bell-Halberd Greatsword
  G.ctx.save();
  let handX = b.facing * 14, handY = -60;
  let swAng = b.facing > 0 ? 0.45 : Math.PI - 0.45;
  if (b.state === 'windup') {
    if (b.moveKind === 'eclipseTide') { handX = b.facing * 6; handY = -56; swAng = Math.PI * 0.5; }
    else if (b.moveKind === 'eclipseThrust') { handX = -b.facing * 18; handY = -48; swAng = b.facing > 0 ? 0 : Math.PI; }
    else if (b.comboIdx % 2 === 1) { handX = -b.facing * 8; handY = -38; swAng = b.facing > 0 ? 2.3 : Math.PI - 2.3; }
    else { swAng = b.facing > 0 ? -2.25 : Math.PI + 2.25; }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'eclipseTide') { swAng = Math.PI * 0.5; }
    else if (b.moveKind === 'eclipseThrust') { handX = b.facing * 26; swAng = b.facing > 0 ? 0 : Math.PI; }
    else if (b.comboIdx % 2 === 1) { swAng = b.facing > 0 ? -0.5 : Math.PI + 0.5; }
    else { swAng = b.facing > 0 ? 0.25 : Math.PI - 0.25; }
  } else if (isStagger) { swAng = Math.PI * 0.5; }
  G.ctx.translate(handX, handY); G.ctx.rotate(swAng);
  G.ctx.fillStyle = isRed ? '#7f1d1d' : (isP3 ? '#452b11' : '#262133');
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (isP3 ? '#fef08a' : COLORS.goldBright);
  G.ctx.lineWidth = 2.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -5); G.ctx.lineTo(96, -9); G.ctx.lineTo(122, 0); G.ctx.lineTo(96, 9); G.ctx.lineTo(-14, 5);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.strokeStyle = isP3 ? '#ffffff' : (isP2 ? COLORS.violetBright : COLORS.goldBright);
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath(); G.ctx.moveTo(14, 0); G.ctx.lineTo(92, 0); G.ctx.stroke();
  G.ctx.restore();

  // Telegraph Signal
  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -148, b.moveKind === 'eclipseTide' ? 52 : 34, 0.88);
      G.ctx.font = 'bold 30px "Noto Serif SC", serif';
      G.ctx.textAlign = 'center';
      G.ctx.fillStyle = '#06080d';
      G.ctx.fillText(b.moveKind === 'eclipseTide' ? '危 · 终末钟潮' : '危', 2, -138);
      G.ctx.fillStyle = COLORS.crimsonBright;
      G.ctx.fillText(b.moveKind === 'eclipseTide' ? '危 · 终末钟潮' : '危', 0, -140);
    } else {
      if (b.isDelayedHit) drawSlowBladeRing(b.facing * 28, -96, b.stateTimer, b.windupDuration, b.phase >= 2 ? COLORS.goldBright : COLORS.parchment);
      if (b.stateTimer < 0.25) drawParryStarGlint(b.facing * 28, -96, b.isDelayedHit ? 30 : 26, COLORS.goldBright);
    }
  }

  G.ctx.restore();
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 50);
}

function drawBossBanner() {
  if (!G.bossBanner || G.bossBanner.life <= 0) return;
  const b = G.bossBanner;
  const p = 1 - b.life / b.maxLife;
  const alpha = p < 0.14 ? (p / 0.14) : (b.life < 0.45 ? (b.life / 0.45) : 1);
  const cx = G.canvasW * 0.5;
  const cy = Math.min(132, G.canvasH * 0.20);
  G.ctx.save();
  G.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const grad = G.ctx.createLinearGradient(cx - 280, cy, cx + 280, cy);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.22, 'rgba(7, 10, 16, 0.84)');
  grad.addColorStop(0.78, 'rgba(7, 10, 16, 0.84)');
  grad.addColorStop(1, 'transparent');
  G.ctx.fillStyle = grad;
  G.ctx.fillRect(cx - 280, cy - 34, 560, b.quote ? 74 : 52);
  G.ctx.strokeStyle = b.color || COLORS.goldBright;
  G.ctx.lineWidth = 1.2;
  G.ctx.beginPath();
  G.ctx.moveTo(cx - 190, cy - 32); G.ctx.lineTo(cx + 190, cy - 32);
  G.ctx.moveTo(cx - 190, cy + (b.quote ? 38 : 18)); G.ctx.lineTo(cx + 190, cy + (b.quote ? 38 : 18));
  G.ctx.stroke();
  G.ctx.textAlign = 'center';
  G.ctx.font = 'bold 24px "Noto Serif SC", serif';
  G.ctx.fillStyle = '#05070c';
  G.ctx.fillText(b.title, cx + 1.5, cy + 2.5);
  G.ctx.fillStyle = b.color || COLORS.goldBright;
  G.ctx.fillText(b.title, cx, cy + 1);
  if (b.quote) {
    G.ctx.font = '13.5px "Noto Serif SC", serif';
    G.ctx.fillStyle = COLORS.parchment;
    G.ctx.fillText(b.quote, cx, cy + 25);
  }
  G.ctx.restore();
}

/* ---------- VFX RENDERERS ---------- */
function drawProjectiles() {
  for (const pr of G.projectiles) {
    G.ctx.save();
    G.ctx.translate(pr.x, pr.y);
    if (pr.kind === 'soulWave' || pr.kind === 'crimsonWave') {
      const isCr = pr.kind === 'crimsonWave';
      const alpha = Math.min(1, pr.life * 3.5);
      G.ctx.globalAlpha = alpha;
      G.ctx.scale(pr.facing, 1);
      drawGlowSprite(isCr ? 'crimson' : 'cyan', 10, 0, isCr ? 50 : 42, 0.82 * alpha);
      drawTaperedCrescent(isCr ? 30 : 26, isCr ? 15 : 13, -1.28, 1.28, isCr ? 'rgba(220, 38, 38, 0.94)' : 'rgba(56, 189, 248, 0.92)', isCr ? '#fef08a' : '#e0f2fe');
      G.ctx.fillStyle = isCr ? 'rgba(248, 113, 113, 0.38)' : 'rgba(125, 211, 252, 0.35)';
      G.ctx.beginPath();
      G.ctx.moveTo(8, -24); G.ctx.quadraticCurveTo(-38, 0, 8, 24); G.ctx.quadraticCurveTo(-8, 0, 8, -24);
      G.ctx.closePath(); G.ctx.fill();
    } else if (pr.kind === 'wraithOrb') {
      const col = pr.reflected ? COLORS.goldBright : COLORS.crimsonBright;
      drawGlowSprite(pr.reflected ? 'gold' : 'crimson', 0, 0, pr.r * 2.5, 0.85);
      G.ctx.fillStyle = pr.reflected ? '#fef08a' : '#fda4af';
      boilCircle(G.ctx, 0, 0, pr.r * 0.72, 6100, 1.2, 10);
      G.ctx.fill();
      G.ctx.strokeStyle = col;
      G.ctx.lineWidth = 2.4;
      boilCircle(G.ctx, 0, 0, pr.r, 6120, 1.5, 12);
      G.ctx.stroke();
    }
    G.ctx.restore();
  }
}

function drawTalismans() {
  for (const tm of G.talismans) {
    const pulse = 1 + Math.sin(G.globalTime * 22) * 0.16;
    G.ctx.save();
    G.ctx.translate(tm.x, tm.y);
    G.ctx.scale(pulse, pulse);
    G.ctx.fillStyle = '#b91c1c';
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 1.6;
    G.ctx.fillRect(-7, -14, 14, 28);
    G.ctx.strokeRect(-7, -14, 14, 28);
    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.font = 'bold 12px serif';
    G.ctx.textAlign = 'center';
    G.ctx.fillText('封', 0, 4);
    G.ctx.restore();
  }
}

function drawChapelTide() {
  if (!G.chapelTide) return;
  const x0 = G.chapelTide.x0 !== undefined ? G.chapelTide.x0 : 2648;
  const w = G.chapelTide.w !== undefined ? G.chapelTide.w : 1090;
  const fy = G.chapelTide.floorY !== undefined ? G.chapelTide.floorY : FLOOR_Y;
  const isGold = G.chapelTide.theme === 'gold';
  G.ctx.save();
  if (G.chapelTide.phase === 'warn') {
    const p = 1 - Math.max(0, G.chapelTide.timer / G.chapelTide.maxTimer);
    const pulse = 0.35 + Math.sin(G.globalTime * 24) * 0.25 + p * 0.3;
    const g = G.ctx.createLinearGradient(0, fy - 38, 0, fy);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, isGold ? `rgba(245, 158, 11, ${(pulse * 0.62).toFixed(2)})` : `rgba(220, 38, 38, ${(pulse * 0.58).toFixed(2)})`);
    G.ctx.fillStyle = g;
    G.ctx.fillRect(x0, fy - 38, w, 38);

    G.ctx.strokeStyle = isGold ? `rgba(253, 224, 71, ${Math.min(1, pulse).toFixed(2)})` : `rgba(248, 113, 113, ${Math.min(1, pulse).toFixed(2)})`;
    G.ctx.lineWidth = 2.4;
    boilLine(G.ctx, x0, fy - 3, x0 + w, fy - 3, 8800, 2.2, 16);
  } else if (G.chapelTide.phase === 'surge') {
    const fade = Math.min(1, G.chapelTide.timer * 3.5);
    const surgeH = 86 * fade;
    const g = G.ctx.createLinearGradient(0, fy - surgeH, 0, fy);
    if (isGold) {
      g.addColorStop(0, 'rgba(253, 224, 71, 0.88)');
      g.addColorStop(0.35, 'rgba(180, 83, 9, 0.9)');
      g.addColorStop(1, 'rgba(28, 12, 8, 0.96)');
    } else {
      g.addColorStop(0, 'rgba(248, 113, 113, 0.82)');
      g.addColorStop(0.35, 'rgba(153, 27, 27, 0.9)');
      g.addColorStop(1, 'rgba(18, 6, 12, 0.96)');
    }
    G.ctx.fillStyle = g;
    G.ctx.beginPath();
    G.ctx.moveTo(x0, fy);
    const segs = 26;
    for (let i = 0; i <= segs; i++) {
      const px = x0 + (w * i) / segs;
      const crest = Math.sin(G.globalTime * 14 + i * 0.95) * 11 + Math.cos(G.globalTime * 9 - i * 1.4) * 6;
      G.ctx.lineTo(px, fy - surgeH + crest);
    }
    G.ctx.lineTo(x0 + w, fy);
    G.ctx.closePath();
    G.ctx.fill();

    G.ctx.strokeStyle = isGold ? COLORS.goldBright : COLORS.crimsonBright;
    G.ctx.lineWidth = 2.6;
    G.ctx.stroke();
  }
  G.ctx.restore();
}

function drawGroundWaves() {
  for (const gw of G.groundWaves) {
    const fy = gw.y !== undefined ? gw.y : FLOOR_Y;
    G.ctx.save();
    G.ctx.fillStyle = gw.gold ? 'rgba(245, 158, 11, 0.88)' : 'rgba(220, 38, 38, 0.85)';
    G.ctx.strokeStyle = gw.gold ? COLORS.goldBright : COLORS.crimsonBright;
    G.ctx.lineWidth = 2;
    G.ctx.beginPath();
    G.ctx.moveTo(gw.x - gw.w * 0.5, fy);
    G.ctx.quadraticCurveTo(gw.x, fy - gw.h * 1.4, gw.x + gw.w * 0.5, fy);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    G.ctx.restore();
  }
}

function drawBellQuakes() {
  if (!G.bellQuakes) return;
  for (const bq of G.bellQuakes) {
    const a = Math.max(0, bq.life / bq.maxLife);
    const p = 1 - a;
    const sc = 0.62 + p * 0.55;
    G.ctx.save();
    G.ctx.translate(bq.x, bq.y - 24 - p * 36);
    G.ctx.globalAlpha = Math.min(1, a * 1.25);

    // Rising cyan-gold sonic pillar behind spectral bell
    const pilW = bq.radius * 0.92 * (1 - p * 0.22);
    const pilH = bq.radius * 1.38;
    const pg = G.ctx.createLinearGradient(0, 30, 0, -pilH);
    pg.addColorStop(0, `rgba(56, 189, 248, ${(0.42 * a).toFixed(2)})`);
    pg.addColorStop(0.55, `rgba(186, 230, 253, ${(0.28 * a).toFixed(2)})`);
    pg.addColorStop(1, 'transparent');
    G.ctx.fillStyle = pg;
    G.ctx.fillRect(-pilW * 0.5, -pilH, pilW, pilH + 30);

    drawGlowSprite('cyan', 0, -18, bq.radius * 0.72, 0.75 * a);

    // Spectral Hand-Drawn Giant Bronze Bell Silhouette
    G.ctx.scale(sc, sc);
    G.ctx.fillStyle = `rgba(14, 116, 144, ${(0.28 * a).toFixed(2)})`;
    G.ctx.strokeStyle = COLORS.cyanBright;
    G.ctx.lineWidth = 3.2;
    G.ctx.beginPath();
    G.ctx.moveTo(-26, -78);
    G.ctx.lineTo(26, -78);
    G.ctx.quadraticCurveTo(56, -20, 74, 26);
    G.ctx.lineTo(-74, 26);
    G.ctx.quadraticCurveTo(-56, -20, -26, -78);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    // Golden resonance crack inside spectral bell
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath();
    G.ctx.moveTo(6, -62); G.ctx.lineTo(-10, -26); G.ctx.lineTo(8, 2); G.ctx.lineTo(-6, 24);
    G.ctx.stroke();
    G.ctx.restore();
  }
}

function drawSlashes() {
  for (const s of G.slashes) {
    const a = Math.max(0, s.life / s.maxLife);
    const p = 1 - a; // 0 -> 1 sweep progression
    const headEase = Math.min(1, p * 3.8);
    const tailEase = Math.max(0, (p - 0.16) * 1.18);
    G.ctx.save();
    G.ctx.globalAlpha = Math.min(1, a * 1.35);

    if (s.type === 'iai') {
      // Dimensional Ink-Gold Flash Cut spanning entire lunge path x0 -> x1
      const x0 = s.x0 !== undefined ? s.x0 : (s.x - s.facing * 45);
      const x1 = s.x1 !== undefined ? s.x1 : (s.x + s.facing * 145);
      const midX = (x0 + x1) * 0.5;
      const halfH = Math.max(1.2, (1 - p * 0.85) * 17);

      drawGlowSprite('gold', midX, s.y, Math.min(92, Math.abs(x1 - x0) * 0.45 + 24), 0.82 * a);

      // Outer dark ink tear
      G.ctx.fillStyle = 'rgba(8, 11, 17, 0.88)';
      G.ctx.beginPath();
      G.ctx.moveTo(x0, s.y);
      G.ctx.quadraticCurveTo(midX, s.y - halfH * 1.35, x1, s.y);
      G.ctx.quadraticCurveTo(midX, s.y + halfH * 1.35, x0, s.y);
      G.ctx.closePath();
      G.ctx.fill();

      // Inner radiant gold blade flash
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.beginPath();
      G.ctx.moveTo(x0, s.y);
      G.ctx.quadraticCurveTo(midX, s.y - halfH * 0.72, x1, s.y);
      G.ctx.quadraticCurveTo(midX, s.y + halfH * 0.72, x0, s.y);
      G.ctx.closePath();
      G.ctx.fill();

      // Razor-thin snapping white after-line
      G.ctx.strokeStyle = '#ffffff';
      G.ctx.lineWidth = Math.max(1, 3.2 * a);
      G.ctx.beginPath();
      G.ctx.moveTo(x0 - s.facing * 12, s.y);
      G.ctx.lineTo(x1 + s.facing * 16, s.y);
      G.ctx.stroke();

      // End glint spark
      if (a > 0.35) {
        drawParryStarGlint(x1, s.y, 16 * a, COLORS.goldBright);
      }
    } else if (s.type === 'counter' || s.type === 'exec') {
      // Staggered Double-Stroke Calligraphic Cross Slash!
      G.ctx.translate(s.x, s.y);
      const isExec = s.type === 'exec';
      const col = isExec ? COLORS.crimsonBright : COLORS.goldBright;
      const glowKey = isExec ? 'crimson' : 'gold';
      drawGlowSprite(glowKey, 0, 0, 74, 0.9 * a);

      const drawCrossBlade = (xA, yA, xB, yB, prog) => {
        if (prog <= 0) return;
        const tEnd = Math.min(1, prog * 3.4);
        const cx = xA + (xB - xA) * tEnd;
        const cy = yA + (yB - yA) * tEnd;
        // Outer ink-colored aura
        G.ctx.strokeStyle = isExec ? 'rgba(220, 38, 38, 0.48)' : 'rgba(245, 158, 11, 0.45)';
        G.ctx.lineWidth = 18 * a;
        G.ctx.lineCap = 'round';
        G.ctx.beginPath(); G.ctx.moveTo(xA, yA); G.ctx.lineTo(cx, cy); G.ctx.stroke();
        // Main blade stroke
        G.ctx.strokeStyle = col;
        G.ctx.lineWidth = 7.5 * a;
        G.ctx.stroke();
        // White-hot core
        G.ctx.strokeStyle = '#ffffff';
        G.ctx.lineWidth = 2.4 * a;
        G.ctx.stroke();
      };

      drawCrossBlade(-64, -46, 64, 46, p);
      drawCrossBlade(64, -46, -64, 46, Math.max(0, p - 0.14));
      if (a > 0.4) drawParryStarGlint(0, 0, 22 * a, col);
    } else if (s.type === 'pogo') {
      G.ctx.translate(s.x, s.y);
      const ang0 = 0.22 + tailEase * 1.4;
      const ang1 = 0.22 + headEase * (Math.PI - 0.44);
      if (ang1 > ang0 + 0.08) {
        drawTaperedCrescent(45, 22 * a, ang0, ang1, 'rgba(10, 14, 22, 0.78)', null);
        drawTaperedCrescent(43, 15 * a, ang0, ang1, 'rgba(226, 220, 202, 0.92)', '#ffffff');
      }
    } else if (s.type === 'up') {
      G.ctx.translate(s.x, s.y);
      const ang0 = -Math.PI + 0.3 + tailEase * 1.4;
      const ang1 = -Math.PI + 0.3 + headEase * (Math.PI - 0.6);
      if (ang1 > ang0 + 0.08) {
        drawTaperedCrescent(50, 24 * a, ang0, ang1, 'rgba(10, 14, 22, 0.8)', null);
        drawTaperedCrescent(48, 17 * a, ang0, ang1, 'rgba(226, 220, 202, 0.94)', '#ffffff');
      }
    } else if (s.type === 'enemyThrust' || s.type === 'enemyRedThrust' || s.type === 'bossThrust') {
      G.ctx.translate(s.x, s.y);
      const isRed = s.type === 'enemyRedThrust';
      const isBoss = s.type === 'bossThrust';
      const len = isBoss ? 128 : 82;
      const halfH = (isBoss ? 16 : 9) * a;
      G.ctx.scale(s.facing, 1);
      drawGlowSprite(isRed ? 'crimson' : 'gold', len * 0.45, 0, isBoss ? 46 : 30, 0.65 * a);
      G.ctx.fillStyle = isRed ? 'rgba(248, 113, 113, 0.85)' : isBoss ? 'rgba(253, 224, 71, 0.82)' : 'rgba(226, 220, 202, 0.78)';
      G.ctx.beginPath();
      G.ctx.moveTo(-24, 0);
      G.ctx.quadraticCurveTo(len * 0.4, -halfH, len, 0);
      G.ctx.quadraticCurveTo(len * 0.4, halfH, -24, 0);
      G.ctx.closePath();
      G.ctx.fill();
    } else if (s.type === 'bossSlam' || s.type === 'bossRedSlam') {
      G.ctx.translate(s.x, s.y);
      const isRed = s.type === 'bossRedSlam';
      G.ctx.scale(s.facing, 1);
      drawGlowSprite(isRed ? 'crimson' : 'gold', 56, -12, 68, 0.65 * a);
      drawTaperedCrescent(96, 30 * a, -1.65, 0.95, isRed ? 'rgba(220, 38, 38, 0.84)' : 'rgba(245, 158, 11, 0.78)', isRed ? '#fecaca' : '#fef08a');
    } else if (s.type === 'bossSweep' || s.type === 'bossRedSweep' || s.type === 'bossUpSweep') {
      G.ctx.translate(s.x, s.y);
      const isRed = s.type === 'bossRedSweep';
      const isUp = s.type === 'bossUpSweep';
      G.ctx.scale(s.facing, isUp ? -1 : 1);
      drawGlowSprite(isRed ? 'crimson' : 'parchment', 50, 0, 56, 0.55 * a);
      drawTaperedCrescent(86, 26 * a, -1.25, 1.15, isRed ? 'rgba(220, 38, 38, 0.78)' : 'rgba(216, 207, 184, 0.76)', isRed ? '#fde047' : '#ffffff');
    } else {
      // Player 3-Hit Combo: Distinct Animated Calligraphic Brush Arcs!
      G.ctx.translate(s.x, s.y);
      const isSlash1 = s.type === 'slash1';
      const isSlash2 = s.type === 'slash2';
      const isSlash3 = s.type === 'slash3';

      // slash1 sweeps UP (inverted Y), slash2 sweeps horizontal/down, slash3 is huge golden heavy overhead cleave
      G.ctx.scale(s.facing, isSlash1 ? -1 : 1);

      const r = isSlash3 ? 68 : isSlash2 ? 55 : 51;
      const spanStart = isSlash3 ? -1.65 : isSlash2 ? -1.15 : -1.25;
      const spanTotal = isSlash3 ? 2.75 : isSlash2 ? 2.35 : 2.3;
      const ang0 = spanStart + tailEase * (spanTotal * 0.62);
      const ang1 = spanStart + headEase * spanTotal;

      if (ang1 > ang0 + 0.08) {
        if (isSlash3) {
          drawGlowSprite('gold', 38, 0, 62, 0.72 * a);
        } else {
          drawGlowSprite('parchment', 32, 0, 40, 0.36 * a);
        }
        // Outer calligraphic dark ink brush stroke
        drawTaperedCrescent(r + 3, (isSlash3 ? 32 : 22) * a, ang0, ang1, 'rgba(8, 11, 17, 0.84)', null);
        // Main steel / gold blade arc
        const fill = isSlash3
          ? 'rgba(245, 158, 11, 0.94)'
          : isSlash2
            ? 'rgba(232, 227, 212, 0.9)'
            : 'rgba(216, 207, 184, 0.88)';
        const core = isSlash3 ? '#fef08a' : '#ffffff';
        drawTaperedCrescent(r, (isSlash3 ? 23 : 15) * a, ang0, ang1, fill, core);

        // Fine trailing outer bristle wisp
        G.ctx.strokeStyle = isSlash3 ? 'rgba(253, 224, 71, 0.65)' : 'rgba(216, 207, 184, 0.45)';
        G.ctx.lineWidth = 1.6;
        G.ctx.beginPath();
        G.ctx.arc(0, 0, r + 9, ang0 + 0.1, ang1 - 0.05);
        G.ctx.stroke();
      }
    }
    G.ctx.restore();
  }
}

function drawHitMarks() {
  for (const hm of G.hitMarks) {
    const a = Math.max(0, hm.life / hm.maxLife);
    const p = 1 - a;
    const halfL = hm.len * (0.45 + p * 0.65) * 0.5;
    const halfW = hm.width * a;
    G.ctx.save();
    G.ctx.translate(hm.x, hm.y);
    G.ctx.rotate(hm.angle);
    G.ctx.globalAlpha = Math.min(1, a * 1.4);

    const glowKey = hm.color === COLORS.crimsonBright ? 'crimson' : hm.color === COLORS.goldBright ? 'gold' : 'parchment';
    drawGlowSprite(glowKey, 0, 0, halfL * 0.72, 0.65 * a);

    // Dark ink border slit
    G.ctx.fillStyle = 'rgba(8, 11, 17, 0.82)';
    G.ctx.beginPath();
    G.ctx.moveTo(-halfL * 1.08, 0);
    G.ctx.quadraticCurveTo(0, -halfW * 1.5, halfL * 1.08, 0);
    G.ctx.quadraticCurveTo(0, halfW * 1.5, -halfL * 1.08, 0);
    G.ctx.closePath();
    G.ctx.fill();

    // Bright razor cut core
    G.ctx.fillStyle = hm.color;
    G.ctx.beginPath();
    G.ctx.moveTo(-halfL, 0);
    G.ctx.quadraticCurveTo(0, -halfW, halfL, 0);
    G.ctx.quadraticCurveTo(0, halfW, -halfL, 0);
    G.ctx.closePath();
    G.ctx.fill();

    G.ctx.fillStyle = '#ffffff';
    G.ctx.beginPath();
    G.ctx.moveTo(-halfL * 0.75, 0);
    G.ctx.quadraticCurveTo(0, -halfW * 0.35, halfL * 0.75, 0);
    G.ctx.quadraticCurveTo(0, halfW * 0.35, -halfL * 0.75, 0);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.restore();
  }
}

function drawImpactBursts() {
  for (const ib of G.impactBursts) {
    const a = Math.max(0, ib.life / ib.maxLife);
    const p = 1 - a;
    G.ctx.save();
    G.ctx.translate(ib.x, ib.y);
    G.ctx.rotate(ib.rot + p * 0.22);

    if (ib.kind === 'parry') {
      const sc = ib.scale * (0.75 + Math.sin(p * Math.PI * 0.65) * 0.45);
      // Radiant golden core bloom
      drawGlowSprite('gold', 0, 0, 74 * sc, 0.95 * a);

      // Ink splatter ring silhouette behind the clash flare
      G.ctx.strokeStyle = `rgba(8, 11, 17, ${(0.72 * a).toFixed(2)})`;
      G.ctx.lineWidth = 4.5 * a;
      boilCircle(G.ctx, 0, 0, (18 + p * 44) * ib.scale, 8100, 3.2, 16);
      G.ctx.stroke();

      // Diagonal secondary golden spikes
      const diagR = 38 * sc;
      G.ctx.save();
      G.ctx.rotate(Math.PI * 0.25);
      G.ctx.fillStyle = `rgba(245, 158, 11, ${(0.9 * a).toFixed(2)})`;
      G.ctx.beginPath();
      G.ctx.moveTo(0, -diagR); G.ctx.lineTo(diagR * 0.14, -diagR * 0.14);
      G.ctx.lineTo(diagR, 0); G.ctx.lineTo(diagR * 0.14, diagR * 0.14);
      G.ctx.lineTo(0, diagR); G.ctx.lineTo(-diagR * 0.14, diagR * 0.14);
      G.ctx.lineTo(-diagR, 0); G.ctx.lineTo(-diagR * 0.14, -diagR * 0.14);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.restore();

      // Primary razor-sharp 4-point gold starburst
      const mainR = 66 * sc;
      G.ctx.fillStyle = `rgba(253, 224, 71, ${Math.min(1, a * 1.4).toFixed(2)})`;
      G.ctx.beginPath();
      G.ctx.moveTo(0, -mainR); G.ctx.lineTo(mainR * 0.11, -mainR * 0.11);
      G.ctx.lineTo(mainR, 0); G.ctx.lineTo(mainR * 0.11, mainR * 0.11);
      G.ctx.lineTo(0, mainR); G.ctx.lineTo(-mainR * 0.11, mainR * 0.11);
      G.ctx.lineTo(-mainR, 0); G.ctx.lineTo(-mainR * 0.11, -mainR * 0.11);
      G.ctx.closePath();
      G.ctx.fill();

      // White-hot inner clash star
      const coreR = 34 * sc;
      G.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a * 1.5).toFixed(2)})`;
      G.ctx.beginPath();
      G.ctx.moveTo(0, -coreR); G.ctx.lineTo(coreR * 0.14, -coreR * 0.14);
      G.ctx.lineTo(coreR, 0); G.ctx.lineTo(coreR * 0.14, coreR * 0.14);
      G.ctx.lineTo(0, coreR); G.ctx.lineTo(-coreR * 0.14, coreR * 0.14);
      G.ctx.lineTo(-coreR, 0); G.ctx.lineTo(-coreR * 0.14, -coreR * 0.14);
      G.ctx.closePath();
      G.ctx.fill();
    } else {
      // Partial Block: Blunt cool cyan-silver crack burst
      const sc = ib.scale * (0.85 + p * 0.35);
      drawGlowSprite('cyan', 0, 0, 38 * sc, 0.72 * a);
      G.ctx.strokeStyle = `rgba(186, 230, 253, ${a.toFixed(2)})`;
      G.ctx.lineWidth = 3 * a;
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + 0.3;
        G.ctx.beginPath();
        G.ctx.moveTo(Math.cos(ang) * 7, Math.sin(ang) * 7);
        G.ctx.lineTo(Math.cos(ang) * (24 * sc), Math.sin(ang) * (24 * sc));
        G.ctx.stroke();
      }
    }
    G.ctx.restore();
  }
}

function drawShockwaves() {
  if (G.shockwaves.length === 0) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.shockwaves.length; i++) {
    const s = G.shockwaves[i];
    ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    boilCircle(ctx, s.x, s.y, s.r, 5500, 1.8, 16);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  if (G.particles.length === 0) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.particles.length; i++) {
    const p = G.particles[i];
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    if (p.spark) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.75;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.032, p.y - p.vy * 0.032);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawWorldPrompts() {
  if (!G.player || G.gameState !== 'playing') return;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h;
  G.ctx.save();
  G.ctx.font = '13px "Noto Serif SC", serif';
  G.ctx.textAlign = 'center';

  const ek = getActionKeyLabel('interact');
  if (G.worldState && G.worldState.boss3Defeated && !G.echoSession &&
      Math.hypot(px - FIRST_BELL_CORE_POS.x, py - FIRST_BELL_CORE_POS.y) < 105) {
    drawPromptBadge(FIRST_BELL_CORE_POS.x, FIRST_BELL_CORE_POS.y - 118, `[${ek}] 触碰 · 初钟之心（终誓抉择）`);
  }
  for (const altar of ALTARS) {
    if (Math.hypot(px - altar.x, py - altar.y) < 86) {
      const isLit = !G.worldState || G.worldState.litAltars.has(altar.id);
      drawPromptBadge(altar.x, altar.y - 96, isLit ? `[${ek}] 歇息 · 圣物与跃迁` : `[${ek}] 点燃${altar.shortName}`);
    }
  }
  for (const npc of NPCS) {
    if (Math.hypot(px - npc.x, py - npc.y) < 88) {
      drawPromptBadge(npc.x + 8, npc.y - 92, `[${ek}] 淬炼断刃 · ${npc.name || '老铸钟匠'}`);
    }
  }
  if (G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) {
    drawPromptBadge(SHORTCUT_GATE_DEF.leverX, SHORTCUT_GATE_DEF.leverY - 68, `[${ek} / 斩] 拉动青铜锁链`);
  }
  for (const lt of LORE_TABLETS) {
    if (Math.hypot(px - lt.x, py - lt.y) < 78) {
      drawPromptBadge(lt.x, lt.y - 80, `[${ek}] 研读 · ${lt.title}`);
    }
  }
  if (G.worldState) {
    for (const p of G.worldState.pickups) {
      if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) {
        drawPromptBadge(p.x, p.y - 66, `[${ek}] 拾取 · ${p.name}`);
      }
    }
  }
  G.ctx.restore();
}

function drawPromptBadge(x, y, label) {
  const w = label.length * 11 + 24;
  G.ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
  G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
  G.ctx.lineWidth = 1.2;
  G.ctx.fillRect(x - w / 2, y - 15, w, 24);
  G.ctx.strokeRect(x - w / 2, y - 15, w, 24);
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.fillText(label, x, y + 2);
}

function drawFloatingTexts() {
  if (G.floatTexts.length === 0) return;
  const ctx = G.ctx;
  ctx.textAlign = 'center';
  let lastSize = -1;
  for (let i = 0; i < G.floatTexts.length; i++) {
    const ft = G.floatTexts[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, (ft.life / ft.maxLife) * 1.4));
    if (ft.size !== lastSize) {
      lastSize = ft.size;
      ctx.font = `bold ${ft.size}px "Noto Serif SC", serif`;
    }
    ctx.fillStyle = '#06080d';
    ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

function drawForegroundSilhouettes() {
  const fx = -G.cam.x * 1.28;
  G.ctx.save();
  G.ctx.fillStyle = 'rgba(5, 7, 11, 0.78)';
  for (let i = 0; i < 6; i++) {
    const x = (((i * 760 + 240) + fx) % (G.canvasW + 760) + (G.canvasW + 760)) % (G.canvasW + 760) - 220;
    G.ctx.beginPath();
    G.ctx.moveTo(x - 42, 0); G.ctx.lineTo(x + 42, 0);
    G.ctx.lineTo(x + 22, 115); G.ctx.lineTo(x - 8, 92); G.ctx.lineTo(x - 26, 128);
    G.ctx.closePath(); G.ctx.fill();

    G.ctx.beginPath();
    G.ctx.moveTo(x - 65, G.canvasH); G.ctx.lineTo(x - 18, G.canvasH - 54);
    G.ctx.lineTo(x + 28, G.canvasH - 36); G.ctx.lineTo(x + 78, G.canvasH);
    G.ctx.closePath(); G.ctx.fill();
  }
  G.ctx.restore();
}

function drawWeatherLayer(isPhase2) {
  if (!G.weatherParticles || G.weatherParticles.length === 0) return;
  const wType = G.themeBlend ? G.themeBlend.weather : 'ash';
  const accent = G.themeBlend ? G.themeBlend.accent : [216, 207, 184];
  const step = G.isMobile ? 2 : 1;
  const list = G.weatherParticles;
  G.ctx.save();
  if (wType === 'rain') {
    // Batched into 2 flat-cap stroke passes (near bright + far soft) -> 68 strokes reduced to 2!
    G.ctx.lineCap = 'butt';
    G.ctx.lineWidth = 1.15;
    G.ctx.strokeStyle = 'rgba(186, 214, 236, 0.30)';
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += step * 2) {
      const wp = list[i];
      G.ctx.moveTo(wp.x, wp.y);
      G.ctx.lineTo(wp.x + wp.len * 0.28, wp.y - wp.len);
    }
    G.ctx.stroke();
    G.ctx.strokeStyle = 'rgba(186, 214, 236, 0.16)';
    G.ctx.beginPath();
    for (let i = step; i < list.length; i += step * 2) {
      const wp = list[i];
      G.ctx.moveTo(wp.x, wp.y);
      G.ctx.lineTo(wp.x + wp.len * 0.28, wp.y - wp.len);
    }
    G.ctx.stroke();
  } else if (wType === 'embers') {
    // Batched into 2 fill passes (bright gold sparks + warm amber embers)
    G.ctx.fillStyle = 'rgba(253, 224, 71, 0.56)';
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += 3) {
      const wp = list[i];
      const r = wp.size * 0.95;
      G.ctx.moveTo(wp.x + r, wp.y);
      G.ctx.arc(wp.x, wp.y, r, 0, Math.PI * 2);
    }
    G.ctx.fill();
    G.ctx.fillStyle = 'rgba(245, 158, 11, 0.44)';
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += step) {
      if (i % 3 === 0) continue;
      const wp = list[i];
      const r = wp.size * 0.95;
      G.ctx.moveTo(wp.x + r, wp.y);
      G.ctx.arc(wp.x, wp.y, r, 0, Math.PI * 2);
    }
    G.ctx.fill();
  } else if (wType === 'mist') {
    // Pass 1: Vertical cave water droplets (1 batched stroke)
    G.ctx.strokeStyle = 'rgba(125, 211, 252, 0.28)';
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += 3) {
      const wp = list[i];
      G.ctx.moveTo(wp.x, wp.y);
      G.ctx.lineTo(wp.x, wp.y - wp.len * 0.65);
    }
    G.ctx.stroke();
    // Pass 2: Rising humid mist wisps (1 batched fill)
    G.ctx.fillStyle = 'rgba(56, 189, 248, 0.045)';
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += step) {
      if (i % 3 === 0) continue;
      const wp = list[i];
      const rx = wp.len * 1.4;
      G.ctx.moveTo(wp.x + rx, wp.y);
      G.ctx.ellipse(wp.x, wp.y, rx, wp.len * 0.48, 0, 0, Math.PI * 2);
    }
    G.ctx.fill();
  } else {
    // Chapel bone-ash snow or Sanctuary cold soul ash (1 batched fill)
    G.ctx.fillStyle = isPhase2
      ? 'rgba(248, 113, 113, 0.36)'
      : (wType === 'snow' ? 'rgba(232, 224, 210, 0.30)' : rgbStr(accent, 0.20));
    G.ctx.beginPath();
    for (let i = 0; i < list.length; i += step) {
      const wp = list[i];
      G.ctx.moveTo(wp.x + wp.size, wp.y);
      G.ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
    }
    G.ctx.fill();
  }
  G.ctx.restore();
}

function drawForegroundMotes(isPhase2) {
  G.ctx.save();
  const acc = G.themeBlend ? G.themeBlend.accent : [216, 207, 184];
  const step = G.isMobile ? 2 : 1;
  G.ctx.fillStyle = isPhase2 ? 'rgba(248, 113, 113, 0.45)' : rgbStr(acc, 0.28);
  G.ctx.beginPath();
  for (let i = 0; i < G.ambientMotes.length; i += step) {
    const m = G.ambientMotes[i];
    G.ctx.moveTo(m.x + m.r, m.y);
    G.ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
  }
  G.ctx.fill();
  G.ctx.restore();
}
