// AABB collision, zero-allocation dynamic blockers & grounding queries
import {
  SOLIDS, VOID_BARRIERS, WORLD_H, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF
} from './config.js';
import { G, getAwakeBoss } from './state.js';

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const _shortcutGateBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _chapelExitBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _foundryEntryBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _dynBlockers = [];

function syncGateBox(box, def) {
  box.x = def.x; box.y = def.y; box.w = def.w; box.h = def.h;
  return def.w > 0 && def.h > 0;
}

export function refreshDynamicBlockers() {
  _dynBlockers.length = 0;
  if (G.worldState) {
    if (!G.worldState.shortcutOpen && syncGateBox(_shortcutGateBox, SHORTCUT_GATE_DEF)) _dynBlockers.push(_shortcutGateBox);
    if (!G.worldState.bossDefeated && syncGateBox(_chapelExitBox, CHAPEL_EXIT_GATE_DEF)) _dynBlockers.push(_chapelExitBox);
    if (!G.worldState.abilities.doubleJump && !G.echoSession && syncGateBox(_foundryEntryBox, FOUNDRY_ENTRY_GATE_DEF)) _dynBlockers.push(_foundryEntryBox);
    const walls = G.worldState.secretWalls;
    for (let i = 0; i < walls.length; i++) {
      if (!walls[i].broken) _dynBlockers.push(walls[i]);
    }
  }
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    _dynBlockers.push(VOID_BARRIERS[i]);
  }
  return _dynBlockers;
}

function canPhaseVoidBarrier(ent) {
  return ent === G.player && G.worldState && G.worldState.abilities.shadeDash &&
    (ent.dashTimer > 0 || ent.shadePassTimer > 0);
}

function resolveHorizontalAgainst(ent, list) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.type === 'platform') continue; // platforms are one-way from above
    if (s.isVoidBarrier && canPhaseVoidBarrier(ent)) continue;
    if (aabbOverlap(ent, s)) {
      if (ent.vx > 0) {
        ent.x = s.x - ent.w;
        ent.wallDir = 1;
      } else if (ent.vx < 0) {
        ent.x = s.x + s.w;
        ent.wallDir = -1;
      }
      ent.vx = 0;
    }
  }
}

function resolveVerticalAgainst(ent, prevBottom, list) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.isVoidBarrier && canPhaseVoidBarrier(ent)) continue;
    if (s.type === 'platform') {
      if (s.crumble && s.state === 'broken') continue;
      if (ent === G.player && ent.dropThroughTimer > 0) continue;
      if (ent.vy >= 0 && prevBottom <= s.y + 8 && aabbOverlap(ent, s)) {
        ent.y = s.y - ent.h;
        ent.vy = 0;
        ent.grounded = true;
        ent.onPlatform = true;
        if (ent === G.player && s.crumble && s.state === 'solid') {
          s.state = 'shaking';
          s.timer = 0.65;
        }
      }
    } else if (aabbOverlap(ent, s)) {
      if (ent.vy > 0) {
        ent.y = s.y - ent.h;
        ent.vy = 0;
        ent.grounded = true;
      } else if (ent.vy < 0) {
        // Corner correction nudge when clipping pillar underside
        const overlapL = (ent.x + ent.w) - s.x;
        const overlapR = (s.x + s.w) - ent.x;
        if (ent === G.player && overlapL > 0 && overlapL <= 9) {
          ent.x -= overlapL;
        } else if (ent === G.player && overlapR > 0 && overlapR <= 9) {
          ent.x += overlapR;
        } else {
          ent.y = s.y + s.h;
          ent.vy = 0;
        }
      }
    }
  }
}

export function moveAndCollide(ent, dt, respectBossBarrier = false) {
  const dynBlockers = refreshDynamicBlockers();

  // Horizontal
  ent.x += ent.vx * dt;
  ent.wallDir = 0;

  const activeBoss = respectBossBarrier ? getAwakeBoss() : null;
  if (activeBoss) {
    if (ent.x < activeBoss.arenaMinX) ent.x = activeBoss.arenaMinX;
    if (ent.x + ent.w > activeBoss.arenaMaxX) ent.x = activeBoss.arenaMaxX - ent.w;
  }

  resolveHorizontalAgainst(ent, SOLIDS);
  resolveHorizontalAgainst(ent, dynBlockers);

  // Vertical
  const prevBottom = ent.y + ent.h;
  ent.y += ent.vy * dt;
  ent.grounded = false;
  ent.onPlatform = false;

  resolveVerticalAgainst(ent, prevBottom, SOLIDS);
  resolveVerticalAgainst(ent, prevBottom, dynBlockers);
  if (G.crumblePlatforms && G.crumblePlatforms.length > 0) {
    resolveVerticalAgainst(ent, prevBottom, G.crumblePlatforms);
  }

  // Prevent player from ever getting wedged inside a Void Barrier if Shade Dash ends mid-curtain
  if (ent === G.player && VOID_BARRIERS.length > 0 && !canPhaseVoidBarrier(ent)) {
    for (let i = 0; i < VOID_BARRIERS.length; i++) {
      const vb = VOID_BARRIERS[i];
      if (aabbOverlap(ent, vb)) {
        const dir = ent.dashDir || ent.facing || 1;
        ent.x = dir > 0 ? (vb.x + vb.w + 1) : (vb.x - ent.w - 1);
      }
    }
  }
}

function segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  if (rw <= 0 || rh <= 0) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0.02;
  let tmax = 0.96;
  if (Math.abs(dx) < 1e-6) {
    if (x1 < rx || x1 > rx + rw) return false;
  } else {
    const inv = 1 / dx;
    let t1 = (rx - x1) * inv;
    let t2 = (rx + rw - x1) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-6) {
    if (y1 < ry || y1 > ry + rh) return false;
  } else {
    const inv = 1 / dy;
    let t1 = (ry - y1) * inv;
    let t2 = (ry + rh - y1) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return true;
}

// Checks unobstructed line-of-sight against solid ground, pillars, closed gates & unbroken secret walls
// (One-way thin platforms remain grapple-transparent so vertical shaft movement stays fluid.)
export function hasLineOfSight(x1, y1, x2, y2) {
  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.type === 'platform') continue;
    if (segmentIntersectsRect(x1, y1, x2, y2, s.x, s.y, s.w, s.h)) return false;
  }
  const dynBlockers = refreshDynamicBlockers();
  for (let i = 0; i < dynBlockers.length; i++) {
    const b = dynBlockers[i];
    if (segmentIntersectsRect(x1, y1, x2, y2, b.x, b.y, b.w, b.h)) return false;
  }
  return true;
}

export function getGroundSurfaceY(cx, footY) {
  let bestY = WORLD_H;
  for (const s of SOLIDS) {
    if (cx >= s.x - 6 && cx <= s.x + s.w + 6 && s.y >= footY - 6 && s.y < bestY) {
      bestY = s.y;
    }
  }
  if (G.crumblePlatforms) {
    for (const s of G.crumblePlatforms) {
      if (s.state !== 'broken' && cx >= s.x - 6 && cx <= s.x + s.w + 6 && s.y >= footY - 6 && s.y < bestY) {
        bestY = s.y;
      }
    }
  }
  return bestY;
}
