// Player Weapon Equip, Grapple Targeting, Execution, Active Hitboxes & Attack Triggers (v32.0)
import {
  COLORS, RELICS, GRAPPLE_ANCHORS, PENDULUMS, VOID_BARRIERS, ABYSSAL_RIVERS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, ENEMY_ECHO_REWARDS, DUMMY_MODES, SEVEN_BELLS_ORDER
} from '../config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, isWorldPosExplored, getRelicStats, getActiveVowStats, getCombatScaling, getBladeDamageMult, getSmithPostureMult,
  getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  hasActiveWeaponTrait,
  getBossBonusDamageMult, hasKeeperBlessing,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks,
  scheduleOutcome, addShake, kickCamera, punchZoom, triggerBossBanner, triggerHitstop
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
import {
  reclaimLostEchoes, rallyPlayerGrayHp, damageEnemyHP, addPostureToEnemy
} from './damageCombat.js';
import {
  tryQuellChapelTideByLantern, openSkywayShortcut, damageSecretWall, ringResonanceBell
} from './worldCombat.js';

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
    if (f.isDummy && !f.active) continue;
    if (f.roomId && G.roomOcclusion && G.roomOcclusion[f.roomId] > 0.85) continue;
    evalCandidate('enemy', f, f.x + f.w * 0.5, f.y + f.h * 0.35, f.kind === 'priest' ? 0.78 : f.kind === 'wraith' ? 0.88 : 1.05, null);
  }
  if (G.boss && G.boss.alive && G.boss.awake) evalCandidate('enemy', G.boss, G.boss.x + G.boss.w * 0.5, G.boss.y + G.boss.h * 0.35, 1.05, null);
  if (G.boss2 && G.boss2.alive && G.boss2.awake) evalCandidate('enemy', G.boss2, G.boss2.x + G.boss2.w * 0.5, G.boss2.y + G.boss2.h * 0.35, 1.05, null);
  if (G.boss3 && G.boss3.alive && G.boss3.awake) evalCandidate('enemy', G.boss3, G.boss3.x + G.boss3.w * 0.5, G.boss3.y + G.boss3.h * 0.35, 1.05, null);
  if (G.boss4 && G.boss4.alive && G.boss4.awake) evalCandidate('enemy', G.boss4, G.boss4.x + G.boss4.w * 0.5, G.boss4.y + G.boss4.h * 0.35, 1.05, null);

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
  const reachMult = (weaponId === 'blade' && type === 'slash3' && hasActiveWeaponTrait('shadow_twin')) ? 1.16 : 1.0;
  const fwd = Math.round(b.fwd * reachMult);
  const w = fwd + b.back;
  return {
    x: px + (G.player.facing > 0 ? -b.back : -fwd),
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
      const isBarkArmorUp = (foe.kind === 'warden_forest' && foe.barkArmor && foe.shieldBrokenTimer <= 0 && foe.state !== 'stagger');
      const isGolemShieldUp = isBarkArmorUp || ((foe.kind === 'golem' && foe.state !== 'stagger' && foe.shieldBrokenTimer <= 0 &&
        (foe.state === 'patrol' || foe.state === 'chase' || foe.state === 'recover')) ||
        ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp && foe.state !== 'stagger' && foe.shieldBrokenTimer <= 0));
      const hitFromFront = (G.player.x + G.player.w / 2 - (foe.x + foe.w / 2)) * foe.facing > 0;
      const rs = getRelicStats();
      const isFrostHeavy = (atk.heavy || atk.type === 'iai' || atk.type === 'counter' || atk.type === 'slash3');
      const canBreakShield = !!atk.breaksShield || atk.type === 'iai' || atk.type === 'slash3' || atk.type === 'counter' || (isBarkArmorUp && atk.type === 'pogo') || (rs.synFrostIron && isFrostHeavy);
      const bypassShield = !isBarkArmorUp && (atk.type === 'pogo' || !hitFromFront);

      let finalDmg = Math.round(atk.dmg * getBladeDamageMult());
      if ((atk.type === 'iai' || atk.type === 'counter') && rs.heavySkillMult > 1) {
        finalDmg = Math.round(finalDmg * rs.heavySkillMult);
      }
      if (rs.aerialDmgMult > 1 && (!G.player.grounded || atk.type === 'pogo' || atk.type === 'up')) {
        finalDmg = Math.round(finalDmg * rs.aerialDmgMult);
      }
      let bonusPosture = 0;
      if (rs.synGaleThread && G.player.galeSurgeTimer > 0) {
        G.player.galeSurgeTimer = 0;
        finalDmg = Math.round(finalDmg * 1.30);
        bonusPosture += 16;
        audio.playWindBlade();
        spawnShockwave(foe.x + foe.w / 2, foe.y + foe.h * 0.45, 82, '#7dd3fc', 3.4, 0.24);
        spawnFloatText(foe.x + foe.w / 2, foe.y - 42, t('combat.synGaleThread'), '#bae6fd', 18, 0.9);
      }
      if (rs.frostShatterPosture > 0 && isFrostHeavy) {
        const fPos = Math.round(rs.frostShatterPosture * (rs.synFrostIron ? 1.35 : 1.0));
        bonusPosture += fPos;
        audio.playFrostShatter();
        spawnShockwave(foe.x + foe.w / 2, foe.y + foe.h * 0.45, rs.synFrostIron ? 105 : 68, '#bae6fd', 3.6, 0.26);
        spawnParticles(foe.x + foe.w / 2, foe.y + foe.h * 0.45, rs.synFrostIron ? 18 : 10, { color: '#e0f2fe', speed: 240, spark: true, life: 0.36 });
        if (rs.synFrostIron) {
          spawnFloatText(foe.x + foe.w / 2, foe.y - 44, t('combat.synFrostIron'), '#e0f2fe', 19, 0.95);
        }
      }
      if (foe.kind === 'leech' && (atk.type === 'up' || foe.state === 'cling' || foe.state === 'telegraph' || foe.state === 'drop')) {
        finalDmg = Math.round(finalDmg * 1.45);
        spawnFloatText(foe.x + foe.w / 2, foe.y - 30, t('combat.ambushCut'), COLORS.cyanBright, 16, 0.75);
      }

      if (isGolemShieldUp && !bypassShield) {
        if (canBreakShield) {
          foe.shieldBrokenTimer = isBarkArmorUp ? 4.5 : 2.6;
          if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
          if (isBarkArmorUp) audio.playBarkCrack();
          else audio.playShieldBreak();
          triggerHaptic('shieldBreak');
          addShake(9);
          spawnImpactBurst(foe.x + foe.w / 2 + foe.facing * 18, foe.y + 38, 'parry', 0.95);
          spawnFloatText(foe.x + foe.w / 2, foe.y - 26, isBarkArmorUp ? t('combat.barkBreak') : (foe.isDummy ? t('combat.dummyBreakOk') : t('combat.shieldBreak')), isBarkArmorUp ? '#6ee7b7' : COLORS.goldBright, 20, 1.0);
          damageEnemyHP(foe, finalDmg, true);
          addPostureToEnemy(foe, (atk.posture + 24 + bonusPosture) * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1));
        } else {
          // Light attack clangs off bronze greatshield or ancient bark armor!
          audio.playParry(false);
          triggerHaptic('block');
          spawnImpactBurst(foe.x + foe.w / 2 + foe.facing * 20, foe.y + 38, 'block', 0.85);
          spawnFloatText(foe.x + foe.w / 2, foe.y - 24, isBarkArmorUp ? t('combat.barkBlocked') : t('combat.shieldBlocked'), isBarkArmorUp ? '#86efac' : '#cbd5e1', 15, 0.9);
          damageEnemyHP(foe, Math.max(3, Math.round(finalDmg * (isBarkArmorUp ? 0.36 : 0.2))), true);
          addPostureToEnemy(foe, isBarkArmorUp ? 6 : 4);
          if (!isBarkArmorUp) G.player.vx = -G.player.facing * 155;
          continue;
        }
      } else {
        const quakePosMult = (atk.weaponId === 'hammer' && hasActiveWeaponTrait('quake_echo') && (atk.type === 'slash2' || atk.type === 'iai' || atk.type === 'switch')) ? 1.22 : 1.0;
        const postureHit = (atk.posture + bonusPosture) * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1) * quakePosMult;
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
      if (atk.type === 'counter' && atk.weaponId === 'blade' && hasActiveWeaponTrait('parry_seal') && !atk.sealRefunded) {
        atk.sealRefunded = true;
        if (G.player.seals < G.player.maxSeals) G.player.seals++;
        G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(18 * rs.soulGainMult));
        spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 44, t('combat.traitParrySeal'), COLORS.goldBright, 17, 0.85);
      }
      rallyPlayerGrayHp(atk.rally);
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round((atk.heavy ? 24 : 14) * rs.soulGainMult));

      if (!foe.isBoss && foe.state !== 'stagger') {
        const kbMult = foe.isMiniBoss ? 0.42 : 1.0;
        foe.vx = G.player.facing * (atk.knockbackVx || (atk.heavy ? 180 : 95)) * kbMult;
        if (atk.knockupVy && foe.kind !== 'wraith' && foe.kind !== 'falcon' && !foe.isMiniBoss) foe.vy = Math.min(foe.vy, atk.knockupVy);
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

function spawnHammerWaveDir(px, dir, dmg, posture, speed = 520, life = 0.56) {
  G.projectiles.push({
    owner: 'player',
    kind: 'hammerWave',
    x: px + dir * 32,
    y: G.player.y + G.player.h - 14,
    vx: dir * speed,
    vy: 0,
    r: 28,
    dmg,
    posture,
    heavy: true,
    breaksShield: true,
    soulOnHit: 10,
    life,
    maxLife: life,
    facing: dir,
    hitIds: new Set()
  });
}

function spawnWeaponMoveProjectiles(weapon, move, px, py, moveType = '') {
  const p = move.projectile;
  if (!p) return;
  const rs = getRelicStats();
  const bladeMult = getBladeDamageMult();
  const count = p.count || 1;
  const dmg = Math.round(p.dmg * bladeMult * (p.kind === 'bellHoming' ? rs.heavySkillMult : 1));
  if (p.kind === 'bellHoming') {
    const useFour = weapon.id === 'bell' && hasActiveWeaponTrait('soul_gather') && count >= 3;
    const angles = useFour ? [-0.54, -0.18, 0.18, 0.54] : (count === 3 ? [-0.42, 0, 0.42] : [0]);
    for (let i = 0; i < angles.length; i++) {
      const baseA = (G.player.facing > 0 ? 0 : Math.PI) + angles[i];
      G.projectiles.push({
        owner: 'player',
        kind: 'bellHoming',
        x: px + G.player.facing * 22,
        y: py - 4 + (i - (angles.length - 1) * 0.5) * 9,
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
    const posAmt = Math.round((p.posture || 30) * (hasActiveWeaponTrait('quake_echo') ? 1.22 : 1.0));
    spawnHammerWaveDir(px, G.player.facing, dmg, posAmt, p.speed, p.life || 0.62);
    if (hasActiveWeaponTrait('quake_echo')) {
      spawnHammerWaveDir(px, -G.player.facing, Math.round(dmg * 0.85), Math.round(posAmt * 0.9), p.speed * 0.92, (p.life || 0.62) * 0.88);
    }
  } else if (p.kind === 'bellWave') {
    const hasEchoRing = weapon.id === 'bell' && hasActiveWeaponTrait('echo_ring');
    const spd = Math.round(p.speed * (hasEchoRing ? 1.20 : 1.0));
    const canSplit = hasEchoRing && (moveType === 'slash2' || moveType === 'slash3' || moveType === 'switch');
    for (let i = 0; i < count; i++) {
      const offY = count > 1 ? (i === 0 ? -(p.spreadY || 14) : (p.spreadY || 14)) : 0;
      const offX = count > 1 ? (i * 14) : 0;
      G.projectiles.push({
        owner: 'player',
        kind: 'bellWave',
        x: px + G.player.facing * (24 + offX),
        y: py + offY,
        vx: G.player.facing * spd,
        vy: count > 1 ? (i === 0 ? -38 : 38) : 0,
        r: Math.round((p.r || 16) * rs.spellRadiusMult),
        dmg,
        posture: p.posture || 10,
        heavy: !!p.heavy,
        breaksShield: !!p.breaksShield,
        soulOnHit: p.soulOnHit || 8,
        splitDart: canSplit,
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
    const bulwark = weaponId === 'hammer' && hasActiveWeaponTrait('iron_bulwark');
    G.player.shieldArmorTimer = Math.max(G.player.shieldArmorTimer || 0, move.guardArmor + (bulwark ? 0.16 : 0));
    G.player.shieldArmorMult = (move.armorMult || 0.5) * (bulwark ? 0.65 : 1.0);
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

  // Spawn Bell Staff harmonic rings / homing darts / Hammer waves
  spawnWeaponMoveProjectiles(weapon, move, px, py, type);

  // Hammer trait `quake_echo`: slash2 & switch also unleash bidirectional seismic waves!
  if (weaponId === 'hammer' && hasActiveWeaponTrait('quake_echo') && (type === 'slash2' || type === 'switch')) {
    const qDmg = Math.round(24 * getBladeDamageMult());
    const qPos = 28;
    spawnHammerWaveDir(px, G.player.facing, qDmg, qPos, 490, 0.50);
    spawnHammerWaveDir(px, -G.player.facing, qDmg, qPos, 490, 0.50);
  }

  // Blade trait `shadow_twin`: Iai Flash & Switch Strike leave an ink-shadow blade that cuts again 0.24s later!
  if (weaponId === 'blade' && hasActiveWeaponTrait('shadow_twin') && (type === 'iai' || type === 'switch')) {
    if (!Array.isArray(G.delayedStrikes)) G.delayedStrikes = [];
    G.delayedStrikes.push({
      x: px + G.player.facing * 72,
      y: py,
      facing: G.player.facing,
      timer: 0.24,
      maxTimer: 0.24,
      dmg: Math.round((type === 'iai' ? 30 : 22) * getBladeDamageMult()),
      posture: type === 'iai' ? 24 : 18
    });
  }

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

