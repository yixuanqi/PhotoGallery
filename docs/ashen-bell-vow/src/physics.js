// AABB collision, zero-allocation dynamic blockers & grounding queries
import {
  ROOMS, SOLIDS, VOID_BARRIERS, SLICK_WALLS, SWITCH_GATES, WORLD_H, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, SKY_BRIDGE_GATE_DEF, FOUNDRY_VENT_GATE_DEF, MIRROR_ABYSS_GATE_DEF
} from './config.js';
import { G, getAwakeBoss, isSkyBridgeOpen, isWorldSwitchOn, isBoss4Unlocked } from './state.js';

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const _shortcutGateBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _chapelExitBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _foundryEntryBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _foundryExitBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _skyBridgeBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _foundryVentBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
const _mirrorAbyssBox = { x: 0, y: 0, w: 0, h: 0, type: 'pillar' };
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
    if (!G.worldState.boss2Defeated && !G.echoSession && syncGateBox(_foundryExitBox, FOUNDRY_EXIT_GATE_DEF)) _dynBlockers.push(_foundryExitBox);
    if (!isSkyBridgeOpen() && !G.echoSession && syncGateBox(_skyBridgeBox, SKY_BRIDGE_GATE_DEF)) _dynBlockers.push(_skyBridgeBox);
    const foundryVentSealed = !isWorldSwitchOn('foundryValveOpen') || !!G.echoSession || !!(G.boss2 && G.boss2.alive && G.boss2.awake);
    if (foundryVentSealed && syncGateBox(_foundryVentBox, FOUNDRY_VENT_GATE_DEF)) _dynBlockers.push(_foundryVentBox);
    const mirrorGateSealed = !isBoss4Unlocked() || (!!G.echoSession && !(G.boss4 && G.boss4.alive && G.boss4.awake));
    if (mirrorGateSealed && syncGateBox(_mirrorAbyssBox, MIRROR_ABYSS_GATE_DEF)) _dynBlockers.push(_mirrorAbyssBox);
    for (let i = 0; i < SWITCH_GATES.length; i++) {
      const sg = SWITCH_GATES[i];
      if (!isWorldSwitchOn(sg.switchKey)) _dynBlockers.push(sg);
    }
    const walls = G.worldState.secretWalls;
    for (let i = 0; i < walls.length; i++) { if (!walls[i].broken) _dynBlockers.push(walls[i]); }
    const floors = G.worldState.breakableFloors || [];
    for (let i = 0; i < floors.length; i++) { if (!floors[i].broken) _dynBlockers.push(floors[i]); }
    const pillars = G.worldState.icePillars || [];
    for (let i = 0; i < pillars.length; i++) {
      const ip = pillars[i];
      if (ip.state === 'bridge') {
        if (!ip._bridgeBox) ip._bridgeBox = { x: ip.bridgeX, y: ip.bridgeY, w: ip.bridgeW, h: ip.bridgeH, type: 'platform' };
        _dynBlockers.push(ip._bridgeBox);
      }
    }
  }
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    if (!VOID_BARRIERS[i].sweeping) _dynBlockers.push(VOID_BARRIERS[i]);
  }
  if (Array.isArray(G.arenaHazards) && G.arenaHazards.length > 0) {
    for (let i = 0; i < G.arenaHazards.length; i++) {
      const h = G.arenaHazards[i];
      if (h.kind === 'brambleCage' && h.phase === 'active' && h.hp > 0) {
        if (h.leftWallBox) _dynBlockers.push(h.leftWallBox);
        if (h.rightWallBox) _dynBlockers.push(h.rightWallBox);
      }
    }
  }
  return _dynBlockers;
}

function canPhaseVoidBarrier(ent) {
  return ent === G.player && G.worldState && G.worldState.abilities.shadeDash &&
    (ent.dashTimer > 0 || ent.shadePassTimer > 0);
}

function resolveHorizontalAgainst(ent, list, prevX) {
  const hasPrev = prevX !== undefined;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.type === 'platform') continue; // platforms are one-way from above
    if (s.isVoidBarrier && canPhaseVoidBarrier(ent)) continue;
    if (s.isBrambleWall && (ent !== G.player || canPhaseVoidBarrier(ent))) continue;
    if (aabbOverlap(ent, s)) {
      if (hasPrev) {
        const wasLeft = (prevX + ent.w) <= (s.x + 12);
        const wasRight = prevX >= (s.x + s.w - 12);
        if (!wasLeft && !wasRight) {
          // v47.5 Anti-Zip Guard: entity was already overlapping horizontally (vertical clip) — never teleport across wide ground slabs!
          continue;
        }
        if (wasLeft && ent.vx > 0) {
          ent.x = s.x - ent.w;
          ent.wallDir = 1;
          ent.vx = 0;
        } else if (wasRight && ent.vx < 0) {
          ent.x = s.x + s.w;
          ent.wallDir = -1;
          ent.vx = 0;
        }
      } else {
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
}

function resolveVerticalAgainst(ent, prevBottom, list) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.isVoidBarrier && canPhaseVoidBarrier(ent)) continue;
    if (s.isBrambleWall && (ent !== G.player || canPhaseVoidBarrier(ent))) continue;
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
      } else {
        // v47.5 Zero-vy safety eject along minimal vertical axis
        if (prevBottom <= s.y + 14) {
          ent.y = s.y - ent.h;
          ent.grounded = true;
        } else {
          ent.y = s.y + s.h;
        }
      }
    }
  }
}

export function moveAndCollide(ent, dt, respectBossBarrier = false) {
  const dynBlockers = refreshDynamicBlockers();

  // Horizontal
  const prevX = ent.x;
  ent.x += ent.vx * dt;
  ent.wallDir = 0;
  ent.wallSlick = false;

  const activeBoss = respectBossBarrier ? getAwakeBoss() : null;
  if (activeBoss) {
    if (ent.x < activeBoss.arenaMinX) ent.x = activeBoss.arenaMinX;
    if (ent.x + ent.w > activeBoss.arenaMaxX) ent.x = activeBoss.arenaMaxX - ent.w;
  }

  resolveHorizontalAgainst(ent, SOLIDS, prevX);
  resolveHorizontalAgainst(ent, dynBlockers, prevX);
  if (ent === G.player && ent.wallDir !== 0 && SLICK_WALLS.length > 0) {
    const probe = { x: ent.x + (ent.wallDir > 0 ? ent.w - 2 : -4), y: ent.y + 4, w: 6, h: ent.h - 8 };
    for (let i = 0; i < SLICK_WALLS.length; i++) {
      if (aabbOverlap(probe, SLICK_WALLS[i])) { ent.wallSlick = true; break; }
    }
  }

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
  // v47.1 Vertical Boss-Arena Ceiling Clamp: prevents player or boss from ever escaping above an active arena ceiling!
  if (activeBoss && activeBoss.arenaTopY !== undefined && ent.y < activeBoss.arenaTopY) {
    ent.y = activeBoss.arenaTopY;
    if (ent.vy < 0) ent.vy = 0;
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
    if (b.isBrambleWall) continue;
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
      if (s.state !== 'broken' && cx >= s.x - 6 && cx <= s.x + s.w + 6 && s.y >= footY - 6 && s.y < bestY) bestY = s.y;
    }
  }
  if (G.worldState) {
    for (const f of (G.worldState.breakableFloors || [])) {
      if (!f.broken && cx >= f.x - 6 && cx <= f.x + f.w + 6 && f.y >= footY - 6 && f.y < bestY) bestY = f.y;
    }
    for (const sg of SWITCH_GATES) {
      if (sg.orientation === 'horizontal' && !isWorldSwitchOn(sg.switchKey) && cx >= sg.x - 6 && cx <= sg.x + sg.w + 6 && sg.y >= footY - 6 && sg.y < bestY) bestY = sg.y;
    }
    for (const ip of (G.worldState.icePillars || [])) {
      if (ip.state === 'bridge' && cx >= ip.bridgeX - 6 && cx <= ip.bridgeX + ip.bridgeW + 6 && ip.bridgeY >= footY - 6 && ip.bridgeY < bestY) bestY = ip.bridgeY;
    }
  }
  return bestY;
}

// ==================== v46.6 UNIFIED GROUND-ENEMY LEDGE GUARD, STEP-UP VAULT & LEASH DE-AGGRO ====================
export function hasWalkableAhead(e, dir, lookAhead = 14, maxDrop = 38) {
  if (!e || !dir) return true;
  const footY = e.y + e.h;
  const probeX = dir > 0 ? (e.x + e.w + lookAhead) : (e.x - lookAhead);
  const surfY = getGroundSurfaceY(probeX, footY - 8);
  return surfY < WORLD_H && (surfY - footY) <= maxDrop;
}

export function findClimbableStepY(e, dir, maxStepH = 88) {
  if (!e || !dir) return null;
  const footY = e.y + e.h;
  const probeX = dir > 0 ? (e.x + e.w + 18) : (e.x - 18);
  const surfY = getGroundSurfaceY(probeX, footY - maxStepH);
  if (surfY >= WORLD_H || surfY >= footY - 12 || (footY - surfY) > maxStepH) return null;
  const headBox = { x: probeX - e.w * 0.4, y: surfY - e.h - 4, w: e.w * 0.8, h: e.h };
  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.type === 'platform') continue;
    if (aabbOverlap(headBox, s)) return null;
  }
  const dyn = refreshDynamicBlockers();
  for (let i = 0; i < dyn.length; i++) {
    if (dyn[i].type === 'platform') continue;
    if (aabbOverlap(headBox, dyn[i])) return null;
  }
  return surfY;
}

export function findWalkableFloorSpan(cx, footY, roomId = null) {
  let minX = null;
  let maxX = null;
  for (let i = 0; i < SOLIDS.length; i++) {
    const s = SOLIDS[i];
    if (s.type !== 'ground' && s.type !== 'platform') continue;
    if (Math.abs(s.y - footY) <= 12 && cx >= s.x - 12 && cx <= s.x + s.w + 12) {
      minX = minX === null ? s.x : Math.min(minX, s.x);
      maxX = maxX === null ? (s.x + s.w) : Math.max(maxX, s.x + s.w);
    }
  }
  if (minX === null) return null;
  let expanded = true;
  let guard = 0;
  while (expanded && guard++ < 6) {
    expanded = false;
    for (let i = 0; i < SOLIDS.length; i++) {
      const s = SOLIDS[i];
      if (s.type !== 'ground' && s.type !== 'platform') continue;
      if (Math.abs(s.y - footY) > 12) continue;
      if (s.x <= maxX + 10 && (s.x + s.w) >= minX - 10) {
        if (s.x < minX) { minX = s.x; expanded = true; }
        if (s.x + s.w > maxX) { maxX = s.x + s.w; expanded = true; }
      }
    }
  }
  if (roomId && ROOMS.length > 0) {
    const rm = ROOMS.find(r => r.id === roomId);
    if (rm && rm.bounds) {
      minX = Math.max(minX, rm.bounds.x + 16);
      maxX = Math.min(maxX, rm.bounds.x + rm.bounds.w - 16);
    }
  }
  return maxX > minX ? { minX, maxX } : null;
}

export function canEnemyAggro(e, absDx, maxDx, absDy, maxDy) {
  if (!G.player || G.player.hp <= 0) return false;
  if ((e.deaggroTimer || 0) > 0) {
    return absDx < 115 && absDy < 76;
  }
  return absDx < maxDx && absDy < maxDy;
}

export function moveGroundEnemyWithGuard(e, dt, opts = {}) {
  const leashPad = opts.leashPad !== undefined ? opts.leashPad : 65;
  const canStepUp = opts.canStepUp !== false;
  const hasLeash = e.minX !== undefined && e.maxX !== undefined;
  const px = G.player ? (G.player.x + G.player.w * 0.5) : (e.x + e.w * 0.5);
  const py = G.player ? (G.player.y + G.player.h * 0.5) : (e.y + e.h * 0.5);
  const dx = px - (e.x + e.w * 0.5);
  const dy = py - (e.y + e.h * 0.5);

  if (e.grounded && e.spawnFootY === undefined) {
    e.spawnFootY = e.y + e.h;
  }

  // 1. Pre-move Ledge Guard: prevent patrol/chase enemies from blindly walking off ledges & platforms!
  if (e.grounded && (e.state === 'patrol' || e.state === 'chase') && Math.abs(e.vx) > 8) {
    const moveDir = e.vx > 0 ? 1 : -1;
    if (!hasWalkableAhead(e, moveDir, 12, 38)) {
      if (e.state === 'patrol') {
        e.facing = -moveDir;
        e.vx = -e.vx * 0.65;
      } else {
        e.vx = 0;
        e._edgeStuckTimer = (e._edgeStuckTimer || 0) + dt;
        if (e._edgeStuckTimer >= 0.72) {
          e.state = 'patrol';
          e.facing = -moveDir;
          e.deaggroTimer = 2.2;
          e._edgeStuckTimer = 0;
          e.stateTimer = 0.45;
        }
      }
    } else {
      e._edgeStuckTimer = 0;
    }
  } else {
    e._edgeStuckTimer = 0;
  }

  // 2. Physical AABB integration
  moveAndCollide(e, dt, false);

  // 3. Dynamic Floor Re-Anchor: if knocked off a high platform onto a lower floor, expand patrol span to the new floor
  if (e.grounded && hasLeash && e.spawnFootY !== undefined && Math.abs((e.y + e.h) - e.spawnFootY) > 68) {
    const span = findWalkableFloorSpan(e.x + e.w * 0.5, e.y + e.h, e.roomId);
    if (span && (span.maxX - span.minX) >= 130) {
      e.minX = span.minX + 24;
      e.maxX = Math.max(e.minX + 80, span.maxX - e.w - 24);
      e.spawnFootY = e.y + e.h;
    }
  }

  // 4. Wall-Stuck Escape & Step-Up Vault (climbs <= 88px ledges like cavern pool steps; retreats if blocked by tall walls!)
  if (e.wallDir !== 0) {
    if (e.state === 'patrol') {
      e.facing = -e.wallDir;
      e.vx = e.facing * 52;
      e._wallStuckTimer = 0;
    } else if (e.state === 'chase') {
      const ledgeY = (canStepUp && e.grounded && (e._stepJumpCd || 0) <= 0) ? findClimbableStepY(e, e.wallDir, 88) : null;
      if (ledgeY !== null) {
        const climbH = Math.max(24, (e.y + e.h) - ledgeY);
        e.vy = -Math.max(410, Math.min(580, Math.sqrt(2 * 1850 * (climbH + 34))));
        e.vx = e.wallDir * 185;
        e.grounded = false;
        e._stepJumpCd = 1.15;
        e._wallStuckTimer = 0;
      } else {
        e._wallStuckTimer = (e._wallStuckTimer || 0) + dt;
        if (e._wallStuckTimer >= 0.72) {
          e.state = 'patrol';
          e.facing = -e.wallDir;
          e.vx = e.facing * 64;
          e.deaggroTimer = 2.3;
          e._wallStuckTimer = 0;
          e.stateTimer = 0.45;
        }
      }
    }
  } else if (e.grounded) {
    e._wallStuckTimer = Math.max(0, (e._wallStuckTimer || 0) - dt * 2.5);
  }

  // 5. Boundary Leash Clamp + Anti-Moonwalk De-Aggro (prevents Frostguard/Golem running endlessly against invisible minX/maxX wall!)
  if (hasLeash) {
    const minB = e.minX - leashPad;
    const maxB = e.maxX + leashPad;
    let hitMin = false;
    let hitMax = false;
    if (e.x <= minB) {
      e.x = minB;
      if (e.vx < 0) e.vx = 0;
      hitMin = true;
    } else if (e.x >= maxB) {
      e.x = maxB;
      if (e.vx > 0) e.vx = 0;
      hitMax = true;
    }

    if (e.state === 'chase' && ((hitMin && dx < -10) || (hitMax && dx > 10))) {
      e.vx = 0;
      e._leashStuckTimer = (e._leashStuckTimer || 0) + dt;
      if (e._leashStuckTimer >= 0.65 && (Math.abs(dx) > 135 || Math.abs(dy) > 95)) {
        e.state = 'patrol';
        e.facing = hitMin ? 1 : -1;
        e.deaggroTimer = 2.4;
        e._leashStuckTimer = 0;
        e.stateTimer = 0.45;
      }
    } else {
      e._leashStuckTimer = Math.max(0, (e._leashStuckTimer || 0) - dt * 2.5);
    }
  }
}

// ==================== v47.2 FLYING ENEMY SOLID WALL/PILLAR ANTI-CLIP RESOLUTION ====================
export function resolveFlyingEnemySolids(ent) {
  if (!ent) return false;
  let pushed = false;
  const pushOut = (list) => {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s || s.type === 'platform' || s.isBrambleWall) continue;
      if (!aabbOverlap(ent, s)) continue;
      const penL = (ent.x + ent.w) - s.x;
      const penR = (s.x + s.w) - ent.x;
      const penT = (ent.y + ent.h) - s.y;
      const penB = (s.y + s.h) - ent.y;
      const minPen = Math.min(penL, penR, penT, penB);
      if (minPen === penL) {
        ent.x = s.x - ent.w - 1;
        if (ent.vx > 0) ent.vx = 0;
      } else if (minPen === penR) {
        ent.x = s.x + s.w + 1;
        if (ent.vx < 0) ent.vx = 0;
      } else if (minPen === penT) {
        ent.y = s.y - ent.h - 1;
        if (ent.vy > 0) ent.vy = 0;
      } else {
        ent.y = s.y + s.h + 1;
        if (ent.vy < 0) ent.vy = 0;
      }
      pushed = true;
    }
  };
  pushOut(SOLIDS);
  pushOut(refreshDynamicBlockers());
  return pushed;
}
