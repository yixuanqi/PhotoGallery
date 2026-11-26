// Shared rendering primitives, frustum culling, grounding shadows & parry/execution telegraphs (v32.0)
import { COLORS } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle } from '../vfx.js';
import { getGroundSurfaceY } from '../physics.js';
import { t, isEn } from '../i18n.js';
import { drawCachedText } from './glyphAtlas.js';

// v45.9 Room-Relative Architectural Props (automatically translate & mirror with host room bounds!)
export const ROOM_BACKDROP_LANCETS = [
  { roomId: 'r02_corridor', offsets: [140, 520, 900, 1280], yOff: 130 },
  { roomId: 'r03_chapel',   offsets: [145, 965],            yOff: 130 }
];
export const ROOM_BACKDROP_GRAVES = [
  { roomId: 'r01_sanctuary', offsets: [460],                             floorOff: 580 },
  { roomId: 'r02_corridor',  offsets: [20, 240, 470, 1150, 1350, 1550],  floorOff: 580 }
];

export function isInView(x, y, w, h, pad = 100) {
  return x + w >= G.cam.x - pad && x <= G.cam.x + G.canvasW + pad &&
         y + h >= G.cam.y - pad && y <= G.cam.y + G.canvasH + pad;
}

export function drawContactShadow(cx, footY, baseRadius) {
  const surfY = getGroundSurfaceY(cx, footY);
  const height = Math.max(0, surfY - footY);
  if (height > 260) return;
  const scale = Math.max(0.32, 1 - height / 280);
  const alpha = Math.max(0.08, 0.48 * scale);
  const ctx = G.ctx;
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#030509';
  ctx.beginPath();
  ctx.ellipse(cx, surfY + 1, baseRadius * scale, Math.max(2.5, 5.2 * scale), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevA;
}

export function drawSlowBladeRing(x, y, stateTimer, windupDuration, color = COLORS.goldBright) {
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

export function drawParryStarGlint(x, y, size, color) {
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

export function drawExecutionSigil(cx, cy) {
  const pulse = 1 + Math.sin(G.globalTime * 12) * 0.14;
  const en = isEn();
  G.ctx.save();
  G.ctx.translate(cx, cy);
  G.ctx.scale(pulse, pulse);
  G.ctx.fillStyle = 'rgba(220, 38, 38, 0.32)';
  G.ctx.beginPath(); G.ctx.arc(0, 0, 20, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.strokeStyle = COLORS.crimsonBright;
  G.ctx.lineWidth = 2.4;
  boilCircle(G.ctx, 0, 0, 14, 9900, 1.2, 12);
  G.ctx.stroke();
  drawCachedText(G.ctx, t('ren.execGlyph'), 0, en ? 3.5 : 5, {
    size: en ? 9.5 : 13,
    bold: true,
    color: '#ffffff'
  });
  G.ctx.restore();
}
