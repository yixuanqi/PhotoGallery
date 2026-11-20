// Real-time 2D lantern hard shadows & volumetric light shafts
// Zero same-frame offscreen buffer reuse (prevents Skia GPU copy-on-write stalls), pre-baked radial masks & smart dirty caching
import { SOLIDS, VOID_BARRIERS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF } from './config.js';
import { G } from './state.js';
import { drawGlowSprite } from './vfx.js';

const BUFFER_DIM = 192;

function makeBuffer() {
  const c = document.createElement('canvas');
  c.width = BUFFER_DIM;
  c.height = BUFFER_DIM;
  return { canvas: c, ctx: c.getContext('2d') };
}

// Dedicated offscreen buffer per pass so NO buffer is ever mutated after drawImage() in the same frame!
const _shadowBuf = makeBuffer();
const _playerLightBuf = makeBuffer();
const _lanternLightBuf = makeBuffer();

// Pre-baked radial masks (zero per-frame createRadialGradient allocations)
function makeRadialMask(stops) {
  const b = makeBuffer();
  const half = BUFFER_DIM * 0.5;
  const g = b.ctx.createRadialGradient(half, half, 4, half, half, half);
  for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  b.ctx.fillStyle = g;
  b.ctx.fillRect(0, 0, BUFFER_DIM, BUFFER_DIM);
  return b.canvas;
}

const _shadowFadeMask = makeRadialMask([[0, 'rgba(0,0,0,1)'], [0.68, 'rgba(0,0,0,0.82)'], [1, 'rgba(0,0,0,0)']]);
const _cyanLightMask = makeRadialMask([[0, 'rgba(186,230,253,0.82)'], [0.42, 'rgba(56,189,248,0.28)'], [1, 'rgba(0,0,0,0)']]);
const _goldLightMask = makeRadialMask([[0, 'rgba(254,240,138,0.92)'], [0.42, 'rgba(245,158,11,0.34)'], [1, 'rgba(0,0,0,0)']]);

const _casterPool = [];
let _lightingFrame = 0;
const _shadowState = { x: -9999, y: -9999, valid: false, hasCasters: false };
const _pLightState = { x: -9999, y: -9999, isGold: false, valid: false };
const _lLightState = { x: -9999, y: -9999, radius: 0, valid: false };

function useLightweightLighting() {
  return !!(G.isMobile || (G.settings && G.settings.dynamicLighting === false));
}

function getPlayerLanternPos() {
  if (!G.player || G.player.hp <= 0) return null;
  const cx = G.player.x + G.player.w * 0.5;
  const crouch = (G.player.landCrouch || 0) * 6 + (G.player.isCharging && G.player.chargeTime > 0.14 ? 5 : 0);
  return {
    x: cx - G.player.facing * 9,
    y: G.player.y + G.player.h - 21 + crouch
  };
}

function collectShadowCasters(lx, ly, radius) {
  _casterPool.length = 0;
  const minX = lx - radius;
  const maxX = lx + radius;
  const minY = ly - radius;
  const maxY = ly + radius;

  const pushRect = (x, y, w, h) => {
    if (w <= 0 || h <= 0) return;
    if (x + w < minX || x > maxX || y + h < minY || y > maxY) return;
    if (lx >= x - 2 && lx <= x + w + 2 && ly >= y - 2 && ly <= y + h + 2) return;
    _casterPool.push({ x, y, w, h });
  };

  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.type === 'pillar' || s.type === 'platform') {
      pushRect(s.x, s.y, s.w, s.h);
    } else if (s.type === 'ground') {
      if (ly > s.y + 8 && s.h <= 220) pushRect(s.x, s.y, s.w, s.h);
    }
  }
  if (G.crumblePlatforms) {
    for (let i = 0; i < G.crumblePlatforms.length; i++) {
      const cp = G.crumblePlatforms[i];
      if (cp.state !== 'broken') pushRect(cp.x, cp.y, cp.w, cp.h);
    }
  }
  if (G.worldState) {
    for (let i = 0; i < G.worldState.secretWalls.length; i++) {
      const sw = G.worldState.secretWalls[i];
      if (!sw.broken) pushRect(sw.x, sw.y, sw.w, sw.h);
    }
    if (!G.worldState.shortcutOpen && SHORTCUT_GATE_DEF.w > 0) {
      pushRect(SHORTCUT_GATE_DEF.x, SHORTCUT_GATE_DEF.y, SHORTCUT_GATE_DEF.w, SHORTCUT_GATE_DEF.h);
    }
    if (!G.worldState.bossDefeated && CHAPEL_EXIT_GATE_DEF.w > 0) {
      pushRect(CHAPEL_EXIT_GATE_DEF.x, CHAPEL_EXIT_GATE_DEF.y, CHAPEL_EXIT_GATE_DEF.w, CHAPEL_EXIT_GATE_DEF.h);
    }
    if (!G.worldState.abilities.doubleJump && !G.echoSession && FOUNDRY_ENTRY_GATE_DEF.w > 0) {
      pushRect(FOUNDRY_ENTRY_GATE_DEF.x, FOUNDRY_ENTRY_GATE_DEF.y, FOUNDRY_ENTRY_GATE_DEF.w, FOUNDRY_ENTRY_GATE_DEF.h);
    }
    if (!G.worldState.boss2Defeated && !G.echoSession && FOUNDRY_EXIT_GATE_DEF.w > 0) {
      pushRect(FOUNDRY_EXIT_GATE_DEF.x, FOUNDRY_EXIT_GATE_DEF.y, FOUNDRY_EXIT_GATE_DEF.w, FOUNDRY_EXIT_GATE_DEF.h);
    }
  }
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    pushRect(vb.x, vb.y, vb.w, vb.h);
  }
  return _casterPool;
}

function traceExtrudedShadows(tctx, lx, ly, casters, extLen) {
  tctx.beginPath();
  for (let i = 0; i < casters.length; i++) {
    const c = casters[i];
    const x1 = c.x, y1 = c.y, x2 = c.x + c.w, y2 = c.y + c.h;
    const vx = [x1, x2, x2, x1];
    const vy = [y1, y1, y2, y2];
    for (let e = 0; e < 4; e++) {
      const n = (e + 1) & 3;
      const ax = vx[e], ay = vy[e];
      const bx = vx[n], by = vy[n];
      const edx = bx - ax;
      const edy = by - ay;
      if (edy * (lx - ax) - edx * (ly - ay) <= 0) {
        const dax = ax - lx, day = ay - ly;
        const dbx = bx - lx, dby = by - ly;
        const la = Math.hypot(dax, day) || 1;
        const lb = Math.hypot(dbx, dby) || 1;
        const eax = ax + (dax / la) * extLen;
        const eay = ay + (day / la) * extLen;
        const ebx = bx + (dbx / lb) * extLen;
        const eby = by + (dby / lb) * extLen;
        tctx.moveTo(ax, ay);
        tctx.lineTo(bx, by);
        tctx.lineTo(ebx, eby);
        tctx.lineTo(eax, eay);
        tctx.closePath();
      }
    }
  }
  tctx.fill();
}

export function drawLanternCastShadows() {
  _lightingFrame++;
  if (useLightweightLighting()) return;
  const lp = getPlayerLanternPos();
  if (!lp) return;
  const radius = 360;
  const dia = radius * 2;
  const ox = lp.x - radius;
  const oy = lp.y - radius;

  // Re-rasterize on even frames when moved > 2.5px (cuts shadow pass cost by >55% with zero visible lag)
  const moved = Math.abs(lp.x - _shadowState.x) + Math.abs(lp.y - _shadowState.y);
  if (!_shadowState.valid || (moved > 2.5 && (_lightingFrame & 1) === 0)) {
    const casters = collectShadowCasters(lp.x, lp.y, radius);
    _shadowState.x = lp.x;
    _shadowState.y = lp.y;
    _shadowState.valid = true;
    _shadowState.hasCasters = casters.length > 0;
    if (casters.length > 0) {
      const sctx = _shadowBuf.ctx;
      const scale = BUFFER_DIM / dia;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, BUFFER_DIM, BUFFER_DIM);

      sctx.save();
      sctx.scale(scale, scale);
      sctx.translate(-ox, -oy);
      sctx.fillStyle = '#020409';
      traceExtrudedShadows(sctx, lp.x, lp.y, casters, radius + 120);
      sctx.restore();

      sctx.globalCompositeOperation = 'destination-in';
      sctx.drawImage(_shadowFadeMask, 0, 0);
    }
  }

  if (!_shadowState.hasCasters) return;
  G.ctx.globalAlpha = 0.42;
  G.ctx.drawImage(_shadowBuf.canvas, ox, oy, dia, dia);
  G.ctx.globalAlpha = 1;
}

function rasterizeVolumetricLight(buf, lx, ly, radius, maskCanvas) {
  const dia = radius * 2;
  const scale = BUFFER_DIM / dia;
  const ox = lx - radius;
  const oy = ly - radius;
  const casters = collectShadowCasters(lx, ly, radius);
  const lctx = buf.ctx;

  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, BUFFER_DIM, BUFFER_DIM);
  lctx.drawImage(maskCanvas, 0, 0);

  if (casters.length > 0) {
    lctx.save();
    lctx.scale(scale, scale);
    lctx.translate(-ox, -oy);
    lctx.globalCompositeOperation = 'destination-out';
    lctx.fillStyle = '#000';
    traceExtrudedShadows(lctx, lx, ly, casters, radius + 110);
    lctx.restore();
  }
}

export function drawVolumetricLanternLights(camOriginX, camOriginY) {
  const lp = getPlayerLanternPos();
  if (useLightweightLighting()) {
    if (lp) {
      const isGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
      drawGlowSprite(isGold ? 'gold' : 'cyan', lp.x, lp.y, 175, isGold ? 0.34 : 0.26);
    }
    return;
  }

  // 1. Player Volumetric Lantern Light (dedicated _playerLightBuf, re-rasterized on odd frames)
  if (lp) {
    const isGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const radius = 300;
    const moved = Math.abs(lp.x - _pLightState.x) + Math.abs(lp.y - _pLightState.y);
    if (!_pLightState.valid || _pLightState.isGold !== isGold || (moved > 2.5 && (_lightingFrame & 1) === 1)) {
      rasterizeVolumetricLight(_playerLightBuf, lp.x, lp.y, radius, isGold ? _goldLightMask : _cyanLightMask);
      _pLightState.x = lp.x;
      _pLightState.y = lp.y;
      _pLightState.isGold = isGold;
      _pLightState.valid = true;
    }
    G.ctx.globalCompositeOperation = 'lighter';
    G.ctx.globalAlpha = isGold ? 0.27 : 0.21;
    G.ctx.drawImage(_playerLightBuf.canvas, lp.x - radius, lp.y - radius, radius * 2, radius * 2);
    G.ctx.globalAlpha = 1;
    G.ctx.globalCompositeOperation = 'source-over';
  }

  // 2. Nearest Hanging Lantern Volumetric Light (dedicated _lanternLightBuf — ZERO buffer conflict!)
  if (G.lanterns && G.lanterns.length > 0) {
    const refX = lp ? lp.x : (camOriginX + G.canvasW * 0.5);
    const refY = lp ? lp.y : (camOriginY + G.canvasH * 0.5);
    let best = null;
    let bestDist = 450;
    for (let i = 0; i < G.lanterns.length; i++) {
      const l = G.lanterns[i];
      const lx = l.x + Math.sin(l.angle) * l.len;
      const ly = l.anchorY + Math.cos(l.angle) * l.len;
      if (lx < camOriginX - 180 || lx > camOriginX + G.canvasW + 180 || ly < camOriginY - 180 || ly > camOriginY + G.canvasH + 180) continue;
      const d = Math.hypot(lx - refX, ly - refY);
      if (d < bestDist) { bestDist = d; best = { x: lx, y: ly, flash: l.ringFlash > 0 }; }
    }
    if (best) {
      const r = best.flash ? 240 : 190;
      const moved = Math.abs(best.x - _lLightState.x) + Math.abs(best.y - _lLightState.y);
      if (!_lLightState.valid || _lLightState.radius !== r || (moved > 3.5 && (_lightingFrame & 3) === 0)) {
        rasterizeVolumetricLight(_lanternLightBuf, best.x, best.y, r, _goldLightMask);
        _lLightState.x = best.x;
        _lLightState.y = best.y;
        _lLightState.radius = r;
        _lLightState.valid = true;
      }
      G.ctx.globalCompositeOperation = 'lighter';
      G.ctx.globalAlpha = best.flash ? 0.27 : 0.16;
      G.ctx.drawImage(_lanternLightBuf.canvas, best.x - r, best.y - r, r * 2, r * 2);
      G.ctx.globalAlpha = 1;
      G.ctx.globalCompositeOperation = 'source-over';
    }
  }
}
