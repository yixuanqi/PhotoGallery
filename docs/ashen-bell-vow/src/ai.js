// Enemy AI (Sentinel, Lantern Wraith, Bell Golem) & Boss AI (断钟骑士·晦 & 沉渊铸钟师·寂)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY } from './config.js';
import { G, addShake } from './state.js';
import { audio } from './audio.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from './vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY } from './physics.js';
import { applyIncomingAttackToPlayer } from './combat.js';

export function updateEnemy(e, dt) {
  if (!e.alive) return;
  if (e.wardShield > 0) e.wardShield = Math.max(0, e.wardShield - dt);
  if (e.kind === 'wraith') updateWraith(e, dt);
  else if (e.kind === 'golem') updateGolem(e, dt);
  else if (e.kind === 'priest') updatePriest(e, dt);
  else if (e.kind === 'duelist') updateDuelist(e, dt);
  else if (e.kind === 'leech') updateLeech(e, dt);
  else updateSentinel(e, dt);
}

export function updatePriest(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const dx = px - cx;
  const dist = Math.hypot(dx, py - cy);
  e.facing = dx >= 0 ? 1 : -1;
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= 0.85;
    e.chantTargetId = null;
    if (e.stateTimer <= 0) {
      e.state = 'idle';
      e.posture = e.maxPosture * 0.28;
      e.stateTimer = 0.9;
    }
  } else if (e.state === 'idle') {
    e.vx *= 0.8;
    if (e.stateTimer <= 0 && dist < 640) {
      // Find nearest living non-priest ally to bless with Golden Bell Barrier
      let bestAlly = null;
      let bestD = 560;
      for (let i = 0; i < G.enemies.length; i++) {
        const a = G.enemies[i];
        if (!a || !a.alive || a === e || a.kind === 'priest') continue;
        const ad = Math.hypot((a.x + a.w / 2) - cx, (a.y + a.h / 2) - cy);
        if (ad < bestD) { bestD = ad; bestAlly = a; }
      }
      if (dist < 115) {
        // Close-range defensive bell knockback pulse
        e.state = 'pulse';
        e.stateTimer = 0.56;
        e.didHit = false;
        e.chantTargetId = null;
      } else if (bestAlly) {
        e.state = 'chant';
        e.stateTimer = 0.95;
        e.chantTargetId = bestAlly.id;
        audio.playResonanceBell(587.33, false);
      } else if (dist < 480) {
        // No ally left: self-channel golden ward orb
        e.state = 'chant';
        e.stateTimer = 0.88;
        e.chantTargetId = null;
      }
    }
  } else if (e.state === 'chant') {
    e.vx *= 0.8;
    if (Math.random() < 0.45) {
      spawnParticles(cx, e.y + 8, 1, { color: COLORS.goldBright, speed: 65, grav: -90, life: 0.34 });
    }
    if (e.stateTimer <= 0) {
      const ally = e.chantTargetId ? G.enemies.find(a => a && a.alive && a.id === e.chantTargetId) : null;
      if (ally) {
        ally.wardShield = 6.5;
        audio.playPogoLantern();
        spawnShockwave(cx, e.y + 12, 72, COLORS.goldBright, 2.8, 0.28);
        spawnShockwave(ally.x + ally.w / 2, ally.y + ally.h * 0.45, 76, COLORS.goldBright, 3.2, 0.32);
        spawnFloatText(ally.x + ally.w / 2, ally.y - 24, '钟佑护盾!', COLORS.goldBright, 16, 0.85);
      } else {
        // Launch a golden parryable resonance orb if solo
        const len = Math.max(1, dist);
        audio.playWraithShot();
        G.projectiles.push({
          owner: 'enemy',
          source: e,
          kind: 'wraithOrb',
          x: cx + e.facing * 16,
          y: e.y + 20,
          vx: (dx / len) * 335,
          vy: ((py - (e.y + 20)) / len) * 335,
          r: 12,
          dmg: 18,
          posture: 28,
          life: 2.5,
          maxLife: 2.5,
          reflected: false,
          hitIds: new Set()
        });
      }
      e.chantTargetId = null;
      e.state = 'recover';
      e.stateTimer = 2.2;
    }
  } else if (e.state === 'pulse') {
    e.vx *= 0.8;
    if (e.stateTimer <= 0.14 && !e.didHit) {
      e.didHit = true;
      audio.playPogoLantern();
      spawnShockwave(cx, cy, 118, COLORS.goldBright, 3.6, 0.28);
      if (dist < 116) applyIncomingAttackToPlayer(e, 16, false, 280);
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 1.2;
    }
  } else if (e.state === 'recover') {
    e.vx *= 0.82;
    if (e.stateTimer <= 0) {
      e.state = 'idle';
      e.stateTimer = 0.6;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  updateCloak(e.cloak, cx - e.facing * 6, e.y + 20, e.facing, -e.vx * 0.35, dt);
}

export function updateDuelist(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= 0.85;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 88;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 360 && Math.abs(dy) < 120) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 92) e.vx = e.facing * 178;
    else e.vx *= 0.8;
    if (absDx < 142 && Math.abs(dy) < 86 && e.stateTimer <= 0) {
      e.state = 'windup';
      e.comboIdx = 0;
      e.attackKind = Math.random() < 0.25 ? 'redDash' : 'combo3';
      e.stateTimer = e.attackKind === 'redDash' ? 0.62 : 0.34;
      e.didHit = false;
      e.vx = e.attackKind === 'redDash' ? -e.facing * 180 : 0;
      if (e.attackKind === 'redDash') audio.playDangerAlert();
    } else if (absDx > 520) {
      e.state = 'patrol';
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.16) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= 0.82;
    if (e.attackKind === 'combo3' && e.comboIdx === 2 && Math.random() < 0.45) {
      spawnParticles(e.x + e.w / 2 + e.facing * 12, e.y + 24, 1, { color: COLORS.goldBright, speed: 60, grav: -40, life: 0.2 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      const isRed = e.attackKind === 'redDash';
      const isFinisher = !isRed && e.comboIdx === 2;
      e.stateTimer = isRed ? 0.22 : (isFinisher ? 0.20 : 0.14);
      e.vx = e.facing * (isRed ? 520 : isFinisher ? 340 : 250);
      audio.playSlash(isRed ? 0.78 : (0.95 + e.comboIdx * 0.14), isFinisher || isRed);
      G.slashes.push({
        x: e.x + e.w / 2 + e.facing * 26,
        y: e.y + 30,
        facing: e.facing,
        type: isRed ? 'enemyRedThrust' : (e.comboIdx === 1 ? 'bossUpSweep' : (isFinisher ? 'bossSlam' : 'enemyThrust')),
        life: 0.2,
        maxLife: 0.2
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= 0.9;
    if (!e.didHit) {
      const isRed = e.attackKind === 'redDash';
      const reach = isRed ? 96 : (e.comboIdx === 2 ? 92 : 76);
      const hitBox = {
        x: e.x + e.w / 2 + (e.facing > 0 ? -4 : -reach + 4),
        y: e.y + 8,
        w: reach,
        h: 50
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        const dmg = isRed ? 26 : (e.comboIdx === 2 ? 24 : 15);
        applyIncomingAttackToPlayer(e, dmg, isRed, isRed ? 260 : 190);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.attackKind === 'combo3' && e.comboIdx < 2) {
        e.comboIdx++;
        e.state = 'windup';
        // Fast-Fast-Delayed rhythm (0.26s -> 0.62s slow-fast finisher!)
        e.stateTimer = e.comboIdx === 1 ? 0.25 : 0.62;
        e.didHit = false;
      } else {
        e.state = 'recover';
        e.stateTimer = 0.85;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= 0.84;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.stateTimer = 0.3;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 15 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.05;
  updateCloak(e.cloak, e.x + e.w / 2 - e.facing * 5, e.y + 18, e.facing, -e.vx * 0.5, dt);
}

export function updateLeech(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);
  e.pulsePhase += dt * 4.2;
  e.stateTimer -= dt;

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const dx = px - cx;
  const dy = py - cy;

  if (e.state === 'stagger') {
    e.vx *= 0.82;
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    if (e.stateTimer <= 0) {
      e.state = 'crawl';
      e.posture = e.maxPosture * 0.25;
      e.stateTimer = 2.0;
    }
  } else if (e.state === 'cling') {
    e.x = e.homeX;
    e.y = e.homeY;
    e.vx = 0;
    e.vy = 0;
    e.facing = dx >= 0 ? 1 : -1;
    if (Math.random() < 0.04) {
      spawnParticles(cx, e.y + e.h, 1, { color: COLORS.ink, speed: 20, grav: 240, life: 0.5 });
    }
    if (Math.abs(dx) < 175 && dy > -10 && dy < 340 && e.stateTimer <= 0) {
      e.state = 'telegraph';
      e.stateTimer = 0.42;
      e.didHit = false;
      audio.playSlash(1.4);
    }
  } else if (e.state === 'telegraph') {
    e.x = e.homeX + (Math.random() - 0.5) * 4;
    e.y = e.homeY;
    if (e.stateTimer <= 0) {
      e.state = 'drop';
      e.vx = Math.max(-130, Math.min(130, dx * 1.1));
      e.vy = 260;
      e.didHit = false;
    }
  } else if (e.state === 'drop') {
    e.vy = Math.min(920, e.vy + GRAVITY * 1.1 * dt);
    moveAndCollide(e, dt, false);
    if (!e.didHit && aabbOverlap({ x: e.x - 4, y: e.y, w: e.w + 8, h: e.h + 6 }, G.player)) {
      e.didHit = true;
      applyIncomingAttackToPlayer(e, 20, false, 200);
    }
    if (e.grounded) {
      audio.playLand();
      spawnParticles(cx, e.y + e.h, 10, { color: COLORS.ink, speed: 150, grav: 260, life: 0.35 });
      e.state = 'crawl';
      e.stateTimer = 2.6;
      e.didHit = false;
    }
  } else if (e.state === 'crawl') {
    e.facing = dx >= 0 ? 1 : -1;
    e.vx = e.facing * 112;
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    if (!e.didHit && aabbOverlap(e, G.player)) {
      e.didHit = true;
      applyIncomingAttackToPlayer(e, 16, false, 180);
      e.vx = -e.facing * 140;
    }
    if (e.stateTimer <= 0) {
      e.state = 'climb';
      e.stateTimer = 1.6;
    }
  } else if (e.state === 'climb') {
    const cdx = e.homeX - e.x;
    const cdy = e.homeY - e.y;
    const cd = Math.hypot(cdx, cdy);
    if (cd < 14 || e.stateTimer <= 0) {
      e.x = e.homeX; e.y = e.homeY; e.vx = 0; e.vy = 0;
      e.state = 'cling';
      e.stateTimer = 1.1;
    } else {
      e.x += (cdx / cd) * 320 * dt;
      e.y += (cdy / cd) * 320 * dt;
    }
  }
}

export function updateWraith(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

  e.bobPhase += dt * 2.8;
  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const dist = Math.hypot(dx, dy);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= 0.85;
    const groundBelow = getGroundSurfaceY(e.x + e.w / 2, e.y + e.h);
    e.vy = Math.min(180, (groundBelow - e.h - 16 - e.y) * 3.5);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.stateTimer <= 0) {
      e.state = 'hover';
      e.stateTimer = 1.1;
      e.posture = e.maxPosture * 0.25;
    }
  } else {
    const targetX = e.homeX + Math.sin(e.bobPhase * 0.65) * 48;
    const targetY = e.homeY + Math.cos(e.bobPhase) * 20;
    e.vx = (targetX - e.x) * 2.2;
    e.vy = (targetY - e.y) * 2.4;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.facing = dx >= 0 ? 1 : -1;

    if (e.state === 'hover') {
      if (dist < 490 && e.stateTimer <= 0) {
        e.state = 'windup';
        e.stateTimer = 0.68;
      }
    } else if (e.state === 'windup') {
      if (Math.random() < 0.4) {
        spawnParticles(e.x + e.w / 2 + e.facing * 14, e.y + 22, 1, { color: COLORS.goldBright, speed: 60, grav: 0, life: 0.24 });
      }
      if (e.stateTimer <= 0) {
        const len = Math.max(1, Math.hypot(dx, dy));
        audio.playWraithShot();
        G.projectiles.push({
          owner: 'enemy',
          source: e,
          kind: 'wraithOrb',
          x: e.x + e.w / 2 + e.facing * 16,
          y: e.y + 22,
          vx: (dx / len) * 325,
          vy: (dy / len) * 325,
          r: 12,
          dmg: 18,
          posture: 26,
          life: 2.6,
          maxLife: 2.6,
          reflected: false,
          hitIds: new Set()
        });
        e.state = 'recover';
        e.stateTimer = 1.9;
      }
    } else if (e.state === 'recover') {
      if (e.stateTimer <= 0) {
        e.state = 'hover';
        e.stateTimer = 0.6;
      }
    }
  }

  updateCloak(e.cloak, e.x + e.w / 2, e.y + 24, e.facing, -e.vx * 0.3, dt);
}

export function updateSentinel(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 8 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= 0.85;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.3;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 68;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 320 && Math.abs(dy) < 120) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 95) e.vx = e.facing * 125;
    else e.vx *= 0.8;

    if (absDx < 125 && Math.abs(dy) < 80 && e.stateTimer <= 0) {
      e.state = 'windup';
      e.attackKind = Math.random() < 0.28 ? 'redLunge' : 'thrust';
      e.stateTimer = e.attackKind === 'redLunge' ? 0.65 : 0.48;
      e.didHit = false;
      e.vx = 0;
      if (e.attackKind === 'redLunge') audio.playDangerAlert();
    } else if (absDx > 460) {
      e.state = 'patrol';
    }
  } else if (e.state === 'windup') {
    e.vx *= 0.82;
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.stateTimer = 0.2;
      e.vx = e.facing * (e.attackKind === 'redLunge' ? 420 : 240);
      audio.playSlash(0.85);
      G.slashes.push({
        x: e.x + e.w / 2 + e.facing * 26,
        y: e.y + 32,
        facing: e.facing,
        type: e.attackKind === 'redLunge' ? 'enemyRedThrust' : 'enemyThrust',
        life: 0.22,
        maxLife: 0.22
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= 0.9;
    if (!e.didHit) {
      const reach = e.attackKind === 'redLunge' ? 88 : 74;
      const hitBox = {
        x: e.x + e.w / 2 + (e.facing > 0 ? 0 : -reach),
        y: e.y + 10,
        w: reach,
        h: 44
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, e.attackKind === 'redLunge' ? 26 : 19, e.attackKind === 'redLunge', 230);
      }
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.85;
    }
  } else if (e.state === 'recover') {
    e.vx *= 0.84;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.stateTimer = 0.35;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 15 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.045;
  updateCloak(e.cloak, e.x + e.w / 2 - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.4, dt);
}

export function updateGolem(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.shieldBrokenTimer > 0) e.shieldBrokenTimer -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= 0.85;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 48;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 300 && Math.abs(dy) < 110) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 92) e.vx = e.facing * 82;
    else e.vx *= 0.8;

    if (absDx < 128 && Math.abs(dy) < 88 && e.stateTimer <= 0) {
      e.state = 'windup';
      e.attackKind = Math.random() < 0.34 ? 'redBash' : 'smash';
      e.stateTimer = e.attackKind === 'redBash' ? 0.72 : 0.62;
      e.didHit = false;
      e.vx = 0;
      if (e.attackKind === 'redBash') audio.playDangerAlert();
    } else if (absDx > 440 || Math.abs(dy) > 220) {
      e.state = 'patrol';
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.22) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= 0.82;
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.stateTimer = e.attackKind === 'redBash' ? 0.26 : 0.22;
      e.vx = e.facing * (e.attackKind === 'redBash' ? 390 : 175);
      audio.playSlash(0.72, true);
      G.slashes.push({
        x: e.x + e.w / 2 + e.facing * 32,
        y: e.y + 38,
        facing: e.facing,
        type: e.attackKind === 'redBash' ? 'enemyRedThrust' : 'bossSlam',
        life: 0.24,
        maxLife: 0.24
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= 0.9;
    if (!e.didHit) {
      const reach = e.attackKind === 'redBash' ? 86 : 94;
      const hitBox = {
        x: e.x + e.w / 2 + (e.facing > 0 ? -4 : -reach + 4),
        y: e.y + 8,
        w: reach,
        h: 68
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, e.attackKind === 'redBash' ? 28 : 24, e.attackKind === 'redBash', 260);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.attackKind === 'smash') {
        addShake(6);
        spawnShockwave(e.x + e.w / 2 + e.facing * 42, e.y + e.h - 4, 72, COLORS.goldBright, 3, 0.22);
      }
      e.state = 'recover';
      e.stateTimer = 0.92;
    }
  } else if (e.state === 'recover') {
    e.vx *= 0.84;
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.stateTimer = 0.4;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (e.x < e.minX - 60) e.x = e.minX - 60;
  if (e.x > e.maxX + 60) e.x = e.maxX + 60;
  updateCloak(e.cloak, e.x + e.w / 2 - e.facing * 8, e.y + 24, e.facing, -e.vx * 0.4, dt);
}

export function updateBoss(b, dt) {
  if (!b || !b.alive) return;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 7.5 * dt);

  b.bellSwing = Math.sin(G.globalTime * (b.phase === 2 ? 5.2 : 2.3)) * (b.phase === 2 ? 0.26 : 0.12);

  if (!b.awake) {
    b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, false);
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 24, b.facing, 0, dt);
    return;
  }

  // Trigger Phase 2 at <= 50% HP!
  if (b.phase === 1 && b.hp <= b.maxHp * 0.5 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.inkTideCd = 3.2; // Introduce signature aerial Ink Tide shortly after entering Phase 2
    b.vx = 0;
    audio.playBellToll();
    addShake(15);
    G.screenFlash = { alpha: 0.32, color: COLORS.crimson };
    spawnShockwave(b.x + b.w / 2, b.y + 40, 260, COLORS.crimsonBright, 5, 0.5);
    spawnFloatText(b.x + b.w / 2, b.y - 44, '第二幕 · 墨钟长鸣', COLORS.crimsonBright, 24, 1.8);
    // Spawn twin ground shadow waves
    G.groundWaves.push({ x: b.x + b.w / 2, y: FLOOR_Y, minX: 2620, maxX: 3760, vx: -420, w: 36, h: 48, life: 2.2, hit: false });
    G.groundWaves.push({ x: b.x + b.w / 2, y: FLOOR_Y, minX: 2620, maxX: 3760, vx: 420, w: 36, h: 48, life: 2.2, hit: false });
  }

  const dx = (G.player.x + G.player.w / 2) - (b.x + b.w / 2);
  const absDx = Math.abs(dx);
  b.stateTimer -= dt;
  if (b.phase === 2 && b.inkTideCd > 0) b.inkTideCd -= dt;

  if (b.state === 'phaseShift') {
    b.vx *= 0.8;
    if (Math.random() < 0.5) {
      spawnParticles(b.x + b.w / 2, b.y + 30, 2, { color: COLORS.crimsonBright, speed: 180, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.5;
    }
  } else if (b.state === 'stagger') {
    b.vx *= 0.85;
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.25;
      b.stateTimer = 0.45;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const moveSpd = b.phase === 2 ? 175 : 130;
    b.vx = absDx > 115 ? b.facing * moveSpd : b.vx * 0.85;

    if (b.stateTimer <= 0 && b.phase === 2 && b.inkTideCd <= 0 && !G.chapelTide) {
      // Phase 2 Signature Aerial Mechanic: Full-Chapel Crimson Ink Tide!
      b.moveKind = 'inkTide';
      b.state = 'windup';
      b.stateTimer = 1.05;
      b.windupDuration = 1.05;
      b.inkTideCd = 12.5;
      b.didHit = false;
      b.vx = 0;
      G.chapelTide = { phase: 'warn', timer: 1.05, maxTimer: 1.05, hitCd: 0, x0: 2648, w: 1090, floorY: FLOOR_Y, owner: b, lanternIds: ['lan_4', 'lan_5'], theme: 'crimson' };
      audio.playDangerAlert();
      audio.playBellToll();
      addShake(9);
      spawnFloatText(b.x + b.w / 2, b.y - 54, '危 · 猩红墨潮！钩索上天或击鸣悬灯', COLORS.crimsonBright, 21, 1.45);
    } else if (b.stateTimer <= 0 && absDx < 430) {
      // Choose next telegraph move
      const r = Math.random();
      if (b.phase === 2 && r < 0.28) {
        b.moveKind = 'redLeap';
        b.state = 'windup';
        b.stateTimer = 0.68;
        b.windupDuration = 0.68;
        audio.playDangerAlert();
      } else if (b.phase === 2 && r < 0.56) {
        b.moveKind = 'flurry4';
        b.comboIdx = 0;
        b.state = 'windup';
        b.stateTimer = 0.48;
        b.windupDuration = 0.48;
      } else if (absDx > 220 && r < 0.78) {
        b.moveKind = 'chargeThrust';
        b.state = 'windup';
        b.stateTimer = 0.58;
        b.windupDuration = 0.58;
      } else if (r < 0.55) {
        b.moveKind = 'combo2';
        b.comboIdx = 0;
        b.state = 'windup';
        b.stateTimer = 0.46;
        b.windupDuration = 0.46;
      } else {
        // Souls-like Delayed Overhead Slam (快慢刀!)
        b.moveKind = 'delaySlam';
        b.state = 'windup';
        b.stateTimer = 0.88;
        b.windupDuration = 0.88;
      }
      b.didHit = false;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    // Lock Boss facing during final 220ms of windup so Shift ink-dash cross-ups reward positioning!
    if (b.moveKind !== 'inkTide' && b.stateTimer > 0.22) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    b.vx *= 0.82;
    if (b.moveKind === 'delaySlam' && Math.random() < 0.45) {
      spawnParticles(b.x + b.w / 2 - b.facing * 8, b.y - 14, 1, { color: COLORS.goldBright, speed: 60, grav: -60, life: 0.24 });
    }
    if (b.moveKind === 'inkTide' && Math.random() < 0.65) {
      spawnParticles(b.x + b.w / 2 + (Math.random() - 0.5) * 80, FLOOR_Y - 6, 1, { color: COLORS.crimsonBright, speed: 95, grav: -180, life: 0.34 });
    }
    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      const bx = b.x + b.w / 2;
      const by = b.y + 46;
      if (b.moveKind === 'inkTide') {
        b.stateTimer = 1.35;
        b.vx = 0;
        if (G.chapelTide) {
          G.chapelTide.phase = 'surge';
          G.chapelTide.timer = 1.35;
          G.chapelTide.maxTimer = 1.35;
          G.chapelTide.hitCd = 0;
        }
        audio.playTideRoar();
        addShake(14);
        G.screenFlash = { alpha: 0.26, color: COLORS.crimson };
        spawnShockwave(bx, FLOOR_Y - 8, 220, COLORS.crimsonBright, 5, 0.42);
      } else if (b.moveKind === 'redLeap') {
        b.stateTimer = 1.15; // Safety cap; real transition triggers on actual landing
        b.leapAirborne = false;
        b.grounded = false;
        b.vx = b.facing * 480;
        b.vy = -440;
        audio.playSlash(0.62);
        G.slashes.push({ x: bx + b.facing * 36, y: by - 8, facing: b.facing, type: 'bossRedSlam', life: 0.32, maxLife: 0.32 });
      } else if (b.moveKind === 'chargeThrust') {
        b.stateTimer = 0.28;
        b.vx = b.facing * 640;
        audio.playSlash(0.75);
        G.slashes.push({ x: bx + b.facing * 46, y: by + 6, facing: b.facing, type: 'bossThrust', life: 0.26, maxLife: 0.26 });
      } else if (b.moveKind === 'delaySlam') {
        b.stateTimer = 0.24;
        b.vx = b.facing * 260;
        audio.playSlash(0.65);
        G.slashes.push({ x: bx + b.facing * 44, y: by - 4, facing: b.facing, type: 'bossSlam', life: 0.28, maxLife: 0.28 });
      } else {
        b.stateTimer = 0.19;
        b.vx = b.facing * 265;
        audio.playSlash(0.85 + b.comboIdx * 0.1);
        G.slashes.push({
          x: bx + b.facing * 42,
          y: by + (b.comboIdx % 2 === 0 ? -4 : 10),
          facing: b.facing,
          type: b.comboIdx % 2 === 0 ? (b.phase === 2 ? 'bossRedSweep' : 'bossSweep') : 'bossUpSweep',
          life: 0.23,
          maxLife: 0.23
        });
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= 0.92;
    if (b.moveKind !== 'inkTide') {
      const isRed = b.moveKind === 'redLeap';
      const reach = b.moveKind === 'chargeThrust' ? 128 : b.moveKind === 'delaySlam' ? 118 : 108;
      if (!b.didHit) {
        const hitBox = {
          x: b.x + b.w / 2 + (b.facing > 0 ? -10 : -reach + 10),
          y: b.y + 8,
          w: reach,
          h: 92
        };
        if (aabbOverlap(hitBox, G.player)) {
          b.didHit = true;
          const dmg = isRed ? 32 : b.moveKind === 'delaySlam' ? 28 : 22;
          applyIncomingAttackToPlayer(b, dmg, isRed, 280);
        }
      }
    }

    if (b.moveKind === 'redLeap' && !b.grounded) {
      b.leapAirborne = true;
    }

    const strikeFinished = b.moveKind === 'redLeap'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);

    if (strikeFinished) {
      if (b.moveKind === 'delaySlam' && b.phase === 2) {
        addShake(8);
        G.groundWaves.push({ x: b.x + b.w / 2 + b.facing * 50, y: FLOOR_Y, minX: 2620, maxX: 3760, vx: b.facing * 440, w: 34, h: 44, life: 1.8, hit: false });
      }
      if (b.moveKind === 'redLeap') {
        b.leapAirborne = false;
        b.vx = 0;
        addShake(12);
        spawnShockwave(b.x + b.w / 2, b.y + b.h - 6, 130, COLORS.crimsonBright, 4, 0.3);
        spawnParticles(b.x + b.w / 2, b.y + b.h - 4, 18, { color: COLORS.crimsonBright, speed: 240, spark: true, life: 0.38 });
      }

      const maxHits = b.moveKind === 'flurry4' ? 4 : b.moveKind === 'combo2' ? 2 : 1;
      b.comboIdx++;
      if (b.comboIdx < maxHits) {
        b.state = 'windup';
        b.stateTimer = b.moveKind === 'flurry4' ? 0.28 : 0.36;
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        b.stateTimer = b.moveKind === 'inkTide' ? 0.95 : (b.phase === 2 ? 0.65 : 0.88);
      }
    }
  } else if (b.state === 'recover') {
    b.vx *= 0.84;
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 2 ? 0.35 : 0.55;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.03;
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 26, b.facing, -b.vx * 0.45, dt);
}

export function updateBoss2(b, dt) {
  if (!b || !b.alive) return;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.shieldBrokenTimer > 0) b.shieldBrokenTimer -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 7.0 * dt);

  b.orbitAngle += dt * (b.phase === 2 ? 4.4 : 2.5);
  const floorTop = b.arenaFloorY - b.h;

  if (!b.awake) {
    b.y = (WELL_BOTTOM_Y - 142) + Math.sin(G.globalTime * 2.1) * 10;
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, 0, dt);
    return;
  }

  // Phase 2 Transition at <= 50% HP
  if (b.phase === 1 && b.hp <= b.maxHp * 0.5 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.novaCd = 2.8;
    b.shieldUp = false;
    b.vx = 0;
    b.vy = 0;
    audio.playBellToll();
    addShake(15);
    G.screenFlash = { alpha: 0.30, color: COLORS.goldBright };
    spawnShockwave(b.x + b.w / 2, b.y + 42, 260, COLORS.goldBright, 5.2, 0.52);
    spawnFloatText(b.x + b.w / 2, b.y - 46, '第二幕 · 万钟齐喑', COLORS.goldBright, 24, 1.85);
    G.groundWaves.push({ x: b.x + b.w / 2, y: WELL_BOTTOM_Y, minX: 5584, maxX: 6716, vx: -450, w: 38, h: 50, life: 2.3, hit: false, gold: true });
    G.groundWaves.push({ x: b.x + b.w / 2, y: WELL_BOTTOM_Y, minX: 5584, maxX: 6716, vx: 450, w: 38, h: 50, life: 2.3, hit: false, gold: true });
  }

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const bx = b.x + b.w / 2;
  const dx = px - bx;
  const absDx = Math.abs(dx);
  b.stateTimer -= dt;
  if (b.phase === 2 && b.novaCd > 0) b.novaCd -= dt;

  if (b.state === 'phaseShift') {
    b.x += (6140 - b.w / 2 - b.x) * Math.min(1, dt * 3.5);
    b.y += (WELL_BOTTOM_Y - 210 - b.y) * Math.min(1, dt * 3.5);
    if (Math.random() < 0.65) {
      spawnParticles(bx, b.y + 38, 2, { color: COLORS.goldBright, speed: 200, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.45;
    }
  } else if (b.state === 'stagger') {
    b.shieldUp = false;
    b.vx *= 0.85;
    b.vy = Math.min(820, b.vy + GRAVITY * dt);
    b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
    b.y = Math.min(floorTop, b.y + b.vy * dt);
    if (b.y >= floorTop) b.vy = 0;
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.25;
      b.stateTimer = 0.45;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.shieldUp = false;
    b.facing = dx >= 0 ? 1 : -1;
    const desiredX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.facing * 230));
    const desiredY = WELL_BOTTOM_Y - 155 + Math.sin(G.globalTime * 2.8) * 24;
    b.vx = (desiredX - b.x) * (b.phase === 2 ? 2.8 : 2.1);
    b.vy = (desiredY - b.y) * 2.8;
    b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
    b.y = Math.max(b.arenaTopY + 50, Math.min(floorTop, b.y + b.vy * dt));

    if (b.stateTimer <= 0) {
      const r = Math.random();
      if (b.phase === 2 && b.novaCd <= 0 && !G.chapelTide) {
        // Signature Aerial Mechanic: Molten Resonance Nova!
        b.moveKind = 'resonanceNova';
        b.state = 'windup';
        b.stateTimer = 1.1;
        b.windupDuration = 1.1;
        b.novaCd = 13.0;
        b.didHit = false;
        G.chapelTide = { phase: 'warn', timer: 1.1, maxTimer: 1.1, hitCd: 0, x0: 5584, w: 1132, floorY: WELL_BOTTOM_Y, owner: b, lanternIds: ['lan_9', 'lan_10'], theme: 'gold' };
        audio.playDangerAlert();
        audio.playBellToll();
        addShake(9);
        spawnFloatText(bx, b.y - 54, '危 · 铸炉共振！振翼上台或击鸣悬灯', COLORS.goldBright, 21, 1.5);
      } else if (r < 0.26) {
        b.moveKind = 'chainDropSlam';
        b.state = 'windup';
        b.stateTimer = b.phase === 2 ? 0.54 : 0.62;
        b.windupDuration = b.stateTimer;
        b.hoverTargetX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.w / 2));
        b.hoverTargetY = WELL_BOTTOM_Y - 330;
        b.didHit = false;
        audio.playSlash(1.1);
      } else if (r < 0.52) {
        b.moveKind = 'bellShieldCharge';
        b.state = 'windup';
        b.stateTimer = 0.58;
        b.windupDuration = 0.58;
        b.shieldUp = true;
        b.didHit = false;
        audio.playBellToll();
      } else if (r < 0.78) {
        b.moveKind = 'bellBarrage';
        b.state = 'windup';
        b.stateTimer = 0.62;
        b.windupDuration = 0.62;
        b.hoverTargetX = Math.max(b.arenaMinX + 60, Math.min(b.arenaMaxX - b.w - 60, px > 6140 ? 5800 : 6440));
        b.hoverTargetY = WELL_BOTTOM_Y - 220;
        b.didHit = false;
        audio.playWraithShot();
      } else {
        b.moveKind = 'redSweepHook';
        b.state = 'windup';
        b.stateTimer = 0.68;
        b.windupDuration = 0.68;
        b.didHit = false;
        audio.playDangerAlert();
      }
    }
  } else if (b.state === 'windup') {
    if (b.moveKind !== 'resonanceNova' && b.stateTimer > 0.20) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    if (b.moveKind === 'resonanceNova') {
      b.x += (6140 - b.w / 2 - b.x) * Math.min(1, dt * 6);
      b.y += (WELL_BOTTOM_Y - 260 - b.y) * Math.min(1, dt * 6);
      if (Math.random() < 0.7) {
        spawnParticles(bx + (Math.random() - 0.5) * 90, WELL_BOTTOM_Y - 8, 1, { color: COLORS.goldBright, speed: 110, grav: -200, life: 0.36 });
      }
    } else if (b.moveKind === 'chainDropSlam') {
      if (b.stateTimer > 0.22) {
        b.hoverTargetX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.w / 2));
      }
      b.x += (b.hoverTargetX - b.x) * Math.min(1, dt * 9);
      b.y += (b.hoverTargetY - b.y) * Math.min(1, dt * 9);
    } else if (b.moveKind === 'bellBarrage') {
      b.x += (b.hoverTargetX - b.x) * Math.min(1, dt * 5);
      b.y += (b.hoverTargetY - b.y) * Math.min(1, dt * 5);
    } else {
      // bellShieldCharge & redSweepHook drop swiftly to floor
      b.y += (floorTop - b.y) * Math.min(1, dt * 11);
    }

    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      if (b.moveKind === 'resonanceNova') {
        b.stateTimer = 1.45;
        if (G.chapelTide) {
          G.chapelTide.phase = 'surge';
          G.chapelTide.timer = 1.45;
          G.chapelTide.maxTimer = 1.45;
          G.chapelTide.hitCd = 0;
        }
        audio.playTideRoar();
        addShake(14);
        G.screenFlash = { alpha: 0.25, color: COLORS.goldBright };
        spawnShockwave(bx, WELL_BOTTOM_Y - 10, 240, COLORS.goldBright, 5.2, 0.44);
      } else if (b.moveKind === 'chainDropSlam') {
        b.stateTimer = 0.65;
        b.vx = 0;
        b.vy = 1140;
        audio.playSlash(0.68, true);
      } else if (b.moveKind === 'bellShieldCharge') {
        b.stateTimer = 0.48;
        b.vx = b.facing * (b.phase === 2 ? 640 : 540);
        b.vy = 0;
        b.y = floorTop;
        audio.playSlash(0.75, true);
        G.slashes.push({ x: bx + b.facing * 42, y: b.y + 50, facing: b.facing, type: 'bossThrust', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'bellBarrage') {
        b.stateTimer = 0.22;
        const count = b.phase === 2 ? 5 : 3;
        const baseAng = Math.atan2(py - (b.y + 42), px - bx);
        const spread = b.phase === 2 ? 0.24 : 0.28;
        audio.playWraithShot();
        for (let i = 0; i < count; i++) {
          const a = baseAng + (i - (count - 1) / 2) * spread;
          G.projectiles.push({
            owner: 'enemy',
            source: b,
            kind: 'wraithOrb',
            x: bx + Math.cos(a) * 28,
            y: b.y + 42 + Math.sin(a) * 28,
            vx: Math.cos(a) * (b.phase === 2 ? 385 : 340),
            vy: Math.sin(a) * (b.phase === 2 ? 385 : 340),
            r: 13,
            dmg: 20,
            posture: 28,
            life: 2.8,
            maxLife: 2.8,
            reflected: false,
            hitIds: new Set()
          });
        }
        spawnShockwave(bx, b.y + 42, 74, COLORS.goldBright, 3.2, 0.24);
      } else if (b.moveKind === 'redSweepHook') {
        b.stateTimer = 0.26;
        b.y = floorTop;
        b.vx = b.facing * 260;
        audio.playSlash(0.62, true);
        G.slashes.push({ x: bx + b.facing * 75, y: WELL_BOTTOM_Y - 26, facing: b.facing, type: 'bossRedSweep', life: 0.28, maxLife: 0.28 });
      }
    }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'chainDropSlam') {
      b.y += b.vy * dt;
      const slamBox = { x: b.x - 16, y: b.y + 18, w: b.w + 32, h: b.h - 10 };
      if (!b.didHit && aabbOverlap(slamBox, G.player)) {
        b.didHit = true;
        applyIncomingAttackToPlayer(b, 26, false, 270);
      }
      if (b.y >= floorTop) {
        b.y = floorTop;
        b.vy = 0;
        addShake(12);
        audio.playHit(true);
        spawnShockwave(b.x + b.w / 2, WELL_BOTTOM_Y - 6, 145, COLORS.goldBright, 4.4, 0.34);
        spawnParticles(b.x + b.w / 2, WELL_BOTTOM_Y - 4, 24, { color: COLORS.goldBright, speed: 280, spark: true, life: 0.42 });
        G.groundWaves.push({ x: b.x + b.w / 2 - 24, y: WELL_BOTTOM_Y, minX: 5584, maxX: 6716, vx: -430, w: 36, h: 46, life: 2.0, hit: false, gold: true });
        G.groundWaves.push({ x: b.x + b.w / 2 + 24, y: WELL_BOTTOM_Y, minX: 5584, maxX: 6716, vx: 430, w: 36, h: 46, life: 2.0, hit: false, gold: true });
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.62 : 0.85;
      }
    } else if (b.moveKind === 'bellShieldCharge') {
      b.x += b.vx * dt;
      if (b.x < b.arenaMinX) { b.x = b.arenaMinX; b.stateTimer = 0; }
      if (b.x + b.w > b.arenaMaxX) { b.x = b.arenaMaxX - b.w; b.stateTimer = 0; }
      const chargeBox = { x: b.x - 10, y: b.y + 6, w: b.w + 20, h: b.h - 8 };
      if (!b.didHit && aabbOverlap(chargeBox, G.player)) {
        b.didHit = true;
        applyIncomingAttackToPlayer(b, 24, false, 290);
      }
      if (b.stateTimer <= 0) {
        b.shieldUp = false;
        b.vx = 0;
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.58 : 0.78;
      }
    } else if (b.moveKind === 'redSweepHook') {
      b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
      b.vx *= 0.86;
      if (!b.didHit) {
        const reach = 185;
        const sweepBox = {
          x: b.x + b.w / 2 + (b.facing > 0 ? -12 : -reach + 12),
          y: WELL_BOTTOM_Y - 54,
          w: reach,
          h: 54
        };
        if (aabbOverlap(sweepBox, G.player)) {
          b.didHit = true;
          applyIncomingAttackToPlayer(b, 30, true, 290);
        }
      }
      if (b.stateTimer <= 0) {
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.62 : 0.82;
      }
    } else {
      // bellBarrage or resonanceNova
      if (b.stateTimer <= 0) {
        b.state = 'recover';
        b.stateTimer = b.moveKind === 'resonanceNova' ? 0.95 : (b.phase === 2 ? 0.55 : 0.78);
      }
    }
  } else if (b.state === 'recover') {
    b.shieldUp = false;
    b.vx *= 0.84;
    b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 2 ? 0.32 : 0.52;
    }
  }

  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.4, dt);
}
