// Real-time 2D lantern hard shadows & volumetric light shafts (blocked by stone geometry)
import { SOLIDS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF } from './config.js';
import { G } from './state.js';
import { drawGlowSprite } from './vfx.js';

const _lightCanvas = document.createElement('canvas');
const _lightCtx = _lightCanvas.getContext('2d');
const _shadowCanvas = document.createElement('canvas');
const _shadowCtx = _shadowCanvas.getContext('2d');
const _casterPool = [];
const LIGHT_SCALE = 0.5;

function ensureLightBuffers() {
  const tw = Math.max(160, Math.round(G.canvasW * LIGHT_SCALE));
  const th = Math.max(120, Math.round(G.canvasH * LIGHT_SCALE));
  if (_lightCanvas.width !== tw || _lightCanvas.height !== th) {
    _lightCanvas.width = tw;
    _lightCanvas.height = th;
    _shadowCanvas.width = tw;
    _shadowCanvas.height = th;
  }
  return { tw, th };
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

export function drawLanternCastShadows(camOriginX, camOriginY) {
  if (document.body.classList.contains('is-mobile')) return;
  const lp = getPlayerLanternPos();
  if (!lp) return;
  const radius = 410;
  const casters = collectShadowCasters(lp.x, lp.y, radius);
  if (casters.length === 0) return;

  const { tw, th } = ensureLightBuffers();
  _shadowCtx.setTransform(1, 0, 0, 1, 0, 0);
  _shadowCtx.globalCompositeOperation = 'source-over';
  _shadowCtx.clearRect(0, 0, tw, th);

  _shadowCtx.save();
  _shadowCtx.scale(LIGHT_SCALE, LIGHT_SCALE);
  _shadowCtx.translate(-camOriginX, -camOriginY);
  _shadowCtx.fillStyle = '#020409';
  traceExtrudedShadows(_shadowCtx, lp.x, lp.y, casters, 540);

  _shadowCtx.globalCompositeOperation = 'destination-in';
  const fadeG = _shadowCtx.createRadialGradient(lp.x, lp.y, 24, lp.x, lp.y, radius);
  fadeG.addColorStop(0, 'rgba(0,0,0,1)');
  fadeG.addColorStop(0.68, 'rgba(0,0,0,0.82)');
  fadeG.addColorStop(1, 'rgba(0,0,0,0)');
  _shadowCtx.fillStyle = fadeG;
  _shadowCtx.fillRect(lp.x - radius, lp.y - radius, radius * 2, radius * 2);
  _shadowCtx.restore();

  G.ctx.save();
  G.ctx.globalAlpha = 0.44;
  G.ctx.drawImage(_shadowCanvas, camOriginX, camOriginY, G.canvasW, G.canvasH);
  G.ctx.restore();
}

function drawSingleVolumetricLight(camOriginX, camOriginY, lx, ly, radius, innerCol, midCol, alpha) {
  const { tw, th } = ensureLightBuffers();
  const casters = collectShadowCasters(lx, ly, radius);
  _lightCtx.setTransform(1, 0, 0, 1, 0, 0);
  _lightCtx.globalCompositeOperation = 'source-over';
  _lightCtx.clearRect(0, 0, tw, th);

  _lightCtx.save();
  _lightCtx.scale(LIGHT_SCALE, LIGHT_SCALE);
  _lightCtx.translate(-camOriginX, -camOriginY);

  const lg = _lightCtx.createRadialGradient(lx, ly, 8, lx, ly, radius);
  lg.addColorStop(0, innerCol);
  lg.addColorStop(0.42, midCol);
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  _lightCtx.fillStyle = lg;
  _lightCtx.beginPath();
  _lightCtx.arc(lx, ly, radius, 0, Math.PI * 2);
  _lightCtx.fill();

  if (casters.length > 0) {
    _lightCtx.globalCompositeOperation = 'destination-out';
    _lightCtx.fillStyle = '#000';
    traceExtrudedShadows(_lightCtx, lx, ly, casters, radius + 160);
  }
  _lightCtx.restore();

  G.ctx.save();
  G.ctx.globalCompositeOperation = 'lighter';
  G.ctx.globalAlpha = alpha;
  G.ctx.drawImage(_lightCanvas, camOriginX, camOriginY, G.canvasW, G.canvasH);
  G.ctx.restore();
}

export function drawVolumetricLanternLights(camOriginX, camOriginY) {
  const lp = getPlayerLanternPos();
  if (document.body.classList.contains('is-mobile')) {
    if (lp) {
      const isGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
      drawGlowSprite(isGold ? 'gold' : 'cyan', lp.x, lp.y, 175, isGold ? 0.34 : 0.26);
    }
    return;
  }
  if (lp) {
    const isGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const inner = isGold ? 'rgba(254, 240, 138, 0.92)' : 'rgba(186, 230, 253, 0.82)';
    const mid = isGold ? 'rgba(245, 158, 11, 0.34)' : 'rgba(56, 189, 248, 0.28)';
    drawSingleVolumetricLight(camOriginX, camOriginY, lp.x, lp.y, 330, inner, mid, isGold ? 0.28 : 0.22);
  }

  if (G.lanterns && G.lanterns.length > 0) {
    const refX = lp ? lp.x : (camOriginX + G.canvasW * 0.5);
    const refY = lp ? lp.y : (camOriginY + G.canvasH * 0.5);
    let best = null;
    let bestDist = 480;
    for (let i = 0; i < G.lanterns.length; i++) {
      const l = G.lanterns[i];
      const lx = l.x + Math.sin(l.angle) * l.len;
      const ly = l.anchorY + Math.cos(l.angle) * l.len;
      if (lx < camOriginX - 180 || lx > camOriginX + G.canvasW + 180 || ly < camOriginY - 180 || ly > camOriginY + G.canvasH + 180) continue;
      const d = Math.hypot(lx - refX, ly - refY);
      if (d < bestDist) { bestDist = d; best = { x: lx, y: ly, flash: l.ringFlash > 0 }; }
    }
    if (best) {
      drawSingleVolumetricLight(
        camOriginX, camOriginY, best.x, best.y,
        best.flash ? 280 : 210,
        'rgba(254, 240, 138, 0.85)',
        'rgba(245, 158, 11, 0.28)',
        best.flash ? 0.28 : 0.16
      );
    }
  }
}
