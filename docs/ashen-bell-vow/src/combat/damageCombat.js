// Core Damage, Posture, Parry/Block Resolution & Echo Drop/Reclaim (split from src/combat.js in v32.0)
import {
  COLORS, RELICS, GRAPPLE_ANCHORS, PENDULUMS, VOID_BARRIERS, ABYSSAL_RIVERS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, SKY_BRIDGE_GATE_DEF, FIRST_BELL_CORE_POS, ENEMY_ECHO_REWARDS, DUMMY_MODES, SEVEN_BELLS_ORDER
} from '../config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, isWorldPosExplored, getRelicStats, getActiveVowStats, getCombatScaling, getBladeDamageMult, getSmithPostureMult,
  getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  hasActiveWeaponTrait, isSkillNodeUnlocked,
  getBossBonusDamageMult, hasKeeperBlessing, isSkyBridgeOpen,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks,
  scheduleOutcome, addShake, kickCamera, punchZoom, triggerBossBanner, triggerBossKillSlowmo, triggerHitstop
} from '../state.js';
import { getRoomAt } from '../levelLoader.js';
import { audio } from '../audio.js';
import { triggerHaptic, getActionKeyLabel, isActionHeld } from '../input.js';
import {
  spawnParticles, spawnShockwave, spawnImpactBurst, spawnHitMark, spawnFloatText
} from '../vfx.js';
import { aabbOverlap, hasLineOfSight, getGroundSurfaceY } from '../physics.js';
import { recordBestiaryEvent, checkAchievements } from '../codex.js';
import { t, isEn, locDummyMode, locPickup, locPuzzleName, locBoss, locRelic } from '../i18n.js';
import { WEAPON_ORDER, normalizeWeaponId, getWeaponById, getWeaponMoveDef, getWeaponUltimateDef } from '../weapons.js';

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

// v36.0 Asymmetric Hit-Freeze, Directional Squash/Recoil Deformation & Launch Tagging
export function applyEnemyHitFeel(enemy, heavy = false, hitDir = 0, launchSpeed = 0) {
  if (!enemy || !enemy.alive) return;
  const dir = hitDir || (G.player ? ((enemy.x + enemy.w * 0.5) >= (G.player.x + G.player.w * 0.5) ? 1 : -1) : 1);
  const hsMode = (G.settings && G.settings.hitstopMode) || 'standard';
  const freezeScale = hsMode === 'off' ? 0 : hsMode === 'light' ? 0.4 : 1.0;
  const freezeDur = (heavy ? 0.056 : 0.032) * freezeScale;
  if (freezeDur > 0 && !enemy.isDummy) {
    enemy.hitFreezeTimer = Math.max(enemy.hitFreezeTimer || 0, enemy.isBoss ? freezeDur * 0.72 : freezeDur);
  }
  enemy.hitTremor = Math.max(enemy.hitTremor || 0, heavy ? 5.2 : 2.8);
  const deformScale = enemy.isBoss ? 0.46 : enemy.isMiniBoss ? 0.65 : enemy.isDummy ? 0.55 : 1.0;
  enemy.squashX = 1 - (heavy ? 0.26 : 0.14) * deformScale;
  enemy.squashY = 1 + (heavy ? 0.24 : 0.13) * deformScale;
  enemy.recoilLean = dir * (heavy ? 0.24 : 0.12) * deformScale;

  // Brief hit-stun interrupt on light trash mobs when struck by heavy attacks (unless crimson peril windup)
  if (heavy && !enemy.isBoss && !enemy.isMiniBoss && !enemy.isDummy && enemy.state !== 'stagger') {
    const isPeril = enemy.state === 'windup' && (
      enemy.attackKind === 'redLunge' || enemy.attackKind === 'redBash' ||
      enemy.attackKind === 'redDash' || enemy.attackKind === 'frostLunge'
    );
    if (!isPeril && enemy.kind !== 'golem') {
      enemy.state = 'recover';
      enemy.stateTimer = Math.max(enemy.stateTimer || 0, 0.30);
    }
  }

  // Launch tag for Dead-Cells-style Wall-Slam & Bowling Chain knockback!
  if (!enemy.isBoss && !enemy.isDummy && launchSpeed >= 260) {
    enemy.launchTimer = enemy.isMiniBoss ? 0.24 : 0.44;
    enemy.launchDir = dir;
    enemy.launchHitIds = new Set();
  }
}

export function damageEnemyHP(enemy, amount, showNum = true) {
  if (!enemy || !enemy.alive) return;
  if (enemy.kind) recordBestiaryEvent(enemy.kind, 'seen');
  if (!enemy.isBoss) { enemy.deaggroTimer = 0; enemy._leashStuckTimer = 0; enemy._wallStuckTimer = 0; }
  if ((enemy.isBoss || enemy.isMiniBoss) && enemy.state !== 'stagger' && G.player) {
    const pDist = Math.abs((G.player.x + G.player.w * 0.5) - (enemy.x + enemy.w * 0.5));
    if (pDist < 155) {
      enemy.greedHits = Math.min(8, (enemy.greedHits || 0) + 1);
      enemy.greedDecayTimer = 2.8;
    }
  }
  let finalAmt = (enemy.isBoss || enemy.isMiniBoss) ? Math.round(amount * getBossBonusDamageMult()) : amount;
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
    if (enemy.meter) {
      const now = G.globalTime || 0;
      enemy.meter.hits.push({ t: now, d: finalAmt, p: 0 });
      enemy.meter.totalDmg += finalAmt;
      if (finalAmt > enemy.meter.maxHit) enemy.meter.maxHit = finalAmt;
      enemy.meter.lastHitTime = now;
    }
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
  if ((enemy.hitFreezeTimer || 0) <= 0.005) {
    applyEnemyHitFeel(enemy, finalAmt >= 28, 0, 0);
  }
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
  const rawPostureMult = getRelicStats().postureDmgMult * getSmithPostureMult();
  // Soft-cap extreme endgame posture stacking (>2.20x) to preserve late-game parry rhythm
  const effPostureMult = rawPostureMult > 2.2 ? (2.2 + (rawPostureMult - 2.2) * 0.55) : rawPostureMult;
  const scaled = amount * effPostureMult * chantBonus;
  enemy.posture = Math.min(enemy.maxPosture, enemy.posture + scaled);
  if (enemy.isDummy && enemy.meter && scaled > 0) {
    const now = G.globalTime || 0;
    enemy.meter.hits.push({ t: now, d: 0, p: scaled });
    enemy.meter.totalPosture += scaled;
    enemy.meter.lastHitTime = now;
  }
  enemy.postureDecayDelay = 3.2;
  if (enemy.posture >= enemy.maxPosture) {
    enemy.state = 'stagger';
    enemy.stateTimer = enemy.isBoss ? 3.8 : (enemy.isMiniBoss ? 3.4 : 3.2);
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
  if (!enemy.isDummy && G.player && G.player.hp > 0 && isSkillNodeUnlocked('exec_surge')) {
    G.player.surgeTimer = 1.6;
    G.player.dashCd = 0;
    G.player.grappleCd = 0;
    G.player.airJumpsLeft = 1;
    spawnShockwave(G.player.x + G.player.w * 0.5, G.player.y + 26, 62, COLORS.cyanBright, 2.8, 0.24);
  }
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
  if (enemy.kind === 'fungus' && G.sporeClouds && (!G.player || G.player.execTimer <= 0)) {
    G.sporeClouds.push({ x: enemy.x + enemy.w * 0.5, y: enemy.y + enemy.h - 22, r: 58, life: 2.8, maxLife: 2.8, dmg: 8 });
    spawnShockwave(enemy.x + enemy.w * 0.5, enemy.y + enemy.h - 22, 62, '#4ade80', 2.8, 0.26);
  }
  if (enemy.kind === 'crawler' && G.delayedStrikes) {
    const bx = enemy.x + enemy.w * 0.5;
    const by = enemy.y + enemy.h * 0.5;
    audio.playDangerAlert();
    G.delayedStrikes.push({ kind: 'cinderBlast', x: bx, y: by, radius: 112, timer: 0.85, maxTimer: 0.85, playerDmg: 24, dmg: 38, posture: 32, facing: 1 });
    spawnFloatText(bx, enemy.y - 32, t('combat.crawlerBlastWarn'), '#fb923c', 18, 0.9);
  }
  if (enemy.isMiniBoss) {
    if (G.wardenArenaFx) {
      G.wardenArenaFx.windDir = 0;
      G.wardenArenaFx.windTimer = 0;
      G.wardenArenaFx.blizzardAlpha = 0;
      G.wardenArenaFx.bellPulseTimer = 0;
    }
    audio.playBellToll();
    triggerHaptic('execution', 1.05);
    addShake(14);
    if (G.echoSession) {
      G.groundWaves = []; G.arenaHazards = [];
      if (G.echoSession.mode === 'seven_bells' && G.echoSession.stage < SEVEN_BELLS_ORDER.length - 1) {
        G.echoSession.stage++;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.sevenBellsAdvance', G.echoSession.stage + 1), COLORS.goldBright, 21, 1.5);
        scheduleOutcome(hooks.advanceSevenBellsNext, 1250, true);
      } else if (G.echoSession.mode === 'warden_rush' && G.echoSession.stage === 0) {
        G.echoSession.stage = 1;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.wardenRushStage1'), '#6ee7b7', 21, 1.5);
        scheduleOutcome(hooks.advanceWardenRushStage2, 1250, true);
      } else if (G.echoSession.mode === 'warden_rush' && G.echoSession.stage === 1) {
        G.echoSession.stage = 2;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.wardenRushStage2'), '#bae6fd', 21, 1.5);
        scheduleOutcome(hooks.advanceWardenRushStage3, 1250, true);
      } else {
        scheduleOutcome(() => hooks.showVictory(enemy.id), 1100, true);
      }
      return;
    }
    const wasBridgeOpen = isSkyBridgeOpen();
    let bannerQuote = t('combat.wardenShrineUnsealed');
    if (G.worldState) {
      if (!G.worldState.defeatedMiniBosses) G.worldState.defeatedMiniBosses = new Set();
      G.worldState.defeatedMiniBosses.add(enemy.id);
      let unsealedAny = false;
      for (const pk of G.worldState.pickups) {
        if (!pk.collected && pk.requiresBoss === enemy.id) {
          unsealedAny = true;
          spawnShockwave(pk.x, pk.y - 28, 145, COLORS.goldBright, 4.6, 0.48);
          spawnParticles(pk.x, pk.y - 28, 28, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.65 });
          spawnFloatText(pk.x, pk.y - 68, t('combat.shrineUnsealedFloat'), COLORS.goldBright, 18, 2.1);
        }
      }
      if (!wasBridgeOpen && isSkyBridgeOpen() && SKY_BRIDGE_GATE_DEF.w > 0) {
        bannerQuote = t('combat.wardenSkyBridgeOpen');
        spawnShockwave(SKY_BRIDGE_GATE_DEF.x + 18, SKY_BRIDGE_GATE_DEF.y + 100, 160, COLORS.cyanBright, 4.5, 0.45);
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 64, t('combat.skyBridgeToast'), COLORS.cyanBright, 20, 2.2);
      }
      if (!unsealedAny) {
        const wardenRelicMap = { warden_wind: 'galefather', warden_forest: 'sporeseal', warden_mountain: 'frostcore' };
        const rewardRelicId = wardenRelicMap[enemy.kind];
        if (rewardRelicId && !G.worldState.unlockedRelics.has(rewardRelicId)) {
          G.worldState.unlockedRelics.add(rewardRelicId);
        }
      }
      G.minimapDirty = true;
      checkAchievements();
      hooks.saveProgress(true);
      hooks.syncHUD(true);
    }
    triggerBossBanner(locBoss(enemy, 'name'), bannerQuote, COLORS.goldBright, 3.0);
  }
  if (enemy.isBoss) {
    G.chapelTide = null; G.groundWaves = []; G.arenaHazards = [];
    triggerBossKillSlowmo(0.85);
    G.screenFlash = { alpha: 0.22, color: '#d97706' };
    G.execKillFocus = { x: enemy.x + enemy.w * 0.5, y: enemy.y + enemy.h * 0.45, timer: 0.24, maxTimer: 0.24, isBoss: true };
    spawnShockwave(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, 290, COLORS.goldBright, 6.0, 0.62);
    audio.playBellToll(); triggerHaptic('execution', 1.25); addShake(18);
    if (G.echoSession) {
      if (enemy.id === 'boss_zhu' && G.worldState) {
        G.worldState.boss4Defeated = true;
        checkAchievements();
      }
      if (G.echoSession.mode === 'seven_bells' && G.echoSession.stage < SEVEN_BELLS_ORDER.length - 1) {
        G.echoSession.stage++;
        spawnFloatText(enemy.x + enemy.w / 2, enemy.y - 44, t('combat.sevenBellsAdvance', G.echoSession.stage + 1), COLORS.goldBright, 22, 1.5);
        scheduleOutcome(hooks.advanceSevenBellsNext, 1250, true);
      } else if (G.echoSession.mode === 'rush' && G.echoSession.stage === 0) {
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
        for (const pk of G.worldState.pickups) {
          if (!pk.collected && pk.requiresBoss === 'boss_hui') {
            spawnShockwave(pk.x, pk.y - 28, 165, COLORS.cyanBright, 4.8, 0.52);
            spawnParticles(pk.x, pk.y - 28, 30, { color: COLORS.cyanBright, speed: 240, spark: true, life: 0.65 });
            spawnFloatText(pk.x, pk.y - 68, t('combat.shrineUnsealedFloat'), COLORS.cyanBright, 19, 2.2);
          }
        }
        G.minimapDirty = true; checkAchievements(); hooks.saveProgress(false);
      }
      // v46.8 Seamless exploration: no victory menu popup on mid-game bosses (only banner + gate unseal!)
      spawnFloatText(CHAPEL_EXIT_GATE_DEF.x, CHAPEL_EXIT_GATE_DEF.y - 34, t('combat.gateChapelOpen'), COLORS.cyanBright, 20, 2.0);
      triggerBossBanner(t('victory.huiTitle'), t('combat.gateChapelOpen'), COLORS.cyanBright, 3.0);
      hooks.syncHUD(true);
    } else if (enemy.id === 'boss_ji') {
      if (G.worldState) {
        G.worldState.boss2Defeated = true;
        for (const pk of G.worldState.pickups) {
          if (!pk.collected && pk.requiresBoss === 'boss_ji') {
            spawnShockwave(pk.x, pk.y - 28, 165, COLORS.goldBright, 4.8, 0.52);
            spawnParticles(pk.x, pk.y - 28, 30, { color: COLORS.goldBright, speed: 240, spark: true, life: 0.65 });
            spawnFloatText(pk.x, pk.y - 68, t('combat.shrineUnsealedFloat'), COLORS.goldBright, 19, 2.2);
          }
        }
        G.minimapDirty = true;
        checkAchievements();
        hooks.saveProgress(false);
      }
      // v46.8 Seamless exploration: no victory menu popup on mid-game bosses (only banner + gate unseal!)
      spawnFloatText(FOUNDRY_EXIT_GATE_DEF.x, FOUNDRY_EXIT_GATE_DEF.y - 34, t('combat.gateFoundryOpen'), COLORS.goldBright, 21, 2.2);
      triggerBossBanner(t('victory.jiTitle'), t('combat.gateFoundryOpen'), COLORS.goldBright, 3.0);
      hooks.syncHUD(true);
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
    } else if (enemy.id === 'boss_zhu') {
      if (G.worldState) {
        G.worldState.boss4Defeated = true;
        for (const pk of G.worldState.pickups) {
          if (!pk.collected && pk.requiresBoss === 'boss_zhu') {
            spawnShockwave(pk.x, pk.y - 28, 195, COLORS.goldBright, 5.2, 0.55);
            spawnParticles(pk.x, pk.y - 28, 36, { color: COLORS.goldBright, speed: 260, spark: true, life: 0.7 });
            spawnFloatText(pk.x, pk.y - 68, t('combat.shrineUnsealedFloat'), COLORS.goldBright, 20, 2.3);
          }
        }
        G.minimapDirty = true; checkAchievements(); hooks.saveProgress(true);
      }
      triggerBossBanner(t('combat.zhuDefeatedTitle'), t('combat.zhuDefeatedQuote'), COLORS.goldBright, 3.4);
      scheduleOutcome(() => hooks.showVictory('boss_zhu'), 1450, true);
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

export function applyFrostToPlayer(amount, isDummyHit = false) {
  if (!G.player || G.player.hp <= 0 || amount <= 0) return;
  const rs = getRelicStats();
  const wetMult = (G.player.wetTimer > 0) ? 1.30 : 1.0;
  const effAmt = Math.max(1, Math.round(amount * (rs.frostResistMult || 1.0) * wetMult));
  G.player.frostMeter = Math.min(100, (G.player.frostMeter || 0) + effAmt);
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.45;
  audio.playFrostBuild();
  spawnParticles(px, py, 6, { color: '#7dd3fc', speed: 120, spark: true, life: 0.34 });
  if (G.player.frostMeter >= 100) {
    G.player.frostMeter = 0;
    G.player.frostChilledTimer = 4.6;
    const burstDmg = Math.max(12, Math.round(G.player.maxHp * 0.14));
    audio.playFrostShatter();
    triggerHaptic('hurt', 1.0);
    addShake(10);
    G.screenFlash = { alpha: 0.28, color: '#38bdf8' };
    spawnShockwave(px, py, 96, '#7dd3fc', 4.2, 0.32);
    spawnParticles(px, py, 24, { color: '#bae6fd', speed: 240, spark: true, life: 0.52 });
    spawnFloatText(px, G.player.y - 34, t('combat.frostbiteTrigger', burstDmg), '#7dd3fc', 20, 1.15);
    if (isDummyHit) {
      const minTrainHp = Math.max(15, Math.round(G.player.maxHp * 0.25));
      G.player.hp = Math.max(minTrainHp, G.player.hp - burstDmg);
    } else {
      G.player.hp = Math.max(0, G.player.hp - burstDmg);
      G.stats.damageTaken += burstDmg;
      if (G.echoSession) G.echoSession.damageTaken += burstDmg;
      if (G.player.hp <= 0) {
        if (tryTriggerKeeperBlessingSave()) return;
        G.player.hp = 0;
        G.player.deathTimer = 0.65;
        G.player.vx = -G.player.facing * 90;
        G.player.vy = -120;
        dropPlayerEchoesOnDeath(false);
        scheduleOutcome(hooks.showDeath, 650, false);
      }
    }
  }
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

  // 2. Three-Tier Parry Check + v45.5 Mobile Merged Attack-Clash Parry (front-loaded 140ms startup window!)
  const rs = getRelicStats();
  const isMergedClash = !!(G.player.clashParryTimer > 0 && !isUnparryable);
  if ((G.player.parryActive || isMergedClash) && !isUnparryable) {
    if (isMergedClash || G.player.parryElapsedMs <= rs.parryWindowMs) {
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

      const isBossMultiHit = !!(attacker && (attacker.isBoss || attacker.isMiniBoss) && attacker.comboTotal > 1);
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
      G.player.clashParryTimer = 0;
      if (isMergedClash) {
        G.player.activeAttack = null;
        G.player.attackTimer = 0;
        G.player.attackCd = 0;
        G.player.comboStep = 0;
        G.player.clashParryCd = 0;
        G.player.clashChainTimer = 0.52;
      }
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
      if (attacker && (attacker.kind === 'golem' || attacker.kind === 'boss2' || attacker.kind === 'dummy' || attacker.kind === 'warden_forest')) {
        const dur = attacker.kind === 'warden_forest' ? 4.4 : 2.4;
        const wasArmored = attacker.kind === 'warden_forest' && (attacker.shieldBrokenTimer || 0) <= 0;
        attacker.shieldBrokenTimer = Math.max(attacker.shieldBrokenTimer || 0, dur);
        if (attacker.kind === 'boss2' || attacker.kind === 'dummy') attacker.shieldUp = false;
        if (wasArmored) {
          audio.playBarkCrack();
          spawnFloatText(attacker.x + attacker.w / 2, attacker.y - 32, t('combat.barkBreak'), '#6ee7b7', 19, 1.0);
        }
      }

      const finisherBonus = isComboFinisher ? (attacker.comboTotal >= 5 ? 26 : 20) : 0;
      const falconBonus = (attacker && attacker.kind === 'falcon') ? 26 : 0;
      const posDmg = ((attacker.isBoss ? 26 : (attacker.isMiniBoss ? 30 : 36)) + finisherBonus + falconBonus) * rs.parryPostureMult;
      if (attacker.hp !== undefined) {
        if (isComboFinisher) attacker.finisherParried = true;
        addPostureToEnemy(attacker, posDmg);
        if (rs.parryReflectDmg > 0) {
          damageEnemyHP(attacker, rs.parryReflectDmg, true);
        }
        // Duelist & multi-hit Wardens keep swinging through parry chains; falcon crashes downward!
        if (!attacker.isBoss && attacker.state !== 'stagger') {
          if ((attacker.kind === 'duelist' && attacker.attackKind === 'combo3' && attacker.comboIdx < 2) ||
              (attacker.isDummy && attacker.attackKind === 'combo2' && attacker.comboIdx < 1) ||
              (attacker.kind === 'warden_wind' && attacker.moveKind === 'galeCombo' && attacker.comboIdx < attacker.comboTotal - 1) ||
              (attacker.kind === 'warden_mountain' && attacker.moveKind === 'frostCombo' && attacker.comboIdx < attacker.comboTotal - 1)) {
            attacker.vx = -dir * 70;
          } else if (attacker.kind === 'falcon') {
            attacker.state = 'recover';
            attacker.stateTimer = 1.05;
            attacker.vx = -dir * 130;
            attacker.vy = 260;
            spawnFloatText(attacker.x + attacker.w / 2, attacker.y - 24, t('combat.falconCrash'), '#7dd3fc', 17, 0.85);
          } else if (attacker.kind === 'crawler' && attacker.attackKind === 'emberRoll') {
            attacker.flippedTimer = 2.4;
            attacker.state = 'stagger';
            attacker.stateTimer = 2.4;
            attacker.vx = -dir * 160;
            attacker.vy = -190;
            addPostureToEnemy(attacker, 45);
            audio.playShieldBreak();
            spawnFloatText(attacker.x + attacker.w / 2, attacker.y - 28, t('combat.crawlerFlip'), COLORS.goldBright, 19, 1.0);
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
      if (attacker && attacker.inflictsFrost > 0) {
        applyFrostToPlayer(Math.round(attacker.inflictsFrost * 0.45), isDummyHit);
      }
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
    if (attacker && (attacker.isBoss || attacker.isMiniBoss) && attacker.state !== 'stagger') {
      attacker.greedHits = Math.min(8, (attacker.greedHits || 0) + 1.5);
      attacker.greedDecayTimer = 3.0;
    }
    if (hasActiveWeaponTrait('iron_bulwark') && (G.player.bulwarkCd || 0) <= 0) {
      G.player.bulwarkCd = 2.8;
      const bx = G.player.x + G.player.w * 0.5;
      const by = G.player.y + 26;
      audio.playShieldBash(true);
      addShake(9);
      if (G.player.seals < G.player.maxSeals) G.player.seals++;
      spawnShockwave(bx, by, 150, COLORS.goldBright, 4.4, 0.30);
      spawnFloatText(bx, G.player.y - 34, t('combat.traitIronBulwark'), COLORS.goldBright, 19, 0.90);
      for (const foe of getLivingFoes()) {
        if (Math.hypot((foe.x + foe.w * 0.5) - bx, (foe.y + foe.h * 0.5) - by) <= 155) {
          damageEnemyHP(foe, Math.round(24 * getBladeDamageMult()), true);
          addPostureToEnemy(foe, 28);
          if (!foe.isBoss && foe.state !== 'stagger') foe.vx = ((foe.x + foe.w * 0.5) >= bx ? 1 : -1) * 230;
        }
      }
    } else {
      spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 24, t('combat.shieldArmor', armDmg), COLORS.goldBright, 17, 0.75);
    }
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
  G.player.iframeTimer = 0.38;
  // v45.0 Anti-Facetank: Clean direct Boss/Warden hits restore enemy posture & charge close-range red punish!
  if (!isDummyHit && attacker && (attacker.isBoss || attacker.isMiniBoss) && attacker.state !== 'stagger' && attacker.maxPosture > 0) {
    const prevPos = attacker.posture || 0;
    const recAmt = Math.round(attacker.maxPosture * (isUnparryable ? 0.16 : 0.12));
    attacker.posture = Math.max(0, prevPos - recAmt);
    attacker.postureDecayDelay = 0;
    attacker.greedHits = Math.min(8, (attacker.greedHits || 0) + 1.5);
    attacker.greedDecayTimer = 3.0;
    if (prevPos - attacker.posture >= 14) {
      spawnFloatText(attacker.x + attacker.w * 0.5, attacker.y - 26, t('combat.bossPostureRegen'), COLORS.crimsonBright, 14, 0.85);
    }
  }
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

  if (G.player.hp > 0 && attacker && attacker.inflictsFrost > 0) {
    applyFrostToPlayer(attacker.inflictsFrost, isDummyHit);
  }

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

