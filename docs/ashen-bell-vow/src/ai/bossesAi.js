// Main Boss & Hidden Boss AI: Hui, Ji, Yuan, Zhu (split from src/ai.js in v32.0)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY, DUMMY_MODES, WIND_ZONES, BOUNCE_PADS } from '../config.js';
import { G, addShake, triggerBossBanner, triggerBossIntro, getCombatScaling, isPlayerInRoomId, isBoss4Unlocked, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t, locBoss } from '../i18n.js';

function pickWeightedBossMove(lastMove, pool) {
  let total = 0;
  const weighted = [];
  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    // Strongly suppress repeating the exact same move back-to-back
    const w = item.kind === lastMove ? item.w * 0.14 : item.w;
    if (w > 0) {
      total += w;
      weighted.push({ kind: item.kind, w });
    }
  }
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i++) {
    roll -= weighted[i].w;
    if (roll <= 0) return weighted[i].kind;
  }
  return weighted.length ? weighted[weighted.length - 1].kind : pool[0].kind;
}

// Keeps multi-hit sword-clash spacing locked in the Sekiro sweet spot (56-102px)
// so rapid 3/4/5-hit parry symphonies never whiff AND never slide through the player!
function applyClashSpacingWindup(b, px, dt) {
  const bx = b.x + b.w * 0.5;
  const gap = (px - bx) * b.facing;
  if (gap > 102) {
    b.vx = b.facing * 170;
  } else if (gap < 64 && gap > -20) {
    b.vx = -b.facing * 95;
  } else {
    b.vx *= damp(0.80, dt);
  }
}

function applyClashSpacingStrike(b, px) {
  const bx = b.x + b.w * 0.5;
  const gap = (px - bx) * b.facing;
  if (gap < 56 && gap > -18) {
    b.x = px - b.facing * 56 - b.w * 0.5;
    b.vx *= 0.2;
  }
}

function tickBossOverheadPressure(b, dt) {
  if (b.antiAirCd > 0) b.antiAirCd = Math.max(0, b.antiAirCd - dt);
  if (!G.player || G.player.hp <= 0) return false;
  const px = G.player.x + G.player.w * 0.5;
  const pFootY = G.player.y + G.player.h;
  const bx = b.x + b.w * 0.5;
  const overhead = pFootY < b.y + 24 && Math.abs(px - bx) < 138;
  if (overhead) {
    b.overheadPressure = (b.overheadPressure || 0) + dt * 1.55;
  } else {
    b.overheadPressure = Math.max(0, (b.overheadPressure || 0) - dt * 0.72);
    if (G.player.grounded && b.pogoHitsTaken > 0) b.pogoHitsTaken = 0;
  }
  return b.antiAirCd <= 0 && (b.overheadPressure >= 0.68 || (b.pogoHitsTaken || 0) >= 2);
}

function consumeBossAntiAirTrigger(b, cd = 3.2) {
  b.overheadPressure = 0;
  b.pogoHitsTaken = 0;
  b.antiAirCd = cd;
}

function tickBossGreedPressure(b, dt, absDx) {
  if (b.greedPunishCd > 0) b.greedPunishCd = Math.max(0, b.greedPunishCd - dt);
  if (b.greedDecayTimer > 0) {
    b.greedDecayTimer = Math.max(0, b.greedDecayTimer - dt);
  } else if (b.greedHits > 0) {
    b.greedHits = Math.max(0, b.greedHits - dt * 1.4);
  }
  return b.greedPunishCd <= 0 && (b.greedHits || 0) >= 4 && absDx < 175;
}

function consumeBossGreedTrigger(b, cd = 5.4) {
  b.greedHits = 0;
  b.greedDecayTimer = 0;
  b.greedPunishCd = cd;
}


export function updateBoss(b, dt) {
  if (!b || !b.alive) return;
  const arenaFloorY = b.arenaFloorY !== undefined ? b.arenaFloorY : FLOOR_Y, arenaMinX = b.arenaMinX || 0;
  const arenaMaxX = b.arenaMaxX !== undefined ? b.arenaMaxX : (arenaMinX + 1090), arenaW = Math.max(400, arenaMaxX - arenaMinX);
  const waveMinX = arenaMinX - 28, waveMaxX = arenaMaxX + 22;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 7.0 * dt);

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
    b.inkTideCd = 3.2;
    b.vx = 0;
    audio.playBellToll();
    addShake(15);
    G.screenFlash = { alpha: 0.32, color: COLORS.crimson };
    spawnShockwave(b.x + b.w / 2, b.y + 40, 260, COLORS.crimsonBright, 5, 0.5);
    triggerHaptic('bossPhase');
    triggerBossBanner(t('boss.hui.p2Title'), t('boss.hui.p2Quote'), COLORS.crimsonBright, 2.5);
    spawnFloatText(b.x + b.w / 2, b.y - 44, t('boss.hui.p2Title'), COLORS.crimsonBright, 24, 1.8);
    G.groundWaves.push({ x: b.x + b.w / 2, y: arenaFloorY, minX: waveMinX, maxX: waveMaxX, vx: -420, w: 36, h: 48, life: 2.2, hit: false });
    G.groundWaves.push({ x: b.x + b.w / 2, y: arenaFloorY, minX: waveMinX, maxX: waveMaxX, vx: 420, w: 36, h: 48, life: 2.2, hit: false });
  }

  const px = G.player.x + G.player.w / 2;
  const dx = px - (b.x + b.w / 2);
  const absDx = Math.abs(dx);
  const b1Aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * b1Aggro;
  const b1WantsAntiAir = tickBossOverheadPressure(b, dt);
  if (b.phase === 2 && b.inkTideCd > 0) b.inkTideCd -= dt * b1Aggro;

  if (b.state === 'phaseShift') {
    b.vx *= damp(0.8, dt);
    if (Math.random() < 30.0 * dt) {
      spawnParticles(b.x + b.w / 2, b.y + 30, 2, { color: COLORS.crimsonBright, speed: 180, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.5;
    }
  } else if (b.state === 'stagger') {
    b.vx *= damp(0.85, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.25;
      b.stateTimer = 0.45;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const moveSpd = b.phase === 2 ? 178 : 132;
    b.vx = absDx > 112 ? b.facing * moveSpd : b.vx * 0.85;

    if (b1WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 3.0);
      b.moveKind = 'antiAirSlash';
      b.lastMoveKind = 'antiAirSlash';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.state = 'windup';
      b.stateTimer = 0.42;
      b.windupDuration = 0.42;
      b.didHit = false;
      b.vx = 0;
      spawnFloatText(b.x + b.w / 2, b.y - 44, t('combat.antiAirHui'), COLORS.goldBright, 17, 0.9);
    } else if (b.stateTimer <= 0 && b.phase === 2 && b.inkTideCd <= 0 && !G.chapelTide) {
      b.moveKind = 'inkTide';
      b.lastMoveKind = 'inkTide';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.state = 'windup';
      b.stateTimer = 1.08;
      b.windupDuration = 1.08;
      b.inkTideCd = 12.5;
      b.didHit = false;
      b.vx = 0;
      const arenaLanternIds = G.lanterns ? G.lanterns.filter(l => l.roomId === b.roomId).map(l => l.id) : [];
        G.chapelTide = { phase: 'warn', timer: 1.08, maxTimer: 1.08, hitCd: 0, x0: arenaMinX, w: arenaW, floorY: arenaFloorY, owner: b, lanternIds: arenaLanternIds, theme: 'crimson' };
      audio.playDangerAlert();
      audio.playBellToll();
      addShake(9);
      spawnFloatText(b.x + b.w / 2, b.y - 54, t('boss.hui.tideWarn'), COLORS.crimsonBright, 21, 1.45);
    } else if (b.stateTimer <= 0 && absDx < 440) {
      const pool = b.phase === 2
        ? [
            { kind: 'flurry4', w: absDx < 250 ? 34 : 18 },
            { kind: 'redLeap', w: absDx > 165 ? 26 : 16 },
            { kind: 'chargeThrust', w: absDx > 200 ? 28 : 12 },
            { kind: 'delaySlam', w: 22 },
            { kind: 'feintSweep', w: 20 },
            { kind: 'combo2', w: 12 }
          ]
        : [
            { kind: 'combo2', w: 28 },
            { kind: 'feintSweep', w: 24 },
            { kind: 'delaySlam', w: 30 },
            { kind: 'chargeThrust', w: absDx > 195 ? 34 : 14 }
          ];
      const chosen = pickWeightedBossMove(b.lastMoveKind, pool);
      b.moveKind = chosen;
      b.lastMoveKind = chosen;
      b.comboIdx = 0;
      b.comboTotal = chosen === 'flurry4' ? 4 : (chosen === 'combo2' || chosen === 'feintSweep') ? 2 : 1;
      b.isDelayedHit = chosen === 'delaySlam';
      b.glintPlayed = false;
      b.finisherParried = false;
      b.state = 'windup';
      if (chosen === 'redLeap') {
        b.stateTimer = 0.68;
        audio.playDangerAlert();
      } else if (chosen === 'flurry4') {
        b.stateTimer = 0.46;
      } else if (chosen === 'chargeThrust') {
        b.stateTimer = 0.58;
      } else if (chosen === 'combo2' || chosen === 'feintSweep') {
        b.stateTimer = chosen === 'feintSweep' ? 0.36 : 0.46;
      } else {
        b.stateTimer = 0.86;
      }
      b.windupDuration = b.stateTimer;
      b.didHit = false;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    const isRedMove = b.moveKind === 'redLeap' || b.moveKind === 'inkTide';
    if (b.moveKind !== 'inkTide' && b.stateTimer > 0.21) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    if (b.moveKind === 'flurry4' || b.moveKind === 'combo2') {
      applyClashSpacingWindup(b, px, dt);
    } else {
      b.vx *= damp(0.82, dt);
    }
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.23) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.isDelayedHit && Math.random() < 0.45) {
      spawnParticles(b.x + b.w / 2 - b.facing * 8, b.y - 14, 1, { color: COLORS.goldBright, speed: 60, grav: -60, life: 0.24 });
    }
    if (b.moveKind === 'inkTide' && Math.random() < 0.65) {
      spawnParticles(b.x + b.w / 2 + (Math.random() - 0.5) * 80, arenaFloorY - 6, 1, { color: COLORS.crimsonBright, speed: 95, grav: -180, life: 0.34 });
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
        spawnShockwave(bx, arenaFloorY - 8, 220, COLORS.crimsonBright, 5, 0.42);
      } else if (b.moveKind === 'redLeap') {
        b.stateTimer = 1.15;
        b.leapAirborne = false;
        b.grounded = false;
        b.vx = b.facing * 470;
        b.vy = -440;
        audio.playSlash(0.62, true);
        G.slashes.push({ x: bx + b.facing * 36, y: by - 8, facing: b.facing, type: 'bossRedSlam', life: 0.32, maxLife: 0.32 });
      } else if (b.moveKind === 'chargeThrust') {
        b.stateTimer = 0.28;
        b.vx = b.facing * 640;
        audio.playSlash(0.75, true);
        G.slashes.push({ x: bx + b.facing * 46, y: by + 6, facing: b.facing, type: 'bossThrust', life: 0.26, maxLife: 0.26 });
      } else if (b.moveKind === 'antiAirSlash') {
        b.stateTimer = 0.26;
        b.vx = b.facing * 90;
        audio.playSlash(1.06, true);
        spawnShockwave(bx, b.y - 12, 118, COLORS.goldBright, 3.8, 0.26);
        G.slashes.push({ x: bx, y: b.y - 16, facing: b.facing, type: 'bossAntiAir', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'feintSweep') {
        const isFollow = b.comboIdx === 1;
        b.stateTimer = isFollow ? 0.24 : 0.14;
        b.vx = b.facing * (isFollow ? 320 : 210);
        audio.playSlash(isFollow ? 0.74 : 1.24, isFollow);
        G.slashes.push({
          x: bx + b.facing * (isFollow ? 48 : 30),
          y: by + (isFollow ? 4 : -6),
          facing: b.facing,
          type: isFollow ? 'bossRedSweep' : 'bossThrust',
          life: isFollow ? 0.26 : 0.18,
          maxLife: isFollow ? 0.26 : 0.18
        });
      } else if (b.moveKind === 'delaySlam') {
        b.stateTimer = 0.24;
        b.vx = b.facing * (absDx > 96 ? 260 : 120);
        audio.playSlash(0.65, true);
        G.slashes.push({ x: bx + b.facing * 44, y: by - 4, facing: b.facing, type: 'bossSlam', life: 0.28, maxLife: 0.28 });
      } else {
        const isLast = b.comboIdx === b.comboTotal - 1;
        b.stateTimer = isLast ? 0.22 : 0.18;
        b.vx = b.facing * (absDx > 96 ? 265 : 115);
        audio.playSlash(0.84 + b.comboIdx * 0.09, isLast);
        G.slashes.push({
          x: bx + b.facing * 42,
          y: by + (b.comboIdx % 2 === 0 ? -4 : 10),
          facing: b.facing,
          type: isLast ? 'bossSlam' : (b.comboIdx % 2 === 0 ? (b.phase === 2 ? 'bossRedSweep' : 'bossSweep') : 'bossUpSweep'),
          life: 0.23,
          maxLife: 0.23
        });
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= damp(0.90, dt);
    if (b.moveKind === 'flurry4' || b.moveKind === 'combo2') {
      applyClashSpacingStrike(b, px);
    }
    if (b.moveKind !== 'inkTide') {
      const isRed = b.moveKind === 'redLeap';
      const isAA = b.moveKind === 'antiAirSlash';
      const reach = b.moveKind === 'chargeThrust' ? 128 : b.moveKind === 'delaySlam' ? 118 : b.moveKind === 'feintSweep' ? 124 : 112;
      if (!b.didHit) {
        const hitBox = isAA
          ? { x: b.x + b.w / 2 - 82, y: b.y - 76, w: 164, h: 128 }
          : {
              x: b.x + b.w / 2 + (b.facing > 0 ? -10 : -reach + 10),
              y: b.y + 8,
              w: reach,
              h: 92
            };
        if (aabbOverlap(hitBox, G.player)) {
          b.didHit = true;
          const dmg = isRed ? 32 : b.moveKind === 'delaySlam' ? 28 : (b.comboIdx === b.comboTotal - 1 ? 25 : 20);
          applyIncomingAttackToPlayer(b, dmg, isRed, 260);
        }
      }
    }

    if (b.moveKind === 'redLeap' && !b.grounded) b.leapAirborne = true;

    const strikeFinished = b.moveKind === 'redLeap'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);

    if (strikeFinished) {
      if (b.moveKind === 'delaySlam' && b.phase === 2) {
        addShake(8);
        G.groundWaves.push({ x: b.x + b.w / 2 + b.facing * 50, y: arenaFloorY, minX: waveMinX, maxX: waveMaxX, vx: b.facing * 420, w: 34, h: 44, life: 1.8, hit: false });
      }
      if (b.moveKind === 'redLeap') {
        b.leapAirborne = false;
        b.vx = 0;
        addShake(12);
        spawnShockwave(b.x + b.w / 2, b.y + b.h - 6, 130, COLORS.crimsonBright, 4, 0.3);
        spawnParticles(b.x + b.w / 2, b.y + b.h - 4, 18, { color: COLORS.crimsonBright, speed: 240, spark: true, life: 0.38 });
      }

      b.comboIdx++;
      if (b.comboIdx < b.comboTotal) {
        b.state = 'windup';
        // Upgraded flurry4 cadence: Fast -> Fast -> Fast -> Delayed Slow-Blade Finisher (0.52s)
        const isDelayedNext = (b.moveKind === 'flurry4' && b.comboIdx === 3) || (b.moveKind === 'feintSweep' && b.comboIdx === 1);
        b.isDelayedHit = isDelayedNext;
        b.glintPlayed = false;
        b.stateTimer = b.moveKind === 'flurry4' ? (isDelayedNext ? 0.52 : 0.28) : (b.moveKind === 'feintSweep' ? 0.56 : 0.36);
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        const baseRec = b.moveKind === 'inkTide' ? 0.95 : (b.phase === 2 ? 0.68 : 0.88);
        b.stateTimer = baseRec + (b.finisherParried ? 0.36 : 0);
        b.finisherParried = false;
      }
    }
  } else if (b.state === 'recover') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 2 ? 0.35 : 0.55;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) {
    b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.03;
    if ((b.state === 'stalk' || b.state === 'idle') && Math.random() < 12 * dt) {
      spawnParticles(b.x + b.w * 0.5 - b.facing * 24, b.y + b.h - 2, 1, { color: COLORS.goldBright, speed: 95, spark: true, grav: 320, life: 0.24 });
    }
  }
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 26, b.facing, -b.vx * 0.45, dt);
}

export function updateBoss2(b, dt) {
  if (!b || !b.alive) return;
  const arenaFloorY = b.arenaFloorY !== undefined ? b.arenaFloorY : WELL_BOTTOM_Y, arenaMinX = b.arenaMinX || 0;
  const arenaMaxX = b.arenaMaxX !== undefined ? b.arenaMaxX : (arenaMinX + 1112), arenaW = Math.max(400, arenaMaxX - arenaMinX);
  const arenaMidX = (arenaMinX + arenaMaxX) * 0.5;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.shieldBrokenTimer > 0) b.shieldBrokenTimer -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 6.8 * dt);

  b.orbitAngle += dt * (b.phase === 2 ? 4.4 : 2.5);
  const floorTop = b.arenaFloorY - b.h;

  if (!b.awake) {
    b.y = (arenaFloorY - 134) + Math.sin(G.globalTime * 2.1) * 9;
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
    triggerHaptic('bossPhase');
    triggerBossBanner(t('boss.ji.p2Title'), t('boss.ji.p2Quote'), COLORS.goldBright, 2.5);
    spawnFloatText(b.x + b.w / 2, b.y - 46, t('boss.ji.p2Title'), COLORS.goldBright, 24, 1.85);
    G.groundWaves.push({ x: b.x + b.w / 2, y: arenaFloorY, minX: arenaMinX, maxX: arenaMaxX, vx: -420, w: 38, h: 50, life: 2.3, hit: false, gold: true });
    G.groundWaves.push({ x: b.x + b.w / 2, y: arenaFloorY, minX: arenaMinX, maxX: arenaMaxX, vx: 420, w: 38, h: 50, life: 2.3, hit: false, gold: true });
  }

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const bx = b.x + b.w / 2;
  const dx = px - bx;
  const absDx = Math.abs(dx);
  const b2Aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * b2Aggro;
  const b2WantsAntiAir = tickBossOverheadPressure(b, dt);
  const b2WantsGreedPunish = tickBossGreedPressure(b, dt, absDx);
  if (b.phase === 2 && b.novaCd > 0) b.novaCd -= dt * b2Aggro;

  if (b.state === 'phaseShift') {
    b.x += (arenaMidX - b.w / 2 - b.x) * Math.min(1, dt * 3.5);
    b.y += (arenaFloorY - 210 - b.y) * Math.min(1, dt * 3.5);
    if (Math.random() < 39.0 * dt) {
      spawnParticles(bx, b.y + 38, 2, { color: COLORS.goldBright, speed: 200, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.45;
    }
  } else if (b.state === 'stagger') {
    b.shieldUp = false;
    b.vx *= damp(0.85, dt);
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
    // Lowered hover height (WELL_BOTTOM_Y - 128) keeps Boss 2 reachable by both melee up-slash & grapple
    const desiredX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.facing * 205));
    const desiredY = arenaFloorY - 128 + Math.sin(G.globalTime * 2.8) * 18;
    b.vx = (desiredX - b.x) * (b.phase === 2 ? 2.8 : 2.1);
    b.vy = (desiredY - b.y) * 2.8;
    b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
    b.y = Math.max(b.arenaTopY + 50, Math.min(floorTop, b.y + b.vy * dt));

    if (b2WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 3.2);
      b.moveKind = 'antiAirRise';
      b.lastMoveKind = 'antiAirRise';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.didHit = false;
      b.state = 'windup';
      b.stateTimer = 0.44;
      b.windupDuration = 0.44;
      audio.playDangerAlert();
      spawnFloatText(bx, b.y - 46, t('combat.antiAirJi'), COLORS.crimsonBright, 17, 0.9);
    } else if (b.stateTimer <= 0) {
      if (b.phase === 2 && b.novaCd <= 0 && !G.chapelTide) {
        b.moveKind = 'resonanceNova';
        b.lastMoveKind = 'resonanceNova';
        b.comboIdx = 0;
        b.comboTotal = 1;
        b.isDelayedHit = false;
        b.glintPlayed = false;
        b.state = 'windup';
        b.stateTimer = 1.12;
        b.windupDuration = 1.12;
        b.novaCd = 13.0;
        b.didHit = false;
        G.chapelTide = { phase: 'warn', timer: 1.25, maxTimer: 1.25, hitCd: 0, x0: arenaMinX, w: arenaW, floorY: arenaFloorY, owner: b, lanternIds: [], theme: 'gold' };
        b.stateTimer = 1.25; b.windupDuration = 1.25;
        audio.playDangerAlert(); audio.playBellToll(); addShake(9);
        spawnFloatText(bx, b.y - 54, t('boss.ji.novaWarnCrucible'), COLORS.goldBright, 21, 1.65);
      } else {
        let chosen;
        if (b2WantsGreedPunish) {
          consumeBossGreedTrigger(b, 5.4);
          chosen = 'redSweepHook';
          spawnFloatText(bx, b.y - 48, t('combat.greedPunish'), COLORS.crimsonBright, 17, 0.9);
        } else {
          chosen = pickWeightedBossMove(b.lastMoveKind, [
            { kind: 'chainDropSlam', w: 28 },
            { kind: 'bellShieldCharge', w: absDx > 160 ? 30 : 20 },
            { kind: 'bellBarrage', w: 22 },
            { kind: 'twinBellCross', w: 24 },
            { kind: 'redSweepHook', w: absDx < 250 ? 26 : 16 }
          ]);
        }
        b.moveKind = chosen;
        b.lastMoveKind = chosen;
        b.comboIdx = 0;
        b.comboTotal = 1;
        b.isDelayedHit = chosen === 'chainDropSlam';
        b.glintPlayed = false;
        b.didHit = false;
        b.state = 'windup';
        if (chosen === 'chainDropSlam') {
          b.stateTimer = b.phase === 2 ? 0.56 : 0.64;
          b.hoverTargetX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.w / 2));
          b.hoverTargetY = arenaFloorY - 320;
          audio.playSlash(1.1);
        } else if (chosen === 'bellShieldCharge') {
          b.stateTimer = 0.58;
          b.shieldUp = true;
          audio.playBellToll();
        } else if (chosen === 'bellBarrage' || chosen === 'twinBellCross') {
          b.stateTimer = chosen === 'twinBellCross' ? 0.56 : 0.62;
          b.hoverTargetX = Math.max(arenaMinX + 60, Math.min(arenaMaxX - b.w - 60, px > arenaMidX ? (arenaMinX + arenaW * 0.20) : (arenaMaxX - arenaW * 0.24)));
          b.hoverTargetY = arenaFloorY - 210;
          audio.playWraithShot();
        } else {
          b.stateTimer = 0.68;
          audio.playDangerAlert();
        }
        b.windupDuration = b.stateTimer;
      }
    }
  } else if (b.state === 'windup') {
    const isRedMove = b.moveKind === 'redSweepHook' || b.moveKind === 'resonanceNova' || b.moveKind === 'antiAirRise';
    if (b.moveKind !== 'resonanceNova' && b.stateTimer > 0.20) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.23) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.moveKind === 'resonanceNova') {
      b.x += (arenaMidX - b.w / 2 - b.x) * Math.min(1, dt * 6);
      b.y += (arenaFloorY - 260 - b.y) * Math.min(1, dt * 6);
      if (Math.random() < 42.0 * dt) {
        spawnParticles(bx + (Math.random() - 0.5) * 90, arenaFloorY - 8, 1, { color: COLORS.goldBright, speed: 110, grav: -200, life: 0.36 });
      }
    } else if (b.moveKind === 'chainDropSlam') {
      if (b.stateTimer > 0.22) {
        b.hoverTargetX = Math.max(b.arenaMinX + 40, Math.min(b.arenaMaxX - b.w - 40, px - b.w / 2));
      }
      b.x += (b.hoverTargetX - b.x) * Math.min(1, dt * 9);
      b.y += (b.hoverTargetY - b.y) * Math.min(1, dt * 9);
    } else if (b.moveKind === 'antiAirRise') {
      b.y += (Math.max(b.arenaTopY + 70, b.y - 14) - b.y) * Math.min(1, dt * 6);
    } else if (b.moveKind === 'bellBarrage' || b.moveKind === 'twinBellCross') {
      b.x += (b.hoverTargetX - b.x) * Math.min(1, dt * 5);
      b.y += (b.hoverTargetY - b.y) * Math.min(1, dt * 5);
    } else {
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
        spawnShockwave(bx, arenaFloorY - 10, 240, COLORS.goldBright, 5.2, 0.44);
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
      } else if (b.moveKind === 'antiAirRise') {
        b.stateTimer = 0.30;
        b.y = Math.max(b.arenaTopY + 55, b.y - 88);
        audio.playBellQuake();
        addShake(11);
        spawnShockwave(bx, b.y + 12, 165, COLORS.crimsonBright, 4.6, 0.32);
        spawnParticles(bx, b.y + 12, 26, { color: COLORS.goldBright, speed: 290, spark: true, life: 0.42 });
        G.slashes.push({ x: bx, y: b.y - 10, facing: b.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
      } else if (b.moveKind === 'twinBellCross') {
        b.stateTimer = 0.26;
        audio.playBellToll();
        [-1, 1].forEach(side => {
          const ox = bx + side * 125;
          const oy = b.y + 12;
          const a = Math.atan2(py - oy, px - ox);
          spawnShockwave(ox, oy, 58, COLORS.goldBright, 2.8, 0.22);
          for (let k = -1; k <= 1; k += (b.phase === 2 ? 1 : 2)) {
            const ang = a + k * 0.16;
            G.projectiles.push({
              owner: 'enemy', source: b, kind: 'wraithOrb',
              x: ox, y: oy, vx: Math.cos(ang) * 375, vy: Math.sin(ang) * 375,
              r: 13, dmg: 22, posture: 28, life: 2.6, maxLife: 2.6, reflected: false, hitIds: new Set()
            });
          }
        });
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
            vx: Math.cos(a) * (b.phase === 2 ? 380 : 335),
            vy: Math.sin(a) * (b.phase === 2 ? 380 : 335),
            r: 13,
            dmg: 22,
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
        G.slashes.push({ x: bx + b.facing * 75, y: arenaFloorY - 26, facing: b.facing, type: 'bossRedSweep', life: 0.28, maxLife: 0.28 });
      }
    }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'antiAirRise') {
      if (!b.didHit) {
        const aaBox = { x: bx - 96, y: b.y - 72, w: 192, h: 146 };
        if (aabbOverlap(aaBox, G.player)) {
          b.didHit = true;
          applyIncomingAttackToPlayer(b, 32, true, 290);
        }
      }
      if (b.stateTimer <= 0) {
        b.state = 'recover';
        b.stateTimer = 0.68;
      }
    } else if (b.moveKind === 'chainDropSlam') {
      b.y += b.vy * dt;
      const slamBox = { x: b.x - 16, y: b.y + 18, w: b.w + 32, h: b.h - 10 };
      if (!b.didHit && aabbOverlap(slamBox, G.player)) {
        b.didHit = true;
        applyIncomingAttackToPlayer(b, 28, false, 270);
      }
      if (b.y >= floorTop) {
        b.y = floorTop;
        b.vy = 0;
        addShake(12);
        audio.playHit(true);
        spawnShockwave(b.x + b.w / 2, arenaFloorY - 6, 145, COLORS.goldBright, 4.4, 0.34);
        spawnParticles(b.x + b.w / 2, arenaFloorY - 4, 24, { color: COLORS.goldBright, speed: 280, spark: true, life: 0.42 });
        G.groundWaves.push({ x: b.x + b.w / 2 - 42, y: arenaFloorY, minX: arenaMinX, maxX: arenaMaxX, vx: -400, w: 36, h: 46, life: 2.0, hit: false, gold: true });
        G.groundWaves.push({ x: b.x + b.w / 2 + 42, y: arenaFloorY, minX: arenaMinX, maxX: arenaMaxX, vx: 400, w: 36, h: 46, life: 2.0, hit: false, gold: true });
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.72 : 0.92;
      }
    } else if (b.moveKind === 'bellShieldCharge') {
      b.x += b.vx * dt;
      if (b.x < b.arenaMinX) { b.x = b.arenaMinX; b.stateTimer = 0; }
      if (b.x + b.w > b.arenaMaxX) { b.x = b.arenaMaxX - b.w; b.stateTimer = 0; }
      const chargeBox = { x: b.x - 10, y: b.y + 6, w: b.w + 20, h: b.h - 8 };
      if (!b.didHit && aabbOverlap(chargeBox, G.player)) {
        b.didHit = true;
        applyIncomingAttackToPlayer(b, 26, false, 290);
      }
      if (b.stateTimer <= 0) {
        b.shieldUp = false;
        b.vx = 0;
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.62 : 0.82;
      }
    } else if (b.moveKind === 'redSweepHook') {
      b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
      b.vx *= damp(0.86, dt);
      if (!b.didHit) {
        const reach = 185;
        const sweepBox = {
          x: b.x + b.w / 2 + (b.facing > 0 ? -12 : -reach + 12),
          y: arenaFloorY - 54,
          w: reach,
          h: 54
        };
        if (aabbOverlap(sweepBox, G.player)) {
          b.didHit = true;
          applyIncomingAttackToPlayer(b, 36, true, 290);
        }
      }
      if (b.stateTimer <= 0) {
        b.state = 'recover';
        b.stateTimer = b.phase === 2 ? 0.70 : 0.88;
      }
    } else {
      if (b.stateTimer <= 0) {
        b.state = 'recover';
        b.stateTimer = b.moveKind === 'resonanceNova' ? 0.95 : (b.phase === 2 ? 0.58 : 0.80);
      }
    }
  } else if (b.state === 'recover') {
    b.shieldUp = false;
    b.vx *= damp(0.84, dt);
    b.x = Math.max(b.arenaMinX, Math.min(b.arenaMaxX - b.w, b.x + b.vx * dt));
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 2 ? 0.34 : 0.52;
    }
  }

  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.4, dt);
}

/* ---------- FINAL BOSS: 初钟圣骸 · 渊 (Tuned 3-Phase Parry Symphony) ---------- */
export function updateBoss3(b, dt) {
  if (!b || !b.alive) return;
  const arenaFloorY = b.arenaFloorY !== undefined ? b.arenaFloorY : FLOOR_Y;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 6.2 * dt);
  b.haloAngle += dt * (b.phase === 3 ? 3.8 : b.phase === 2 ? 2.4 : 1.3);
  if (b.blinkAlpha < 1) b.blinkAlpha = Math.min(1, b.blinkAlpha + dt * 7.5);

  if (!b.awake) {
    b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, false);
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, 0, dt);
    return;
  }

  const bxCenter = b.x + b.w / 2;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const dx = px - bxCenter;
  const absDx = Math.abs(dx);

  // Phase 2 at <= 66% HP
  if (b.phase === 1 && b.hp <= b.maxHp * 0.66 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.tideCd = 3.6;
    b.vx = 0;
    audio.playBellToll();
    triggerHaptic('bossPhase', 1.1);
    addShake(15);
    G.screenFlash = { alpha: 0.30, color: COLORS.violetBright };
    spawnShockwave(bxCenter, b.y + 46, 280, COLORS.violetBright, 5.2, 0.52);
    triggerBossBanner(t('boss.yuan.p2Title'), t('boss.yuan.p2Quote'), COLORS.violetBright, 2.6);
    G.groundWaves.push({ x: bxCenter - 42, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -420, w: 36, h: 48, life: 2.3, hit: false });
    G.groundWaves.push({ x: bxCenter + 42, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 420, w: 36, h: 48, life: 2.3, hit: false });
  }
  // Phase 3 at <= 33% HP
  if (b.phase === 2 && b.hp <= b.maxHp * 0.33 && b.state !== 'stagger') {
    b.phase = 3;
    b.state = 'phaseShift';
    b.stateTimer = 1.35;
    b.tideCd = 4.2;
    b.vx = 0;
    audio.playBellToll();
    audio.playBellQuake();
    triggerHaptic('bossPhase', 1.25);
    addShake(18);
    G.screenFlash = { alpha: 0.36, color: COLORS.goldBright };
    spawnShockwave(bxCenter, b.y + 46, 320, COLORS.goldBright, 5.8, 0.58);
    triggerBossBanner(t('boss.yuan.p3Title'), t('boss.yuan.p3Quote'), COLORS.goldBright, 2.8);
    G.groundWaves.push({ x: bxCenter - 46, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -450, w: 40, h: 52, life: 2.4, hit: false, gold: true });
    G.groundWaves.push({ x: bxCenter + 46, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 450, w: 40, h: 52, life: 2.4, hit: false, gold: true });
  }

  const b3Aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * b3Aggro;
  const b3WantsAntiAir = tickBossOverheadPressure(b, dt);
  const b3WantsGreedPunish = tickBossGreedPressure(b, dt, absDx);
  if (b.phase >= 2 && b.tideCd > 0) b.tideCd -= dt * b3Aggro;

  if (b.state === 'phaseShift') {
    b.vx *= damp(0.8, dt);
    if (Math.random() < 36.0 * dt) {
      spawnParticles(bxCenter, b.y + 38, 2, { color: b.phase === 3 ? COLORS.goldBright : COLORS.violetBright, speed: 210, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.42;
    }
  } else if (b.state === 'stagger') {
    b.vx *= damp(0.85, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.24;
      b.stateTimer = 0.42;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const moveSpd = b.phase === 3 ? 205 : b.phase === 2 ? 178 : 148;
    b.vx = absDx > 114 ? b.facing * moveSpd : b.vx * 0.84;

    if (b3WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 3.0);
      b.moveKind = 'antiAirSwords';
      b.lastMoveKind = 'antiAirSwords';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.state = 'windup';
      b.stateTimer = 0.42;
      b.windupDuration = 0.42;
      b.didHit = false;
      b.vx = 0;
      spawnFloatText(bxCenter, b.y - 50, t('combat.antiAirYuan'), COLORS.goldBright, 18, 0.9);
    } else if (b.stateTimer <= 0 && b.phase >= 2 && b.tideCd <= 0) {
      b.moveKind = 'eclipseTide'; b.lastMoveKind = 'eclipseTide';
      b.comboIdx = 0; b.comboTotal = 3;
      b.symphonyBeatsLeft = 3; b.symphonyBeatTimer = 0.05; b.symphonyReflects = 0;
      b.isDelayedHit = false; b.glintPlayed = false; b.finisherParried = false;
      b.state = 'windup'; b.stateTimer = 0.78; b.windupDuration = 0.78;
      b.tideCd = b.phase === 3 ? 11.5 : 14.0; b.didHit = false; b.vx = 0;
      audio.playBellToll(); audio.playGlintCue(false); addShake(10);
      spawnShockwave(bxCenter, b.y + 42, 165, COLORS.goldBright, 4.2, 0.35);
      spawnFloatText(bxCenter, b.y - 56, t('boss.yuan.symphonyWarn'), COLORS.goldBright, 21, 1.65);
    } else if (b.stateTimer <= 0 && absDx < 540) {
      let pool;
      if (b.phase === 3) {
        pool = [
          { kind: 'judgementFlurry', w: absDx < 270 ? 36 : 20 },
          { kind: 'skyShatter', w: absDx > 140 ? 24 : 14 },
          { kind: 'shadowCloneStrike', w: 18 },
          { kind: 'echoTwinCut', w: 22 },
          { kind: 'bellRain', w: absDx > 210 ? 20 : 10 },
          { kind: 'eclipseThrust', w: absDx > 195 ? 22 : 10 },
          { kind: 'crimsonArc', w: absDx < 200 ? 16 : 8 }
        ];
      } else if (b.phase === 2) {
        pool = [
          { kind: 'tripleChime', w: absDx < 250 ? 30 : 18 },
          { kind: 'shadowCloneStrike', w: 20 },
          { kind: 'echoTwinCut', w: 22 },
          { kind: 'bellRain', w: absDx > 180 ? 24 : 12 },
          { kind: 'eclipseThrust', w: absDx > 200 ? 26 : 12 },
          { kind: 'crimsonArc', w: absDx < 210 ? 20 : 10 }
        ];
      } else {
        pool = [
          { kind: 'tripleChime', w: 38 },
          { kind: 'eclipseThrust', w: absDx > 195 ? 34 : 18 },
          { kind: 'crimsonArc', w: 26 }
        ];
      }
      let chosen;
      if (b3WantsGreedPunish) {
        consumeBossGreedTrigger(b, 5.2);
        chosen = 'crimsonArc';
        spawnFloatText(bxCenter, b.y - 50, t('combat.greedPunish'), COLORS.crimsonBright, 18, 0.9);
      } else {
        chosen = pickWeightedBossMove(b.lastMoveKind, pool);
      }
      b.moveKind = chosen;
      b.lastMoveKind = chosen;
      b.comboIdx = 0;
      b.comboTotal = chosen === 'judgementFlurry' ? 5 : chosen === 'tripleChime' ? 3 : chosen === 'echoTwinCut' ? 2 : 1;
      b.isDelayedHit = chosen === 'shadowCloneStrike';
      b.glintPlayed = false;
      b.finisherParried = false;
      b.apexHangTimer = 0;
      b.state = 'windup';

      if (chosen === 'judgementFlurry') {
        b.stateTimer = 0.44;
      } else if (chosen === 'skyShatter') {
        b.stateTimer = 0.64;
        audio.playDangerAlert();
      } else if (chosen === 'shadowCloneStrike') {
        b.stateTimer = b.phase === 3 ? 0.50 : 0.56;
        audio.playShadowBlink();
        spawnParticles(bxCenter, b.y + 52, 18, { color: COLORS.violetBright, speed: 240, spark: true, life: 0.36 });
        // Wall-safe blink: prefer behind player, fall back to front-mid-range if player's back is pinned to a wall!
        const behindCenter = px - G.player.facing * 116;
        const canBehind = (behindCenter > b.arenaMinX + 68 && behindCenter < b.arenaMaxX - 68);
        const destCenter = canBehind ? behindCenter : (px + G.player.facing * 124);
        b.x = Math.max(b.arenaMinX + 24, Math.min(b.arenaMaxX - b.w - 24, destCenter - b.w * 0.5));
        b.facing = px >= (b.x + b.w * 0.5) ? 1 : -1;
        b.blinkAlpha = 0.30;
        spawnShockwave(b.x + b.w * 0.5, b.y + 52, 76, COLORS.violetBright, 3.2, 0.26);
      } else if (chosen === 'bellRain') {
        b.stateTimer = 0.62;
        audio.playWraithShot();
      } else if (chosen === 'eclipseThrust') {
        b.stateTimer = 0.54;
      } else if (chosen === 'tripleChime' || chosen === 'echoTwinCut') {
        b.stateTimer = chosen === 'echoTwinCut' ? 0.36 : 0.44;
      } else {
        b.stateTimer = 0.68;
        audio.playDangerAlert();
      }
      b.windupDuration = b.stateTimer;
      b.didHit = false;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    const isRedMove = b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter' || b.moveKind === 'eclipseTide';
    if (b.moveKind !== 'eclipseTide' && b.stateTimer > 0.19) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    if (b.moveKind === 'tripleChime' || b.moveKind === 'judgementFlurry' || b.moveKind === 'echoTwinCut') {
      applyClashSpacingWindup(b, px, dt);
    } else {
      b.vx *= damp(0.82, dt);
    }
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.23) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.isDelayedHit && Math.random() < 0.45) {
      spawnParticles(bxCenter + b.facing * 16, b.y + 24, 1, { color: COLORS.goldBright, speed: 70, grav: -50, life: 0.22 });
    }
    if (b.moveKind === 'eclipseTide' && Math.random() < 0.7) {
      spawnParticles(bxCenter + (Math.random() - 0.5) * 90, arenaFloorY - 6, 1, { color: COLORS.goldBright, speed: 110, grav: -200, life: 0.35 });
    }
    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      const by = b.y + 52;
      if (b.moveKind === 'eclipseTide') {
        b.stateTimer = 2.45; b.symphonyBeatsLeft = 3; b.symphonyBeatTimer = 0.02; b.symphonyReflects = 0;
        audio.playBellToll(); addShake(10); G.screenFlash = { alpha: 0.18, color: COLORS.goldBright };
      } else if (b.moveKind === 'skyShatter') {
        b.stateTimer = 1.35;
        b.leapAirborne = false;
        b.apexHangTimer = 0.15;
        b.grounded = false;
        b.vx = Math.max(-480, Math.min(480, dx * 1.32));
        b.vy = -530;
        audio.playSlash(0.6, true);
        G.slashes.push({ x: bxCenter + b.facing * 40, y: by - 10, facing: b.facing, type: 'bossRedSlam', life: 0.34, maxLife: 0.34 });
      } else if (b.moveKind === 'eclipseThrust') {
        b.stateTimer = 0.28;
        b.vx = b.facing * (b.phase === 3 ? 700 : 650);
        audio.playSlash(0.76, true);
        G.slashes.push({ x: bxCenter + b.facing * 52, y: by + 4, facing: b.facing, type: 'bossThrust', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'crimsonArc') {
        b.stateTimer = 0.25;
        b.vx = b.facing * 310;
        audio.playSlash(0.66, true);
        G.slashes.push({ x: bxCenter + b.facing * 56, y: by + 4, facing: b.facing, type: 'bossRedSweep', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'antiAirSwords') {
        b.stateTimer = 0.28;
        audio.playIaiSlash();
        audio.playBellChimeCast(3);
        addShake(10);
        spawnShockwave(bxCenter, b.y - 16, 138, b.phase === 2 ? COLORS.violetBright : COLORS.goldBright, 4.2, 0.28);
        G.slashes.push({ x: bxCenter, y: b.y - 22, facing: b.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
        [-0.55, 0, 0.55].forEach(sp => {
          const a = -Math.PI * 0.5 + sp;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'wraithOrb',
            x: bxCenter, y: b.y - 12, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
            r: 12, dmg: 24, posture: 26, life: 1.7, maxLife: 1.7, reflected: false, hitIds: new Set()
          });
        });
      } else if (b.moveKind === 'shadowCloneStrike') {
        b.stateTimer = 0.22;
        b.vx = b.facing * (absDx > 95 ? 360 : 165);
        audio.playIaiSlash();
        G.slashes.push({ x: bxCenter + b.facing * 48, y: by, facing: b.facing, type: 'bossSlam', life: 0.26, maxLife: 0.26 });
      } else if (b.moveKind === 'bellRain') {
        b.stateTimer = 0.24;
        const cnt = b.phase === 3 ? 4 : 3;
        const baseAng = Math.atan2(py - by, px - bxCenter);
        audio.playWraithShot();
        for (let i = 0; i < cnt; i++) {
          const a = baseAng + (i - (cnt - 1) / 2) * 0.24;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'wraithOrb',
            x: bxCenter + Math.cos(a) * 32, y: by + Math.sin(a) * 32,
            vx: Math.cos(a) * (b.phase === 3 ? 395 : 355),
            vy: Math.sin(a) * (b.phase === 3 ? 395 : 355),
            r: 13, dmg: 26, posture: 30, life: 2.8, maxLife: 2.8, reflected: false, hitIds: new Set()
          });
        }
        spawnShockwave(bxCenter, by, 82, COLORS.goldBright, 3.4, 0.25);
      } else {
        // tripleChime (3 hits) or judgementFlurry (5 hits) with adaptive clash step
        const isFinisher = b.comboIdx === b.comboTotal - 1;
        b.stateTimer = isFinisher ? 0.22 : 0.17;
        const gapNow = (px - bxCenter) * b.facing;
        b.vx = b.facing * (gapNow > 96 ? (isFinisher ? 310 : 265) : (isFinisher ? 135 : 112));
        audio.playSlash(0.84 + b.comboIdx * 0.08, isFinisher);
        G.slashes.push({
          x: bxCenter + b.facing * 46,
          y: by + (b.comboIdx % 2 === 0 ? -4 : 10),
          facing: b.facing,
          type: isFinisher ? 'bossSlam' : (b.comboIdx % 2 === 1 ? 'bossUpSweep' : 'bossSweep'),
          life: 0.24,
          maxLife: 0.24
        });
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= damp(0.90, dt);
    if (b.moveKind === 'tripleChime' || b.moveKind === 'judgementFlurry' || b.moveKind === 'echoTwinCut') {
      applyClashSpacingStrike(b, px);
    }
    // Brief apex hang-glint on skyShatter so the downward slam has iconic rhythmic readability
    let skipGravity = false;
    if (b.moveKind === 'skyShatter' && b.leapAirborne && b.vy >= -40 && b.apexHangTimer > 0) {
      b.apexHangTimer -= dt;
      b.vx *= damp(0.65, dt);
      b.vy = 0;
      skipGravity = true;
      if (b.apexHangTimer <= 0) {
        b.vy = 780;
        audio.playSlash(0.56, true);
        spawnShockwave(bxCenter, b.y + 42, 74, COLORS.goldBright, 3.2, 0.22);
      }
    }
    if (b.moveKind === 'eclipseTide' && b.symphonyBeatsLeft > 0) {
      b.symphonyBeatTimer -= dt;
      if (b.symphonyBeatTimer <= 0) {
        const beatNum = 4 - b.symphonyBeatsLeft;
        b.symphonyBeatsLeft--;
        b.symphonyBeatTimer = b.phase >= 3 ? 0.68 : 0.76;
        b.facing = dx >= 0 ? 1 : -1;
        const aimAng = Math.atan2((py - 6) - (b.y + 46), px - bxCenter);
        const wSpd = b.phase >= 3 ? 520 : 465;
        audio.playGlintCue(beatNum === 3);
        audio.playResonanceBell(beatNum === 3 ? 659.25 : beatNum === 2 ? 523.25 : 440.0, false);
        addShake(6.5);
        spawnShockwave(bxCenter, b.y + 46, 118, COLORS.goldBright, 3.8, 0.26);
        G.projectiles.push({
          owner: 'enemy', source: b, kind: 'yuanResonanceWave', beatNum,
          x: bxCenter + b.facing * 24, y: b.y + 46,
          vx: Math.cos(aimAng) * wSpd, vy: Math.sin(aimAng) * wSpd,
          r: 22, dmg: 28, posture: 28, life: 2.4, maxLife: 2.4, reflected: false, hitIds: new Set()
        });
      }
    }
    if (b.moveKind !== 'eclipseTide' && b.moveKind !== 'bellRain') {
      const isRed = b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter';
      const isAA3 = b.moveKind === 'antiAirSwords';
      const reach = b.moveKind === 'eclipseThrust' ? 142 : b.moveKind === 'crimsonArc' ? 148 : 122;
      if (!b.didHit && !(b.moveKind === 'skyShatter' && skipGravity)) {
        const hitBox = isAA3
          ? { x: bxCenter - 96, y: b.y - 86, w: 192, h: 138 }
          : {
              x: bxCenter + (b.facing > 0 ? -12 : -reach + 12),
              y: b.y + 8,
              w: reach,
              h: 102
            };
        if (aabbOverlap(hitBox, G.player)) {
          b.didHit = true;
          const dmg = isRed ? 44 : b.moveKind === 'shadowCloneStrike' ? 34 : (b.comboIdx === b.comboTotal - 1 ? 33 : 28);
          applyIncomingAttackToPlayer(b, dmg, isRed, 280);
        }
      }
    }
    if (b.moveKind === 'skyShatter' && !b.grounded) b.leapAirborne = true;
    const done = b.moveKind === 'skyShatter'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);
    if (done) {
      if (b.moveKind === 'skyShatter') {
        b.leapAirborne = false;
        b.apexHangTimer = 0;
        b.vx = 0;
        addShake(14);
        audio.playHit(true, 3);
        spawnShockwave(bxCenter, b.y + b.h - 6, 165, COLORS.goldBright, 4.8, 0.36);
        // Offset wave spawn (±48px) & clean speed (390) prevent unavoidable frame-1 clips after dodging the slam
        G.groundWaves.push({ x: bxCenter - 48, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -390, w: 38, h: 46, life: 2.2, hit: false, gold: true });
        G.groundWaves.push({ x: bxCenter + 48, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 390, w: 38, h: 46, life: 2.2, hit: false, gold: true });
      }
      b.comboIdx++;
      if (b.comboIdx < b.comboTotal) {
        b.state = 'windup';
        // Crisp Musical Cadence:
        // tripleChime: 1(0.44) - 2(0.26) -- [pause] -- 3(0.54)
        // judgementFlurry: 1(0.44) - 2(0.25) -- [pause] -- 3(0.54) - 4(0.25) -- [pause] -- 5(0.56)
        const delayed = (b.moveKind === 'tripleChime' && b.comboIdx === 2) ||
          (b.moveKind === 'echoTwinCut' && b.comboIdx === 1) ||
          (b.moveKind === 'judgementFlurry' && (b.comboIdx === 2 || b.comboIdx === 4));
        b.isDelayedHit = delayed;
        b.glintPlayed = false;
        b.stateTimer = delayed ? (b.comboIdx === 4 ? 0.56 : 0.54) : (b.moveKind === 'tripleChime' ? 0.26 : 0.25);
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        const baseRec = b.moveKind === 'eclipseTide' ? 0.95 : (b.phase === 3 ? 0.58 : b.phase === 2 ? 0.68 : 0.80);
        b.stateTimer = baseRec + (b.finisherParried ? 0.38 : 0);
        b.finisherParried = false;
      }
    }
    if (!skipGravity) b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, true);
    if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, -b.vx * 0.45, dt);
    return;
  } else if (b.state === 'recover') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.30 : b.phase === 2 ? 0.38 : 0.50;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, -b.vx * 0.45, dt);
}


/* ---------- HIDDEN FINAL BOSS: 初铸残影 · 铸 (3-Stance Dynamic Weapon-Switching Parry Symphony) ---------- */
export function triggerBoss4UltimateReaction(weaponId) {
  const b = G.boss4;
  if (!b || !b.alive || !b.awake || b.state === 'stagger' || b.state === 'phaseShift' || b.ultimateReactCd > 0) return false;
  b.ultimateReactCd = 6.5;
  b.stance = weaponId === 'hammer' ? 'hammer' : weaponId === 'bell' ? 'bell' : 'blade';
  b.stanceFlash = 0.55;
  const bx = b.x + b.w * 0.5;
  const by = b.y + b.h * 0.44;
  const px = G.player ? (G.player.x + G.player.w * 0.5) : (bx - 220);
  const py = G.player ? (G.player.y + G.player.h * 0.45) : by;
  b.facing = px >= bx ? 1 : -1;

  audio.playBoss4Counter();
  addShake(11);
  const col = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
  spawnShockwave(bx, by, 155, col, 4.6, 0.36);
  spawnParticles(bx, by, 24, { color: col, speed: 280, spark: true, life: 0.42 });
  spawnFloatText(bx, b.y - 44, t('boss.zhu.ultCounter'), col, 21, 1.35);

  const baseAng = Math.atan2(py - by, px - bx);
  [-0.14, 0.14].forEach((off, idx) => {
    const a = baseAng + off;
    const spd = 410 + idx * 45;
    G.projectiles.push({
      owner: 'enemy',
      source: b,
      kind: 'boss4EchoOrb',
      stance: b.stance,
      x: bx + b.facing * 26,
      y: by - 6 + (idx === 0 ? -10 : 10),
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      r: 14,
      dmg: 22,
      posture: 26,
      life: 2.3,
      maxLife: 2.3,
      reflected: false,
      hitIds: new Set()
    });
  });
  return true;
}

export function updateBoss4(b, dt) {
  if (!b || !b.alive) return;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.stanceFlash > 0) b.stanceFlash -= dt;
  if (b.ultimateReactCd > 0) b.ultimateReactCd -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 6.8 * dt);
  b.haloAngle += dt * (b.phase === 3 ? 4.4 : b.phase === 2 ? 2.8 : 1.6);
  if (b.blinkAlpha < 1) b.blinkAlpha = Math.min(1, b.blinkAlpha + dt * 8.0);

  if (!b.awake) {
    b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, false);
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, 0, dt);
    if (!G.echoSession && G.player && G.player.hp > 0 && isBoss4Unlocked() &&
        G.player.x > b.arenaMinX + 440 && G.player.x < b.arenaMaxX &&
        Math.abs((G.player.y + G.player.h) - b.arenaFloorY) < 220) {
      b.awake = true; b.state = 'stalk'; b.stateTimer = 0.55;
      audio.playBellToll(); audio.playBoss4Swap(); addShake(12);
      G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
      spawnShockwave(b.x + b.w * 0.5, b.y + b.h * 0.45, 220, COLORS.goldBright, 4.6, 0.48);
      triggerBossIntro(b, t('boss.echoZhuTitle'), t('boss.echoZhuQuote'), COLORS.goldBright, 1.65);
    }
    return;
  }

  const bxCenter = b.x + b.w / 2;
  const byMid = b.y + b.h * 0.45;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const dx = px - bxCenter;
  const absDx = Math.abs(dx);

  if (b.phase === 1 && b.hp <= b.maxHp * 0.66 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.15;
    b.stance = 'bell';
    b.stanceFlash = 0.7;
    b.movesInStance = 0;
    b.vx = 0;
    audio.playBellToll();
    audio.playBoss4Swap();
    triggerHaptic('bossPhase', 1.15);
    addShake(15);
    G.screenFlash = { alpha: 0.28, color: COLORS.cyanBright };
    spawnShockwave(bxCenter, byMid, 270, COLORS.cyanBright, 5.2, 0.50);
    triggerBossBanner(t('boss.zhu.p2Title'), t('boss.zhu.p2Quote'), COLORS.cyanBright, 2.6);
    for (let k = -1; k <= 1; k++) {
      const a = Math.atan2(py - byMid, px - bxCenter) + k * 0.30;
      G.projectiles.push({
        owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
        x: bxCenter, y: byMid - 10, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350,
        r: 13, dmg: 24, posture: 26, life: 2.2, maxLife: 2.2, reflected: false, hitIds: new Set()
      });
    }
  }
  if (b.phase === 2 && b.hp <= b.maxHp * 0.33 && b.state !== 'stagger') {
    b.phase = 3;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.stance = 'blade';
    b.stanceFlash = 0.85;
    b.movesInStance = 0;
    b.vx = 0;
    audio.playBellToll();
    audio.playBellQuake();
    audio.playBoss4Counter();
    triggerHaptic('bossPhase', 1.3);
    addShake(18);
    G.screenFlash = { alpha: 0.36, color: COLORS.goldBright };
    spawnShockwave(bxCenter, byMid, 330, COLORS.goldBright, 6.0, 0.58);
    spawnShockwave(bxCenter, byMid, 210, COLORS.cyanBright, 4.0, 0.45);
    triggerBossBanner(t('boss.zhu.p3Title'), t('boss.zhu.p3Quote'), COLORS.goldBright, 2.9);
    G.groundWaves.push({ x: bxCenter - 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -440, w: 38, h: 48, life: 2.3, hit: false, gold: true });
    G.groundWaves.push({ x: bxCenter + 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 440, w: 38, h: 48, life: 2.3, hit: false, gold: true });
  }

  const aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * aggro;
  const b4WantsAntiAir = tickBossOverheadPressure(b, dt);
  const b4WantsGreedPunish = tickBossGreedPressure(b, dt, absDx);

  if (b.state === 'phaseShift') {
    b.vx *= damp(0.8, dt);
    if (Math.random() < 40 * dt) {
      spawnParticles(bxCenter, byMid, 2, { color: b.phase === 3 ? COLORS.goldBright : COLORS.cyanBright, speed: 230, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.36;
    }
  } else if (b.state === 'stagger') {
    b.vx *= damp(0.85, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.24;
      b.stateTimer = 0.38;
    }
  } else if (b.state === 'swapStance') {
    b.vx *= damp(0.82, dt);
    b.facing = dx >= 0 ? 1 : -1;
    if (b.stateTimer <= 0) {
      b.stance = b.nextStance || 'blade';
      b.stanceFlash = 0.55;
      b.movesInStance = 0;
      const sc = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
      audio.playBoss4Swap();
      spawnShockwave(bxCenter, byMid, 96, sc, 3.6, 0.26);
      spawnFloatText(bxCenter, b.y - 34, t(b.stance === 'hammer' ? 'boss.zhu.stanceHammer' : b.stance === 'bell' ? 'boss.zhu.stanceBell' : 'boss.zhu.stanceBlade'), sc, 18, 0.95);
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.16 : 0.24;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const baseSpd = b.stance === 'blade' ? 215 : b.stance === 'bell' ? 165 : 148;
    const moveSpd = baseSpd * (b.phase === 3 ? 1.12 : 1.0);
    const desiredDist = b.stance === 'bell' ? 230 : 108;
    if (absDx > desiredDist + 24) b.vx = b.facing * moveSpd;
    else if (b.stance === 'bell' && absDx < 140) b.vx = -b.facing * 135;
    else b.vx *= 0.84;

    if (b4WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 2.8);
      b.moveKind = 'antiAirStance';
      b.lastMoveKind = 'antiAirStance';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.didHit = false;
      b.state = 'windup';
      b.stateTimer = 0.40;
      b.windupDuration = 0.40;
      b.vx = 0;
      spawnFloatText(bxCenter, b.y - 46, t('combat.antiAirZhu'), b.stance === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 18, 0.9);
    } else if (b.stateTimer <= 0 && b.movesInStance >= 2) {
      const order = b.phase >= 2 ? ['blade', 'hammer', 'bell'] : ['blade', 'hammer'];
      const curIdx = order.indexOf(b.stance);
      b.nextStance = order[(curIdx + 1) % order.length];
      b.state = 'swapStance';
      b.stateTimer = b.phase === 3 ? 0.28 : 0.36;
      b.vx = 0;
    } else if (b.stateTimer <= 0 && absDx < 580) {
      b.movesInStance++;
      let pool = [];
      if (b.phase === 3 && b.lastMoveKind !== 'triResonanceFinale' && Math.random() < 0.34) {
        pool = [{ kind: 'triResonanceFinale', w: 100 }];
      } else if (b.stance === 'blade') {
        pool = [
          { kind: 'bladeFlurry', w: absDx < 250 ? 55 : 28 },
          { kind: 'iaiDash', w: absDx > 120 ? 45 : 22 }
        ];
      } else if (b.stance === 'hammer') {
        pool = [
          { kind: 'hammerTwinSlam', w: absDx < 240 ? 52 : 24 },
          { kind: 'hammerQuakeLeap', w: absDx > 110 ? 48 : 26 }
        ];
      } else {
        pool = [
          { kind: 'bellBarrage', w: 54 },
          { kind: 'bellRingSweep', w: absDx < 270 ? 46 : 26 }
        ];
      }
      let chosen;
      if (b4WantsGreedPunish) {
        consumeBossGreedTrigger(b, 5.0);
        b.stance = 'hammer';
        b.stanceFlash = 0.45;
        chosen = 'hammerQuakeLeap';
        spawnFloatText(bxCenter, b.y - 48, t('combat.greedPunish'), COLORS.crimsonBright, 18, 0.9);
      } else {
        chosen = pickWeightedBossMove(b.lastMoveKind, pool);
      }
      b.moveKind = chosen;
      b.lastMoveKind = chosen;
      b.comboIdx = 0;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.didHit = false;
      b.leapAirborne = false;
      b.apexHangTimer = 0;
      b.state = 'windup';

      if (chosen === 'bladeFlurry') {
        b.comboTotal = b.phase >= 2 ? 4 : 3;
        b.stateTimer = 0.42;
      } else if (chosen === 'iaiDash') {
        b.comboTotal = 1;
        b.stateTimer = 0.56;
        b.isDelayedHit = true;
        audio.playDangerAlert();
      } else if (chosen === 'hammerTwinSlam') {
        b.comboTotal = 2;
        b.stateTimer = 0.54;
        b.isDelayedHit = true;
      } else if (chosen === 'hammerQuakeLeap') {
        b.comboTotal = 1;
        b.stateTimer = 0.62;
        audio.playDangerAlert();
      } else if (chosen === 'bellBarrage') {
        b.comboTotal = b.phase >= 3 ? 3 : 2;
        b.stateTimer = 0.48;
      } else if (chosen === 'bellRingSweep') {
        b.comboTotal = 1;
        b.stateTimer = 0.44;
      } else if (chosen === 'triResonanceFinale') {
        b.stance = 'blade';
        b.stanceFlash = 0.4;
        b.comboTotal = 3;
        b.stateTimer = 0.46;
        spawnFloatText(bxCenter, b.y - 44, t('boss.zhu.triFinale'), COLORS.goldBright, 20, 1.35);
      }
      b.windupDuration = b.stateTimer;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer > 0.14) b.facing = dx >= 0 ? 1 : -1;
    const isRedMove = b.moveKind === 'hammerQuakeLeap';
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.22) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      if (b.moveKind === 'antiAirStance') {
        b.stateTimer = 0.28;
        const stCol = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
        if (b.stance === 'blade') {
          b.vy = -510;
          b.vx = b.facing * 140;
          audio.playBoss4Iai();
        } else if (b.stance === 'hammer') {
          audio.playBellQuake();
          addShake(12);
        } else {
          audio.playBoss4Counter();
          [-0.48, 0, 0.48].forEach(sp => {
            const a = -Math.PI * 0.5 + sp;
            G.projectiles.push({
              owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
              x: bxCenter, y: b.y - 12, vx: Math.cos(a) * 410, vy: Math.sin(a) * 410,
              r: 13, dmg: 24, posture: 26, life: 1.8, maxLife: 1.8, reflected: false, hitIds: new Set()
            });
          });
        }
        spawnShockwave(bxCenter, b.y - 16, 134, stCol, 4.2, 0.28);
        G.slashes.push({ x: bxCenter, y: b.y - 22, facing: b.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
      } else if (b.moveKind === 'bladeFlurry') {
        const isFin = b.comboIdx === b.comboTotal - 1;
        b.stateTimer = isFin ? 0.26 : 0.17;
        b.vx = b.facing * (isFin ? 340 : 230);
        audio.playSlash(0.92 + b.comboIdx * 0.08, isFin);
        G.slashes.push({ x: bxCenter + b.facing * 48, y: byMid, facing: b.facing, type: isFin ? 'bossSlam' : (b.comboIdx % 2 === 1 ? 'bossUpSweep' : 'bossSweep'), life: 0.22, maxLife: 0.22 });
      } else if (b.moveKind === 'iaiDash') {
        b.stateTimer = 0.24;
        b.vx = b.facing * 680;
        b.blinkAlpha = 0.52;
        audio.playBoss4Iai();
        addShake(8);
        G.slashes.push({ x: bxCenter + b.facing * 64, y: byMid, facing: b.facing, type: 'iai', life: 0.28, maxLife: 0.28 });
        spawnShockwave(bxCenter, byMid, 78, COLORS.goldBright, 3.2, 0.22);
      } else if (b.moveKind === 'hammerTwinSlam') {
        const isSecond = b.comboIdx === 1;
        b.stateTimer = 0.28;
        b.vx = b.facing * (isSecond ? 240 : 170);
        audio.playShieldBash(isSecond);
        addShake(isSecond ? 11 : 7);
        G.slashes.push({ x: bxCenter + b.facing * 44, y: byMid + 8, facing: b.facing, type: 'hammerQuake', life: 0.26, maxLife: 0.26 });
        if (isSecond) {
          G.groundWaves.push({ x: bxCenter + b.facing * 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: b.facing * 400, w: 38, h: 46, life: 2.0, hit: false, gold: true });
        }
      } else if (b.moveKind === 'hammerQuakeLeap') {
        b.stateTimer = 1.02;
        b.leapAirborne = false;
        b.apexHangTimer = 0.16;
        const clampedDx = Math.max(-340, Math.min(340, dx));
        b.vx = clampedDx * 1.48;
        b.vy = -660;
        audio.playSlash(0.62, true);
      } else if (b.moveKind === 'bellBarrage') {
        b.stateTimer = 0.24;
        b.vx = -b.facing * 120;
        audio.playBellChimeCast(3);
        const a0 = Math.atan2(py - byMid, px - bxCenter);
        const spreads = b.comboIdx === b.comboTotal - 1 ? [-0.22, 0, 0.22] : [-0.14, 0.14];
        for (const sp of spreads) {
          const a = a0 + sp;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
            x: bxCenter + b.facing * 24, y: byMid - 10,
            vx: Math.cos(a) * 375, vy: Math.sin(a) * 375,
            r: 13, dmg: 24, posture: 24, life: 2.2, maxLife: 2.2, reflected: false, hitIds: new Set()
          });
        }
        spawnShockwave(bxCenter + b.facing * 20, byMid - 8, 66, COLORS.cyanBright, 3.0, 0.22);
      } else if (b.moveKind === 'bellRingSweep') {
        b.stateTimer = 0.25;
        b.vx = b.facing * 260;
        audio.playBellChimeCast(2);
        G.slashes.push({ x: bxCenter + b.facing * 42, y: byMid, facing: b.facing, type: 'bellCounter', life: 0.24, maxLife: 0.24 });
        G.projectiles.push({
          owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
          x: bxCenter + b.facing * 30, y: byMid,
          vx: b.facing * 420, vy: 0,
          r: 14, dmg: 25, posture: 26, life: 1.9, maxLife: 1.9, reflected: false, hitIds: new Set()
        });
      } else if (b.moveKind === 'triResonanceFinale') {
        if (b.comboIdx === 0) {
          b.stance = 'blade'; b.stanceFlash = 0.45;
          b.stateTimer = 0.22;
          b.vx = b.facing * 520;
          audio.playBoss4Iai();
          G.slashes.push({ x: bxCenter + b.facing * 58, y: byMid, facing: b.facing, type: 'iai', life: 0.26, maxLife: 0.26 });
        } else if (b.comboIdx === 1) {
          b.stance = 'hammer'; b.stanceFlash = 0.45;
          b.stateTimer = 0.28;
          b.vx = b.facing * 240;
          audio.playBoss4Swap();
          audio.playShieldBash(true);
          addShake(12);
          G.slashes.push({ x: bxCenter + b.facing * 46, y: byMid + 6, facing: b.facing, type: 'hammerQuake', life: 0.28, maxLife: 0.28 });
          G.groundWaves.push({ x: bxCenter - 44, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -395, w: 38, h: 46, life: 2.0, hit: false, gold: true });
          G.groundWaves.push({ x: bxCenter + 44, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 395, w: 38, h: 46, life: 2.0, hit: false, gold: true });
        } else {
          b.stance = 'bell'; b.stanceFlash = 0.55;
          b.stateTimer = 0.28;
          b.vx = -b.facing * 160;
          audio.playBoss4Counter();
          const a0 = Math.atan2(py - byMid, px - bxCenter);
          [-0.28, 0, 0.28].forEach(sp => {
            const a = a0 + sp;
            G.projectiles.push({
              owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
              x: bxCenter + b.facing * 24, y: byMid - 8,
              vx: Math.cos(a) * 410, vy: Math.sin(a) * 410,
              r: 14, dmg: 26, posture: 28, life: 2.3, maxLife: 2.3, reflected: false, hitIds: new Set()
            });
          });
          spawnShockwave(bxCenter, byMid, 128, COLORS.cyanBright, 4.2, 0.30);
        }
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= damp(0.90, dt);
    if (b.moveKind === 'bladeFlurry' || b.moveKind === 'hammerTwinSlam') {
      applyClashSpacingStrike(b, px);
    }
    let skipGravity = false;
    if (b.moveKind === 'hammerQuakeLeap' && b.leapAirborne && b.vy >= -40 && b.apexHangTimer > 0) {
      b.apexHangTimer -= dt;
      b.vx *= damp(0.65, dt);
      b.vy = 0;
      skipGravity = true;
      if (b.apexHangTimer <= 0) {
        b.vy = 820;
        audio.playSlash(0.54, true);
        spawnShockwave(bxCenter, byMid, 76, COLORS.goldBright, 3.4, 0.22);
      }
    }
    const meleeHit = b.moveKind !== 'bellBarrage' && !(b.moveKind === 'triResonanceFinale' && b.comboIdx === 2);
    if (meleeHit && !b.didHit && !(b.moveKind === 'hammerQuakeLeap' && skipGravity)) {
      const isRed = b.moveKind === 'hammerQuakeLeap';
      const isAA4 = b.moveKind === 'antiAirStance';
      const reach = b.moveKind === 'iaiDash' ? 148 : b.stance === 'hammer' ? 132 : 118;
      const hitBox = isAA4
        ? { x: bxCenter - 86, y: b.y - 82, w: 172, h: 136 }
        : {
            x: bxCenter + (b.facing > 0 ? -12 : -reach + 12),
            y: b.y + 8,
            w: reach,
            h: 98
          };
      if (aabbOverlap(hitBox, G.player)) {
        b.didHit = true;
        const dmg = isRed ? 48 : b.moveKind === 'iaiDash' ? 36 : b.stance === 'hammer' ? 35 : 30;
        applyIncomingAttackToPlayer(b, dmg, isRed, 275);
      }
    }

    if (b.moveKind === 'hammerQuakeLeap' && !b.grounded) b.leapAirborne = true;
    const done = b.moveKind === 'hammerQuakeLeap'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);
    if (done) {
      if (b.moveKind === 'hammerQuakeLeap') {
        b.leapAirborne = false;
        b.apexHangTimer = 0;
        b.vx = 0;
        addShake(15);
        audio.playBellQuake();
        spawnShockwave(bxCenter, b.y + b.h - 6, 175, COLORS.goldBright, 5.0, 0.36);
        G.groundWaves.push({ x: bxCenter - 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -405, w: 38, h: 46, life: 2.2, hit: false, gold: true });
        G.groundWaves.push({ x: bxCenter + 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 405, w: 38, h: 46, life: 2.2, hit: false, gold: true });
      }
      b.comboIdx++;
      if (b.comboIdx < b.comboTotal) {
        b.state = 'windup';
        const delayed = (b.moveKind === 'bladeFlurry' && b.comboIdx === 2) ||
          (b.moveKind === 'hammerTwinSlam' && b.comboIdx === 1) ||
          (b.moveKind === 'triResonanceFinale' && b.comboIdx === 1);
        b.isDelayedHit = delayed;
        b.glintPlayed = false;
        b.stateTimer = delayed ? 0.50 : (b.moveKind === 'triResonanceFinale' ? 0.36 : 0.26);
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        const baseRec = b.moveKind === 'triResonanceFinale' ? 0.78 : (b.phase === 3 ? 0.52 : b.phase === 2 ? 0.62 : 0.72);
        b.stateTimer = baseRec + (b.finisherParried ? 0.40 : 0);
        b.finisherParried = false;
      }
    }
    if (!skipGravity) b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, true);
    if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.45, dt);
    return;
  } else if (b.state === 'recover') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.26 : b.phase === 2 ? 0.34 : 0.44;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.45, dt);
}
