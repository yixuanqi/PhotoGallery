// Chunked (1024x800) Offscreen Procedural Organic Terrain Renderer & Biome Auto-Overlays
// 0 external PNGs, deterministic world-space hand-drawn ink rocks/masonry, 2-4 drawImage blits/frame at 144Hz.
import { ROOMS, ROOM_THEMES, SOLIDS, PUDDLES, ABYSSAL_RIVERS, WORLD_W, FLOOR_Y } from './config.js';
import { G } from './state.js';
import { rgbStr } from './renderParallax.js';

const CHUNK_W = 1024;
const CHUNK_H = 800;
const CHUNK_PAD = 36; // Overhang bleed so snow/icicles/capitals/stalactites never clip at chunk borders

export const TERRAIN_OVERLAY_OPTIONS = [
  { value: 'auto',        label: '跟随生态默认' },
  { value: 'none',        label: '无覆层 (素石)' },
  { value: 'moss',        label: '古苔藓 (moss)' },
  { value: 'forest_moss', label: '幽林浓苔 (forest_moss)' },
  { value: 'snow',        label: '飞雪冰棱 (snow)' },
  { value: 'molten',      label: '熔金锻铆 (molten)' },
  { value: 'drip',        label: '渗水矿晶 (drip)' },
  { value: 'filigree',    label: '圣堂金丝 (filigree)' },
  { value: 'wind',        label: '罡风蚀纹 (wind)' }
];

export const TERRAIN_STYLES = {
  sanctuary: {
    deepFill: '#080c14', midFill: '#111826', topFill: '#1b2436',
    pillarFill: '#172030', pillarCap: '#222d42', platFill: '#1d273b',
    rimStroke: 'rgba(216, 207, 184, 0.54)', seamStroke: 'rgba(216, 207, 184, 0.16)',
    accentVein: 'rgba(56, 189, 248, 0.22)', overlay: 'moss'
  },
  corridor: {
    deepFill: '#080b12', midFill: '#111722', topFill: '#192131',
    pillarFill: '#161e2c', pillarCap: '#20293b', platFill: '#1c2536',
    rimStroke: 'rgba(210, 206, 194, 0.50)', seamStroke: 'rgba(216, 207, 184, 0.14)',
    accentVein: 'rgba(148, 163, 184, 0.18)', overlay: 'moss'
  },
  chapel: {
    deepFill: '#0c080e', midFill: '#19111b', topFill: '#261824',
    pillarFill: '#211520', pillarCap: '#301e2b', platFill: '#271925',
    rimStroke: 'rgba(245, 185, 130, 0.54)', seamStroke: 'rgba(248, 113, 113, 0.16)',
    accentVein: 'rgba(245, 158, 11, 0.30)', overlay: 'filigree'
  },
  heart: {
    deepFill: '#0d080c', midFill: '#1e1218', topFill: '#2c1920',
    pillarFill: '#25151c', pillarCap: '#382125', platFill: '#2c1a20',
    rimStroke: 'rgba(253, 224, 71, 0.58)', seamStroke: 'rgba(245, 158, 11, 0.20)',
    accentVein: 'rgba(253, 224, 71, 0.34)', overlay: 'filigree'
  },
  bell_well: {
    deepFill: '#050b12', midFill: '#0c1824', topFill: '#142636',
    pillarFill: '#112130', pillarCap: '#1a3044', platFill: '#16293b',
    rimStroke: 'rgba(125, 211, 252, 0.46)', seamStroke: 'rgba(125, 211, 252, 0.15)',
    accentVein: 'rgba(56, 189, 248, 0.34)', overlay: 'drip'
  },
  crypt: {
    deepFill: '#080610', midFill: '#130f22', topFill: '#1e1834',
    pillarFill: '#1a142d', pillarCap: '#271f42', platFill: '#211a38',
    rimStroke: 'rgba(196, 181, 253, 0.48)', seamStroke: 'rgba(167, 139, 250, 0.16)',
    accentVein: 'rgba(168, 85, 247, 0.32)', overlay: 'drip'
  },
  foundry: {
    deepFill: '#0d0706', midFill: '#1c110d', topFill: '#2a1a14',
    pillarFill: '#241712', pillarCap: '#362219', platFill: '#2b1b14',
    rimStroke: 'rgba(251, 191, 36, 0.54)', seamStroke: 'rgba(245, 158, 11, 0.18)',
    accentVein: 'rgba(245, 158, 11, 0.48)', overlay: 'molten'
  },
  ascent: {
    deepFill: '#0c0810', midFill: '#1c1320', topFill: '#2a1c28',
    pillarFill: '#241824', pillarCap: '#362330', platFill: '#2b1d28',
    rimStroke: 'rgba(251, 191, 36, 0.52)', seamStroke: 'rgba(245, 158, 11, 0.17)',
    accentVein: 'rgba(245, 158, 11, 0.36)', overlay: 'molten'
  },
  wind: {
    deepFill: '#091019', midFill: '#142030', topFill: '#213245',
    pillarFill: '#1c2b3c', pillarCap: '#2a3e54', platFill: '#223448',
    rimStroke: 'rgba(186, 230, 253, 0.56)', seamStroke: 'rgba(186, 230, 253, 0.18)',
    accentVein: 'rgba(224, 242, 254, 0.24)', overlay: 'wind'
  },
  forest: {
    deepFill: '#060d0f', midFill: '#0e1b1f', topFill: '#16292d',
    pillarFill: '#132428', pillarCap: '#1c3336', platFill: '#172b2f',
    rimStroke: 'rgba(110, 231, 183, 0.48)', seamStroke: 'rgba(110, 231, 183, 0.15)',
    accentVein: 'rgba(52, 211, 153, 0.28)', overlay: 'forest_moss'
  },
  mountain: {
    deepFill: '#0a0f1c', midFill: '#152035', topFill: '#22314d',
    pillarFill: '#1b2840', pillarCap: '#293b5c', platFill: '#223250',
    rimStroke: 'rgba(224, 242, 254, 0.68)', seamStroke: 'rgba(186, 230, 253, 0.20)',
    accentVein: 'rgba(186, 230, 253, 0.38)', overlay: 'snow'
  }
};

// Deterministic world-space hash returning [-1, 1] (zero chunk-boundary seam drift!)
function wHash(x, y) {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return (v - Math.floor(v)) * 2 - 1;
}

function clampMod(val, fallback = 1) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.max(0, Math.min(2, n)) : fallback;
}

function getRoomThemeMap() {
  const map = Object.create(null);
  for (let i = 0; i < ROOMS.length; i++) {
    map[ROOMS[i].id] = ROOMS[i].theme || 'corridor';
  }
  return map;
}

function getRoomModMap() {
  const map = Object.create(null);
  for (let i = 0; i < ROOMS.length; i++) {
    if (ROOMS[i].terrainMod) map[ROOMS[i].id] = ROOMS[i].terrainMod;
  }
  return map;
}

export function resolveTerrainStyle(theme, roomMod = null, solidMod = null) {
  const base = TERRAIN_STYLES[theme] || TERRAIN_STYLES.corridor;
  const rm = roomMod && typeof roomMod === 'object' ? roomMod : null;
  const sm = solidMod && typeof solidMod === 'object' ? solidMod : null;

  let overlay = base.overlay;
  if (rm && rm.overlay && rm.overlay !== 'auto' && rm.overlay !== 'inherit') overlay = rm.overlay;
  if (sm && sm.overlay && sm.overlay !== 'auto' && sm.overlay !== 'inherit') overlay = sm.overlay;

  const weathering = (sm && sm.weathering !== undefined && sm.weathering !== null && sm.weathering !== '')
    ? clampMod(sm.weathering, 1)
    : (rm && rm.weathering !== undefined && rm.weathering !== null && rm.weathering !== '')
      ? clampMod(rm.weathering, 1)
      : 1;

  const cracks = (sm && sm.cracks !== undefined && sm.cracks !== null && sm.cracks !== '')
    ? clampMod(sm.cracks, 1)
    : (rm && rm.cracks !== undefined && rm.cracks !== null && rm.cracks !== '')
      ? clampMod(rm.cracks, 1)
      : 1;

  const overlayDensity = (sm && sm.overlayDensity !== undefined && sm.overlayDensity !== null && sm.overlayDensity !== '')
    ? clampMod(sm.overlayDensity, 1)
    : (rm && rm.overlayDensity !== undefined && rm.overlayDensity !== null && rm.overlayDensity !== '')
      ? clampMod(rm.overlayDensity, 1)
      : 1;

  return { ...base, overlay, weathering, cracks, overlayDensity };
}

function getStyleForSolid(s, themeMap, modMap) {
  const theme = (s.roomId && themeMap[s.roomId]) ? themeMap[s.roomId] : (s.y > 900 ? 'bell_well' : 'corridor');
  const rmMod = (s.roomId && modMap && modMap[s.roomId]) ? modMap[s.roomId] : null;
  return resolveTerrainStyle(theme, rmMod, s.mod || null);
}

function drawRockCracks(c, x0, y0, w, h, st, baseDensity = 140) {
  const crackMult = st.cracks !== undefined ? st.cracks : 1;
  if (crackMult <= 0.04) return;
  const density = Math.max(46, Math.round(baseDensity / Math.max(0.25, crackMult)));
  const startCol = Math.floor(x0 / density) * density;
  const endCol = x0 + w;
  c.save();
  for (let gx = startCol; gx < endCol; gx += density) {
    const cx = gx + (wHash(gx, y0) * 0.35 + 0.5) * density;
    if (cx <= x0 + 18 || cx >= x0 + w - 18) continue;
    const cy = y0 + 26 + Math.abs(wHash(gx + 17, y0 + 9)) * Math.min(72, Math.max(16, h - 38));
    if (cy >= y0 + h - 14) continue;
    const depth = Math.min(h - (cy - y0) - 8, 28 + Math.abs(wHash(gx + 53, y0)) * 54);
    if (depth < 14) continue;

    // Dark ink fissure
    c.strokeStyle = 'rgba(4, 6, 11, 0.72)';
    c.lineWidth = 1.9;
    c.beginPath();
    let px = cx;
    let py = cy;
    c.moveTo(px, py);
    const segs = 3;
    for (let k = 1; k <= segs; k++) {
      px += wHash(gx + k * 29, py) * 14;
      py += depth / segs;
      c.lineTo(px, py);
    }
    c.stroke();

    // Subtle biome mineral / molten accent highlight inside select fissures
    if (wHash(gx + 91, y0 + 3) > 0.15) {
      c.strokeStyle = st.accentVein;
      c.lineWidth = 1.1;
      c.stroke();
    }
  }
  c.restore();
}

function drawTopBiomeOverlay(c, x, y, w, st, isPlatform = false) {
  const ov = st.overlay;
  const ovDen = st.overlayDensity !== undefined ? st.overlayDensity : 1;
  if (!ov || ov === 'none' || ovDen <= 0.04) return;
  const step = Math.max(18, Math.round(36 / Math.max(0.35, Math.min(1.8, ovDen))));
  const startX = Math.floor(x / step) * step;

  if (ov === 'moss' || ov === 'forest_moss') {
    const dense = ov === 'forest_moss';
    c.fillStyle = dense ? 'rgba(26, 68, 58, 0.84)' : 'rgba(46, 74, 68, 0.56)';
    c.strokeStyle = dense ? 'rgba(110, 231, 183, 0.38)' : 'rgba(140, 174, 160, 0.30)';
    c.lineWidth = 1.1;
    for (let gx = startX; gx < x + w; gx += step) {
      if (!dense && wHash(gx, y) < 0.05) continue;
      const mx = Math.max(x + 3, gx + 2);
      const mw = Math.min(x + w - 3, gx + step - 4) - mx;
      if (mw < 10) continue;
      const drop = (dense ? (8 + Math.abs(wHash(gx + 7, y)) * 8) : (4 + Math.abs(wHash(gx + 7, y)) * 4.5)) * (0.65 + ovDen * 0.35);
      c.beginPath();
      c.moveTo(mx, y);
      c.quadraticCurveTo(mx + mw * 0.5, y - (dense ? 3.5 : 1.5), mx + mw, y);
      c.quadraticCurveTo(mx + mw * 0.72, y + drop, mx + mw * 0.5, y + drop * 0.72);
      c.quadraticCurveTo(mx + mw * 0.25, y + drop * 1.05, mx, y + 2);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else if (ov === 'snow') {
    // Plush scalloped snowdrift cap on top surfaces
    c.fillStyle = 'rgba(226, 240, 252, 0.88)';
    c.strokeStyle = 'rgba(148, 197, 235, 0.55)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(x + 1, y + 2);
    for (let px = x; px <= x + w; px += 22) {
      const cx = Math.min(x + w, px);
      const lift = (3.5 + Math.abs(wHash(cx, y)) * 3.5) * (0.55 + ovDen * 0.45);
      c.lineTo(cx, y - lift);
    }
    for (let px = x + w; px >= x; px -= 26) {
      const cx = Math.max(x, px);
      const drape = (4 + Math.abs(wHash(cx + 13, y + 5)) * 6) * (0.55 + ovDen * 0.45);
      c.lineTo(cx, y + drape);
    }
    c.closePath();
    c.fill();
    c.stroke();
  } else if (ov === 'filigree') {
    // Carved gothic bronze cathedral inlay line + stud rivets
    c.strokeStyle = 'rgba(245, 158, 11, 0.34)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x + 4, y + 6);
    c.lineTo(x + w - 4, y + 6);
    c.stroke();
    c.fillStyle = 'rgba(253, 224, 71, 0.42)';
    for (let gx = startX + 18; gx < x + w - 8; gx += 48) {
      if (gx < x + 8) continue;
      c.beginPath();
      c.arc(gx, y + 6, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  } else if (ov === 'molten') {
    // Dark forged iron rim rivets + glowing hot hairline seams
    c.fillStyle = 'rgba(245, 158, 11, 0.50)';
    for (let gx = startX + 14; gx < x + w - 8; gx += 44) {
      if (gx < x + 8) continue;
      c.fillRect(gx - 2, y + 5, 4, 3);
      if (!isPlatform && wHash(gx + 3, y) > 0.25) {
        c.strokeStyle = 'rgba(251, 146, 60, 0.44)';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(gx, y + 2);
        c.lineTo(gx + wHash(gx, y + 9) * 10, y + 18);
        c.stroke();
      }
    }
  } else if (ov === 'drip') {
    // Glossy damp mineral sheen & occasional small crystal clusters
    c.fillStyle = 'rgba(125, 211, 252, 0.14)';
    c.fillRect(x + 2, y + 1, Math.max(0, w - 4), 4);
    c.fillStyle = st.accentVein;
    for (let gx = startX + 20; gx < x + w - 12; gx += 92) {
      if (gx < x + 12 || wHash(gx, y) < 0.22) continue;
      c.beginPath();
      c.moveTo(gx - 5, y); c.lineTo(gx - 1, y - 9); c.lineTo(gx + 3, y);
      c.lineTo(gx + 6, y - 6); c.lineTo(gx + 9, y);
      c.closePath();
      c.fill();
    }
  } else if (ov === 'wind') {
    // Wind-carved notched bevel strokes
    c.strokeStyle = 'rgba(224, 242, 254, 0.30)';
    c.lineWidth = 1.2;
    c.beginPath();
    for (let gx = startX + 10; gx < x + w - 12; gx += 42) {
      if (gx < x + 6) continue;
      c.moveTo(gx, y + 2);
      c.lineTo(gx + 14, y + 7);
    }
    c.stroke();
  }
}

/* ==================== 1. ORGANIC GROUND SLAB PAINTER ==================== */
function paintGroundSolid(c, s, st) {
  const stepX = 28;
  const stepY = 34;
  const wf = st.weathering !== undefined ? st.weathering : 1;

  // Build world-aligned organic silhouette polygon
  c.beginPath();
  c.moveTo(s.x, s.y);
  const firstGridX = Math.ceil(s.x / stepX) * stepX;
  for (let px = firstGridX; px < s.x + s.w; px += stepX) {
    const dy = wHash(px, s.y) * 2.4 * wf;
    c.lineTo(px, s.y + dy);
  }
  c.lineTo(s.x + s.w, s.y);

  // Right edge: jagged organic cliff if exposed, flush if room-seamed
  if (s.x + s.w < WORLD_W && !s.seamRight) {
    for (let py = s.y + stepY; py < s.y + s.h; py += stepY) {
      const dx = (wHash(s.x + s.w, py) * 4.5 - 1.5) * wf;
      c.lineTo(s.x + s.w + dx, py);
    }
  }
  c.lineTo(s.x + s.w, s.y + s.h);
  c.lineTo(s.x, s.y + s.h);

  // Left edge: jagged organic cliff if exposed, flush if room-seamed
  if (s.x > 0 && !s.seamLeft) {
    for (let py = s.y + s.h - stepY; py > s.y; py -= stepY) {
      const dx = (wHash(s.x, py) * 4.5 + 1.5) * wf;
      c.lineTo(s.x + dx, py);
    }
  }
  c.closePath();

  // Clip interior textures cleanly inside organic rock boundary
  c.save();
  c.clip();

  // Layer 1: Deep bedrock fill
  c.fillStyle = st.deepFill;
  c.fillRect(s.x - 10, s.y - 8, s.w + 20, s.h + 16);

  // Layer 2: Organic undulating subterranean mid-strata band
  const midH = Math.min(118, s.h);
  c.fillStyle = st.midFill;
  c.beginPath();
  c.moveTo(s.x - 10, s.y - 8);
  c.lineTo(s.x + s.w + 10, s.y - 8);
  c.lineTo(s.x + s.w + 10, s.y + midH);
  for (let px = Math.floor((s.x + s.w) / 48) * 48; px >= s.x - 10; px -= 48) {
    c.lineTo(px, s.y + midH + wHash(px, s.y + 77) * 14);
  }
  c.closePath();
  c.fill();

  // Layer 3: Upper hand-carved flagstone crust
  const topH = Math.min(34, s.h);
  c.fillStyle = st.topFill;
  c.fillRect(s.x - 10, s.y - 6, s.w + 20, topH + 6);

  // Alternating hand-hewn flagstone blocks (2 courses)
  const blockW = 64;
  const startBx = Math.floor(s.x / blockW) * blockW;
  for (let bx = startBx; bx < s.x + s.w; bx += blockW) {
    const shade = wHash(bx, s.y + 11);
    c.fillStyle = shade > 0 ? 'rgba(216, 207, 184, 0.055)' : 'rgba(4, 6, 12, 0.22)';
    c.fillRect(bx + 2, s.y + 2, blockW - 4, 19);
    // Second offset stone course below
    const bx2 = bx + 32;
    c.fillStyle = wHash(bx2, s.y + 33) > 0 ? 'rgba(216, 207, 184, 0.032)' : 'rgba(4, 6, 12, 0.24)';
    c.fillRect(bx2 + 2, s.y + 23, blockW - 4, 22);
  }

  // Hand-drawn diagonal ink cross-hatching under flagstone course (graphic novel depth!)
  c.strokeStyle = 'rgba(4, 6, 11, 0.56)';
  c.lineWidth = 1.25;
  c.beginPath();
  const hStart = Math.floor(s.x / 14) * 14;
  for (let hx = hStart; hx < s.x + s.w; hx += 14) {
    const hLen = 14 + Math.abs(wHash(hx, s.y + 5)) * 22;
    c.moveTo(hx, s.y + 21);
    c.lineTo(hx - hLen * 0.42, s.y + 21 + hLen);
  }
  c.stroke();

  // Masonry mortar seams & vertical block joints
  c.strokeStyle = st.seamStroke;
  c.lineWidth = 1.15;
  c.beginPath();
  for (let bx = startBx; bx < s.x + s.w; bx += blockW) {
    c.moveTo(bx, s.y + 21 + wHash(bx, s.y) * 1.4);
    c.lineTo(bx + blockW, s.y + 21 + wHash(bx + blockW, s.y) * 1.4);
    c.moveTo(bx, s.y);
    c.lineTo(bx + wHash(bx, s.y + 19) * 1.5, s.y + 21);
    c.moveTo(bx + 32, s.y + 21);
    c.lineTo(bx + 32 + wHash(bx + 32, s.y + 39) * 1.5, s.y + 45);
  }
  c.stroke();

  // Deep organic rock fractures & biome mineral/molten veins
  drawRockCracks(c, s.x, s.y, s.w, s.h, st, 150);

  c.restore(); // End clip

  // Crisp hand-drawn top rim highlight (clear walkable edge vs dark atmospheric backdrop)
  c.strokeStyle = 'rgba(4, 6, 10, 0.85)';
  c.lineWidth = 4.4;
  c.beginPath();
  c.moveTo(s.x, s.y + 1);
  for (let px = firstGridX; px < s.x + s.w; px += stepX) {
    c.lineTo(px, s.y + 1 + wHash(px, s.y) * 2.4 * wf);
  }
  c.lineTo(s.x + s.w, s.y + 1);
  c.stroke();

  c.strokeStyle = st.rimStroke;
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(s.x, s.y);
  for (let px = firstGridX; px < s.x + s.w; px += stepX) {
    c.lineTo(px, s.y + wHash(px, s.y) * 2.4 * wf);
  }
  c.lineTo(s.x + s.w, s.y);
  c.stroke();

  // Exposed cliff wall ink strokes
  if ((s.x > 0 && !s.seamLeft) || (s.x + s.w < WORLD_W && !s.seamRight)) {
    c.strokeStyle = st.rimStroke;
    c.lineWidth = 1.8;
    c.beginPath();
    if (s.x > 0 && !s.seamLeft) {
      c.moveTo(s.x, s.y);
      for (let py = s.y + stepY; py < s.y + s.h; py += stepY) {
        c.lineTo(s.x + (wHash(s.x, py) * 4.5 + 1.5) * wf, py);
      }
      c.lineTo(s.x, s.y + s.h);
    }
    if (s.x + s.w < WORLD_W && !s.seamRight) {
      c.moveTo(s.x + s.w, s.y);
      for (let py = s.y + stepY; py < s.y + s.h; py += stepY) {
        c.lineTo(s.x + s.w + (wHash(s.x + s.w, py) * 4.5 - 1.5) * wf, py);
      }
      c.lineTo(s.x + s.w, s.y + s.h);
    }
    c.stroke();
  }

  // Biome-specific top surface overlay (moss, snow, filigree, molten rivets, wind erosion)
  drawTopBiomeOverlay(c, s.x, s.y, s.w, st, false);
}

/* ==================== 2. CARVED STONE PILLAR / WALL PAINTER ==================== */
function paintPillarSolid(c, s, st) {
  const stepY = 32;
  const wf = st.weathering !== undefined ? st.weathering : 1;
  const isHorizontalBeam = s.w > s.h * 2 && s.h <= 46;

  // Organic chiseled outline
  c.beginPath();
  c.moveTo(s.x, s.y);
  c.lineTo(s.x + s.w, s.y);
  for (let py = s.y + stepY; py < s.y + s.h; py += stepY) {
    c.lineTo(s.x + s.w + wHash(s.x + s.w, py) * 2.2 * wf, py);
  }
  c.lineTo(s.x + s.w, s.y + s.h);
  c.lineTo(s.x, s.y + s.h);
  for (let py = s.y + s.h - stepY; py > s.y; py -= stepY) {
    c.lineTo(s.x + wHash(s.x, py) * 2.2 * wf, py);
  }
  c.closePath();
  c.fillStyle = st.pillarFill;
  c.fill();

  // Right-side ink shadow & hatching depth
  c.save();
  c.clip();
  c.fillStyle = 'rgba(4, 6, 12, 0.34)';
  c.fillRect(s.x + s.w * 0.62, s.y, s.w * 0.42, s.h);

  // Fluting lines (vertical for columns, horizontal for lintel beams)
  c.strokeStyle = 'rgba(6, 9, 15, 0.58)';
  c.lineWidth = 1.5;
  c.beginPath();
  if (isHorizontalBeam) {
    for (let bx = s.x + 36; bx < s.x + s.w - 16; bx += 48) {
      c.moveTo(bx, s.y + 2);
      c.lineTo(bx + wHash(bx, s.y) * 2, s.y + s.h - 2);
    }
  } else {
    for (let fx = s.x + 10; fx < s.x + s.w - 6; fx += 12) {
      c.moveTo(fx, s.y + 14);
      c.lineTo(fx, s.y + s.h - 14);
    }
    // Horizontal ashlar stone joints every 52px
    for (let jy = s.y + 52; jy < s.y + s.h - 22; jy += 52) {
      c.moveTo(s.x, jy);
      c.lineTo(s.x + s.w, jy + wHash(s.x, jy) * 2);
    }
  }
  c.stroke();

  if ((st.cracks !== undefined ? st.cracks : 1) > 1.05 && s.h >= 48) {
    drawRockCracks(c, s.x, s.y, s.w, s.h, st, 120);
  }
  // Foundry / Ascent iron rivets on columns & beams
  if (st.overlay === 'molten') {
    c.fillStyle = 'rgba(245, 158, 11, 0.46)';
    for (let ry = s.y + 26; ry < s.y + s.h - 18; ry += 56) {
      c.beginPath();
      c.arc(s.x + 8, ry, 2.1, 0, Math.PI * 2);
      c.arc(s.x + s.w - 8, ry, 2.1, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();

  // Carved Capital & Plinth Mouldings (for tall columns)
  if (!isHorizontalBeam && s.h >= 56) {
    c.fillStyle = st.pillarCap;
    c.fillRect(s.x - 5, s.y, s.w + 10, 14);
    c.fillRect(s.x - 5, s.y + s.h - 14, s.w + 10, 14);
    c.strokeStyle = st.rimStroke;
    c.lineWidth = 1.6;
    c.strokeRect(s.x - 5, s.y, s.w + 10, 14);
    c.strokeRect(s.x - 5, s.y + s.h - 14, s.w + 10, 14);
  }

  // Outer chiseled ink contour (subtly softer than walkable floors so platforms lead the eye)
  c.save();
  c.globalAlpha = 0.76;
  c.strokeStyle = st.rimStroke;
  c.lineWidth = 1.65;
  c.beginPath();
  c.moveTo(s.x, s.y);
  c.lineTo(s.x + s.w, s.y);
  for (let py = s.y + stepY; py < s.y + s.h; py += stepY) {
    c.lineTo(s.x + s.w + wHash(s.x + s.w, py) * 2.2 * wf, py);
  }
  c.lineTo(s.x + s.w, s.y + s.h);
  c.lineTo(s.x, s.y + s.h);
  for (let py = s.y + s.h - stepY; py > s.y; py -= stepY) {
    c.lineTo(s.x + wHash(s.x, py) * 2.2 * wf, py);
  }
  c.closePath();
  c.stroke();
  c.restore();

  if (isHorizontalBeam) {
    drawTopBiomeOverlay(c, s.x, s.y, s.w, st, true);
  }
}

/* ==================== 3. FLOATING ORGANIC LEDGE PAINTER ==================== */
function paintPlatformSolid(c, s, st) {
  const segW = 24;
  const wf = st.weathering !== undefined ? st.weathering : 1;
  const ovDen = st.overlayDensity !== undefined ? st.overlayDensity : 1;
  const steps = Math.max(4, Math.round(s.w / segW));

  // Hand-hewn stone body with organic rocky underside
  c.beginPath();
  c.moveTo(s.x, s.y);
  for (let k = 1; k < steps; k++) {
    const px = s.x + (s.w * k) / steps;
    c.lineTo(px, s.y + wHash(px, s.y) * 1.8 * wf);
  }
  c.lineTo(s.x + s.w, s.y);
  c.lineTo(s.x + s.w - 4, s.y + s.h);
  for (let k = steps - 1; k >= 1; k--) {
    const jx = s.x + (s.w * k) / steps;
    const hVar = Math.abs(wHash(jx, s.y + s.h));
    const drop = (st.overlay === 'drip' ? (4 + hVar * 14) : (2 + hVar * 10)) * (0.25 + wf * 0.75);
    c.lineTo(jx, s.y + s.h + drop);
  }
  c.lineTo(s.x + 4, s.y + s.h);
  c.closePath();

  c.fillStyle = st.platFill;
  c.fill();

  // Clipped internal bevel highlight, joints & diagonal cross-hatching
  c.save();
  c.clip();
  c.fillStyle = 'rgba(216, 207, 184, 0.11)';
  c.fillRect(s.x, s.y - 2, s.w, 7);

  c.strokeStyle = 'rgba(6, 9, 15, 0.62)';
  c.lineWidth = 1.25;
  c.beginPath();
  for (let hx = s.x + 8; hx < s.x + s.w - 4; hx += 12) {
    c.moveTo(hx, s.y + 6);
    c.lineTo(hx - 7, s.y + s.h + 12);
  }
  c.stroke();

  c.strokeStyle = st.seamStroke;
  c.lineWidth = 1.1;
  c.beginPath();
  for (let bx = s.x + 42; bx < s.x + s.w - 18; bx += 48) {
    c.moveTo(bx, s.y);
    c.lineTo(bx + wHash(bx, s.y) * 2.5, s.y + s.h + 6);
  }
  c.stroke();
  c.restore();

  // Biome-specific underside ornaments (icicles / iron brackets / gothic corbels)
  if (st.overlay === 'snow' && ovDen > 0.04) {
    c.fillStyle = 'rgba(186, 230, 253, 0.56)';
    c.strokeStyle = 'rgba(224, 242, 254, 0.65)';
    c.lineWidth = 1.0;
    for (let ix = s.x + 14; ix < s.x + s.w - 14; ix += 28) {
      const iLen = (10 + Math.abs(wHash(ix, s.y + 3)) * 18) * (0.55 + ovDen * 0.45);
      c.beginPath();
      c.moveTo(ix - 4, s.y + s.h + 2);
      c.lineTo(ix, s.y + s.h + 2 + iLen);
      c.lineTo(ix + 4, s.y + s.h + 2);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else if (st.overlay === 'molten') {
    c.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(s.x + 14, s.y + s.h + 2); c.lineTo(s.x + 28, s.y + s.h + 14);
    c.moveTo(s.x + s.w - 14, s.y + s.h + 2); c.lineTo(s.x + s.w - 28, s.y + s.h + 14);
    c.stroke();
  } else if (st.overlay === 'filigree') {
    c.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    c.lineWidth = 1.4;
    for (let gx = s.x + 24; gx < s.x + s.w - 24; gx += 52) {
      c.beginPath();
      c.arc(gx, s.y + s.h + 3, 10, 0, Math.PI);
      c.stroke();
    }
  }

  // Crisp hand-inked walkable ledge outline (pop cleanly above background stamps)
  c.strokeStyle = 'rgba(4, 6, 11, 0.82)';
  c.lineWidth = 4.0;
  c.beginPath();
  c.moveTo(s.x, s.y + 1);
  for (let k = 1; k < steps; k++) {
    const px = s.x + (s.w * k) / steps;
    c.lineTo(px, s.y + 1 + wHash(px, s.y) * 1.8 * wf);
  }
  c.lineTo(s.x + s.w, s.y + 1);
  c.stroke();
  c.strokeStyle = st.rimStroke;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(s.x, s.y);
  for (let k = 1; k < steps; k++) {
    const px = s.x + (s.w * k) / steps;
    c.lineTo(px, s.y + wHash(px, s.y) * 1.8 * wf);
  }
  c.lineTo(s.x + s.w, s.y);
  c.lineTo(s.x + s.w - 4, s.y + s.h);
  c.moveTo(s.x, s.y);
  c.lineTo(s.x + 4, s.y + s.h);
  c.stroke();

  drawTopBiomeOverlay(c, s.x, s.y, s.w, st, true);
}

/* ==================== 1024x800 CHUNKED OFFSCREEN CACHE ==================== */
const _chunkCache = new Map();
let _cachedThemeMap = null;
let _cachedModMap = null;

export function invalidateTerrainCache() {
  _chunkCache.clear();
  _cachedThemeMap = null;
  _cachedModMap = null;
}

function getOrBakeChunk(cx, cy) {
  const key = `${cx},${cy}`;
  let entry = _chunkCache.get(key);
  if (entry !== undefined) return entry;

  const wx0 = cx * CHUNK_W;
  const wy0 = cy * CHUNK_H;
  const wx1 = wx0 + CHUNK_W;
  const wy1 = wy0 + CHUNK_H;

  // Gather solids overlapping this chunk (including overhang bleed)
  const hit = [];
  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.x + s.w + CHUNK_PAD < wx0 || s.x - CHUNK_PAD > wx1 ||
        s.y + s.h + CHUNK_PAD < wy0 || s.y - CHUNK_PAD > wy1) continue;
    hit.push(s);
  }

  if (hit.length === 0) {
    _chunkCache.set(key, null);
    return null;
  }

  if (!_cachedThemeMap) _cachedThemeMap = getRoomThemeMap();
  if (!_cachedModMap) _cachedModMap = getRoomModMap();

  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_W;
  canvas.height = CHUNK_H;
  const c = canvas.getContext('2d');

  c.save();
  c.translate(-wx0, -wy0);

  // Layer order: grounds first, then pillars, then floating platforms cleanly on top
  for (let i = 0; i < hit.length; i++) {
    if (hit[i].type === 'ground') paintGroundSolid(c, hit[i], getStyleForSolid(hit[i], _cachedThemeMap, _cachedModMap));
  }
  for (let i = 0; i < hit.length; i++) {
    if (hit[i].type === 'pillar') paintPillarSolid(c, hit[i], getStyleForSolid(hit[i], _cachedThemeMap, _cachedModMap));
  }
  for (let i = 0; i < hit.length; i++) {
    if (hit[i].type !== 'ground' && hit[i].type !== 'pillar') {
      paintPlatformSolid(c, hit[i], getStyleForSolid(hit[i], _cachedThemeMap, _cachedModMap));
    }
  }
  c.restore();

  entry = { canvas, wx: wx0, wy: wy0 };
  _chunkCache.set(key, entry);
  return entry;
}

export function prewarmTerrainChunks(viewX = 0, viewY = 0, viewW = 1280, viewH = 720) {
  const cMinX = Math.floor(viewX / CHUNK_W);
  const cMaxX = Math.floor((viewX + viewW) / CHUNK_W);
  const cMinY = Math.floor(viewY / CHUNK_H);
  const cMaxY = Math.floor((viewY + viewH) / CHUNK_H);
  for (let cy = cMinY; cy <= cMaxY; cy++) {
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      getOrBakeChunk(cx, cy);
    }
  }
}

/* ==================== LIVE RUNTIME DRAW (2-4 BLITS + LIGHTWEIGHT ANIMATED LAYER) ==================== */
export function drawWorldArchitecture() {
  const ctx = G.ctx;
  const camX = G.cam.x;
  const camY = G.cam.y;
  const camW = G.canvasW;
  const camH = G.canvasH;
  const t = G.globalTime || 0;

  // 1. Blit Cached 1024x800 Organic Terrain Chunks (2-4 drawImage calls total!)
  const cMinX = Math.floor(camX / CHUNK_W);
  const cMaxX = Math.floor((camX + camW) / CHUNK_W);
  const cMinY = Math.floor(camY / CHUNK_H);
  const cMaxY = Math.floor((camY + camH) / CHUNK_H);

  for (let cy = cMinY; cy <= cMaxY; cy++) {
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      const chunk = getOrBakeChunk(cx, cy);
      if (chunk) ctx.drawImage(chunk.canvas, chunk.wx, chunk.wy);
    }
  }

  ctx.save();

  // 2. Live Animated Swaying Grass Blades (upper FLOOR_Y slabs — 1 batched stroke)
  if (camY <= FLOOR_Y + 40 && camY + camH >= FLOOR_Y - 40) {
    ctx.strokeStyle = 'rgba(130, 154, 140, 0.44)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    let anyGrass = false;
    for (let i = 0; i < SOLIDS.length; i++) {
      const s = SOLIDS[i];
      if (s.type !== 'ground' || s.y !== FLOOR_Y) continue;
      if (s.x + s.w < camX - 40 || s.x > camX + camW + 40) continue;
      const startX = Math.max(s.x, Math.floor(camX / 64) * 64 - 64);
      const endX = Math.min(s.x + s.w, camX + camW + 64);
      for (let bx = startX; bx < endX; bx += 64) {
        const segW = Math.min(64, s.x + s.w - bx);
        if (segW >= 32 && (Math.floor(bx / 64)) % 3 === 1) {
          const sway = Math.sin(t * 2.5 + bx) * 2.6;
          ctx.moveTo(bx + 12, s.y);
          ctx.quadraticCurveTo(bx + 9 + sway, s.y - 8, bx + 6 + sway, s.y - 13);
          ctx.moveTo(bx + 14, s.y);
          ctx.quadraticCurveTo(bx + 17 + sway, s.y - 6, bx + 20 + sway, s.y - 10);
          anyGrass = true;
        }
      }
    }
    if (anyGrass) ctx.stroke();
  }

  // 3. Live Swaying Hanging Vines beneath Visible Platforms (1 batched stroke)
  ctx.strokeStyle = 'rgba(116, 146, 138, 0.44)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  let anyVine = false;
  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.type === 'ground' || s.type === 'pillar') continue;
    if (s.x + s.w < camX - 60 || s.x > camX + camW + 60 ||
        s.y + s.h + 50 < camY || s.y > camY + camH + 20) continue;
    for (let vx = s.x + 18; vx < s.x + s.w - 14; vx += 48) {
      const vLen = 18 + ((vx + i * 17) % 24);
      const vSway = Math.sin(t * 2.2 + vx * 0.05) * 5;
      ctx.moveTo(vx, s.y + s.h + 2);
      ctx.quadraticCurveTo(vx + vSway * 0.5, s.y + s.h + vLen * 0.5, vx + vSway, s.y + s.h + vLen);
      anyVine = true;
    }
  }
  if (anyVine) ctx.stroke();

  // 4. Moonlit Puddles (upper corridor floor)
  if (camY <= FLOOR_Y + 30 && camY + camH >= FLOOR_Y - 30) {
    for (let i = 0; i < PUDDLES.length; i++) {
      const p = PUDDLES[i];
      if (p.x + p.w < camX - 40 || p.x > camX + camW + 40) continue;
      ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
      ctx.fillRect(p.x + 8, FLOOR_Y - 1, Math.max(8, p.w - 16), 4);
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1;
      const rip = Math.sin(t * 3 + p.x) * 6;
      ctx.beginPath();
      ctx.moveTo(p.x + p.w * 0.25 + rip, FLOOR_Y + 1);
      ctx.lineTo(p.x + p.w * 0.55 + rip, FLOOR_Y + 1);
      ctx.stroke();
    }
  }

  const drainA = (G.worldState && G.worldState.riverDrainAnim) ? G.worldState.riverDrainAnim : 0;
  for (let i = 0; i < ABYSSAL_RIVERS.length; i++) {
    const rv = ABYSSAL_RIVERS[i];
    if (rv.w <= 0) continue;
    if (rv.x + rv.w < camX - 40 || rv.x > camX + camW + 40 ||
        rv.y + 40 < camY || rv.y - 40 > camY + camH) continue;
    const isDraining = !!(rv.drainable && drainA > 0.01);
    if (isDraining && drainA >= 0.96) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(rv.x + 10, rv.y + 12, Math.max(0, rv.w - 20), 3);
      continue;
    }
    const levelDrop = isDraining ? drainA * 12 : 0;
    const alphaScale = isDraining ? Math.max(0.15, 1 - drainA * 0.75) : 1;
    ctx.fillStyle = `rgba(12, 74, 110, ${(0.58 * alphaScale).toFixed(2)})`;
    ctx.fillRect(rv.x, rv.y + levelDrop, rv.w, Math.max(2, 16 - levelDrop));
    ctx.fillStyle = `rgba(56, 189, 248, ${(0.28 * alphaScale).toFixed(2)})`;
    ctx.fillRect(rv.x, rv.y + levelDrop, rv.w, Math.max(1, 5 - levelDrop * 0.3));
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.58)';
    ctx.lineWidth = 1.6;
    for (let rx = rv.x + 12; rx < rv.x + rv.w - 30; rx += 84) {
      const wave = Math.sin(t * 3.2 + rx * 0.03) * 8;
      ctx.beginPath();
      ctx.moveTo(rx + wave, rv.y + 3);
      ctx.lineTo(rx + 42 + wave, rv.y + 3);
      ctx.stroke();
      const bubP = ((t * 0.9 + rx * 0.017) % 1);
      const bx = rx + 20 + Math.sin(t * 4 + rx) * 6;
      const by = rv.y + 2 - bubP * 20;
      ctx.fillStyle = `rgba(125, 211, 252, ${((1 - bubP) * 0.55).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4 * (1 - bubP * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Low Creeping Theme-Tinted Ink Mist (2 fast flat alpha bands)
  const mw = Math.min(camW + 40, Math.max(0, 4140 - (camX - 20)));
  if (mw > 0 && G.themeBlend) {
    ctx.fillStyle = rgbStr(G.themeBlend.mist, 0.22);
    ctx.fillRect(camX - 20, FLOOR_Y - 46, mw, 26);
    ctx.fillStyle = rgbStr(G.themeBlend.mist, 0.48);
    ctx.fillRect(camX - 20, FLOOR_Y - 20, mw, 26);
  }

  ctx.restore();
}


/* ==================== v27.0 EDITOR WYSIWYG SKY & PROCEDURAL TERRAIN HELPERS ==================== */
export function drawEditorRoomBackdrop(c, rm) {
  const ox = rm.bounds.x;
  const oy = rm.bounds.y;
  const rw = rm.bounds.w;
  const rh = rm.bounds.h;
  const th = ROOM_THEMES[rm.theme] || ROOM_THEMES.corridor;

  c.save();
  const bg = c.createLinearGradient(ox, oy, ox, oy + rh);
  bg.addColorStop(0, rgbStr(th.skyTop));
  bg.addColorStop(0.58, rgbStr(th.skyMid));
  bg.addColorStop(1, rgbStr(th.skyBot));
  c.fillStyle = bg;
  c.fillRect(ox, oy, rw, rh);

  // Atmospheric radial accent glow matching live sky cache
  const gx = ox + rw * 0.5;
  const gy = oy + rh * 0.22;
  const rad = Math.max(rw, rh) * 0.55;
  const wash = c.createRadialGradient(gx, gy, 16, gx, gy, rad);
  wash.addColorStop(0, rgbStr(th.accent, 0.14));
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = wash;
  c.fillRect(ox, oy, rw, rh);

  // Subtle distant silhouette band along lower third for depth cues
  c.fillStyle = rgbStr(th.mist, 0.22);
  c.beginPath();
  c.moveTo(ox, oy + rh);
  for (let x = ox; x <= ox + rw; x += 64) {
    const ridge = rh * 0.68 + wHash(x, oy + 17) * 34;
    c.lineTo(Math.min(ox + rw, x), oy + ridge);
  }
  c.lineTo(ox + rw, oy + rh);
  c.closePath();
  c.fill();
  c.restore();
}

export function drawEditorRoomSolids(c, rm) {
  const ox = rm.bounds.x;
  const oy = rm.bounds.y;
  const theme = rm.theme || 'corridor';
  const roomMod = rm.terrainMod || null;
  const rawSolids = rm.solids || [];
  if (rawSolids.length === 0) return;

  // Build world-space view objects and detect flush ground seams cleanly
  const worldSolids = rawSolids.map(s => ({
    x: ox + s.x,
    y: oy + s.y,
    w: s.w,
    h: s.h,
    type: s.type || 'platform',
    mod: s.mod || null,
    seamLeft: false,
    seamRight: false
  }));

  for (let i = 0; i < worldSolids.length; i++) {
    const a = worldSolids[i];
    if (a.type !== 'ground') continue;
    for (let j = 0; j < worldSolids.length; j++) {
      if (i === j) continue;
      const b = worldSolids[j];
      if (b.type !== 'ground') continue;
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (overlapY < 16) continue;
      if (Math.abs((a.x + a.w) - b.x) <= 4) a.seamRight = true;
      if (Math.abs(a.x - (b.x + b.w)) <= 4) a.seamLeft = true;
    }
  }

  // Paint in exact runtime layer order: grounds -> pillars -> floating platforms
  for (let i = 0; i < worldSolids.length; i++) {
    const ws = worldSolids[i];
    if (ws.type === 'ground') paintGroundSolid(c, ws, resolveTerrainStyle(theme, roomMod, ws.mod));
  }
  for (let i = 0; i < worldSolids.length; i++) {
    const ws = worldSolids[i];
    if (ws.type === 'pillar') paintPillarSolid(c, ws, resolveTerrainStyle(theme, roomMod, ws.mod));
  }
  for (let i = 0; i < worldSolids.length; i++) {
    const ws = worldSolids[i];
    if (ws.type !== 'ground' && ws.type !== 'pillar') {
      paintPlatformSolid(c, ws, resolveTerrainStyle(theme, roomMod, ws.mod));
    }
  }
}
