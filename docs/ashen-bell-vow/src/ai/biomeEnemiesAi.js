// Five Biome-Exclusive Enemies AI (split from src/ai/enemiesAi.js in v45.1 with upgraded combat movesets)
// Falcon (featherVolley) | Fungus (interruptible sporeInhale) | Frostguard (frostWave) | Drowned (2-hit hookCombo) | Anchorite (anchorBackswing)
import { COLORS, GRAVITY } from '../config.js';
import { G, addShake, damp } from '../state.js';
import { audio } from '../audio.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY, hasLineOfSight } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t } from '../i18n.js';

export function updateFalcon(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.volleyCd > 0) e.volleyCd = Math.max(0, e.volleyCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

  e.wingPhase = (e.wingPhase || 0) + dt * (e.state === 'dive' ? 14 : e.state === 'windup' ? 11 : 6.8);
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.86, dt);
    const groundBelow = getGroundSurfaceY(cx, e.y + e.h);
    e.vy = Math.min(260, (groundBelow - e.h - 6 - e.y) * 4.5);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.8;
      e.posture = e.maxPosture * 0.25;
    }
    return;
  }

  if (e.state === 'hover') {
    const targetX = e.homeX + Math.sin(e.wingPhase * 0.28) * 95;
    const targetY = e.homeY + Math.cos(e.wingPhase * 0.45) * 24;
    e.vx = (targetX - e.x) * 2.6;
    e.vy = (targetY - e.y) * 2.8;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.facing = dx >= 0 ? 1 : -1;
    if (dist < 470 && Math.abs(dy) < 280 && e.stateTimer <= 0 && hasLineOfSight(cx, cy, px, py)) {
      const wantsVolley = (e.volleyCd || 0) <= 0 && (dist > 205 || Math.random() < 0.42);
      e.attackKind = wantsVolley ? 'featherVolley' : 'dive';
      e.state = 'windup';
      e.stateTimer = wantsVolley ? 0.52 : 0.56;
      e.diveTx = px;
      e.diveTy = py;
      e.didHit = false;
      audio.playFalconCry();
    }
  } else if (e.state === 'windup') {
    e.facing = dx >= 0 ? 1 : -1;
    if (e.stateTimer > 0.18) {
      e.diveTx = px;
      e.diveTy = py;
    }
    e.vx = -e.facing * 45;
    e.vy = e.attackKind === 'featherVolley' ? -68 : -52;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (Math.random() < 22 * dt) {
      spawnParticles(cx, cy + 8, 1, { color: e.attackKind === 'featherVolley' ? '#7dd3fc' : COLORS.goldBright, speed: 65, grav: 0, life: 0.22 });
    }
    if (e.stateTimer <= 0) {
      if (e.attackKind === 'featherVolley') {
        e.volleyCd = 3.8;
        const baseA = Math.atan2(e.diveTy - cy, e.diveTx - cx);
        audio.playWindBlade();
        [-0.16, 0.16].forEach(off => {
          const ang = baseA + off;
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'windBlade',
            x: cx + Math.cos(ang) * 16, y: cy + Math.sin(ang) * 16,
            vx: Math.cos(ang) * 375, vy: Math.sin(ang) * 375,
            r: 11, dmg: 16, posture: 22, life: 2.1, maxLife: 2.1, reflected: false, hitIds: new Set()
          });
        });
        spawnShockwave(cx, cy, 52, '#7dd3fc', 2.4, 0.22);
        e.state = 'recover';
        e.stateTimer = 0.85;
      } else {
        const ddx = e.diveTx - cx;
        const ddy = e.diveTy - cy;
        const dlen = Math.max(1, Math.hypot(ddx, ddy));
        e.vx = (ddx / dlen) * 560;
        e.vy = (ddy / dlen) * 560;
        e.state = 'dive';
        e.stateTimer = 0.48;
        e.didHit = false;
        audio.playSlash(1.18, false);
        G.slashes.push({ x: cx, y: cy, facing: e.facing, type: 'enemyThrust', life: 0.22, maxLife: 0.22 });
      }
    }
  } else if (e.state === 'dive') {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (Math.random() < 30 * dt) {
      spawnParticles(cx, cy, 1, { color: '#bae6fd', speed: 60, grav: 0, life: 0.2 });
    }
    if (!e.didHit && aabbOverlap({ x: e.x - 6, y: e.y - 4, w: e.w + 12, h: e.h + 8 }, G.player)) {
      e.didHit = true;
      applyIncomingAttackToPlayer(e, 18, false, 200);
    }
    const groundBelow = getGroundSurfaceY(cx, e.y + e.h);
    if (e.y + e.h >= groundBelow - 4) {
      e.y = groundBelow - e.h - 4;
      e.vy = -120;
      e.state = 'recover';
      e.stateTimer = 0.9;
    } else if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.95;
    }
  } else if (e.state === 'recover') {
    const retX = e.homeX + Math.sin(e.wingPhase * 0.25) * 40;
    const retY = e.homeY - 12;
    e.vx += ((retX - e.x) * 3.0 - e.vx) * Math.min(1, dt * 4.5);
    e.vy += ((retY - e.y) * 3.0 - e.vy) * Math.min(1, dt * 4.5);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.facing = dx >= 0 ? 1 : -1;
    if (e.stateTimer <= 0) {
      e.state = 'hover';
      e.stateTimer = 0.75 + Math.random() * 0.45;
    }
  }
}

export function updateFungus(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.sporeCd > 0) e.sporeCd = Math.max(0, e.sporeCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.inhalingSpore = false;
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'patrol') {
    e.inhalingSpore = false;
    e.vx = e.facing * 52;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 330 && Math.abs(dy) < 125) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.inhalingSpore = false;
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 86) e.vx = e.facing * 105;
    else e.vx *= damp(0.8, dt);

    if (absDx < 160 && Math.abs(dy) < 95 && e.stateTimer <= 0) {
      e.state = 'windup';
      const wantsSpore = e.sporeCd <= 0 && (absDx > 88 || Math.random() < 0.48);
      e.attackKind = wantsSpore ? 'sporeInhale' : 'slam';
      e.inhalingSpore = wantsSpore;
      e.stateTimer = wantsSpore ? 0.82 : 0.50;
      e.didHit = false;
      e.vx = 0;
    } else if (absDx > 460 || Math.abs(dy) > 220) {
      e.state = 'patrol';
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.20) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.82, dt);
    if (e.inhalingSpore && Math.random() < 30 * dt) {
      const ang = Math.random() * Math.PI * 2;
      const sx = e.x + e.w * 0.5 + Math.cos(ang) * 44;
      const sy = e.y + 14 + Math.sin(ang) * 28;
      spawnParticles(sx, sy, 1, { color: '#6ee7b7', speed: 55, angle: Math.atan2((e.y + 14) - sy, (e.x + e.w * 0.5) - sx), spread: 0.25, grav: 0, life: 0.26 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      if (e.attackKind === 'sporeInhale' || e.attackKind === 'sporeBurst') {
        e.inhalingSpore = false;
        e.stateTimer = 0.26;
        e.sporeCd = 4.6;
        const sx = e.x + e.w * 0.5 + e.facing * 24;
        const sy = e.y + e.h - 24;
        G.sporeClouds.push({ x: sx, y: sy, r: 86, life: 5.4, maxLife: 5.4, dmg: 11 });
        audio.playSporeBurst();
        spawnShockwave(sx, sy, 92, '#4ade80', 3.6, 0.32);
        spawnParticles(sx, sy, 24, { color: '#4ade80', speed: 170, grav: -30, life: 0.55 });
        if (Math.hypot((G.player.x + G.player.w * 0.5) - sx, (G.player.y + G.player.h * 0.5) - sy) < 92) {
          applyIncomingAttackToPlayer(e, 16, false, 230);
        }
      } else {
        e.stateTimer = 0.20;
        e.vx = e.facing * 210;
        audio.playSlash(0.82, true);
        G.slashes.push({ x: e.x + e.w / 2 + e.facing * 28, y: e.y + 30, facing: e.facing, type: 'bossSlam', life: 0.22, maxLife: 0.22 });
      }
    }
  } else if (e.state === 'attack') {
    e.vx *= damp(0.88, dt);
    if (e.attackKind === 'slam' && !e.didHit) {
      const reach = 84;
      const hitBox = { x: e.x + e.w / 2 + (e.facing > 0 ? -4 : -reach + 4), y: e.y + 6, w: reach, h: 54 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 20, false, 220);
      }
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = (e.attackKind === 'sporeInhale' || e.attackKind === 'sporeBurst') ? 0.95 : 0.82;
    }
  } else if (e.state === 'recover') {
    e.inhalingSpore = false;
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.stateTimer = 0.35;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 12 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.05;
  if (e.x < e.minX - 65) e.x = e.minX - 65;
  if (e.x > e.maxX + 65) e.x = e.maxX + 65;
}

export function updateFrostguard(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.waveCd > 0) e.waveCd = Math.max(0, e.waveCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6.5 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 64;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 350 && Math.abs(dy) < 120) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 96) e.vx = e.facing * 124;
    else e.vx *= damp(0.8, dt);

    if ((absDx < 146 || ((e.waveCd || 0) <= 0 && absDx < 250)) && Math.abs(dy) < 92 && e.stateTimer <= 0) {
      e.state = 'windup';
      const roll = Math.random();
      if ((e.waveCd || 0) <= 0 && (absDx >= 140 || roll < 0.34)) {
        e.attackKind = 'frostWave';
        e.stateTimer = 0.58;
        e.vx = 0;
        audio.playFrostBuild();
      } else if (roll < 0.66) {
        e.attackKind = 'frostLunge';
        e.stateTimer = 0.64;
        e.vx = -e.facing * 130;
        audio.playDangerAlert();
      } else {
        e.attackKind = 'halberd';
        e.stateTimer = 0.48;
        e.vx = 0;
      }
      e.didHit = false;
    } else if (absDx > 480 || Math.abs(dy) > 220) {
      e.state = 'patrol';
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.18) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.82, dt);
    if (Math.random() < 18 * dt) {
      spawnParticles(e.x + e.w / 2 + e.facing * 18, e.y + 24, 1, {
        color: e.attackKind === 'frostLunge' ? COLORS.crimsonBright : '#7dd3fc', speed: 60, grav: -30, life: 0.22
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      const isRed = e.attackKind === 'frostLunge';
      const isWave = e.attackKind === 'frostWave';
      e.stateTimer = isRed ? 0.24 : 0.22;
      e.vx = e.facing * (isRed ? 480 : isWave ? 130 : 210);
      audio.playSlash(isRed ? 0.76 : 0.88, true);
      if (isWave) {
        e.waveCd = 4.4;
        audio.playFrostShatter();
        spawnShockwave(e.x + e.w * 0.5 + e.facing * 26, e.y + e.h - 8, 76, '#7dd3fc', 3.4, 0.26);
        G.groundWaves.push({
          x: e.x + e.w * 0.5 + e.facing * 36, y: e.y + e.h,
          minX: e.minX - 220, maxX: e.maxX + 220,
          vx: e.facing * 335, w: 34, h: 44, life: 1.35, hit: false, theme: 'frost'
        });
      }
      G.slashes.push({
        x: e.x + e.w / 2 + e.facing * 32, y: e.y + 30, facing: e.facing,
        type: isRed ? 'enemyRedThrust' : 'bossSlam', life: 0.22, maxLife: 0.22
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= damp(0.9, dt);
    if (!e.didHit) {
      const isRed = e.attackKind === 'frostLunge';
      const reach = isRed ? 104 : 94;
      const hitBox = { x: e.x + e.w / 2 + (e.facing > 0 ? -4 : -reach + 4), y: e.y + 6, w: reach, h: 58 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, isRed ? 27 : 22, isRed, isRed ? 260 : 210);
      }
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.88;
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'chase';
      e.stateTimer = 0.35;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 12 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.05;
  if (e.x < e.minX - 65) e.x = e.minX - 65;
  if (e.x > e.maxX + 65) e.x = e.maxX + 65;
  if (e.cloak) updateCloak(e.cloak, e.x + e.w / 2 - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.45, dt);
}

export function updateDrowned(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.submergeCd > 0) e.submergeCd = Math.max(0, e.submergeCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7.5 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const ex = e.x + e.w * 0.5;
  const ey = e.y + e.h * 0.5;
  const dx = px - ex;
  const dy = Math.abs(py - ey);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.submergeAlpha = 1;
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.posture = e.maxPosture * 0.3; }
  } else if (e.state === 'patrol') {
    e.submergeAlpha = Math.min(1, (e.submergeAlpha || 1) + dt * 5);
    e.vx = e.facing * 72;
    if (e.x <= e.minX) e.facing = 1;
    if (e.x >= e.maxX) e.facing = -1;
    if (absDx < 370 && dy < 175 && G.player.hp > 0) {
      e.state = 'chase';
      e.facing = dx >= 0 ? 1 : -1;
    }
  } else if (e.state === 'chase') {
    e.submergeAlpha = Math.min(1, (e.submergeAlpha || 1) + dt * 6);
    if (absDx > 480 || dy > 260) {
      e.state = 'patrol';
    } else if (e.submergeCd <= 0 && absDx >= 135 && absDx <= 340 && dy < 95 && e.grounded) {
      e.state = 'submerge';
      e.stateTimer = 0.42;
      e.submergeCd = 4.6;
      e.vx = 0;
      const desiredX = Math.max(e.minX - 40, Math.min(e.maxX + 40, px + (dx >= 0 ? 78 : -78) - e.w * 0.5));
      e.ambushX = desiredX;
      spawnShockwave(ex, e.y + e.h - 4, 52, COLORS.cyanBright, 2.4, 0.25);
      spawnParticles(ex, e.y + e.h - 4, 14, { color: COLORS.ink, speed: 160, grav: 240, life: 0.38 });
    } else if (absDx < 118 && dy < 85 && e.stateTimer <= 0) {
      e.facing = dx >= 0 ? 1 : -1;
      e.comboIdx = 0;
      e.attackKind = Math.random() < 0.32 ? 'redHookLunge' : 'hookPull';
      e.state = 'windup';
      e.stateTimer = e.attackKind === 'redHookLunge' ? 0.62 : 0.42;
      e.windupDuration = e.stateTimer;
      e.didHit = false;
      e.vx = 0;
      if (e.attackKind === 'redHookLunge') audio.playDangerAlert();
      else audio.playGlintCue(false);
    } else {
      e.facing = dx >= 0 ? 1 : -1;
      e.vx = e.facing * 138;
    }
  } else if (e.state === 'submerge') {
    e.vx = 0;
    e.submergeAlpha = Math.max(0.10, e.stateTimer / 0.42);
    if (e.stateTimer <= 0) {
      e.x = e.ambushX;
      e.facing = (px - (e.x + e.w * 0.5)) >= 0 ? 1 : -1;
      e.state = 'windup';
      e.comboIdx = 0;
      e.attackKind = 'hookPull';
      e.stateTimer = 0.46;
      e.windupDuration = 0.46;
      e.didHit = false;
      e.submergeAlpha = 1;
      audio.playGlintCue(false);
      spawnShockwave(e.x + e.w * 0.5, e.y + e.h - 4, 64, COLORS.cyanBright, 3.0, 0.28);
      spawnParticles(e.x + e.w * 0.5, e.y + e.h - 6, 18, { color: COLORS.cyanBright, speed: 210, spark: true, grav: 260, life: 0.36 });
    }
  } else if (e.state === 'windup') {
    e.submergeAlpha = 1;
    if (e.stateTimer > 0.14) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.8, dt);
    if (Math.random() < 18 * dt) {
      spawnParticles(ex + e.facing * 14, e.y + 24, 1, {
        color: e.attackKind === 'redHookLunge' ? COLORS.crimsonBright : COLORS.cyanBright, speed: 60, grav: -20, life: 0.22
      });
    }
    if (e.stateTimer <= 0) {
      const isRed = e.attackKind === 'redHookLunge';
      const isCross = e.attackKind === 'hookCross';
      e.state = 'attack';
      e.stateTimer = isRed ? 0.24 : 0.19;
      e.vx = e.facing * (isRed ? 390 : isCross ? 265 : 210);
      audio.playSlash(isRed ? 0.82 : (isCross ? 1.16 : 0.96), isRed || isCross);
      G.slashes.push({
        x: ex + e.facing * 32, y: e.y + 30, facing: e.facing,
        type: isRed ? 'enemyRedThrust' : (isCross ? 'bossUpSweep' : 'enemyThrust'), life: 0.22, maxLife: 0.22
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= damp(0.86, dt);
    if (!e.didHit) {
      const isRed = e.attackKind === 'redHookLunge';
      const isPull = e.attackKind === 'hookPull';
      const reach = isRed ? 96 : (isPull ? 90 : 84);
      const hitBox = { x: ex + (e.facing > 0 ? 0 : -reach), y: e.y + 6, w: reach, h: 52 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        // hookPull gently yanks player inward (-110 knockback) to set up hookCross!
        applyIncomingAttackToPlayer(e, isRed ? 24 : (isPull ? 15 : 20), isRed, isRed ? 245 : (isPull ? -105 : 215));
        if (G.player && G.player.hp > 0) G.player.wetTimer = Math.max(G.player.wetTimer || 0, 4.5);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.attackKind === 'hookPull' && e.comboIdx === 0) {
        e.comboIdx = 1;
        e.attackKind = 'hookCross';
        e.state = 'windup';
        e.stateTimer = 0.30;
        e.windupDuration = 0.30;
        e.didHit = false;
        audio.playGlintCue(false);
      } else {
        e.state = 'recover';
        e.stateTimer = 0.78;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 0.30; }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 12 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.055;
  if (e.x < e.minX - 65) e.x = e.minX - 65;
  if (e.x > e.maxX + 65) e.x = e.maxX + 65;
  if (e.cloak) updateCloak(e.cloak, e.x + e.w * 0.5 - e.facing * 6, e.y + 16, e.facing, -e.vx * 0.45, dt);
}

export function updateAnchorite(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6.0 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const ex = e.x + e.w * 0.5;
  const ey = e.y + e.h * 0.5;
  const dx = px - ex;
  const dy = Math.abs(py - ey);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.82, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.posture = e.maxPosture * 0.35; }
  } else if (e.state === 'patrol') {
    e.vx = e.facing * 48;
    if (e.x <= e.minX) e.facing = 1;
    if (e.x >= e.maxX) e.facing = -1;
    if (absDx < 350 && dy < 165 && G.player.hp > 0) {
      e.state = 'chase';
      e.facing = dx >= 0 ? 1 : -1;
    }
  } else if (e.state === 'chase') {
    if (absDx > 480 || dy > 260) {
      e.state = 'patrol';
    } else if (absDx < 142 && dy < 95 && e.stateTimer <= 0) {
      e.facing = dx >= 0 ? 1 : -1;
      e.didBackswing = false;
      e.attackKind = Math.random() < 0.40 ? 'redAnchorSlam' : 'anchorDrag';
      e.state = 'windup';
      e.stateTimer = e.attackKind === 'redAnchorSlam' ? 0.74 : 0.62;
      e.windupDuration = e.stateTimer;
      e.didHit = false;
      e.vx = 0;
      if (e.attackKind === 'redAnchorSlam') audio.playDangerAlert();
      else audio.playGlintCue(true);
    } else {
      e.facing = dx >= 0 ? 1 : -1;
      e.vx = e.facing * 78;
    }
  } else if (e.state === 'windup') {
    e.vx *= damp(0.82, dt);
    if (Math.random() < 18 * dt) {
      spawnParticles(ex - e.facing * 18, e.y + 38, 1, {
        color: e.attackKind === 'redAnchorSlam' ? COLORS.crimsonBright : (e.attackKind === 'anchorBackswing' ? '#7dd3fc' : COLORS.goldBright), speed: 55, grav: 40, life: 0.24
      });
    }
    if (e.stateTimer <= 0) {
      const isRed = e.attackKind === 'redAnchorSlam';
      const isBack = e.attackKind === 'anchorBackswing';
      e.state = 'attack';
      e.stateTimer = isRed ? 0.26 : 0.23;
      e.vx = isBack ? (-e.facing * 155) : (e.facing * (isRed ? 160 : 225));
      audio.playSlash(isBack ? 0.72 : 0.64, true);
      if (isRed) {
        addShake(7.5);
        spawnShockwave(ex + e.facing * 42, e.y + e.h - 4, 108, COLORS.cyanBright, 3.8, 0.28);
        spawnParticles(ex + e.facing * 42, e.y + e.h - 4, 18, { color: COLORS.cyanBright, speed: 240, spark: true, grav: 320, life: 0.38 });
        G.groundWaves.push({
          x: ex + e.facing * 48, y: e.y + e.h, minX: e.minX - 180, maxX: e.maxX + 180,
          vx: e.facing * 310, w: 32, h: 42, life: 0.95, hit: false
        });
      } else if (isBack) {
        addShake(6.0);
        spawnShockwave(ex, e.y + 44, 118, '#7dd3fc', 3.4, 0.26);
      }
      G.slashes.push({
        x: ex + (isBack ? -e.facing * 32 : e.facing * 44), y: e.y + 42, facing: isBack ? -e.facing : e.facing,
        type: isRed ? 'hammerQuake' : 'hammerSweep', life: 0.26, maxLife: 0.26
      });
    }
  } else if (e.state === 'attack') {
    e.vx *= damp(0.84, dt);
    if (!e.didHit) {
      const isRed = e.attackKind === 'redAnchorSlam';
      const isBack = e.attackKind === 'anchorBackswing';
      // anchorBackswing sweeps both behind & around the anchorite to punish backstab greed!
      const hitBox = isBack
        ? { x: ex - 116, y: e.y + 10, w: 232, h: 68 }
        : { x: ex + (e.facing > 0 ? -8 : -(isRed ? 124 : 112) + 8), y: e.y + 10, w: isRed ? 124 : 112, h: 68 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, isRed ? 30 : (isBack ? 24 : 23), isRed, isRed ? 310 : 250);
        if (G.player && G.player.hp > 0) G.player.wetTimer = Math.max(G.player.wetTimer || 0, 5.0);
      }
    }
    if (e.stateTimer <= 0) {
      // Chain into heavy chain-drag backswing if player stays close (especially behind its back!)
      const behindPlayer = (dx * e.facing) < 12;
      if (!e.didBackswing && absDx < 132 && dy < 88 && (behindPlayer || Math.random() < 0.45)) {
        e.didBackswing = true;
        e.attackKind = 'anchorBackswing';
        e.state = 'windup';
        e.stateTimer = 0.46;
        e.windupDuration = 0.46;
        e.didHit = false;
        audio.playGlintCue(false);
      } else {
        e.state = 'recover';
        e.stateTimer = 0.96;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 0.40; }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (Math.abs(e.vx) > 10 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.042;
  if (e.x < e.minX - 60) e.x = e.minX - 60;
  if (e.x > e.maxX + 60) e.x = e.maxX + 60;
  if (e.cloak) updateCloak(e.cloak, e.x + e.w * 0.5 - e.facing * 8, e.y + 20, e.facing, -e.vx * 0.4, dt);
}
