// Biome-Specific 3-Layer Procedural Parallax, Pre-Baked Sky Cache & Foreground Silhouettes
// Pure Canvas 2D, 0 external PNGs, offscreen tile-strip caching for zero-churn 144Hz rendering.
import { G } from './state.js';
import { drawGlowSprite, boilCircle } from './vfx.js';

export function rgbStr(arr, alpha = 1) {
  const r = Math.round(arr[0]);
  const g = Math.round(arr[1]);
  const b = Math.round(arr[2]);
  return alpha >= 0.999 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// 1. Pre-Baked Sky + Atmospheric Wash Cache (160x96 -> 1 fast blit)
const _skyBuf = document.createElement('canvas');
_skyBuf.width = 160;
_skyBuf.height = 96;
const _skyCtx = _skyBuf.getContext('2d');
let _skyCacheKey = '';

function getCachedSkyCanvas(tb, isPhase2) {
  const key = `${Math.round(tb.skyTop[0] / 2)},${Math.round(tb.skyTop[1] / 2)},${Math.round(tb.skyTop[2] / 2)}|${Math.round(tb.skyMid[0] / 2)},${Math.round(tb.skyMid[1] / 2)},${Math.round(tb.skyMid[2] / 2)}|${Math.round(tb.accent[0] / 2)},${Math.round(tb.accent[1] / 2)},${Math.round(tb.accent[2] / 2)}|${isPhase2 ? 1 : 0}`;
  if (key !== _skyCacheKey) {
    _skyCacheKey = key;
    const w = _skyBuf.width;
    const h = _skyBuf.height;
    const bg = _skyCtx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, rgbStr(tb.skyTop));
    bg.addColorStop(0.55, rgbStr(tb.skyMid));
    bg.addColorStop(1, rgbStr(tb.skyBot));
    _skyCtx.fillStyle = bg;
    _skyCtx.fillRect(0, 0, w, h);

    const wash = _skyCtx.createRadialGradient(w * 0.5, h * 0.18, 4, w * 0.5, h * 0.4, w * 0.65);
    wash.addColorStop(0, rgbStr(tb.accent, isPhase2 ? 0.14 : 0.08));
    wash.addColorStop(1, 'transparent');
    _skyCtx.fillStyle = wash;
    _skyCtx.fillRect(0, 0, w, h);
  }
  return _skyBuf;
}

// 2. Biome Vista Archetype Mapping (supports all 8 current rooms + upcoming wind/forest/mountain biomes)
function getVistaKey(theme) {
  if (theme === 'chapel') return 'chapel';
  if (theme === 'heart') return 'heart';
  if (theme === 'bell_well' || theme === 'crypt') return 'abyss';
  if (theme === 'foundry' || theme === 'ascent') return 'foundry';
  if (theme === 'wind') return 'wind';
  if (theme === 'forest') return 'forest';
  if (theme === 'mountain') return 'mountain';
  return 'cloister'; // sanctuary, corridor
}

const TILE_W = 768;
const TILE_H = 460;
const _vistaCache = new Map();

function makeTile() {
  const c = document.createElement('canvas');
  c.width = TILE_W;
  c.height = TILE_H;
  return { canvas: c, ctx: c.getContext('2d') };
}

function buildVistaTiles(vistaKey) {
  let cached = _vistaCache.get(vistaKey);
  if (cached) return cached;

  const far = makeTile();
  const mid = makeTile();
  const fc = far.ctx;
  const mc = mid.ctx;

  if (vistaKey === 'cloister') {
    // FAR: Ruined Gothic Belfry Towers, Broken Flying Buttresses & Misty Skyline (no crude polygon bell)
    fc.fillStyle = 'rgba(10, 15, 25, 0.88)';
    for (let i = 0; i < 4; i++) {
      const bx = i * 192 + 24;
      const topY = 96 + (i % 3) * 42;
      fc.beginPath();
      fc.moveTo(bx, TILE_H);
      fc.lineTo(bx + 16, topY);
      fc.lineTo(bx + 34, topY + 26);
      fc.lineTo(bx + 44, TILE_H);
      fc.closePath();
      fc.fill();
      // Broken flying buttress arch
      fc.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      fc.lineWidth = 2.0;
      fc.beginPath();
      fc.moveTo(bx + 36, topY + 86);
      fc.quadraticCurveTo(bx + 96, topY + 42, bx + 138, topY + 132);
      fc.stroke();
    }
    // Distant broken central watch-belfry silhouette
    const tx = 432;
    fc.fillStyle = 'rgba(8, 13, 22, 0.94)';
    fc.strokeStyle = 'rgba(216, 207, 184, 0.13)';
    fc.lineWidth = 1.6;
    fc.beginPath();
    fc.moveTo(tx - 54, TILE_H);
    fc.lineTo(tx - 46, 118);
    fc.lineTo(tx - 18, 84);
    fc.lineTo(tx - 2, 108);
    fc.lineTo(tx + 24, 62);
    fc.lineTo(tx + 48, 126);
    fc.lineTo(tx + 56, TILE_H);
    fc.closePath();
    fc.fill();
    fc.stroke();
    // Glowing narrow belfry slit window
    fc.fillStyle = 'rgba(56, 189, 248, 0.14)';
    fc.fillRect(tx - 6, 142, 12, 58);

    // MID: Ruined Gothic Colonnade Arches & Hanging Bell-Cords
    mc.fillStyle = 'rgba(13, 19, 32, 0.85)';
    mc.strokeStyle = 'rgba(216, 207, 184, 0.10)';
    mc.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const ax = i * 256;
      mc.fillRect(ax, 92, 28, TILE_H);
      mc.beginPath();
      mc.moveTo(ax + 28, 178);
      mc.quadraticCurveTo(ax + 128, 62, ax + 256, 178);
      mc.stroke();
      mc.strokeStyle = 'rgba(216, 207, 184, 0.08)';
      mc.beginPath();
      mc.moveTo(ax + 128, 118);
      mc.lineTo(ax + 128 + (i % 2 === 0 ? 5 : -4), 268);
      mc.stroke();
      mc.strokeStyle = 'rgba(216, 207, 184, 0.10)';
    }
  } else if (vistaKey === 'chapel') {
    // FAR: Rain-Lashed Collapsed Cathedral Nave & Shattered Tall Lancet Windows
    fc.fillStyle = 'rgba(16, 10, 15, 0.86)';
    for (let i = 0; i < 3; i++) {
      const wx = i * 256 + 64;
      // Slanted pale rainlight beam cutting through broken nave roof
      fc.fillStyle = 'rgba(180, 210, 235, 0.045)';
      fc.beginPath();
      fc.moveTo(wx + 24, 0); fc.lineTo(wx + 128, 0);
      fc.lineTo(wx + 32, TILE_H); fc.lineTo(wx - 64, TILE_H);
      fc.closePath();
      fc.fill();
      // Broken pointed lancet window frame
      fc.strokeStyle = 'rgba(216, 207, 184, 0.13)';
      fc.lineWidth = 2.0;
      fc.beginPath();
      fc.moveTo(wx, TILE_H); fc.lineTo(wx, 148);
      fc.quadraticCurveTo(wx + 48, 38, wx + 96, 148);
      fc.lineTo(wx + 96, TILE_H);
      fc.stroke();
      fc.strokeStyle = 'rgba(248, 113, 113, 0.10)';
      fc.lineWidth = 1.2;
      fc.beginPath();
      fc.moveTo(wx + 48, 86); fc.lineTo(wx + 48, TILE_H);
      fc.stroke();
    }
    // MID: Half-Collapsed Vault Ribs & Leaning Cracked Chapel Piers
    mc.fillStyle = 'rgba(20, 11, 17, 0.86)';
    mc.strokeStyle = 'rgba(216, 207, 184, 0.11)';
    mc.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      const px = i * 256 + 10;
      mc.beginPath();
      mc.moveTo(px, TILE_H);
      mc.lineTo(px + 6, 40 + (i % 2) * 34);
      mc.lineTo(px + 34, 18 + (i % 2) * 24);
      mc.lineTo(px + 42, TILE_H);
      mc.closePath();
      mc.fill();
      mc.stroke();
      // Broken vault rib snapping halfway across the ceiling
      mc.beginPath();
      mc.moveTo(px + 36, 112);
      mc.quadraticCurveTo(px + 106, 48, px + 148, 66);
      mc.stroke();
    }
  } else if (vistaKey === 'heart') {
    // FAR: Open Shattered-Dome Abyssal Sky, Inverted Cloud-Sea & Celestial Orbit Arcs
    fc.strokeStyle = 'rgba(253, 224, 71, 0.10)';
    fc.lineWidth = 1.4;
    fc.beginPath(); fc.arc(TILE_W * 0.5, 190, 210, Math.PI * 1.05, Math.PI * 1.95); fc.stroke();
    fc.strokeStyle = 'rgba(192, 132, 252, 0.10)';
    fc.beginPath(); fc.arc(TILE_W * 0.5, 190, 152, Math.PI * 0.12, Math.PI * 0.88); fc.stroke();
    // Distant inverted storm cloud strata
    fc.fillStyle = 'rgba(22, 12, 24, 0.72)';
    fc.beginPath();
    fc.moveTo(0, TILE_H);
    for (let x = 0; x <= TILE_W; x += 64) {
      fc.lineTo(x, 315 + Math.sin(x * 0.018) * 28 + Math.cos(x * 0.042) * 14);
    }
    fc.lineTo(TILE_W, TILE_H);
    fc.closePath();
    fc.fill();
    // Levitating shattered dome monolith shards suspended in upper sky
    fc.fillStyle = 'rgba(18, 12, 24, 0.90)';
    fc.strokeStyle = 'rgba(253, 224, 71, 0.16)';
    fc.lineWidth = 1.2;
    const shards = [
      [110, 92, 26, 54], [250, 58, 18, 38], [520, 72, 28, 46], [658, 108, 22, 42]
    ];
    for (const [sx, sy, sw, sh] of shards) {
      fc.beginPath();
      fc.moveTo(sx, sy); fc.lineTo(sx + sw, sy + 10); fc.lineTo(sx + sw * 0.7, sy + sh); fc.lineTo(sx - 6, sy + sh * 0.72);
      fc.closePath(); fc.fill(); fc.stroke();
    }

    // MID: Ruined Sky-Terrace Ridge & Silhouetted Field of Ancient Oath-Swords
    mc.fillStyle = 'rgba(16, 10, 20, 0.86)';
    mc.beginPath();
    mc.moveTo(0, TILE_H);
    mc.lineTo(0, 352);
    mc.lineTo(180, 336);
    mc.lineTo(390, 360);
    mc.lineTo(590, 332);
    mc.lineTo(TILE_W, 354);
    mc.lineTo(TILE_W, TILE_H);
    mc.closePath();
    mc.fill();
    mc.strokeStyle = 'rgba(245, 158, 11, 0.16)';
    mc.lineWidth = 2.0;
    for (let i = 0; i < 9; i++) {
      const swx = 42 + i * 82;
      const tilt = ((i % 3) - 1) * 9;
      mc.beginPath();
      mc.moveTo(swx, 354);
      mc.lineTo(swx + tilt, 272 + (i % 2) * 18);
      mc.moveTo(swx + tilt - 9, 294 + (i % 2) * 18);
      mc.lineTo(swx + tilt + 9, 292 + (i % 2) * 18);
      mc.stroke();
    }
  } else if (vistaKey === 'abyss') {
    // FAR: Subterranean Cavern Monoliths & Sunken Aqueducts
    fc.fillStyle = 'rgba(6, 16, 26, 0.86)';
    for (let i = 0; i < 5; i++) {
      const sx = i * 160 + 18;
      // Stalactite from ceiling
      fc.beginPath();
      fc.moveTo(sx - 28, 0);
      fc.lineTo(sx, 110 + (i % 3) * 44);
      fc.lineTo(sx + 34, 0);
      fc.closePath();
      fc.fill();
      // Stalagmite from abyss floor
      fc.beginPath();
      fc.moveTo(sx - 34, TILE_H);
      fc.lineTo(sx + 6, TILE_H - 135 - ((i + 1) % 3) * 38);
      fc.lineTo(sx + 44, TILE_H);
      fc.closePath();
      fc.fill();
    }
    // Distant misty subterranean waterfall streaks
    fc.fillStyle = 'rgba(56, 189, 248, 0.05)';
    fc.fillRect(190, 0, 28, TILE_H);
    fc.fillRect(540, 0, 42, TILE_H);

    // MID: Giant Sunken Well Masonry Pillars & Dripping Arches
    mc.fillStyle = 'rgba(8, 22, 34, 0.86)';
    mc.strokeStyle = 'rgba(125, 211, 252, 0.13)';
    mc.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const ax = i * 384;
      mc.fillRect(ax, 0, 44, TILE_H);
      mc.beginPath();
      mc.moveTo(ax + 44, 145);
      mc.quadraticCurveTo(ax + 192, 42, ax + 384, 145);
      mc.stroke();
    }
  } else if (vistaKey === 'foundry') {
    // FAR: Distant Interlocking Shadow Gears & Furnace Vents
    fc.fillStyle = 'rgba(24, 12, 9, 0.86)';
    fc.strokeStyle = 'rgba(245, 158, 11, 0.14)';
    fc.lineWidth = 2.0;
    const drawShadowGear = (gx, gy, r, teeth) => {
      fc.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2 / teeth) * 0.45;
        const x1 = gx + Math.cos(a0) * r;
        const y1 = gy + Math.sin(a0) * r;
        const x2 = gx + Math.cos(a1) * (r + 14);
        const y2 = gy + Math.sin(a1) * (r + 14);
        if (i === 0) fc.moveTo(x1, y1); else fc.lineTo(x1, y1);
        fc.lineTo(x2, y2);
      }
      fc.closePath();
      fc.fill();
      fc.stroke();
    };
    drawShadowGear(185, 225, 86, 12);
    drawShadowGear(362, 160, 62, 10);
    drawShadowGear(610, 255, 96, 14);

    // MID: Heavy Suspended Anchor Chains & Furnace Flues
    mc.fillStyle = 'rgba(28, 14, 10, 0.88)';
    mc.strokeStyle = 'rgba(245, 158, 11, 0.16)';
    mc.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const cx = i * 256 + 64;
      mc.fillRect(cx - 14, 0, 28, TILE_H);
      // Heavy vertical chain links next to flue
      const lx = cx + 82;
      for (let y = 12; y < TILE_H; y += 22) {
        mc.beginPath();
        mc.ellipse(lx, y, 6, 12, 0, 0, Math.PI * 2);
        mc.stroke();
      }
    }
  } else if (vistaKey === 'wind') {
    // FAR: Sweeping Ink Cloud Strata & Sky-Piercing Broken Bell Towers
    fc.fillStyle = 'rgba(12, 22, 34, 0.82)';
    for (let i = 0; i < 4; i++) {
      const tx = i * 192 + 54;
      const th = 140 + (i % 3) * 58;
      fc.fillRect(tx - 16, TILE_H - th, 32, th);
      fc.beginPath();
      fc.moveTo(tx - 24, TILE_H - th);
      fc.lineTo(tx, TILE_H - th - 58);
      fc.lineTo(tx + 24, TILE_H - th);
      fc.closePath();
      fc.fill();
    }
    // Layered wind cloud banks
    fc.fillStyle = 'rgba(186, 230, 253, 0.06)';
    for (let i = 0; i < 5; i++) {
      fc.beginPath();
      fc.ellipse(i * 175 + 40, 260 + (i % 2) * 45, 130, 22, -0.06, 0, Math.PI * 2);
      fc.fill();
    }
    // MID: High Wind-Swept Arch Spans
    mc.strokeStyle = 'rgba(186, 230, 253, 0.14)';
    mc.fillStyle = 'rgba(10, 18, 30, 0.84)';
    mc.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const ax = i * 384 + 32;
      mc.fillRect(ax, 120, 24, TILE_H);
      mc.beginPath();
      mc.moveTo(ax + 24, 185);
      mc.quadraticCurveTo(ax + 192, 95, ax + 384, 185);
      mc.stroke();
    }
  } else if (vistaKey === 'forest') {
    // FAR: Multi-Depth Ancient Tree-Trunk Silhouettes & Moonbeam Shafts
    fc.fillStyle = 'rgba(8, 18, 22, 0.86)';
    for (let i = 0; i < 6; i++) {
      const tx = i * 128 + 26;
      const tw = 22 + (i % 3) * 10;
      fc.fillRect(tx, 0, tw, TILE_H);
    }
    fc.fillStyle = 'rgba(167, 243, 208, 0.045)';
    for (let i = 0; i < 3; i++) {
      const sx = i * 260 + 80;
      fc.beginPath();
      fc.moveTo(sx, 0); fc.lineTo(sx + 68, 0);
      fc.lineTo(sx - 45, TILE_H); fc.lineTo(sx - 115, TILE_H);
      fc.closePath();
      fc.fill();
    }
    // MID: Closer Gnarled Trunks & Overhead Canopy Vines
    mc.fillStyle = 'rgba(7, 14, 19, 0.90)';
    mc.strokeStyle = 'rgba(94, 152, 136, 0.14)';
    mc.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const tx = i * 256 + 44;
      mc.beginPath();
      mc.moveTo(tx - 24, TILE_H);
      mc.quadraticCurveTo(tx - 10, TILE_H * 0.5, tx - 16, 0);
      mc.lineTo(tx + 24, 0);
      mc.quadraticCurveTo(tx + 14, TILE_H * 0.5, tx + 32, TILE_H);
      mc.closePath();
      mc.fill();
      mc.stroke();
    }
  } else {
    // MOUNTAIN: Jagged Ink-Wash Snow Peaks & Colossal Weathered Statue Silhouettes
    fc.fillStyle = 'rgba(12, 18, 30, 0.88)';
    fc.beginPath();
    fc.moveTo(0, TILE_H);
    fc.lineTo(110, 145); fc.lineTo(220, 235);
    fc.lineTo(395, 76);  fc.lineTo(545, 220);
    fc.lineTo(660, 128); fc.lineTo(TILE_W, 210);
    fc.lineTo(TILE_W, TILE_H);
    fc.closePath();
    fc.fill();
    // Pale snow ridge highlights
    fc.strokeStyle = 'rgba(224, 242, 254, 0.20)';
    fc.lineWidth = 2.0;
    fc.beginPath();
    fc.moveTo(110, 145); fc.lineTo(154, 182);
    fc.moveTo(395, 76);  fc.lineTo(458, 136);
    fc.moveTo(660, 128); fc.lineTo(708, 162);
    fc.stroke();

    // MID: Closer Jagged Ridge & Distant Broken Monoliths
    mc.fillStyle = 'rgba(9, 14, 24, 0.90)';
    mc.beginPath();
    mc.moveTo(0, TILE_H);
    mc.lineTo(180, 215); mc.lineTo(310, 280);
    mc.lineTo(480, 180); mc.lineTo(TILE_W, 265);
    mc.lineTo(TILE_W, TILE_H);
    mc.closePath();
    mc.fill();
  }

  cached = { far: far.canvas, mid: mid.canvas };
  _vistaCache.set(vistaKey, cached);
  return cached;
}

function drawTiledParallaxStrip(ctx, tileCanvas, scrollX, scrollY, viewW, viewH, alpha) {
  if (alpha <= 0.01) return;
  const startX = ((scrollX % TILE_W) + TILE_W) % TILE_W - TILE_W;
  const drawY = Math.max(-60, viewH - TILE_H + scrollY);
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * alpha;
  for (let x = startX; x < viewW + TILE_W; x += TILE_W) {
    ctx.drawImage(tileCanvas, x, drawY);
  }
  ctx.globalAlpha = prevA;
}

// Smooth crossfade tracker between biomes so room transitions never pop
let _curVista = 'cloister';
let _prevVista = null;
let _vistaFade = 1;
let _lastVistaTime = 0;

export function drawParallaxBackground(isPhase2) {
  const tb = G.themeBlend;
  const ctx = G.ctx;
  const cw = G.canvasW;
  const ch = G.canvasH;
  const depthPct = Math.max(0, Math.min(1, (G.cam.y - 140) / 560));

  // 1. Pre-baked Sky + Radial Wash
  ctx.drawImage(getCachedSkyCanvas(tb, isPhase2), 0, 0, cw, ch);

  // 2. Pale Cold Moon (fades cleanly when descending deep underground)
  const moonX = cw * 0.72 - G.cam.x * 0.035;
  const moonY = ch * 0.22 - G.cam.y * 0.16;
  if (depthPct < 0.9) {
    const aMoon = 1 - depthPct;
    drawGlowSprite(isPhase2 ? 'crimson' : 'cyan', moonX, moonY, 150, (isPhase2 ? 0.30 : 0.22) * aMoon);
    ctx.globalAlpha = aMoon;
    ctx.fillStyle = isPhase2 ? 'rgba(248, 113, 113, 0.48)' : 'rgba(226, 220, 202, 0.42)';
    boilCircle(ctx, moonX, moonY, 34, 90, 0.8, 16);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 3. Smooth Biome Vista Crossfade
  const targetVista = getVistaKey(tb ? tb.activeTheme : 'sanctuary');
  const nowT = G.globalTime || 0;
  const dt = Math.max(0, Math.min(0.1, nowT - _lastVistaTime));
  _lastVistaTime = nowT;

  if (targetVista !== _curVista) {
    _prevVista = _curVista;
    _curVista = targetVista;
    _vistaFade = 0;
  }
  if (_vistaFade < 1) {
    _vistaFade = Math.min(1, _vistaFade + dt * 1.65);
    if (_vistaFade >= 1) _prevVista = null;
  }

  const farX = -G.cam.x * 0.14;
  const midX = -G.cam.x * 0.34;
  const farY = -G.cam.y * 0.06;
  const midY = -G.cam.y * 0.12;

  const curTiles = buildVistaTiles(_curVista);
  if (_prevVista && _vistaFade < 1) {
    const prevTiles = buildVistaTiles(_prevVista);
    drawTiledParallaxStrip(ctx, prevTiles.far, farX, farY, cw, ch, 1 - _vistaFade);
    drawTiledParallaxStrip(ctx, curTiles.far, farX, farY, cw, ch, _vistaFade);
    drawTiledParallaxStrip(ctx, prevTiles.mid, midX, midY, cw, ch, 1 - _vistaFade);
    drawTiledParallaxStrip(ctx, curTiles.mid, midX, midY, cw, ch, _vistaFade);
  } else {
    drawTiledParallaxStrip(ctx, curTiles.far, farX, farY, cw, ch, 1);
    drawTiledParallaxStrip(ctx, curTiles.mid, midX, midY, cw, ch, 1);
  }
}

// 4. Biome-Aware Foreground 1.28x Parallax Silhouettes
export function drawForegroundSilhouettes() {
  const ctx = G.ctx;
  const fx = -G.cam.x * 1.28;
  const vista = getVistaKey(G.themeBlend ? G.themeBlend.activeTheme : 'sanctuary');

  ctx.save();
  ctx.fillStyle = vista === 'foundry' ? 'rgba(12, 6, 5, 0.80)' : 'rgba(5, 7, 11, 0.78)';
  for (let i = 0; i < 6; i++) {
    const x = (((i * 760 + 240) + fx) % (G.canvasW + 760) + (G.canvasW + 760)) % (G.canvasW + 760) - 220;

    if (vista === 'abyss') {
      // Cavern foreground stalactite & boulder rim
      ctx.beginPath();
      ctx.moveTo(x - 36, 0); ctx.lineTo(x + 36, 0);
      ctx.lineTo(x + 12, 132); ctx.lineTo(x - 14, 96);
      ctx.closePath(); ctx.fill();
    } else if (vista === 'foundry') {
      // Heavy foreground iron beam & hanging hook silhouette
      ctx.fillRect(x - 16, 0, 32, 118);
      ctx.beginPath();
      ctx.arc(x, 128, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (vista === 'forest') {
      // Sweeping foreground tree-bough overhang
      ctx.beginPath();
      ctx.moveTo(x - 68, 0); ctx.lineTo(x + 68, 0);
      ctx.quadraticCurveTo(x + 28, 96, x - 18, 124);
      ctx.quadraticCurveTo(x - 44, 72, x - 68, 0);
      ctx.closePath(); ctx.fill();
    } else {
      // Gothic ruined vault rib & bottom rock mound
      ctx.beginPath();
      ctx.moveTo(x - 42, 0); ctx.lineTo(x + 42, 0);
      ctx.lineTo(x + 22, 115); ctx.lineTo(x - 8, 92); ctx.lineTo(x - 26, 128);
      ctx.closePath(); ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(x - 65, G.canvasH); ctx.lineTo(x - 18, G.canvasH - 54);
    ctx.lineTo(x + 28, G.canvasH - 36); ctx.lineTo(x + 78, G.canvasH);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
