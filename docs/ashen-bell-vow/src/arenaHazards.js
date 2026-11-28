// Generic Persistent Arena Hazard & Destructible Boss-Skill Engine (v47.0)
// Supports 4-stage lifecycle: telegraph -> active -> fade -> remove, plus destructible obstacles (e.g. Bramble Cage)
import { COLORS, FLOOR_Y } from './config.js';
import { G, addShake, punchZoom } from './state.js';
import { audio } from './audio.js';
import { spawnParticles, spawnShockwave, spawnFloatText } from './vfx.js';
import { aabbOverlap } from './physics.js';
import { t } from './i18n.js';

let _nextHazardId = 1;

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-6) return Math.hypot(px - x1, py - y1);
  const proj = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  return Math.hypot(px - (x1 + proj * vx), py - (y1 + proj * vy));
}

export function spawnArenaHazard(spec) {
  if (!Array.isArray(G.arenaHazards)) G.arenaHazards = [];
  const tel = Math.max(0.05, Number(spec.telegraph) || 0.72);
  const act = Math.max(0.10, Number(spec.activeDur) || 0.50);
  const fade = Math.max(0.10, Number(spec.fadeDur) || 0.28);
  const h = {
    id: `haz_${_nextHazardId++}`,
    phase: 'telegraph',
    timer: tel,
    maxTelegraph: tel,
    activeDur: act,
    fadeDur: fade,
    hitCd: 0,
    didHit: false,
    hurtFlash: 0,
    ...spec
  };
  h.timer = tel;
  h.maxTelegraph = tel;
  h.activeDur = act;
  h.fadeDur = fade;
  if (h.kind === 'prismBeam') {
    h.curAngle = h.startAngle;
  }
  if (h.kind === 'iceLance') {
    h.angle = h.angle !== undefined ? h.angle : Math.PI * 0.5;
    h.locked = false;
  }
  if (h.kind === 'brambleCage') {
    const hw = h.halfW || 96;
    const ch = h.h || 148;
    const ww = h.wallW || 18;
    const fy = h.y !== undefined ? h.y : FLOOR_Y;
    h.hp = h.hp || 52;
    h.maxHp = h.hp;
    h.leftWallBox = { x: h.cx - hw - ww, y: fy - ch, w: ww, h: ch, type: 'pillar', isBrambleWall: true };
    h.rightWallBox = { x: h.cx + hw, y: fy - ch, w: ww, h: ch, type: 'pillar', isBrambleWall: true };
  }
  G.arenaHazards.push(h);
  return h;
}

export function clearArenaHazards(owner = null) {
  if (!Array.isArray(G.arenaHazards)) {
    G.arenaHazards = [];
    return;
  }
  if (!owner) {
    G.arenaHazards.length = 0;
    return;
  }
  for (let i = G.arenaHazards.length - 1; i >= 0; i--) {
    if (G.arenaHazards[i].owner === owner) G.arenaHazards.splice(i, 1);
  }
}

export function hasActiveArenaHazard(kind, owner = null) {
  if (!Array.isArray(G.arenaHazards)) return false;
  for (let i = 0; i < G.arenaHazards.length; i++) {
    const h = G.arenaHazards[i];
    if (h.kind === kind && h.phase !== 'fade' && (!owner || h.owner === owner)) return true;
  }
  return false;
}

export function damageArenaHazardsInBox(box, dmg, heavy = false, hitIds = null) {
  if (!Array.isArray(G.arenaHazards) || G.arenaHazards.length === 0) return false;
  let hitAny = false;
  for (let i = G.arenaHazards.length - 1; i >= 0; i--) {
    const h = G.arenaHazards[i];
    if (h.kind !== 'brambleCage' || h.phase !== 'active' || h.hp <= 0) continue;
    if (hitIds && hitIds.has(h.id)) continue;
    const hitL = h.leftWallBox && aabbOverlap(box, h.leftWallBox);
    const hitR = h.rightWallBox && aabbOverlap(box, h.rightWallBox);
    if (!hitL && !hitR) continue;

    hitAny = true;
    if (hitIds) hitIds.add(h.id);
    const effDmg = Math.max(12, Math.round(dmg * (heavy ? 2.25 : 1.0)));
    h.hp = Math.max(0, h.hp - effDmg);
    h.hurtFlash = 0.14;
    const fx = hitL ? (h.leftWallBox.x + h.leftWallBox.w * 0.5) : (h.rightWallBox.x + h.rightWallBox.w * 0.5);
    const fy = (h.y !== undefined ? h.y : FLOOR_Y) - (h.h || 148) * 0.45;
    audio.playBarkCrack();
    addShake(heavy ? 6.5 : 3.5);
    spawnParticles(fx, fy, heavy ? 14 : 8, { color: '#4ade80', speed: 210, spark: true, grav: 240, life: 0.34 });

    if (h.hp <= 0) {
      h.phase = 'fade';
      h.timer = 0.12;
      audio.playShieldBreak();
      addShake(9);
      punchZoom(1.028);
      spawnShockwave(h.cx, fy, 128, '#6ee7b7', 4.2, 0.30);
      spawnParticles(h.cx - (h.halfW || 96), fy, 16, { color: '#4ade80', speed: 260, spark: true, grav: 260, life: 0.44 });
      spawnParticles(h.cx + (h.halfW || 96), fy, 16, { color: '#6ee7b7', speed: 260, spark: true, grav: 260, life: 0.44 });
      if (G.player && G.player.hp > 0) {
        G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 18);
      }
      spawnFloatText(h.cx, (h.y !== undefined ? h.y : FLOOR_Y) - (h.h || 148) - 10, t('combat.cageBreak'), '#6ee7b7', 20, 1.0);
    }
  }
  return hitAny;
}

export function updateArenaHazards(dt, applyIncomingAttackToPlayer) {
  if (!Array.isArray(G.arenaHazards) || G.arenaHazards.length === 0) return;
  const p = G.player;
  const pAlive = !!(p && p.hp > 0);
  const pcx = pAlive ? (p.x + p.w * 0.5) : 0;
  const pcy = pAlive ? (p.y + p.h * 0.5) : 0;
  const pCanBeHit = pAlive && p.iframeTimer <= 0 && p.execTimer <= 0 && p.grappleState === 'none';

  for (let i = G.arenaHazards.length - 1; i >= 0; i--) {
    const h = G.arenaHazards[i];
    if (h.hurtFlash > 0) h.hurtFlash = Math.max(0, h.hurtFlash - dt);
    if (h.hitCd > 0) h.hitCd = Math.max(0, h.hitCd - dt);

    if (h.owner && (!h.owner.alive || !h.owner.awake) && h.phase !== 'fade') {
      h.phase = 'fade';
      h.timer = Math.min(h.fadeDur, 0.22);
    }

    h.timer -= dt;
    const fy = h.y !== undefined ? h.y : FLOOR_Y;

    if (h.phase === 'telegraph') {
      if (h.kind === 'thornCarpet' && Math.random() < 16 * dt) {
        spawnParticles(h.x + Math.random() * h.w, fy - 4, 1, { color: '#4ade80', speed: 45, grav: -80, life: 0.24 });
      } else if (h.kind === 'rootSpike' && Math.random() < 22 * dt) {
        spawnParticles(h.x + (Math.random() - 0.5) * 28, fy - 4, 1, { color: '#6ee7b7', speed: 55, grav: -110, life: 0.24 });
      } else if (h.kind === 'solarPillar' && Math.random() < 18 * dt) {
        spawnParticles(h.x + (Math.random() - 0.5) * (h.w || 68) * 0.7, fy - 6, 1, { color: '#fef08a', speed: 60, grav: -180, life: 0.30 });
      } else if (h.kind === 'moltenGeyser' && Math.random() < 20 * dt) {
        spawnParticles(h.x + (Math.random() - 0.5) * (h.w || 62) * 0.8, fy - 4, 1, { color: '#fb923c', speed: 75, grav: -150, life: 0.28 });
      } else if (h.kind === 'galeTornado' && Math.random() < 18 * dt) {
        spawnParticles(h.x + (Math.random() - 0.5) * 44, fy - 8, 1, { color: '#bae6fd', speed: 80, grav: -180, life: 0.26 });
      } else if (h.kind === 'frostPatch' && Math.random() < 16 * dt) {
        spawnParticles(h.x + Math.random() * (h.w || 320), fy - 4, 1, { color: '#bae6fd', speed: 45, grav: -70, life: 0.26 });
      } else if (h.kind === 'iceLance') {
        // Track player smoothly during first 68% of telegraph, then lock angle for fair evasion!
        const lockThresh = Math.min(0.24, h.maxTelegraph * 0.32);
        if (h.timer > lockThresh && pAlive) {
          h.angle = Math.atan2(pcy - h.oy, pcx - h.ox);
          h.locked = false;
        } else {
          h.locked = true;
        }
      }
      if (h.timer <= 0) {
        h.phase = 'active';
        h.timer = h.activeDur;
        h.didHit = false;
        h.hitCd = 0;
        if (h.kind === 'thornCarpet') {
          audio.playBarkCrack();
          addShake(6);
          spawnParticles(h.x + h.w * 0.5, fy - 12, 18, { color: '#4ade80', speed: 210, grav: 120, life: 0.36 });
        } else if (h.kind === 'brambleCage') {
          audio.playBarkCrack();
          audio.playBellQuake();
          addShake(8);
          const hw = h.halfW || 96;
          spawnShockwave(h.cx - hw, fy - 40, 62, '#4ade80', 3.4, 0.26);
          spawnShockwave(h.cx + hw, fy - 40, 62, '#4ade80', 3.4, 0.26);
          spawnParticles(h.cx - hw, fy - 52, 12, { color: '#6ee7b7', speed: 180, grav: 120, life: 0.36 });
          spawnParticles(h.cx + hw, fy - 52, 12, { color: '#6ee7b7', speed: 180, grav: 120, life: 0.36 });
        } else if (h.kind === 'rootSpike') {
          audio.playBarkCrack();
          addShake(5.5);
          spawnShockwave(h.x, fy - 14, 72, '#4ade80', 3.4, 0.26);
          spawnParticles(h.x, fy - 36, 16, { color: '#6ee7b7', speed: 230, grav: 160, life: 0.42 });
        } else if (h.kind === 'solarPillar') {
          audio.playBellQuake();
          audio.playSlash(1.18, true);
          addShake(9);
          spawnShockwave(h.x, fy - 8, 108, COLORS.goldBright, 4.4, 0.32);
          spawnParticles(h.x, fy - 24, 20, { color: '#fef08a', speed: 260, spark: true, grav: -180, life: 0.45 });
        } else if (h.kind === 'prismBeam') {
          audio.playIaiSlash();
          audio.playBellChimeCast(3);
          addShake(7.5);
          spawnShockwave(h.ox, h.oy, 92, '#fef08a', 4.0, 0.28);
        } else if (h.kind === 'radiantCross') {
          audio.playBellQuake();
          audio.playIaiSlash();
          addShake(11);
          spawnShockwave(h.cx, h.cy, 155, '#fef08a', 4.8, 0.36);
          spawnParticles(h.cx, h.cy, 24, { color: COLORS.goldBright, speed: 300, spark: true, grav: 0, life: 0.42 });
        } else if (h.kind === 'moltenGeyser') {
          audio.playBellQuake();
          audio.playDetonate();
          addShake(8);
          spawnShockwave(h.x, fy - 10, 96, '#fb923c', 4.0, 0.30);
          spawnParticles(h.x, fy - 20, 18, { color: '#f59e0b', speed: 240, spark: true, grav: -120, life: 0.42 });
        } else if (h.kind === 'chainDrop') {
          audio.playHit(true, 3);
          audio.playBellQuake();
          addShake(10);
          spawnShockwave(h.x, fy - 8, 108, COLORS.goldBright, 4.4, 0.32);
          spawnParticles(h.x, fy - 14, 22, { color: '#fb923c', speed: 270, spark: true, grav: 280, life: 0.44 });
        } else if (h.kind === 'galeTornado') {
          audio.playWindBlade();
          audio.playTideRoar();
          addShake(6.5);
          spawnShockwave(h.x, fy - 24, 92, '#7dd3fc', 3.6, 0.28);
        } else if (h.kind === 'iceLance') {
          audio.playFrostShatter();
          audio.playIaiSlash();
          addShake(6.5);
          spawnShockwave(h.ox, h.oy, 56, '#bae6fd', 3.2, 0.22);
          spawnParticles(h.ox, h.oy, 12, { color: '#e0f2fe', speed: 220, spark: true, grav: 40, life: 0.34 });
        } else if (h.kind === 'frostPatch') {
          audio.playFrostShatter();
          addShake(6);
          spawnParticles(h.x + (h.w || 320) * 0.5, fy - 12, 18, { color: '#bae6fd', speed: 200, spark: true, grav: 110, life: 0.38 });
        }
      }
      continue;
    }

    if (h.phase === 'active') {
      if (h.kind === 'thornCarpet') {
        if (Math.random() < 10 * dt) {
          spawnParticles(h.x + Math.random() * h.w, fy - 14, 1, { color: '#4ade80', speed: 40, grav: -50, life: 0.30 });
        }
        if (pAlive && aabbOverlap({ x: h.x + 6, y: fy - (h.h || 30), w: Math.max(10, h.w - 12), h: (h.h || 30) + 4 }, p)) {
          p.webSlowTimer = Math.max(p.webSlowTimer || 0, 0.42);
          if (pCanBeHit && h.hitCd <= 0 && p.dashTimer <= 0) {
            h.hitCd = 0.68;
            applyIncomingAttackToPlayer({ x: pcx - p.facing * 18, w: 0, isBoss: false }, h.dmg || 14, true, 120);
          }
        }
      } else if (h.kind === 'brambleCage') {
        const hw = h.halfW || 96;
        const ch = h.h || 148;
        const ww = h.wallW || 18;
        if (pCanBeHit && h.hitCd <= 0 && p.dashTimer <= 0) {
          const lSpike = { x: h.cx - hw - ww - 2, y: fy - ch + 8, w: ww + 6, h: ch - 8 };
          const rSpike = { x: h.cx + hw - 4, y: fy - ch + 8, w: ww + 6, h: ch - 8 };
          if (aabbOverlap(lSpike, p) || aabbOverlap(rSpike, p)) {
            h.hitCd = 0.72;
            const srcX = aabbOverlap(lSpike, p) ? (h.cx - hw) : (h.cx + hw);
            applyIncomingAttackToPlayer({ x: srcX, w: 0, isBoss: false }, 12, true, 145);
          }
        }
      } else if (h.kind === 'rootSpike') {
        if (!h.didHit && pCanBeHit) {
          const sw = h.w || 46;
          const sh = h.h || 112;
          if (aabbOverlap({ x: h.x - sw * 0.45, y: fy - sh, w: sw * 0.9, h: sh }, p)) {
            h.didHit = true;
            applyIncomingAttackToPlayer({ x: h.x, w: 0, isBoss: true }, h.dmg || 24, true, 230);
          }
        }
      } else if (h.kind === 'solarPillar') {
        const pw = h.w || 68;
        const topY = h.topY !== undefined ? h.topY : (fy - 660);
        if (Math.random() < 26 * dt) {
          spawnParticles(h.x + (Math.random() - 0.5) * pw * 0.8, fy - 12 - Math.random() * 240, 1, { color: '#fef9c3', speed: 110, spark: true, grav: -220, life: 0.30 });
        }
        if (pCanBeHit && h.hitCd <= 0) {
          if (aabbOverlap({ x: h.x - pw * 0.42, y: topY, w: pw * 0.84, h: fy - topY }, p)) {
            h.hitCd = 0.50;
            applyIncomingAttackToPlayer({ x: h.x, w: 0, isBoss: true }, h.dmg || 30, true, 230);
          }
        }
      } else if (h.kind === 'prismBeam') {
        const prog = 1 - Math.max(0, h.timer / Math.max(0.01, h.activeDur));
        const eased = prog * prog * (3 - 2 * prog);
        h.curAngle = h.startAngle + (h.endAngle - h.startAngle) * eased;
        if (h.followOwner && h.owner && h.owner.alive) {
          h.ox = h.owner.x + h.owner.w * 0.5;
          h.oy = h.owner.y + (h.ownerOffY !== undefined ? h.ownerOffY : 38);
        }
        const ex = h.ox + Math.cos(h.curAngle) * (h.len || 920);
        const ey = h.oy + Math.sin(h.curAngle) * (h.len || 920);
        if (pCanBeHit && h.hitCd <= 0) {
          const dist = pointToSegmentDist(pcx, pcy, h.ox, h.oy, ex, ey);
          if (dist < (h.width || 28) * 0.52 + 12) {
            h.hitCd = 0.48;
            applyIncomingAttackToPlayer({ x: h.ox, w: 0, isBoss: true }, h.dmg || 28, true, 220);
          }
        }
      } else if (h.kind === 'radiantCross') {
        const halfL = (h.len || 760) * 0.5;
        const baseA = h.baseAngle || 0;
        if (pCanBeHit && h.hitCd <= 0) {
          let hitRay = false;
          for (let r = 0; r < 2; r++) {
            const ang = baseA + r * Math.PI * 0.5;
            const cA = Math.cos(ang);
            const sA = Math.sin(ang);
            const dist = pointToSegmentDist(pcx, pcy, h.cx - cA * halfL, h.cy - sA * halfL, h.cx + cA * halfL, h.cy + sA * halfL);
            if (dist < (h.width || 30) * 0.48 + 12) { hitRay = true; break; }
          }
          if (hitRay) {
            h.hitCd = 0.48;
            applyIncomingAttackToPlayer({ x: h.cx, w: 0, isBoss: true }, h.dmg || 30, true, 235);
          }
        }
      } else if (h.kind === 'moltenGeyser') {
        const gw = h.w || 62;
        const gh = h.h || 205;
        if (Math.random() < 22 * dt) {
          spawnParticles(h.x + (Math.random() - 0.5) * gw * 0.85, fy - 8 - Math.random() * gh * 0.8, 1, {
            color: Math.random() < 0.5 ? '#fb923c' : '#fde047', speed: 95, spark: true, grav: -180, life: 0.30
          });
        }
        if (pCanBeHit && h.hitCd <= 0 && p.dashTimer <= 0) {
          if (aabbOverlap({ x: h.x - gw * 0.42, y: fy - gh, w: gw * 0.84, h: gh }, p)) {
            h.hitCd = 0.62;
            applyIncomingAttackToPlayer({ x: h.x, w: 0, isBoss: true }, h.dmg || 22, true, 210);
          }
        }
      } else if (h.kind === 'chainDrop') {
        const cw = h.w || 58;
        const topY = h.topY !== undefined ? h.topY : (fy - 580);
        if (!h.didHit && pCanBeHit) {
          if (aabbOverlap({ x: h.x - cw * 0.46, y: topY, w: cw * 0.92, h: fy - topY }, p)) {
            h.didHit = true;
            applyIncomingAttackToPlayer({ x: h.x, w: 0, isBoss: true }, h.dmg || 28, true, 250);
          }
        }
      } else if (h.kind === 'galeTornado') {
        const tw = h.w || 68;
        const th = h.h || 265;
        h.x += (h.vx || 0) * dt;
        if (h.minX !== undefined && h.x < h.minX) { h.x = h.minX; h.vx = Math.abs(h.vx || 175); }
        if (h.maxX !== undefined && h.x > h.maxX) { h.x = h.maxX; h.vx = -Math.abs(h.vx || 175); }
        if (Math.random() < 24 * dt) {
          spawnParticles(h.x + (Math.random() - 0.5) * tw, fy - 12 - Math.random() * th * 0.85, 1, {
            color: '#e0f2fe', speed: 110, grav: -160, life: 0.28
          });
        }
        if (pAlive && p.dashTimer <= 0 && p.grappleState === 'none' && p.execTimer <= 0) {
          const distX = Math.abs(pcx - h.x);
          if (distX < tw * 1.15 && p.y + p.h > fy - th && p.y < fy) {
            // Subtle cyclone pull & lift when close to tornado edge
            p.vx += (h.x > pcx ? 1 : -1) * 140 * dt;
            if (pCanBeHit && h.hitCd <= 0 && distX < tw * 0.50) {
              h.hitCd = 0.62;
              p.vy = Math.min(p.vy, -320);
              applyIncomingAttackToPlayer({ x: h.x, w: 0, isBoss: true }, h.dmg || 20, true, 220);
            }
          }
        }
      } else if (h.kind === 'iceLance') {
        const len = h.len || 760;
        const ex = h.ox + Math.cos(h.angle) * len;
        const ey = h.oy + Math.sin(h.angle) * len;
        if (!h.didHit && pCanBeHit) {
          const dist = pointToSegmentDist(pcx, pcy, h.ox, h.oy, ex, ey);
          if (dist < (h.width || 22) * 0.55 + 11) {
            h.didHit = true;
            applyIncomingAttackToPlayer({ x: h.ox, w: 0, isBoss: true, inflictsFrost: h.inflictsFrost || 24 }, h.dmg || 26, true, 225);
          }
        }
      } else if (h.kind === 'frostPatch') {
        const pw = h.w || 320;
        const ph = h.h || 28;
        if (Math.random() < 12 * dt) {
          spawnParticles(h.x + Math.random() * pw, fy - 12, 1, { color: '#bae6fd', speed: 35, grav: -45, life: 0.30 });
        }
        if (pAlive && aabbOverlap({ x: h.x + 6, y: fy - ph, w: Math.max(10, pw - 12), h: ph + 4 }, p)) {
          p.frostMeter = Math.min(98, (p.frostMeter || 0) + 26 * dt);
          p.frostChilledTimer = Math.max(p.frostChilledTimer || 0, 0.55);
          if (pCanBeHit && h.hitCd <= 0 && p.dashTimer <= 0) {
            h.hitCd = 0.76;
            applyIncomingAttackToPlayer({ x: pcx - p.facing * 16, w: 0, isBoss: false, inflictsFrost: 16 }, h.dmg || 12, true, 110);
          }
        }
      }

      if (h.timer <= 0) {
        h.phase = 'fade';
        h.timer = h.fadeDur;
      }
      continue;
    }

    if (h.phase === 'fade') {
      if (h.timer <= 0) {
        G.arenaHazards.splice(i, 1);
      }
    }
  }
}
