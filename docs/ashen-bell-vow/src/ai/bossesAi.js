// Early/Mid Main Boss AI: Hui & Ji + Shared Boss Combat Helpers (Yuan & Zhu split into src/ai/endgameBossesAi.js in v47.0)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY, DUMMY_MODES, WIND_ZONES, BOUNCE_PADS } from '../config.js';
import { G, addShake, triggerBossBanner, triggerBossIntro, getCombatScaling, isPlayerInRoomId, isBoss4Unlocked, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t, locBoss } from '../i18n.js';
import { spawnArenaHazard, hasActiveArenaHazard } from '../arenaHazards.js';

export function pickWeightedBossMove(lastMove, pool) {
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
export function applyClashSpacingWindup(b, px, dt) {
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

export function applyClashSpacingStrike(b, px) {
  const bx = b.x + b.w * 0.5;
  const gap = (px - bx) * b.facing;
  if (gap < 56 && gap > -18) {
    b.x = px - b.facing * 56 - b.w * 0.5;
    b.vx *= 0.2;
  }
}

export function tickBossOverheadPressure(b, dt) {
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

export function consumeBossAntiAirTrigger(b, cd = 3.2) {
  b.overheadPressure = 0;
  b.pogoHitsTaken = 0;
  b.antiAirCd = cd;
}

export function tickBossGreedPressure(b, dt, absDx) {
  if (b.greedPunishCd > 0) b.greedPunishCd = Math.max(0, b.greedPunishCd - dt);
  if (b.greedDecayTimer > 0) {
    b.greedDecayTimer = Math.max(0, b.greedDecayTimer - dt);
  } else if (b.greedHits > 0) {
    b.greedHits = Math.max(0, b.greedHits - dt * 1.4);
  }
  return b.greedPunishCd <= 0 && (b.greedHits || 0) >= 4 && absDx < 175;
}

export function consumeBossGreedTrigger(b, cd = 5.4) {
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
        // v47.4 Boss 2 'Ji' Foundry Theme: Opening Molten Geysers + Hanging Chain Barrage + Molten Shield Charge!
        const hasGeyser = hasActiveArenaHazard('moltenGeyser', b);
        let chosen;
        if (!b.signatureOpened) {
          b.signatureOpened = true;
          chosen = 'moltenGeysers';
        } else if (b2WantsGreedPunish) {
          consumeBossGreedTrigger(b, 5.2);
          // Bronze forge shockwave repels facetanker & immediately drops molten geysers or ceiling chains!
          if (G.player && G.player.hp > 0) {
            G.player.vx = (dx >= 0 ? 1 : -1) * 330;
            G.player.vy = Math.min(G.player.vy, -170);
          }
          audio.playBellQuake();
          spawnShockwave(bx, b.y + 42, 148, '#fb923c', 4.4, 0.30);
          chosen = !hasGeyser ? 'moltenGeysers' : 'chainBarrage';
          spawnFloatText(bx, b.y - 52, t('combat.jiForgeRepel'), '#fb923c', 18, 1.05);
        } else {
          chosen = pickWeightedBossMove(b.lastMoveKind, [
            { kind: 'moltenGeysers', w: hasGeyser ? 10 : 34 },
            { kind: 'chainBarrage', w: 30 },
            { kind: 'bellShieldCharge', w: absDx > 155 ? 28 : 18 },
            { kind: 'chainDropSlam', w: 22 },
            { kind: 'twinBellCross', w: 16 },
            { kind: 'redSweepHook', w: absDx < 230 ? 20 : 10 }
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
        if (chosen === 'moltenGeysers') {
          b.stateTimer = 0.56;
          b.hoverTargetX = Math.max(arenaMinX + 60, Math.min(arenaMaxX - b.w - 60, arenaMidX - b.w * 0.5));
          b.hoverTargetY = arenaFloorY - 220;
          audio.playBellToll();
          spawnFloatText(bx, b.y - 52, t('combat.jiMoltenGeysers'), '#fb923c', 19, 1.15);
        } else if (chosen === 'chainBarrage') {
          b.stateTimer = 0.54;
          b.hoverTargetX = Math.max(arenaMinX + 60, Math.min(arenaMaxX - b.w - 60, px > arenaMidX ? (arenaMinX + arenaW * 0.24) : (arenaMaxX - arenaW * 0.28)));
          b.hoverTargetY = arenaFloorY - 235;
          audio.playDangerAlert();
          spawnFloatText(bx, b.y - 52, t('combat.jiChainBarrage'), COLORS.goldBright, 19, 1.15);
        } else if (chosen === 'chainDropSlam') {
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
    const isRedMove = b.moveKind === 'redSweepHook' || b.moveKind === 'resonanceNova' || b.moveKind === 'antiAirRise' || b.moveKind === 'moltenGeysers' || b.moveKind === 'chainBarrage';
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
    } else if (b.moveKind === 'bellBarrage' || b.moveKind === 'twinBellCross' || b.moveKind === 'moltenGeysers' || b.moveKind === 'chainBarrage') {
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
      } else if (b.moveKind === 'moltenGeysers') {
        b.stateTimer = 0.72;
        const cnt = b.phase === 2 ? 4 : 3;
        const minG = arenaMinX + 80;
        const maxG = arenaMaxX - 80;
        const span = Math.max(300, maxG - minG);
        const xs = [Math.max(minG, Math.min(maxG, px))];
        const step = span / cnt;
        for (let k = 0; k < cnt; k++) {
          const cand = minG + step * (k + 0.5);
          if (xs.every(ox => Math.abs(ox - cand) >= 165) && xs.length < cnt) xs.push(cand);
        }
        audio.playBellQuake();
        addShake(9);
        spawnShockwave(bx, b.y + 42, 138, '#fb923c', 4.2, 0.30);
        for (let k = 0; k < xs.length; k++) {
          spawnArenaHazard({
            kind: 'moltenGeyser', owner: b, x: xs[k], y: arenaFloorY, w: 64, h: 205,
            telegraph: 0.78, activeDur: b.phase === 2 ? 4.6 : 4.0, fadeDur: 0.40, dmg: 22
          });
        }
      } else if (b.moveKind === 'chainBarrage') {
        b.stateTimer = 1.05;
        const cnt = b.phase === 2 ? 4 : 3;
        const minC = arenaMinX + 75;
        const maxC = arenaMaxX - 75;
        audio.playBellToll();
        addShake(7);
        for (let k = 0; k < cnt; k++) {
          const off = (k - (cnt - 1) * 0.5) * 145;
          const cxDrop = Math.max(minC, Math.min(maxC, px + off));
          spawnArenaHazard({
            kind: 'chainDrop', owner: b, x: cxDrop, y: arenaFloorY, topY: b.arenaTopY, w: 58,
            telegraph: 0.68 + k * 0.22, activeDur: 0.42, fadeDur: 0.28, dmg: 28
          });
          if (b.phase === 2 && k === 1) {
            spawnArenaHazard({
              kind: 'moltenGeyser', owner: b, x: cxDrop, y: arenaFloorY, w: 56, h: 165,
              telegraph: 1.05 + k * 0.22, activeDur: 2.8, fadeDur: 0.35, dmg: 18
            });
          }
        }
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
