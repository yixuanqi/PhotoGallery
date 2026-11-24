// Offscreen Lazy-Baked Static Backdrop Architecture Cache (v32.0 144Hz World Pass Accelerator)
// Pre-bakes unchanging multi-path architectural silhouettes (Sanctuary Arch, Gothic Lancet Windows,
// Chapel Collapsed Nave & Tilted Bell, Foundry Chimneys & Crucible, Heart Sword Field, r09 Grates,
// r15 Bell-Tree Hollow & Weathered Graves/Cairns) so live render() only blits cached bitmaps + animated FX.
import { COLORS, ALTAR_POS, FLOOR_Y, WELL_BOTTOM_Y } from '../config.js';
import { drawGlowSprite } from '../vfx.js';

const _panels = new Map();
const _stats = { hits: 0, misses: 0 };

export function invalidateBackdropCache() {
  _panels.clear();
}

export function getBackdropCacheStats() {
  return {
    panels: _panels.size,
    hits: _stats.hits,
    misses: _stats.misses
  };
}

const _PANEL_BAKE_SCALE = (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 1.5) ? 2 : 1;

function getOrBakePanel(key, w, h, paintFn) {
  let canvas = _panels.get(key);
  if (canvas) {
    _stats.hits++;
    return canvas;
  }
  _stats.misses++;
  const logW = Math.ceil(w);
  const logH = Math.ceil(h);
  const sc = (logW * logH > 720000) ? Math.min(1.5, _PANEL_BAKE_SCALE) : _PANEL_BAKE_SCALE;
  canvas = document.createElement('canvas');
  canvas.width = Math.ceil(logW * sc);
  canvas.height = Math.ceil(logH * sc);
  canvas._logW = logW;
  canvas._logH = logH;
  const c = canvas.getContext('2d');
  if (sc !== 1) c.scale(sc, sc);
  paintFn(c, logW, logH);
  _panels.set(key, canvas);
  return canvas;
}

// A. Sanctuary Arch Canopy behind Extinguished Altar
export function getSanctuaryArchSprite() {
  const w = 220;
  const h = 420;
  return getOrBakePanel('sanctuary_arch', w, h, (c) => {
    const ax = 110;
    const fy = h - 8;
    c.fillStyle = '#0e1420';
    c.strokeStyle = 'rgba(216, 207, 184, 0.24)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ax - 95, fy);
    c.lineTo(ax - 95, fy - (FLOOR_Y - 295));
    c.quadraticCurveTo(ax, fy - (FLOOR_Y - 180), ax + 95, fy - (FLOOR_Y - 295));
    c.lineTo(ax + 95, fy);
    c.lineTo(ax + 70, fy);
    c.lineTo(ax + 70, fy - (FLOOR_Y - 315));
    c.quadraticCurveTo(ax, fy - (FLOOR_Y - 220), ax - 70, fy - (FLOOR_Y - 315));
    c.lineTo(ax - 70, fy);
    c.closePath();
    c.fill();
    c.stroke();
  });
}

// B. Reusable Gothic Lancet Window + Angled Moonbeam (blitted 6x per corridor!)
export function getLancetWindowSprite() {
  const w = 210; // spans wx - 130 .. wx + 80
  const h = 460; // spans 130 .. FLOOR_Y + 10
  return getOrBakePanel('gothic_lancet', w, h, (c) => {
    const ox = 130;
    const oy = 130;
    c.save();
    c.translate(ox, -oy);
    c.fillStyle = 'rgba(26, 38, 58, 0.34)';
    c.strokeStyle = 'rgba(216, 207, 184, 0.20)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-44, FLOOR_Y - 90);
    c.lineTo(-44, 240);
    c.quadraticCurveTo(0, 138, 44, 240);
    c.lineTo(44, FLOOR_Y - 90);
    c.closePath();
    c.fill();
    c.stroke();

    c.strokeStyle = 'rgba(216, 207, 184, 0.13)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, 180); c.lineTo(0, FLOOR_Y - 90);
    c.moveTo(-44, 320); c.lineTo(44, 320);
    c.moveTo(-44, 405); c.lineTo(44, 405);
    c.stroke();

    c.fillStyle = 'rgba(180, 215, 240, 0.032)';
    c.beginPath();
    c.moveTo(-36, 230);
    c.lineTo(36, 230);
    c.lineTo(-35, FLOOR_Y);
    c.lineTo(-120, FLOOR_Y);
    c.closePath();
    c.fill();
    c.restore();
  });
}

// C. Arena 1 (r03_chapel) Static Shattered Nave Windows, Roof Beams, Tilted Half-Buried Bell & Grates
export function getChapelStaticBackdrop(isP2) {
  const key = isP2 ? 'chapel_static_p2' : 'chapel_static_p1';
  const ox = 2640;
  const w = 1150;
  const h = FLOOR_Y + 26;
  return getOrBakePanel(key, w, h, (c) => {
    c.save();
    c.translate(-ox, 0);

    const lancets = [
      { x: 2955, topY: 120, w: 72 },
      { x: 3205, topY: 62,  w: 96 },
      { x: 3455, topY: 132, w: 72 }
    ];
    for (let li = 0; li < lancets.length; li++) {
      const lw = lancets[li];
      const hw = lw.w * 0.5;
      c.fillStyle = isP2 ? 'rgba(220, 38, 38, 0.045)' : 'rgba(180, 215, 240, 0.042)';
      c.beginPath();
      c.moveTo(lw.x - hw + 8, lw.topY + 40);
      c.lineTo(lw.x + hw - 8, lw.topY + 40);
      c.lineTo(lw.x - 42, FLOOR_Y);
      c.lineTo(lw.x - 122, FLOOR_Y);
      c.closePath();
      c.fill();

      c.fillStyle = isP2 ? 'rgba(34, 10, 16, 0.72)' : 'rgba(10, 16, 28, 0.72)';
      c.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.28)' : 'rgba(216, 207, 184, 0.24)';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(lw.x - hw, FLOOR_Y - 110);
      c.lineTo(lw.x - hw, lw.topY + 64);
      c.quadraticCurveTo(lw.x, lw.topY - 12, lw.x + hw, lw.topY + 64);
      c.lineTo(lw.x + hw, FLOOR_Y - 110);
      c.closePath();
      c.fill();
      c.stroke();

      c.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.16)' : 'rgba(186, 230, 253, 0.15)';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(lw.x, lw.topY + 26); c.lineTo(lw.x, FLOOR_Y - 112);
      c.moveTo(lw.x - hw + 4, lw.topY + 135); c.lineTo(lw.x + hw - 4, lw.topY + 135);
      c.moveTo(lw.x - hw + 4, lw.topY + 230); c.lineTo(lw.x + hw - 4, lw.topY + 230);
      c.stroke();
    }

    // Collapsed Roof Beams
    c.fillStyle = '#0d1018';
    c.strokeStyle = 'rgba(216, 207, 184, 0.20)';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(2645, 0); c.lineTo(2910, 0); c.lineTo(2865, 62); c.lineTo(2780, 44); c.lineTo(2645, 92);
    c.closePath(); c.fill(); c.stroke();
    c.beginPath();
    c.moveTo(3780, 0); c.lineTo(3495, 0); c.lineTo(3545, 70); c.lineTo(3640, 48); c.lineTo(3780, 96);
    c.closePath(); c.fill(); c.stroke();

    // Half-Buried Tilted Shattered Bell-Remnant
    c.save();
    c.translate(3210, FLOOR_Y + 4);
    c.rotate(-0.46);
    c.fillStyle = '#181414';
    c.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.45)' : 'rgba(216, 207, 184, 0.32)';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-92, 14);
    c.quadraticCurveTo(-78, -62, -34, -108);
    c.lineTo(22, -104);
    c.lineTo(36, -68);
    c.lineTo(68, -42);
    c.lineTo(84, 16);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = isP2 ? COLORS.crimsonBright : 'rgba(245, 158, 11, 0.46)';
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(-18, -92); c.lineTo(-4, -52); c.lineTo(22, -26); c.lineTo(12, 8);
    c.stroke();
    c.restore();

    // Floor Drainage Grates
    c.fillStyle = isP2 ? 'rgba(185, 28, 28, 0.45)' : 'rgba(15, 23, 38, 0.78)';
    for (let gx = 2820; gx <= 3580; gx += 190) {
      c.fillRect(gx - 28, FLOOR_Y - 5, 56, 6);
    }
    c.restore();
  });
}

// D. Arena 2 (r05_foundry) Static Blast-Furnace Chimneys, Crucible Cauldron & Slag Trough
export function getFoundryStaticBackdrop(isJiP2) {
  const key = isJiP2 ? 'foundry_static_p2' : 'foundry_static_p1';
  const fx = 6150;
  const ox = fx - 275;
  const oy = 815;
  const w = 550;
  const h = WELL_BOTTOM_Y - oy + 12;
  return getOrBakePanel(key, w, h, (c) => {
    c.save();
    c.translate(-ox, -oy);
    c.fillStyle = '#120c0a';
    c.strokeStyle = isJiP2 ? 'rgba(245, 158, 11, 0.42)' : 'rgba(216, 207, 184, 0.20)';
    c.lineWidth = 2.0;
    c.fillRect(fx - 265, 820, 58, WELL_BOTTOM_Y - 820);
    c.strokeRect(fx - 265, 820, 58, WELL_BOTTOM_Y - 820);
    c.fillRect(fx + 207, 820, 58, WELL_BOTTOM_Y - 820);
    c.strokeRect(fx + 207, 820, 58, WELL_BOTTOM_Y - 820);

    c.fillStyle = '#1c120d';
    c.beginPath();
    c.moveTo(fx - 76, 860); c.lineTo(fx + 76, 860);
    c.lineTo(fx + 54, 944); c.lineTo(fx - 54, 944);
    c.closePath(); c.fill(); c.stroke();

    c.fillStyle = isJiP2 ? 'rgba(251, 146, 60, 0.46)' : 'rgba(245, 158, 11, 0.28)';
    c.fillRect(fx - 175, WELL_BOTTOM_Y - 9, 350, 9);
    c.restore();
  });
}

// E. r15_woods_heart Colossal Ancient Bell-Tree Hollow & Moss-Swallowed Bell
export function getWoodsTreeHollowSprite() {
  const w = 540;
  const h = 520;
  return getOrBakePanel('woods_bell_tree_hollow', w, h, (c) => {
    const tx = 270;
    const ty = h - 10;
    c.strokeStyle = 'rgba(20, 56, 44, 0.88)';
    c.lineWidth = 22;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(tx - 240, ty); c.quadraticCurveTo(tx - 170, ty - 280, tx - 60, ty - 480);
    c.moveTo(tx + 240, ty); c.quadraticCurveTo(tx + 170, ty - 280, tx + 60, ty - 480);
    c.stroke();

    c.save();
    c.translate(tx, ty - 180);
    c.rotate(0.18);
    c.fillStyle = '#14211b';
    c.strokeStyle = 'rgba(110, 231, 183, 0.45)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-42, -96); c.lineTo(42, -96);
    c.quadraticCurveTo(88, 0, 108, 76);
    c.lineTo(-108, 76);
    c.quadraticCurveTo(-88, 0, -42, -96);
    c.closePath();
    c.fill(); c.stroke();
    c.strokeStyle = 'rgba(74, 222, 128, 0.52)';
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(-102, 55); c.quadraticCurveTo(-8, 10, 82, -26);
    c.moveTo(96, 60);   c.quadraticCurveTo(12, -22, -58, -68);
    c.stroke();
    c.restore();
  });
}

// F. r09_wind_spire Foundry Thermal Exhaust Iron Grates (cached per foundryCooled state)
export function getWindVentGratesSprite(foundryCooled) {
  const key = foundryCooled ? 'wind_vents_cooled' : 'wind_vents_hot';
  const ox = 5825;
  const w = 635;
  const h = 28;
  return getOrBakePanel(key, w, h, (c) => {
    const vents = [
      { x: 5835 - ox, w: 155 },
      { x: 6280 - ox, w: 165 }
    ];
    c.fillStyle = foundryCooled ? '#121a24' : '#1f150f';
    c.strokeStyle = foundryCooled ? 'rgba(125, 211, 252, 0.45)' : 'rgba(245, 158, 11, 0.52)';
    c.lineWidth = 2.0;
    for (let vi = 0; vi < vents.length; vi++) {
      const vt = vents[vi];
      c.fillRect(vt.x, 8, vt.w, 12);
      c.strokeRect(vt.x, 8, vt.w, 12);
      c.beginPath();
      for (let gx = vt.x + 18; gx < vt.x + vt.w - 8; gx += 18) {
        c.moveTo(gx, 8); c.lineTo(gx, 20);
      }
      c.stroke();
    }
  });
}

// G. Boss 4 Mirror Water Vertical Gradient Strip (replaces per-frame createLinearGradient!)
export function getBoss4MirrorGradientStrip() {
  return getOrBakePanel('boss4_mirror_grad', 4, 96, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, 'rgba(10, 15, 26, 0.86)');
    grad.addColorStop(0.35, 'rgba(6, 9, 16, 0.72)');
    grad.addColorStop(1, 'rgba(4, 6, 12, 0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 4, 96);
  });
}

// H. Pre-baked Static Tombstone & Bone Cairn Sprites (reused across corridor)
export function getGraveSprite(variantIdx) {
  const v = variantIdx % 6;
  return getOrBakePanel(`grave_v${v}`, 34, 90, (c) => {
    const h = 38 + (v % 3) * 16;
    c.save();
    c.translate(17, 86);
    c.rotate((v % 2 === 0 ? 1 : -1) * 0.08);
    c.fillStyle = '#151c29';
    c.strokeStyle = 'rgba(216, 207, 184, 0.34)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-9, 0);
    c.lineTo(-8, -h + 8);
    c.quadraticCurveTo(0, -h - 4, 8, -h + 8);
    c.lineTo(9, 0);
    c.closePath();
    c.fill();
    c.stroke();
    if (v % 2 === 0) {
      c.beginPath();
      c.moveTo(0, -h + 12); c.lineTo(0, -h + 26);
      c.moveTo(-5, -h + 17); c.lineTo(5, -h + 17);
      c.stroke();
    }
    c.restore();
  });
}

export function getBoneCairnSprite() {
  return getOrBakePanel('bone_cairn', 34, 24, (c) => {
    const cx = 17;
    const fy = 22;
    c.fillStyle = '#202634';
    c.strokeStyle = 'rgba(216, 207, 184, 0.38)';
    c.lineWidth = 1.2;
    for (let k = -1; k <= 1; k++) {
      c.beginPath();
      c.arc(cx + k * 7, fy - 5 - (k === 0 ? 4 : 0), 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#090c12';
    c.fillRect(cx - 2.5, fy - 10, 2, 2);
    c.fillRect(cx + 1, fy - 10, 2, 2);
  });
}
