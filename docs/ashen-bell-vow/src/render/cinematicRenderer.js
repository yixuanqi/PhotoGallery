// v39.0 Foundry Molten Crucibles, Boss Intro Letterbox & Zone Calligraphy Banner Renderer
import { COLORS, WELL_BOTTOM_Y } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilLine } from '../vfx.js';
import { isInView } from './renderShared.js';
import { drawCachedText } from './glyphAtlas.js';
import { isEn } from '../i18n.js';

export function drawFoundryCrucibles() {
  if (!G.foundryCrucibles || G.foundryCrucibles.length === 0) return;
  const ctx = G.ctx;
  const now = G.globalTime;
  for (let i = 0; i < G.foundryCrucibles.length; i++) {
    const cr = G.foundryCrucibles[i];
    if (cr.state === 'spent') continue;
    const cx = cr.x;
    const cy = cr.y;
    const crFloorY = cr.floorY !== undefined ? cr.floorY : WELL_BOTTOM_Y;
    if (!isInView(cx - 60, cr.anchorY - 10, 120, (crFloorY - cr.anchorY) + 40, 110)) continue;

    ctx.save();
    if (cr.state === 'hanging') {
      const sway = Math.sin(now * 2.1 + i * 1.8) * 4.5;
      const bx = cx + sway;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx, cr.anchorY);
      ctx.lineTo(bx, cy - 22);
      ctx.stroke();

      const linkY = (cr.anchorY + (cy - 22)) * 0.55;
      const pulse = 0.65 + Math.sin(now * 6.5 + i) * 0.35;
      drawGlowSprite('gold', bx, linkY, 26, 0.55 * pulse);
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(bx - 10, linkY); ctx.lineTo(bx + 10, linkY);
      ctx.moveTo(bx, linkY - 10); ctx.lineTo(bx, linkY + 10);
      ctx.stroke();

      drawGlowSprite('gold', bx, cy, 56, 0.48);
      ctx.fillStyle = '#24150d';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - 26, cy - 18);
      ctx.lineTo(bx + 26, cy - 18);
      ctx.lineTo(bx + 19, cy + 16);
      ctx.quadraticCurveTo(bx, cy + 24, bx - 19, cy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 22, cy - 19, 44, 5);
    } else if (cr.state === 'falling') {
      drawGlowSprite('gold', cx, cy, 74, 0.85);
      ctx.fillStyle = '#3a1808';
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - 26, cy - 16); ctx.lineTo(cx + 26, cy - 16);
      ctx.lineTo(cx + 19, cy + 18); ctx.quadraticCurveTo(cx, cy + 26, cx - 19, cy + 18);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(cx - 22, cy - 18, 44, 6);
    }
    ctx.restore();
  }
}

export function drawCinematicLetterbox() {
  const ctx = G.ctx;
  const w = G.canvasW;
  const h = G.canvasH;

  if (G.bossIntro && G.bossIntro.timer > 0) {
    const bi = G.bossIntro;
    const p = 1 - bi.timer / bi.maxTimer;
    const ease = p < 0.16 ? (p / 0.16) : (bi.timer < 0.28 ? (bi.timer / 0.28) : 1);
    const barH = Math.round(Math.min(58, h * 0.085) * Math.max(0, Math.min(1, ease)));
    if (barH > 1) {
      ctx.save();
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
      ctx.strokeStyle = bi.color || COLORS.goldBright;
      ctx.globalAlpha = 0.45 * ease;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, barH); ctx.lineTo(w, barH);
      ctx.moveTo(0, h - barH); ctx.lineTo(w, h - barH);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (G.bossKillSlowmo && G.bossKillSlowmo.timer > 0) {
    const a = Math.min(1, G.bossKillSlowmo.timer / G.bossKillSlowmo.maxTimer);
    ctx.save();
    ctx.strokeStyle = COLORS.goldBright;
    ctx.globalAlpha = 0.34 * a;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.restore();
  }
}

export function drawZoneCalligraphyBanner() {
  if (!G.zoneBanner || G.zoneBanner.life <= 0) return;
  if (G.bossBanner && G.bossBanner.life > 0) return;
  const zb = G.zoneBanner;
  const p = 1 - zb.life / zb.maxLife;
  const alpha = p < 0.18 ? (p / 0.18) : (zb.life < 0.55 ? (zb.life / 0.55) : 1);
  if (alpha <= 0.02) return;

  const ctx = G.ctx;
  const en = isEn();
  const cx = G.canvasW * 0.5;
  const cy = Math.min(118, G.canvasH * 0.17);
  const spread = Math.min(1, p * 3.8);
  const halfW = (en ? 220 : 178) * spread;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const grad = ctx.createLinearGradient(cx - halfW - 60, 0, cx + halfW + 60, 0);
  grad.addColorStop(0, 'rgba(6, 9, 15, 0)');
  grad.addColorStop(0.22, 'rgba(6, 9, 15, 0.62)');
  grad.addColorStop(0.78, 'rgba(6, 9, 15, 0.62)');
  grad.addColorStop(1, 'rgba(6, 9, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - halfW - 60, cy - 30, (halfW + 60) * 2, 66);

  ctx.strokeStyle = zb.color || COLORS.goldBright;
  ctx.lineWidth = 1.4;
  boilLine(ctx, cx - halfW, cy + 12, cx + halfW, cy + 12, 9100, 0.8, 4);

  ctx.fillStyle = zb.color || COLORS.goldBright;
  for (const dir of [-1, 1]) {
    const ex = cx + dir * (halfW + 7);
    ctx.beginPath();
    ctx.moveTo(ex, cy + 8); ctx.lineTo(ex + 4, cy + 12);
    ctx.lineTo(ex, cy + 16); ctx.lineTo(ex - 4, cy + 12);
    ctx.closePath(); ctx.fill();
  }

  drawCachedText(ctx, zb.title, cx, cy - 3, {
    size: en ? 20 : 25, bold: true, color: '#f5efe0', shadow: true, shadowColor: '#05070c', shadowOffX: 1.5, shadowOffY: 1.5
  });
  if (zb.sub) {
    drawCachedText(ctx, zb.sub, cx, cy + 25, {
      size: en ? 11.5 : 12.5, bold: false, color: zb.color || COLORS.parchment
    });
  }
  ctx.restore();
}
