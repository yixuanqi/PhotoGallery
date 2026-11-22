// Combat resolution: 3-tier parry, posture break, executions, active hitboxes & pickups
import {
  COLORS, GRAPPLE_ANCHORS, PENDULUMS, VOID_BARRIERS, ABYSSAL_RIVERS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, ENEMY_ECHO_REWARDS, DUMMY_MODES
} from './config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, isWorldPosExplored, getRelicStats, getActiveVowStats, getCombatScaling, getBladeDamageMult, getSmithPostureMult,
  getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  getBossBonusDamageMult, hasKeeperBlessing,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks,
  scheduleOutcome, addShake, kickCamera, punchZoom, triggerBossBanner, triggerHitstop
} from './state.js';
import { getRoomAt } from './levelLoader.js';
import { audio } from './audio.js';
import { triggerHaptic, getActionKeyLabel, isActionHeld } from './input.js';
import {
  spawnParticles, spawnShockwave, spawnImpactBurst, spawnHitMark, spawnFloatText
} from './vfx.js';
import { aabbOverlap, hasLineOfSight, getGroundSurfaceY } from './physics.js';
import { recordBestiaryEvent, checkAchievements } from './codex.js';
import { t, isEn, locDummyMode, locPickup, locPuzzleName } from './i18n.js';
import { WEAPON_ORDER, normalizeWeaponId, getWeaponById, getWeaponMoveDef } from './weapons.js';

// Three-Weapon Archetype Equip, Unlock Gate & Switch Strike (切刃派生技)
export function equipWeapon(weaponId, silent = false) {
  if (!G.worldState) return false;
  const norm = normalizeWeaponId(weaponId);
  if (!isWeaponUnlocked(norm)) return false;
  const w = getWeaponById(norm);
  if (!w) return false;
  if (getActiveWeaponId() === w.id) return false;
  let triggerSwitchStrike = false;
  if (G.player && !silent) {
    if (G.player.weaponSwapCd > 0 || G.player.execTimer > 0 || G.player.hp <= 0 || G.player.healTimer > 0 || G.player.grappleState !== 'none') return false;
    triggerSwitchStrike = G.player.switchStrikeWindow > 0 && G.player.hurtTimer <= 0;
    G.player.switchStrikeWindow = 0;
    G.player.weaponSwapCd = triggerSwitchStrike ? 0.34 : 0.22;
    G.player.comboStep = 0;
    G.player.comboResetTimer = 0;
    G.player.isCharging = false;
    G.player.chargeTime = 0;
    G.player.chargeReadyPlayed = false;
    G.player.activeAttack = null;
    G.player.attackTimer = 0;
    G.player.attackCd = 0;
    G.player.shieldArmorTimer = 0;
  }
  G.worldState.equippedWeapon = w.id;
  if (!silent && G.player) {
    const px = G.player.x + G.player.w * 0.5;
    const py = G.player.y + 24;
    audio.playWeaponSwap(w.id);
    spawnShockwave(px, py, triggerSwitchStrike ? 66 : 44, w.color, triggerSwitchStrike ? 3.2 : 2.4, 0.24);
    spawnParticles(px, py, triggerSwitchStrike ? 18 : 12, { color: w.color, speed: triggerSwitchStrike ? 220 : 170, spark: true, life: 0.32 });
    if (triggerSwitchStrike) {
      triggerPlayerAttack('switch');
    } else {
      spawnFloatText(px, G.player.y - 34, t('combat.weaponSwap', isEn() ? w.nameEn : w.name), w.color, 18, 0.95);
    }
  }
  G.saveDirtyTimer = Math.min(G.saveDirtyTimer > 0 ? G.saveDirtyTimer : 2.0, 2.0);
  hooks.syncHUD(true);
  return true;
}

export function cycleWeapon(step = 1) {
  const unlocked = getUnlockedWeaponIds();
  if (unlocked.length <= 1) return false;
  const cur = getActiveWeaponId();
  const idx = Math.max(0, unlocked.indexOf(cur));
  const next = unlocked[(idx + step + unlocked.length) % unlocked.length];
  return equipWeapon(next, false);
}

// Soulslike Corpse-Run: Drop held Echoes as a retrievable spectral Lantern Shade on death
export function dropPlayerEchoesOnDeath(fromRiver = false) {
  if (!G.worldState || G.echoSession || !G.player) return;
  const hadOld = !!(G.worldState.lostEchoes && G.worldState.lostEchoes.amount > 0);
  const oldAmt = hadOld ? G.worldState.lostEchoes.amount : 0;
  const held = Math.max(0, Math.floor(G.worldState.echoes || 0));
  if (held > 0) {
    const rawX = G.player.x + G.player.w * 0.5;
    const rawY = G.player.y + G.player.h;
    const overRiver = fromRiver || ABYSSAL_RIVERS.some(rv => rv.w > 0 && rawX >= rv.x - 6 && rawX <= rv.x + rv.w + 6 && rawY >= rv.y - 40);
    const dropX = overRiver ? (G.player.lastSafeX + G.player.w * 0.5) : rawX;
    const baseFootY = overRiver ? (G.player.lastSafeY + G.player.h) : rawY;
    const surfY = getGroundSurfaceY(dropX, baseFootY - 12);
    const dropY = Math.min(baseFootY, surfY) - 34;
    const rm = getRoomAt(dropX, dropY);
    G.worldState.lostEchoes = {
      amount: held,
      x: Math.round(dropX),
      y: Math.round(dropY),
      roomId: rm ? rm.id : 'r01_sanctuary'
    };
    G.worldState.echoes = 0;
    G.worldState.lastDeathEchoMsg = hadOld
      ? t('combat.echoDropReplace', oldAmt, held)
      : t('combat.echoDropFresh', held);
    spawnShockwave(dropX, dropY, 82, COLORS.cyanBright, 3.6, 0.42);
    spawnFloatText(dropX, dropY - 26, t('combat.echoDropFloat', held), COLORS.cyanBright, 18, 1.35);
  } else if (hadOld) {
    G.worldState.lostEchoes = null;
    G.worldState.lastDeathEchoMsg = t('combat.echoLostPermanent', oldAmt);
  } else {
    G.worldState.lastDeathEchoMsg = '';
  }
  G.minimapDirty = true;
  hooks.saveProgress(false);
  hooks.syncHUD(true);
}

export function reclaimLostEchoes() {
  if (!G.worldState || !G.worldState.lostEchoes || G.echoSession) return false;
  const lost = G.worldState.lostEchoes;
  const amt = Math.max(0, Math.floor(lost.amount || 0));
  G.worldState.lostEchoes = null;
  G.worldState.lastDeathEchoMsg = '';
  if (amt > 0) {
    G.worldState.echoes = (G.worldState.echoes || 0) + amt;
    audio.playEchoReclaim();
    triggerHaptic('shieldBreak', 0.72);
    addShake(7);
    G.screenFlash = { alpha: 0.16, color: COLORS.cyanBright };
    spawnShockwave(lost.x, lost.y, 115, COLORS.cyanBright, 4.2, 0.36);
    spawnShockwave(lost.x, lost.y, 76, COLORS.goldBright, 2.8, 0.28);
    spawnParticles(lost.x, lost.y, 28, { color: COLORS.cyanBright, speed: 250, spark: true, life: 0.55 });
    spawnParticles(lost.x, lost.y, 16, { color: COLORS.goldBright, speed: 200, spark: true, life: 0.45 });
    spawnFloatText(lost.x, lost.y - 34, t('combat.echoReclaimed', amt), COLORS.goldBright, 22, 1.55);
  }
  G.minimapDirty = true;
  hooks.saveProgress(true);
  hooks.syncHUD(true);
  return true;
}

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
      spawnFloatText(a.x + a.w / 2, a.y - 24, t('combat.wardBroken'), COLORS.goldBright, 16, 0.85);
    }
  }
}

export function damageEnemyHP(enemy, amount, showNum = true) {
  if (!enemy || !enemy.alive) return;
  if (enemy.kind) recordBestiaryEvent(enemy.kind, 'seen');
  let finalAmt = enemy.isBoss ? Math.round(amount * getBossBonusDamageMult()) : amount;
  if (enemy.isBoss && enemy.state === 'phaseShift') {
    finalAmt = Math.max(2, Math.round(finalAmt * 0.35));
  }
  if (enemy.wardShield > 0) {
    finalAmt = Math.max(2, Math.round(amount * 0.35));
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, 6, { color: COLORS.goldBright, speed: 140, spark: true, life: 0.25 });
  }
  if (enemy.kind === 'priest' && enemy.state === 'chant') {
    enemy.state = 'recover';
    enemy.stateTimer = 0.7;
    enemy.chantTargetId = null;
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 34, t('combat.chantBreak'), COLORS.cyanBright, 17, 0.85);
  }
  if (enemy.isDummy) {
    enemy.bellShake = 0.32;
    enemy.idleResetTimer = 0;
    const modeObj = DUMMY_MODES[enemy.modeIdx] || DUMMY_MODES[0];
    if (!enemy.active && modeObj.id !== 'dormant') {
      enemy.active = true;
      enemy.state = 'stalk';
      enemy.stateTimer = 0.55;
      audio.playResonanceBell(440, false);
      spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 34, t('combat.dummyStart', locDummyMode(modeObj, 'label')), COLORS.cyanBright, 17, 1.15);
    }
  }
  enemy.hp = Math.max(0, enemy.hp - finalAmt);
  enemy.hurtFlash = 0.13;
  if (showNum) {
    const numCol = enemy.wardShield > 0 ? COLORS.goldBright : COLORS.parchment;
    const txt = enemy.wardShield > 0 ? t('combat.shieldTag', Math.round(finalAmt)) : `${Math.round(finalAmt)}`;
    spawnFloatText(enemy.x + enemy.w / 2 + (Math.random() - 0.5) * 20, enemy.y - 10, txt, numCol, 15, 0.55);
  }
  if (enemy.hp <= 0) {
    if (enemy.isDummy) {
      enemy.hp = enemy.maxHp;
      audio.playResonanceBell(523.25, true);
      spawnShockwave(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, 78, COLORS.goldBright, 3.2, 0.28);
      spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 32, t('combat.dummyReset'), COLORS.goldBright, 17, 1.0);
    } else {
      killEnemy(enemy);
    }
  }
}

export function addPostureToEnemy(enemy, amount) {
  if (!enemy || !enemy.alive || enemy.state === 'stagger' || enemy.state === 'phaseShift') return;
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
    triggerHitstop(0.065);
    addShake(11);
    spawnShockwave(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, 115, COLORS.goldBright, 4.5, 0.35);
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 26, t('combat.staggerPrompt', getActionKeyLabel('attack')), COLORS.goldBright, 19, 1.4);
  }
}

export function killEnemy(enemy) {
  enemy.alive = false;
  if (enemy.kind && !enemy.isDummy) recordBestiaryEvent(enemy.kind, 'kill');
  if (enemy.kind === 'priest') clearPriestWards();
  if (G.worldState && !G.echoSession && !enemy.isDummy) {
    const baseReward = ENEMY_ECHO_REWARDS[enemy.kind] || 30;
    const reward = Math.round(baseReward * getCombatScaling(false).echoMult);
    G.worldState.echoes = (G.worldState.echoes || 0) + reward;
    G.saveDirtyTimer = Math.min(G.saveDirtyTimer > 0 ? G.saveDirtyTimer : 2.5, 2.5);
    spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 24, t('combat.echoGain', reward), COLORS.goldBright, 16, 1.05);
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
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.rushStage1'), COLORS.cyanBright, 22, 1.5);
        scheduleOutcome(hooks.advanceEchoRushStage2, 1250, true);
      } else if (G.echoSession.mode === 'rush' && G.echoSession.stage === 1) {
        G.echoSession.stage = 2;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.rushStage2'), COLORS.goldBright, 22, 1.5);
        scheduleOutcome(hooks.advanceEchoRushStage3, 1250, true);
      } else {
        scheduleOutcome(() => hooks.showVictory(enemy.id), 1100, true);
      }
      return;
    }
    if (enemy.id === 'boss_hui') {
      if (G.worldState) {
        G.worldState.bossDefeated = true;
        G.minimapDirty = true;
        checkAchievements();
        hooks.saveProgress(false);
      }
      spawnFloatText(CHAPEL_EXIT_GATE_DEF.x, CHAPEL_EXIT_GATE_DEF.y - 34, t('combat.gateChapelOpen'), COLORS.cyanBright, 20, 2.0);
      scheduleOutcome(() => hooks.showVictory('boss_hui'), 1100, true);
    } else if (enemy.id === 'boss_ji') {
      if (G.worldState) {
        G.worldState.boss2Defeated = true;
        G.minimapDirty = true;
        checkAchievements();
        hooks.saveProgress(false);
      }
      spawnFloatText(FOUNDRY_EXIT_GATE_DEF.x, FOUNDRY_EXIT_GATE_DEF.y - 34, t('combat.gateFoundryOpen'), COLORS.goldBright, 21, 2.2);
      scheduleOutcome(() => hooks.showVictory('boss_ji'), 1200, true);
    } else if (enemy.id === 'boss_yuan') {
      if (G.worldState) {
        G.worldState.boss3Defeated = true;
        G.minimapDirty = true;
        checkAchievements();
        hooks.saveProgress(true);
      }
      spawnShockwave(FIRST_BELL_CORE_POS.x, FIRST_BELL_CORE_POS.y - 54, 240, COLORS.goldBright, 5.2, 0.65);
      triggerBossBanner(t('combat.yuanDefeatedTitle'), t('combat.yuanDefeatedQuote'), COLORS.goldBright, 3.2);
      scheduleOutcome(() => hooks.openEndingChoice(), 2100, true);
    }
  }
}

function tryTriggerKeeperBlessingSave() {
  if (!G.player || !hasKeeperBlessing()) return false;
  G.worldState.npcQuests.keeperBlessingActive = false;
  const saveHp = Math.max(18, Math.round(G.player.maxHp * 0.22));
  G.player.hp = saveHp;
  G.player.grayHp = 0;
  G.player.iframeTimer = 1.15;
  G.player.hurtTimer = 0.14;
  G.player.vy = -180;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  audio.playEndingChord(true, 1);
  audio.playBellQuake();
  triggerHaptic('execution', 0.9);
  triggerHitstop(0.065, true);
  addShake(13);
  G.screenFlash = { alpha: 0.30, color: COLORS.cyanBright };
  spawnShockwave(px, py, 165, COLORS.cyanBright, 5.0, 0.42);
  spawnShockwave(px, py, 110, COLORS.goldBright, 3.6, 0.32);
  spawnParticles(px, py, 32, { color: COLORS.cyanBright, speed: 280, spark: true, life: 0.55 });
  spawnParticles(px, py, 18, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.48 });
  spawnFloatText(px, G.player.y - 38, t('combat.blessingSave'), COLORS.goldBright, 22, 1.55);
  for (const foe of getLivingFoes()) {
    const dx = (foe.x + foe.w * 0.5) - px;
    if (Math.hypot(dx, (foe.y + foe.h * 0.5) - py) < 175 && !foe.isBoss) {
      foe.vx = (dx >= 0 ? 1 : -1) * 280;
      addPostureToEnemy(foe, 26);
    }
  }
  hooks.saveProgress(false);
  hooks.syncHUD(true);
  return true;
}

export function applyIncomingAttackToPlayer(attacker, damage, isUnparryable, knockback = 240) {
  if (G.player.hp <= 0 || G.player.execTimer > 0) return;

  // 1. Invincibility Frames (Ink Dash / Grapple Pull / Hurt I-frames)
  if (G.player.iframeTimer > 0) {
    if (isUnparryable && G.player.dashTimer > 0) {
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 22, t('combat.evade'), COLORS.cyanBright, 17, 0.7);
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 15);
    }
    return;
  }

  const dir = attacker.x + attacker.w / 2 < G.player.x + G.player.w / 2 ? 1 : -1;

  const isDummyHit = !!(attacker && attacker.isDummy);
  const vowStats = getActiveVowStats();
  // Assist Mode + NG+ & Vow Constraint incoming damage scaling (Dummy stays gentle & non-lethal!)
  const assistMult = (G.settings && typeof G.settings.damageTakenMult === 'number') ? G.settings.damageTakenMult : 1.0;
  const combatDmgMult = isDummyHit ? 1.0 : getCombatScaling().dmgMult;
  const scaledDamage = Math.max(1, Math.round(damage * assistMult * combatDmgMult));

  // 2. Three-Tier Parry Check (only if attack is parryable)
  const rs = getRelicStats();
  if (G.player.parryActive && !isUnparryable) {
    if (G.player.parryElapsedMs <= rs.parryWindowMs) {
      // TIER 1: PERFECT PARRY (0 - 140ms * assist) — Sekiro / Nine Sols Clash Juice!
      G.stats.parries++;
      if (G.echoSession) G.echoSession.parries++;
      G.player.parryStreak = G.player.parryStreakTimer > 0 ? Math.min(9, G.player.parryStreak + 1) : 1;
      G.player.parryStreakTimer = 2.6;
      if (attacker && attacker.kind) recordBestiaryEvent(attacker.kind, 'parry');
      checkAchievements({ parryStreak: G.player.parryStreak });
      const streakScale = 1 + Math.min(3, G.player.parryStreak - 1) * 0.14;

      // Auto-face incoming attacker so follow-up [K -> J] Cross Counter always lands cleanly
      G.player.facing = -dir;

      const isBossMultiHit = !!(attacker && attacker.isBoss && attacker.comboTotal > 1);
      const isComboFinisher = isBossMultiHit && attacker.comboIdx >= attacker.comboTotal - 1;
      const isRapidMidHit = isBossMultiHit && !isComboFinisher;

      audio.playParry(true, G.player.parryStreak);
      if (isComboFinisher) audio.playFinisherDeflect();
      triggerHaptic(isComboFinisher ? 'shieldBreak' : 'parry', isComboFinisher ? 1.15 : (0.9 + Math.min(0.45, (G.player.parryStreak - 1) * 0.12)));
      // Snappy hitstop during rapid chain parries, thunderous impact on the final deflect
      triggerHitstop(isComboFinisher ? 0.060 : (isRapidMidHit ? 0.036 : 0.046));
      addShake(isComboFinisher ? 13 : (9 + Math.min(4, G.player.parryStreak)));
      kickCamera(dir * (isComboFinisher ? 11 : 7), isComboFinisher ? -4 : -2.5);
      punchZoom(isComboFinisher ? 1.056 : (1.040 + Math.min(0.016, (G.player.parryStreak - 1) * 0.004)));
      G.screenFlash = { alpha: isComboFinisher ? 0.30 : 0.22, color: COLORS.goldBright };
      G.player.parryActive = false;
      G.player.parryCooldown = isRapidMidHit ? 0.02 : 0.03;
      G.player.riposteWindow = isComboFinisher ? 0.68 : 0.56; // Opens K -> J Cross Counter Slash!
      G.player.switchStrikeWindow = 0.56; // Also opens K -> 1/2/3/X Switch Strike!
      // Tighter brace slide during multi-hit Boss combos keeps both fighters in sweet-spot range
      G.player.vx = dir * (isBossMultiHit ? 92 : 135);
      G.player.squashX = 0.82;
      G.player.squashY = 1.22;

      if (G.player.seals < G.player.maxSeals) G.player.seals++;
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round((isComboFinisher ? 36 : 28) * rs.soulGainMult));
      if (rs.parryHeal) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + rs.parryHeal);
      }
      if (attacker && (attacker.kind === 'golem' || attacker.kind === 'boss2' || attacker.kind === 'dummy')) {
        attacker.shieldBrokenTimer = Math.max(attacker.shieldBrokenTimer || 0, 2.4);
        if (attacker.kind === 'boss2' || attacker.kind === 'dummy') attacker.shieldUp = false;
      }

      const finisherBonus = isComboFinisher ? (attacker.comboTotal >= 5 ? 26 : 20) : 0;
      const posDmg = ((attacker.isBoss ? 26 : 36) + finisherBonus) * rs.parryPostureMult;
      if (attacker.hp !== undefined) {
        if (isComboFinisher) attacker.finisherParried = true;
        addPostureToEnemy(attacker, posDmg);
        if (rs.parryReflectDmg > 0) {
          damageEnemyHP(attacker, rs.parryReflectDmg, true);
        }
        // Duelist keeps swinging through its 3-hit parry rhythm; other regular foes recoil into recover
        if (!attacker.isBoss && attacker.state !== 'stagger') {
          if ((attacker.kind === 'duelist' && attacker.attackKind === 'combo3' && attacker.comboIdx < 2) ||
              (attacker.isDummy && attacker.attackKind === 'combo2' && attacker.comboIdx < 1)) {
            attacker.vx = -dir * 70;
          } else {
            attacker.state = 'recover';
            attacker.stateTimer = 0.65;
            attacker.vx = -dir * 160;
          }
        } else if (attacker.isBoss && (attacker.moveKind === 'chargeThrust' || attacker.moveKind === 'bellShieldCharge' || attacker.moveKind === 'eclipseThrust' || attacker.moveKind === 'shadowCloneStrike') && attacker.state !== 'stagger') {
          attacker.state = 'recover';
          attacker.stateTimer = 1.05;
          attacker.vx = -dir * 140;
          if (attacker.kind === 'boss2') {
            audio.playShieldBreak();
            spawnFloatText(attacker.x + attacker.w / 2, attacker.y - 30, t('combat.bellShieldBreak'), COLORS.goldBright, 20, 0.95);
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
        spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 48, t('combat.synMirrorEmber'), COLORS.crimsonBright, 17, 1.15);
      }

      const label = isComboFinisher
        ? t('combat.parryFinisher', G.player.parryStreak)
        : G.player.parryStreak >= 4
          ? t('combat.parryStreak4', G.player.parryStreak)
          : G.player.parryStreak >= 2
            ? t('combat.parryStreak', G.player.parryStreak)
            : t('combat.parryPerfect');
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 26, label, COLORS.goldBright, G.player.parryStreak >= 2 ? 22 : 20, 0.85);
      return;
    } else if (G.player.parryElapsedMs <= rs.blockWindowMs) {
      // TIER 2: PARTIAL BLOCK -> INTERNAL GRAY HP (Rally recoverable!)
      G.player.facing = -dir;
      G.player.parryStreak = 0;
      G.player.parryStreakTimer = 0;
      audio.playParry(false);
      triggerHaptic('block');
      triggerHitstop(0.036);
      addShake(5.5);
      kickCamera(dir * 6, 0);
      G.player.parryActive = false;
      G.player.vx = dir * 210;
      G.player.squashX = 0.86;
      G.player.squashY = 1.14;
      const bx = G.player.x + G.player.w / 2 + G.player.facing * 16;
      const by = G.player.y + 24;
      const chipMult = rs.blockChipMult || 1.0;
      if (vowStats.noGrayBlock && !isDummyHit) {
        // Vow「无暇之誓」: No gray-HP rally cushion on mistimed block — real chip scaled by weapon guard!
        const realChip = Math.max(1, Math.round(scaledDamage * 0.75 * chipMult));
        G.player.hp = Math.max(0, G.player.hp - realChip);
        G.stats.damageTaken += realChip;
        if (G.echoSession) G.echoSession.damageTaken += realChip;
        spawnImpactBurst(bx, by, 'block', 1.0);
        spawnShockwave(bx, by, 52, COLORS.crimsonBright, 2.8, 0.22);
        spawnParticles(bx, by, 14, { color: COLORS.crimsonBright, speed: 220, spark: true, bounce: true, grav: 520 });
        spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 22, t('combat.vowNoGray', realChip), COLORS.crimsonBright, 17, 0.78);
        if (G.player.hp <= 0) {
          if (tryTriggerKeeperBlessingSave()) return;
          G.player.hp = 0;
          G.player.deathTimer = 0.65;
          G.player.vx = dir * 90;
          G.player.vy = -120;
          dropPlayerEchoesOnDeath(false);
          scheduleOutcome(hooks.showDeath, 650, false);
        }
        return;
      }
      const floorHp = isDummyHit ? Math.max(15, Math.round(G.player.maxHp * 0.25)) : 1;
      const chip = Math.max(0, Math.min(G.player.hp - floorHp, Math.round(scaledDamage * 0.62 * chipMult)));
      if (chip > 0) {
        G.player.hp -= chip;
        G.player.grayHp = Math.min(G.player.maxHp - G.player.hp, G.player.grayHp + chip);
        G.player.grayTimer = rs.grayDuration;
        if (isDummyHit) attacker.hitPlayerDuringDrill = true;
        else {
          G.stats.damageTaken += chip;
          if (G.echoSession) G.echoSession.damageTaken += chip;
        }
      }
      spawnImpactBurst(bx, by, 'block', 0.9);
      spawnShockwave(bx, by, 44, COLORS.cyanBright, 2.4, 0.18);
      spawnParticles(bx, by, 12, { color: COLORS.cyanBright, speed: 210, spark: true, bounce: true, grav: 520 });
      spawnParticles(bx, by, 7, { color: '#94a3b8', speed: 120, grav: -60, size: 3.6, life: 0.35 });
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 20, t('combat.blockGray'), '#cbd5e1', 16, 0.7);
      return;
    }
    // TIER 3 (>260ms): Recovery Guard Break -> falls through to full hit!
    spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 34, t('combat.guardBreak'), COLORS.crimsonBright, 16, 0.7);
  } else if (G.player.parryActive && isUnparryable) {
    spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 34, t('combat.perilBreak'), COLORS.crimsonBright, 18, 0.75);
  }

  // Shield Bash / Shield Charge Armored Guard (reduces damage & resists knockback/cancel on parryable hits!)
  if (G.player.shieldArmorTimer > 0 && !isUnparryable) {
    const armDmg = Math.max(1, Math.round(scaledDamage * (G.player.shieldArmorMult || 0.5)));
    audio.playParry(false);
    triggerHaptic('block', 0.85);
    addShake(6);
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.28);
    if (isDummyHit) {
      attacker.hitPlayerDuringDrill = true;
      const minTrainHp = Math.max(15, Math.round(G.player.maxHp * 0.25));
      G.player.hp = Math.max(minTrainHp, G.player.hp - armDmg);
    } else {
      G.player.hp = Math.max(0, G.player.hp - armDmg);
      G.stats.damageTaken += armDmg;
      if (G.echoSession) G.echoSession.damageTaken += armDmg;
    }
    spawnImpactBurst(G.player.x + G.player.w / 2 + G.player.facing * 16, G.player.y + 24, 'block', 1.05);
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 14, { color: COLORS.goldBright, speed: 220, spark: true, life: 0.34 });
    spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 24, t('combat.shieldArmor', armDmg), COLORS.goldBright, 17, 0.75);
    if (G.player.hp <= 0) {
      if (tryTriggerKeeperBlessingSave()) return;
      G.player.hp = 0;
      G.player.deathTimer = 0.65;
      G.player.vx = dir * 90;
      G.player.vy = -120;
      dropPlayerEchoesOnDeath(false);
      scheduleOutcome(hooks.showDeath, 650, false);
    }
    return;
  }

  // Full Hit
  audio.playHit(true);
  triggerHaptic('hurt');
  triggerHitstop(0.05);
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
  if (isDummyHit) {
    attacker.hitPlayerDuringDrill = true;
    const minTrainHp = Math.max(15, Math.round(G.player.maxHp * 0.25));
    G.player.hp = Math.max(minTrainHp, G.player.hp - scaledDamage);
  } else {
    G.player.hp = Math.max(0, G.player.hp - scaledDamage);
    G.stats.damageTaken += scaledDamage;
    if (G.echoSession) G.echoSession.damageTaken += scaledDamage;
  }
  G.player.vx = dir * knockback;
  G.player.vy = -240;

  spawnParticles(G.player.x + G.player.w / 2, G.player.y + 26, 20, { color: COLORS.crimsonBright, speed: 260, life: 0.45 });
  spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 14, isDummyHit ? t('combat.dummyHit', scaledDamage) : `-${scaledDamage}`, COLORS.crimsonBright, isDummyHit ? 17 : 20, 0.8);

  if (G.player.hp <= 0) {
    if (tryTriggerKeeperBlessingSave()) return;
    G.player.hp = 0;
    G.player.deathTimer = 0.65;
    G.player.vx = dir * 90;
    G.player.vy = -120;
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 24, { color: COLORS.ink, speed: 180, grav: 120, life: 0.65 });
    spawnParticles(G.player.x + G.player.w / 2, G.player.y + 24, 14, { color: COLORS.cyanBright, speed: 140, grav: -110, life: 0.6 });
    dropPlayerEchoesOnDeath(false);
    scheduleOutcome(hooks.showDeath, 650, false);
  }
}

/* =========================================================================
   9. PLAYER UPDATE (MOVEMENT, EXPANDED SWORD KIT, SPELL & GRAPPLE)
   ========================================================================= */
export function findBestGrappleTarget() {
  if (!G.player) return null;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + 22;
  const activeBoss = getAwakeBoss();
  const playerRoom = getRoomAt(px, py);

  // Build smooth directional aim intent from WASD / Stick (defaults to forward + slightly upward)
  const inX = (isActionHeld('right') ? 1 : 0) - (isActionHeld('left') ? 1 : 0);
  const inY = (isActionHeld('down') ? 1 : 0) - (isActionHeld('up') ? 1 : 0);
  let aimX = inX !== 0 ? inX : (inY !== 0 ? G.player.facing * 0.35 : G.player.facing);
  let aimY = inY !== 0 ? inY : -0.32;
  const aimLen = Math.hypot(aimX, aimY) || 1;
  aimX /= aimLen;
  aimY /= aimLen;

  const prevRef = G.grapplePreviewTarget ? G.grapplePreviewTarget.ref : null;
  const recentRef = (G.player.lastGrappleIgnoreTimer > 0) ? G.player.lastGrappleRef : null;
  const holdingDown = inY > 0;

  let best = null;
  let bestScore = Infinity;
  let fallback = null;
  let fallbackScore = Infinity;

  const evalCandidate = (type, ref, x, y, bias, puzzle) => {
    const dx = x - px;
    const dy = y - py;
    // Fast bounding-box pre-cull before sqrt or raycast
    if (dx > 420 || dx < -420 || dy > 420 || dy < -420) return;
    const distSq = dx * dx + dy * dy;
    // Slightly larger min distance (72px) for static points prevents re-hooking the point you are right on top of
    const minDistSq = type === 'enemy' ? 3600 : 5184;
    if (distSq > 176400 || distSq < minDistSq) return;
    if (activeBoss) {
      if (x < activeBoss.arenaMinX || x > activeBoss.arenaMaxX || y < activeBoss.arenaTopY || y > activeBoss.arenaFloorY) return;
    }

    const dist = Math.sqrt(distSq);
    const invD = 1 / dist;
    const align = (dx * aimX + dy * aimY) * invD; // -1 (directly behind) to +1 (dead ahead along aim)

    // Smooth continuous directional cone weight (eliminates abrupt jumps at hard x thresholds)
    let dirMult = 0.64 + (1 - align) * 0.78;
    // Strong extra penalty when player explicitly holds Left/Right and target is behind that direction
    if (inX !== 0 && dx * inX < -28) dirMult *= 1.85;
    // Softly discourage hooking downward when player isn't holding Down (prevents falling back to lower hooks)
    if (!holdingDown && dy > 36 && type !== 'enemy') dirMult *= 1.38;

    let score = dist * dirMult * bias;
    // Sticky hysteresis (24% bonus) keeps reticle rock-steady instead of flickering between two close hooks
    const isRecent = recentRef !== null && ref === recentRef;
    if (prevRef !== null && ref === prevRef && !isRecent) {
      score *= 0.76;
    }

    if (isRecent) {
      if (score >= fallbackScore) return;
    } else {
      if (score >= bestScore) return;
    }

    if (playerRoom && dy > 40) {
      const targetRoom = getRoomAt(x, y);
      if (targetRoom && targetRoom.id !== playerRoom.id && !isWorldPosExplored(x, y)) return;
    }
    if (!hasLineOfSight(px, py, x, y)) return;

    const cand = puzzle ? { type, ref, puzzle, x, y, bias } : { type, ref, x, y, bias };
    if (isRecent) {
      fallbackScore = score;
      fallback = cand;
    } else {
      bestScore = score;
      best = cand;
    }
  };

  for (let i = 0; i < G.lanterns.length; i++) {
    const l = G.lanterns[i];
    if (Math.abs(l.x - px) > 560) continue;
    evalCandidate('lantern', l, l.x + Math.sin(l.angle) * l.len, l.anchorY + Math.cos(l.angle) * l.len, 1.0, null);
  }
  for (let i = 0; i < GRAPPLE_ANCHORS.length; i++) {
    const a = GRAPPLE_ANCHORS[i];
    evalCandidate('anchor', a, a.x, a.y, 0.96, null);
  }
  if (G.resonancePuzzles) {
    for (let i = 0; i < G.resonancePuzzles.length; i++) {
      const pz = G.resonancePuzzles[i];
      for (let j = 0; j < pz.bells.length; j++) {
        const b = pz.bells[j];
        evalCandidate('resBell', b, b.x, b.y, 0.95, pz);
      }
    }
  }
  for (let i = 0; i < G.enemies.length; i++) {
    const f = G.enemies[i];
    if (!f || !f.alive) continue;
    evalCandidate('enemy', f, f.x + f.w * 0.5, f.y + f.h * 0.35, f.kind === 'priest' ? 0.78 : f.kind === 'wraith' ? 0.88 : 1.05, null);
  }
  if (G.boss && G.boss.alive && G.boss.awake) evalCandidate('enemy', G.boss, G.boss.x + G.boss.w * 0.5, G.boss.y + G.boss.h * 0.35, 1.05, null);
  if (G.boss2 && G.boss2.alive && G.boss2.awake) evalCandidate('enemy', G.boss2, G.boss2.x + G.boss2.w * 0.5, G.boss2.y + G.boss2.h * 0.35, 1.05, null);
  if (G.boss3 && G.boss3.alive && G.boss3.awake) evalCandidate('enemy', G.boss3, G.boss3.x + G.boss3.w * 0.5, G.boss3.y + G.boss3.h * 0.35, 1.05, null);

  // Prefer ANY fresh target over the anchor we just vaulted from; only fall back if no other anchor exists!
  return best || fallback;
}

export function performExecution(target) {
  G.stats.executions++;
  if (G.echoSession) G.echoSession.executions++;
  if (target && target.kind) recordBestiaryEvent(target.kind, 'execution');
  checkAchievements({ executed: true });
  audio.playExecution();
  triggerHaptic('execution');
  triggerHitstop(0.085);
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

  const dmg = target.isDummy ? Math.round(target.maxHp * 0.55) : (target.isBoss ? Math.max(128, Math.round(target.maxHp * 0.18)) : 999);
  damageEnemyHP(target, dmg, true);
  target.posture = 0;
  if (target.isDummy) {
    target.hp = target.maxHp;
    target.state = 'recover';
    target.stateTimer = 1.15;
    spawnFloatText(target.x + target.w / 2, target.y - 54, t('combat.dummyExecOk'), COLORS.goldBright, 20, 1.25);
  } else if (target.alive) {
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
  spawnFloatText(cx, target.y - 30, t('combat.execution'), COLORS.crimsonBright, 26, 1.15);
}

export function getPlayerAttackBox(type, weaponId = getActiveWeaponId()) {
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 26;
  const move = getWeaponMoveDef(weaponId, type);
  const b = move.box || { fwd: 82, back: 4, top: 28, h: 54 };
  if (b.radial) {
    const r = b.radial;
    return { x: px - r, y: py - r, w: r * 2, h: r * 2 };
  }
  if (b.pogo) {
    return { x: px - b.w * 0.5, y: G.player.y + G.player.h - 10, w: b.w, h: b.h };
  }
  if (b.up) {
    return { x: px - b.w * 0.5 + G.player.facing * 16, y: G.player.y - (b.h - 22), w: b.w, h: b.h };
  }
  const w = b.fwd + b.back;
  return {
    x: px + (G.player.facing > 0 ? -b.back : -b.fwd),
    y: py - b.top,
    w,
    h: b.h
  };
}

export function evaluatePlayerActiveAttack() {
  const atk = G.player.activeAttack;
  if (!atk) return;
  if (atk.elapsed < atk.activeStart || atk.elapsed > atk.activeEnd) return;

  const px = G.player.x + G.player.w / 2;
  const box = getPlayerAttackBox(atk.type, atk.weaponId);

  // Hit Enemies & Bosses (multi-frame sweep, deduplicated per swing via hitIds)
  const targets = getLivingFoes();
  let hitAny = false;
  for (const foe of targets) {
    if (atk.hitIds.has(foe.id)) continue;
    if (aabbOverlap(box, foe)) {
      atk.hitIds.add(foe.id);
      hitAny = true;
      const stepIdx = atk.type === 'slash3' ? 3 : atk.type === 'slash2' ? 2 : 1;
      audio.playHit(atk.heavy, stepIdx);
      G.player.switchStrikeWindow = 0.44;
      triggerHaptic(atk.type === 'iai' || atk.type === 'counter' ? 'iai' : atk.heavy ? 'heavyHit' : 'lightHit');
      triggerHitstop(atk.type === 'iai' || atk.type === 'counter' ? 0.042 : atk.heavy ? 0.032 : 0.018, true);
      addShake(atk.heavy ? 7.5 : 3.8);
      kickCamera(
        atk.type === 'pogo' ? 0 : G.player.facing * (atk.heavy ? 7.5 : 4.2),
        atk.type === 'pogo' ? 6 : atk.type === 'up' ? -5.5 : 1.5
      );
      if (atk.type === 'iai' || atk.type === 'counter') punchZoom(1.036);
      else if (atk.heavy) punchZoom(1.02);

      // Shielded Bell-Golem & Boss 2 Resonance Bell Shield Check!
      const isGolemShieldUp = ((foe.kind === 'golem' && foe.state !== 'stagger' && foe.shieldBrokenTimer <= 0 &&
        (foe.state === 'patrol' || foe.state === 'chase' || foe.state === 'recover')) ||
        ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp && foe.state !== 'stagger' && foe.shieldBrokenTimer <= 0));
      const hitFromFront = (G.player.x + G.player.w / 2 - (foe.x + foe.w / 2)) * foe.facing > 0;
      const canBreakShield = !!atk.breaksShield || atk.type === 'iai' || atk.type === 'slash3' || atk.type === 'counter';
      const bypassShield = atk.type === 'pogo' || !hitFromFront;

      const rs = getRelicStats();
      let finalDmg = Math.round(atk.dmg * getBladeDamageMult());
      if ((atk.type === 'iai' || atk.type === 'counter') && rs.heavySkillMult > 1) {
        finalDmg = Math.round(finalDmg * rs.heavySkillMult);
      }
      if (foe.kind === 'leech' && (atk.type === 'up' || foe.state === 'cling' || foe.state === 'telegraph' || foe.state === 'drop')) {
        finalDmg = Math.round(finalDmg * 1.45);
        spawnFloatText(foe.x + foe.w / 2, foe.y - 30, t('combat.ambushCut'), COLORS.cyanBright, 16, 0.75);
      }

      if (isGolemShieldUp && !bypassShield) {
        if (canBreakShield) {
          foe.shieldBrokenTimer = 2.6;
          if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
          audio.playShieldBreak();
          triggerHaptic('shieldBreak');
          addShake(9);
          spawnImpactBurst(foe.x + foe.w / 2 + foe.facing * 18, foe.y + 38, 'parry', 0.95);
          spawnFloatText(foe.x + foe.w / 2, foe.y - 26, foe.isDummy ? t('combat.dummyBreakOk') : t('combat.shieldBreak'), COLORS.goldBright, 20, 1.0);
          damageEnemyHP(foe, finalDmg, true);
          addPostureToEnemy(foe, (atk.posture + 24) * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1));
        } else {
          // Light front attack clangs off the bronze greatshield!
          audio.playParry(false);
          triggerHaptic('block');
          spawnImpactBurst(foe.x + foe.w / 2 + foe.facing * 20, foe.y + 38, 'block', 0.85);
          spawnFloatText(foe.x + foe.w / 2, foe.y - 24, t('combat.shieldBlocked'), '#cbd5e1', 15, 0.9);
          damageEnemyHP(foe, Math.max(3, Math.round(finalDmg * 0.2)), true);
          addPostureToEnemy(foe, 4);
          G.player.vx = -G.player.facing * 155;
          continue;
        }
      } else {
        const postureHit = atk.posture * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1);
        damageEnemyHP(foe, finalDmg, true);
        addPostureToEnemy(foe, postureHit);
      }
      // Synergy 「镜烬印记」: free talisman plant on melee strike after 3-streak parry!
      if (G.player.freeSealProc && foe.alive) {
        G.player.freeSealProc = false;
        G.talismans.push({
          target: foe,
          x: foe.x + foe.w / 2,
          y: foe.y + foe.h * 0.4,
          seals: 1,
          timer: 0.85
        });
        audio.playIaiReady();
        spawnFloatText(foe.x + foe.w / 2, foe.y - 34, t('combat.mirrorSealPlant'), COLORS.crimsonBright, 18, 0.85);
      }
      // Synergy 「碎心绝响」(古钟心核 + 碎镜之眼): Counter Slash immediately detonates stuck talismans!
      if (atk.type === 'counter' && rs.synCoreCounter && G.talismans.length > 0) {
        const tx = foe.x + foe.w / 2;
        const ty = foe.y + foe.h * 0.45;
        for (let ti = G.talismans.length - 1; ti >= 0; ti--) {
          const tm = G.talismans[ti];
          if (tm.target === foe || Math.hypot(tm.x - tx, tm.y - ty) < 130) {
            G.talismans.splice(ti, 1);
            audio.playDetonate();
            triggerHaptic('execution', 0.9);
            addShake(13);
            G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
            const rad = 135 + tm.seals * 28;
            spawnShockwave(tx, ty, rad, COLORS.goldBright, 5.2, 0.36);
            spawnParticles(tx, ty, 32, { color: COLORS.goldBright, speed: 340, spark: true, life: 0.5 });
            spawnFloatText(tx, ty - 42, t('combat.synCoreCounter'), COLORS.goldBright, 22, 1.05);
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

      if (!foe.isBoss && foe.state !== 'stagger') {
        foe.vx = G.player.facing * (atk.knockbackVx || (atk.heavy ? 180 : 95));
        if (atk.knockupVy && foe.kind !== 'wraith') foe.vy = Math.min(foe.vy, atk.knockupVy);
      }

      const hx = foe.x + foe.w / 2;
      const hy = foe.y + foe.h * 0.45;
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
      if (atk.shockwaveR) {
        spawnShockwave(hx, hy, atk.shockwaveR, COLORS.goldBright, 4.2, 0.26);
      }
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
        triggerHitstop(0.032);
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
        triggerHitstop(0.038);
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

  // Slash Lost Echo Lantern Shade to reclaim immediately
  if (G.worldState && G.worldState.lostEchoes && !G.echoSession) {
    const le = G.worldState.lostEchoes;
    if (aabbOverlap(box, { x: le.x - 24, y: le.y - 28, w: 48, h: 56 })) {
      reclaimLostEchoes();
    }
  }

  // Melee clang feedback against impenetrable Void Barriers
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    if (!atk.hitIds.has(vb.id) && aabbOverlap(box, vb)) {
      atk.hitIds.add(vb.id);
      audio.playParry(false);
      spawnParticles(vb.x + vb.w * 0.5, G.player.y + 24, 12, { color: COLORS.violetBright, speed: 190, spark: true, life: 0.34 });
      const hint = (G.worldState && G.worldState.abilities.shadeDash) ? t('combat.barrierHintUnlocked') : t('combat.barrierHintLocked');
      spawnFloatText(vb.x + vb.w * 0.5, G.player.y - 26, hint, COLORS.violetBright, 16, 1.05);
    }
  }

  // Strike Breakable Ink Walls & Shortcut Lever with Melee
  if (G.worldState) {
    for (const w of G.worldState.secretWalls) {
      if (w.broken || atk.hitIds.has(w.id)) continue;
      if (aabbOverlap(box, w)) {
        atk.hitIds.add(w.id);
        hitAny = true;
        damageSecretWall(w, atk.wallDmg || (atk.heavy ? 2 : 1));
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
      spawnFloatText(f.x + f.w / 2, f.y - 20, t('combat.sealPlant', G.player.sealLunge.usedSeals), COLORS.goldBright, 18, 0.75);
      break;
    }
  }
}

function spawnWeaponMoveProjectiles(weapon, move, px, py) {
  const p = move.projectile;
  if (!p) return;
  const rs = getRelicStats();
  const bladeMult = getBladeDamageMult();
  const count = p.count || 1;
  const dmg = Math.round(p.dmg * bladeMult * (p.kind === 'bellHoming' ? rs.heavySkillMult : 1));
  if (p.kind === 'bellHoming') {
    const angles = count === 3 ? [-0.42, 0, 0.42] : [0];
    for (let i = 0; i < angles.length; i++) {
      const baseA = (G.player.facing > 0 ? 0 : Math.PI) + angles[i];
      G.projectiles.push({
        owner: 'player',
        kind: 'bellHoming',
        x: px + G.player.facing * 22,
        y: py - 4 + (i - 1) * 10,
        vx: Math.cos(baseA) * p.speed,
        vy: Math.sin(baseA) * p.speed,
        speed: p.speed,
        r: p.r || 12,
        dmg,
        posture: p.posture || 12,
        breaksShield: !!p.breaksShield,
        soulOnHit: p.soulOnHit || 10,
        life: p.life || 1.05,
        maxLife: p.life || 1.05,
        facing: G.player.facing,
        hitIds: new Set()
      });
    }
    spawnShockwave(px + G.player.facing * 18, py, 64, COLORS.cyanBright, 3.2, 0.24);
  } else if (p.kind === 'hammerWave') {
    G.projectiles.push({
      owner: 'player',
      kind: 'hammerWave',
      x: px + G.player.facing * 32,
      y: G.player.y + G.player.h - 14,
      vx: G.player.facing * p.speed,
      vy: 0,
      r: p.r || 28,
      dmg,
      posture: p.posture || 30,
      heavy: true,
      breaksShield: true,
      soulOnHit: p.soulOnHit || 12,
      life: p.life || 0.62,
      maxLife: p.life || 0.62,
      facing: G.player.facing,
      hitIds: new Set()
    });
  } else if (p.kind === 'bellWave') {
    for (let i = 0; i < count; i++) {
      const offY = count > 1 ? (i === 0 ? -(p.spreadY || 14) : (p.spreadY || 14)) : 0;
      const offX = count > 1 ? (i * 14) : 0;
      G.projectiles.push({
        owner: 'player',
        kind: 'bellWave',
        x: px + G.player.facing * (24 + offX),
        y: py + offY,
        vx: G.player.facing * p.speed,
        vy: count > 1 ? (i === 0 ? -38 : 38) : 0,
        r: Math.round((p.r || 16) * rs.spellRadiusMult),
        dmg,
        posture: p.posture || 10,
        heavy: !!p.heavy,
        breaksShield: !!p.breaksShield,
        soulOnHit: p.soulOnHit || 8,
        life: p.life || 0.45,
        maxLife: p.life || 0.45,
        facing: G.player.facing,
        hitIds: new Set()
      });
    }
  }
}

export function triggerPlayerAttack(type) {
  const weapon = getActiveWeapon();
  const weaponId = weapon.id;
  const move = getWeaponMoveDef(weaponId, type);

  G.player.attackType = type;
  G.player.attackDuration = move.dur;
  G.player.attackTimer = move.dur;
  G.player.attackCd = move.cd;
  G.player.parryActive = false;

  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + 26;

  if (move.iframe) G.player.iframeTimer = Math.max(G.player.iframeTimer, move.iframe);
  if (move.guardArmor) {
    G.player.shieldArmorTimer = Math.max(G.player.shieldArmorTimer || 0, move.guardArmor);
    G.player.shieldArmorMult = move.armorMult || 0.5;
  }
  if (move.lungeTimer) {
    G.player.iaiLungeTimer = move.lungeTimer;
  }
  if (move.lungeVx) {
    G.player.vx = G.player.facing * move.lungeVx;
  }

  // Tactile Audio, Squash, Camera & Special Effects per Archetype Move
  if (type === 'switch') {
    if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      addShake(11);
      punchZoom(1.036);
      spawnShockwave(px + G.player.facing * 36, G.player.y + G.player.h - 4, move.shockwaveR || 120, COLORS.goldBright, 4.4, 0.30);
      spawnParticles(px + G.player.facing * 40, G.player.y + G.player.h - 2, 16, { color: COLORS.goldBright, speed: 230, grav: 340, spark: true, life: 0.38 });
    } else if (weaponId === 'bell') {
      audio.playBellChimeCast(3);
      addShake(6);
      if (G.player.grounded) G.player.vy = -190;
    } else {
      audio.playIaiSlash();
      addShake(7.5);
      punchZoom(1.03);
    }
    if (move.bonusSoul) {
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(move.bonusSoul * getRelicStats().soulGainMult));
    }
    G.player.squashX = weaponId === 'bell' ? 0.84 : 1.26;
    G.player.squashY = weaponId === 'bell' ? 1.20 : 0.80;
    triggerHaptic('iai', 0.88);
    if (move.floatKey) spawnFloatText(px, G.player.y - 34, t(move.floatKey), weapon.color, 20, 0.85);
  } else if (type === 'counter') {
    if (weaponId === 'bell') {
      audio.playBellQuake();
      spawnShockwave(px, py, 165, COLORS.cyanBright, 4.4, 0.32);
      spawnShockwave(px, py, 110, COLORS.goldBright, 2.8, 0.24);
    } else if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      audio.playBellToll();
      spawnShockwave(px + G.player.facing * 32, G.player.y + G.player.h - 4, move.shockwaveR || 148, COLORS.goldBright, 5.0, 0.34);
      spawnParticles(px + G.player.facing * 42, G.player.y + G.player.h - 2, 22, { color: COLORS.goldBright, speed: 280, grav: 380, spark: true, life: 0.44 });
    } else {
      audio.playCounterSlash();
    }
    G.player.squashX = 1.24;
    G.player.squashY = 0.84;
    addShake(weaponId === 'hammer' ? 13 : 8.5);
    kickCamera(G.player.facing * (weaponId === 'hammer' ? 9 : 7), weaponId === 'hammer' ? 4 : 0);
    punchZoom(weaponId === 'hammer' ? 1.044 : 1.034);
    if (move.bonusSoul) {
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(move.bonusSoul * getRelicStats().soulGainMult));
    }
    if (move.disperseOrbs) {
      const r = (move.box && move.box.radial) || 165;
      for (const pr of G.projectiles) {
        if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - px, pr.y - py) <= r + pr.r) {
          pr.life = 0;
          spawnParticles(pr.x, pr.y, 12, { color: COLORS.cyanBright, speed: 200, spark: true });
        }
      }
    }
    if (move.ringProps) {
      const r = (move.box && move.box.radial) || 165;
      for (const l of G.lanterns) {
        const lx = l.x + Math.sin(l.angle) * l.len;
        const ly = l.anchorY + Math.cos(l.angle) * l.len;
        if (Math.hypot(lx - px, ly - py) <= r + 35) {
          l.angVel += (lx >= px ? 1 : -1) * 7.0;
          l.ringFlash = 0.5;
          tryQuellChapelTideByLantern(l, lx, ly);
        }
      }
      if (G.resonancePuzzles) {
        for (const pz of G.resonancePuzzles) {
          for (const b of pz.bells) {
            if (Math.hypot(b.x - px, b.y - py) <= r + 40) ringResonanceBell(pz, b, b.x >= px ? 1 : -1);
          }
        }
      }
    }
    if (move.floatKey) spawnFloatText(px, G.player.y - 26, t(move.floatKey), weaponId === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 20, 0.78);
  } else if (type === 'iai') {
    if (weaponId === 'bell') {
      audio.playBellChimeCast(3);
      audio.playSoulCast();
    } else if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      audio.playBellQuake();
      spawnShockwave(px + G.player.facing * 42, G.player.y + G.player.h - 4, move.shockwaveR || 140, COLORS.goldBright, 5.2, 0.36);
      spawnParticles(px + G.player.facing * 44, G.player.y + G.player.h - 2, 26, { color: COLORS.goldBright, speed: 300, grav: 420, spark: true, life: 0.48 });
      spawnParticles(px + G.player.facing * 44, G.player.y + G.player.h - 2, 14, { color: COLORS.parchment, speed: 190, grav: 380, life: 0.42 });
    } else {
      audio.playIaiSlash();
    }
    G.player.squashX = weaponId === 'bell' ? 0.86 : 1.32;
    G.player.squashY = weaponId === 'bell' ? 1.18 : 0.78;
    addShake(weaponId === 'hammer' ? 14 : 9.5);
    kickCamera(G.player.facing * (weaponId === 'bell' ? -5 : 9), weaponId === 'hammer' ? 5 : 0);
    punchZoom(weaponId === 'hammer' ? 1.046 : 1.038);
    triggerHaptic('iai', weaponId === 'hammer' ? 1.2 : 1.0);
    spawnParticles(px, py, 16, { color: weapon.color, speed: 240, spark: true, angle: G.player.facing > 0 ? Math.PI : 0, spread: 0.65, life: 0.34 });
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
      spawnFloatText(px, G.player.y - 26, t('combat.synBloodIai'), COLORS.crimsonBright, 22, 0.95);
    } else if (move.floatKey) {
      spawnFloatText(px, G.player.y - 24, t(move.floatKey), weaponId === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 21, 0.80);
    }
  } else if (type === 'pogo') {
    if (weaponId === 'bell') audio.playResonanceBell(493.88, false);
    else if (weaponId === 'hammer') audio.playShieldBash(false);
    else audio.playSlash(1.22, false);
    G.player.squashX = 0.88;
    G.player.squashY = 1.14;
  } else if (type === 'up') {
    if (weaponId === 'bell') audio.playResonanceBell(587.33, false);
    else if (weaponId === 'hammer') audio.playSlash(0.76, true);
    else audio.playSlash(1.18, false);
    G.player.squashX = 0.88;
    G.player.squashY = 1.16;
  } else if (type === 'slash3') {
    if (weaponId === 'bell') {
      audio.playBellChimeCast(3);
    } else {
      audio.playSlash(0.84, true);
    }
    G.player.squashX = weaponId === 'bell' ? 0.90 : 1.20;
    G.player.squashY = weaponId === 'bell' ? 1.14 : 0.86;
    if (G.player.grounded) {
      spawnParticles(px + G.player.facing * 42, G.player.y + G.player.h - 2, 10, { color: weapon.color, speed: 150, grav: 320, angle: -Math.PI * 0.5, spread: 1.2, life: 0.32 });
    }
  } else if (type === 'slash2') {
    if (weaponId === 'bell') {
      audio.playBellChimeCast(2);
    } else if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      addShake(9.5);
      kickCamera(G.player.facing * 5, 4);
      spawnShockwave(px + G.player.facing * 44, G.player.y + G.player.h - 4, move.shockwaveR || 110, COLORS.goldBright, 4.2, 0.28);
      spawnParticles(px + G.player.facing * 48, G.player.y + G.player.h - 2, 18, { color: COLORS.goldBright, speed: 220, grav: 360, spark: true, life: 0.38 });
      if (move.floatKey) spawnFloatText(px, G.player.y - 24, t(move.floatKey), COLORS.goldBright, 18, 0.65);
    } else {
      audio.playSlash(1.08, false);
    }
    G.player.squashX = weaponId === 'hammer' ? 1.26 : 1.10;
    G.player.squashY = weaponId === 'hammer' ? 0.78 : 0.92;
  } else {
    if (weaponId === 'bell') audio.playBellChimeCast(1);
    else if (weaponId === 'hammer') {
      audio.playSlash(0.72, true);
      addShake(4.5);
    } else audio.playSlash(0.98, false);
    G.player.squashX = weaponId === 'hammer' ? 1.18 : 1.08;
    G.player.squashY = weaponId === 'hammer' ? 0.86 : 0.94;
  }

  // Spawn Bell Staff harmonic rings / homing darts if defined on this move
  spawnWeaponMoveProjectiles(weapon, move, px, py);

  const slashOffX = type === 'pogo' ? 0 : (type === 'iai' && weaponId === 'blade') ? 0 : (move.box && move.box.radial) ? 0 : G.player.facing * 26;
  const slashOffY = type === 'pogo' ? 40 : type === 'up' ? -34 : 0;
  const slashLife = move.slashLife || 0.20;
  G.slashes.push({
    x: px + slashOffX,
    y: py + slashOffY,
    x0: px - G.player.facing * 18,
    x1: px + G.player.facing * 135,
    offX: slashOffX,
    offY: slashOffY,
    followPlayer: type !== 'iai' && type !== 'counter' && type !== 'switch',
    isIaiTrack: (type === 'iai' || type === 'switch') && weaponId === 'blade',
    facing: G.player.facing,
    type: move.slashType || type,
    weaponId,
    life: slashLife,
    maxLife: slashLife
  });

  G.player.activeAttack = {
    type,
    weaponId,
    dmg: move.dmg,
    posture: move.posture,
    rally: move.rally,
    heavy: !!move.heavy,
    breaksShield: !!move.breaksShield,
    shockwaveR: move.shockwaveR || 0,
    knockbackVx: move.knockbackVx || 0,
    knockupVy: move.knockupVy || 0,
    wallDmg: move.wallDmg || 0,
    elapsed: 0,
    activeStart: 0,
    activeEnd: move.activeEnd,
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
  const isFoundry = owner && (owner.id === 'boss_ji' || owner.id === 'boss_yuan');
  G.chapelTide = null;
  audio.playBellToll();
  triggerHitstop(0.06, true);
  addShake(11);
  G.screenFlash = { alpha: 0.2, color: COLORS.goldBright };
  spawnShockwave(lx, ly, 230, COLORS.goldBright, 4.8, 0.42);
  spawnParticles(lx, ly, 28, { color: COLORS.goldBright, speed: 300, spark: true, life: 0.48 });
  spawnFloatText(lx, ly - 26, isFoundry ? t('combat.quellFoundry') : t('combat.quellTide'), COLORS.goldBright, 22, 1.25);
  if (owner && owner.alive) {
    const isYuan = owner.id === 'boss_yuan';
    damageEnemyHP(owner, isYuan ? 42 : isFoundry ? 38 : 32, true);
    addPostureToEnemy(owner, isYuan ? 46 : isFoundry ? 42 : 34);
    if ((owner.moveKind === 'inkTide' || owner.moveKind === 'resonanceNova' || owner.moveKind === 'eclipseTide') && owner.state !== 'stagger') {
      owner.state = 'recover';
      owner.stateTimer = isYuan ? 1.2 : 1.1;
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
  spawnFloatText(SHORTCUT_GATE_DEF.x + 19, 165, t('combat.shortcutOpen'), COLORS.goldBright, 21, 1.5);
}

export function damageSecretWall(w, dmg = 1) {
  if (w.broken) return;
  w.hp = Math.max(0, w.hp - dmg);
  w.shake = 0.18;
  audio.playHit(w.hp <= 0);
  triggerHitstop(w.hp <= 0 ? 0.055 : 0.028, true);
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
    spawnFloatText(cx, w.y - 12, t('combat.secretWallBroken'), COLORS.cyanBright, 20, 1.35);
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
  triggerHitstop(0.024, true);
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
    spawnFloatText(puzzle.cageX, puzzle.cageY - 82, t('combat.puzzleSolved', locPuzzleName(puzzle)), COLORS.goldBright, 22, 1.85);
  } else {
    audio.playResonanceBell(bell.noteFreq, false);
    spawnFloatText(bell.x, bell.y - 32, t('combat.puzzleStep', litCount, puzzle.bells.length), COLORS.goldBright, 17, 0.75);
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
  triggerHitstop(0.042, true);
  addShake(11);
  punchZoom(1.036);
  G.screenFlash = { alpha: 0.16, color: COLORS.cyanBright };

  G.bellQuakes.push({ x: px, y: py, radius, life: 0.42, maxLife: 0.42 });
  spawnShockwave(px, py - 18, radius, COLORS.cyanBright, 4.6, 0.34);
  spawnShockwave(px, py - 18, radius * 0.65, COLORS.goldBright, 3.0, 0.26);
  spawnParticles(px, py - 24, 28, { color: COLORS.cyanBright, speed: 290, spark: true, grav: -60, life: 0.42 });
  spawnParticles(px, py - 24, 16, { color: COLORS.goldBright, speed: 240, spark: true, grav: 120, life: 0.38 });
  spawnFloatText(px, G.player.y - 36, t('combat.bellQuake'), COLORS.cyanBright, 20, 0.78);

  // Hit enemies inside radial aura OR tall overhead sonic pillar
  const pillarBox = { x: px - radius * 0.56, y: py - radius * 1.45, w: radius * 1.12, h: radius * 1.55 };
  const targets = getLivingFoes();
  for (const foe of targets) {
    const tx = foe.x + foe.w / 2;
    const ty = foe.y + foe.h * 0.45;
    const inRadius = Math.hypot(tx - px, ty - py) <= radius + Math.max(foe.w, foe.h) * 0.35;
    const inPillar = aabbOverlap(pillarBox, foe);
    if (inRadius || inPillar) {
      audio.playHit(true, 3);
      if ((foe.kind === 'golem' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
        foe.shieldBrokenTimer = 2.6;
        if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
        audio.playShieldBreak();
        spawnFloatText(tx, foe.y - 26, t('combat.quakeShieldBreak'), COLORS.cyanBright, 19, 0.95);
      }
      damageEnemyHP(foe, dmg, true);
      addPostureToEnemy(foe, posDmg);
      rallyPlayerGrayHp(14);
      spawnHitMark(tx, ty, -Math.PI * 0.5, COLORS.cyanBright, 96, 8);
      if (!foe.isBoss && foe.state !== 'stagger') {
        foe.vx = (tx >= px ? 1 : -1) * 210;
        if (foe.kind !== 'wraith') foe.vy = Math.min(foe.vy, -180);
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

  // Bell-Quake also reclaims nearby Lost Echo Lantern Shade
  if (G.worldState && G.worldState.lostEchoes && !G.echoSession) {
    const le = G.worldState.lostEchoes;
    if (Math.hypot(le.x - px, le.y - py) <= radius + 36) reclaimLostEchoes();
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
  spawnFloatText(cx, cy - 42, t('combat.synGrappleQuake'), COLORS.cyanBright, 19, 0.95);

  for (const foe of getLivingFoes()) {
    const tx = foe.x + foe.w / 2;
    const ty = foe.y + foe.h * 0.45;
    if (Math.hypot(tx - cx, ty - cy) <= radius + Math.max(foe.w, foe.h) * 0.35) {
      if ((foe.kind === 'golem' || (foe.kind === 'boss2' && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
        foe.shieldBrokenTimer = 2.4;
        if (foe.kind === 'boss2') foe.shieldUp = false;
        audio.playShieldBreak();
      }
      damageEnemyHP(foe, dmg, true);
      addPostureToEnemy(foe, posDmg);
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

  if (p.echoAmount && p.kind !== 'echoCache') {
    G.worldState.echoes = (G.worldState.echoes || 0) + Number(p.echoAmount);
  }

  const pkName = locPickup(p, 'name');
  const pkDesc = locPickup(p, 'desc');
  if (p.kind === 'flaskCore') {
    const rawFlasks = 3 + (G.worldState.bonusFlasks || 0);
    if (rawFlasks >= 6) {
      const ngEcho = Math.round(180 * getCombatScaling(false).echoMult);
      G.worldState.echoes = (G.worldState.echoes || 0) + ngEcho;
      spawnFloatText(p.x, p.y - 54, t('combat.ngFlaskCap', ngEcho), COLORS.goldBright, 19, 1.85);
    } else {
      G.worldState.bonusFlasks++;
      G.player.maxFlasks = getPlayerMaxFlasks();
      G.player.flasks = G.player.maxFlasks;
      spawnFloatText(p.x, p.y - 54, `${pkName} · ${pkDesc}`, COLORS.cyanBright, 20, 1.85);
    }
  } else if (p.kind === 'statCore') {
    spawnFloatText(p.x, p.y - 54, `${pkName} · ${pkDesc}`, COLORS.violetBright, 20, 1.95);
  } else if (p.kind === 'ability') {
    G.worldState.abilities[p.abilityId] = true;
    G.player.airJumpsLeft = 1;
    if (p.abilityId === 'shadeDash') {
      audio.playShadeDash();
      punchZoom(1.05);
      spawnShockwave(p.x, p.y - 26, 160, COLORS.violetBright, 5.2, 0.5);
      spawnFloatText(p.x, p.y - 58, t('combat.unlockShade', pkName), COLORS.violetBright, 22, 2.4);
    } else {
      audio.playWingJump();
      punchZoom(1.045);
      spawnShockwave(p.x, p.y - 26, 150, COLORS.cyanBright, 5, 0.48);
      spawnFloatText(p.x, p.y - 58, t('combat.unlockWings', pkName), COLORS.cyanBright, 22, 2.2);
    }
  } else if (p.kind === 'echoCache') {
    const amt = Number(p.echoAmount) || 180;
    G.worldState.echoes = (G.worldState.echoes || 0) + amt;
    spawnFloatText(p.x, p.y - 54, t('combat.echoCacheGain', pkName, amt), COLORS.goldBright, 21, 1.9);
  } else if (p.kind === 'keyItem') {
    if (!G.worldState.keyItems) G.worldState.keyItems = { dawnSigil: false };
    G.worldState.keyItems[p.keyId] = true;
    audio.playEndingChord(true, 0);
    punchZoom(1.05);
    spawnShockwave(p.x, p.y - 26, 175, COLORS.goldBright, 5.5, 0.55);
    triggerBossBanner(t('combat.dawnBannerTitle'), t('combat.dawnBannerQuote'), COLORS.goldBright, 3.0);
    spawnFloatText(p.x, p.y - 58, `${pkName} · ${pkDesc}`, COLORS.goldBright, 20, 2.3);
  } else if (p.kind === 'weapon') {
    const wDef = getWeaponById(p.weaponId || 'bell');
    const isNewW = unlockWeapon(wDef.id);
    if (!isNewW) {
      const ngEcho = Math.round(260 * getCombatScaling(false).echoMult);
      G.worldState.echoes = (G.worldState.echoes || 0) + ngEcho;
      spawnFloatText(p.x, p.y - 54, t('combat.ngWeaponDup', ngEcho), COLORS.goldBright, 19, 1.95);
    } else {
      G.worldState.equippedWeapon = wDef.id;
      audio.playWeaponSwap(wDef.id);
      punchZoom(1.05);
      spawnShockwave(p.x, p.y - 26, 170, wDef.color, 5.2, 0.52);
      const wName = isEn() ? wDef.nameEn : wDef.name;
      triggerBossBanner(t('combat.weaponUnlockBanner', wName), isEn() ? wDef.tagEn : wDef.tag, wDef.color, 3.0);
      spawnFloatText(p.x, p.y - 58, `${pkName} · ${pkDesc}`, wDef.color, 20, 2.3);
    }
  } else if (p.kind === 'relic') {
    if (G.worldState.unlockedRelics.has(p.relicId)) {
      const ngEcho = Math.round(220 * getCombatScaling(false).echoMult);
      G.worldState.echoes = (G.worldState.echoes || 0) + ngEcho;
      spawnFloatText(p.x, p.y - 54, t('combat.ngRelicDup', ngEcho), COLORS.goldBright, 19, 1.95);
    } else {
      G.worldState.unlockedRelics.add(p.relicId);
      spawnFloatText(p.x, p.y - 54, `${pkName} · ${pkDesc}`, COLORS.goldBright, 20, 1.95);
    }
  }
  checkAchievements();
  G.minimapDirty = true;
  hooks.saveProgress(true);
  hooks.syncHUD(true);
}
