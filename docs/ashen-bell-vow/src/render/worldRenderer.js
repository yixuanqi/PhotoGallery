// World Backdrop, Props, Altars, NPCs, Gates, Puzzles & Grapple Reticle Renderer (v32.0)
import {
  COLORS, ROOMS, ALTARS, NPCS, ALTAR_POS, LORE_TABLETS,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS,
  PENDULUMS, VOID_BARRIERS, WALL_INSCRIPTIONS, GRAPPLE_ANCHORS, WIND_ZONES, BOUNCE_PADS,
  BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS, FLOOR_Y, WELL_BOTTOM_Y, DUMMY_MODES
} from '../config.js';
import { G, getAwakeBoss, getRelicStats, hasKeeperBlessing, getExplorationPercent, getActiveWeaponId, isWeaponUnlocked } from '../state.js';
import { prof } from '../profiler.js';
import { getControlLabels, getActionKeyLabel } from '../input.js';
import {
  drawGlowSprite, boilLine, boilCircle, boilRectOutline, drawTaperedCrescent, drawCloakMesh, solve2BoneIK
} from '../vfx.js';

import { drawLanternCastShadows, drawVolumetricLanternLights } from '../renderLighting.js';
import { rgbStr, drawParallaxBackground, drawForegroundSilhouettes } from '../renderParallax.js';
import { drawStampsLayer } from '../stampAtlas.js';
import { drawWorldArchitecture } from '../renderTerrain.js';
import { getGroundSurfaceY } from '../physics.js';
import { isPickupUnlocked } from '../combat.js';
import { isRoomOccluded } from '../world.js';
import { drawAchievementBanner } from '../codex.js';
import {
  t, isEn, getCanvasFont, locInscription, locNpcName, locAltar, locTablet, locPickup, locDummyMode
} from '../i18n.js';

import { isInView, BACKDROP_LANCETS, BACKDROP_GRAVES } from './renderShared.js';
import { drawCachedText, drawCachedBadge } from './glyphAtlas.js';
import {
  getSanctuaryArchSprite, getLancetWindowSprite, getChapelStaticBackdrop,
  getFoundryStaticBackdrop, getWoodsTreeHollowSprite, getWindVentGratesSprite,
  getGraveSprite, getBoneCairnSprite
} from './backdropCache.js';

export function drawWorldBackdrop() {
  G.ctx.save();

  // A. Zone 1 Sanctuary Arch Canopy behind Extinguished Altar (pre-baked static silhouette + live boil circle)
  if (G.cam.x < 760) {
    const ax = ALTAR_POS.x;
    const archImg = getSanctuaryArchSprite();
    G.ctx.drawImage(archImg, ax - 110, FLOOR_Y - (archImg.height - 8));

    G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.26)';
    G.ctx.lineWidth = 1.4;
    boilCircle(G.ctx, ax, 250, 22, 210, 0.9, 14);
    G.ctx.stroke();
  }

  // B. Gothic Lancet Windows & Angled Moonbeams (1 shared offscreen sprite blitted per visible window)
  const lancetImg = getLancetWindowSprite();
  for (let li = 0; li < BACKDROP_LANCETS.length; li++) {
    const wx = BACKDROP_LANCETS[li];
    if (wx < G.cam.x - 160 || wx > G.cam.x + G.canvasW + 160) continue;
    G.ctx.drawImage(lancetImg, wx - 130, 130);
  }

  // ========== ARENA 1 (r03_chapel): 雨夜坍塌礼拜堂 (Static Nave Cached + Live Lightning & Rain) ==========
  if (G.cam.x + G.canvasW > 2620 && G.cam.x < 3820 && G.cam.y < 720) {
    const isP2 = !!(G.boss && G.boss.awake && G.boss.phase === 2);
    const now = G.globalTime;
    const stormPhase = (now * 0.37) % 1;
    const lightning = stormPhase > 0.94 ? Math.sin(((stormPhase - 0.94) / 0.06) * Math.PI) * (isP2 ? 0.28 : 0.16) : 0;
    if (lightning > 0.01) {
      G.ctx.fillStyle = isP2 ? `rgba(248, 113, 113, ${lightning.toFixed(3)})` : `rgba(186, 230, 253, ${lightning.toFixed(3)})`;
      G.ctx.fillRect(2645, 0, 1135, FLOOR_Y);
    }

    // Soft bell glow behind cached half-buried bell
    drawGlowSprite(isP2 ? 'crimson' : 'gold', 3188, FLOOR_Y - 40, 128, isP2 ? 0.30 : 0.15);
    G.ctx.drawImage(getChapelStaticBackdrop(isP2), 2640, 0);

    // Live Slanted Rain Streaks
    G.ctx.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.19)' : 'rgba(186, 230, 253, 0.18)';
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    for (let ri = 0; ri < 26; ri++) {
      const rx0 = 2720 + ((ri * 97 + now * 140) % 980);
      const ry0 = ((ri * 131 + now * 620) % (FLOOR_Y - 20));
      G.ctx.moveTo(rx0, ry0);
      G.ctx.lineTo(rx0 - 9, ry0 + 26);
    }
    G.ctx.stroke();
  }

  // ========== ARENA 2 (r05_foundry): 沸腾地下熔金铸造坑 (Static Chimneys Cached + Live Gears & Molten Stream) ==========
  if (G.cam.x + G.canvasW > 5540 && G.cam.x < 6780 && G.cam.y + G.canvasH > 800) {
    const fx = 6150;
    const isJiP2 = !!(G.boss2 && G.boss2.awake && G.boss2.phase === 2);
    const now = G.globalTime;
    const gearSpd = isJiP2 ? 0.42 : 0.18;
    drawGlowSprite(isJiP2 ? 'crimson' : 'gold', fx, 1185, 270, isJiP2 ? 0.36 : 0.22);

    const drawFoundryGear = (gx, gy, rad, teeth, rot) => {
      G.ctx.save();
      G.ctx.translate(gx, gy);
      G.ctx.rotate(rot);
      G.ctx.strokeStyle = isJiP2 ? 'rgba(251, 191, 36, 0.34)' : 'rgba(216, 175, 112, 0.22)';
      G.ctx.fillStyle = 'rgba(20, 13, 10, 0.72)';
      G.ctx.lineWidth = 2.2;
      G.ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2;
        const a1 = a0 + (0.28 / teeth) * Math.PI * 2;
        const a2 = a0 + (0.50 / teeth) * Math.PI * 2;
        const a3 = a0 + (0.78 / teeth) * Math.PI * 2;
        if (i === 0) G.ctx.moveTo(Math.cos(a0) * rad, Math.sin(a0) * rad);
        else G.ctx.lineTo(Math.cos(a0) * rad, Math.sin(a0) * rad);
        G.ctx.lineTo(Math.cos(a1) * (rad + 14), Math.sin(a1) * (rad + 14));
        G.ctx.lineTo(Math.cos(a2) * (rad + 14), Math.sin(a2) * (rad + 14));
        G.ctx.lineTo(Math.cos(a3) * rad, Math.sin(a3) * rad);
      }
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
      G.ctx.beginPath(); G.ctx.arc(0, 0, rad * 0.68, 0, Math.PI * 2); G.ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const ka = (k / 6) * Math.PI * 2;
        G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(Math.cos(ka) * rad * 0.96, Math.sin(ka) * rad * 0.96); G.ctx.stroke();
      }
      G.ctx.restore();
    };
    drawFoundryGear(fx - 155, 1140, 118, 16, now * gearSpd);
    drawFoundryGear(fx + 148, 1170, 96, 14, -now * gearSpd * 1.15);

    // Pre-baked Blast-Furnace Chimneys, Crucible Cauldron & Slag Trough
    G.ctx.drawImage(getFoundryStaticBackdrop(isJiP2), fx - 275, 815);

    // Live Pulsing Molten Bronze Waterfall & Rising Ember Streaks
    const streamW = isJiP2 ? 22 : 14;
    const pulseW = Math.sin(now * 9) * 2.5;
    G.ctx.fillStyle = isJiP2 ? 'rgba(251, 146, 60, 0.42)' : 'rgba(245, 158, 11, 0.30)';
    G.ctx.fillRect(fx - (streamW + pulseW) * 0.5, 942, streamW + pulseW, WELL_BOTTOM_Y - 942);
    G.ctx.fillStyle = '#fef08a';
    G.ctx.globalAlpha = 0.42;
    G.ctx.fillRect(fx - 3, 942, 6, WELL_BOTTOM_Y - 942);
    G.ctx.globalAlpha = 1;

    G.ctx.fillStyle = isJiP2 ? COLORS.goldBright : '#fb923c';
    for (let ei = 0; ei < 14; ei++) {
      const ex = fx - 210 + ((ei * 73) % 420) + Math.sin(now * 2 + ei) * 14;
      const ey = WELL_BOTTOM_Y - 12 - ((now * 75 + ei * 53) % 420);
      G.ctx.fillRect(ex, ey, 2.6, 5.5);
    }
  }

  // ========== ARENA 3 & 4 (r08_heart): 穹顶碎裂的星渊天台 (Boss 3) / 炉心镜渊 (Boss 4) ==========
  if (G.cam.x + G.canvasW > 8340 && G.cam.x < 9700 && G.cam.y + G.canvasH > 0 && G.cam.y < 720) {
    const hx = 9000;
    const now = G.globalTime;
    const isZhuArena = !!(G.boss4 && G.boss4.alive);

    if (isZhuArena) {
      const hy = 235;
      const zP3 = G.boss4.phase >= 3;
      const st = G.boss4.stance || 'blade';
      const stCol = st === 'bell' ? COLORS.cyanBright : st === 'hammer' ? COLORS.gold : COLORS.goldBright;
      drawGlowSprite(st === 'bell' ? 'cyan' : 'gold', hx, hy, 250, zP3 ? 0.34 : 0.20);

      G.ctx.save();
      G.ctx.translate(hx, hy);
      G.ctx.rotate(now * (zP3 ? 0.22 : 0.09));
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.22)';
      G.ctx.lineWidth = 7.5;
      G.ctx.beginPath(); G.ctx.arc(0, 0, 168, 0.2, Math.PI * 1.72); G.ctx.stroke();
      G.ctx.strokeStyle = stCol;
      G.ctx.globalAlpha = zP3 ? 0.50 : 0.30;
      G.ctx.lineWidth = 2.6;
      G.ctx.beginPath(); G.ctx.arc(0, 0, 174, 0.35, Math.PI * 1.65); G.ctx.stroke();
      G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.22)';
      G.ctx.lineWidth = 4.2;
      G.ctx.beginPath(); G.ctx.arc(0, 0, 112, Math.PI * 0.8, Math.PI * 2.15); G.ctx.stroke();
      G.ctx.restore();

      const monos = [8650, 9000, 9350];
      for (let mi = 0; mi < monos.length; mi++) {
        const mx = monos[mi];
        const my = 320 + Math.sin(now * 1.2 + mi * 2.1) * 10;
        G.ctx.fillStyle = 'rgba(10, 14, 24, 0.80)';
        G.ctx.strokeStyle = mi === 1 ? stCol : 'rgba(216, 207, 184, 0.22)';
        G.ctx.globalAlpha = 0.65;
        G.ctx.lineWidth = 1.6;
        G.ctx.fillRect(mx - 14, my, 28, 128);
        G.ctx.strokeRect(mx - 14, my, 28, 128);
      }
      G.ctx.globalAlpha = 1;
    } else {
      const hy = 205;
      const b3Phase = (G.boss3 && G.boss3.awake && G.boss3.alive) ? G.boss3.phase : 0;
      const defeated = !!(G.worldState && G.worldState.boss3Defeated);
      const eclipseR = b3Phase >= 3 ? 104 : 90;
      const coronaCol = b3Phase === 2 ? COLORS.violetBright : COLORS.goldBright;

      drawGlowSprite(b3Phase === 2 ? 'violet' : 'gold', hx, hy, b3Phase >= 3 ? 330 : 255, (b3Phase >= 3 || defeated) ? 0.44 : 0.28);

      G.ctx.save();
      G.ctx.translate(hx, hy);
      G.ctx.rotate(now * (b3Phase >= 3 ? 0.35 : 0.12));
      G.ctx.strokeStyle = b3Phase === 2 ? 'rgba(192, 132, 252, 0.36)' : 'rgba(253, 224, 71, 0.34)';
      G.ctx.lineWidth = b3Phase >= 3 ? 2.6 : 1.8;
      const rayCount = b3Phase >= 3 ? 18 : 12;
      for (let ri = 0; ri < rayCount; ri++) {
        const a = (ri / rayCount) * Math.PI * 2;
        const rLen = eclipseR + 28 + (ri % 3) * (b3Phase >= 3 ? 32 : 18);
        G.ctx.beginPath();
        G.ctx.moveTo(Math.cos(a) * (eclipseR + 6), Math.sin(a) * (eclipseR + 6));
        G.ctx.lineTo(Math.cos(a) * rLen, Math.sin(a) * rLen);
        G.ctx.stroke();
      }
      G.ctx.restore();

      G.ctx.fillStyle = '#050409';
      G.ctx.beginPath(); G.ctx.arc(hx, hy, eclipseR, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.strokeStyle = coronaCol;
      G.ctx.lineWidth = b3Phase >= 3 ? 4.4 : 3.0;
      boilCircle(G.ctx, hx, hy, eclipseR, 8920, b3Phase >= 3 ? 3.2 : 1.8, 32);
      G.ctx.stroke();

      G.ctx.save();
      G.ctx.translate(hx, hy);
      G.ctx.rotate(-0.22);
      G.ctx.strokeStyle = b3Phase === 2 ? 'rgba(216, 180, 254, 0.32)' : 'rgba(254, 240, 138, 0.28)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath(); G.ctx.ellipse(0, 0, eclipseR * 1.95, eclipseR * 0.42, 0, 0, Math.PI * 2); G.ctx.stroke();
      G.ctx.restore();

      if (b3Phase >= 2 || defeated) {
        G.ctx.strokeStyle = b3Phase === 2 ? 'rgba(192, 132, 252, 0.22)' : 'rgba(253, 224, 71, 0.24)';
        G.ctx.lineWidth = 1.8;
        G.ctx.beginPath();
        for (let si = 0; si < 16; si++) {
          const sx = 8460 + ((si * 79) % 1080);
          const sy = FLOOR_Y - ((now * (b3Phase >= 3 ? 130 : 65) + si * 73) % 520);
          G.ctx.moveTo(sx, sy);
          G.ctx.lineTo(sx + Math.sin(now * 3 + si) * 5, sy - 34);
        }
        G.ctx.stroke();
      }

      G.ctx.fillStyle = '#15101d';
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.26)';
      G.ctx.lineWidth = 1.4;
      const domeRocks = [
        [8620, 132, 42, 26], [8760, 88, 34, 22], [9240, 96, 38, 24], [9390, 146, 46, 28]
      ];
      for (let di = 0; di < domeRocks.length; di++) {
        const [rx, ry, rw, rh] = domeRocks[di];
        const lift = Math.sin(now * 1.3 + di * 1.7) * (b3Phase >= 2 ? 12 : 5);
        G.ctx.fillRect(rx, ry + lift, rw, rh);
        G.ctx.strokeRect(rx, ry + lift, rw, rh);
      }

      G.ctx.strokeStyle = b3Phase >= 3 ? 'rgba(254, 240, 138, 0.42)' : 'rgba(216, 207, 184, 0.30)';
      G.ctx.lineWidth = 2.4;
      for (let swi = 0; swi < 12; swi++) {
        const sx = 8470 + swi * 96;
        if (Math.abs(sx - hx) < 90) continue;
        const hBlade = 46 + (swi % 3) * 18;
        const tilt = ((swi % 5) - 2) * 0.08 + (b3Phase >= 3 ? Math.sin(now * 22 + swi) * 0.025 : 0);
        G.ctx.save();
        G.ctx.translate(sx, FLOOR_Y);
        G.ctx.rotate(tilt);
        G.ctx.beginPath();
        G.ctx.moveTo(0, 0); G.ctx.lineTo(0, -hBlade);
        G.ctx.moveTo(-10, -hBlade + 14); G.ctx.lineTo(10, -hBlade + 14);
        G.ctx.stroke();
        G.ctx.restore();
      }
    }
  }

  // ========== v30.0 ECOLOGICAL CAUSALITY LANDMARKS (Static Frames Cached + Live Streams) ==========
  // 1) Foundry-to-Spire Thermal Exhaust Vents
  if (G.cam.x + G.canvasW > 5560 && G.cam.x < 6760 && G.cam.y + G.canvasH > 0 && G.cam.y < 920) {
    const now = G.globalTime;
    const vents = [
      { x: 5835, w: 155 },
      { x: 6280, w: 165 }
    ];
    const foundryCooled = !!(G.worldState && G.worldState.boss2Defeated);
    for (let vi = 0; vi < vents.length; vi++) {
      const vt = vents[vi];
      drawGlowSprite(foundryCooled ? 'cyan' : 'gold', vt.x + vt.w * 0.5, 730, foundryCooled ? 92 : 120, (foundryCooled ? 0.16 : 0.28) + Math.sin(now * 4 + vi) * 0.05);
    }
    G.ctx.drawImage(getWindVentGratesSprite(foundryCooled), 5825, 720);
    G.ctx.fillStyle = foundryCooled ? 'rgba(186, 230, 253, 0.42)' : 'rgba(251, 146, 60, 0.55)';
    const sparkCnt = foundryCooled ? 5 : 8;
    for (let vi = 0; vi < vents.length; vi++) {
      const vt = vents[vi];
      for (let ei = 0; ei < sparkCnt; ei++) {
        const ex = vt.x + 12 + ((ei * 37 + Math.sin(now * 2.5 + ei) * 14) % (vt.w - 24));
        const ey = 726 - ((now * (foundryCooled ? 130 : 165) + ei * 89) % 690);
        G.ctx.fillRect(ex, ey, 2.4, 7);
      }
    }
  }

  // 2) Glacial Snowmelt Waterfalls cascading down r16_frost_tomb & r11_frost_ridge cliffs
  if (G.cam.x + G.canvasW > 8360 && G.cam.x < 11220 && G.cam.y + G.canvasH > -740 && G.cam.y < 1520) {
    const now = G.globalTime;
    const falls = [
      { x: 9830,  y0: -120, y1: 1160, w: 22 },
      { x: 10760, y0: 40,   y1: 1160, w: 18 },
      { x: 9240,  y0: 740,  y1: 1160, w: 16 }
    ];
    for (let fi = 0; fi < falls.length; fi++) {
      const fl = falls[fi];
      if (!isInView(fl.x - 20, fl.y0, fl.w + 40, fl.y1 - fl.y0, 80)) continue;
      G.ctx.fillStyle = 'rgba(186, 230, 253, 0.14)';
      G.ctx.fillRect(fl.x, fl.y0, fl.w, fl.y1 - fl.y0);
      G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.34)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      for (let si = 0; si < 9; si++) {
        const sy = fl.y0 + ((now * 240 + si * 137) % Math.max(80, fl.y1 - fl.y0));
        const sx = fl.x + 4 + ((si * 7) % Math.max(6, fl.w - 8));
        G.ctx.moveTo(sx, sy); G.ctx.lineTo(sx, Math.min(fl.y1, sy + 28));
      }
      G.ctx.stroke();
    }
  }

  // 3) Abyssal Seepage Aqueducts (r14_woods_cavern) & Cached Ancient Bell-Tree Hollow (r15_woods_heart)
  if (G.cam.x < 2700 && G.cam.y + G.canvasH > 1500) {
    const now = G.globalTime;
    if (G.cam.x + G.canvasW > 1950) {
      const seepX = [2120, 2340, 2510];
      for (let si = 0; si < seepX.length; si++) {
        const sx = seepX[si];
        G.ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        G.ctx.fillRect(sx - 8, 1556, 16, 586);
        G.ctx.strokeStyle = 'rgba(110, 231, 183, 0.34)';
        G.ctx.lineWidth = 1.5;
        G.ctx.beginPath();
        for (let di = 0; di < 6; di++) {
          const dy = 1560 + ((now * 210 + di * 95 + si * 33) % 580);
          G.ctx.moveTo(sx + ((di % 3) - 1) * 4, dy);
          G.ctx.lineTo(sx + ((di % 3) - 1) * 4, dy + 22);
        }
        G.ctx.stroke();
      }
    }
    if (G.cam.x < 1100) {
      const tx = 620;
      const ty = 2120;
      drawGlowSprite('cyan', tx, ty - 175, 220, 0.20 + Math.sin(now * 2.2) * 0.05);
      const treeImg = getWoodsTreeHollowSprite();
      G.ctx.drawImage(treeImg, tx - 270, ty - (treeImg.height - 10));
    }
  }

  // C. Swaying Tattered Cathedral Banners (live cloth sway)
  for (let idx = 0; idx < BANNERS.length; idx++) {
    const bn = BANNERS[idx];
    if (!isInView(bn.x - 24, bn.y, 48, bn.len + 12, 80)) continue;
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
  }

  // D. Weathered Tombstones (pre-baked sprites)
  for (let idx = 0; idx < BACKDROP_GRAVES.length; idx++) {
    const gx = BACKDROP_GRAVES[idx];
    if (gx < G.cam.x - 60 || gx > G.cam.x + G.canvasW + 60) continue;
    G.ctx.drawImage(getGraveSprite(idx), gx - 17, FLOOR_Y - 86);
  }

  // E. Bone Cairns (1 shared pre-baked sprite)
  const cairnImg = getBoneCairnSprite();
  for (let idx = 0; idx < BONE_CAIRNS.length; idx++) {
    const bx = BONE_CAIRNS[idx];
    if (bx < G.cam.x - 60 || bx > G.cam.x + G.canvasW + 60) continue;
    G.ctx.drawImage(cairnImg, bx - 17, FLOOR_Y - 22);
  }

  // F. Flickering Wax Candle Clusters
  for (let idx = 0; idx < CANDLE_CLUSTERS.length; idx++) {
    const cl = CANDLE_CLUSTERS[idx];
    if (!isInView(cl.x - 48, cl.y - 64, 96, 70, 80)) continue;
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
  }

  G.ctx.restore();
}

export function drawWeatherRipples() {
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

function hasNearbyWorldPrompt(px, py) {
  if (!G.player || G.gameState !== 'playing') return false;
  if (G.worldState && G.worldState.boss3Defeated && !G.echoSession &&
      Math.hypot(px - FIRST_BELL_CORE_POS.x, py - FIRST_BELL_CORE_POS.y) < 105) return true;
  for (let i = 0; i < ALTARS.length; i++) {
    if (Math.hypot(px - ALTARS[i].x, py - ALTARS[i].y) < 86) return true;
  }
  for (let i = 0; i < NPCS.length; i++) {
    if (Math.hypot(px - NPCS[i].x, py - NPCS[i].y) < 88) return true;
  }
  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i];
    if (e && e.alive && e.isDummy && Math.hypot(px - (e.x + e.w * 0.5), py - (e.y + e.h)) < 94) return true;
  }
  if (G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) return true;
  for (let i = 0; i < LORE_TABLETS.length; i++) {
    if (Math.hypot(px - LORE_TABLETS[i].x, py - LORE_TABLETS[i].y) < 78) return true;
  }
  if (G.worldState) {
    for (let i = 0; i < G.worldState.pickups.length; i++) {
      const p = G.worldState.pickups[i];
      if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) return true;
    }
  }
  return false;
}

export function drawRoomOcclusionMasks() {
  if (!ROOMS.length || !G.roomOcclusion) return;
  const ctx = G.ctx;
  const pad = 28;
  for (let i = 0; i < ROOMS.length; i++) {
    const rm = ROOMS[i];
    const alpha = G.roomOcclusion[rm.id];
    if (!alpha || alpha <= 0.01) continue;
    const b = rm.bounds;
    if (!isInView(b.x, b.y, b.w, b.h, pad)) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    ctx.restore();
  }
}

export function drawWallInscriptions() {
  if (!G.player || G.gameState !== 'playing') return;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const promptActive = hasNearbyWorldPrompt(px, G.player.y + G.player.h);

  // Pick only the SINGLE closest visible inscription within 205px (2D Euclidean) to eliminate text clutter
  let bestIns = null;
  let bestDist = 205;
  for (let i = 0; i < WALL_INSCRIPTIONS.length; i++) {
    const ins = WALL_INSCRIPTIONS[i];
    if (isRoomOccluded(ins.roomId)) continue;
    if (ins.hideWhenShortcutOpen && G.worldState && G.worldState.shortcutOpen) continue;
    if (ins.hideWhenDoubleJump && G.worldState && G.worldState.abilities.doubleJump) continue;
    if (ins.hideWhenShadeDash && G.worldState && G.worldState.abilities.shadeDash) continue;
    if (ins.hideWhenBoss2Defeated && G.worldState && G.worldState.boss2Defeated) continue;
    if (ins.hideWhenPuzzleSolved && G.worldState && G.worldState.solvedPuzzles && G.worldState.solvedPuzzles.has(ins.hideWhenPuzzleSolved)) continue;
    if (!isInView(ins.x - 160, ins.y - 24, 320, 48, 80)) continue;
    const d = Math.hypot(px - ins.x, py - ins.y);
    if (d < bestDist) {
      bestDist = d;
      bestIns = ins;
    }
  }
  if (!bestIns) return;
  // Suppress inscription if an [E] interact badge is displayed right next to it so two texts never overlap
  if (promptActive && Math.abs(bestIns.y - (G.player.y - 40)) < 110 && Math.abs(bestIns.x - px) < 165) return;

  const proximity = Math.max(0, Math.min(1, (205 - bestDist) / 105));
  const alpha = proximity * 0.82;
  if (alpha < 0.04) return;

  let label = locInscription(bestIns.text);
  if (bestIns.dynamicKey) {
    const k = getControlLabels();
    if (bestIns.dynamicKey === 'grapple') label = t('ins.grapple', k.grapple);
    else if (bestIns.dynamicKey === 'pogoSpell') label = t('ins.pogoSpell', k.spell);
    else if (bestIns.dynamicKey === 'parry') label = t('ins.parry', k.parry);
    else if (bestIns.dynamicKey === 'bellPuzzle') label = t('ins.bellPuzzle', k.spell);
  }

  G.ctx.save();
  G.ctx.globalAlpha = alpha;
  const boxW = drawCachedBadge(G.ctx, label, bestIns.x, bestIns.y, {
    size: 12.5, bold: false, bg: 'rgba(6, 9, 15, 0.62)', border: '',
    color: '#e5ddc7', minW: 124, maxW: 388, padX: 14, h: 22, boxTopOff: -14, textOffY: 0
  });
  const halfW = boxW * 0.5;
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.36)';
  G.ctx.lineWidth = 1;
  boilLine(G.ctx, bestIns.x - halfW + 8, bestIns.y + 7, bestIns.x + halfW - 8, bestIns.y + 7, 4100 + bestIns.x, 0.6, 3);
  G.ctx.restore();
}

export function drawAltars() {
  for (const altar of ALTARS) {
    const { x, y } = altar;
    if (isRoomOccluded(altar.roomId) || !isInView(x - 60, y - 100, 120, 110, 100)) continue;
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

function hasNpcClaimableReward(npc) {
  if (!G.worldState) return false;
  const nq = G.worldState.npcQuests || {};
  const codex = G.worldState.codex || {};
  if (npc.kind === 'chronicler') {
    const claims = Array.isArray(nq.chroniclerClaims) ? nq.chroniclerClaims : [];
    const readCnt = Array.isArray(codex.readTablets) ? codex.readTablets.length : 0;
    const seenCnt = codex.bestiary ? Object.keys(codex.bestiary).filter(k => codex.bestiary[k] && codex.bestiary[k].seen).length : 0;
    const expPct = getExplorationPercent();
    if (!claims.includes('vol1') && (readCnt >= 2 || expPct >= 35)) return true;
    if (!claims.includes('vol2') && (seenCnt >= 7 || G.worldState.boss2Defeated)) return true;
    if (!claims.includes('vol3') && readCnt >= LORE_TABLETS.length && expPct >= 80) return true;
  } else if (npc.kind === 'keeper') {
    if (!nq.keeperWickGifted && G.worldState.keyItems && G.worldState.keyItems.dawnSigil) return true;
  } else {
    if (G.worldState.bossDefeated && !isWeaponUnlocked('hammer')) return true;
  }
  return false;
}

export function drawNpcs() {
  for (const npc of NPCS) {
    const { x, y } = npc;
    if (isRoomOccluded(npc.roomId) || !isInView(x - 80, y - 110, 160, 120, 100)) continue;
    const pDistNpc = G.player ? Math.hypot((G.player.x + G.player.w * 0.5) - x, (G.player.y + G.player.h) - y) : 999;
    const showNpcName = pDistNpc >= 88 && pDistNpc < 300;
    G.ctx.save();
    const pulse = 0.88 + Math.sin(G.globalTime * 6.0 + x) * 0.12;
    const hasQuestPin = hasNpcClaimableReward(npc);

    if (npc.kind === 'chronicler') {
      // Wandering Ink-Scholar · 墨尘 (Wide bamboo rain hat, scroll quiver, amber lantern staff)
      drawGlowSprite('gold', x + 16, y - 42, 92 * pulse, 0.30);
      drawGlowSprite('cyan', x - 8, y - 34, 48 * pulse, 0.18);

      // Lantern Staff planted in stone beside him
      const stX = x + 19;
      G.ctx.strokeStyle = '#9b8359';
      G.ctx.lineWidth = 2.6;
      G.ctx.beginPath(); G.ctx.moveTo(stX, y); G.ctx.lineTo(stX, y - 64); G.ctx.stroke();
      const lanSway = Math.sin(G.globalTime * 2.4) * 3.5;
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.4;
      G.ctx.beginPath(); G.ctx.moveTo(stX, y - 64); G.ctx.lineTo(stX + 10 + lanSway, y - 50); G.ctx.stroke();
      drawGlowSprite('gold', stX + 10 + lanSway, y - 46, 26 * pulse, 0.72);
      G.ctx.fillStyle = '#241c14';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.fillRect(stX + 6 + lanSway, y - 51, 8, 10);
      G.ctx.strokeRect(stX + 6 + lanSway, y - 51, 8, 10);
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.beginPath(); G.ctx.arc(stX + 10 + lanSway, y - 46, 2.5, 0, Math.PI * 2); G.ctx.fill();

      // Scroll Quiver strapped across back
      G.ctx.save();
      G.ctx.translate(x - 10, y - 38);
      G.ctx.rotate(-0.34);
      G.ctx.fillStyle = '#2c2218';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.4;
      G.ctx.fillRect(-5, -14, 10, 28);
      G.ctx.strokeRect(-5, -14, 10, 28);
      G.ctx.fillStyle = '#e7dec8';
      G.ctx.fillRect(-4, -17, 8, 4);
      G.ctx.restore();

      // Scholar Robe & Wide Bamboo Rain-Hat (蓑笠)
      G.ctx.translate(x, y);
      G.ctx.fillStyle = '#131b29';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-14, 0); G.ctx.lineTo(-10, -48); G.ctx.lineTo(10, -48); G.ctx.lineTo(14, 0);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      // Teal scholar sash
      G.ctx.strokeStyle = COLORS.cyan;
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath(); G.ctx.moveTo(-9, -36); G.ctx.lineTo(9, -28); G.ctx.stroke();
      // Wide conical hat
      G.ctx.fillStyle = '#252019';
      G.ctx.strokeStyle = COLORS.gold;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-24, -52); G.ctx.quadraticCurveTo(0, -70, 24, -52); G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      // Open parchment scroll in hands
      G.ctx.fillStyle = '#e8dfc9';
      G.ctx.fillRect(3, -34, 11, 8);
      G.ctx.fillStyle = COLORS.cyanBright;
      G.ctx.beginPath(); G.ctx.arc(8 + Math.sin(G.globalTime * 5) * 3, -31, 1.8, 0, Math.PI * 2); G.ctx.fill();

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'chronicler'), 2, -76, { size: 11.5, bold: false, color: 'rgba(186, 230, 253, 0.78)' });
      }
    } else if (npc.kind === 'keeper') {
      // Former Bell-Keeper · 汐 (Seated silver-veiled guardian with twin-wick cyan-gold sanctuary lantern)
      const gifted = !!(G.worldState && G.worldState.npcQuests && G.worldState.npcQuests.keeperWickGifted);
      drawGlowSprite(gifted ? 'gold' : 'cyan', x, y - 34, (gifted ? 112 : 92) * pulse, gifted ? 0.40 : 0.30);

      // Cracked miniature bronze bell resting on stone beside her
      G.ctx.fillStyle = '#241d17';
      G.ctx.strokeStyle = gifted ? COLORS.goldBright : 'rgba(216, 207, 184, 0.55)';
      G.ctx.lineWidth = 1.5;
      G.ctx.beginPath();
      G.ctx.moveTo(x - 26, y); G.ctx.lineTo(x - 22, y - 16); G.ctx.quadraticCurveTo(x - 16, y - 22, x - 11, y - 16); G.ctx.lineTo(x - 7, y);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

      G.ctx.translate(x, y);
      // Flowing kneeling silver-ink cloak
      const veilSway = Math.sin(G.globalTime * 2.6) * 4;
      G.ctx.fillStyle = '#151c2c';
      G.ctx.strokeStyle = gifted ? COLORS.goldBright : COLORS.cyanBright;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-18, 0); G.ctx.quadraticCurveTo(-16, -34, -8, -44);
      G.ctx.lineTo(8, -44); G.ctx.quadraticCurveTo(16, -32, 19 + veilSway * 0.4, 0);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      // Hooded head & fluttering silver veil
      G.ctx.fillStyle = '#1f283b';
      G.ctx.beginPath(); G.ctx.arc(0, -50, 9.5, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
      G.ctx.lineWidth = 2;
      G.ctx.beginPath();
      G.ctx.moveTo(6, -54); G.ctx.quadraticCurveTo(16 + veilSway, -42, 20 + veilSway * 1.4, -22);
      G.ctx.stroke();
      // Twin-wick lantern cradled in front
      drawGlowSprite('cyan', 13, -22, 24 * pulse, 0.75);
      drawGlowSprite('gold', 13, -22, 15 * pulse, 0.68);
      G.ctx.fillStyle = '#121826';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1.4;
      G.ctx.fillRect(8, -28, 10, 12);
      G.ctx.strokeRect(8, -28, 10, 12);
      G.ctx.fillStyle = '#fef9c3';
      G.ctx.beginPath(); G.ctx.arc(13, -22, 3.2, 0, Math.PI * 2); G.ctx.fill();

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'keeper'), 2, -70, { size: 11.5, bold: false, color: gifted ? 'rgba(253, 224, 71, 0.82)' : 'rgba(186, 230, 253, 0.78)' });
      }
    } else {
      // Blind Old Bellsmith · 砺 (Default smith)
      drawGlowSprite('gold', x + 16, y - 24, 115 * pulse, 0.34);

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
      drawGlowSprite('gold', ax, y - 27, 22 * pulse, 0.72);
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.fillRect(ax - 7, y - 28, 14, 4);

      const tapCycle = Math.sin(G.globalTime * 3.4);
      const hammerLift = tapCycle > 0.3 ? (tapCycle - 0.3) * 1.1 : 0;
      G.ctx.translate(x - 6, y);
      G.ctx.fillStyle = '#151924';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath();
      G.ctx.moveTo(-16, 0); G.ctx.lineTo(-14, -44); G.ctx.quadraticCurveTo(0, -54, 14, -42);
      G.ctx.lineTo(17, 0); G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#1e2433';
      G.ctx.beginPath(); G.ctx.arc(2, -52, 11, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = '#d8cfb8';
      G.ctx.lineWidth = 3;
      G.ctx.beginPath(); G.ctx.moveTo(-5, -53); G.ctx.lineTo(12, -51); G.ctx.stroke();
      G.ctx.fillStyle = '#b7afa0';
      G.ctx.beginPath(); G.ctx.moveTo(2, -45); G.ctx.lineTo(11, -44); G.ctx.lineTo(6, -31); G.ctx.closePath(); G.ctx.fill();

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

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'smith'), 10, -72, { size: 11.5, bold: false, color: 'rgba(253, 224, 71, 0.72)' });
      }
    }

    if (hasQuestPin) {
      const bob = Math.sin(G.globalTime * 5.2) * 3.5;
      drawGlowSprite('gold', 2, -92 + bob, 16, 0.78);
      drawCachedText(G.ctx, '✦', 2, -88 + bob, { size: 14, bold: true, color: COLORS.goldBright });
    }
    G.ctx.restore();
  }
}

export function drawShortcutGate() {
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

export function drawChapelExitGate() {
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

export function drawFoundryEntryGate() {
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

export function drawFoundryExitGate() {
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

export function drawFirstBellCore() {
  if (!G.worldState || !G.worldState.boss3Defeated || G.echoSession) return;
  const { x, y } = FIRST_BELL_CORE_POS;
  if (x < G.cam.x - 160 || x > G.cam.x + G.canvasW + 160) return;
  const bob = Math.sin(G.globalTime * 2.8) * 7;
  const cy = y - 64 + bob;
  const hasDawn = !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  G.ctx.save();
  drawGlowSprite('gold', x, cy, 86, 0.78);
  if (hasDawn) drawGlowSprite('cyan', x, cy, 52, 0.56);
  // Radiant Astral Pillar descending onto First Bell Core (zero per-frame gradient)
  G.ctx.fillStyle = hasDawn ? 'rgba(254, 240, 138, 0.10)' : 'rgba(245, 158, 11, 0.07)';
  G.ctx.fillRect(x - 38, y * 0.12, 76, y * 0.84);
  G.ctx.fillStyle = hasDawn ? 'rgba(254, 240, 138, 0.12)' : 'rgba(245, 158, 11, 0.08)';
  G.ctx.fillRect(x - 18, y * 0.25, 36, y * 0.68);
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

export function drawPendulums() {
  for (let idx = 0; idx < PENDULUMS.length; idx++) {
    const pd = PENDULUMS[idx];
    if (!isInView(pd.x - pd.len, pd.anchorY, pd.len * 2, pd.len + 40, 80)) continue;
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
  }
}

export function drawSecretWalls() {
  if (!G.worldState) return;
  const curRm = G.currentRoomId ? ROOMS.find(r => r.id === G.currentRoomId) : null;
  for (const w of G.worldState.secretWalls) {
    if (w.broken) continue;
    if (isRoomOccluded(w.roomId)) {
      // Allow a border secret wall (like wall_crypt_east) to remain visible from its horizontally adjacent room
      if (!curRm) continue;
      const b = curRm.bounds;
      const touchesCur = (Math.abs((w.x + w.w) - b.x) <= 8 || Math.abs(w.x - (b.x + b.w)) <= 8) &&
                         (w.y + w.h > b.y && w.y < b.y + b.h);
      if (!touchesCur) continue;
    }
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

export function drawVoidBarriers() {
  if (!VOID_BARRIERS.length) return;
  const unlocked = !!(G.worldState && G.worldState.abilities.shadeDash);
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    if (!isInView(vb.x, vb.y, vb.w, vb.h, 80)) continue;
    const cx = vb.x + vb.w * 0.5;
    const cy = vb.y + vb.h * 0.5;
    G.ctx.save();
    drawGlowSprite('violet', cx, cy, Math.max(44, vb.h * 0.52), unlocked ? 0.44 : 0.62);
    // Obsidian-violet ink curtain body (zero per-frame gradient)
    G.ctx.fillStyle = 'rgba(16, 8, 28, 0.86)';
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

export function drawLostEchoes() {
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
  // Amount Label (cached glyph blit)
  drawCachedText(G.ctx, t('ren.lostEcho', le.amount), x, y - 29, {
    size: 12, bold: true, color: COLORS.cyanBright, shadow: true, shadowOffX: 1, shadowOffY: 1
  });
  G.ctx.restore();
}

export function drawPickups() {
  if (!G.worldState) return;
  for (const p of G.worldState.pickups) {
    if (p.collected || isRoomOccluded(p.roomId)) continue;
    if (!isInView(p.x - 36, p.y - 60, 72, 70, 80)) continue;
    const bob = Math.sin(G.globalTime * 3.6 + p.x) * 5;
    const py = p.y - 28 + bob;
    const isFlask = p.kind === 'flaskCore';
    const isAbility = p.kind === 'ability';
    const isWeapon = p.kind === 'weapon';
    const isKey = p.kind === 'keyItem';
    const isShade = (isAbility && p.abilityId === 'shadeDash') || p.kind === 'statCore';
    const col = isKey ? '#fef9c3' : (isShade ? COLORS.violetBright : (isFlask || isAbility || isWeapon ? COLORS.cyanBright : COLORS.goldBright));

    G.ctx.save();
    drawGlowSprite(isShade ? 'violet' : (isFlask || isAbility || isWeapon ? 'cyan' : 'gold'), p.x, py, (isAbility || isWeapon) ? 64 : 46, (isAbility || isWeapon) ? 0.58 : 0.42);
    if (isWeapon) drawGlowSprite('gold', p.x, py, 36, 0.44);

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
    if (isWeapon) {
      // Floating Hand-Drawn Soul-Calling Bell Staff Relic Shrine
      G.ctx.rotate(-0.35 + Math.sin(G.globalTime * 2.8) * 0.14);
      G.ctx.strokeStyle = '#6b4c30';
      G.ctx.lineWidth = 3.0;
      G.ctx.beginPath(); G.ctx.moveTo(-14, 14); G.ctx.lineTo(10, -10); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath(); G.ctx.arc(11, -11, 6, -1.6, 1.4); G.ctx.stroke();
      G.ctx.fillStyle = '#2a2016';
      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(8, -11); G.ctx.lineTo(15, -11); G.ctx.lineTo(18, -1); G.ctx.lineTo(5, -1);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#e0f2fe';
      G.ctx.beginPath(); G.ctx.arc(11.5, 1, 2.8, 0, Math.PI * 2); G.ctx.fill();
    } else if (isAbility) {
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

export function drawWindZones() {
  if (!WIND_ZONES.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < WIND_ZONES.length; i++) {
    const wz = WIND_ZONES[i];
    if (isRoomOccluded(wz.roomId) || !isInView(wz.x, wz.y, wz.w, wz.h, 80)) continue;
    ctx.save();
    // Soft translucent azure-white ink draft column
    ctx.fillStyle = 'rgba(186, 230, 253, 0.055)';
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 12]);
    ctx.strokeRect(wz.x + 2, wz.y + 2, wz.w - 4, wz.h - 4);
    ctx.setLineDash([]);

    // Rising hand-drawn calligraphic wind ribbons
    const cols = Math.max(3, Math.floor(wz.w / 34));
    for (let c = 0; c < cols; c++) {
      const phase = ((G.globalTime * 1.35 + c * 0.31 + i * 0.17) % 1);
      const rx = wz.x + ((c + 0.5) / cols) * wz.w + Math.sin(G.globalTime * 4 + c * 1.9) * 8;
      const ry = wz.y + wz.h - phase * wz.h;
      const ribLen = Math.min(72, wz.h * 0.28);
      const alpha = Math.sin(phase * Math.PI) * 0.58;
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + Math.sin(G.globalTime * 7 + c) * 9, ry - ribLen * 0.5, rx - 3, ry - ribLen);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawBouncePads() {
  if (!BOUNCE_PADS.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < BOUNCE_PADS.length; i++) {
    const bp = BOUNCE_PADS[i];
    if (isRoomOccluded(bp.roomId) || !isInView(bp.x - bp.w, bp.y - bp.h - 24, bp.w * 2, bp.h + 40, 80)) continue;
    const sq = bp.squish || 0;
    const scaleX = 1 + Math.sin(sq * Math.PI) * 0.24;
    const scaleY = 1 - Math.sin(sq * Math.PI) * 0.34;
    const pulse = 0.78 + Math.sin(G.globalTime * 4.5 + i * 1.7) * 0.22;
    ctx.save();
    drawGlowSprite('cyan', bp.x, bp.y - bp.h * 0.65, bp.w * 0.85, (0.34 + sq * 0.42) * pulse);
    ctx.translate(bp.x, bp.y);
    ctx.scale(scaleX, scaleY);

    // Gnarled root-stem stalk
    ctx.fillStyle = '#142622';
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-7, -bp.h * 0.55, -13, -bp.h * 0.65);
    ctx.lineTo(13, -bp.h * 0.65); ctx.quadraticCurveTo(7, -bp.h * 0.55, 10, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Glowing emerald-ink mushroom bounce dome
    const hw = bp.w * 0.5;
    ctx.fillStyle = '#11332c';
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-hw, -bp.h * 0.42);
    ctx.quadraticCurveTo(-hw * 0.82, -bp.h * 1.25, 0, -bp.h * 1.22);
    ctx.quadraticCurveTo(hw * 0.82, -bp.h * 1.25, hw, -bp.h * 0.42);
    ctx.quadraticCurveTo(0, -bp.h * 0.22, -hw, -bp.h * 0.42);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Bioluminescent spore spots on cap
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.arc(-hw * 0.44, -bp.h * 0.74, 3.0, 0, Math.PI * 2);
    ctx.arc(0, -bp.h * 0.92, 3.8, 0, Math.PI * 2);
    ctx.arc(hw * 0.44, -bp.h * 0.74, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawCrumblePlatforms() {
  if (!G.crumblePlatforms) return;
  for (let idx = 0; idx < G.crumblePlatforms.length; idx++) {
    const cp = G.crumblePlatforms[idx];
    if (!isInView(cp.x, cp.y, cp.w, cp.h, 80)) continue;
    G.ctx.save();
    if (cp.state === 'broken') {
      const regenP = 1 - Math.max(0, cp.timer / 3.2);
      G.ctx.setLineDash([5, 5]);
      G.ctx.strokeStyle = '#7dd3fc';
      G.ctx.globalAlpha = 0.18 + regenP * 0.38;
      G.ctx.lineWidth = 1.4;
      G.ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      G.ctx.setLineDash([]);
      G.ctx.restore();
      continue;
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
  }
}

export function drawResonancePuzzles() {
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

export function drawLoreTablets() {
  for (const lt of LORE_TABLETS) {
    const { x, y } = lt;
    if (isRoomOccluded(lt.roomId) || x < G.cam.x - 100 || x > G.cam.x + G.canvasW + 100) continue;
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

export function drawLanterns() {
  for (let idx = 0; idx < G.lanterns.length; idx++) {
    const l = G.lanterns[idx];
    if (isRoomOccluded(l.roomId)) continue;
    const topY0 = l.topY !== undefined ? l.topY : 0;
    if (!isInView(l.x - 60, topY0, 120, (l.anchorY + l.len) - topY0 + 60, 100)) continue;
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
  }
}

export function drawGrappleAnchors() {
  for (let idx = 0; idx < GRAPPLE_ANCHORS.length; idx++) {
    const a = GRAPPLE_ANCHORS[idx];
    if (isRoomOccluded(a.roomId)) continue;
    const topY0 = a.topY !== undefined ? a.topY : 0;
    if (!isInView(a.x - 40, topY0, 80, a.y - topY0 + 40, 80)) continue;
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
  }
}

export function drawGrappleReticle() {
  if (!G.player || G.player.hp <= 0 || !G.grapplePreviewTarget || G.player.grappleState !== 'none' || G.gameState !== 'playing') return;
  const tgt = G.grapplePreviewTarget;
  const ready = G.player.grappleCd <= 0;
  // Subtle sightline tether so player always sees which hook is locked before pressing Grapple
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + 22;
  G.ctx.save();
  G.ctx.strokeStyle = ready ? 'rgba(125, 211, 252, 0.22)' : 'rgba(148, 163, 184, 0.10)';
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath();
  G.ctx.moveTo(px, py);
  G.ctx.lineTo(tgt.x, tgt.y);
  G.ctx.stroke();

  const pulse = 1 + Math.sin(G.globalTime * 11) * 0.1;
  const rot = G.globalTime * 1.9;
  G.ctx.translate(tgt.x, tgt.y);
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
    drawCachedBadge(G.ctx, getControlLabels().shortGrapple, 0, 37, {
      font: '11px ui-monospace, "Noto Serif SC", monospace',
      bg: 'rgba(8, 12, 18, 0.78)', border: 'rgba(125, 211, 252, 0.55)', borderW: 1,
      color: COLORS.cyanBright, minW: 38, padX: 6, h: 16, boxTopOff: -12, textOffY: 0
    });
  }
  G.ctx.restore();
}

export function drawGrappleThread() {
  if (G.player.grappleState === 'none') return;
  const sx = G.player.x + G.player.w / 2 + G.player.facing * 8;
  const sy = G.player.y + 22;
  let ex = G.player.grappleTx;
  let ey = G.player.grappleTy;
  if (G.player.grappleState === 'extending') {
    const p = 1 - Math.max(0, G.player.grappleTimer / 0.032);
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

export function drawMistBarrier(activeBoss) {
  const x = activeBoss ? activeBoss.arenaMinX - 2 : 2646;
  const y0 = activeBoss ? activeBoss.arenaTopY : 0;
  const h = activeBoss ? (activeBoss.arenaFloorY - y0) : FLOOR_Y;
  G.ctx.save();
  G.ctx.fillStyle = activeBoss && activeBoss.id === 'boss_ji' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(180, 200, 230, 0.18)';
  G.ctx.fillRect(x - 12, y0, 24, h);
  G.ctx.fillStyle = activeBoss && activeBoss.id === 'boss_ji' ? 'rgba(245, 158, 11, 0.32)' : 'rgba(180, 200, 230, 0.32)';
  G.ctx.fillRect(x - 4, y0, 8, h);
  G.ctx.restore();
}

