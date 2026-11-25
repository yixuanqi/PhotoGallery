// Three Non-Humanoid Biome-Exclusive Enemies AI (v45.2):
// updateWeaver (墨丝织蛛) | updateCrawler (熔铜炉奴) | updateCantor (金钟执灯侍)
import { COLORS, GRAVITY } from '../config.js';
import { G, addShake, damp } from '../state.js';
import { audio } from '../audio.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY, hasLineOfSight } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t } from '../i18n.js';

/* ---------- 1. FOREST EXCLUSIVE: 墨丝织蛛 (Ink-Silk Weaver) ---------- */
export function updateWeaver(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.webCd > 0) e.webCd = Math.max(0, e.webCd - dt);
  if (e.dropCd > 0) e.dropCd = Math.max(0, e.dropCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7.5 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const ex = e.x + e.w * 0.5;
  const ey = e.y + e.h * 0.5;
  const dx = px - ex;
  const dy = py - ey;
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 86;
    if (e.x <= e.minX) e.facing = 1;
    if (e.x >= e.maxX) e.facing = -1;
    if (absDx < 360 && Math.abs(dy) < 160 && G.player.hp > 0) {
      e.state = 'chase';
      e.facing = dx >= 0 ? 1 : -1;
    }
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 490 || Math.abs(dy) > 250) {
      e.state = 'patrol';
    } else if (e.stateTimer <= 0 && Math.abs(dy) < 130) {
      const lowHp = e.hp <= e.maxHp * 0.58;
      if ((e.webCd || 0) <= 0 && (lowHp || (absDx > 135 && absDx < 310))) {
        // Back-hop and spit sticky ink-web orb!
        e.state = 'windup';
        e.attackKind = 'webShot';
        e.stateTimer = 0.54;
        e.vx = -e.facing * 235;
        e.vy = -210;
        e.didHit = false;
        audio.playWraithShot();
      } else if ((e.dropCd || 0) <= 0 && absDx < 200 && e.grounded && Math.random() < 0.36) {
        // Leap onto silk thread -> crimson peril ambush drop!
        e.state = 'windup';
        e.attackKind = 'silkDrop';
        e.silkTopY = e.y - 165;
        e.stateTimer = 0.68;
        e.vy = -410;
        e.vx = e.facing * 85;
        e.didHit = false;
        audio.playDangerAlert();
      } else if (absDx < 118) {
        // Swift dual-mandible 2-hit combo
        e.state = 'windup';
        e.attackKind = 'fangCombo';
        e.comboIdx = 0;
        e.stateTimer = 0.36;
        e.vx = 0;
        e.didHit = false;
        audio.playGlintCue(false);
      } else {
        e.vx = e.facing * 165;
      }
    } else {
      e.vx = absDx > 88 ? e.facing * 165 : e.vx * damp(0.8, dt);
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.16) e.facing = dx >= 0 ? 1 : -1;
    if (e.attackKind === 'silkDrop') {
      // Hang suspended on silk thread before plummeting!
      e.vx *= damp(0.82, dt);
      if (e.vy > 0) e.vy *= damp(0.35, dt);
    } else {
      e.vx *= damp(0.84, dt);
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      if (e.attackKind === 'webShot') {
        e.webCd = 4.2;
        e.stateTimer = 0.24;
        const ang = Math.atan2(py - ey, px - ex);
        audio.playSporeBurst();
        G.projectiles.push({
          owner: 'enemy', source: e, kind: 'webOrb',
          x: ex + e.facing * 18, y: ey - 4,
          vx: Math.cos(ang) * 345, vy: Math.sin(ang) * 345,
          r: 12, dmg: 14, posture: 22, life: 2.3, maxLife: 2.3,
          reflected: false, hitIds: new Set()
        });
        spawnParticles(ex + e.facing * 18, ey - 4, 10, { color: '#6ee7b7', speed: 120, life: 0.28 });
      } else if (e.attackKind === 'silkDrop') {
        e.dropCd = 4.8;
        e.stateTimer = 0.38;
        const dlen = Math.max(1, Math.hypot(dx, Math.max(40, dy)));
        e.vx = (dx / dlen) * 490;
        e.vy = Math.max(320, (dy / dlen) * 520);
        audio.playSlash(0.88, true);
        G.slashes.push({ x: ex, y: ey, facing: e.facing, type: 'enemyRedThrust', life: 0.24, maxLife: 0.24 });
      } else {
        e.stateTimer = 0.17;
        e.vx = e.facing * (e.comboIdx === 1 ? 310 : 220);
        audio.playSlash(1.08 + e.comboIdx * 0.14, e.comboIdx === 1);
        G.slashes.push({ x: ex + e.facing * 24, y: ey, facing: e.facing, type: e.comboIdx === 1 ? 'bossUpSweep' : 'enemyThrust', life: 0.19, maxLife: 0.19 });
      }
    }
  } else if (e.state === 'attack') {
    if (e.attackKind !== 'silkDrop') e.vx *= damp(0.88, dt);
    if (e.attackKind !== 'webShot' && !e.didHit) {
      const isRed = e.attackKind === 'silkDrop';
      const reach = isRed ? 68 : 78;
      const hitBox = isRed
        ? { x: e.x - 10, y: e.y - 4, w: e.w + 20, h: e.h + 12 }
        : { x: ex + (e.facing > 0 ? -2 : -reach + 2), y: e.y - 4, w: reach, h: e.h + 10 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, isRed ? 24 : (e.comboIdx === 1 ? 18 : 14), isRed, isRed ? 245 : 175);
      }
    }
    if (e.stateTimer <= 0 || (e.attackKind === 'silkDrop' && e.grounded && e.vy >= 0 && e.stateTimer < 0.28)) {
      if (e.attackKind === 'fangCombo' && e.comboIdx === 0) {
        e.comboIdx = 1;
        e.state = 'windup';
        e.stateTimer = 0.26;
        e.didHit = false;
      } else {
        e.state = 'recover';
        e.stateTimer = 0.72;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 0.28; }
  }

  if (!(e.state === 'windup' && e.attackKind === 'silkDrop' && e.vy >= -20)) {
    e.vy += GRAVITY * dt;
  }
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 12 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.065;
  if (e.x < e.minX - 70) e.x = e.minX - 70;
  if (e.x > e.maxX + 70) e.x = e.maxX + 70;
}

/* ---------- 2. CRYPT / WELL EXCLUSIVE: 熔铜炉奴 (Cinder-Bell Crawler) ---------- */
export function updateCrawler(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.flippedTimer > 0) e.flippedTimer = Math.max(0, e.flippedTimer - dt);
  if (e.spitCd > 0) e.spitCd = Math.max(0, e.spitCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6.5 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const ex = e.x + e.w * 0.5;
  const ey = e.y + e.h * 0.5;
  const dx = px - ex;
  const dy = Math.abs(py - ey);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  // Ambient furnace embers trailing behind while moving
  if (Math.abs(e.vx) > 25 && Math.random() < 12 * dt) {
    spawnParticles(ex - e.facing * 12, e.y + e.h - 4, 1, { color: '#fb923c', speed: 55, grav: -60, life: 0.34 });
  }

  if (e.state === 'stagger') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.flippedTimer = 0;
      e.state = 'chase';
      e.posture = e.maxPosture * 0.30;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 64;
    if (e.x <= e.minX) e.facing = 1;
    if (e.x >= e.maxX) e.facing = -1;
    if (absDx < 370 && dy < 150 && G.player.hp > 0) {
      e.state = 'chase';
      e.facing = dx >= 0 ? 1 : -1;
    }
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 500 || dy > 250) {
      e.state = 'patrol';
    } else if (absDx < 270 && dy < 110 && e.stateTimer <= 0) {
      const wantsSpit = (e.spitCd || 0) <= 0 && (absDx > 165 || Math.random() < 0.42);
      e.attackKind = wantsSpit ? 'moltenSpit' : 'emberRoll';
      e.state = 'windup';
      e.stateTimer = wantsSpit ? 0.56 : 0.52;
      e.didHit = false;
      e.vx = wantsSpit ? 0 : -e.facing * 95;
      audio.playGlintCue(!wantsSpit);
    } else {
      e.vx = absDx > 95 ? e.facing * 116 : e.vx * damp(0.8, dt);
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.16) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.84, dt);
    if (Math.random() < 24 * dt) {
      spawnParticles(ex, e.y + 8, 1, { color: COLORS.goldBright, speed: 75, grav: -80, life: 0.26 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      if (e.attackKind === 'moltenSpit') {
        e.spitCd = 4.4;
        e.stateTimer = 0.28;
        audio.playSporeBurst();
        addShake(4.5);
        [0.82, 1.0, 1.22].forEach((spdM, idx) => {
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'emberGlob',
            x: ex + e.facing * 20, y: e.y + 10,
            vx: e.facing * (185 + idx * 75) * spdM,
            vy: -(250 + idx * 45),
            grav: 620,
            r: 10, dmg: 17, posture: 22, life: 1.9, maxLife: 1.9,
            reflected: false, hitIds: new Set()
          });
        });
        spawnParticles(ex + e.facing * 20, e.y + 10, 14, { color: '#fb923c', speed: 180, spark: true, life: 0.34 });
      } else {
        e.stateTimer = 0.62;
        e.vx = e.facing * 395;
        audio.playSlash(0.72, true);
        spawnShockwave(ex, ey, 58, '#fb923c', 3.0, 0.24);
      }
    }
  } else if (e.state === 'attack') {
    if (e.attackKind === 'emberRoll') {
      e.vx = e.facing * 390;
      if (Math.random() < 34 * dt) {
        spawnParticles(ex, e.y + e.h - 4, 1, { color: COLORS.goldBright, speed: 120, spark: true, grav: 240, life: 0.26 });
      }
      if (!e.didHit && aabbOverlap({ x: e.x - 4, y: e.y - 2, w: e.w + 8, h: e.h + 4 }, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 22, false, 260);
      }
      if (e.x <= e.minX - 55 || e.x >= e.maxX + 55) {
        e.stateTimer = 0;
      }
    } else {
      e.vx *= damp(0.84, dt);
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.88;
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.82, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 0.32; }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 10 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.055;
  if (e.x < e.minX - 65) e.x = e.minX - 65;
  if (e.x > e.maxX + 65) e.x = e.maxX + 65;
}

/* ---------- 3. ASCENT / BELFRY EXCLUSIVE: 金钟执灯侍 (Gilded Belfry Cantor) ---------- */
export function updateCantor(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.blinkCd > 0) e.blinkCd = Math.max(0, e.blinkCd - dt);
  if (e.repelCd > 0) e.repelCd = Math.max(0, e.repelCd - dt);
  if (e.quickHitDecay > 0) {
    e.quickHitDecay = Math.max(0, e.quickHitDecay - dt);
    if (e.quickHitDecay <= 0) e.quickHits = 0;
  }
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7.0 * dt);

  e.bobPhase = (e.bobPhase || 0) + dt * 2.6;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const ex = e.x + e.w * 0.5;
  const ey = e.y + e.h * 0.5;
  const dx = px - ex;
  const dy = py - ey;
  const dist = Math.hypot(dx, dy);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.84, dt);
    const groundBelow = getGroundSurfaceY(ex, e.y + e.h);
    e.vy = Math.min(200, (groundBelow - e.h - 10 - e.y) * 3.8);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.stateTimer <= 0) {
      e.state = 'hover';
      e.stateTimer = 0.85;
      e.posture = e.maxPosture * 0.28;
    }
    if (e.cloak) updateCloak(e.cloak, ex, e.y + 22, e.facing, -e.vx * 0.3, dt);
    return;
  }

  if (e.state === 'hover') {
    const tx = e.homeX + Math.sin(e.bobPhase * 0.55) * 65;
    const ty = e.homeY + Math.cos(e.bobPhase * 0.85) * 18;
    e.vx = (tx - e.x) * 2.4;
    e.vy = (ty - e.y) * 2.6;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.facing = dx >= 0 ? 1 : -1;

    if (dist < 520 && Math.abs(dy) < 250 && e.stateTimer <= 0 && hasLineOfSight(ex, ey, px, py)) {
      if ((e.blinkCd || 0) <= 0 && (dist > 220 || Math.random() < 0.42)) {
        // Teleport behind/near player (clamped strictly to own room vertical band so it NEVER clips through floors/ceilings!)
        e.blinkCd = 4.6;
        spawnParticles(ex, ey, 16, { color: COLORS.goldBright, speed: 200, spark: true, life: 0.34 });
        const destX = px - G.player.facing * 88 - e.w * 0.5;
        const clampedX = Math.max(e.homeX - 280, Math.min(e.homeX + 280, destX));
        const gY = getGroundSurfaceY(clampedX + e.w * 0.5, Math.min(e.homeY + 180, py + 40));
        const rawY = Math.min(gY - e.h - 12, py - e.h * 0.55);
        e.x = clampedX;
        e.y = Math.max(e.homeY - 170, Math.min(e.homeY + 170, rawY));
        e.facing = (px - (e.x + e.w * 0.5)) >= 0 ? 1 : -1;
        audio.playShadowBlink();
        audio.playGlintCue(false);
        spawnShockwave(e.x + e.w * 0.5, e.y + e.h * 0.5, 68, COLORS.goldBright, 3.2, 0.26);
        e.state = 'windup';
        e.attackKind = 'blinkSlash';
        e.stateTimer = 0.44;
        e.didHit = false;
      } else {
        e.state = 'windup';
        e.attackKind = 'triChimeVolley';
        e.volleyLeft = 3;
        e.volleySubTimer = 0;
        e.stateTimer = 0.54;
        audio.playResonanceBell(587.33, false);
      }
    }
  } else if (e.state === 'windup') {
    e.vx *= damp(0.80, dt);
    e.vy *= damp(0.80, dt);
    if (e.stateTimer > 0.14) e.facing = dx >= 0 ? 1 : -1;
    if (Math.random() < 26 * dt) {
      spawnParticles(ex, ey - 10, 1, { color: COLORS.goldBright, speed: 70, grav: -30, life: 0.24 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      if (e.attackKind === 'blinkSlash') {
        e.stateTimer = 0.22;
        e.vx = e.facing * 260;
        audio.playSlash(1.12, true);
        G.slashes.push({ x: ex + e.facing * 28, y: ey, facing: e.facing, type: 'bossSweep', life: 0.22, maxLife: 0.22 });
      } else {
        e.stateTimer = 0.44;
        e.volleySubTimer = 0;
      }
    }
  } else if (e.state === 'attack') {
    e.x += e.vx * dt;
    e.vx *= damp(0.86, dt);
    if (e.attackKind === 'blinkSlash') {
      if (!e.didHit) {
        const reach = 94;
        const hitBox = { x: ex + (e.facing > 0 ? -4 : -reach + 4), y: e.y + 8, w: reach, h: 58 };
        if (aabbOverlap(hitBox, G.player)) {
          e.didHit = true;
          applyIncomingAttackToPlayer(e, 20, false, 210);
        }
      }
    } else if (e.attackKind === 'triChimeVolley') {
      e.volleySubTimer -= dt;
      if ((e.volleyLeft || 0) > 0 && e.volleySubTimer <= 0) {
        e.volleyLeft--;
        e.volleySubTimer = 0.15;
        const a = Math.atan2(py - (ey - 6), px - ex);
        audio.playWraithShot();
        G.projectiles.push({
          owner: 'enemy', source: e, kind: 'wraithOrb',
          x: ex + Math.cos(a) * 20, y: ey - 6 + Math.sin(a) * 20,
          vx: Math.cos(a) * 375, vy: Math.sin(a) * 375,
          r: 11, dmg: 16, posture: 24, life: 2.4, maxLife: 2.4,
          reflected: false, hitIds: new Set()
        });
      }
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 1.15;
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    e.vy *= damp(0.84, dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.stateTimer <= 0) {
      e.state = 'hover';
      e.stateTimer = 0.65;
    }
  }

  if (e.cloak) updateCloak(e.cloak, ex, e.y + 22, e.facing, -e.vx * 0.3, dt);
}
