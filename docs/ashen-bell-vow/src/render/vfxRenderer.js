// Projectiles, Slashes, Impact Bursts, Particles, Weather, Prompts & Cached Floating Texts Renderer (v32.0)
import {
  COLORS, ALTARS, NPCS, LORE_TABLETS, SHORTCUT_GATE_DEF, FIRST_BELL_CORE_POS, FLOOR_Y, DUMMY_MODES, WORLD_SWITCHES_DEF
} from '../config.js';
import { G, isWorldSwitchOn, isSwitchUnlocked, getEffectiveNpcPos } from '../state.js';
import { getActionKeyLabel } from '../input.js';
import { drawGlowSprite, boilLine, boilCircle, drawTaperedCrescent } from '../vfx.js';
import { rgbStr } from '../renderParallax.js';
import { isPickupUnlocked } from '../combat.js';
import { t, isEn, locNpcName, locAltar, locTablet, locPickup, locDummyMode } from '../i18n.js';
import { drawParryStarGlint } from './renderShared.js';
import { drawCachedText, drawCachedBadge } from './glyphAtlas.js';

/* ---------- VFX RENDERERS ---------- */
export function drawProjectiles() {
  for (const pr of G.projectiles) {
    G.ctx.save();
    G.ctx.translate(pr.x, pr.y);
    if (pr.kind === 'hammerWave') {
      const alpha = Math.min(1, pr.life * 3.2);
      const h = (32 + Math.sin(G.globalTime * 28) * 6) * alpha;
      G.ctx.globalAlpha = alpha;
      G.ctx.scale(pr.facing, 1);
      drawGlowSprite('gold', 6, -h * 0.35, 58, 0.85 * alpha);
      // Dark stone-ink seismic breaker crest
      G.ctx.fillStyle = 'rgba(18, 13, 8, 0.90)';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 2.6;
      G.ctx.beginPath();
      G.ctx.moveTo(-28, 14);
      G.ctx.lineTo(-10, -h * 0.72);
      G.ctx.lineTo(6, -h * 0.42);
      G.ctx.lineTo(24, -h * 1.15);
      G.ctx.lineTo(32, 14);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
      // White-gold molten fissure core
      G.ctx.strokeStyle = '#fef9c3';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(-14, 10); G.ctx.lineTo(18, -h * 0.88);
      G.ctx.stroke();
    } else if (pr.kind === 'bellWave') {
      const alpha = Math.min(1, pr.life * 4.0);
      const isHeavy = !!pr.heavy;
      G.ctx.globalAlpha = alpha;
      G.ctx.scale(pr.facing, 1);
      drawGlowSprite(isHeavy ? 'gold' : 'cyan', 4, 0, isHeavy ? 42 : 30, 0.78 * alpha);
      // Outer dark-ink brush ring + glowing harmonic crescent waves
      G.ctx.strokeStyle = 'rgba(8, 12, 20, 0.72)';
      G.ctx.lineWidth = isHeavy ? 8 : 5.5;
      G.ctx.beginPath(); G.ctx.arc(-6, 0, pr.r * 1.05, -1.18, 1.18); G.ctx.stroke();
      G.ctx.strokeStyle = isHeavy ? COLORS.goldBright : COLORS.cyanBright;
      G.ctx.lineWidth = isHeavy ? 4.2 : 3.0;
      G.ctx.beginPath(); G.ctx.arc(-6, 0, pr.r * 1.05, -1.15, 1.15); G.ctx.stroke();
      G.ctx.strokeStyle = '#ffffff';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath(); G.ctx.arc(-13, 0, pr.r * 0.72, -0.95, 0.95); G.ctx.stroke();
    } else if (pr.kind === 'bellHoming') {
      const alpha = Math.min(1, pr.life * 3.5);
      const ang = Math.atan2(pr.vy, pr.vx);
      G.ctx.globalAlpha = alpha;
      G.ctx.rotate(ang);
      drawGlowSprite('cyan', 0, 0, 26, 0.85 * alpha);
      drawGlowSprite('gold', 4, 0, 14, 0.65 * alpha);
      // Trailing harmonic ribbon
      G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      G.ctx.lineWidth = 3.2;
      G.ctx.beginPath(); G.ctx.moveTo(-26, 0); G.ctx.lineTo(0, 0); G.ctx.stroke();
      // Sleek Spirit Bell Dart diamond head
      G.ctx.fillStyle = '#e0f2fe';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(13, 0); G.ctx.lineTo(-2, -6.5); G.ctx.lineTo(-10, 0); G.ctx.lineTo(-2, 6.5);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
    } else if (pr.kind === 'soulWave' || pr.kind === 'crimsonWave') {
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
    } else if (pr.kind === 'yuanResonanceWave') {
      const ang = Math.atan2(pr.vy, pr.vx);
      G.ctx.rotate(ang);
      drawGlowSprite('gold', 0, 0, pr.r * 3.1, pr.reflected ? 0.98 : 0.88);
      drawTaperedCrescent(pr.r * 1.65, pr.r * 0.82, -1.25, 1.25, pr.reflected ? '#fef9c3' : COLORS.goldBright, '#ffffff');
      G.ctx.strokeStyle = pr.reflected ? COLORS.cyanBright : '#fef08a';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath(); G.ctx.arc(0, 0, pr.r * 0.95, -0.95, 0.95); G.ctx.stroke();
    } else if (pr.kind === 'boss4EchoOrb') {
      const col = pr.reflected ? COLORS.goldBright : (pr.stance === 'bell' ? COLORS.cyanBright : COLORS.goldBright);
      drawGlowSprite(pr.reflected ? 'gold' : (pr.stance === 'bell' ? 'cyan' : 'gold'), 0, 0, pr.r * 2.8, 0.90);
      G.ctx.strokeStyle = col;
      G.ctx.lineWidth = 2.4;
      boilCircle(G.ctx, 0, 0, pr.r * 0.95, 6450, 1.4, 12);
      G.ctx.stroke();
      G.ctx.fillStyle = '#fef9c3';
      G.ctx.beginPath(); G.ctx.arc(0, 0, pr.r * 0.45, 0, Math.PI * 2); G.ctx.fill();
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
    } else if (pr.kind === 'windBlade') {
      const ang = Math.atan2(pr.vy, pr.vx);
      G.ctx.rotate(ang);
      drawGlowSprite(pr.reflected ? 'gold' : 'cyan', 0, 0, pr.r * 2.4, 0.82);
      drawTaperedCrescent(pr.r * 1.45, pr.r * 0.72, -1.2, 1.2, pr.reflected ? COLORS.goldBright : '#38bdf8', '#f0f9ff');
    } else if (pr.kind === 'frostShard') {
      const ang = Math.atan2(pr.vy, pr.vx);
      G.ctx.rotate(ang);
      drawGlowSprite(pr.reflected ? 'gold' : 'cyan', 0, 0, pr.r * 2.5, 0.85);
      G.ctx.fillStyle = pr.reflected ? '#fef08a' : '#e0f2fe';
      G.ctx.strokeStyle = pr.reflected ? COLORS.goldBright : '#38bdf8';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(pr.r * 1.5, 0);
      G.ctx.lineTo(0, -pr.r * 0.55);
      G.ctx.lineTo(-pr.r * 1.2, 0);
      G.ctx.lineTo(0, pr.r * 0.55);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
    } else if (pr.kind === 'webOrb') {
      drawGlowSprite(pr.reflected ? 'gold' : 'cyan', 0, 0, pr.r * 2.4, 0.78);
      G.ctx.fillStyle = pr.reflected ? '#fef08a' : '#d1fae5';
      G.ctx.strokeStyle = pr.reflected ? COLORS.goldBright : '#6ee7b7';
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath(); G.ctx.arc(0, 0, pr.r * 0.85, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI + G.globalTime * 4;
        G.ctx.beginPath(); G.ctx.moveTo(Math.cos(a) * -pr.r, Math.sin(a) * -pr.r); G.ctx.lineTo(Math.cos(a) * pr.r, Math.sin(a) * pr.r); G.ctx.stroke();
      }
    } else if (pr.kind === 'emberGlob') {
      drawGlowSprite('gold', 0, 0, pr.r * 2.8, 0.88);
      G.ctx.fillStyle = '#fef08a';
      G.ctx.strokeStyle = '#f97316';
      G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.arc(0, 0, pr.r * 0.9, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
    }
    G.ctx.restore();
  }
}

export function drawTalismans() {
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
    drawCachedText(G.ctx, t('ren.sealGlyph'), 0, isEn() ? 3 : 4, { size: isEn() ? 7.5 : 12, bold: true, color: COLORS.goldBright });
    G.ctx.restore();
  }
}

export function drawChapelTide() {
  if (!G.chapelTide) return;
  const x0 = G.chapelTide.x0 !== undefined ? G.chapelTide.x0 : 2648;
  const w = G.chapelTide.w !== undefined ? G.chapelTide.w : 1090;
  const fy = G.chapelTide.floorY !== undefined ? G.chapelTide.floorY : FLOOR_Y;
  const isGold = G.chapelTide.theme === 'gold';
  G.ctx.save();
  if (G.chapelTide.phase === 'warn') {
    const p = 1 - Math.max(0, G.chapelTide.timer / G.chapelTide.maxTimer);
    const pulse = Math.min(1, 0.35 + Math.sin(G.globalTime * 24) * 0.25 + p * 0.3);
    G.ctx.fillStyle = isGold ? '#f59e0b' : '#dc2626';
    G.ctx.globalAlpha = pulse * 0.22;
    G.ctx.fillRect(x0, fy - 38, w, 19);
    G.ctx.globalAlpha = pulse * 0.46;
    G.ctx.fillRect(x0, fy - 19, w, 19);

    G.ctx.globalAlpha = pulse;
    G.ctx.strokeStyle = isGold ? '#fde047' : '#f87171';
    G.ctx.lineWidth = 2.4;
    boilLine(G.ctx, x0, fy - 3, x0 + w, fy - 3, 8800, 2.2, 16);
    G.ctx.globalAlpha = 1;
  } else if (G.chapelTide.phase === 'surge') {
    const fade = Math.min(1, G.chapelTide.timer * 3.5);
    const surgeH = 86 * fade;
    G.ctx.fillStyle = isGold ? 'rgba(146, 64, 14, 0.92)' : 'rgba(127, 29, 29, 0.92)';
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

export function drawGroundWaves() {
  for (const gw of G.groundWaves) {
    const fy = gw.y !== undefined ? gw.y : FLOOR_Y;
    G.ctx.save();
    if (gw.theme === 'vine') {
      G.ctx.fillStyle = 'rgba(20, 83, 45, 0.90)';
      G.ctx.strokeStyle = '#4ade80';
      G.ctx.lineWidth = 2.2;
      G.ctx.beginPath();
      G.ctx.moveTo(gw.x - gw.w * 0.55, fy);
      G.ctx.lineTo(gw.x - gw.w * 0.2, fy - gw.h * 0.9);
      G.ctx.lineTo(gw.x, fy - gw.h * 1.32);
      G.ctx.lineTo(gw.x + gw.w * 0.22, fy - gw.h * 0.82);
      G.ctx.lineTo(gw.x + gw.w * 0.55, fy);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
    } else if (gw.theme === 'frost') {
      G.ctx.fillStyle = 'rgba(56, 189, 248, 0.86)';
      G.ctx.strokeStyle = '#e0f2fe';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(gw.x - gw.w * 0.5, fy);
      G.ctx.lineTo(gw.x - gw.w * 0.14, fy - gw.h * 1.1);
      G.ctx.lineTo(gw.x + gw.w * 0.08, fy - gw.h * 1.38);
      G.ctx.lineTo(gw.x + gw.w * 0.5, fy);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
    } else {
      G.ctx.fillStyle = gw.gold ? 'rgba(245, 158, 11, 0.88)' : 'rgba(220, 38, 38, 0.85)';
      G.ctx.strokeStyle = gw.gold ? COLORS.goldBright : COLORS.crimsonBright;
      G.ctx.lineWidth = 2;
      G.ctx.beginPath();
      G.ctx.moveTo(gw.x - gw.w * 0.5, fy);
      G.ctx.quadraticCurveTo(gw.x, fy - gw.h * 1.4, gw.x + gw.w * 0.5, fy);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    }
    G.ctx.restore();
  }
}

export function drawSporeClouds() {
  if (!G.sporeClouds || G.sporeClouds.length === 0) return;
  for (let i = 0; i < G.sporeClouds.length; i++) {
    const sc = G.sporeClouds[i];
    const fade = Math.min(1, sc.life * 1.4, (sc.maxLife - sc.life + 0.2) * 3.0);
    const pulse = 1 + Math.sin(G.globalTime * 4.5 + i * 1.7) * 0.06;
    const r = sc.r * pulse;
    G.ctx.save();
    G.ctx.globalAlpha = 0.56 * fade;
    G.ctx.fillStyle = '#0f2e1f';
    G.ctx.beginPath();
    G.ctx.ellipse(sc.x, sc.y, r, r * 0.68, 0, 0, Math.PI * 2);
    G.ctx.fill();

    G.ctx.globalAlpha = 0.36 * fade;
    G.ctx.fillStyle = '#22c55e';
    G.ctx.beginPath();
    G.ctx.ellipse(sc.x - r * 0.25, sc.y - r * 0.12, r * 0.62, r * 0.44, 0.2, 0, Math.PI * 2);
    G.ctx.ellipse(sc.x + r * 0.28, sc.y + r * 0.06, r * 0.55, r * 0.40, -0.25, 0, Math.PI * 2);
    G.ctx.fill();

    G.ctx.globalAlpha = 0.72 * fade;
    G.ctx.strokeStyle = '#6ee7b7';
    G.ctx.lineWidth = 1.8;
    boilCircle(G.ctx, sc.x, sc.y, r * 0.78, 7600 + i * 31, 2.4, 14);
    G.ctx.stroke();
    G.ctx.restore();
  }
}

export function drawFrostOverlay() {
  const ctx = G.ctx;
  const now = G.globalTime;

  // Warden Phase-2 Arena Screen Overlays (Gale Crosswind Streaks / Summit Blizzard Squall)
  const wfx = G.wardenArenaFx;
  if (wfx) {
    if (wfx.windTimer > 0 && wfx.windDir !== 0) {
      const a = Math.min(0.42, wfx.windTimer * 0.25);
      ctx.save();
      ctx.strokeStyle = `rgba(186, 230, 253, ${a.toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const y = ((i * 53 + now * 22) % G.canvasH);
        const rawX = ((i * 197 + now * 680 * wfx.windDir) % (G.canvasW + 220) + (G.canvasW + 220)) % (G.canvasW + 220) - 110;
        ctx.moveTo(rawX, y);
        ctx.lineTo(rawX + wfx.windDir * (64 + (i % 3) * 28), y - 6);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (wfx.blizzardAlpha > 0.02) {
      const ba = wfx.blizzardAlpha;
      ctx.save();
      ctx.strokeStyle = `rgba(224, 242, 254, ${(0.34 * ba).toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 113 - now * 460) % (G.canvasW + 180) + (G.canvasW + 180)) % (G.canvasW + 180) - 90;
        const sy = ((i * 71 + now * 240) % (G.canvasH + 120)) - 60;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 24, sy + 14);
      }
      ctx.stroke();
      ctx.strokeStyle = `rgba(186, 230, 253, ${(0.24 * ba).toFixed(3)})`;
      ctx.lineWidth = 26;
      ctx.strokeRect(0, 0, G.canvasW, G.canvasH);
      ctx.restore();
    }
  }

  if (!G.player || G.player.hp <= 0) return;
  const meter = G.player.frostMeter || 0;
  const chilled = G.player.frostChilledTimer || 0;
  const wet = G.player.wetTimer || 0;
  if (meter <= 0 && chilled <= 0 && wet <= 0) return;

  ctx.save();
  if (meter > 0 || chilled > 0) {
    const rimAlpha = chilled > 0 ? Math.min(0.42, 0.24 + Math.sin(now * 6) * 0.06) : (meter / 100) * 0.28;
    ctx.strokeStyle = `rgba(125, 211, 252, ${rimAlpha.toFixed(3)})`;
    ctx.lineWidth = chilled > 0 ? 22 : 14;
    ctx.strokeRect(0, 0, G.canvasW, G.canvasH);

    const barW = 156;
    const barH = 7;
    const bx = G.canvasW * 0.5 - barW * 0.5;
    const by = G.canvasH - 118;
    ctx.fillStyle = 'rgba(8, 16, 28, 0.84)';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx - 2, by - 2, barW + 4, barH + 4);
    const ratio = chilled > 0 ? Math.min(1, chilled / 4.6) : Math.min(1, meter / 100);
    ctx.fillStyle = chilled > 0 ? '#38bdf8' : '#bae6fd';
    ctx.fillRect(bx, by, barW * ratio, barH);
    drawCachedText(ctx, chilled > 0 ? t('hud.frostChilled') : t('hud.frostBuildup'), G.canvasW * 0.5, by - 6, { size: 11.5, bold: true, color: '#e0f2fe' });
  }
  if (wet > 0) {
    const wBarW = 128;
    const wbx = G.canvasW * 0.5 - wBarW * 0.5;
    const wby = (meter > 0 || chilled > 0) ? (G.canvasH - 144) : (G.canvasH - 118);
    ctx.fillStyle = 'rgba(7, 22, 36, 0.84)';
    ctx.fillRect(wbx - 2, wby - 2, wBarW + 4, 9);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(wbx - 2, wby - 2, wBarW + 4, 9);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(wbx, wby, wBarW * Math.min(1, wet / 5.5), 5);
    drawCachedText(ctx, t('hud.wetStatus'), G.canvasW * 0.5, wby - 5, { size: 10.5, bold: true, color: '#7dd3fc' });
  }
  ctx.restore();
}


export function drawBellQuakes() {
  if (!G.bellQuakes) return;
  for (const bq of G.bellQuakes) {
    const a = Math.max(0, bq.life / bq.maxLife);
    const p = 1 - a;
    const sc = 0.62 + p * 0.55;
    G.ctx.save();
    G.ctx.translate(bq.x, bq.y - 24 - p * 36);
    G.ctx.globalAlpha = Math.min(1, a * 1.25);

    // Rising cyan-gold sonic pillar behind spectral bell (zero per-frame gradient)
    const pilW = bq.radius * 0.92 * (1 - p * 0.22);
    const pilH = bq.radius * 1.38;
    G.ctx.fillStyle = 'rgba(186, 230, 253, 0.20)';
    G.ctx.fillRect(-pilW * 0.5, -pilH * 0.85, pilW, pilH * 0.85 + 30);
    G.ctx.fillStyle = 'rgba(56, 189, 248, 0.26)';
    G.ctx.fillRect(-pilW * 0.32, -pilH * 0.52, pilW * 0.64, pilH * 0.52 + 30);

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



export function drawDelayedStrikes() {
  if (!G.delayedStrikes || G.delayedStrikes.length === 0) return;
  for (let i = 0; i < G.delayedStrikes.length; i++) {
    const ds = G.delayedStrikes[i];
    const p = 1 - Math.max(0, ds.timer / Math.max(0.01, ds.maxTimer));
    G.ctx.save();
    G.ctx.translate(ds.x, ds.y);
    if (ds.kind === 'cinderBlast') {
      const r = ds.radius || 112;
      drawGlowSprite('crimson', 0, 0, r * (0.45 + p * 0.55), 0.32 + p * 0.48);
      G.ctx.fillStyle = `rgba(249, 115, 22, ${(0.08 + p * 0.22).toFixed(3)})`;
      G.ctx.beginPath(); G.ctx.arc(0, 0, r * p, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.strokeStyle = p > 0.72 ? COLORS.crimsonBright : '#fb923c';
      G.ctx.lineWidth = 2.2 + p * 1.8;
      boilCircle(G.ctx, 0, 0, r, 9120, 1.8, 22);
      G.ctx.stroke();
      G.ctx.restore();
      continue;
    }
    drawGlowSprite('cyan', 0, 0, 36 + p * 24, 0.45 + p * 0.4);
    G.ctx.strokeStyle = COLORS.cyanBright;
    G.ctx.lineWidth = 1.6 + p * 2.2;
    G.ctx.globalAlpha = 0.55 + p * 0.45;
    G.ctx.beginPath();
    G.ctx.moveTo(-ds.facing * 42, -16 * (1 - p * 0.6));
    G.ctx.lineTo(ds.facing * 56, 16 * (1 - p * 0.6));
    G.ctx.stroke();
    drawParryStarGlint(0, 0, 8 + p * 12, COLORS.cyanBright);
    G.ctx.restore();
  }
}

export function drawWeaponUltimates() {
  if (!G.weaponUltimates || G.weaponUltimates.length === 0) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.weaponUltimates.length; i++) {
    const u = G.weaponUltimates[i];
    const a = Math.max(0, Math.min(1, u.life / Math.max(0.01, u.maxLife)));
    ctx.save();
    if (u.kind === 'blade_dimension') {
      // Dimensional Judgement Cut Ribbons (Dark ink tear + radiant gold razor core)
      for (let r = 0; r < u.ribbons.length; r++) {
        const rb = u.ribbons[r];
        const ra = Math.max(0, rb.life / rb.maxLife);
        const halfL = rb.len * 0.5 * (0.75 + (1 - ra) * 0.35);
        const halfW = (rb.gold ? 16 : 11) * ra;
        ctx.save();
        ctx.translate(rb.x, rb.y);
        ctx.rotate(rb.ang);
        ctx.globalAlpha = Math.min(1, ra * 1.4);
        drawGlowSprite(rb.gold ? 'gold' : 'cyan', 0, 0, halfL * 0.72, 0.75 * ra);
        ctx.fillStyle = 'rgba(6, 9, 15, 0.90)';
        ctx.beginPath();
        ctx.moveTo(-halfL * 1.08, 0);
        ctx.quadraticCurveTo(0, -halfW * 1.45, halfL * 1.08, 0);
        ctx.quadraticCurveTo(0, halfW * 1.45, -halfL * 1.08, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rb.gold ? COLORS.goldBright : '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(-halfL, 0);
        ctx.quadraticCurveTo(0, -halfW * 0.72, halfL, 0);
        ctx.quadraticCurveTo(0, halfW * 0.72, -halfL, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, 3.0 * ra);
        ctx.beginPath(); ctx.moveTo(-halfL * 1.12, 0); ctx.lineTo(halfL * 1.12, 0); ctx.stroke();
        ctx.restore();
      }
    } else if (u.kind === 'hammer_bell') {
      // Colossal Hand-Drawn Cracked Bronze Great Bell dropping from above
      const fade = u.impacted ? Math.min(1, u.life * 2.2) : 1;
      ctx.globalAlpha = fade;
      // Golden descent beacon on impact floor
      drawGlowSprite('gold', u.x, u.groundY - 12, u.impacted ? 165 : 95, (u.impacted ? 0.65 : 0.42) * fade);
      if (!u.impacted) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.14)';
        ctx.fillRect(u.x - 52, u.y, 104, Math.max(0, u.groundY - u.y));
      }
      ctx.save();
      const wobble = u.impacted ? Math.sin(u.life * 34) * 0.06 * fade : 0;
      ctx.translate(u.x, u.y);
      ctx.rotate(wobble);
      ctx.fillStyle = '#23170d';
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-34, -124);
      ctx.lineTo(34, -124);
      ctx.quadraticCurveTo(68, -48, 86, 0);
      ctx.lineTo(-86, 0);
      ctx.quadraticCurveTo(-68, -48, -34, -124);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Molten bronze rune cracks
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(8, -106); ctx.lineTo(-14, -64); ctx.lineTo(12, -30); ctx.lineTo(-8, -2);
      ctx.moveTo(-14, -64); ctx.lineTo(-42, -38);
      ctx.stroke();
      // Bell lip band
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.moveTo(-74, -18); ctx.lineTo(74, -18); ctx.stroke();
      ctx.restore();
    } else if (u.kind === 'bell_sanctum') {
      // Rotating Harmonic Sanctum Mandala + 6 Orbiting Mini Spirit Bells
      const enter = Math.min(1, (u.maxLife - u.life) * 4.2);
      const exit = Math.min(1, u.life * 1.8);
      const alpha = Math.max(0, Math.min(1, enter * exit));
      const r = u.radius * (0.78 + enter * 0.22);
      ctx.translate(u.x, u.y);
      ctx.globalAlpha = alpha;
      drawGlowSprite('cyan', 0, 0, r * 0.85, 0.24 * alpha);
      // Outer hand-drawn cyan ring
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
      ctx.lineWidth = 2.4;
      boilCircle(ctx, 0, 0, r, 8710, 2.0, 24);
      ctx.stroke();
      // Counter-rotating inner golden dashed mandala
      ctx.save();
      ctx.rotate(G.globalTime * 0.75);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // 6 Orbiting Bronze Spirit Bells
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const bx = Math.cos(ang) * r * 0.86;
        const by = Math.sin(ang) * r * 0.86;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-G.globalTime * 0.75);
        ctx.fillStyle = '#182538';
        ctx.strokeStyle = k % 2 === 0 ? COLORS.cyanBright : COLORS.goldBright;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(7, 5); ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath(); ctx.arc(0, 6.5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

export function drawSlashes() {
  for (const s of G.slashes) {
    const a = Math.max(0, s.life / s.maxLife);
    const p = 1 - a; // 0 -> 1 sweep progression
    const headEase = Math.min(1, p * 3.8);
    const tailEase = Math.max(0, (p - 0.16) * 1.18);
    G.ctx.save();
    G.ctx.globalAlpha = Math.min(1, a * 1.35);

    if (s.type === 'bladeMultiThrust') {
      // L3: Dual Staggered Piercing Needle Thrusts (distinct straight-line geometry!)
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 1);
      const t1 = Math.min(1, p * 2.2);
      const t2 = Math.max(0, Math.min(1, (p - 0.34) * 2.4));
      const drawNeedle = (prog, oy, col) => {
        if (prog <= 0.02) return;
        const na = Math.sin(prog * Math.PI);
        const len = 104 * (0.45 + prog * 0.65);
        drawGlowSprite('cyan', len * 0.45, oy, 34, 0.55 * na);
        G.ctx.fillStyle = col;
        G.ctx.beginPath();
        G.ctx.moveTo(-14, oy);
        G.ctx.quadraticCurveTo(len * 0.45, oy - 7.5 * na, len, oy);
        G.ctx.quadraticCurveTo(len * 0.45, oy + 7.5 * na, -14, oy);
        G.ctx.closePath(); G.ctx.fill();
        G.ctx.strokeStyle = '#ffffff'; G.ctx.lineWidth = 2.0 * na;
        G.ctx.beginPath(); G.ctx.moveTo(-8, oy); G.ctx.lineTo(len * 0.94, oy); G.ctx.stroke();
      };
      drawNeedle(t1, 5, 'rgba(226, 220, 202, 0.90)');
      drawNeedle(t2, -7, 'rgba(186, 230, 253, 0.94)');
    } else if (s.type === 'slash4') {
      // H4: Colossal Overhead Leaping Sky-Cleave + Golden Ground Flare!
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 1);
      const r = 82;
      const ang0 = -2.15 + tailEase * 1.4;
      const ang1 = -2.15 + headEase * 3.15;
      if (ang1 > ang0 + 0.08) {
        drawGlowSprite('gold', 42, -6, 86, 0.88 * a);
        drawTaperedCrescent(r + 6, 38 * a, ang0, ang1, 'rgba(8, 11, 18, 0.88)', null);
        drawTaperedCrescent(r, 28 * a, ang0, ang1, 'rgba(245, 158, 11, 0.95)', '#fef9c3');
        drawTaperedCrescent(r - 12, 12 * a, ang0 + 0.12, ang1 - 0.06, 'rgba(248, 113, 113, 0.82)', null);
      }
      if (p > 0.22 && a > 0.25) {
        drawParryStarGlint(48, 18, 22 * a, COLORS.goldBright);
      }
    } else if (s.type === 'bladeUpperLaunch') {
      // 1L+H: Rising Dragon Uppercut Arc (launches foes airborne!)
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 1);
      const ang0 = 1.15 - headEase * 2.95;
      const ang1 = 1.15 - tailEase * 1.65;
      if (ang1 > ang0 + 0.08) {
        drawGlowSprite('cyan', 26, -24, 72, 0.82 * a);
        drawTaperedCrescent(68, 30 * a, ang0, ang1, 'rgba(8, 12, 20, 0.84)', null);
        drawTaperedCrescent(64, 21 * a, ang0, ang1, 'rgba(125, 211, 252, 0.92)', '#ffffff');
      }
    } else if (s.type === 'bladeRetreatCut') {
      // 2L+H: Backstep Wide Silver-Crimson Fan Cut!
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 0.58);
      const ang0 = -1.55 + tailEase * 1.65;
      const ang1 = -1.55 + headEase * 3.15;
      if (ang1 > ang0 + 0.08) {
        drawGlowSprite('crimson', 34, 0, 70, 0.72 * a);
        drawTaperedCrescent(84, 34 * a, ang0, ang1, 'rgba(10, 12, 18, 0.84)', null);
        drawTaperedCrescent(78, 22 * a, ang0, ang1, 'rgba(248, 113, 113, 0.90)', '#ffffff');
      }
    } else if (s.type === 'hammerSpinSweep') {
      // Hammer L2: 270° Orbiting Waist-Spin Golden Maul Arc!
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 0.62);
      const ang0 = -2.4 + tailEase * 2.1;
      const ang1 = -2.4 + headEase * 4.55;
      if (ang1 > ang0 + 0.1) {
        drawGlowSprite('gold', 24, 0, 82, 0.78 * a);
        drawTaperedCrescent(84, 36 * a, ang0, ang1, 'rgba(14, 10, 6, 0.86)', null);
        drawTaperedCrescent(78, 25 * a, ang0, ang1, 'rgba(245, 158, 11, 0.92)', '#fef9c3');
      }
    } else if (s.type === 'bellPhantomDrop') {
      // Bell H4 / Branch: Translucent Giant Bronze Spirit Bell Materializing & Slamming Down!
      const dropEase = Math.min(1, p * 2.6);
      const dropY = -68 * (1 - dropEase * dropEase);
      G.ctx.translate(s.x, s.y + 18 + dropY);
      drawGlowSprite('gold', 0, -26, 92, 0.82 * a);
      drawGlowSprite('cyan', 0, -26, 62, 0.58 * a);
      G.ctx.fillStyle = `rgba(245, 158, 11, ${(0.22 * a).toFixed(3)})`;
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 2.6 * a;
      G.ctx.beginPath();
      G.ctx.moveTo(-24, -66); G.ctx.lineTo(24, -66);
      G.ctx.quadraticCurveTo(38, -28, 44, 6);
      G.ctx.lineTo(-44, 6);
      G.ctx.quadraticCurveTo(-38, -28, -24, -66);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.cyanBright; G.ctx.lineWidth = 1.8 * a;
      G.ctx.beginPath(); G.ctx.moveTo(-36, -6); G.ctx.lineTo(36, -6); G.ctx.stroke();
      if (dropEase >= 0.9) {
        G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 3.2 * a;
        G.ctx.beginPath(); G.ctx.ellipse(0, 8, 52 + p * 42, 11, 0, 0, Math.PI * 2); G.ctx.stroke();
      }
    } else if (s.type === 'dashThrust' || s.type === 'hammerRam') {
      const isHammer = s.type === 'hammerRam';
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 1);
      const len = (isHammer ? 104 : 118) * (0.55 + headEase * 0.52);
      const halfH = (isHammer ? 28 : 13) * a;
      drawGlowSprite(isHammer ? 'gold' : 'cyan', len * 0.45, 0, isHammer ? 76 : 52, 0.85 * a);
      G.ctx.fillStyle = 'rgba(8, 12, 20, 0.82)';
      G.ctx.beginPath();
      G.ctx.moveTo(-22, 0);
      G.ctx.quadraticCurveTo(len * 0.35, -halfH * 1.32, len + 8, 0);
      G.ctx.quadraticCurveTo(len * 0.35, halfH * 1.32, -22, 0);
      G.ctx.closePath(); G.ctx.fill();
      G.ctx.fillStyle = isHammer ? 'rgba(245, 158, 11, 0.92)' : 'rgba(186, 230, 253, 0.92)';
      G.ctx.beginPath();
      G.ctx.moveTo(-14, 0);
      G.ctx.quadraticCurveTo(len * 0.42, -halfH, len, 0);
      G.ctx.quadraticCurveTo(len * 0.42, halfH, -14, 0);
      G.ctx.closePath(); G.ctx.fill();
      G.ctx.strokeStyle = isHammer ? '#fef9c3' : '#ffffff';
      G.ctx.lineWidth = (isHammer ? 4.2 : 2.6) * a;
      G.ctx.beginPath(); G.ctx.moveTo(-10, 0); G.ctx.lineTo(len * 0.96, 0); G.ctx.stroke();
      G.ctx.strokeStyle = isHammer ? 'rgba(253, 224, 71, 0.72)' : 'rgba(56, 189, 248, 0.72)';
      G.ctx.lineWidth = 2.0 * a;
      [0.28, 0.58].forEach((f, idx) => {
        G.ctx.beginPath();
        G.ctx.ellipse(len * f, 0, (6 + idx * 4) * a, halfH * (1.15 - idx * 0.25), 0, 0, Math.PI * 2);
        G.ctx.stroke();
      });
    } else if (s.type === 'airSpin' || s.type === 'hammerAirSpin' || s.type === 'bellAirSpin') {
      const isHam = s.type === 'hammerAirSpin';
      const isBel = s.type === 'bellAirSpin';
      G.ctx.translate(s.x, s.y);
      const r = (isBel ? 96 : isHam ? 84 : 74) * (0.76 + p * 0.28);
      const rot = s.facing * p * Math.PI * 2.2;
      drawGlowSprite(isBel ? 'cyan' : 'gold', 0, 0, r * 0.92, 0.78 * a);
      G.ctx.rotate(rot);
      const outerCol = 'rgba(8, 11, 18, 0.82)';
      const mainCol = isBel ? 'rgba(56, 189, 248, 0.90)' : isHam ? 'rgba(245, 158, 11, 0.92)' : 'rgba(226, 220, 202, 0.92)';
      const coreCol = isBel ? '#e0f2fe' : isHam ? '#fef9c3' : '#ffffff';
      [0, Math.PI].forEach(baseA => {
        drawTaperedCrescent(r + 4, (isHam ? 26 : 19) * a, baseA, baseA + Math.PI * 1.15, outerCol, null);
        drawTaperedCrescent(r, (isHam ? 18 : 13) * a, baseA + 0.06, baseA + Math.PI * 1.10, mainCol, coreCol);
      });
      G.ctx.strokeStyle = isBel ? COLORS.goldBright : (isHam ? '#fef08a' : COLORS.cyanBright);
      G.ctx.lineWidth = 2.0 * a;
      G.ctx.beginPath(); G.ctx.arc(0, 0, r * 0.70, 0, Math.PI * 2); G.ctx.stroke();
    } else if (s.type === 'hammerQuake' || s.type === 'hammerSlam' || s.type === 'hammerCounter') {
      // Colossal Two-Handed Bell-Maul Overhead Ground-Shattering Impact!
      const isBig = s.type === 'hammerQuake' || s.type === 'hammerCounter';
      G.ctx.translate(s.x, s.y);
      G.ctx.scale(s.facing, 1);
      const r = isBig ? 94 : 78;
      drawGlowSprite('gold', 38, 0, isBig ? 96 : 74, 0.92 * a);
      // Heavy downward bronze-ink hammer arc
      drawTaperedCrescent(r + 6, (isBig ? 42 : 34) * a, -2.05, 0.65, 'rgba(12, 9, 6, 0.88)', null);
      drawTaperedCrescent(r, (isBig ? 30 : 24) * a, -1.95, 0.60, 'rgba(245, 158, 11, 0.94)', '#fef9c3');
      // Rising shattered earth / golden bell-impact cone at strike floor
      const ix = 46;
      const iy = 24;
      const spread = (isBig ? 56 : 42) * (0.45 + p * 0.75);
      G.ctx.fillStyle = `rgba(253, 224, 71, ${(0.34 * a).toFixed(2)})`;
      G.ctx.beginPath();
      G.ctx.moveTo(ix - spread, iy);
      G.ctx.lineTo(ix, iy - (isBig ? 76 : 52) * a);
      G.ctx.lineTo(ix + spread, iy);
      G.ctx.closePath();
      G.ctx.fill();
      if (a > 0.32) drawParryStarGlint(ix, iy - 12, (isBig ? 26 : 19) * a, COLORS.goldBright);
    } else if (s.type === 'hammerSweep' || s.type === 'hammerUp' || s.type === 'hammerPogo') {
      // Heavy Broad Bronze-Gold Two-Handed Hammer Arc
      G.ctx.translate(s.x, s.y);
      if (s.type === 'hammerUp') {
        drawGlowSprite('gold', 0, -10, 68, 0.75 * a);
        drawTaperedCrescent(64, 30 * a, -Math.PI + 0.25, -0.25, 'rgba(14, 11, 8, 0.84)', null);
        drawTaperedCrescent(60, 22 * a, -Math.PI + 0.28, -0.28, 'rgba(245, 158, 11, 0.92)', '#fef9c3');
      } else if (s.type === 'hammerPogo') {
        drawGlowSprite('gold', 0, 8, 64, 0.75 * a);
        drawTaperedCrescent(56, 28 * a, 0.18, Math.PI - 0.18, 'rgba(14, 11, 8, 0.84)', null);
        drawTaperedCrescent(52, 20 * a, 0.22, Math.PI - 0.22, 'rgba(245, 158, 11, 0.92)', '#fef9c3');
      } else {
        G.ctx.scale(s.facing, 1);
        const ang0 = -1.45 + tailEase * 1.45;
        const ang1 = -1.45 + headEase * 2.75;
        if (ang1 > ang0 + 0.08) {
          drawGlowSprite('gold', 42, 0, 74, 0.76 * a);
          drawTaperedCrescent(76, 36 * a, ang0, ang1, 'rgba(14, 11, 8, 0.86)', null);
          drawTaperedCrescent(72, 26 * a, ang0, ang1, 'rgba(245, 158, 11, 0.92)', '#fef9c3');
        }
      }
    } else if (s.type === 'bellCounter') {
      // 360° Harmonic Requiem Pulse Mandala
      G.ctx.translate(s.x, s.y);
      const r = 162 * (0.35 + p * 0.72);
      drawGlowSprite('cyan', 0, 0, r * 0.82, 0.72 * a);
      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.lineWidth = 6.5 * a;
      boilCircle(G.ctx, 0, 0, r, 6420, 2.2, 20);
      G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 3.2 * a;
      boilCircle(G.ctx, 0, 0, r * 0.68, 6450, 1.6, 16);
      G.ctx.stroke();
    } else if (s.type === 'bellRing1' || s.type === 'bellRing2' || s.type === 'bellRing3' || s.type === 'bellVolley' || s.type === 'bellUp' || s.type === 'bellPogo') {
      // Crystalline Cyan-Gold Bell Harmonic Ripple Swing
      G.ctx.translate(s.x, s.y);
      const isVolley = s.type === 'bellVolley' || s.type === 'bellRing3';
      const isUp = s.type === 'bellUp';
      const isPogo = s.type === 'bellPogo';
      if (isUp) {
        drawGlowSprite('cyan', 0, 0, 56, 0.68 * a);
        drawTaperedCrescent(52, 20 * a, -Math.PI + 0.25, -0.25, 'rgba(56, 189, 248, 0.88)', '#fef08a');
      } else if (isPogo) {
        drawGlowSprite('cyan', 0, 0, 52, 0.68 * a);
        drawTaperedCrescent(46, 18 * a, 0.2, Math.PI - 0.2, 'rgba(56, 189, 248, 0.88)', '#fef08a');
      } else {
        G.ctx.scale(s.facing, s.type === 'bellRing2' ? -1 : 1);
        const r = (isVolley ? 58 : 44) * (0.72 + p * 0.42);
        drawGlowSprite(isVolley ? 'gold' : 'cyan', 18, 0, isVolley ? 56 : 42, 0.76 * a);
        G.ctx.strokeStyle = isVolley ? COLORS.goldBright : COLORS.cyanBright;
        G.ctx.lineWidth = (isVolley ? 5.2 : 3.6) * a;
        G.ctx.beginPath(); G.ctx.arc(0, 0, r, -1.15, 1.15); G.ctx.stroke();
        G.ctx.strokeStyle = '#ffffff';
        G.ctx.lineWidth = 1.8 * a;
        G.ctx.beginPath(); G.ctx.arc(0, 0, r * 0.72, -0.95, 0.95); G.ctx.stroke();
      }
    } else if (s.type === 'iai') {
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
    } else if (s.type === 'bossAntiAir') {
      G.ctx.translate(s.x, s.y);
      drawGlowSprite('gold', 0, -24, 92, 0.78 * a);
      drawTaperedCrescent(86, 32 * a, -Math.PI + 0.14, -0.14, 'rgba(10, 14, 22, 0.85)', null);
      drawTaperedCrescent(80, 24 * a, -Math.PI + 0.16, -0.16, 'rgba(245, 158, 11, 0.92)', '#fef9c3');
      if (a > 0.4) drawParryStarGlint(0, -76, 18 * a, COLORS.goldBright);
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

      // slash1 sweeps UP (inverted Y), slash2 is a sleek horizontal cross-cut (squashed Y), slash3 is a colossal golden-crimson cleave!
      G.ctx.scale(s.facing, isSlash1 ? -1 : (isSlash2 ? 0.56 : 1));

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

export function drawHitMarks() {
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

export function drawImpactBursts() {
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

export function drawShockwaves() {
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

export function drawParticles() {
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

export function drawWorldPrompts() {
  if (!G.player || G.gameState !== 'playing') return;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h;
  G.ctx.save();

  const isMob = !!(G.isMobile || (typeof document !== 'undefined' && document.body && document.body.classList.contains('is-mobile')));
  const ek = isMob ? t('mob.interact') : getActionKeyLabel('interact');
  if (G.worldState && G.worldState.boss3Defeated && !G.echoSession &&
      Math.hypot(px - FIRST_BELL_CORE_POS.x, py - FIRST_BELL_CORE_POS.y) < 105) {
    drawPromptBadge(FIRST_BELL_CORE_POS.x, FIRST_BELL_CORE_POS.y - 118, t('prompt.core', ek));
  }
  for (const altar of ALTARS) {
    if (Math.hypot(px - altar.x, py - altar.y) < 86) {
      const isLit = !G.worldState || G.worldState.litAltars.has(altar.id);
      drawPromptBadge(altar.x, altar.y - 96, isLit ? t('prompt.altarRest', ek) : t('prompt.altarLight', ek, locAltar(altar, 'shortName')));
    }
  }
  for (const npc of NPCS) {
    const pos = getEffectiveNpcPos(npc);
    if (Math.hypot(px - pos.x, py - pos.y) < 88) {
      const verb = npc.kind === 'chronicler' ? t('prompt.npcChron') : npc.kind === 'keeper' ? t('prompt.npcKeeper') : npc.kind === 'scavenger' ? t('prompt.npcScav') : t('prompt.npcSmith');
      drawPromptBadge(pos.x + 8, pos.y - 94, t('prompt.npcFull', ek, verb, locNpcName(npc)));
    }
  }
  for (const e of G.enemies) {
    if (e && e.alive && e.isDummy && Math.hypot(px - (e.x + e.w * 0.5), py - (e.y + e.h)) < 94) {
      const m = DUMMY_MODES[e.modeIdx] || DUMMY_MODES[0];
      drawPromptBadge(e.x + e.w * 0.5, e.y - 44, t('prompt.dummyMode', ek, locDummyMode(m, 'label')));
    }
  }
  if (G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) {
    drawPromptBadge(SHORTCUT_GATE_DEF.leverX, SHORTCUT_GATE_DEF.leverY - 68, t('prompt.lever', ek));
  }
  for (const sw of WORLD_SWITCHES_DEF) {
    if (isSwitchUnlocked(sw) && !isWorldSwitchOn(sw.switchKey) && Math.hypot(px - sw.x, py - sw.y) < 82) {
      const pKey = sw.kind === 'sluice' ? 'prompt.switchSluice' : sw.kind === 'valve' ? 'prompt.switchValve' : sw.kind === 'hatch' ? 'prompt.switchHatch' : 'prompt.switchGateLever';
      drawPromptBadge(sw.x, sw.y - 76, t(pKey, ek));
    }
  }
  for (const lt of LORE_TABLETS) {
    if (Math.hypot(px - lt.x, py - lt.y) < 78) {
      drawPromptBadge(lt.x, lt.y - 80, t('prompt.lore', ek, locTablet(lt, 'title')));
    }
  }
  if (G.worldState) {
    for (const p of G.worldState.pickups) {
      if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) {
        drawPromptBadge(p.x, p.y - 66, t('prompt.pickup', ek, locPickup(p, 'name')));
      }
    }
  }
  G.ctx.restore();
}

export function drawPromptBadge(x, y, label) {
  drawCachedBadge(G.ctx, label, x, y, {
    size: 13, bold: false, bg: 'rgba(8, 12, 20, 0.85)', border: 'rgba(245, 158, 11, 0.65)',
    color: COLORS.goldBright, minW: 88, padX: 13, h: 24, boxTopOff: -15, textOffY: 2
  });
}

export function drawFloatingTexts() {
  if (G.floatTexts.length === 0) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.floatTexts.length; i++) {
    const ft = G.floatTexts[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, (ft.life / ft.maxLife) * 1.4));
    const bucket = ft.size >= 22 ? 23 : (ft.size >= 17 ? 18 : 15);
    drawCachedText(ctx, ft.text, ft.x, ft.y, {
      size: bucket, bold: true, color: ft.color, shadow: true, shadowColor: '#06080d', shadowOffX: 1.5, shadowOffY: 1.5
    });
  }
  ctx.globalAlpha = 1;
}

export function drawWeatherLayer(isPhase2) {
  if (!G.weatherParticles || G.weatherParticles.length === 0) return;
  const wType = G.themeBlend ? G.themeBlend.weather : 'ash';
  const accent = G.themeBlend ? G.themeBlend.accent : [216, 207, 184];
  const eco = !!(G.isMobile && G.settings && G.settings.mobileEcoMode);
  const step = eco ? 4 : ((G.isMobile || (G.settings && G.settings.dynamicLighting === false)) ? 2 : 1);
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

export function drawForegroundMotes(isPhase2) {
  G.ctx.save();
  const acc = G.themeBlend ? G.themeBlend.accent : [216, 207, 184];
  const eco = !!(G.isMobile && G.settings && G.settings.mobileEcoMode);
  const step = eco ? 4 : ((G.isMobile || (G.settings && G.settings.dynamicLighting === false)) ? 2 : 1);
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
