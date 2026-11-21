// Pure Procedural Hand-Drawn Dark Ink Stamp Atlas (0 external PNGs, lazy offscreen-cached for 144Hz)
// Supports bg/fg layering, scale, horizontal flip, opacity & deterministic multi-variant hand-drawn strokes.
import { COLORS, STAMPS } from './config.js';
import { G } from './state.js';
import { drawGlowSprite } from './vfx.js';

export const STAMP_DEFS = [
  // General / Hub (沉钟回廊)
  { id: 'broken_arch',      label: '残破石拱',   cat: '通用', w: 220, h: 250, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'fallen_bell',      label: '半埋断钟骸', cat: '通用', w: 170, h: 135, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'stone_statue',     label: '守誓者残像', cat: '通用', w: 130, h: 220, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'hanging_chains',   label: '垂吊古铁链', cat: '通用', w: 110, h: 240, ax: 0.5, ay: 0.0, defaultLayer: 'bg' },

  // Wind (绝风断塔)
  { id: 'wind_buttress',    label: '断塔飞扶壁', cat: '风',   w: 200, h: 260, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'tattered_pennant', label: '罡风破经幡', cat: '风',   w: 140, h: 210, ax: 0.25, ay: 1.0, defaultLayer: 'bg', animated: 'pennant' },

  // Forest (枯墨古林)
  { id: 'ink_tree',         label: '分形枯古木', cat: '林',   w: 250, h: 300, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'canopy_bough',     label: '墨染垂枝冠', cat: '林',   w: 260, h: 165, ax: 0.5, ay: 0.0, defaultLayer: 'fg' },
  { id: 'glow_spores',      label: '荧光孢菌簇', cat: '林',   w: 120, h: 110, ax: 0.5, ay: 1.0, defaultLayer: 'bg', animated: 'spores' },

  // Fire (沉渊古炉)
  { id: 'bronze_gear',      label: '巨型铜齿轮', cat: '火',   w: 190, h: 190, ax: 0.5, ay: 0.5, defaultLayer: 'bg', animated: 'gear' },
  { id: 'crucible_vat',     label: '悬吊熔坩埚', cat: '火',   w: 150, h: 220, ax: 0.5, ay: 0.0, defaultLayer: 'bg', animated: 'crucible' },

  // Mountain (霜骸圣脊)
  { id: 'ice_spire',        label: '寒霜冰晶簇', cat: '山',   w: 150, h: 185, ax: 0.5, ay: 1.0, defaultLayer: 'bg' },
  { id: 'sword_mound',      label: '风雪残刃冢', cat: '山',   w: 185, h: 150, ax: 0.5, ay: 1.0, defaultLayer: 'bg' }
];

const STAMP_DEF_MAP = Object.create(null);
for (const d of STAMP_DEFS) STAMP_DEF_MAP[d.id] = d;

export function getStampDef(type) {
  return STAMP_DEF_MAP[type] || null;
}

// Deterministic seeded PRNG for consistent hand-drawn strokes across reloads
function makeRng(seed) {
  let s = (Math.floor(seed * 9301 + 49297) >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function handStrokeLine(c, x1, y1, x2, y2, rng, jitter = 1.6, segs = 4) {
  c.beginPath();
  c.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const jx = (rng() - 0.5) * jitter * 2;
    const jy = (rng() - 0.5) * jitter * 2;
    c.lineTo(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
  }
  c.lineTo(x2, y2);
  c.stroke();
}

function drawHatchLines(c, x, y, w, h, step, rng, color = 'rgba(4, 6, 10, 0.45)') {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = 1.1;
  c.beginPath();
  for (let px = x; px < x + w; px += step) {
    const len = h * (0.45 + rng() * 0.5);
    c.moveTo(px, y);
    c.lineTo(px - len * 0.28, y + len);
  }
  c.stroke();
  c.restore();
}

function drawHangingVines(c, x0, y0, x1, count, maxLen, rng, col = 'rgba(92, 118, 106, 0.52)') {
  c.save();
  c.strokeStyle = col;
  c.lineWidth = 1.4;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.3 + rng() * 0.4) / count;
    const vx = x0 + (x1 - x0) * t;
    const len = maxLen * (0.4 + rng() * 0.6);
    const bend = (rng() - 0.5) * 18;
    c.beginPath();
    c.moveTo(vx, y0);
    c.quadraticCurveTo(vx + bend, y0 + len * 0.5, vx + bend * 0.4, y0 + len);
    c.stroke();
  }
  c.restore();
}

function drawFractalBranch(c, x, y, len, ang, depth, width, rng) {
  if (depth <= 0 || len < 6) return;
  const mx = x + Math.cos(ang) * len * 0.52 + (rng() - 0.5) * len * 0.16;
  const my = y + Math.sin(ang) * len * 0.52 + (rng() - 0.5) * len * 0.16;
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;

  c.strokeStyle = '#0c111a';
  c.lineWidth = width + 2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();

  c.strokeStyle = depth > 2 ? '#1a2330' : 'rgba(216, 207, 184, 0.36)';
  c.lineWidth = Math.max(1, width * 0.62);
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();

  const spread = 0.32 + rng() * 0.28;
  drawFractalBranch(c, ex, ey, len * (0.64 + rng() * 0.14), ang - spread, depth - 1, width * 0.65, rng);
  drawFractalBranch(c, ex, ey, len * (0.62 + rng() * 0.14), ang + spread * (0.8 + rng() * 0.3), depth - 1, width * 0.65, rng);
  if (depth >= 3 && rng() < 0.55) {
    drawFractalBranch(c, mx, my, len * 0.52, ang + (rng() < 0.5 ? -0.58 : 0.58), depth - 2, width * 0.52, rng);
  }
}

/* ==================== PROCEDURAL STAMP PAINTERS ==================== */
const STAMP_PAINTERS = {
  broken_arch(c, w, h, rng) {
    const cx = w * 0.5;
    // Soft ink aura behind arch
    const gr = c.createRadialGradient(cx, h * 0.52, 12, cx, h * 0.52, w * 0.48);
    gr.addColorStop(0, 'rgba(20, 30, 48, 0.42)');
    gr.addColorStop(1, 'transparent');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);

    // Left & Right Stone Piers with jagged ruin crown
    c.fillStyle = '#121824';
    c.strokeStyle = 'rgba(216, 207, 184, 0.40)';
    c.lineWidth = 1.9;
    c.beginPath();
    c.moveTo(cx - 88, h);
    c.lineTo(cx - 88, 92);
    c.quadraticCurveTo(cx - 82, 24, cx - 12, 16);
    c.lineTo(cx - 2, 34);
    c.lineTo(cx + 18, 22); // Broken keystone gap
    c.quadraticCurveTo(cx + 82, 34, cx + 88, 98);
    c.lineTo(cx + 88, h);
    c.lineTo(cx + 56, h);
    c.lineTo(cx + 56, 106);
    c.quadraticCurveTo(cx + 52, 54, cx + 10, 46);
    c.lineTo(cx - 8, 52);
    c.quadraticCurveTo(cx - 54, 56, cx - 56, 106);
    c.lineTo(cx - 56, h);
    c.closePath();
    c.fill();
    c.stroke();

    // Stone courses & cracks
    c.strokeStyle = 'rgba(216, 207, 184, 0.16)';
    c.lineWidth = 1.1;
    for (let y = 105; y < h - 10; y += 26) {
      handStrokeLine(c, cx - 86, y, cx - 58, y, rng, 0.8, 2);
      handStrokeLine(c, cx + 58, y, cx + 86, y, rng, 0.8, 2);
    }
    drawHatchLines(c, cx - 84, 110, 24, h - 115, 7, rng);
    drawHatchLines(c, cx + 60, 110, 24, h - 115, 7, rng);

    // Decorative broken tracery halo & hanging moss vines
    c.strokeStyle = 'rgba(216, 207, 184, 0.22)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(cx, 78, 28, Math.PI * 1.05, Math.PI * 1.9);
    c.stroke();
    drawHangingVines(c, cx - 52, 52, cx + 52, 7, 54, rng);
  },

  fallen_bell(c, w, h, rng) {
    const cx = w * 0.5;
    c.save();
    c.translate(cx, h - 12);
    const tilt = -0.34 + (rng() - 0.5) * 0.18;
    c.rotate(tilt);

    // Tilted cracked bronze giant bell half-buried in ash
    c.fillStyle = '#1b1612';
    c.strokeStyle = 'rgba(245, 158, 11, 0.48)';
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(-24, -92);
    c.lineTo(24, -92);
    c.quadraticCurveTo(54, -46, 68, 4);
    c.lineTo(-68, 4);
    c.quadraticCurveTo(-54, -46, -24, -92);
    c.closePath();
    c.fill();
    c.stroke();

    // Bell rim rings & relief bands
    c.strokeStyle = 'rgba(216, 207, 184, 0.25)';
    c.lineWidth = 1.5;
    handStrokeLine(c, -48, -22, 48, -22, rng, 1.0, 4);
    handStrokeLine(c, -36, -56, 36, -56, rng, 1.0, 3);

    // Jagged luminous crack down the bell wall
    c.strokeStyle = 'rgba(253, 224, 71, 0.62)';
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(6, -84); c.lineTo(-8, -54); c.lineTo(10, -28); c.lineTo(-6, 2);
    c.stroke();
    c.restore();

    // Ash & rubble mound burying the rim
    c.fillStyle = '#0e131e';
    c.strokeStyle = 'rgba(216, 207, 184, 0.26)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(16, h);
    c.quadraticCurveTo(cx - 26, h - 22, cx + 10, h - 14);
    c.quadraticCurveTo(cx + 54, h - 24, w - 16, h);
    c.closePath();
    c.fill();
    c.stroke();
  },

  stone_statue(c, w, h, rng) {
    const cx = w * 0.5;
    // Stepped weathered pedestal
    c.fillStyle = '#151c29';
    c.strokeStyle = 'rgba(216, 207, 184, 0.36)';
    c.lineWidth = 1.7;
    c.fillRect(cx - 42, h - 26, 84, 26);
    c.strokeRect(cx - 42, h - 26, 84, 26);
    c.fillRect(cx - 32, h - 42, 64, 16);
    c.strokeRect(cx - 32, h - 42, 64, 16);

    // Draped hooded stone Oath-Keeper silhouette (cracked shoulder, missing half-crown)
    c.fillStyle = '#192131';
    c.strokeStyle = 'rgba(216, 207, 184, 0.46)';
    c.lineWidth = 1.9;
    c.beginPath();
    c.moveTo(cx - 28, h - 42);
    c.quadraticCurveTo(cx - 34, h - 110, cx - 22, h - 166);
    c.lineTo(cx - 10, h - 188);
    c.lineTo(cx + 4, h - 176); // Fractured neck/head
    c.lineTo(cx + 22, h - 164);
    c.quadraticCurveTo(cx + 32, h - 105, cx + 28, h - 42);
    c.closePath();
    c.fill();
    c.stroke();

    // Stone robe drapery folds
    c.strokeStyle = 'rgba(9, 12, 18, 0.65)';
    c.lineWidth = 1.5;
    handStrokeLine(c, cx - 14, h - 150, cx - 18, h - 46, rng, 2.0, 5);
    handStrokeLine(c, cx + 12, h - 146, cx + 16, h - 46, rng, 2.0, 5);

    // Planted broken greatsword in front of chest
    c.fillStyle = '#252d3e';
    c.strokeStyle = 'rgba(216, 207, 184, 0.56)';
    c.lineWidth = 1.6;
    c.fillRect(cx - 4, h - 156, 8, 114);
    c.strokeRect(cx - 4, h - 156, 8, 114);
    c.fillRect(cx - 20, h - 142, 40, 6);
    c.strokeRect(cx - 20, h - 142, 40, 6);

    drawHangingVines(c, cx - 24, h - 158, cx + 24, 4, 38, rng);
  },

  hanging_chains(c, w, h, rng) {
    const strands = 3;
    for (let s = 0; s < strands; s++) {
      const sx = w * (0.24 + s * 0.26) + (rng() - 0.5) * 10;
      const len = h * (0.62 + rng() * 0.36);
      const linkH = 12 + (s % 2) * 3;
      const linkW = 5 + (s % 2) * 1.5;
      c.strokeStyle = s === 1 ? 'rgba(216, 207, 184, 0.44)' : 'rgba(148, 163, 184, 0.28)';
      c.lineWidth = s === 1 ? 2.1 : 1.5;
      for (let y = 4; y < len; y += linkH * 0.78) {
        c.beginPath();
        c.ellipse(sx + Math.sin(y * 0.04 + s) * 2.5, y, linkW * 0.5, linkH * 0.5, 0, 0, Math.PI * 2);
        c.stroke();
      }
      // Heavy rusted hook / shackle weight at chain end
      c.fillStyle = '#1b202b';
      c.strokeStyle = 'rgba(245, 158, 11, 0.42)';
      c.beginPath();
      c.arc(sx, len + 5, 6.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  },

  wind_buttress(c, w, h, rng) {
    const cx = w * 0.5;
    c.fillStyle = '#121a28';
    c.strokeStyle = 'rgba(186, 230, 253, 0.34)';
    c.lineWidth = 1.8;
    // Tall slender gothic flying buttress pier with swept wind-worn ribs
    c.beginPath();
    c.moveTo(cx - 76, h);
    c.lineTo(cx - 64, 58);
    c.lineTo(cx - 46, 20);
    c.lineTo(cx - 32, 62);
    c.lineTo(cx - 32, 112);
    c.quadraticCurveTo(cx + 12, 82, cx + 68, 52);
    c.lineTo(cx + 76, 78);
    c.quadraticCurveTo(cx + 16, 112, cx - 32, 148);
    c.lineTo(cx - 30, h);
    c.closePath();
    c.fill();
    c.stroke();

    // Eroded stone notches & wind streaks
    c.strokeStyle = 'rgba(186, 230, 253, 0.18)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const y = 70 + i * 28;
      handStrokeLine(c, cx - 64, y, cx - 34, y - 4, rng, 1.0, 3);
    }
    drawHatchLines(c, cx - 66, 74, 30, h - 82, 8, rng);
  },

  tattered_pennant(c, w, h, rng) {
    // Static pole & brass bell-finial (ribbon cloth drawn live in drawStampsLayer for fluid wind!)
    const px = w * 0.25;
    c.strokeStyle = '#9b8e77';
    c.lineWidth = 3.4;
    handStrokeLine(c, px, h, px, 22, rng, 1.2, 5);
    c.strokeStyle = COLORS.gold;
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(px - 10, 36); c.lineTo(px + 28, 36);
    c.stroke();
    c.fillStyle = '#2d2318';
    c.beginPath(); c.arc(px, 18, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
  },

  ink_tree(c, w, h, rng) {
    const cx = w * 0.5;
    // Soft ink foliage mist clouds in upper canopy
    for (let i = 0; i < 5; i++) {
      const fx = cx + (rng() - 0.5) * 145;
      const fy = 58 + rng() * 78;
      const fr = 38 + rng() * 32;
      const g = c.createRadialGradient(fx, fy, 4, fx, fy, fr);
      g.addColorStop(0, 'rgba(12, 22, 28, 0.55)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.beginPath(); c.arc(fx, fy, fr, 0, Math.PI * 2); c.fill();
    }
    // Gnarled sprawling surface roots
    for (let r = -2; r <= 2; r++) {
      c.strokeStyle = '#0d131d';
      c.lineWidth = 5.5 - Math.abs(r) * 0.9;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx + r * 5, h - 22);
      c.quadraticCurveTo(cx + r * 28, h - 10, cx + r * 46 + (rng() - 0.5) * 12, h);
      c.stroke();
    }
    // Recursive hand-drawn fractal trunk & branches
    drawFractalBranch(c, cx, h - 10, 88, -Math.PI * 0.5 + (rng() - 0.5) * 0.14, 5, 13, rng);
    drawHangingVines(c, cx - 88, 92, cx + 88, 9, 76, rng, 'rgba(74, 118, 108, 0.45)');
  },

  canopy_bough(c, w, h, rng) {
    // Overhead dark ink tree-bough canopy with hanging tendrils for foreground/ceiling depth
    for (let i = 0; i < 6; i++) {
      const bx = 36 + (w - 72) * (i / 5);
      const by = 18 + (rng() * 24);
      const r = 34 + rng() * 26;
      const g = c.createRadialGradient(bx, by, 4, bx, by, r);
      g.addColorStop(0, 'rgba(7, 12, 18, 0.88)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = '#090e16';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(10, 8);
    c.quadraticCurveTo(w * 0.48, 44, w - 10, 14);
    c.stroke();
    drawHangingVines(c, 22, 26, w - 22, 12, h - 32, rng, 'rgba(62, 104, 96, 0.52)');
  },

  glow_spores(c, w, h, rng) {
    const cx = w * 0.5;
    // Mossy mound base
    c.fillStyle = '#111d24';
    c.beginPath();
    c.ellipse(cx, h - 6, 42, 12, 0, 0, Math.PI * 2);
    c.fill();
    // Cluster of hand-drawn luminescent ink mushrooms
    const stems = [
      { x: cx - 22, h: 36, r: 15 },
      { x: cx - 2,  h: 56, r: 21 },
      { x: cx + 22, h: 42, r: 16 },
      { x: cx + 8,  h: 28, r: 11 }
    ];
    for (const st of stems) {
      const bend = (rng() - 0.5) * 10;
      c.strokeStyle = '#9fb6be';
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(st.x, h - 6);
      c.quadraticCurveTo(st.x + bend, h - st.h * 0.5, st.x + bend * 0.6, h - st.h);
      c.stroke();

      const capX = st.x + bend * 0.6;
      const capY = h - st.h;
      const g = c.createRadialGradient(capX, capY, 2, capX, capY, st.r * 1.9);
      g.addColorStop(0, 'rgba(56, 189, 248, 0.48)');
      g.addColorStop(1, 'transparent');
      c.fillStyle = g;
      c.beginPath(); c.arc(capX, capY, st.r * 1.9, 0, Math.PI * 2); c.fill();

      c.fillStyle = '#16344a';
      c.strokeStyle = COLORS.cyanBright;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(capX, capY + 2, st.r, Math.PI, 0);
      c.quadraticCurveTo(capX, capY + 8, capX - st.r, capY + 2);
      c.closePath();
      c.fill();
      c.stroke();
    }
  },

  bronze_gear(c, w, h, rng) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const outerR = Math.min(w, h) * 0.42;
    const innerR = outerR * 0.78;
    const teeth = 12;

    c.save();
    c.translate(cx, cy);
    c.fillStyle = '#201814';
    c.strokeStyle = 'rgba(245, 158, 11, 0.44)';
    c.lineWidth = 2.0;

    c.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2 / teeth) * 0.36;
      const a2 = a0 + (Math.PI * 2 / teeth) * 0.50;
      const a3 = a0 + (Math.PI * 2 / teeth) * 0.86;
      if (i === 0) c.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      else c.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      c.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      c.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
      c.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    c.closePath();
    c.fill();
    c.stroke();

    // Hollowed cutouts & spokes
    c.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 4; k++) {
      const sa = (k * Math.PI) / 2 + 0.2;
      const ea = sa + Math.PI * 0.5 - 0.4;
      c.beginPath();
      c.arc(0, 0, innerR * 0.72, sa, ea);
      c.arc(0, 0, innerR * 0.34, ea, sa, true);
      c.closePath();
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(216, 207, 184, 0.32)';
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, innerR * 0.34, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#332418';
    c.beginPath(); c.arc(0, 0, innerR * 0.16, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  },

  crucible_vat(c, w, h, rng) {
    const cx = w * 0.5;
    // Twin iron chains holding the crucible from ceiling
    c.strokeStyle = 'rgba(216, 207, 184, 0.38)';
    c.lineWidth = 2.4;
    handStrokeLine(c, cx - 32, 0, cx - 32, h - 76, rng, 1.0, 5);
    handStrokeLine(c, cx + 32, 0, cx + 32, h - 76, rng, 1.0, 5);

    // Molten golden-orange glow above vat rim
    const g = c.createRadialGradient(cx, h - 74, 6, cx, h - 74, 58);
    g.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
    g.addColorStop(0.5, 'rgba(245, 158, 11, 0.24)');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, h - 74, 58, 0, Math.PI * 2); c.fill();

    // Heavy iron foundry vat body
    c.fillStyle = '#1b1512';
    c.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(cx - 46, h - 76);
    c.lineTo(cx + 46, h - 76);
    c.lineTo(cx + 34, h - 18);
    c.quadraticCurveTo(cx, h - 4, cx - 34, h - 18);
    c.closePath();
    c.fill();
    c.stroke();

    // Glowing molten lip
    c.fillStyle = COLORS.goldBright;
    c.fillRect(cx - 38, h - 78, 76, 5);
  },

  ice_spire(c, w, h, rng) {
    const cx = w * 0.5;
    const shards = [
      { ox: -34, bw: 24, sh: 105, lean: -14 },
      { ox: 28,  bw: 26, sh: 118, lean: 16 },
      { ox: 0,   bw: 36, sh: 168, lean: (rng() - 0.5) * 12 }
    ];
    for (const s of shards) {
      const bx = cx + s.ox;
      const tipX = bx + s.lean;
      const tipY = h - s.sh;
      const gr = c.createLinearGradient(tipX, tipY, bx, h);
      gr.addColorStop(0, 'rgba(186, 230, 253, 0.62)');
      gr.addColorStop(0.55, 'rgba(30, 58, 84, 0.72)');
      gr.addColorStop(1, 'rgba(12, 20, 34, 0.90)');
      c.fillStyle = gr;
      c.strokeStyle = 'rgba(224, 242, 254, 0.65)';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(bx - s.bw * 0.5, h);
      c.lineTo(bx - s.bw * 0.38, h - s.sh * 0.65);
      c.lineTo(tipX, tipY);
      c.lineTo(bx + s.bw * 0.42, h - s.sh * 0.58);
      c.lineTo(bx + s.bw * 0.5, h);
      c.closePath();
      c.fill();
      c.stroke();

      // Inner crystal facet ridge
      c.strokeStyle = 'rgba(255, 255, 255, 0.34)';
      c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(bx - 2, h - 6); c.stroke();
    }
  },

  sword_mound(c, w, h, rng) {
    const cx = w * 0.5;
    // Planted weathered swords & spears jutting out of a snow/ash cairn
    const blades = [
      { ox: -42, len: 82, ang: -0.26 },
      { ox: -14, len: 112, ang: 0.08 },
      { ox: 18,  len: 94, ang: -0.14 },
      { ox: 46,  len: 76, ang: 0.28 }
    ];
    for (const b of blades) {
      c.save();
      c.translate(cx + b.ox, h - 18);
      c.rotate(b.ang);
      c.fillStyle = '#252d3c';
      c.strokeStyle = 'rgba(216, 207, 184, 0.55)';
      c.lineWidth = 1.4;
      c.fillRect(-3.2, -b.len, 6.4, b.len);
      c.strokeRect(-3.2, -b.len, 6.4, b.len);
      c.fillRect(-13, -b.len + 18, 26, 4.5);
      c.strokeRect(-13, -b.len + 18, 26, 4.5);
      c.restore();
    }
    // Snow/ash mound base
    c.fillStyle = '#182233';
    c.strokeStyle = 'rgba(224, 242, 254, 0.42)';
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(14, h);
    c.quadraticCurveTo(cx - 40, h - 38, cx, h - 28);
    c.quadraticCurveTo(cx + 42, h - 40, w - 14, h);
    c.closePath();
    c.fill();
    c.stroke();
  }
};

// Lazy offscreen cache: max 3 deterministic variants per stamp type
const _stampCache = new Map();

export function getStampCanvas(type, seed = 0) {
  const def = STAMP_DEF_MAP[type];
  if (!def) return null;
  const variant = Math.abs(Math.floor(Number(seed) || 0)) % 3;
  const key = `${type}_${variant}`;
  let cached = _stampCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = def.w;
  canvas.height = def.h;
  const c = canvas.getContext('2d');
  const rng = makeRng((variant + 1) * 7919 + type.length * 131);
  const painter = STAMP_PAINTERS[type];
  if (painter) painter(c, def.w, def.h, rng);
  _stampCache.set(key, canvas);
  return canvas;
}

export function prewarmStampsForList(list) {
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    getStampCanvas(list[i].type, list[i].seed || i);
  }
}

function drawStampInstance(ctx, st, wx, wy, liveTime = 0) {
  const def = STAMP_DEF_MAP[st.type];
  if (!def) return;
  const spr = getStampCanvas(st.type, st.seed || 0);
  if (!spr) return;

  const scale = Number(st.scale) || 1;
  const flip = st.flip ? -1 : 1;
  const alpha = st.alpha !== undefined ? st.alpha : (st.layer === 'fg' ? 0.84 : 0.92);

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(wx, wy);
  if (def.animated === 'gear') {
    const dir = (st.seed || 0) % 2 === 0 ? 1 : -1;
    ctx.rotate(liveTime * 0.22 * dir);
  } else if (st.rotate) {
    ctx.rotate(st.rotate);
  }
  ctx.scale(scale * flip, scale);
  ctx.drawImage(spr, -def.w * def.ax, -def.h * def.ay);

  // Lightweight animated overlays for dynamic procedural stamps (zero allocations)
  if (def.animated === 'pennant') {
    const px = def.w * (0.25 - def.ax);
    const py = -def.h * def.ay + 36;
    const wave1 = Math.sin(liveTime * 4.6 + (st.seed || 0)) * 12;
    const wave2 = Math.cos(liveTime * 6.2 + (st.seed || 0)) * 9;
    ctx.fillStyle = '#3b1522';
    ctx.strokeStyle = 'rgba(216, 207, 184, 0.36)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px + 2, py);
    ctx.quadraticCurveTo(px + 42, py + 12 + wave1 * 0.6, px + 88, py + 6 + wave1);
    ctx.lineTo(px + 72, py + 28 + wave2 * 0.7);
    ctx.lineTo(px + 94, py + 44 + wave2);
    ctx.quadraticCurveTo(px + 44, py + 46 + wave1 * 0.5, px + 2, py + 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.animated === 'crucible' && ctx === G.ctx) {
    const pulse = 0.55 + Math.sin(liveTime * 5.2 + (st.seed || 0)) * 0.22;
    drawGlowSprite('gold', 0, def.h * (1 - def.ay) - 74, 48, pulse * 0.45);
  } else if (def.animated === 'spores' && ctx === G.ctx) {
    const pulse = 0.45 + Math.sin(liveTime * 3.4 + (st.seed || 0)) * 0.2;
    drawGlowSprite('cyan', 0, -def.h * 0.48, 38, pulse * 0.45);
  }
  ctx.restore();
}

export function drawStampsLayer(layer = 'bg') {
  if (!STAMPS || STAMPS.length === 0) return;
  const camX = G.cam.x;
  const camY = G.cam.y;
  const camW = G.canvasW;
  const camH = G.canvasH;
  const ctx = G.ctx;
  const t = G.globalTime || 0;

  for (let i = 0; i < STAMPS.length; i++) {
    const st = STAMPS[i];
    const stLayer = st.layer || (STAMP_DEF_MAP[st.type] ? STAMP_DEF_MAP[st.type].defaultLayer : 'bg');
    if (stLayer !== layer) continue;
    const def = STAMP_DEF_MAP[st.type];
    if (!def) continue;
    const sc = Number(st.scale) || 1;
    const padX = def.w * sc + 80;
    const padY = def.h * sc + 80;
    if (st.x + padX < camX || st.x - padX > camX + camW ||
        st.y + padY < camY || st.y - padY > camY + camH) continue;
    drawStampInstance(ctx, st, st.x, st.y, t);
  }
}

export function drawStampPreview(ctx, st, ox = 0, oy = 0) {
  drawStampInstance(ctx, st, ox + st.x, oy + st.y, 0);
}
