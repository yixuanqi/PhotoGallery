// Standard Enemy & Sparring Automaton AI (split from src/ai.js in v32.0)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY, DUMMY_MODES, WIND_ZONES, BOUNCE_PADS } from '../config.js';
import { G, addShake, triggerBossBanner, getCombatScaling, getBladeDamageMult, isPlayerInRoomId, isWindZoneActive, isBouncePadAwake, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY, hasLineOfSight } from '../physics.js';
import { applyIncomingAttackToPlayer, applyEnemyHitFeel, damageEnemyHP, addPostureToEnemy } from '../combat.js';
import { t, locBoss } from '../i18n.js';


// v36.0 Per-Enemy Hit-Freeze, Deformation Recovery, Wall-Slam & Bowling Chain Knockback
export function updateEnemyHitFeel(e, dt) {
  if (!e) return false;
  if (e.squashX !== undefined) e.squashX += (1 - e.squashX) * Math.min(1, dt * 16);
  else e.squashX = 1;
  if (e.squashY !== undefined) e.squashY += (1 - e.squashY) * Math.min(1, dt * 16);
  else e.squashY = 1;
  if (e.recoilLean) {
    e.recoilLean *= damp(0.76, dt);
    if (Math.abs(e.recoilLean) < 0.004) e.recoilLean = 0;
  }
  if (e.hitTremor > 0) e.hitTremor = Math.max(0, e.hitTremor - dt * 36);
  if (e.hitFreezeTimer > 0) {
    e.hitFreezeTimer = Math.max(0, e.hitFreezeTimer - dt);
    if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt * 0.65);
    return true;
  }
  return false;
}

export function updateEnemyLaunchPhysics(e, dt) {
  if (!e || !e.alive || e.isBoss || e.isDummy || !(e.launchTimer > 0)) return false;
  e.launchTimer = Math.max(0, e.launchTimer - dt);
  if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt);

  const isFly = e.kind === 'wraith' || e.kind === 'falcon';
  e.vx *= damp(0.955, dt);
  if (!isFly) e.vy = Math.min(920, (e.vy || 0) + GRAVITY * dt);
  else e.vy *= damp(0.92, dt);

  moveAndCollide(e, dt, false);

  // 1. Wall-Slam Impact (撞墙碎石 + 额外伤害与巨额削势!)
  if (e.wallDir !== 0 && Math.abs(e.vx) < 20) {
    const wDir = e.wallDir;
    e.launchTimer = 0;
    const slamDmg = e.isMiniBoss
      ? Math.max(16, Math.round(e.maxHp * 0.08))
      : Math.max(18, Math.min(62, Math.round(e.maxHp * 0.26)));
    e.vx = -wDir * 155;
    if (!isFly) e.vy = -175;
    e.squashX = 0.64;
    e.squashY = 1.36;
    e.recoilLean = -wDir * 0.24;
    e.hitFreezeTimer = 0.052;
    e.hitTremor = 6.0;
    audio.playWallSlam();
    triggerHaptic('heavyHit', 1.05);
    addShake(9.5);
    const wx = wDir > 0 ? (e.x + e.w) : e.x;
    const wy = e.y + e.h * 0.48;
    spawnShockwave(wx, wy, 94, COLORS.goldBright, 4.2, 0.28);
    spawnParticles(wx, wy, 20, { color: COLORS.parchment, speed: 260, grav: 480, life: 0.45 });
    spawnParticles(wx, wy, 14, { color: COLORS.goldBright, speed: 290, spark: true, bounce: true, grav: 560, life: 0.40 });
    spawnFloatText(wx, e.y - 26, t('combat.wallSlam', slamDmg), COLORS.goldBright, 20, 0.95);
    damageEnemyHP(e, slamDmg, false);
    addPostureToEnemy(e, e.isMiniBoss ? 22 : 34);
    if (e.cloak) updateCloak(e.cloak, e.x + e.w * 0.5 - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.4, dt);
    return true;
  }

  // 2. Bowling Chain Collision (击飞保龄球撞倒其他敌兵!)
  if (e.alive && Math.abs(e.vx) > 155) {
    if (!e.launchHitIds) e.launchHitIds = new Set();
    for (let i = 0; i < G.enemies.length; i++) {
      const other = G.enemies[i];
      if (!other || !other.alive || other === e || other.isDummy || other.isBoss) continue;
      if (e.launchHitIds.has(other.id)) continue;
      if (aabbOverlap(e, other)) {
        e.launchHitIds.add(other.id);
        const bDir = e.launchDir || Math.sign(e.vx) || 1;
        const chainDmg = Math.max(18, Math.round(24 * getBladeDamageMult()));
        const othSpd = other.isMiniBoss ? 180 : 340;
        other.vx = bDir * othSpd;
        if (other.kind !== 'wraith' && other.kind !== 'falcon' && !other.isMiniBoss) other.vy = -195;
        applyEnemyHitFeel(other, true, bDir, othSpd);
        if (other.launchHitIds) other.launchHitIds.add(e.id);
        audio.playHit(true, 3);
        addShake(6.5);
        const mx = (e.x + other.x + (e.w + other.w) * 0.5) * 0.5;
        const my = (e.y + other.y + (e.h + other.h) * 0.5) * 0.5;
        spawnShockwave(mx, my, 78, COLORS.cyanBright, 3.4, 0.24);
        spawnParticles(mx, my, 14, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.34 });
        spawnFloatText(mx, other.y - 24, t('combat.bowlingCrash'), COLORS.cyanBright, 18, 0.85);
        damageEnemyHP(other, chainDmg, true);
        addPostureToEnemy(other, 26);
        e.vx *= 0.74;
      }
    }
  }

  if (Math.abs(e.vx) < 110 && (e.grounded || isFly)) {
    e.launchTimer = 0;
  }
  if (e.cloak) updateCloak(e.cloak, e.x + e.w * 0.5 - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.4, dt);
  return true;
}

export function applyEnemyBiomeCoupling(e, dt) {
  if (!e || !e.alive || e.isBoss || e.isDummy) return;
  const isFlying = e.kind === 'wraith' || e.kind === 'falcon' || (e.kind === 'leech' && (e.state === 'cling' || e.state === 'telegraph'));
  const heavyRooted = e.kind === 'warden_forest';
  const ecx = e.x + e.w * 0.5;
  const ecy = e.y + e.h * 0.5;

  // 1. Wind Updrafts & Gale Streams lift or push foes
  if (WIND_ZONES.length > 0 && !heavyRooted) {
    for (let i = 0; i < WIND_ZONES.length; i++) {
      const wz = WIND_ZONES[i];
      if (!isWindZoneActive(wz)) continue;
      if (ecx >= wz.x && ecx <= wz.x + wz.w && ecy >= wz.y && ecy <= wz.y + wz.h) {
        const liftFactor = e.isMiniBoss ? 0.38 : (e.kind === 'golem' ? 0.42 : (isFlying ? 0.25 : 0.78));
        if (wz.vy < 0) {
          e.vy += wz.vy * liftFactor * dt;
          if (e.vy < -340) e.vy = -340;
          if (!isFlying) e.grounded = false;
        }
        if (wz.vx) {
          e.vx += wz.vx * liftFactor * dt;
        }
        if (!isFlying && !e.isMiniBoss) {
          if (e.windLiftedTimer <= 0 && Math.abs(e.vy) > 95) {
            spawnFloatText(ecx, e.y - 20, t('combat.windLift'), '#bae6fd', 14, 0.65);
          }
          e.windLiftedTimer = 0.28;
        }
        if (Math.random() < 10 * dt) {
          spawnParticles(ecx + (Math.random() - 0.5) * e.w * 0.7, e.y + e.h - 4, 1, {
            color: '#e0f2fe', speed: 70, grav: -200, life: 0.24
          });
        }
        break;
      }
    }
  }

  // 2. Glowing Spore Bounce Caps launch ground foes aloft & disrupt poise
  if (BOUNCE_PADS.length > 0 && !isFlying && !heavyRooted && e.bounceCd <= 0 && e.vy >= -30) {
    const fBox = { x: e.x + 2, y: e.y + e.h - 14, w: e.w - 4, h: 18 };
    for (let i = 0; i < BOUNCE_PADS.length; i++) {
      const bp = BOUNCE_PADS[i];
      if (!isBouncePadAwake(bp)) continue;
      if (aabbOverlap(fBox, { x: bp.x - bp.w * 0.5, y: bp.y - bp.h, w: bp.w, h: bp.h })) {
        bp.squish = 1.0;
        e.bounceCd = 0.85;
        e.y = bp.y - bp.h - e.h - 2;
        e.vy = (bp.boostVy || -760) * (e.isMiniBoss ? 0.58 : 0.82);
        e.grounded = false;
        if (!e.isMiniBoss && e.state !== 'stagger') {
          e.posture = Math.min(e.maxPosture - 1, e.posture + 14);
          e.postureDecayDelay = 2.6;
        }
        audio.playSporeBounce();
        spawnShockwave(bp.x, bp.y - bp.h * 0.6, 56, '#6ee7b7', 2.8, 0.24);
        spawnParticles(bp.x, bp.y - bp.h * 0.7, 12, { color: '#6ee7b7', speed: 180, spark: true, grav: -40, life: 0.36 });
        spawnFloatText(ecx, e.y - 18, t('combat.bounceLaunch'), '#6ee7b7', 15, 0.75);
        break;
      }
    }
  }
}

export function updateDummy(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash = Math.max(0, e.hurtFlash - dt);
  if (e.bellShake > 0) e.bellShake = Math.max(0, e.bellShake - dt);
  if (e.shieldBrokenTimer > 0) e.shieldBrokenTimer = Math.max(0, e.shieldBrokenTimer - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 10 * dt);

  // v28.0 Live 5s Sliding-Window DPS & Posture-Per-Second Meter
  if (e.meter) {
    const now = G.globalTime || 0;
    const winSec = 5.0;
    const hits = e.meter.hits;
    while (hits.length > 0 && now - hits[0].t > winSec) hits.shift();
    if (hits.length > 0) {
      let sumD = 0, sumP = 0;
      for (let i = 0; i < hits.length; i++) { sumD += hits[i].d; sumP += hits[i].p; }
      const span = Math.max(1.0, Math.min(winSec, now - hits[0].t + 0.35));
      e.meter.dps = sumD / span;
      e.meter.pps = sumP / span;
    } else {
      e.meter.dps = 0;
      e.meter.pps = 0;
    }
  }

  const modeObj = DUMMY_MODES[e.modeIdx] || DUMMY_MODES[0];
  const px = G.player ? (G.player.x + G.player.w * 0.5) : e.homeX;
  const py = G.player ? (G.player.y + G.player.h * 0.5) : e.y;
  const cx = e.x + e.w * 0.5;
  const dx = px - cx;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(py - (e.y + e.h * 0.5));

  // v28.0 Practice Auto-Refill (Full Seals + Full Soul) while training nearby
  if (G.dummyAutoFullSeals && G.player && G.player.hp > 0 && absDx <= 320 && absDy <= 190) {
    if (G.player.seals < G.player.maxSeals || G.player.soul < G.player.maxSoul) {
      G.dummyRefillTimer = (G.dummyRefillTimer || 0) + dt;
      if (G.dummyRefillTimer >= 1.15) {
        G.dummyRefillTimer = 0;
        G.player.seals = G.player.maxSeals;
        G.player.soul = G.player.maxSoul;
        spawnShockwave(px, py, 56, COLORS.goldBright, 2.4, 0.22);
      }
    } else {
      G.dummyRefillTimer = 0;
    }
  }

  // Auto-disengage & gently heal player training damage when walking away
  if (e.active && (absDx > 320 || absDy > 190)) {
    e.active = false;
    e.state = 'idle';
    e.shieldUp = false;
    e.hp = e.maxHp;
    e.posture = 0;
    e.drillStep = 0;
    if (e.hitPlayerDuringDrill && G.player && G.player.hp > 0 && G.player.hp < G.player.maxHp) {
      G.player.hp = G.player.maxHp;
      G.player.grayHp = 0;
      spawnFloatText(px, G.player.y - 26, t('combat.dummyHeal'), COLORS.cyanBright, 16, 1.0);
    }
    e.hitPlayerDuringDrill = false;
  }

  // Dormant or Pure Punching-Bag Mode
  if (!e.active || modeObj.id === 'dormant') {
    e.shieldUp = false;
    if (e.state === 'stagger') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'idle';
        e.posture = 0;
      }
    } else {
      e.state = 'idle';
      const toHome = e.homeX - e.x;
      e.vx = Math.abs(toHome) > 4 ? Math.sign(toHome) * 95 : 0;
      if (Math.abs(toHome) <= 4) e.facing = dx >= 0 ? 1 : -1;
      if (e.hp < e.maxHp) {
        e.idleResetTimer += dt;
        if (e.idleResetTimer >= 2.8) {
          e.idleResetTimer = 0;
          e.hp = e.maxHp;
          e.posture = 0;
        }
      } else {
        e.idleResetTimer = 0;
      }
    }
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    return;
  }

  e.stateTimer -= dt;
  if (e.state === 'stagger') {
    e.shieldUp = false;
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 0.75;
      e.posture = 0;
      e.hp = e.maxHp;
    }
  } else if (e.state === 'idle' || e.state === 'stalk') {
    e.shieldUp = false;
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 106) e.vx = e.facing * 125;
    else if (absDx < 62) e.vx = -e.facing * 78;
    else e.vx *= damp(0.8, dt);

    const engageDist = (modeObj.id === 'biomeWind' || modeObj.id === 'biomeMountain') ? 275 : 175;
    if (e.stateTimer <= 0 && absDx < engageDist) {
      let nextMove = 'parry1';
      e.inflictsFrost = 0;
      if (modeObj.id === 'parryOnly') {
        nextMove = (e.drillStep % 2 === 0) ? 'parry1' : 'combo2';
      } else if (modeObj.id === 'redOnly') {
        nextMove = 'redThrust';
      } else if (modeObj.id === 'biomeWind') {
        nextMove = (e.drillStep % 2 === 0) ? 'windBarrage' : 'parry1';
      } else if (modeObj.id === 'biomeForest') {
        nextMove = (e.drillStep % 2 === 0) ? 'sporeShield' : 'parry1';
      } else if (modeObj.id === 'biomeMountain') {
        e.inflictsFrost = 34;
        nextMove = (e.drillStep % 2 === 0) ? 'frostCombo' : 'frostShot';
      } else {
        const seq = ['parry1', 'combo2', 'redThrust', 'shieldGuard'];
        nextMove = seq[e.drillStep % seq.length];
      }
      e.drillStep++;
      e.attackKind = nextMove;
      e.comboIdx = 0;
      e.comboTotal = nextMove === 'combo2' ? 2 : nextMove === 'frostCombo' ? 3 : 1;
      e.isDelayedHit = false;
      e.glintPlayed = false;
      e.didHit = false;
      e.vx = 0;

      if (nextMove === 'shieldGuard' || nextMove === 'sporeShield') {
        e.state = 'shieldGuard';
        e.stateTimer = 2.8;
        e.shieldUp = true;
        e.shieldBrokenTimer = 0;
        audio.playResonanceBell(392, false);
        if (nextMove === 'sporeShield') {
          audio.playSporeBurst();
          if (G.sporeClouds.length < 2) {
            G.sporeClouds.push({ x: cx + e.facing * 56, y: e.y + e.h - 26, r: 64, life: 5.5, maxLife: 5.5, dmg: 6 });
          }
          spawnFloatText(cx, e.y - 28, t('combat.dummySporeHint'), '#6ee7b7', 15, 1.45);
        } else {
          spawnFloatText(cx, e.y - 28, t('combat.dummyShieldHint'), COLORS.goldBright, 15, 1.35);
        }
      } else {
        e.state = 'windup';
        e.stateTimer = nextMove === 'redThrust' ? 0.72 : (nextMove === 'windBarrage' || nextMove === 'frostShot' ? 0.60 : (nextMove === 'combo2' || nextMove === 'frostCombo' ? 0.48 : 0.58));
        e.windupDuration = e.stateTimer;
        if (nextMove === 'redThrust') {
          audio.playDangerAlert();
          spawnFloatText(cx, e.y - 34, t('combat.dummyRedHint'), COLORS.crimsonBright, 15, 0.9);
        }
      }
    }
  } else if (e.state === 'shieldGuard') {
    e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.8, dt);
    if (!e.shieldUp || e.shieldBrokenTimer > 0) {
      e.shieldUp = false;
      e.state = 'recover';
      e.stateTimer = 1.1;
    } else if (e.stateTimer <= 0) {
      e.shieldUp = false;
      e.state = 'recover';
      e.stateTimer = 0.65;
    }
  } else if (e.state === 'windup') {
    const isRed = e.attackKind === 'redThrust';
    if (e.stateTimer > 0.20) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.82, dt);
    if (!isRed && !e.glintPlayed && e.stateTimer <= 0.23) {
      e.glintPlayed = true;
      audio.playGlintCue(e.isDelayedHit);
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      if (e.attackKind === 'windBarrage') {
        e.stateTimer = 0.26;
        e.didHit = true;
        audio.playWindBlade();
        const a0 = Math.atan2(py - (e.y + 30), px - cx);
        [-0.12, 0.12].forEach(sp => {
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'windBlade',
            x: cx + e.facing * 22, y: e.y + 28,
            vx: Math.cos(a0 + sp) * 365, vy: Math.sin(a0 + sp) * 365,
            r: 12, dmg: 12, posture: 18, life: 2.0, maxLife: 2.0, reflected: false, hitIds: new Set()
          });
        });
      } else if (e.attackKind === 'frostShot') {
        e.stateTimer = 0.26;
        e.didHit = true;
        audio.playFrostShatter();
        const a0 = Math.atan2(py - (e.y + 30), px - cx);
        G.projectiles.push({
          owner: 'enemy', source: e, kind: 'frostShard', inflictsFrost: 36,
          x: cx + e.facing * 22, y: e.y + 28,
          vx: Math.cos(a0) * 390, vy: Math.sin(a0) * 390,
          r: 12, dmg: 12, posture: 20, life: 2.0, maxLife: 2.0, reflected: false, hitIds: new Set()
        });
      } else {
        e.stateTimer = isRed ? 0.22 : 0.18;
        e.vx = e.facing * (isRed ? 340 : 165);
        audio.playSlash(isRed ? 0.75 : (0.94 + e.comboIdx * 0.14), isRed || e.comboIdx === 1);
        G.slashes.push({
          x: cx + e.facing * 28,
          y: e.y + 32,
          facing: e.facing,
          type: isRed ? 'enemyRedThrust' : (e.comboIdx === 1 ? 'bossSlam' : 'enemyThrust'),
          life: 0.22,
          maxLife: 0.22
        });
      }
    }
  } else if (e.state === 'attack') {
    e.vx *= damp(0.9, dt);
    if (!e.didHit) {
      const isRed = e.attackKind === 'redThrust';
      const reach = isRed ? 92 : 80;
      const hitBox = {
        x: cx + (e.facing > 0 ? -4 : -reach + 4),
        y: e.y + 10,
        w: reach,
        h: 52
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 12, isRed, 195);
      }
    }
    if (e.stateTimer <= 0) {
      e.comboIdx++;
      if (e.comboIdx < e.comboTotal) {
        e.state = 'windup';
        e.isDelayedHit = true;
        e.glintPlayed = false;
        e.stateTimer = 0.58;
        e.windupDuration = 0.58;
        e.didHit = false;
      } else {
        e.state = 'recover';
        e.stateTimer = 0.95;
      }
    }
  } else if (e.state === 'recover') {
    e.shieldUp = false;
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.45;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (e.x < e.minX) { e.x = e.minX; e.vx = 0; }
  if (e.x > e.maxX) { e.x = e.maxX; e.vx = 0; }
  if (Math.abs(e.vx) > 15 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.045;
}

export function updatePriest(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.rippleCd > 0) e.rippleCd = Math.max(0, e.rippleCd - dt);
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
    e.vx *= damp(0.85, dt);
    e.chantTargetId = null;
    if (e.stateTimer <= 0) {
      e.state = 'idle';
      e.posture = e.maxPosture * 0.28;
      e.stateTimer = 0.9;
    }
  } else if (e.state === 'idle') {
    e.vx *= damp(0.8, dt);
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
      } else if (bestAlly && (bestAlly.wardShield || 0) <= 1.2) {
        e.state = 'chant';
        e.stateTimer = 0.95;
        e.chantTargetId = bestAlly.id;
        audio.playResonanceBell(587.33, false);
      } else if ((e.rippleCd || 0) <= 0 && dist < 310 && Math.abs(py - cy) < 95 && hasLineOfSight(cx, cy, px, py)) {
        // v45.1 Mid-range golden ground resonance ripple (jump or parry!)
        e.state = 'ripple';
        e.stateTimer = 0.62;
        e.didHit = false;
        e.chantTargetId = null;
        audio.playResonanceBell(440, false);
      } else if (dist < 480 && hasLineOfSight(cx, cy, px, py)) {
        // No ally left: self-channel golden ward orb
        e.state = 'chant';
        e.stateTimer = 0.88;
        e.chantTargetId = null;
      }
    }
  } else if (e.state === 'chant') {
    e.vx *= damp(0.8, dt);
    if (Math.random() < 27.0 * dt) {
      spawnParticles(cx, e.y + 8, 1, { color: COLORS.goldBright, speed: 65, grav: -90, life: 0.34 });
    }
    if (e.stateTimer <= 0) {
      const ally = e.chantTargetId ? G.enemies.find(a => a && a.alive && a.id === e.chantTargetId) : null;
      if (ally) {
        ally.wardShield = 6.5;
        e.blessedAllyId = ally.id;
        audio.playPogoLantern();
        spawnShockwave(cx, e.y + 12, 72, COLORS.goldBright, 2.8, 0.28);
        spawnShockwave(ally.x + ally.w / 2, ally.y + ally.h * 0.45, 76, COLORS.goldBright, 3.2, 0.32);
        spawnFloatText(ally.x + ally.w / 2, ally.y - 24, t('combat.wardCast'), COLORS.goldBright, 16, 0.85);
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
    e.vx *= damp(0.8, dt);
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
  } else if (e.state === 'ripple') {
    e.vx *= damp(0.8, dt);
    if (e.stateTimer <= 0.16 && !e.didHit) {
      e.didHit = true;
      e.rippleCd = 4.5;
      audio.playBellQuake();
      spawnShockwave(cx + e.facing * 18, e.y + e.h - 4, 86, COLORS.goldBright, 3.4, 0.28);
      G.groundWaves.push({
        x: cx + e.facing * 24, y: e.y + e.h, minX: cx - 360, maxX: cx + 360,
        vx: e.facing * 310, w: 30, h: 38, life: 1.15, hit: false, gold: true
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'recover';
      e.stateTimer = 1.35;
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.82, dt);
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
  if (e.deflectCd > 0) e.deflectCd = Math.max(0, e.deflectCd - dt);
  if (e.lightHitDecay > 0) {
    e.lightHitDecay = Math.max(0, e.lightHitDecay - dt);
    if (e.lightHitDecay <= 0) e.lightHitsTaken = 0;
  }
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

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
    e.vx = e.facing * 88;
    if (e.x < e.minX) e.facing = 1;
    if (e.x > e.maxX) e.facing = -1;
    if (absDx < 360 && Math.abs(dy) < 120) e.state = 'chase';
  } else if (e.state === 'chase') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 92) e.vx = e.facing * 178;
    else e.vx *= damp(0.8, dt);
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
    e.vx *= damp(0.82, dt);
    if (e.attackKind === 'combo3' && e.comboIdx === 2 && Math.random() < 0.45) {
      spawnParticles(e.x + e.w / 2 + e.facing * 12, e.y + 24, 1, { color: COLORS.goldBright, speed: 60, grav: -40, life: 0.2 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.didHit = false;
      const isRed = e.attackKind === 'redDash';
      const isCounterIai = e.attackKind === 'counterIai';
      const isFinisher = !isRed && !isCounterIai && e.comboIdx === 2;
      e.stateTimer = isRed ? 0.22 : (isCounterIai ? 0.20 : (isFinisher ? 0.20 : 0.14));
      e.vx = e.facing * (isRed ? 520 : isCounterIai ? 440 : isFinisher ? 340 : 250);
      if (isCounterIai) audio.playIaiSlash();
      else audio.playSlash(isRed ? 0.78 : (0.95 + e.comboIdx * 0.14), isFinisher || isRed);
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
    e.vx *= damp(0.9, dt);
    if (!e.didHit) {
      const isRed = e.attackKind === 'redDash';
      const isCounterIai = e.attackKind === 'counterIai';
      const reach = isRed ? 96 : (isCounterIai ? 102 : (e.comboIdx === 2 ? 92 : 76));
      const hitBox = {
        x: e.x + e.w / 2 + (e.facing > 0 ? -4 : -reach + 4),
        y: e.y + 8,
        w: reach,
        h: 50
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        const dmg = isRed ? 26 : (isCounterIai ? 23 : (e.comboIdx === 2 ? 24 : 15));
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
    e.vx *= damp(0.84, dt);
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
    e.vx *= damp(0.82, dt);
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
    if (Math.random() < 2.4 * dt) {
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
  if (e.blinkCd > 0) e.blinkCd = Math.max(0, e.blinkCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7 * dt);

  e.bobPhase += dt * 2.8;
  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const dist = Math.hypot(dx, dy);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
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
      const canSee = dist < 490 && Math.abs(dy) < 260 && hasLineOfSight(e.x + e.w * 0.5, e.y + e.h * 0.5, G.player.x + G.player.w * 0.5, G.player.y + G.player.h * 0.5);
      if (canSee && dist < 95 && (e.blinkCd || 0) <= 0) {
        // v45.1 Panic Blink Retreat when cornered by player!
        e.blinkCd = 5.0;
        const fleeDir = dx >= 0 ? -1 : 1;
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 14, { color: COLORS.cyanBright, speed: 180, spark: true, life: 0.32 });
        e.x = e.homeX + fleeDir * 95;
        e.y = e.homeY - 26;
        audio.playShadowBlink();
        spawnShockwave(e.x + e.w / 2, e.y + e.h / 2, 54, COLORS.cyanBright, 2.6, 0.24);
        e.state = 'windup';
        e.attackKind = 'twinArc';
        e.stateTimer = 0.62;
      } else if (canSee && e.stateTimer <= 0) {
        e.state = 'windup';
        e.attackKind = Math.random() < 0.42 ? 'twinArc' : 'singleOrb';
        e.stateTimer = e.attackKind === 'twinArc' ? 0.74 : 0.68;
      }
    } else if (e.state === 'windup') {
      if (Math.random() < 24.0 * dt) {
        spawnParticles(e.x + e.w / 2 + e.facing * 14, e.y + 22, 1, { color: COLORS.goldBright, speed: 60, grav: 0, life: 0.24 });
      }
      if (e.stateTimer <= 0) {
        const baseA = Math.atan2(dy, dx);
        audio.playWraithShot();
        const spreads = e.attackKind === 'twinArc' ? [-0.20, 0.20] : [0];
        for (let si = 0; si < spreads.length; si++) {
          const a = baseA + spreads[si];
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'wraithOrb',
            x: e.x + e.w / 2 + e.facing * 16, y: e.y + 22 + spreads[si] * 24,
            vx: Math.cos(a) * (spreads.length > 1 ? 305 : 325),
            vy: Math.sin(a) * (spreads.length > 1 ? 305 : 325),
            r: 12, dmg: spreads.length > 1 ? 15 : 18, posture: 26,
            life: 2.6, maxLife: 2.6, reflected: false, hitIds: new Set()
          });
        }
        e.state = 'recover';
        e.stateTimer = e.attackKind === 'twinArc' ? 2.1 : 1.9;
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
  if (e.guardCd > 0) e.guardCd = Math.max(0, e.guardCd - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 8 * dt);

  const dx = (G.player.x + G.player.w / 2) - (e.x + e.w / 2);
  const dy = (G.player.y + G.player.h / 2) - (e.y + e.h / 2);
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
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
    else e.vx *= damp(0.8, dt);

    if (absDx < 128 && Math.abs(dy) < 80 && e.stateTimer <= 0) {
      if ((e.guardCd || 0) <= 0 && absDx < 105 && Math.random() < 0.30) {
        // v45.1 Braced Spear-Guard Stance: deflects light frontal swings into a parryable riposte; heavy/back/pogo breaks guard!
        e.state = 'spearGuard';
        e.stateTimer = 1.05;
        e.guardCd = 4.2;
        e.vx = 0;
        audio.playParry(false);
        spawnShockwave(e.x + e.w / 2 + e.facing * 18, e.y + 30, 44, COLORS.goldBright, 2.4, 0.20);
      } else {
        e.state = 'windup';
        e.attackKind = Math.random() < 0.28 ? 'redLunge' : 'thrust';
        e.stateTimer = e.attackKind === 'redLunge' ? 0.65 : 0.48;
        e.didHit = false;
        e.vx = 0;
        if (e.attackKind === 'redLunge') audio.playDangerAlert();
      }
    } else if (absDx > 460) {
      e.state = 'patrol';
    }
  } else if (e.state === 'spearGuard') {
    e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.75, dt);
    if (e.stateTimer <= 0) {
      e.state = 'windup';
      e.attackKind = 'thrust';
      e.stateTimer = 0.42;
      e.didHit = false;
    }
  } else if (e.state === 'windup') {
    e.vx *= damp(0.82, dt);
    if (e.stateTimer <= 0) {
      e.state = 'attack';
      e.stateTimer = 0.2;
      e.vx = e.facing * (e.attackKind === 'redLunge' ? 420 : e.attackKind === 'counterThrust' ? 320 : 240);
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
    e.vx *= damp(0.9, dt);
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
    e.vx *= damp(0.84, dt);
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
    e.vx *= damp(0.85, dt);
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
    else e.vx *= damp(0.8, dt);

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
    e.vx *= damp(0.82, dt);
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
    e.vx *= damp(0.9, dt);
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
    e.vx *= damp(0.84, dt);
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

// v45.1 Five biome-exclusive enemies modularized into src/ai/biomeEnemiesAi.js
export { updateFalcon, updateFungus, updateFrostguard, updateDrowned, updateAnchorite } from './biomeEnemiesAi.js';
export { updateWeaver, updateCrawler, updateCantor } from './exoticEnemiesAi.js';
