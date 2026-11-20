// Procedural hand-drawn ink primitives, glow sprites, spring cloaks & VFX spawners
import { COLORS } from './config.js';
import { G } from './state.js';

const paperCanvas = document.createElement('canvas');
paperCanvas.width = 180;
paperCanvas.height = 180;
const pCtx = paperCanvas.getContext('2d');
export function buildParchmentPattern() {
  const img = pCtx.createImageData(180, 180);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 140 + Math.floor(Math.random() * 90);
    d[i] = v;
    d[i + 1] = v - 6;
    d[i + 2] = v - 18;
    d[i + 3] = Math.floor(Math.random() * 20);
  }
  pCtx.putImageData(img, 0, 0);
  // Subtle paper fibers
  pCtx.strokeStyle = 'rgba(216, 207, 184, 0.04)';
  pCtx.lineWidth = 0.8;
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * 180;
    const y = Math.random() * 180;
    pCtx.beginPath();
    pCtx.moveTo(x, y);
    pCtx.lineTo(x + (Math.random() - 0.5) * 28, y + (Math.random() - 0.5) * 28);
    pCtx.stroke();
  }
  G.paperPattern = G.ctx.createPattern(paperCanvas, 'repeat');
}

// Offscreen Pre-rendered Radial Glow Sprites (replaces high-cost per-frame ctx.shadowBlur)
export const GLOW_SPRITES = {};

export function buildGlowSprites() {
  const defs = {
    cyan: ['rgba(224, 242, 254, 0.95)', 'rgba(56, 189, 248, 0.45)', 'rgba(56, 189, 248, 0)'],
    gold: ['rgba(254, 249, 195, 0.95)', 'rgba(245, 158, 11, 0.48)', 'rgba(245, 158, 11, 0)'],
    crimson: ['rgba(254, 202, 202, 0.92)', 'rgba(220, 38, 38, 0.5)', 'rgba(220, 38, 38, 0)'],
    parchment: ['rgba(255, 252, 240, 0.85)', 'rgba(216, 207, 184, 0.38)', 'rgba(216, 207, 184, 0)'],
    violet: ['rgba(243, 232, 255, 0.95)', 'rgba(168, 85, 247, 0.52)', 'rgba(88, 28, 135, 0)']
  };
  const size = 64;
  const half = size / 2;
  for (const [key, stops] of Object.entries(defs)) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d');
    const g = gctx.createRadialGradient(half, half, 1, half, half, half);
    g.addColorStop(0, stops[0]);
    g.addColorStop(0.38, stops[1]);
    g.addColorStop(1, stops[2]);
    gctx.fillStyle = g;
    gctx.fillRect(0, 0, size, size);
    GLOW_SPRITES[key] = c;
  }
}

export function drawGlowSprite(key, x, y, radius, alpha = 0.85) {
  const spr = GLOW_SPRITES[key];
  if (!spr) return;
  G.ctx.save();
  G.ctx.globalCompositeOperation = 'lighter';
  G.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  G.ctx.drawImage(spr, x - radius, y - radius, radius * 2, radius * 2);
  G.ctx.restore();
}

export function hash2(seed, frame) {
  const x = Math.sin(seed * 127.1 + frame * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function boilLinePath(c, x1, y1, x2, y2, seed, amp = 1.2, segs = 3) {
  c.moveTo(x1 + hash2(seed, G.boilFrame) * amp, y1 + hash2(seed + 11, G.boilFrame) * amp);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const px = x1 + (x2 - x1) * t + hash2(seed + i * 19, G.boilFrame) * amp;
    const py = y1 + (y2 - y1) * t + hash2(seed + i * 37, G.boilFrame) * amp;
    c.lineTo(px, py);
  }
}

export function boilLine(c, x1, y1, x2, y2, seed, amp = 1.2, segs = 3) {
  c.beginPath();
  boilLinePath(c, x1, y1, x2, y2, seed, amp, segs);
  c.stroke();
}

export function boilCircle(c, cx, cy, r, seed, amp = 1.1, segs = 14) {
  c.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const jr = r + hash2(seed + (i % segs) * 17, G.boilFrame) * amp;
    const px = cx + Math.cos(a) * jr;
    const py = cy + Math.sin(a) * jr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

export function boilRectOutline(c, x, y, w, h, seed, amp = 1.1) {
  c.beginPath();
  boilLinePath(c, x, y, x + w, y, seed + 1, amp, 2);
  boilLinePath(c, x + w, y, x + w, y + h, seed + 2, amp, 2);
  boilLinePath(c, x + w, y + h, x, y + h, seed + 3, amp, 2);
  boilLinePath(c, x, y + h, x, y, seed + 4, amp, 2);
  c.stroke();
}

export function drawTaperedCrescent(rOuter, thickness, startAng, endAng, fillCol, coreCol) {
  const steps = 16;
  G.ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const w = Math.sin(t * Math.PI) * thickness;
    const x = Math.cos(a) * (rOuter + w * 0.45);
    const y = Math.sin(a) * (rOuter + w * 0.45);
    if (i === 0) G.ctx.moveTo(x, y);
    else G.ctx.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const w = Math.sin(t * Math.PI) * thickness;
    const x = Math.cos(a) * (rOuter - w * 0.75);
    const y = Math.sin(a) * (rOuter - w * 0.75);
    G.ctx.lineTo(x, y);
  }
  G.ctx.closePath();
  G.ctx.fillStyle = fillCol;
  G.ctx.fill();

  if (coreCol) {
    G.ctx.beginPath();
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const a = startAng + (endAng - startAng) * t;
      const x = Math.cos(a) * rOuter;
      const y = Math.sin(a) * rOuter;
      if (i === 1) G.ctx.moveTo(x, y);
      else G.ctx.lineTo(x, y);
    }
    G.ctx.strokeStyle = coreCol;
    G.ctx.lineWidth = Math.max(1.5, thickness * 0.24);
    G.ctx.stroke();
  }
}

export function createCloak(x, y, count = 6, segLen = 8) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({ x: x - i * segLen, y: y + i * 2, vx: 0, vy: 0 });
  }
  return { pts, segLen };
}

export function updateCloak(cloak, anchorX, anchorY, facing, windX, dt) {
  const pts = cloak.pts;
  pts[0].x = anchorX;
  pts[0].y = anchorY;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[i - 1];
    const flutter = Math.sin(G.globalTime * 7.5 + i * 1.1) * 42;
    p.vx += (windX - facing * 85 + flutter) * dt * 2.2;
    p.vy += 320 * dt;
    p.vx *= 0.88;
    p.vy *= 0.88;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    p.x = prev.x + (dx / dist) * cloak.segLen;
    p.y = prev.y + (dy / dist) * cloak.segLen;
  }
}

export function drawCloakMesh(cloak, fillCol, strokeCol, baseWidth, seed) {
  const pts = cloak.pts;
  if (pts.length < 2) return;
  G.ctx.save();
  G.ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const w = baseWidth * (1 - i / (pts.length + 1.2));
    const x = pts[i].x;
    const y = pts[i].y - w * 0.4;
    if (i === 0) G.ctx.moveTo(x, y);
    else G.ctx.lineTo(x, y);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const w = baseWidth * (1 - i / (pts.length + 1.2));
    G.ctx.lineTo(pts[i].x, pts[i].y + w * 0.65);
  }
  G.ctx.closePath();
  G.ctx.fillStyle = fillCol;
  G.ctx.fill();
  G.ctx.strokeStyle = strokeCol;
  G.ctx.lineWidth = 1.4;
  G.ctx.stroke();
  G.ctx.restore();
}

// Analytical 2-Bone Inverse Kinematics solver (bendDir: +1 bends knee right, -1 bends left)
export function solve2BoneIK(hx, hy, tx, ty, l1, l2, bendDir = 1) {
  const dx = tx - hx;
  const dy = ty - hy;
  const rawDist = Math.hypot(dx, dy);
  const minD = Math.abs(l1 - l2) + 0.4;
  const maxD = l1 + l2 - 0.1;
  const d = Math.max(minD, Math.min(maxD, rawDist));
  const baseAng = Math.atan2(dy, dx);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const angA = Math.acos(cosA);
  const kneeAng = baseAng - bendDir * angA;
  const kx = hx + Math.cos(kneeAng) * l1;
  const ky = hy + Math.sin(kneeAng) * l1;
  const inv = rawDist > 0.001 ? 1 / rawDist : 0;
  const ex = rawDist > maxD ? hx + dx * inv * maxD : tx;
  const ey = rawDist > maxD ? hy + dy * inv * maxD : ty;
  return { kx, ky, ex, ey };
}

export function initAmbientMotes() {
  G.ambientMotes = [];
  for (let i = 0; i < 65; i++) {
    G.ambientMotes.push({
      x: Math.random() * 1600,
      y: Math.random() * 720,
      r: 1 + Math.random() * 2.2,
      vx: -10 - Math.random() * 18,
      vy: -4 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2
    });
  }
  initWeatherParticles();
}

export function initWeatherParticles() {
  G.weatherParticles = [];
  G.weatherRipples = [];
  for (let i = 0; i < 68; i++) {
    G.weatherParticles.push({
      x: Math.random() * 1600,
      y: Math.random() * 820,
      len: 12 + Math.random() * 18,
      size: 1.4 + Math.random() * 2.4,
      speed: 0.75 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.55
    });
  }
}

export function spawnWeatherRipple(x, y, maxR = 26, color = 'rgba(186, 230, 253, 0.55)') {
  if (G.weatherRipples.length >= 14) G.weatherRipples.shift();
  G.weatherRipples.push({ x, y, r: 2, maxR, color, life: 0.52, maxLife: 0.52 });
}

export function spawnParticles(x, y, count, opts = {}) {
  const col = opts.color || COLORS.parchment;
  const spd = opts.speed || 200;
  const grav = opts.grav !== undefined ? opts.grav : 420;
  const life = opts.life || 0.42;
  const spark = !!opts.spark;
  for (let i = 0; i < count; i++) {
    const ang = opts.angle !== undefined
      ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1.2)
      : Math.random() * Math.PI * 2;
    const s = spd * (0.35 + Math.random() * 0.85);
    G.particles.push({
      x, y,
      vx: Math.cos(ang) * s,
      vy: Math.sin(ang) * s,
      grav,
      life: life * (0.65 + Math.random() * 0.5),
      maxLife: life,
      size: opts.size !== undefined ? opts.size * (0.7 + Math.random() * 0.6) : (spark ? 2 + Math.random() * 2.5 : 2.5 + Math.random() * 3.5),
      color: col,
      spark,
      bounce: !!opts.bounce
    });
  }
}

export function spawnShockwave(x, y, maxR, color, width = 3, life = 0.28) {
  G.shockwaves.push({ x, y, r: 8, maxR, color, width, life, maxLife: life });
}

export function spawnImpactBurst(x, y, kind = 'parry', scale = 1.0) {
  const life = kind === 'parry' ? 0.26 : 0.20;
  G.impactBursts.push({
    x, y,
    kind, // 'parry' | 'block'
    scale,
    rot: (Math.random() - 0.5) * 0.38,
    life,
    maxLife: life
  });
}

export function spawnHitMark(x, y, angle, color, len = 64, width = 6) {
  G.hitMarks.push({
    x, y,
    angle,
    color,
    len,
    width,
    life: 0.17,
    maxLife: 0.17
  });
}

export function spawnFloatText(x, y, text, color, size = 18, life = 0.85) {
  G.floatTexts.push({ x, y, text, color, size, life, maxLife: life, vy: -52 });
}
