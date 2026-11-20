// Player movement, buffering, combo/iai/parry/grapple/spell state machine
import {
  COLORS, GRAVITY, FLOOR_Y, ALTARS, LORE_TABLETS, SHORTCUT_GATE_DEF, ABYSSAL_RIVERS, PUDDLES
} from './config.js';
import { G, hooks, getLivingFoes, getRelicStats, markMapExplored, addShake, punchZoom } from './state.js';
import { audio } from './audio.js';
import { isHeld, consumePress, consumeRelease } from './input.js';
import {
  updateCloak, spawnParticles, spawnShockwave, spawnFloatText, spawnWeatherRipple
} from './vfx.js';
import { moveAndCollide } from './physics.js';
import {
  findBestGrappleTarget, performExecution, updatePlayerActiveAttack,
  evaluatePlayerSealLunge, triggerPlayerAttack, openSkywayShortcut,
  collectPickup, isPickupUnlocked, ringResonanceBell, castBellQuake,
  damageEnemyHP, addPostureToEnemy
} from './combat.js';

export function capturePlayerInputBuffers() {
  if (!G.player || G.player.hp <= 0) return;
  if (consumePress(['Space', 'ArrowUp'])) G.player.jumpBufTimer = 0.12;
  if (consumePress(['KeyJ'])) G.player.attackBufTimer = 0.13;
  if (consumePress(['KeyK'])) G.player.parryBufTimer = 0.12;
  if (consumePress(['ShiftLeft', 'ShiftRight'])) G.player.dashBufTimer = 0.12;
  if (consumePress(['KeyU', 'KeyR'])) G.player.castBufTimer = 0.12;
  if (consumePress(['KeyI', 'KeyF'])) G.player.grappleBufTimer = 0.12;
  if (consumePress(['KeyL', 'KeyC'])) G.player.sealBufTimer = 0.12;
}

export function updatePlayer(dt) {
  if (G.player.hp <= 0) {
    if (G.player.deathTimer > 0) {
      G.player.deathTimer = Math.max(0, G.player.deathTimer - dt);
      G.player.vx *= 0.88;
      G.player.vy = Math.min(900, G.player.vy + GRAVITY * dt);
      moveAndCollide(G.player, dt, true);
      if (Math.random() < 0.75) {
        spawnParticles(G.player.x + G.player.w / 2 + (Math.random() - 0.5) * 16, G.player.y + 18 + Math.random() * 26, 2, {
          color: Math.random() < 0.35 ? COLORS.cyanBright : COLORS.parchment,
          speed: 55,
          grav: -110,
          life: 0.5
        });
      }
      updateCloak(G.player.cloak, G.player.x + G.player.w / 2 - G.player.facing * 4, G.player.y + 26, G.player.facing, 0, dt);
      updateCloak(G.player.scarf, G.player.x + G.player.w / 2 - G.player.facing * 2, G.player.y + 24, G.player.facing, 0, dt);
    } else if (G.gameState === 'playing' && G.outcomeTimer === null) {
      hooks.showDeath();
    }
    return;
  }

  G.player.wasGrounded = G.player.grounded;
  G.grapplePreviewTarget = findBestGrappleTarget();

  // Cooldowns & input buffer timers
  if (G.player.coyoteTimer > 0) G.player.coyoteTimer -= dt;
  if (G.player.dropThroughTimer > 0) G.player.dropThroughTimer -= dt;
  if (G.player.jumpBufTimer > 0) G.player.jumpBufTimer -= dt;
  if (G.player.attackBufTimer > 0) G.player.attackBufTimer -= dt;
  if (G.player.parryBufTimer > 0) G.player.parryBufTimer -= dt;
  if (G.player.dashBufTimer > 0) G.player.dashBufTimer -= dt;
  if (G.player.castBufTimer > 0) G.player.castBufTimer -= dt;
  if (G.player.grappleBufTimer > 0) G.player.grappleBufTimer -= dt;
  if (G.player.sealBufTimer > 0) G.player.sealBufTimer -= dt;
  if (G.player.wallJumpLock > 0) G.player.wallJumpLock -= dt;
  if (G.player.attackTimer > 0) G.player.attackTimer -= dt;
  if (G.player.attackCd > 0) G.player.attackCd -= dt;
  if (G.player.castTimer > 0) G.player.castTimer -= dt;
  if (G.player.castCd > 0) G.player.castCd -= dt;
  if (G.player.grappleCd > 0) G.player.grappleCd -= dt;
  if (G.player.comboResetTimer > 0) G.player.comboResetTimer -= dt;
  else G.player.comboStep = 0;
  if (G.player.riposteWindow > 0) G.player.riposteWindow -= dt;
  if (G.player.parryCooldown > 0) G.player.parryCooldown -= dt;
  if (G.player.parryStreakTimer > 0) {
    G.player.parryStreakTimer -= dt;
    if (G.player.parryStreakTimer <= 0) G.player.parryStreak = 0;
  }
  if (G.player.dashCd > 0) G.player.dashCd -= dt;
  if (G.player.iframeTimer > 0) G.player.iframeTimer -= dt;
  if (G.player.hurtTimer > 0) {
    G.player.hurtTimer -= dt;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.chargeReadyPlayed = false;
  }

  if (G.player.soul < 35) G.player.soul = Math.min(35, G.player.soul + 3.2 * dt);

  G.player.squashX += (1 - G.player.squashX) * Math.min(1, dt * 14);
  G.player.squashY += (1 - G.player.squashY) * Math.min(1, dt * 14);

  if (G.player.execTimer > 0) {
    G.player.execTimer -= dt;
    updateCloak(G.player.cloak, G.player.x + G.player.w / 2 - G.player.facing * 4, G.player.y + 18, G.player.facing, 0, dt);
    updateCloak(G.player.scarf, G.player.x + G.player.w / 2 - G.player.facing * 3, G.player.y + 16, G.player.facing, -G.player.facing * 70, dt);
    return;
  }

  // Internal Gray HP decay
  if (G.player.grayHp > 0) {
    G.player.grayTimer -= dt;
    if (G.player.grayTimer <= 0) G.player.grayHp = Math.max(0, G.player.grayHp - 38 * dt);
  }

  // 3-Tier Parry timer
  if (G.player.parryActive) {
    G.player.parryElapsedMs += dt * 1000;
    if (G.player.parryElapsedMs >= 400) {
      G.player.parryActive = false;
      G.player.parryCooldown = 0.08;
    }
  }

  // Interact [E] with Altars, Shortcut Lever, Lore Tablet or Pickups
  if (consumePress(['KeyE'])) {
    const px = G.player.x + G.player.w / 2;
    const py = G.player.y + G.player.h;

    for (const altar of ALTARS) {
      if (Math.hypot(px - altar.x, py - altar.y) < 86) {
        hooks.interactWithAltar(altar);
        return;
      }
    }

    if (G.worldState && !G.worldState.shortcutOpen && Math.hypot(px - SHORTCUT_GATE_DEF.leverX, py - SHORTCUT_GATE_DEF.leverY) < 76) {
      openSkywayShortcut();
      return;
    }

    for (const lt of LORE_TABLETS) {
      if (Math.hypot(px - lt.x, py - lt.y) < 78) {
        hooks.openLoreModal(lt);
        return;
      }
    }

    if (G.worldState) {
      for (const p of G.worldState.pickups) {
        if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - p.y) < 72) {
          collectPickup(p);
          return;
        }
      }
    }
  }

  // Heal [H]
  if (G.player.healTimer > 0) {
    G.player.healTimer -= dt;
    G.player.vx *= 0.78;
    if (!G.player.healDone && G.player.healTimer <= 0.24) {
      G.player.healDone = true;
      G.player.flasks--;
      const healAmt = Math.round(G.player.maxHp * 0.45);
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + healAmt);
      G.player.grayHp = 0;
      spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 20, { color: COLORS.cyanBright, speed: 150, grav: -200, life: 0.55 });
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 16, `+${healAmt}`, COLORS.cyanBright, 18);
    }
  } else if (consumePress(['KeyH', 'KeyQ']) && G.player.flasks > 0 && G.player.grounded && G.player.dashTimer <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none') {
    G.player.healTimer = 0.52;
    G.player.healDone = false;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    audio.playHeal();
  }

  const moveL = isHeld(['KeyA', 'ArrowLeft']);
  const moveR = isHeld(['KeyD', 'ArrowRight']);
  const moveDir = (moveR ? 1 : 0) - (moveL ? 1 : 0);

  // Grapple Hook [I / F / Right-Click] (buffered)
  if (G.player.grappleBufTimer > 0 && G.player.grappleCd <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0 && G.player.detonateLungeTimer <= 0) {
    const target = G.grapplePreviewTarget;
    if (target) {
      G.player.grappleBufTimer = 0;
      G.player.grappleState = 'extending';
      G.player.grappleTimer = 0.065;
      G.player.grappleTarget = target;
      G.player.grappleTx = target.x;
      G.player.grappleTy = target.y;
      G.player.grappleCd = getRelicStats().grappleCd;
      G.player.facing = target.x >= G.player.x + G.player.w / 2 ? 1 : -1;
      G.player.parryActive = false;
      G.player.activeAttack = null;
      G.player.isCharging = false;
      G.player.chargeTime = 0;
      G.player.chargeReadyPlayed = false;
      G.player.dashTimer = 0;
      G.player.vx *= 0.25;
      G.player.vy *= 0.25;
      audio.playGrappleLaunch();
      spawnParticles(G.player.x + G.player.w / 2 + G.player.facing * 12, G.player.y + 22, 10, { color: COLORS.cyanBright, speed: 170, spark: true, life: 0.24, grav: 0 });
    }
  }

  // Dual Soul Spells: [W + R/U] Bell-Quake (anti-air & 360° AoE) | [R/U] Soul Bell-Wave (piercing)
  const rsCast = getRelicStats();
  const canCast = G.player.castBufTimer > 0 && G.player.castCd <= 0 && G.player.dashTimer <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0;
  if (canCast && isHeld(['KeyW', 'ArrowUp']) && G.player.soul >= rsCast.quakeCost) {
    G.player.castBufTimer = 0;
    if (moveDir !== 0) G.player.facing = moveDir;
    castBellQuake();
  } else if (canCast && G.player.soul >= rsCast.spellCost) {
    G.player.castBufTimer = 0;
    if (moveDir !== 0) G.player.facing = moveDir;
    G.player.soul = Math.max(0, G.player.soul - rsCast.spellCost);
    G.player.castTimer = 0.22;
    G.player.castCd = 0.42;
    G.player.parryActive = false;
    G.player.activeAttack = null;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.chargeReadyPlayed = false;
    G.player.squashX = 0.84;
    G.player.squashY = 1.18;
    G.player.vx = -G.player.facing * 150;
    if (!G.player.grounded) G.player.vy = Math.min(G.player.vy, -65);

    audio.playSoulCast();
    addShake(4.5);
    const sx = G.player.x + G.player.w / 2 + G.player.facing * 26;
    const sy = G.player.y + 24;
    G.projectiles.push({
      owner: 'player',
      kind: 'soulWave',
      x: sx, y: sy,
      vx: G.player.facing * 690,
      vy: 0,
      r: Math.round(22 * rsCast.spellRadiusMult),
      dmg: Math.round(26 * rsCast.spellDmgMult),
      posture: 18 + rsCast.spellPostureBonus,
      life: 0.85,
      maxLife: 0.85,
      facing: G.player.facing,
      hitIds: new Set()
    });
    spawnShockwave(sx - G.player.facing * 8, sy, 48, COLORS.cyanBright, 3, 0.22);
    spawnParticles(sx, sy, 16, { color: COLORS.cyanBright, speed: 240, spark: true, life: 0.32, grav: 40 });
  }

  // Ink Dash [Shift] (buffered)
  if (G.player.dashBufTimer > 0 && G.player.dashCd <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0) {
    G.player.dashBufTimer = 0;
    G.player.dashDir = moveDir !== 0 ? moveDir : G.player.facing;
    G.player.facing = G.player.dashDir;
    G.player.dashTimer = 0.16;
    G.player.dashCd = 0.44;
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.20);
    G.player.parryActive = false;
    G.player.activeAttack = null;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.squashX = 1.32;
    G.player.squashY = 0.76;
    audio.playSlash(1.32);
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 28, 12, { color: COLORS.ink, speed: 160, grav: 0, life: 0.32 });
  }

  // Parry [K] (buffered)
  if (G.player.parryBufTimer > 0 && !G.player.parryActive && G.player.parryCooldown <= 0 && G.player.dashTimer <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0) {
    G.player.parryBufTimer = 0;
    if (moveDir !== 0) G.player.facing = moveDir;
    G.player.parryActive = true;
    G.player.parryElapsedMs = 0;
    G.player.attackTimer = 0;
    G.player.activeAttack = null;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.chargeReadyPlayed = false;
    audio.playSlash(1.5);
  }

  // Ink Seal Detonation Thrust [L] (buffered + multi-frame sweep)
  if (G.player.sealBufTimer > 0 && G.player.seals > 0 && G.player.dashTimer <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0) {
    G.player.sealBufTimer = 0;
    if (moveDir !== 0) G.player.facing = moveDir;
    G.player.detonateLungeTimer = 0.18;
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.16);
    G.player.parryActive = false;
    G.player.activeAttack = null;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    const usedSeals = G.player.seals;
    G.player.seals = 0;
    G.player.sealLunge = { usedSeals, stuck: false };
    audio.playIaiSlash();
    evaluatePlayerSealLunge();
  }

  // Attack / Execution / Charged Iai [J] (buffered)
  const canAttack = G.player.dashTimer <= 0 && G.player.detonateLungeTimer <= 0 && G.player.iaiLungeTimer <= 0 && G.player.grappleState === 'none' && G.player.healTimer <= 0 && G.player.hurtTimer <= 0;

  if (G.player.attackBufTimer > 0 && canAttack) {
    // 1. Priority: Check Posture-Broken Execution!
    const staggered = getLivingFoes().find(e => e.state === 'stagger' && Math.hypot((e.x + e.w / 2) - (G.player.x + G.player.w / 2), (e.y + e.h / 2) - (G.player.y + G.player.h / 2)) < 96);
    if (staggered) {
      G.player.attackBufTimer = 0;
      performExecution(staggered);
      return;
    }

    if (G.player.attackCd <= 0) {
      G.player.attackBufTimer = 0;
      if (moveDir !== 0) G.player.facing = moveDir;
      if (G.player.riposteWindow > 0) {
        G.player.riposteWindow = 0;
        triggerPlayerAttack('counter');
      } else if (!G.player.grounded && isHeld(['KeyS', 'ArrowDown'])) {
        triggerPlayerAttack('pogo');
      } else if (isHeld(['KeyW'])) {
        triggerPlayerAttack('up');
      } else {
        G.player.comboStep = (G.player.comboStep % 3) + 1;
        G.player.comboResetTimer = 0.56;
        triggerPlayerAttack('slash' + G.player.comboStep);
      }
      // Begin watching hold for Iai charge
      G.player.isCharging = true;
      G.player.chargeTime = 0;
      G.player.chargeReadyPlayed = false;
    }
  }

  // Seamless Iai Charge: holding [J] out of dash/grapple/parry/attack recovery enters sheathed stance directly
  if (!G.player.isCharging && isHeld(['KeyJ']) && canAttack && G.player.attackTimer <= 0 && !G.player.parryActive) {
    G.player.isCharging = true;
    G.player.chargeTime = 0.08;
    G.player.chargeReadyPlayed = false;
  }

  const iaiNeed = getRelicStats().iaiChargeTime;
  if (G.player.isCharging && isHeld(['KeyJ']) && canAttack) {
    G.player.chargeTime += dt;
    if (G.player.chargeTime >= iaiNeed && !G.player.chargeReadyPlayed) {
      G.player.chargeReadyPlayed = true;
      audio.playIaiReady();
      spawnShockwave(G.player.x + G.player.w / 2, G.player.y + 26, 46, COLORS.goldBright, 2.5, 0.22);
      spawnParticles(G.player.x + G.player.w / 2, G.player.y + 26, 12, { color: COLORS.goldBright, speed: 150, spark: true });
    }
  } else if (G.player.isCharging) {
    const ready = G.player.chargeTime >= iaiNeed;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.chargeReadyPlayed = false;
    if (ready && canAttack) {
      if (moveDir !== 0) G.player.facing = moveDir;
      triggerPlayerAttack('iai');
    }
  }

  // Movement Physics
  if (G.player.grappleState !== 'none') {
    const gt = G.player.grappleTarget;
    if (gt) {
      if (gt.type === 'lantern') {
        G.player.grappleTx = gt.ref.x + Math.sin(gt.ref.angle) * gt.ref.len;
        G.player.grappleTy = gt.ref.anchorY + Math.cos(gt.ref.angle) * gt.ref.len;
      } else if (gt.type === 'enemy' && gt.ref.alive) {
        G.player.grappleTx = gt.ref.x + gt.ref.w / 2;
        G.player.grappleTy = gt.ref.y + gt.ref.h * 0.35;
      }
    }
    if (G.player.grappleState === 'extending') {
      G.player.grappleTimer -= dt;
      G.player.vx *= 0.8;
      G.player.vy *= 0.8;
      if (G.player.grappleTimer <= 0) {
        G.player.grappleState = 'pulling';
        G.player.grappleTimer = 0.42;
        G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.20);
        audio.playGrappleLatch();
        spawnShockwave(G.player.grappleTx, G.player.grappleTy, 46, COLORS.cyanBright, 2.8, 0.22);
        spawnParticles(G.player.grappleTx, G.player.grappleTy, 14, { color: COLORS.goldBright, speed: 210, spark: true, life: 0.28 });
        if (gt && gt.type === 'lantern') gt.ref.angVel += G.player.facing * 4.5;
      }
    } else if (G.player.grappleState === 'pulling') {
      G.player.grappleTimer -= dt;
      const px = G.player.x + G.player.w / 2;
      const py = G.player.y + 22;
      const dx = G.player.grappleTx - px;
      const dy = G.player.grappleTy - py;
      const dist = Math.hypot(dx, dy);

      if (Math.random() < 0.8) {
        G.afterimages.push({ x: G.player.x, y: G.player.y, facing: G.player.facing, life: 0.2, maxLife: 0.2, color: COLORS.cyanBright });
      }

      const arriveDist = (gt && gt.type === 'enemy') ? 54 : 34;
      if (dist <= arriveDist || G.player.grappleTimer <= 0 || G.player.jumpBufTimer > 0) {
        G.player.grappleState = 'none';
        G.player.jumpBufTimer = 0;
        G.player.dashCd = 0;
        G.player.airJumpsLeft = 1;
        G.player.coyoteTimer = 0.08;
        G.player.squashX = 0.78;
        G.player.squashY = 1.28;
        G.player.vx = (dx / Math.max(1, dist)) * 280;
        G.player.vy = -465;

        if (gt && gt.type === 'enemy' && gt.ref.alive) {
          const foe = gt.ref;
          audio.playHit(false);
          G.hitstopTimer = 0.035;
          addShake(5.5);
          damageEnemyHP(foe, 12, true);
          addPostureToEnemy(foe, 18);
          G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 14);
          if (foe.kind === 'wraith' && foe.state === 'windup') {
            foe.state = 'recover';
            foe.stateTimer = 0.85;
          }
          spawnFloatText(foe.x + foe.w / 2, foe.y - 18, '幽丝破势!', COLORS.cyanBright, 17, 0.65);
        } else if (gt && gt.type === 'lantern') {
          audio.playPogoLantern();
          gt.ref.angVel += G.player.facing * 5.0;
        } else if (gt && gt.type === 'resBell') {
          ringResonanceBell(gt.puzzle, gt.ref, G.player.facing);
        }
      } else {
        G.player.vx = (dx / dist) * 880;
        G.player.vy = (dy / dist) * 880;
        G.player.squashX = 1.24;
        G.player.squashY = 0.82;
      }
    }
  } else if (G.player.detonateLungeTimer > 0) {
    G.player.detonateLungeTimer -= dt;
    G.player.vx = G.player.facing * 640;
    G.player.vy = 0;
    G.afterimages.push({ x: G.player.x, y: G.player.y, facing: G.player.facing, life: 0.16, maxLife: 0.16, color: COLORS.goldBright });
  } else if (G.player.iaiLungeTimer > 0) {
    G.player.iaiLungeTimer -= dt;
    G.player.vy = 0;
    G.afterimages.push({ x: G.player.x, y: G.player.y, facing: G.player.facing, life: 0.18, maxLife: 0.18, color: COLORS.goldBright });
  } else if (G.player.dashTimer > 0) {
    G.player.dashTimer -= dt;
    G.player.vx = G.player.dashDir * 680;
    G.player.vy = 0;
    if (Math.random() < 0.75) {
      G.afterimages.push({ x: G.player.x, y: G.player.y, facing: G.player.facing, life: 0.18, maxLife: 0.18, color: COLORS.ink });
    }
  } else {
    // Standard Run & Air Control
    const maxSpd = G.player.isCharging && G.player.chargeTime > 0.16 ? 130 : G.player.parryActive ? 95 : 310;
    if (G.player.wallJumpLock <= 0 && G.player.hurtTimer <= 0 && G.player.healTimer <= 0) {
      const targetVx = moveDir * maxSpd;
      const accel = G.player.grounded ? 2600 : 1700;
      if (G.player.vx < targetVx) G.player.vx = Math.min(targetVx, G.player.vx + accel * dt);
      else if (G.player.vx > targetVx) G.player.vx = Math.max(targetVx, G.player.vx - accel * dt);
      if (moveDir !== 0 && G.player.attackTimer <= 0 && !G.player.parryActive) G.player.facing = moveDir;
    }

    // Gravity & Wall Slide
    G.player.vy += GRAVITY * dt;
    if (!G.player.grounded && G.player.wallDir !== 0 && G.player.vy > 115 && moveDir === G.player.wallDir) {
      G.player.vy = 115;
      if (Math.random() < 0.25) {
        spawnParticles(G.player.x + (G.player.wallDir > 0 ? G.player.w : 0), G.player.y + 20, 1, { color: COLORS.parchment, speed: 40, grav: 80, life: 0.25 });
      }
    }
    if (G.player.vy > 960) G.player.vy = 960;

    // Coyote & Buffered Jump / Platform Drop / Wall Jump / Ink-Wing Double Jump
    if (G.player.grounded) {
      G.player.coyoteTimer = 0.11;
      G.player.airJumpsLeft = 1;
    }
    if (G.player.jumpBufTimer > 0 && G.player.healTimer <= 0) {
      if (G.player.grounded && G.player.onPlatform && isHeld(['KeyS', 'ArrowDown'])) {
        G.player.dropThroughTimer = 0.22;
        G.player.y += 4;
        G.player.grounded = false;
        G.player.onPlatform = false;
        G.player.coyoteTimer = 0;
        G.player.jumpBufTimer = 0;
      } else if (G.player.coyoteTimer > 0) {
        G.player.vy = -610;
        G.player.grounded = false;
        G.player.coyoteTimer = 0;
        G.player.jumpBufTimer = 0;
        G.player.squashX = 0.78;
        G.player.squashY = 1.26;
        spawnParticles(G.player.x + G.player.w / 2, G.player.y + G.player.h, 7, { color: COLORS.parchment, speed: 120, grav: 120, life: 0.28 });
      } else if (!G.player.grounded && G.player.wallDir !== 0) {
        G.player.vy = -585;
        G.player.vx = -G.player.wallDir * 355;
        G.player.facing = -G.player.wallDir;
        G.player.wallJumpLock = 0.15;
        G.player.airJumpsLeft = 1;
        G.player.jumpBufTimer = 0;
        G.player.squashX = 0.8;
        G.player.squashY = 1.24;
        spawnParticles(G.player.x + (G.player.wallDir > 0 ? G.player.w : 0), G.player.y + 30, 8, { color: COLORS.parchment, speed: 140, life: 0.28 });
      } else if (!G.player.grounded && G.worldState && G.worldState.abilities.doubleJump && G.player.airJumpsLeft > 0) {
        // Ink-Wing Double Jump (墨翼步!)
        G.player.airJumpsLeft--;
        G.player.vy = -585;
        G.player.jumpBufTimer = 0;
        G.player.squashX = 0.74;
        G.player.squashY = 1.32;
        audio.playWingJump();
        const wx = G.player.x + G.player.w / 2;
        const wy = G.player.y + G.player.h - 4;
        spawnShockwave(wx, wy, 56, COLORS.cyanBright, 3.2, 0.24);
        spawnParticles(wx, wy, 12, { color: COLORS.ink, speed: 185, grav: 90, size: 3.4, angle: Math.PI * 0.5, spread: 2.2, life: 0.4 });
        spawnParticles(wx, wy, 10, { color: COLORS.cyanBright, speed: 170, spark: true, grav: 40, angle: Math.PI * 0.5, spread: 2.2, life: 0.34 });
      }
    }

    // Variable Jump Height cut on release
    if (consumeRelease(['Space', 'ArrowUp']) && G.player.vy < -210) {
      G.player.vy *= 0.52;
    }
  }

  const preCollideVy = G.player.vy;
  const prevVx = G.player.prevVx || 0;
  moveAndCollide(G.player, dt, true);

  // Track safe grounding point outside the corrosive Abyssal Ink River
  if (G.player.riverCd > 0) G.player.riverCd = Math.max(0, G.player.riverCd - dt);
  if (G.player.grounded) {
    const footCx = G.player.x + G.player.w * 0.5;
    const footY = G.player.y + G.player.h;
    const inRiverZone = ABYSSAL_RIVERS.some(rv => rv.w > 0 && footCx >= rv.x - 10 && footCx <= rv.x + rv.w + 10 && footY >= rv.y - 6 && footY <= rv.y + 36);
    if (!inRiverZone) {
      G.player.lastSafeX = G.player.x;
      G.player.lastSafeY = G.player.y;
    }
  }

  // Multi-frame active hitboxes evaluated after movement sweep
  updatePlayerActiveAttack(dt);
  if (G.player.sealLunge) {
    evaluatePlayerSealLunge();
    if (G.player.detonateLungeTimer <= 0) {
      if (!G.player.sealLunge.stuck) {
        G.talismans.push({
          target: null,
          x: G.player.x + G.player.w / 2 + G.player.facing * 42,
          y: G.player.y + 24,
          seals: G.player.sealLunge.usedSeals,
          timer: 0.75
        });
      }
      G.player.sealLunge = null;
    }
  }

  const footMidX = G.player.x + G.player.w / 2;
  const footBotY = G.player.y + G.player.h;
  const inPuddle = G.player.grounded && Math.abs(footBotY - FLOOR_Y) < 8 && PUDDLES.some(p => footMidX >= p.x && footMidX <= p.x + p.w);

  if (!G.player.wasGrounded && G.player.grounded) {
    G.player.squashX = 1.25;
    G.player.squashY = 0.78;
    G.player.landCrouch = Math.min(1, Math.max(0.45, Math.abs(preCollideVy) / 680));
    audio.playLand();
    spawnParticles(footMidX, footBotY, 6, { color: inPuddle ? COLORS.cyanBright : COLORS.parchment, speed: 100, grav: 200, life: 0.24 });
    if (inPuddle) spawnWeatherRipple(footMidX, FLOOR_Y + 1, 34, 'rgba(186, 230, 253, 0.72)');
  }
  if (G.player.landCrouch > 0) G.player.landCrouch = Math.max(0, G.player.landCrouch - dt * 5.2);

  // Dynamic torso lean & sudden-stop cloak momentum whip
  let targetLean = 0;
  let brakeWhip = 0;
  if (G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.detonateLungeTimer > 0) {
    targetLean = G.player.facing * 0.32;
  } else if (G.player.isCharging && G.player.chargeTime > 0.14) {
    targetLean = G.player.facing * 0.22;
  } else if (G.player.parryActive) {
    targetLean = -G.player.facing * 0.12;
  } else if (!G.player.grounded && G.player.wallDir !== 0) {
    targetLean = -G.player.wallDir * 0.14;
  } else if (!G.player.grounded) {
    targetLean = G.player.facing * (G.player.vy < 0 ? 0.08 : 0.15);
  } else {
    targetLean = (G.player.vx / 310) * 0.18;
    if (Math.abs(prevVx) > 210 && (G.player.vx * prevVx <= 0 || Math.abs(G.player.vx) < 85)) {
      brakeWhip = Math.sign(prevVx) * 260;
      targetLean = Math.sign(prevVx) * 0.22;
    }
  }
  G.player.bodyLean += (targetLean - G.player.bodyLean) * Math.min(1, dt * 14);
  G.player.prevVx = G.player.vx;

  if (G.player.grounded && Math.abs(G.player.vx) > 25) {
    const stepDelta = dt * Math.abs(G.player.vx) * 0.042;
    G.player.runCycle += stepDelta;
    G.player.stepSfxAccum += stepDelta;
    if (G.player.stepSfxAccum >= Math.PI) {
      G.player.stepSfxAccum -= Math.PI;
      audio.playFootstep();
      if (inPuddle) {
        spawnWeatherRipple(footMidX, FLOOR_Y + 1, 22, 'rgba(186, 230, 253, 0.58)');
        spawnParticles(footMidX, FLOOR_Y, 4, { color: COLORS.cyanBright, speed: 80, grav: 260, life: 0.22 });
      }
    }
  } else {
    G.player.runCycle *= 0.9;
    G.player.stepSfxAccum = 0;
  }

  G.player.lanternSwing += (((-G.player.vx * 0.0018) + brakeWhip * 0.0015) - G.player.lanternSwing) * Math.min(1, dt * 8);

  updateCloak(G.player.cloak, footMidX - G.player.facing * 5, G.player.y + 18 + G.player.landCrouch * 5, G.player.facing, -G.player.vx * 0.45 + brakeWhip, dt);
  updateCloak(G.player.scarf, footMidX - G.player.facing * 3, G.player.y + 16 + G.player.landCrouch * 5, G.player.facing, -G.player.vx * 0.6 - G.player.facing * 60 + brakeWhip * 1.15, dt);

  // Update 2D Map Exploration & Touch-Collect Glowing Pickups
  markMapExplored(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2);
  if (G.worldState) {
    const px = G.player.x + G.player.w / 2;
    const py = G.player.y + G.player.h / 2;
    for (const p of G.worldState.pickups) {
      if (!p.collected && isPickupUnlocked(p) && Math.hypot(px - p.x, py - (p.y - 24)) < 42) {
        collectPickup(p);
      }
    }
  }

  // Trigger Boss 1 Awakening upon entering Chapel of the Broken Bell
  if (G.boss && G.boss.alive && !G.boss.awake && G.player.x > 2740 && G.player.x < 3760 && G.player.y < 700) {
    G.boss.awake = true;
    audio.playBellToll();
    addShake(10);
    spawnFloatText(G.boss.x + G.boss.w / 2, G.boss.y - 36, '「断钟骑士 · 晦」', COLORS.parchment, 24, 1.8);
  }
  // Trigger Boss 2 Awakening upon entering Abyssal Bell Foundry
  if (G.boss2 && G.boss2.alive && !G.boss2.awake && G.player.x > 5650 && G.player.y > 880) {
    G.boss2.awake = true;
    audio.playBellToll();
    addShake(12);
    spawnFloatText(G.boss2.x + G.boss2.w / 2, G.boss2.y - 42, '「沉渊铸钟师 · 寂」', COLORS.goldBright, 24, 1.9);
  }
}
