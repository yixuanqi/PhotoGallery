// Combat resolution: 3-tier parry, posture break, executions, active hitboxes & pickups
import {
  COLORS, GRAPPLE_ANCHORS, PENDULUMS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, ENEMY_ECHO_REWARDS
} from './config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, isWorldPosExplored, getRelicStats, getBladeDamageMult, getSmithPostureMult,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks,
  scheduleOutcome, addShake, kickCamera, punchZoom
} from './state.js';
import { getRoomAt } from './levelLoader.js';
import { audio } from './audio.js';
import { triggerHaptic, getActionKeyLabel } from './input.js';
import {
  spawnParticles, spawnShockwave, spawnImpactBurst, spawnHitMark, spawnFloatText
} from './vfx.js';
import { aabbOverlap, hasLineOfSight } from './physics.js';

export function rallyPlayerGrayHp(amount) {
  if (G.player.grayHp <= 0) return;
  const gain = Math.min(G.player.grayHp, amount * getRelicStats().rallyMult);
  G.player.hp = Math.min(G.player.maxHp, G.player.hp + gain);
  G.player.grayHp = Math.max(0, G.player.grayHp - gain);
  if (gain >= 2) {
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 5, { color: COLORS.crimsonBright, speed: 95, grav: -120, life: 0.35 });
  }
}

function clearPriestWards() {
  for (let i = 0; i < G.enemies.length; i++) {
    const a = G.enemies[i];
    if (a && a.alive && a.wardShield > 0) {
      a.wardShield = 0;
      spawnParticles(a.x + a.w / 2, a.y + a.h * 0.45, 14, { color: COLORS.goldBright, speed: 200, spark: true, life: 0.38 });
      spawnFloatText(a.x + a.w / 2, a.y - 24, '钟佑碎裂！', COLORS.goldBright, 16, 0.85);
    }
  }
}

export function damageEnemyHP(enemy, amount, showNum = true) {
  if (!enemy || !enemy.alive) return;
  let finalAmt = amount;
  if (enemy.wardShield > 0) {
    finalAmt = Math.max(2, Math.round(amount * 0.35));
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, 6, { color: COLORS.goldBright, speed: 140, spark: true, life: 0.25 });
  }
  if (enemy.kind === 'priest' && enemy.state === 'chant') {
    enemy.state = 'recover';
    enemy.stateTimer = 0.7;
    enemy.chantTargetId = null;
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 34, '打断咏钟！', COLORS.cyanBright, 17, 0.85);
  }
  enemy.hp = Math.max(0, enemy.hp - finalAmt);
  enemy.hurtFlash = 0.13;
  if (showNum) {
    const numCol = enemy.wardShield > 0 ? COLORS.goldBright : COLORS.parchment;
    const txt = enemy.wardShield > 0 ? `${Math.round(finalAmt)} (盾)` : `${Math.round(finalAmt)}`;
    spawnFloatText(enemy.x + enemy.w / 2 + (Math.random() - 0.5) * 20, enemy.y - 10, txt, numCol, 15, 0.55);
  }
  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

export function addPostureToEnemy(enemy, amount) {
  if (!enemy || !enemy.alive || enemy.state === 'stagger') return;
  const chantBonus = (enemy.kind === 'priest' && enemy.state === 'chant') ? 1.5 : 1.0;
  const scaled = amount * getRelicStats().postureDmgMult * getSmithPostureMult() * chantBonus;
  enemy.posture = Math.min(enemy.maxPosture, enemy.posture + scaled);
  enemy.postureDecayDelay = 3.2;
  if (enemy.posture >= enemy.maxPosture) {
    enemy.state = 'stagger';
    enemy.stateTimer = enemy.isBoss ? 3.8 : 3.2;
    enemy.vx = 0;
    if (enemy.kind === 'priest') clearPriestWards();
    audio.playBellToll();
    triggerHaptic('shieldBreak', 1.05);
    G.hitstopTimer = 0.065;
    addShake(11);
    spawnShockwave(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, 115, COLORS.goldBright, 4.5, 0.35);
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 26, `架势崩毁！按 [${getActionKeyLabel('attack')}] 处决`, COLORS.goldBright, 19, 1.4);
  }
}

export function killEnemy(enemy) {
  enemy.alive = false;
  if (enemy.kind === 'priest') clearPriestWards();
  if (G.worldState && !G.echoSession) {
    const reward = ENEMY_ECHO_REWARDS[enemy.kind] || 30;
    G.worldState.echoes = (G.worldState.echoes || 0) + reward;
    G.saveDirtyTimer = Math.min(G.saveDirtyTimer > 0 ? G.saveDirtyTimer : 2.5, 2.5);
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 24, `+${reward} 残响`, COLORS.goldBright, 16, 1.05);
  }
  spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 36, { color: COLORS.ink, speed: 260, grav: 160, life: 0.7 });
  spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 18, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.6 });
  spawnShockwave(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 120, COLORS.parchment, 3, 0.4);
  if (enemy.isBoss) {
    G.chapelTide = null;
    G.groundWaves = [];
    audio.playBellToll();
    triggerHaptic('execution', 1.2);
    addShake(16);
    if (G.echoSession) {
      if (G.echoSession.mode === 'rush' && G.echoSession.stage === 0) {
        G.echoSession.stage = 1;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, '第一试已破 · 续赴沉渊铸钟殿！', COLORS.cyanBright, 22, 1.5);
        scheduleOutcome(hooks.advanceEchoRushStage2, 1250, true);
      } else {
        scheduleOutcome(() => hooks.showVictory(enemy.id), 1100, true);
      }
      return;
    }
    if (enemy.id === 'boss_hui') {
      if (G.worldState) {
        G.worldState.bossDefeated = true;
        G.minimapDirty = true;
        hooks.saveProgress(false);
      }
      spawnFloatText(CHAPEL_EXIT_GATE_DEF.x, CHAPEL_EXIT_GATE_DEF.y - 34, '东侧封门已开 · 通往沉渊钟井', COLORS.cyanBright, 20, 2.0);
      scheduleOutcome(() => hooks.showVictory('boss_hui'), 1100, true);
    } else if (enemy.id === 'boss_ji') {
      if (G.worldState) {
        G.worldState.boss2Defeated = true;
        G.minimapDirty = true;
        hooks.saveProgress(false);
      }
      spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, '沉渊寂鸣 · 祭坛已开启「残誓回响」双钟终试！', COLORS.goldBright, 21, 2.2);
      scheduleOutcome(() => hooks.showVictory('boss_ji'), 1200, true);
    }
  }
}

export function applyIncomingAttackToPlayer(attacker, damage, isUnparryable, knockback = 240) {
  if (G.player.hp <= 0 || G.player.execTimer > 0) return;

  // 1. Invincibility Frames (Ink Dash / Grapple Pull / Hurt I-frames)
  if (G.player.iframeTimer > 0) {
    if (isUnparryable && G.player.dashTimer > 0) {
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 22, '见切闪避!', COLORS.cyanBright, 17, 0.7);
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 15);
    }
    return;
  }

  const dir = attacker.x + attacker.w / 2 < G.player.x + G.player.w / 2 ? 1 : -1;

  // Assist Mode incoming damage multiplier (1.0 / 0.7 / 0.5)
  const dmgMult = (G.settings && typeof G.settings.damageTakenMult === 'number') ? G.settings.damageTakenMult : 1.0;
  const scaledDamage = Math.max(1, Math.round(damage * dmgMult));

  // 2. Three-Tier Parry Check (only if attack is parryable)
  const rs = getRelicStats();
  if (G.player.parryActive && !isUnparryable) {
    if (G.player.parryElapsedMs <= rs.parryWindowMs) {
      // TIER 1: PERFECT PARRY (0 - 140ms * assist) — Sekiro / Nine Sols Clash Juice!
      G.stats.parries++;
      if (G.echoSession) G.echoSession.parries++;
      G.player.parryStreak = G.player.parryStreakTimer > 0 ? Math.min(9, G.player.parryStreak + 1) : 1;
      G.player.parryStreakTimer = 2.6;
      const streakScale = 1 + Math.min(3, G.player.parryStreak - 1) * 0.14;

      // Auto-face incoming attacker so follow-up [K -> J] Cross Counter always lands cleanly
      G.player.facing = -dir;

      audio.playParry(true, G.player.parryStreak);
      triggerHaptic('parry', 0.9 + Math.min(0.45, (G.player.parryStreak - 1) * 0.12));
      G.hitstopTimer = 0.062;
      addShake(9 + Math.min(4, G.player.parryStreak));
      kickCamera(dir * 9, -3);
      punchZoom(1.042 + Math.min(0.018, (G.player.parryStreak - 1) * 0.005));
      G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
      G.player.parryActive = false;
      G.player.parryCooldown = 0.03;
      G.player.riposteWindow = 0.56; // Opens K -> J Cross Counter Slash!
      G.player.vx = dir * 135;
      G.player.squashX = 0.82;
      G.player.squashY = 1.22;

      if (G.player.seals < G.player.maxSeals) G.player.seals++;
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(28 * rs.soulGainMult));
      if (rs.parryHeal) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + rs.parryHeal);
      }
      if (attacker && (attacker.kind === 'golem' || attacker.kind === 'boss2')) {
        attacker.shieldBrokenTimer = Math.max(attacker.shieldBrokenTimer || 0, 2.4);
        if (attacker.kind === 'boss2') attacker.shieldUp = false;
      }

      const posDmg = (attacker.isBoss ? 26 : 36) * rs.parryPostureMult;
      if (attacker.hp !== undefined) {
        addPostureToEnemy(attacker, posDmg);
        if (rs.parryReflectDmg > 0) {
          damageEnemyHP(attacker, rs.parryReflectDmg, true);
        }
        // Duelist keeps swinging through its 3-hit parry rhythm; other regular foes recoil into recover
        if (!attacker.isBoss && attacker.state !== 'stagger') {
          if (attacker.kind === 'duelist' && attacker.attackKind === 'combo3' && attacker.comboIdx < 2) {
            attacker.vx = -dir * 70;
          } else {
            attacker.state = 'recover';
            attacker.stateTimer = 0.65;
            attacker.vx = -dir * 160;
          }
        } else if (attacker.isBoss && (attacker.moveKind === 'chargeThrust' || attacker.moveKind === 'bellShieldCharge') && attacker.state !== 'stagger') {
          attacker.state = 'recover';
          attacker.stateTimer = 0.95;
          attacker.vx = -dir * 140;
          if (attacker.kind === 'boss2') {
            audio.playShieldBreak();
            spawnFloatText(attacker.x + attacker.w / 2, attacker.y - 30, '钟盾震碎！', COLORS.goldBright, 20, 0.95);
          }
        }
      }

      const sx = G.player.x + G.player.w / 2 + G.player.facing * 20;
      const sy = G.player.y + 24;
      // Clash starburst + twin shockwaves + bouncing metallic sparks + ink splatter
      spawnImpactBurst(sx, sy, 'parry', streakScale);
      spawnShockwave(sx, sy, 58 * streakScale, '#ffffff', 3.4, 0.16);
      spawnShockwave(sx, sy, 92 * streakScale, COLORS.goldBright, 4.4, 0.28);
      spawnParticles(sx, sy, 22 + G.player.parryStreak * 4, {
        color: COLORS.goldBright,
        speed: 380,
        spark: true,
        bounce: true,
        grav: 640,
        angle: dir > 0 ? -0.45 : Math.PI + 0.45,
        spread: 1.55,
        life: 0.44
      });
      spawnParticles(sx, sy, 10, { color: '#ffffff', speed: 290, spark: true, life: 0.24 });
      spawnParticles(sx, sy, 10, { color: COLORS.ink, speed: 220, grav: 320, size: 3.2, life: 0.38 });

      // Synergy 「镜烬印记」(碎镜之眼 + 孤灯余烬): 3-streak parry arms free talisman plant on next strike!
      if (rs.synMirrorEmber && G.player.parryStreak >= 3 && !G.player.freeSealProc) {
        G.player.freeSealProc = true;
        spawnShockwave(G.player.x + G.player.w / 2, G.player.y + 24, 72, COLORS.crimsonBright, 3.2, 0.28);
        spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 48, '羁绊 · 镜烬蓄印！下击附符', COLORS.crimsonBright, 17, 1.15);
      }

      const label = G.player.parryStreak >= 4
        ? `铁鸣连弹 ×${G.player.parryStreak}！`
        : G.player.parryStreak >= 2
          ? `连弹 ×${G.player.parryStreak}！`
          : '精准弹反！';
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 26, label, COLORS.goldBright, G.player.parryStreak >= 2 ? 22 : 20, 0.85);
      return;
    } else if (G.player.parryElapsedMs <= rs.blockWindowMs) {
      // TIER 2: PARTIAL BLOCK -> INTERNAL GRAY HP (Rally recoverable!)
      G.player.facing = -dir;
      G.player.parryStreak = 0;
      G.player.parryStreakTimer = 0;
      audio.playParry(false);
      triggerHaptic('block');
      G.hitstopTimer = 0.036;
      addShake(5.5);
      kickCamera(dir * 6, 0);
      G.player.parryActive = false;
      G.player.vx = dir * 210;
      G.player.squashX = 0.86;
      G.player.squashY = 1.14;
      const chip = Math.min(G.player.hp - 1, Math.round(scaledDamage * 0.62));
      if (chip > 0) {
        G.player.hp -= chip;
        G.player.grayHp = Math.min(G.player.maxHp - G.player.hp, G.player.grayHp + chip);
        G.player.grayTimer = rs.grayDuration;
        G.stats.damageTaken += chip;
        if (G.echoSession) G.echoSession.damageTaken += chip;
      }
      const bx = G.player.x + G.player.w / 2 + G.player.facing * 16;
      const by = G.player.y + 24;
      spawnImpactBurst(bx, by, 'block', 0.9);
      spawnShockwave(bx, by, 44, COLORS.cyanBright, 2.4, 0.18);
      spawnParticles(bx, by, 12, { color: COLORS.cyanBright, speed: 210, spark: true, bounce: true, grav: 520 });
      spawnParticles(bx, by, 7, { color: '#94a3b8', speed: 120, grav: -60, size: 3.6, life: 0.35 });
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 20, '格挡 · 内伤', '#cbd5e1', 16, 0.7);
      return;
    }
    // TIER 3 (>260ms): Recovery Guard Break -> falls through to full hit!
    spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 34, '后摇破防!', COLORS.crimsonBright, 16, 0.7);
  } else if (G.player.parryActive && isUnparryable) {
    spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 34, '危技破盾!', COLORS.crimsonBright, 18, 0.75);
  }

  // Full Hit
  audio.playHit(true);
  triggerHaptic('hurt');
  G.hitstopTimer = 0.05;
  addShake(11);
  G.screenFlash = { alpha: 0.25, color: COLORS.crimson };
  G.player.parryActive = false;
  G.player.parryStreak = 0;
  G.player.parryStreakTimer = 0;
  G.player.activeAttack = null;
  G.player.healTimer = 0;
  G.player.hurtTimer = 0.24;
  G.player.iframeTimer = 0.55;
  if (G.player.grayHp >= 4) {
    audio.playGrayShatter();
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 20, 12, { color: '#cbd5e1', speed: 210, spark: true, life: 0.42 });
  }
  G.player.grayHp = 0; // Taking direct damage shatters remaining internal gray HP!
  G.player.hp = Math.max(0, G.player.hp - scaledDamage);
  G.stats.damageTaken += scaledDamage;
  if (G.echoSession) G.echoSession.damageTaken += scaledDamage;
  G.player.vx = dir * knockback;
  G.player.vy = -240;

  spawnParticles(G.player.x + G.player.w / 2, G.player.y + 26, 20, { color: COLORS.crimsonBright, speed: 260, life: 0.45 });
  spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 14, `-${scaledDamage}`, COLORS.crimsonBright, 20, 0.8);

  if (G.player.hp <= 0) {
    G.player.hp = 0;
    G.player.deathTimer = 0.65;
    G.player.vx = dir * 90;
    G.player.vy = -120;
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 24, { color: COLORS.ink, speed: 180, grav: 120, life: 0.65 });
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 14, { color: COLORS.cyanBright, speed: 140, grav: -110, life: 0.6 });
    scheduleOutcome(hooks.showDeath, 650, false);
  }
}

/* =========================================================================
   9. PLAYER UPDATE (MOVEMENT, EXPANDED SWORD KIT, SPELL & GRAPPLE)
   ========================================================================= */
export function findBestGrappleTarget() {
  if (!G.player) return null;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 22;
  const candidates = [];

  for (const l of G.lanterns) {
    const lx = l.x + Math.sin(l.angle) * l.len;
    const ly = l.anchorY + Math.cos(l.angle) * l.len;
    candidates.push({ type: 'lantern', ref: l, x: lx, y: ly, bias: 1.0 });
  }
  for (const a of GRAPPLE_ANCHORS) {
    candidates.push({ type: 'anchor', ref: a, x: a.x, y: a.y, bias: 0.96 });
  }
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      for (const b of pz.bells) {
        candidates.push({ type: 'resBell', ref: b, puzzle: pz, x: b.x, y: b.y, bias: 0.95 });
      }
    }
  }
  const foes = getLivingFoes().filter(e => !e.isBoss || e.awake);
  for (const f of foes) {
    candidates.push({
      type: 'enemy',
      ref: f,
      x: f.x + f.w / 2,
      y: f.y + f.h * 0.35,
      bias: f.kind === 'priest' ? 0.78 : f.kind === 'wraith' ? 0.88 : 1.05
    });
  }

  const activeBoss = getAwakeBoss();
  const playerRoom = getRoomAt(px, py);
  let best = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const dx = c.x - px;
    const dy = c.y - py;
    const dist = Math.hypot(dx, dy);
    if (dist > 410 || dist < 58) continue;
    // 1. Boss arena boundary clamp: never lock onto targets outside/below an active Boss arena
    if (activeBoss) {
      if (c.x < activeBoss.arenaMinX || c.x > activeBoss.arenaMaxX || c.y < activeBoss.arenaTopY || c.y > activeBoss.arenaFloorY) continue;
    }
    // 2. Prevent locking downward into an unexplored lower room (e.g., unopened crypt beneath one-way hatch)
    if (playerRoom && dy > 40) {
      const targetRoom = getRoomAt(c.x, c.y);
      if (targetRoom && targetRoom.id !== playerRoom.id && !isWorldPosExplored(c.x, c.y)) continue;
    }
    // 3. Solid geometry line-of-sight check (blocks targeting through floors, pillars, closed gates & secret walls)
    if (!hasLineOfSight(px, py, c.x, c.y)) continue;
    const inFront = dx * G.player.facing >= -45;
    const score = dist * (inFront ? 1.0 : 1.85) * c.bias;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function performExecution(target) {
  G.stats.executions++;
  if (G.echoSession) G.echoSession.executions++;
  audio.playExecution();
  triggerHaptic('execution');
  G.hitstopTimer = 0.085;
  G.invertTimer = 0.09;
  addShake(16);

  G.player.execTimer = 0.38;
  G.player.activeAttack = null;
  G.player.sealLunge = null;
  G.player.iframeTimer = 0.7;
  G.player.vx = 0;
  G.player.vy = 0;
  G.player.facing = target.x + target.w / 2 >= G.player.x + G.player.w / 2 ? 1 : -1;
  G.player.x = target.x + target.w / 2 - G.player.facing * 42 - G.player.w / 2;

  const dmg = target.isBoss ? 128 : 999;
  damageEnemyHP(target, dmg, true);
  target.posture = 0;
  if (target.alive) {
    target.state = 'recover';
    target.stateTimer = 0.85;
  }

  const rs = getRelicStats();
  const heal = Math.round(G.player.maxHp * rs.execHealPct);
  G.player.hp = Math.min(G.player.maxHp, G.player.hp + heal);
  G.player.grayHp = 0;
  if (rs.execFullSoul) G.player.soul = G.player.maxSoul;

  const cx = target.x + target.w / 2;
  const cy = target.y + target.h * 0.45;
  G.slashes.push({ x: cx, y: cy, facing: G.player.facing, type: 'exec', life: 0.32, maxLife: 0.32 });
  spawnShockwave(cx, cy, 145, COLORS.crimsonBright, 5.5, 0.38);
  spawnParticles(cx, cy, 34, { color: COLORS.crimsonBright, speed: 340, spark: true, life: 0.55 });
  spawnParticles(cx, cy, 22, { color: COLORS.goldBright, speed: 280, spark: true, life: 0.45 });
  spawnFloatText(cx, target.y - 30, '断 誓 处 决', COLORS.crimsonBright, 26, 1.15);
}

export function getPlayerAttackBox(type) {
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 26;
  if (type === 'counter') {
    return { x: px + (G.player.facing > 0 ? -12 : -118), y: py - 38, w: 130, h: 72 };
  } else if (type === 'iai') {
    return { x: px + (G.player.facing > 0 ? -24 : -136), y: py - 30, w: 160, h: 56 };
  } else if (type === 'pogo') {
    return { x: px - 36, y: G.player.y + G.player.h - 10, w: 72, h: 56 };
  } else if (type === 'up') {
    return { x: px - 42 + G.player.facing * 18, y: G.player.y - 54, w: 84, h: 76 };
  } else if (type === 'slash3') {
    return { x: px + (G.player.facing > 0 ? -6 : -96), y: py - 36, w: 102, h: 68 };
  } else if (type === 'slash2') {
    return { x: px + (G.player.facing > 0 ? -4 : -86), y: py - 24, w: 90, h: 50 };
  }
  return { x: px + (G.player.facing > 0 ? -4 : -82), y: py - 28, w: 86, h: 54 };
}

export function evaluatePlayerActiveAttack() {
  const atk = G.player.activeAttack;
  if (!atk) return;
  if (atk.elapsed < atk.activeStart || atk.elapsed > atk.activeEnd) return;

  const px = G.player.x + G.player.w / 2;
  const box = getPlayerAttackBox(atk.type);

  // Hit Enemies & Bosses (multi-frame sweep, deduplicated per swing via hitIds)
  const targets = getLivingFoes();
  let hitAny = false;
  for (const t of targets) {
    if (atk.hitIds.has(t.id)) continue;
    if (aabbOverlap(box, t)) {
      atk.hitIds.add(t.id);
      hitAny = true;
      const stepIdx = atk.type === 'slash3' ? 3 : atk.type === 'slash2' ? 2 : 1;
      audio.playHit(atk.heavy, stepIdx);
      triggerHaptic(atk.type === 'iai' || atk.type === 'counter' ? 'iai' : atk.heavy ? 'heavyHit' : 'lightHit');
      G.hitstopTimer = Math.max(G.hitstopTimer, atk.type === 'iai' || atk.type === 'counter' ? 0.056 : atk.heavy ? 0.048 : 0.030);
      addShake(atk.heavy ? 7.5 : 3.8);
      kickCamera(
        atk.type === 'pogo' ? 0 : G.player.facing * (atk.heavy ? 7.5 : 4.2),
        atk.type === 'pogo' ? 6 : atk.type === 'up' ? -5.5 : 1.5
      );
      if (atk.type === 'iai' || atk.type === 'counter') punchZoom(1.036);
      else if (atk.heavy) punchZoom(1.02);

      // Shielded Bell-Golem & Boss 2 Resonance Bell Shield Check!
      const isGolemShieldUp = ((t.kind === 'golem' && t.state !== 'stagger' && t.shieldBrokenTimer <= 0 &&
        (t.state === 'patrol' || t.state === 'chase' || t.state === 'recover')) ||
        (t.kind === 'boss2' && t.shieldUp && t.state !== 'stagger' && t.shieldBrokenTimer <= 0));
      const hitFromFront = (G.player.x + G.player.w / 2 - (t.x + t.w / 2)) * t.facing > 0;
      const canBreakShield = atk.type === 'iai' || atk.type === 'slash3' || atk.type === 'counter';
      const bypassShield = atk.type === 'pogo' || !hitFromFront;

      const rs = getRelicStats();
      let finalDmg = Math.round(atk.dmg * getBladeDamageMult());
      if ((atk.type === 'iai' || atk.type === 'counter') && rs.heavySkillMult > 1) {
        finalDmg = Math.round(finalDmg * rs.heavySkillMult);
      }
      if (t.kind === 'leech' && (atk.type === 'up' || t.state === 'cling' || t.state === 'telegraph' || t.state === 'drop')) {
        finalDmg = Math.round(finalDmg * 1.45);
        spawnFloatText(t.x + t.w / 2, t.y - 30, '截击伏袭！', COLORS.cyanBright, 16, 0.75);
      }

      if (isGolemShieldUp && !bypassShield) {
        if (canBreakShield) {
          t.shieldBrokenTimer = 2.6;
          if (t.kind === 'boss2') t.shieldUp = false;
          audio.playShieldBreak();
          triggerHaptic('shieldBreak');
          addShake(9);
          spawnImpactBurst(t.x + t.w / 2 + t.facing * 18, t.y + 38, 'parry', 0.95);
          spawnFloatText(t.x + t.w / 2, t.y - 26, '重盾破防！', COLORS.goldBright, 20, 1.0);
          damageEnemyHP(t, finalDmg, true);
          addPostureToEnemy(t, (atk.posture + 24) * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1));
        } else {
          // Light front attack clangs off the bronze greatshield!
          audio.playParry(false);
          triggerHaptic('block');
          spawnImpactBurst(t.x + t.w / 2 + t.facing * 20, t.y + 38, 'block', 0.85);
          spawnFloatText(t.x + t.w / 2, t.y - 24, '巨盾格挡 · 用居合/灵刃/弹反破防', '#cbd5e1', 15, 0.9);
          damageEnemyHP(t, Math.max(3, Math.round(finalDmg * 0.2)), true);
          addPostureToEnemy(t, 4);
          G.player.vx = -G.player.facing * 155;
          continue;
        }
      } else {
        const postureHit = atk.posture * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1);
        damageEnemyHP(t, finalDmg, true);
        addPostureToEnemy(t, postureHit);
      }
      // Synergy 「镜烬印记」: free talisman plant on melee strike after 3-streak parry!
      if (G.player.freeSealProc && t.alive) {
        G.player.freeSealProc = false;
        G.talismans.push({
          target: t,
          x: t.x + t.w / 2,
          y: t.y + t.h * 0.4,
          seals: 1,
          timer: 0.85
        });
        audio.playIaiReady();
        spawnFloatText(t.x + t.w / 2, t.y - 34, '镜烬贴符！', COLORS.crimsonBright, 18, 0.85);
      }
      // Synergy 「碎心绝响」(古钟心核 + 碎镜之眼): Counter Slash immediately detonates stuck talismans!
      if (atk.type === 'counter' && rs.synCoreCounter && G.talismans.length > 0) {
        const tx = t.x + t.w / 2;
        const ty = t.y + t.h * 0.45;
        for (let ti = G.talismans.length - 1; ti >= 0; ti--) {
          const tm = G.talismans[ti];
          if (tm.target === t || Math.hypot(tm.x - tx, tm.y - ty) < 130) {
            G.talismans.splice(ti, 1);
            audio.playDetonate();
            triggerHaptic('execution', 0.9);
            addShake(13);
            G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
            const rad = 135 + tm.seals * 28;
            spawnShockwave(tx, ty, rad, COLORS.goldBright, 5.2, 0.36);
            spawnParticles(tx, ty, 32, { color: COLORS.goldBright, speed: 340, spark: true, life: 0.5 });
            spawnFloatText(tx, ty - 42, '羁绊 · 碎心绝响！', COLORS.goldBright, 22, 1.05);
            for (const f of getLivingFoes()) {
              if (Math.hypot((f.x + f.w / 2) - tx, (f.y + f.h / 2) - ty) < rad) {
                damageEnemyHP(f, Math.round(46 * tm.seals), true);
                addPostureToEnemy(f, Math.round(52 * tm.seals));
              }
            }
          }
        }
      }
      rallyPlayerGrayHp(atk.rally);
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round((atk.heavy ? 24 : 14) * rs.soulGainMult));

      if (!t.isBoss && t.state !== 'stagger') {
        t.vx = G.player.facing * (atk.heavy ? 180 : 95);
      }

      const hx = t.x + t.w / 2;
      const hy = t.y + t.h * 0.45;
      const cutAngle = atk.type === 'pogo'
        ? Math.PI * 0.5
        : atk.type === 'up'
          ? -Math.PI * 0.42 * G.player.facing
          : atk.type === 'iai'
            ? 0
            : atk.type === 'slash1'
              ? -0.58 * G.player.facing
              : atk.type === 'slash2'
                ? 0.22 * G.player.facing
                : 0.78 * G.player.facing;

      // Razor-sharp slash wound flash across enemy silhouette
      if (atk.type === 'counter') {
        spawnHitMark(hx, hy, -0.68, COLORS.goldBright, 92, 8);
        spawnHitMark(hx, hy, 0.68, COLORS.crimsonBright, 86, 7);
        spawnShockwave(hx, hy, 78, COLORS.goldBright, 3.6, 0.22);
      } else if (atk.type === 'iai') {
        spawnHitMark(hx, hy, 0, COLORS.goldBright, 124, 9);
        spawnShockwave(hx, hy, 84, COLORS.goldBright, 3.8, 0.24);
      } else {
        spawnHitMark(hx, hy, cutAngle, atk.heavy ? COLORS.goldBright : '#ffffff', atk.heavy ? 88 : 66, atk.heavy ? 7.5 : 5.5);
        if (atk.heavy) spawnShockwave(hx, hy, 62, COLORS.goldBright, 3.2, 0.2);
      }

      // Directional sparks spraying THROUGH enemy + dark ink splatter droplets
      const sprayAng = atk.type === 'pogo' ? Math.PI * 0.5 : atk.type === 'up' ? -Math.PI * 0.5 : (G.player.facing > 0 ? -0.18 : Math.PI + 0.18);
      spawnParticles(hx, hy, atk.heavy ? 18 : 10, {
        color: atk.heavy ? COLORS.goldBright : COLORS.parchment,
        speed: atk.heavy ? 310 : 250,
        spark: true,
        bounce: atk.heavy,
        grav: 520,
        angle: sprayAng,
        spread: 1.05,
        life: 0.36
      });
      spawnParticles(hx, hy, atk.heavy ? 10 : 6, {
        color: COLORS.ink,
        speed: 220,
        grav: 360,
        size: atk.heavy ? 3.8 : 2.8,
        angle: sprayAng,
        spread: 1.25,
        life: 0.42
      });

      if (atk.type === 'pogo' && !atk.pogoBounced) {
        atk.pogoBounced = true;
        G.player.vy = -510;
        G.player.dashCd = 0;
        G.player.airJumpsLeft = 1;
        G.player.squashX = 0.8;
        G.player.squashY = 1.25;
      }
    }
  }

  // Pogo off Hanging Brass Lanterns & Swinging Bronze Pendulums during active window
  if (atk.type === 'pogo' && !atk.pogoBounced) {
    for (const l of G.lanterns) {
      if (l.hitCd > 0) continue;
      const lx = l.x + Math.sin(l.angle) * l.len;
      const ly = l.anchorY + Math.cos(l.angle) * l.len;
      if (Math.abs(lx - px) < 48 && Math.abs(ly - (G.player.y + G.player.h + 16)) < 44) {
        l.hitCd = 0.25;
        l.angVel += G.player.facing * 6.5;
        l.ringFlash = 0.4;
        atk.pogoBounced = true;
        G.player.vy = -545;
        G.player.dashCd = 0;
        G.player.airJumpsLeft = 1;
        G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 12);
        audio.playPogoLantern();
        G.hitstopTimer = 0.032;
        spawnShockwave(lx, ly, 58, COLORS.goldBright, 3, 0.24);
        spawnParticles(lx, ly, 14, { color: COLORS.goldBright, speed: 220, spark: true });
        tryQuellChapelTideByLantern(l, lx, ly);
        break;
      }
    }
  }
  if (atk.type === 'pogo' && !atk.pogoBounced) {
    for (const pd of PENDULUMS) {
      const ang = Math.sin(G.globalTime * pd.speed + pd.phase) * pd.amp;
      const bx = pd.x + Math.sin(ang) * pd.len;
      const by = pd.anchorY + Math.cos(ang) * pd.len;
      if (Math.hypot(bx - px, by - (G.player.y + G.player.h + 14)) < pd.r + 34) {
        atk.pogoBounced = true;
        pd.hitCd = 0.35;
        G.player.vy = -545;
        G.player.dashCd = 0;
        G.player.airJumpsLeft = 1;
        G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 14);
        audio.playParry(true, 1);
        G.hitstopTimer = 0.038;
        spawnImpactBurst(bx, by, 'parry', 0.78);
        spawnShockwave(bx, by, 54, COLORS.goldBright, 3, 0.22);
        break;
      }
    }
  }

  // Strike Resonance Puzzle Bells with Melee (also supports pogo bounce!)
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      for (const b of pz.bells) {
        if (atk.hitIds.has(b.id) || b.hitCd > 0) continue;
        const bellBox = { x: b.x - 20, y: b.y - 24, w: 40, h: 44 };
        if (aabbOverlap(box, bellBox)) {
          atk.hitIds.add(b.id);
          ringResonanceBell(pz, b, G.player.facing);
          if (atk.type === 'pogo' && !atk.pogoBounced) {
            atk.pogoBounced = true;
            G.player.vy = -545;
            G.player.dashCd = 0;
            G.player.airJumpsLeft = 1;
            G.player.squashX = 0.8;
            G.player.squashY = 1.25;
          }
        }
      }
    }
  }

  // Strike Breakable Ink Walls & Shortcut Lever with Melee
  if (G.worldState) {
    for (const w of G.worldState.secretWalls) {
      if (w.broken || atk.hitIds.has(w.id)) continue;
      if (aabbOverlap(box, w)) {
        atk.hitIds.add(w.id);
        hitAny = true;
        damageSecretWall(w, atk.heavy ? 2 : 1);
      }
    }
    if (!G.worldState.shortcutOpen && !atk.hitIds.has('lever_skyway')) {
      const leverBox = { x: SHORTCUT_GATE_DEF.leverX - 24, y: SHORTCUT_GATE_DEF.leverY - 56, w: 48, h: 56 };
      if (aabbOverlap(box, leverBox)) {
        atk.hitIds.add('lever_skyway');
        openSkywayShortcut();
      }
    }
  }

  // Slice enemy projectiles out of the air during active window
  for (const pr of G.projectiles) {
    if (pr.owner === 'enemy' && pr.life > 0 && aabbOverlap(box, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) {
      pr.life = 0;
      audio.playParry(false);
      spawnParticles(pr.x, pr.y, 12, { color: COLORS.goldBright, speed: 190, spark: true });
    }
  }

  // Recoil only on standard non-dashing strikes (so Iai & Counter slice cleanly through)
  if (hitAny && !atk.recoiled && atk.type !== 'pogo' && atk.type !== 'iai' && atk.type !== 'counter') {
    atk.recoiled = true;
    G.player.vx = -G.player.facing * 75;
  }
}

export function updatePlayerActiveAttack(dt) {
  if (!G.player.activeAttack) return;
  G.player.activeAttack.elapsed += dt;
  evaluatePlayerActiveAttack();
  if (G.player.activeAttack && G.player.activeAttack.elapsed >= G.player.activeAttack.activeEnd) {
    G.player.activeAttack = null;
  }
}

export function evaluatePlayerSealLunge() {
  if (!G.player.sealLunge || G.player.sealLunge.stuck) return;
  const px = G.player.x + G.player.w / 2;
  const lungeBox = { x: px + (G.player.facing > 0 ? -12 : -88), y: G.player.y - 10, w: 100, h: 74 };
  const foes = getLivingFoes();
  for (const f of foes) {
    if (aabbOverlap(lungeBox, f)) {
      G.player.sealLunge.stuck = true;
      G.talismans.push({
        target: f,
        x: f.x + f.w / 2,
        y: f.y + f.h * 0.4,
        seals: G.player.sealLunge.usedSeals,
        timer: 0.95
      });
      spawnParticles(f.x + f.w / 2, f.y + f.h * 0.4, 16, { color: COLORS.goldBright, speed: 220, spark: true });
      spawnFloatText(f.x + f.w / 2, f.y - 20, `贴符 ×${G.player.sealLunge.usedSeals}`, COLORS.goldBright, 18, 0.75);
      break;
    }
  }
}

export function triggerPlayerAttack(type) {
  G.player.attackType = type;
  G.player.attackDuration = type === 'iai' || type === 'counter' ? 0.24 : type === 'slash3' ? 0.26 : 0.19;
  G.player.attackTimer = G.player.attackDuration;
  G.player.attackCd = type === 'slash3' ? 0.28 : 0.17;
  G.player.parryActive = false;

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 26;
  let dmg = 20;
  let posture = 12;
  let rally = 10;
  let heavy = false;
  let activeEnd = 0.11;

  if (type === 'counter') {
    audio.playCounterSlash();
    G.player.vx = G.player.facing * 360;
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.16);
    G.player.squashX = 1.24;
    G.player.squashY = 0.84;
    dmg = 42; posture = 36; rally = 26; heavy = true; activeEnd = 0.14;
    addShake(8.5);
    kickCamera(G.player.facing * 7, 0);
    punchZoom(1.032);
    spawnFloatText(px, G.player.y - 24, '断钟返!', COLORS.goldBright, 20, 0.72);
  } else if (type === 'iai') {
    audio.playIaiSlash();
    G.player.iaiLungeTimer = 0.15;
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.16);
    G.player.vx = G.player.facing * 720;
    G.player.squashX = 1.32;
    G.player.squashY = 0.78;
    dmg = 48; posture = 32; rally = 20; heavy = true; activeEnd = 0.17;
    addShake(9.5);
    kickCamera(G.player.facing * 9, 0);
    punchZoom(1.038);
    triggerHaptic('iai');
    spawnParticles(px, py, 16, { color: COLORS.goldBright, speed: 240, spark: true, angle: G.player.facing > 0 ? Math.PI : 0, spread: 0.65, life: 0.34 });
    const rsIai = getRelicStats();
    if (rsIai.synBloodIai && G.player.grayHp >= 1) {
      G.projectiles.push({
        owner: 'player',
        kind: 'crimsonWave',
        x: px + G.player.facing * 24,
        y: py,
        vx: G.player.facing * 790,
        vy: 0,
        r: 26,
        dmg: Math.round(34 * rsIai.heavySkillMult),
        posture: 26,
        life: 0.72,
        maxLife: 0.72,
        facing: G.player.facing,
        hitIds: new Set()
      });
      spawnShockwave(px + G.player.facing * 18, py, 64, COLORS.crimsonBright, 3.6, 0.24);
      spawnFloatText(px, G.player.y - 26, '羁绊 · 血铁居合！', COLORS.crimsonBright, 22, 0.95);
    } else {
      spawnFloatText(px, G.player.y - 24, '居合 · 一闪', COLORS.goldBright, 21, 0.78);
    }
  } else if (type === 'pogo') {
    audio.playSlash(1.22, false);
    G.player.squashX = 0.88;
    G.player.squashY = 1.14;
    dmg = 22; posture = 14; rally = 12; activeEnd = 0.16;
  } else if (type === 'up') {
    audio.playSlash(1.18, false);
    G.player.squashX = 0.88;
    G.player.squashY = 1.16;
    dmg = 24; posture = 15; rally = 12; activeEnd = 0.12;
  } else if (type === 'slash3') {
    audio.playSlash(0.84, true);
    G.player.vx = G.player.facing * 240;
    G.player.squashX = 1.18;
    G.player.squashY = 0.86;
    dmg = 30; posture = 22; rally = 15; heavy = true; activeEnd = 0.14;
    if (G.player.grounded) {
      spawnParticles(px + G.player.facing * 42, G.player.y + G.player.h - 2, 10, { color: COLORS.parchment, speed: 150, grav: 320, angle: -Math.PI * 0.5, spread: 1.2, life: 0.32 });
    }
  } else if (type === 'slash2') {
    audio.playSlash(1.08, false);
    G.player.vx = G.player.facing * 130;
    G.player.squashX = 1.10;
    G.player.squashY = 0.92;
    dmg = 21; posture = 12; rally = 11; activeEnd = 0.11;
  } else {
    audio.playSlash(0.98, false);
    G.player.vx = G.player.facing * 105;
    G.player.squashX = 1.08;
    G.player.squashY = 0.94;
    dmg = 19; posture = 11; rally = 10; activeEnd = 0.11;
  }

  const slashOffX = type === 'pogo' ? 0 : type === 'iai' ? 0 : G.player.facing * 26;
  const slashOffY = type === 'pogo' ? 40 : type === 'up' ? -34 : 0;
  const slashLife = type === 'iai' ? 0.34 : type === 'counter' ? 0.28 : type === 'slash3' ? 0.23 : 0.19;
  G.slashes.push({
    x: px + slashOffX,
    y: py + slashOffY,
    x0: px - G.player.facing * 18,
    x1: px + G.player.facing * 135,
    offX: slashOffX,
    offY: slashOffY,
    followPlayer: type !== 'iai' && type !== 'counter',
    isIaiTrack: type === 'iai',
    facing: G.player.facing,
    type,
    life: slashLife,
    maxLife: slashLife
  });

  G.player.activeAttack = {
    type,
    dmg,
    posture,
    rally,
    heavy,
    elapsed: 0,
    activeStart: 0,
    activeEnd,
    hitIds: new Set(),
    pogoBounced: false,
    recoiled: false
  };

  // Immediate frame-1 check so point-blank attacks feel instant
  evaluatePlayerActiveAttack();
}

export function tryQuellChapelTideByLantern(lantern, lx, ly) {
  if (!G.chapelTide) return;
  const validLanterns = G.chapelTide.lanternIds || ['lan_4', 'lan_5'];
  if (!validLanterns.includes(lantern.id)) return;
  const owner = G.chapelTide.owner || G.boss;
  const isFoundry = owner && owner.id === 'boss_ji';
  G.chapelTide = null;
  audio.playBellToll();
  G.hitstopTimer = Math.max(G.hitstopTimer, 0.06);
  addShake(11);
  G.screenFlash = { alpha: 0.2, color: COLORS.goldBright };
  spawnShockwave(lx, ly, 230, COLORS.goldBright, 4.8, 0.42);
  spawnParticles(lx, ly, 28, { color: COLORS.goldBright, speed: 300, spark: true, life: 0.48 });
  spawnFloatText(lx, ly - 26, isFoundry ? '清钟破鸣!' : '清钟破潮!', COLORS.goldBright, 22, 1.25);
  if (owner && owner.alive) {
    damageEnemyHP(owner, isFoundry ? 38 : 32, true);
    addPostureToEnemy(owner, isFoundry ? 42 : 34);
    if ((owner.moveKind === 'inkTide' || owner.moveKind === 'resonanceNova') && owner.state !== 'stagger') {
      owner.state = 'recover';
      owner.stateTimer = 1.1;
    }
  }
}

export function openSkywayShortcut() {
  if (!G.worldState || G.worldState.shortcutOpen) return;
  G.worldState.shortcutOpen = true;
  G.minimapDirty = true;
  hooks.saveProgress(true);
  audio.playBellToll();
  addShake(11);
  G.screenFlash = { alpha: 0.16, color: COLORS.goldBright };
  spawnShockwave(SHORTCUT_GATE_DEF.x + 19, 130, 125, COLORS.goldBright, 4, 0.36);
  spawnParticles(SHORTCUT_GATE_DEF.x + 19, 130, 26, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.55 });
  spawnFloatText(SHORTCUT_GATE_DEF.x + 19, 165, '高空锁链捷径已开启！', COLORS.goldBright, 21, 1.5);
}

export function damageSecretWall(w, dmg = 1) {
  if (w.broken) return;
  w.hp = Math.max(0, w.hp - dmg);
  w.shake = 0.18;
  audio.playHit(w.hp <= 0);
  G.hitstopTimer = Math.max(G.hitstopTimer, w.hp <= 0 ? 0.055 : 0.028);
  addShake(w.hp <= 0 ? 10 : 4);
  const cx = w.x + w.w / 2;
  const cy = w.y + w.h / 2;
  spawnParticles(cx, cy, w.hp <= 0 ? 34 : 12, { color: COLORS.ink, speed: 240, grav: 280, life: 0.55 });
  spawnParticles(cx, cy, w.hp <= 0 ? 18 : 6, { color: COLORS.cyanBright, speed: 210, spark: true, life: 0.4 });
  if (w.hp <= 0) {
    w.broken = true;
    G.minimapDirty = true;
    hooks.saveProgress(false);
    audio.playDetonate();
    spawnShockwave(cx, cy, 96, COLORS.cyanBright, 3.8, 0.34);
    spawnFloatText(cx, w.y - 12, '墨蚀暗墙已破！', COLORS.cyanBright, 20, 1.35);
  }
}

export function isPickupUnlocked(p) {
  if (!p.requiresPuzzle) return true;
  return !!(G.worldState && G.worldState.solvedPuzzles && G.worldState.solvedPuzzles.has(p.requiresPuzzle));
}

export function ringResonanceBell(puzzle, bell, impulseDir = 1) {
  if (!puzzle || !bell || bell.hitCd > 0) return;
  bell.hitCd = 0.22;
  bell.swingVel += (impulseDir || 1) * 7.2;
  bell.flash = 0.55;
  G.hitstopTimer = Math.max(G.hitstopTimer, 0.024);
  spawnShockwave(bell.x, bell.y, 78, COLORS.goldBright, 3.2, 0.26);
  spawnParticles(bell.x, bell.y, 16, { color: COLORS.goldBright, speed: 220, spark: true, life: 0.36 });
  if (G.player) {
    G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(10 * getRelicStats().soulGainMult));
  }

  if (puzzle.solved) {
    audio.playResonanceBell(bell.noteFreq, false);
    return;
  }

  const timeCap = puzzle.timeLimit + getRelicStats().bellTimerBonus;
  const wasLit = bell.lit;
  bell.lit = true;
  if (puzzle.timer <= 0 || !wasLit) {
    puzzle.maxTimer = timeCap;
    puzzle.timer = Math.max(puzzle.timer, timeCap * 0.72);
    if (puzzle.bells.filter(b => b.lit).length === 1) puzzle.timer = timeCap;
  }

  const litCount = puzzle.bells.filter(b => b.lit).length;
  if (litCount >= puzzle.bells.length) {
    puzzle.solved = true;
    puzzle.timer = 0;
    if (G.worldState) {
      if (!G.worldState.solvedPuzzles) G.worldState.solvedPuzzles = new Set();
      G.worldState.solvedPuzzles.add(puzzle.id);
      G.minimapDirty = true;
      hooks.saveProgress(true);
    }
    audio.playResonanceBell(bell.noteFreq, true);
    audio.playBellToll();
    addShake(12);
    G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
    spawnShockwave(puzzle.cageX, puzzle.cageY - 38, 175, COLORS.goldBright, 4.8, 0.45);
    spawnParticles(puzzle.cageX, puzzle.cageY - 36, 36, { color: COLORS.goldBright, speed: 280, spark: true, life: 0.6 });
    spawnFloatText(puzzle.cageX, puzzle.cageY - 82, `${puzzle.name} · 封印已解！`, COLORS.goldBright, 22, 1.85);
  } else {
    audio.playResonanceBell(bell.noteFreq, false);
    spawnFloatText(bell.x, bell.y - 32, `共鸣 ${litCount} / ${puzzle.bells.length}`, COLORS.goldBright, 17, 0.75);
  }
}

export function castBellQuake() {
  const rs = getRelicStats();
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 24;
  const radius = Math.round(168 * rs.spellRadiusMult);
  const dmg = Math.round(38 * rs.spellDmgMult);
  const posDmg = Math.round(32 + rs.spellPostureBonus);

  G.player.soul = Math.max(0, G.player.soul - rs.quakeCost);
  G.player.castTimer = 0.28;
  G.player.castCd = 0.56;
  G.player.parryActive = false;
  G.player.activeAttack = null;
  G.player.isCharging = false;
  G.player.chargeTime = 0;
  G.player.chargeReadyPlayed = false;
  G.player.squashX = 0.80;
  G.player.squashY = 1.24;
  G.player.vx *= 0.25;
  if (!G.player.grounded) G.player.vy = Math.min(G.player.vy, -145);

  audio.playBellQuake();
  triggerHaptic('heavyHit', 1.1);
  G.hitstopTimer = Math.max(G.hitstopTimer, 0.042);
  addShake(11);
  punchZoom(1.036);
  G.screenFlash = { alpha: 0.16, color: COLORS.cyanBright };

  G.bellQuakes.push({ x: px, y: py, radius, life: 0.42, maxLife: 0.42 });
  spawnShockwave(px, py - 18, radius, COLORS.cyanBright, 4.6, 0.34);
  spawnShockwave(px, py - 18, radius * 0.65, COLORS.goldBright, 3.0, 0.26);
  spawnParticles(px, py - 24, 28, { color: COLORS.cyanBright, speed: 290, spark: true, grav: -60, life: 0.42 });
  spawnParticles(px, py - 24, 16, { color: COLORS.goldBright, speed: 240, spark: true, grav: 120, life: 0.38 });
  spawnFloatText(px, G.player.y - 36, '镇魂钟鸣!', COLORS.cyanBright, 20, 0.78);

  // Hit enemies inside radial aura OR tall overhead sonic pillar
  const pillarBox = { x: px - radius * 0.56, y: py - radius * 1.45, w: radius * 1.12, h: radius * 1.55 };
  const targets = getLivingFoes();
  for (const t of targets) {
    const tx = t.x + t.w / 2;
    const ty = t.y + t.h * 0.45;
    const inRadius = Math.hypot(tx - px, ty - py) <= radius + Math.max(t.w, t.h) * 0.35;
    const inPillar = aabbOverlap(pillarBox, t);
    if (inRadius || inPillar) {
      audio.playHit(true, 3);
      if ((t.kind === 'golem' || (t.kind === 'boss2' && t.shieldUp)) && t.shieldBrokenTimer <= 0) {
        t.shieldBrokenTimer = 2.6;
        if (t.kind === 'boss2') t.shieldUp = false;
        audio.playShieldBreak();
        spawnFloatText(tx, t.y - 26, '钟鸣震盾！', COLORS.cyanBright, 19, 0.95);
      }
      damageEnemyHP(t, dmg, true);
      addPostureToEnemy(t, posDmg);
      rallyPlayerGrayHp(14);
      spawnHitMark(tx, ty, -Math.PI * 0.5, COLORS.cyanBright, 96, 8);
      if (!t.isBoss && t.state !== 'stagger') {
        t.vx = (tx >= px ? 1 : -1) * 210;
        if (t.kind !== 'wraith') t.vy = Math.min(t.vy, -180);
      }
    }
  }

  // Disperse enemy projectiles inside radius or pillar
  for (const pr of G.projectiles) {
    if (pr.owner !== 'enemy' || pr.life <= 0) continue;
    const oBox = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
    if (Math.hypot(pr.x - px, pr.y - py) <= radius + pr.r || aabbOverlap(pillarBox, oBox)) {
      pr.life = 0;
      spawnParticles(pr.x, pr.y, 12, { color: COLORS.cyanBright, speed: 200, spark: true });
    }
  }

  // Crack nearby secret walls
  if (G.worldState) {
    for (const w of G.worldState.secretWalls) {
      if (w.broken) continue;
      if (Math.hypot((w.x + w.w / 2) - px, (w.y + w.h / 2) - py) <= radius + 24 || aabbOverlap(pillarBox, w)) {
        damageSecretWall(w, 2);
      }
    }
  }

  // Ring nearby Hanging Lanterns (triggers Lantern Resonance & quells Boss tides!)
  for (const l of G.lanterns) {
    const lx = l.x + Math.sin(l.angle) * l.len;
    const ly = l.anchorY + Math.cos(l.angle) * l.len;
    if (Math.hypot(lx - px, ly - py) <= radius + 35 || (Math.abs(lx - px) <= radius * 0.65 && ly <= py && ly >= py - radius * 1.5)) {
      l.angVel += (lx >= px ? 1 : -1) * 7.5;
      l.ringFlash = 0.55;
      audio.playPogoLantern();
      spawnShockwave(lx, ly, 140, COLORS.goldBright, 3.8, 0.3);
      tryQuellChapelTideByLantern(l, lx, ly);
    }
  }

  // Ring all Resonance Puzzle Bells inside radius or overhead sonic pillar!
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      for (const b of pz.bells) {
        const inRange = Math.hypot(b.x - px, b.y - py) <= radius + 42 || (Math.abs(b.x - px) <= radius * 0.72 && b.y <= py + 24 && b.y >= py - radius * 1.55);
        if (inRange) ringResonanceBell(pz, b, b.x >= px ? 1 : -1);
      }
    }
  }
}

// Synergy 「幽鸣共振」(幽丝断钟 + 回响钟舌): Free mini Bell-Quake on grapple arrival!
export function triggerMiniBellQuake(cx, cy) {
  const rs = getRelicStats();
  const radius = Math.round(132 * rs.spellRadiusMult);
  const dmg = Math.round(26 * rs.spellDmgMult);
  const posDmg = Math.round(24 + rs.spellPostureBonus * 0.5);

  audio.playBellQuake();
  triggerHaptic('heavyHit', 0.95);
  addShake(9);
  punchZoom(1.03);
  G.bellQuakes.push({ x: cx, y: cy, radius: radius * 0.85, life: 0.34, maxLife: 0.34 });
  spawnShockwave(cx, cy, radius, COLORS.cyanBright, 3.8, 0.28);
  spawnShockwave(cx, cy, radius * 0.6, COLORS.goldBright, 2.6, 0.22);
  spawnParticles(cx, cy, 20, { color: COLORS.cyanBright, speed: 240, spark: true, grav: -40, life: 0.35 });
  spawnFloatText(cx, cy - 42, '羁绊 · 幽鸣共振！', COLORS.cyanBright, 19, 0.95);

  for (const t of getLivingFoes()) {
    const tx = t.x + t.w / 2;
    const ty = t.y + t.h * 0.45;
    if (Math.hypot(tx - cx, ty - cy) <= radius + Math.max(t.w, t.h) * 0.35) {
      if ((t.kind === 'golem' || (t.kind === 'boss2' && t.shieldUp)) && t.shieldBrokenTimer <= 0) {
        t.shieldBrokenTimer = 2.4;
        if (t.kind === 'boss2') t.shieldUp = false;
        audio.playShieldBreak();
      }
      damageEnemyHP(t, dmg, true);
      addPostureToEnemy(t, posDmg);
    }
  }
  for (const pr of G.projectiles) {
    if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - cx, pr.y - cy) <= radius + pr.r) {
      pr.life = 0;
      spawnParticles(pr.x, pr.y, 10, { color: COLORS.cyanBright, speed: 180, spark: true });
    }
  }
  for (const l of G.lanterns) {
    const lx = l.x + Math.sin(l.angle) * l.len;
    const ly = l.anchorY + Math.cos(l.angle) * l.len;
    if (Math.hypot(lx - cx, ly - cy) <= radius + 30) {
      l.angVel += (lx >= cx ? 1 : -1) * 6.5;
      l.ringFlash = 0.48;
      tryQuellChapelTideByLantern(l, lx, ly);
    }
  }
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      for (const b of pz.bells) {
        if (Math.hypot(b.x - cx, b.y - cy) <= radius + 36) ringResonanceBell(pz, b, b.x >= cx ? 1 : -1);
      }
    }
  }
}

export function collectPickup(p) {
  if (!G.worldState || p.collected || !isPickupUnlocked(p)) return;
  p.collected = true;
  audio.playHeal();
  audio.playBellToll();
  addShake(7);
  G.screenFlash = { alpha: 0.18, color: p.kind === 'flaskCore' ? COLORS.cyanBright : COLORS.goldBright };
  spawnShockwave(p.x, p.y - 26, 95, p.kind === 'flaskCore' ? COLORS.cyanBright : COLORS.goldBright, 4, 0.38);
  spawnParticles(p.x, p.y - 26, 28, { color: p.kind === 'flaskCore' ? COLORS.cyanBright : COLORS.goldBright, speed: 220, spark: true, life: 0.65 });

  if (p.bonusHp) {
    G.worldState.bonusMaxHp = (G.worldState.bonusMaxHp || 0) + p.bonusHp;
    G.player.maxHp = getPlayerMaxHp();
    G.player.hp = G.player.maxHp;
  }
  if (p.bonusSoul) {
    G.worldState.bonusMaxSoul = (G.worldState.bonusMaxSoul || 0) + p.bonusSoul;
    G.player.maxSoul = getPlayerMaxSoul();
    G.player.soul = G.player.maxSoul;
  }

  if (p.kind === 'flaskCore') {
    G.worldState.bonusFlasks++;
    G.player.maxFlasks = getPlayerMaxFlasks();
    G.player.flasks = G.player.maxFlasks;
    spawnFloatText(p.x, p.y - 54, `${p.name} · ${p.desc}`, COLORS.cyanBright, 20, 1.7);
  } else if (p.kind === 'ability') {
    G.worldState.abilities[p.abilityId] = true;
    G.player.airJumpsLeft = 1;
    audio.playWingJump();
    punchZoom(1.045);
    spawnShockwave(p.x, p.y - 26, 150, COLORS.cyanBright, 5, 0.48);
    spawnFloatText(p.x, p.y - 58, `${p.name} · 二段跳已解锁！`, COLORS.cyanBright, 22, 2.2);
  } else if (p.kind === 'echoCache') {
    const amt = Number(p.echoAmount) || 180;
    G.worldState.echoes = (G.worldState.echoes || 0) + amt;
    spawnFloatText(p.x, p.y - 54, `${p.name} · +${amt} 残响！`, COLORS.goldBright, 21, 1.9);
  } else if (p.kind === 'relic') {
    G.worldState.unlockedRelics.add(p.relicId);
    spawnFloatText(p.x, p.y - 54, `${p.name} · ${p.desc}`, COLORS.goldBright, 20, 1.95);
  }
  G.minimapDirty = true;
  hooks.saveProgress(true);
  hooks.syncHUD(true);
}
