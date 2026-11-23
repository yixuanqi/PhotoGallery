// World Zone Backdrops, Banners, Tombstones, Bone Cairns, Candles & Weather Ripples (split from worldRenderer.js in v43.0)
import {
  COLORS, ALTAR_POS, BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS, FLOOR_Y, WELL_BOTTOM_Y
} from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle } from '../vfx.js';
import { isInView, BACKDROP_LANCETS, BACKDROP_GRAVES } from './renderShared.js';
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

