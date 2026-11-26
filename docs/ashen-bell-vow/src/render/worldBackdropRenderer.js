// World Zone Backdrops, Banners, Tombstones, Bone Cairns, Candles & Weather Ripples (v45.9 Room-Relative Decoupled)
import {
  COLORS, ALTAR_POS, BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS
} from '../config.js';
import { G, getRoomById, roomLocalX, roomLocalY } from '../state.js';
import { drawGlowSprite, boilCircle } from '../vfx.js';
import { isRoomOccluded } from '../world.js';
import { isInView, ROOM_BACKDROP_LANCETS, ROOM_BACKDROP_GRAVES } from './renderShared.js';
import {
  getSanctuaryArchSprite, getLancetWindowSprite, getChapelStaticBackdrop,
  getFoundryStaticBackdrop, getWoodsTreeHollowSprite, getWindVentGratesSprite,
  getGraveSprite, getBoneCairnSprite
} from './backdropCache.js';

function blitBackdropPanel(img, x, y, flipX = false) {
  if (!img) return;
  const w = img._logW || img.width;
  const h = img._logH || img.height;
  if (flipX) {
    G.ctx.save();
    G.ctx.translate(x + w, y);
    G.ctx.scale(-1, 1);
    G.ctx.drawImage(img, 0, 0, w, h);
    G.ctx.restore();
  } else {
    G.ctx.drawImage(img, x, y, w, h);
  }
}

function isRoomBoundsInView(rm, pad = 100) {
  if (!rm || !rm.bounds || isRoomOccluded(rm.id)) return false;
  return isInView(rm.bounds.x, rm.bounds.y, rm.bounds.w, rm.bounds.h, pad);
}

export function drawWorldBackdrop() {
  G.ctx.save();
  const now = G.globalTime || 0;

  // A. Zone 1 Sanctuary Arch Canopy behind Extinguished Altar (room-anchored to r01_sanctuary + ALTAR_POS)
  const r01 = getRoomById('r01_sanctuary');
  if (r01 && isRoomBoundsInView(r01, 100)) {
    const ax = ALTAR_POS.x;
    const ay = ALTAR_POS.y;
    const archImg = getSanctuaryArchSprite();
    blitBackdropPanel(archImg, ax - 110, ay - ((archImg._logH || archImg.height) - 8));

    G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.26)';
    G.ctx.lineWidth = 1.4;
    boilCircle(G.ctx, ax, roomLocalY(r01, 250), 22, 210, 0.9, 14);
    G.ctx.stroke();
  }

  // B. Gothic Lancet Windows & Angled Moonbeams (anchored to host room bounds!)
  const lancetImg = getLancetWindowSprite();
  for (let gi = 0; gi < ROOM_BACKDROP_LANCETS.length; gi++) {
    const grp = ROOM_BACKDROP_LANCETS[gi];
    const rm = getRoomById(grp.roomId);
    if (!isRoomBoundsInView(rm, 160)) continue;
    const ly = roomLocalY(rm, grp.yOff);
    for (let li = 0; li < grp.offsets.length; li++) {
      const wx = roomLocalX(rm, grp.offsets[li]);
      if (!isInView(wx - 130, ly, 210, 460, 40)) continue;
      blitBackdropPanel(lancetImg, rm.mirrored ? (wx - 80) : (wx - 130), ly, !!rm.mirrored);
    }
  }

  // ========== ARENA 1 (r03_chapel): 雨夜坍塌礼拜堂 (Room-Relative) ==========
  const r03 = getRoomById('r03_chapel');
  if (isRoomBoundsInView(r03, 60)) {
    const ox = r03.bounds.x;
    const oy = r03.bounds.y;
    const rw = r03.bounds.w;
    const floorY = oy + 580;
    const isP2 = !!(G.boss && G.boss.awake && G.boss.phase === 2);
    const stormPhase = (now * 0.37) % 1;
    const lightning = stormPhase > 0.94 ? Math.sin(((stormPhase - 0.94) / 0.06) * Math.PI) * (isP2 ? 0.28 : 0.16) : 0;
    if (lightning > 0.01) {
      G.ctx.fillStyle = isP2 ? `rgba(248, 113, 113, ${lightning.toFixed(3)})` : `rgba(186, 230, 253, ${lightning.toFixed(3)})`;
      G.ctx.fillRect(ox, oy, rw, floorY - oy);
    }

    drawGlowSprite(isP2 ? 'crimson' : 'gold', roomLocalX(r03, 543), floorY - 40, 128, isP2 ? 0.30 : 0.15);
    const chapelImg = getChapelStaticBackdrop(isP2);
    const cW = chapelImg._logW || chapelImg.width;
    blitBackdropPanel(chapelImg, r03.mirrored ? (ox + rw - cW + 5) : (ox - 5), oy, !!r03.mirrored);

    // Live Slanted Rain Streaks
    G.ctx.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.19)' : 'rgba(186, 230, 253, 0.18)';
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    const rainSpan = Math.max(300, rw - 155);
    for (let ri = 0; ri < 26; ri++) {
      const rx0 = ox + 75 + ((ri * 97 + now * 140) % rainSpan);
      const ry0 = oy + ((ri * 131 + now * 620) % Math.max(120, floorY - oy - 20));
      G.ctx.moveTo(rx0, ry0);
      G.ctx.lineTo(rx0 - 9, ry0 + 26);
    }
    G.ctx.stroke();
  }

  // ========== ARENA 2 (r05_foundry): 沸腾地下熔金铸造坑 (Room-Relative) ==========
  const r05 = getRoomById('r05_foundry');
  if (isRoomBoundsInView(r05, 60)) {
    const ox = r05.bounds.x;
    const oy = r05.bounds.y;
    const rw = r05.bounds.w;
    const fx = ox + rw * 0.5;
    const floorY = oy + 600;
    const isJiP2 = !!(G.boss2 && G.boss2.awake && G.boss2.phase === 2);
    const gearSpd = isJiP2 ? 0.42 : 0.18;
    drawGlowSprite(isJiP2 ? 'crimson' : 'gold', fx, oy + 405, 270, isJiP2 ? 0.36 : 0.22);

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
    drawFoundryGear(fx - 155, oy + 360, 118, 16, now * gearSpd);
    drawFoundryGear(fx + 148, oy + 390, 96, 14, -now * gearSpd * 1.15);

    blitBackdropPanel(getFoundryStaticBackdrop(isJiP2), fx - 275, oy + 35);

    const streamTopY = oy + 162;
    const streamW = isJiP2 ? 22 : 14;
    const pulseW = Math.sin(now * 9) * 2.5;
    G.ctx.fillStyle = isJiP2 ? 'rgba(251, 146, 60, 0.42)' : 'rgba(245, 158, 11, 0.30)';
    G.ctx.fillRect(fx - (streamW + pulseW) * 0.5, streamTopY, streamW + pulseW, floorY - streamTopY);
    G.ctx.fillStyle = '#fef08a';
    G.ctx.globalAlpha = 0.42;
    G.ctx.fillRect(fx - 3, streamTopY, 6, floorY - streamTopY);
    G.ctx.globalAlpha = 1;

    G.ctx.fillStyle = isJiP2 ? COLORS.goldBright : '#fb923c';
    for (let ei = 0; ei < 14; ei++) {
      const ex = fx - 210 + ((ei * 73) % 420) + Math.sin(now * 2 + ei) * 14;
      const ey = floorY - 12 - ((now * 75 + ei * 53) % 420);
      G.ctx.fillRect(ex, ey, 2.6, 5.5);
    }
  }

  // Helper: Draw Mirror Abyss Sacred Monoliths & Broken Ring (used in r25_mirror_abyss OR r08_heart during Zhu Echo!)
  const drawZhuBackdropAt = (hx, oy, zP3, st) => {
    const hy = oy + 235;
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

    const monoOffs = [-350, 0, 350];
    for (let mi = 0; mi < monoOffs.length; mi++) {
      const mx = hx + monoOffs[mi];
      const my = oy + 320 + Math.sin(now * 1.2 + mi * 2.1) * 10;
      G.ctx.fillStyle = 'rgba(10, 14, 24, 0.80)';
      G.ctx.strokeStyle = mi === 1 ? stCol : 'rgba(216, 207, 184, 0.22)';
      G.ctx.globalAlpha = 0.65;
      G.ctx.lineWidth = 1.6;
      G.ctx.fillRect(mx - 14, my, 28, 128);
      G.ctx.strokeRect(mx - 14, my, 28, 128);
    }
    G.ctx.globalAlpha = 1;
  };

  // ========== ARENA 3 (r08_heart): 穹顶碎裂的星渊天台 (Room-Relative) ==========
  const r08 = getRoomById('r08_heart');
  if (isRoomBoundsInView(r08, 60)) {
    const ox = r08.bounds.x;
    const oy = r08.bounds.y;
    const floorY = oy + 580;
    const hx = roomLocalX(r08, 640);
    const isZhuEchoHere = !!(G.boss4 && G.boss4.alive && G.boss4.roomId === 'r08_heart');

    if (isZhuEchoHere) {
      drawZhuBackdropAt(hx, oy, G.boss4.phase >= 3, G.boss4.stance || 'blade');
    } else {
      const hy = oy + 205;
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
          const sx = ox + 100 + ((si * 79) % 1080);
          const sy = floorY - ((now * (b3Phase >= 3 ? 130 : 65) + si * 73) % 520);
          G.ctx.moveTo(sx, sy);
          G.ctx.lineTo(sx + Math.sin(now * 3 + si) * 5, sy - 34);
        }
        G.ctx.stroke();
      }

      G.ctx.fillStyle = '#15101d';
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.26)';
      G.ctx.lineWidth = 1.4;
      const domeRocks = [
        [260, 132, 42, 26], [400, 88, 34, 22], [880, 96, 38, 24], [1030, 146, 46, 28]
      ];
      for (let di = 0; di < domeRocks.length; di++) {
        const [lx, ly, rwR, rhR] = domeRocks[di];
        const rx = roomLocalX(r08, lx, rwR);
        const ry = oy + ly;
        const lift = Math.sin(now * 1.3 + di * 1.7) * (b3Phase >= 2 ? 12 : 5);
        G.ctx.fillRect(rx, ry + lift, rwR, rhR);
        G.ctx.strokeRect(rx, ry + lift, rwR, rhR);
      }

      G.ctx.strokeStyle = b3Phase >= 3 ? 'rgba(254, 240, 138, 0.42)' : 'rgba(216, 207, 184, 0.30)';
      G.ctx.lineWidth = 2.4;
      for (let swi = 0; swi < 12; swi++) {
        const sx = ox + 110 + swi * 96;
        if (Math.abs(sx - hx) < 90) continue;
        const hBlade = 46 + (swi % 3) * 18;
        const tilt = ((swi % 5) - 2) * 0.08 + (b3Phase >= 3 ? Math.sin(now * 22 + swi) * 0.025 : 0);
        G.ctx.save();
        G.ctx.translate(sx, floorY);
        G.ctx.rotate(tilt);
        G.ctx.beginPath();
        G.ctx.moveTo(0, 0); G.ctx.lineTo(0, -hBlade);
        G.ctx.moveTo(-10, -hBlade + 14); G.ctx.lineTo(10, -hBlade + 14);
        G.ctx.stroke();
        G.ctx.restore();
      }
    }
  }

  // ========== ARENA 4 (r25_mirror_abyss): 炉心镜渊圣环与浮碑 (Room-Relative) ==========
  const r25 = getRoomById('r25_mirror_abyss');
  if (isRoomBoundsInView(r25, 60)) {
    const zP3 = !!(G.boss4 && G.boss4.alive && G.boss4.phase >= 3);
    const st = (G.boss4 && G.boss4.stance) || 'blade';
    drawZhuBackdropAt(r25.bounds.x + r25.bounds.w * 0.5, r25.bounds.y, zP3, st);
  }

  // ========== v30.0 ECOLOGICAL CAUSALITY LANDMARKS (Room-Relative) ==========
  // 1) Foundry-to-Spire Thermal Exhaust Vents (r09_wind_spire)
  const r09 = getRoomById('r09_wind_spire');
  if (isRoomBoundsInView(r09, 100)) {
    const oy = r09.bounds.y;
    const vents = [
      { x: roomLocalX(r09, 275, 155), w: 155 },
      { x: roomLocalX(r09, 720, 165), w: 165 }
    ];
    const foundryCooled = !!(G.worldState && G.worldState.boss2Defeated);
    for (let vi = 0; vi < vents.length; vi++) {
      const vt = vents[vi];
      drawGlowSprite(foundryCooled ? 'cyan' : 'gold', vt.x + vt.w * 0.5, oy + 730, foundryCooled ? 92 : 120, (foundryCooled ? 0.16 : 0.28) + Math.sin(now * 4 + vi) * 0.05);
    }
    const ventImg = getWindVentGratesSprite(foundryCooled);
    blitBackdropPanel(ventImg, roomLocalX(r09, 265, ventImg._logW || ventImg.width), oy + 720, !!r09.mirrored);
    G.ctx.fillStyle = foundryCooled ? 'rgba(186, 230, 253, 0.42)' : 'rgba(251, 146, 60, 0.55)';
    const sparkCnt = foundryCooled ? 5 : 8;
    for (let vi = 0; vi < vents.length; vi++) {
      const vt = vents[vi];
      for (let ei = 0; ei < sparkCnt; ei++) {
        const ex = vt.x + 12 + ((ei * 37 + Math.sin(now * 2.5 + ei) * 14) % (vt.w - 24));
        const ey = oy + 726 - ((now * (foundryCooled ? 130 : 165) + ei * 89) % 690);
        G.ctx.fillRect(ex, ey, 2.4, 7);
      }
    }
  }

  // 2) Glacial Snowmelt Waterfalls cascading down r16_frost_tomb & r11_frost_ridge cliffs
  const drawWaterfall = (fx, y0, y1, fw) => {
    if (!isInView(fx - 20, y0, fw + 40, y1 - y0, 80)) return;
    G.ctx.fillStyle = 'rgba(186, 230, 253, 0.14)';
    G.ctx.fillRect(fx, y0, fw, y1 - y0);
    G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.34)';
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    for (let si = 0; si < 9; si++) {
      const sy = y0 + ((now * 240 + si * 137) % Math.max(80, y1 - y0));
      const sx = fx + 4 + ((si * 7) % Math.max(6, fw - 8));
      G.ctx.moveTo(sx, sy); G.ctx.lineTo(sx, Math.min(y1, sy + 28));
    }
    G.ctx.stroke();
  };
  const r16 = getRoomById('r16_frost_tomb');
  if (isRoomBoundsInView(r16, 100)) {
    drawWaterfall(roomLocalX(r16, 150, 22), roomLocalY(r16, 620), roomLocalY(r16, 1900), 22);
    drawWaterfall(roomLocalX(r16, 1080, 18), roomLocalY(r16, 780), roomLocalY(r16, 1900), 18);
  }
  const r11 = getRoomById('r11_frost_ridge');
  if (isRoomBoundsInView(r11, 100)) {
    drawWaterfall(roomLocalX(r11, 880, 16), roomLocalY(r11, 0), roomLocalY(r11, 420), 16);
  }

  // 3) Abyssal Seepage Aqueducts (r14_woods_cavern) & Cached Ancient Bell-Tree Hollow (r15_woods_heart)
  const r14 = getRoomById('r14_woods_cavern');
  if (isRoomBoundsInView(r14, 100)) {
    const seepLocalX = [1040, 1260, 1430];
    const sy0 = roomLocalY(r14, 36);
    for (let si = 0; si < seepLocalX.length; si++) {
      const sx = roomLocalX(r14, seepLocalX[si]);
      if (!isInView(sx - 16, sy0, 32, 590, 60)) continue;
      G.ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      G.ctx.fillRect(sx - 8, sy0, 16, 586);
      G.ctx.strokeStyle = 'rgba(110, 231, 183, 0.34)';
      G.ctx.lineWidth = 1.5;
      G.ctx.beginPath();
      for (let di = 0; di < 6; di++) {
        const dy = sy0 + 4 + ((now * 210 + di * 95 + si * 33) % 580);
        G.ctx.moveTo(sx + ((di % 3) - 1) * 4, dy);
        G.ctx.lineTo(sx + ((di % 3) - 1) * 4, dy + 22);
      }
      G.ctx.stroke();
    }
  }
  const r15 = getRoomById('r15_woods_heart');
  if (isRoomBoundsInView(r15, 100)) {
    const tx = roomLocalX(r15, 620);
    const ty = roomLocalY(r15, 600);
    drawGlowSprite('cyan', tx, ty - 175, 220, 0.20 + Math.sin(now * 2.2) * 0.05);
    const treeImg = getWoodsTreeHollowSprite();
    blitBackdropPanel(treeImg, tx - 270, ty - ((treeImg._logH || treeImg.height) - 10), !!r15.mirrored);
  }

  // C. Swaying Tattered Cathedral Banners (live cloth sway)
  for (let idx = 0; idx < BANNERS.length; idx++) {
    const bn = BANNERS[idx];
    if (isRoomOccluded(bn.roomId) || !isInView(bn.x - 24, bn.y, 48, bn.len + 12, 80)) continue;
    const sway = Math.sin(now * 1.9 + idx * 1.3) * 9;
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

  // D. Weathered Tombstones (room-anchored pre-baked sprites)
  let graveIdx = 0;
  for (let gi = 0; gi < ROOM_BACKDROP_GRAVES.length; gi++) {
    const grp = ROOM_BACKDROP_GRAVES[gi];
    const rm = getRoomById(grp.roomId);
    if (!isRoomBoundsInView(rm, 80)) { graveIdx += grp.offsets.length; continue; }
    const gy = roomLocalY(rm, grp.floorOff) - 86;
    for (let oi = 0; oi < grp.offsets.length; oi++) {
      const gx = roomLocalX(rm, grp.offsets[oi]);
      if (isInView(gx - 24, gy, 48, 92, 60)) {
        blitBackdropPanel(getGraveSprite(graveIdx), gx - 17, gy);
      }
      graveIdx++;
    }
  }

  // E. Bone Cairns (1 shared pre-baked sprite, now anchored to each cairn's room floor Y!)
  const cairnImg = getBoneCairnSprite();
  for (let idx = 0; idx < BONE_CAIRNS.length; idx++) {
    const bc = BONE_CAIRNS[idx];
    const bx = typeof bc === 'object' ? bc.x : bc;
    const by = typeof bc === 'object' ? bc.y : 580;
    const rid = typeof bc === 'object' ? bc.roomId : null;
    if (isRoomOccluded(rid) || !isInView(bx - 24, by - 26, 48, 30, 60)) continue;
    blitBackdropPanel(cairnImg, bx - 17, by - 22);
  }

  // F. Flickering Wax Candle Clusters
  for (let idx = 0; idx < CANDLE_CLUSTERS.length; idx++) {
    const cl = CANDLE_CLUSTERS[idx];
    if (isRoomOccluded(cl.roomId) || !isInView(cl.x - 48, cl.y - 64, 96, 70, 80)) continue;
    drawGlowSprite('gold', cl.x, cl.y - 16, 46, 0.24);
    for (let i = 0; i < cl.count; i++) {
      const cx = cl.x + (i - (cl.count - 1) / 2) * 8;
      const ch = 10 + ((idx + i * 3) % 3) * 5;
      G.ctx.fillStyle = '#cfc5ae';
      G.ctx.fillRect(cx - 2, cl.y - ch, 4, ch);
      const fl = Math.sin(now * 15 + i * 2.1 + idx) * 1.6;
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
