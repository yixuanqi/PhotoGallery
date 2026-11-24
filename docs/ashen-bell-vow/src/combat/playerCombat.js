// Player Weapon Equip, Grapple Targeting, Execution, Active Hitboxes & Attack Triggers (v32.0)
import {
  COLORS, RELICS, GRAPPLE_ANCHORS, PENDULUMS, VOID_BARRIERS, ABYSSAL_RIVERS, SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, FIRST_BELL_CORE_POS, ENEMY_ECHO_REWARDS, DUMMY_MODES, SEVEN_BELLS_ORDER, WORLD_SWITCHES_DEF, WIND_VANES, SWITCH_GATES, SLICK_WALLS
} from '../config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, isWorldPosExplored, getRelicStats, getActiveVowStats, getCombatScaling, getBladeDamageMult, getSmithPostureMult,
  getActiveWeaponId, getActiveWeapon, isWeaponUnlocked, getUnlockedWeaponIds, unlockWeapon,
  hasActiveWeaponTrait, isSkillNodeUnlocked, getSwitchStrikeWindowSec,
  getBossBonusDamageMult, hasKeeperBlessing,
  getPlayerMaxHp, getPlayerMaxSoul, getPlayerMaxFlasks, isWorldSwitchOn,
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
  reclaimLostEchoes, rallyPlayerGrayHp, damageEnemyHP, addPostureToEnemy, applyIncomingAttackToPlayer, applyEnemyHitFeel
} from './damageCombat.js';
import {
  tryQuellChapelTideByLantern, openSkywayShortcut, damageSecretWall, ringResonanceBell,
  activateWorldSwitch, toggleWindVane, triggerIcePillarDrop, severFoundryCrucible
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
  if (!G.player || !(G.worldState && G.worldState.abilities && G.worldState.abilities.grappleHook)) return null;
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
  for (const wv of WIND_VANES) { if (!(wv.roomId && G.roomOcclusion && G.roomOcclusion[wv.roomId] > 0.85)) evalCandidate('windVane', wv, wv.x, wv.y - 38, 0.94, null); }
  for (const ip of (G.worldState ? (G.worldState.icePillars || []) : [])) { if (ip.state === 'hanging' && !(ip.roomId && G.roomOcclusion && G.roomOcclusion[ip.roomId] > 0.85)) evalCandidate('icePillar', ip, ip.x, ip.topY + ip.len * 0.72, 0.92, null); }
  for (const cr of (G.foundryCrucibles || [])) { if (cr.state === 'hanging') evalCandidate('crucible', cr, cr.x, cr.y - 26, 0.86, null); }
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
  if (isSkillNodeUnlocked('exec_surge')) {
    G.player.surgeTimer = 1.6;
    G.player.dashCd = 0;
    G.player.grappleCd = 0;
    G.player.airJumpsLeft = 1;
    spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 46, t('combat.skillExecSurge'), COLORS.cyanBright, 17, 0.9);
  }

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

  // v45.2 Allow slicing incoming sticky webOrb projectiles cleanly out of the air!
  if (G.projectiles && G.projectiles.length > 0) {
    for (let pi = G.projectiles.length - 1; pi >= 0; pi--) {
      const pr = G.projectiles[pi];
      if (pr.kind === 'webOrb' && pr.owner === 'enemy' && aabbOverlap(box, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) {
        pr.life = 0;
        audio.playSlash(1.35, false);
        spawnParticles(pr.x, pr.y, 10, { color: '#6ee7b7', speed: 160, spark: true, life: 0.28 });
        spawnFloatText(pr.x, pr.y - 16, t('combat.webCut'), '#6ee7b7', 14, 0.65);
      }
    }
  }

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
      G.player.switchStrikeWindow = getSwitchStrikeWindowSec();
      triggerHaptic(atk.type === 'iai' || atk.type === 'counter' ? 'iai' : atk.heavy ? 'heavyHit' : 'lightHit');
      const isBigSkill = atk.type === 'iai' || atk.type === 'counter' || atk.type === 'grappleStrike';
      if (isBigSkill) triggerHitstop(0.036, true);
      else if (atk.heavy) triggerHitstop(0.018, true);
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

      // v45.1 Sentinel Braced Spear-Guard Counterplay (light frontal hit clangs -> counterThrust; heavy/back/pogo shatters guard!)
      if (foe.kind === 'sentinel' && foe.state === 'spearGuard') {
        if (!hitFromFront || canBreakShield || atk.type === 'pogo') {
          foe.state = 'recover';
          foe.stateTimer = 0.85;
          audio.playShieldBreak();
          triggerHaptic('shieldBreak');
          addShake(8);
          spawnImpactBurst(foe.x + foe.w * 0.5 + foe.facing * 16, foe.y + 30, 'parry', 0.92);
          spawnFloatText(foe.x + foe.w * 0.5, foe.y - 26, t('combat.spearGuardBreak'), COLORS.goldBright, 18, 0.95);
          damageEnemyHP(foe, finalDmg, true);
          addPostureToEnemy(foe, atk.posture + 26 + bonusPosture);
          continue;
        } else {
          audio.playParry(false);
          triggerHaptic('block');
          spawnImpactBurst(foe.x + foe.w * 0.5 + foe.facing * 18, foe.y + 30, 'block', 0.90);
          spawnFloatText(foe.x + foe.w * 0.5, foe.y - 26, t('combat.spearGuard'), COLORS.goldBright, 16, 0.85);
          G.player.vx = -G.player.facing * 170;
          foe.state = 'windup';
          foe.attackKind = 'counterThrust';
          foe.stateTimer = 0.36;
          foe.didHit = false;
          audio.playGlintCue(false);
          continue;
        }
      }

      // v45.1 Duelist 2-Hit Frontal Light-Spam Deflect -> Instant Parryable Counter-Iai!
      if (foe.kind === 'duelist' && hitFromFront && !atk.heavy && atk.type !== 'counter' && atk.type !== 'iai' &&
          foe.state !== 'stagger' && foe.state !== 'attack' && (foe.deflectCd || 0) <= 0) {
        foe.lightHitsTaken = (foe.lightHitsTaken || 0) + 1;
        foe.lightHitDecay = 1.5;
        if (foe.lightHitsTaken >= 2) {
          foe.lightHitsTaken = 0;
          foe.deflectCd = 3.6;
          foe.state = 'windup';
          foe.attackKind = 'counterIai';
          foe.stateTimer = 0.34;
          foe.didHit = false;
          foe.vx = -foe.facing * 95;
          audio.playParry(true, 1);
          audio.playGlintCue(false);
          triggerHaptic('parry', 0.85);
          spawnImpactBurst(foe.x + foe.w * 0.5 + foe.facing * 16, foe.y + 28, 'parry', 0.95);
          spawnFloatText(foe.x + foe.w * 0.5, foe.y - 30, t('combat.duelistDeflect'), COLORS.goldBright, 17, 0.90);
          G.player.vx = -G.player.facing * 165;
          addPostureToEnemy(foe, 10);
          continue;
        }
      }

      // v45.1 Fungus Spore-Inhale Interrupt (Heavy / Iai / Bell attacks purify & burst for +35% dmg & +42 posture!)
      if (foe.kind === 'fungus' && foe.inhalingSpore && foe.state === 'windup' && (atk.heavy || atk.type === 'iai' || atk.type === 'counter' || atk.weaponId === 'bell')) {
        foe.inhalingSpore = false;
        foe.sporeCd = 5.5;
        foe.state = 'recover';
        foe.stateTimer = 0.95;
        audio.playSporePurify();
        triggerHaptic('shieldBreak', 0.95);
        addShake(9);
        spawnShockwave(foe.x + foe.w * 0.5, foe.y + 24, 112, '#6ee7b7', 4.0, 0.32);
        spawnParticles(foe.x + foe.w * 0.5, foe.y + 24, 22, { color: '#6ee7b7', speed: 240, spark: true, life: 0.42 });
        spawnFloatText(foe.x + foe.w * 0.5, foe.y - 34, t('combat.sporeInterrupt'), '#6ee7b7', 19, 1.0);
        damageEnemyHP(foe, Math.round(finalDmg * 1.35), true);
        addPostureToEnemy(foe, atk.posture + 42 + bonusPosture);
        continue;
      }

      // v45.2 Cantor 2-Hit Quick Melee -> Sanctum Halo Repel Pushback + Brief Opening!
      if (foe.kind === 'cantor' && foe.state !== 'stagger' && (foe.repelCd || 0) <= 0) {
        foe.quickHits = (foe.quickHits || 0) + 1;
        foe.quickHitDecay = 1.6;
        if (foe.quickHits >= 2) {
          foe.quickHits = 0;
          foe.repelCd = 4.2;
          foe.state = 'recover';
          foe.stateTimer = 0.62;
          const pushDir = (G.player.x + G.player.w * 0.5) >= (foe.x + foe.w * 0.5) ? 1 : -1;
          G.player.vx = pushDir * 270;
          G.player.vy = Math.min(G.player.vy, -120);
          audio.playPogoLantern();
          addShake(6);
          spawnShockwave(foe.x + foe.w * 0.5, foe.y + foe.h * 0.45, 118, COLORS.goldBright, 3.8, 0.28);
          spawnFloatText(foe.x + foe.w * 0.5, foe.y - 30, t('combat.cantorRepel'), COLORS.goldBright, 17, 0.90);
        }
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
      } else if (atk.type === 'pogo' && foe.canopyThornTimer > 0 && (G.player.y + G.player.h) <= foe.y + 34) {
        audio.playParry(false);
        spawnShockwave(foe.x + foe.w * 0.5, foe.y + 8, 72, '#4ade80', 3.4, 0.24);
        spawnFloatText(foe.x + foe.w * 0.5, foe.y - 26, t('combat.thornPunish'), '#4ade80', 18, 0.9);
        G.player.vy = -260;
        G.player.vx = (G.player.x + G.player.w * 0.5 >= foe.x + foe.w * 0.5 ? 1 : -1) * 280;
        applyIncomingAttackToPlayer(foe, 14, true, 240);
        continue;
      } else {
        const isBossPogoDecay = atk.type === 'pogo' && (foe.isBoss || foe.isMiniBoss) && (G.player.pogoChain || 0) >= 2;
        const quakePosMult = (atk.weaponId === 'hammer' && hasActiveWeaponTrait('quake_echo') && (atk.type === 'slash2' || atk.type === 'iai' || atk.type === 'switch')) ? 1.22 : 1.0;
        const postureHit = (atk.posture + bonusPosture) * (atk.type === 'counter' && rs.synCoreCounter ? 1.5 : 1) * quakePosMult * (isBossPogoDecay ? 0.45 : 1.0);
        damageEnemyHP(foe, isBossPogoDecay ? Math.max(4, Math.round(finalDmg * 0.72)) : finalDmg, true);
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

      const rawKb = atk.knockbackVx || (atk.heavy ? 240 : 105);
      const kbMult = foe.isMiniBoss ? 0.42 : 1.0;
      const launchSpd = foe.isBoss ? 0 : rawKb * kbMult;
      if (!foe.isBoss && foe.state !== 'stagger') {
        foe.vx = G.player.facing * launchSpd;
        if (atk.knockupVy && foe.kind !== 'wraith' && foe.kind !== 'falcon' && !foe.isMiniBoss) foe.vy = Math.min(foe.vy, atk.knockupVy);
        else if (launchSpd >= 260 && foe.kind !== 'wraith' && foe.kind !== 'falcon' && !foe.isMiniBoss) foe.vy = Math.min(foe.vy, -135);
      }
      applyEnemyHitFeel(foe, atk.heavy || atk.type === 'iai' || atk.type === 'counter' || atk.type === 'grappleStrike', G.player.facing, foe.state === 'stagger' ? 0 : launchSpd);

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
        const onMajorFoe = !!(foe.isBoss || foe.isMiniBoss);
        if (onMajorFoe) {
          G.player.pogoChain = (G.player.pogoChain || 0) + 1;
          foe.pogoHitsTaken = (foe.pogoHitsTaken || 0) + 1;
          foe.overheadPressure = (foe.overheadPressure || 0) + 0.78;
        }
        const chain = onMajorFoe ? (G.player.pogoChain || 1) : 1;
        if (chain <= 2) {
          G.player.vy = -510;
          G.player.dashCd = 0;
          G.player.airJumpsLeft = 1;
          G.player.airHoverStalls = 0;
        } else {
          G.player.vy = chain === 3 ? -355 : -260;
          spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 24, t('combat.pogoFatigue'), '#cbd5e1', 15, 0.7);
        }
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
        G.player.pogoChain = 0;
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
        G.player.pogoChain = 0;
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

  // v41.6 Hollow Knight-Style Thorn-Spike Wall Pogo Bounce & Metallic Spark Recoil!
  if (SLICK_WALLS.length > 0) {
    for (let i = 0; i < SLICK_WALLS.length; i++) {
      const sw = SLICK_WALLS[i];
      if (atk.hitIds.has(sw.id)) continue;
      if (sw.roomId && G.roomOcclusion && G.roomOcclusion[sw.roomId] > 0.85) continue;
      let sx0 = sw.x - 14, swW = sw.w + 28;
      if (sw.side === 'left') { sx0 = sw.x - 14; swW = 20; }
      else if (sw.side === 'right') { sx0 = sw.x + sw.w - 6; swW = 20; }
      const spikeAtkBox = { x: sx0, y: sw.y - 6, w: swW, h: sw.h + 12 };
      if (!aabbOverlap(box, spikeAtkBox)) continue;

      atk.hitIds.add(sw.id);
      const isPogo = atk.type === 'pogo';
      const pushDir = sw.side === 'right' ? 1 : sw.side === 'left' ? -1 : (px >= sw.x + sw.w * 0.5 ? 1 : -1);
      const sparkX = pushDir > 0 ? (sw.x + sw.w + 6) : (sw.x - 6);
      const rawY = isPogo ? (G.player.y + G.player.h + 6) : (G.player.y + 26);
      const sparkY = Math.max(sw.y + 8, Math.min(sw.y + sw.h - 8, rawY));
      sw.clangFlash = 0.24;
      sw.clangY = sparkY;

      audio.playSpikeClang(isPogo);
      triggerHaptic(isPogo ? 'parry' : 'lightHit', isPogo ? 0.65 : 0.55);
      addShake(isPogo ? 3.8 : 2.8);
      spawnImpactBurst(sparkX, sparkY, 'parry', isPogo ? 0.72 : 0.56);
      spawnShockwave(sparkX, sparkY, isPogo ? 50 : 38, '#e2e8f0', isPogo ? 2.8 : 2.2, 0.17);
      const sprayAng = isPogo ? (pushDir > 0 ? -0.65 : Math.PI + 0.65) : (pushDir > 0 ? -0.25 : Math.PI + 0.25);
      spawnParticles(sparkX, sparkY, isPogo ? 14 : 11, {
        color: '#f8fafc', speed: isPogo ? 290 : 250, spark: true, bounce: true, grav: 520,
        angle: sprayAng, spread: 1.05, life: 0.30
      });
      spawnParticles(sparkX, sparkY, 7, {
        color: COLORS.goldBright, speed: 230, spark: true, bounce: true, grav: 480,
        angle: sprayAng, spread: 1.25, life: 0.28
      });

      if (isPogo && !atk.pogoBounced) {
        atk.pogoBounced = true;
        G.player.vy = -530;
        G.player.vx = pushDir * Math.max(155, Math.abs(G.player.vx) * 0.65);
        G.player.dashCd = 0;
        G.player.airJumpsLeft = 1;
        G.player.pogoChain = 0;
        G.player.bellAirStalls = 0;
        G.player.thornGraceTimer = Math.max(G.player.thornGraceTimer || 0, 0.18);
        G.player.squashX = 0.78;
        G.player.squashY = 1.26;
        triggerHitstop(0.026);
        kickCamera(pushDir * 2.5, 4.5);
      } else {
        G.player.iaiLungeTimer = 0;
        G.player.vx = pushDir * (atk.heavy ? 310 : 245);
        if (!G.player.grounded) G.player.vy = Math.min(G.player.vy, -135);
        G.player.thornGraceTimer = Math.max(G.player.thornGraceTimer || 0, 0.14);
        G.player.squashX = 0.86;
        G.player.squashY = 1.14;
        triggerHitstop(0.018);
        kickCamera(pushDir * 4.5, 0);
      }
      break;
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

  for (const wv of WIND_VANES) { if (!atk.hitIds.has(wv.id) && aabbOverlap(box, { x: wv.x - 24, y: wv.y - 64, w: 48, h: 64 })) { atk.hitIds.add(wv.id); toggleWindVane(wv); } }
  for (const ip of (G.worldState ? (G.worldState.icePillars || []) : [])) { if (ip.state === 'hanging' && !atk.hitIds.has(ip.id) && aabbOverlap(box, { x: ip.x - 26, y: ip.topY, w: 52, h: ip.len + 18 })) { atk.hitIds.add(ip.id); triggerIcePillarDrop(ip); } }
  for (const cr of (G.foundryCrucibles || [])) { if (cr.state === 'hanging' && !atk.hitIds.has(cr.id) && aabbOverlap(box, { x: cr.x - 32, y: cr.anchorY, w: 64, h: (cr.y - cr.anchorY) + 26 })) { atk.hitIds.add(cr.id); severFoundryCrucible(cr); } }
  for (const sw of WORLD_SWITCHES_DEF) { if (!atk.hitIds.has(sw.id) && aabbOverlap(box, { x: sw.x - 28, y: sw.y - 62, w: 56, h: 62 })) { atk.hitIds.add(sw.id); activateWorldSwitch(sw); } }
  for (const sg of SWITCH_GATES) {
    if (!isWorldSwitchOn(sg.switchKey) && !atk.hitIds.has(sg.id) && aabbOverlap(box, sg)) {
      atk.hitIds.add(sg.id); audio.playParry(false);
      spawnFloatText(sg.x + sg.w * 0.5, sg.y - 18, t('combat.oneWayGateLocked'), COLORS.goldBright, 16, 1.2);
    }
  }
  for (const bf of (G.worldState ? (G.worldState.breakableFloors || []) : [])) {
    if (!bf.broken && !atk.hitIds.has(bf.id) && aabbOverlap(box, { x: bf.x, y: bf.y - 10, w: bf.w, h: bf.h + 10 })) {
      atk.hitIds.add(bf.id); bf.shake = 0.22; audio.playParry(false);
      spawnFloatText(bf.x + bf.w * 0.5, bf.y - 26, t((G.worldState.abilities && G.worldState.abilities.bellDive) ? 'combat.diveFloorHintReady' : 'combat.diveFloorHintLocked'), bf.style === 'ice' ? '#bae6fd' : COLORS.goldBright, 16, 1.15);
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
  const isAirBell = weapon.id === 'bell' && !G.player.grounded;
  if (p.kind === 'bellHoming') {
    const useFour = weapon.id === 'bell' && hasActiveWeaponTrait('soul_gather') && count >= 3;
    const angles = useFour ? [-0.54, -0.18, 0.18, 0.54] : (count === 3 ? [-0.42, 0, 0.42] : (count === 2 ? [-0.26, 0.26] : [0]));
    const airTilt = isAirBell ? (G.player.facing > 0 ? 0.34 : -0.34) : 0;
    for (let i = 0; i < angles.length; i++) {
      const baseA = (G.player.facing > 0 ? 0 : Math.PI) + angles[i] + airTilt;
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
    const canSplit = hasEchoRing && (moveType === 'slash2' || moveType === 'slash3' || moveType === 'switch' || moveType === 'dashAttack');
    for (let i = 0; i < count; i++) {
      const offY = count > 1 ? (i === 0 ? -(p.spreadY || 14) : (p.spreadY || 14)) : 0;
      const offX = count > 1 ? (i * 14) : 0;
      G.projectiles.push({
        owner: 'player',
        kind: 'bellWave',
        x: px + G.player.facing * (24 + offX),
        y: py + offY,
        vx: G.player.facing * (isAirBell ? Math.round(spd * 0.94) : spd),
        vy: (isAirBell ? 175 : 0) + (count > 1 ? (i === 0 ? -42 : 42) : 0),
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
    G.player.shieldArmorTimer = Math.max(G.player.shieldArmorTimer || 0, move.guardArmor + (bulwark ? 0.08 : 0));
    // Floor at 0.45 (max 55% DR) so Hammer + Iron Bulwark rewards reading a single strike rather than facetanking full combos
    G.player.shieldArmorMult = Math.max(0.45, (move.armorMult || 0.5) * (bulwark ? 0.78 : 1.0));
  }
  if (move.lungeTimer) {
    G.player.iaiLungeTimer = move.lungeTimer;
  }
  if (move.lungeVx) {
    G.player.vx = G.player.facing * move.lungeVx;
  }

  // Tactile Audio, Squash, Camera & Special Effects per Archetype Move
  if (type === 'grappleStrike') {
    if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      addShake(12);
      punchZoom(1.04);
      spawnShockwave(px + G.player.facing * 32, py + 10, move.shockwaveR || 126, COLORS.goldBright, 4.4, 0.30);
    } else if (weaponId === 'bell') {
      audio.playBellChimeCast(3);
      addShake(6.5);
      G.player.vy = -210;
    } else {
      audio.playIaiSlash();
      addShake(8.5);
      punchZoom(1.042);
      spawnShockwave(px + G.player.facing * 24, py, 78, COLORS.cyanBright, 3.6, 0.24);
    }
    if (move.bonusSoul) {
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(move.bonusSoul * getRelicStats().soulGainMult));
    }
    G.player.squashX = weaponId === 'bell' ? 0.84 : 1.32;
    G.player.squashY = weaponId === 'bell' ? 1.22 : 0.76;
    triggerHaptic('iai', 0.95);
    if (move.floatKey) spawnFloatText(px, G.player.y - 34, t(move.floatKey), weaponId === 'blade' ? COLORS.cyanBright : weapon.color, 21, 0.88);
  } else if (type === 'switch') {
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
      if (!G.player.grounded) {
        G.player.vx = -G.player.facing * 255;
        G.player.vy = -255;
        G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.22);
        spawnShockwave(px, py + 12, 64, COLORS.cyanBright, 3.0, 0.24);
      }
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
      const iaiKey = (weaponId === 'bell' && !G.player.grounded) ? 'combat.bellAirVolley' : move.floatKey;
      spawnFloatText(px, G.player.y - 24, t(iaiKey), weaponId === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 21, 0.80);
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
  } else if (type === 'dashAttack') {
    if (weaponId === 'hammer') {
      audio.playShieldBash(true);
      addShake(9.5);
      kickCamera(G.player.facing * 7, 2);
      punchZoom(1.032);
      spawnShockwave(px + G.player.facing * 36, py + 8, move.shockwaveR || 104, COLORS.goldBright, 4.0, 0.26);
    } else if (weaponId === 'bell') {
      audio.playBellChimeCast(2);
      addShake(4.5);
    } else {
      audio.playIaiSlash();
      addShake(6.0);
      kickCamera(G.player.facing * 6, 0);
      punchZoom(1.024);
      spawnParticles(px, py, 10, { color: COLORS.cyanBright, speed: 220, spark: true, angle: G.player.facing > 0 ? Math.PI : 0, spread: 0.45, life: 0.26 });
    }
    G.player.squashX = 1.28;
    G.player.squashY = 0.78;
    triggerHaptic(weaponId === 'hammer' ? 'heavyHit' : 'lightHit', 0.9);
    if (move.floatKey) spawnFloatText(px, G.player.y - 26, t(move.floatKey), weaponId === 'blade' ? COLORS.cyanBright : weapon.color, 17, 0.65);
  } else if (type === 'air1' || type === 'air2') {
    const isSpin = type === 'air2';
    if (weaponId === 'bell') {
      if (isSpin) audio.playBellQuake();
      else audio.playBellChimeCast(2);
    } else if (weaponId === 'hammer') {
      audio.playSlash(isSpin ? 0.68 : 0.78, true);
      if (isSpin) {
        addShake(8.0);
        spawnShockwave(px, py, 108, COLORS.goldBright, 3.8, 0.26);
      }
    } else {
      audio.playSlash(isSpin ? 0.92 : 1.16, isSpin);
      if (isSpin) {
        addShake(5.5);
        punchZoom(1.022);
      }
    }
    if (isSpin && move.disperseOrbs) {
      const r = (move.box && move.box.radial) || 108;
      for (const pr of G.projectiles) {
        if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - px, pr.y - py) <= r + pr.r) {
          pr.life = 0;
          spawnParticles(pr.x, pr.y, 10, { color: COLORS.cyanBright, speed: 180, spark: true });
        }
      }
    }
    if (isSpin && move.bonusSoul) {
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(move.bonusSoul * getRelicStats().soulGainMult));
    }
    if (!G.player.grounded && (G.player.airHoverStalls || 0) < 2) {
      G.player.airHoverStalls = (G.player.airHoverStalls || 0) + 1;
      G.player.vy = Math.min(G.player.vy, isSpin ? -165 : -135);
    }
    G.player.squashX = isSpin ? 1.18 : 1.08;
    G.player.squashY = isSpin ? 0.86 : 0.94;
    if (isSpin && move.floatKey) spawnFloatText(px, G.player.y - 28, t(move.floatKey), weaponId === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 17, 0.68);
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

  // Bell Staff aerial micro-hover kite on airborne slash1/2/3 (capped at 3 stalls per jump)
  if (weaponId === 'bell' && !G.player.grounded && (type === 'slash1' || type === 'slash2' || type === 'slash3')) {
    if ((G.player.bellAirStalls || 0) < 3) {
      G.player.bellAirStalls = (G.player.bellAirStalls || 0) + 1;
      G.player.vy = Math.min(G.player.vy, -120);
      G.player.vx = -G.player.facing * 105;
      spawnParticles(px, G.player.y + G.player.h, 6, { color: COLORS.cyanBright, speed: 95, grav: 120, life: 0.22 });
    }
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
    followPlayer: type !== 'iai' && type !== 'counter' && type !== 'switch' && type !== 'grappleStrike',
    isIaiTrack: (type === 'iai' || type === 'switch' || type === 'grappleStrike') && weaponId === 'blade',
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



// ==================== v36.0 HAMMER AERIAL METEOR SLAM (镇渊钟锤 · 陨星坠) ====================
export function triggerHammerAirSlamImpact(empowered = false) {
  if (!G.player) return;
  const px = G.player.x + G.player.w * 0.5;
  const fy = G.player.y + G.player.h;
  const rs = getRelicStats();
  const bladeMult = getBladeDamageMult();
  const radius = empowered ? 185 : 148;
  const dmg = Math.round((empowered ? 64 : 46) * bladeMult * (rs.aerialDmgMult || 1.0));
  const posDmg = Math.round((empowered ? 58 : 44) * (hasActiveWeaponTrait('quake_echo') ? 1.22 : 1.0));

  audio.playAirSlam();
  triggerHaptic('execution', empowered ? 1.15 : 0.95);
  triggerHitstop(empowered ? 0.036 : 0.022, true);
  addShake(empowered ? 15 : 11);
  kickCamera(0, empowered ? 10 : 7);
  punchZoom(empowered ? 1.048 : 1.032);

  G.player.squashX = 1.38;
  G.player.squashY = 0.68;
  G.player.landCrouch = 1.0;
  G.player.attackCd = 0.24;
  G.player.switchStrikeWindow = getSwitchStrikeWindowSec();
  G.player.shieldArmorTimer = Math.max(G.player.shieldArmorTimer || 0, 0.22);

  spawnShockwave(px, fy - 6, radius, COLORS.goldBright, empowered ? 5.6 : 4.4, 0.36);
  spawnShockwave(px, fy - 6, radius * 0.62, '#fef9c3', 3.4, 0.26);
  spawnParticles(px, fy - 4, empowered ? 32 : 22, { color: COLORS.goldBright, speed: 340, spark: true, bounce: true, grav: 580, life: 0.48 });
  spawnParticles(px, fy - 4, 16, { color: COLORS.parchment, speed: 240, grav: 440, life: 0.42 });
  G.slashes.push({ x: px, y: fy - 24, facing: G.player.facing, type: 'hammerQuake', life: 0.32, maxLife: 0.32 });
  spawnFloatText(px, G.player.y - 34, t(empowered ? 'combat.hammerAirSlamFull' : 'combat.hammerAirSlam'), COLORS.goldBright, empowered ? 22 : 19, 0.95);

  const foes = getLivingFoes();
  for (let i = 0; i < foes.length; i++) {
    const foe = foes[i];
    const fx = foe.x + foe.w * 0.5;
    const fyFoe = foe.y + foe.h * 0.5;
    if (Math.abs(fx - px) <= radius + foe.w * 0.4 && Math.abs(fyFoe - (fy - 24)) <= 105) {
      const dir = fx >= px ? 1 : -1;
      if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
        foe.shieldBrokenTimer = foe.kind === 'warden_forest' ? 4.5 : 3.0;
        if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
        audio.playShieldBreak();
        spawnFloatText(fx, foe.y - 26, foe.kind === 'warden_forest' ? t('combat.barkBreak') : t('combat.shieldBreak'), COLORS.goldBright, 19, 0.95);
      }
      damageEnemyHP(foe, dmg, true);
      addPostureToEnemy(foe, posDmg + (rs.frostShatterPosture || 0));
      rallyPlayerGrayHp(18);
      G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(14 * rs.soulGainMult));
      const launchSpd = foe.isBoss ? 0 : (foe.isMiniBoss ? 220 : (empowered ? 480 : 410));
      if (!foe.isBoss && foe.state !== 'stagger') {
        foe.vx = dir * launchSpd;
        if (foe.kind !== 'wraith' && foe.kind !== 'falcon' && !foe.isMiniBoss) foe.vy = Math.min(foe.vy, empowered ? -280 : -230);
      }
      applyEnemyHitFeel(foe, true, dir, foe.state === 'stagger' ? 0 : launchSpd);
      spawnHitMark(fx, fyFoe, dir * 0.4, COLORS.goldBright, 96, 8);
    }
  }

  // Twin seismic waves when empowered or with quake_echo trait!
  if (empowered || hasActiveWeaponTrait('quake_echo')) {
    const wDmg = Math.round((empowered ? 30 : 22) * bladeMult);
    spawnHammerWaveDir(px, 1, wDmg, 28, 520, 0.52);
    spawnHammerWaveDir(px, -1, wDmg, 28, 520, 0.52);
  }

  // Crack secret walls, clear enemy projectiles, ring nearby puzzle bells & lanterns
  if (G.worldState) {
    for (const w of G.worldState.secretWalls) {
      if (!w.broken && Math.hypot((w.x + w.w * 0.5) - px, (w.y + w.h * 0.5) - (fy - 20)) <= radius + 24) {
        damageSecretWall(w, 3);
      }
    }
  }
  for (const pr of G.projectiles) {
    if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - px, pr.y - (fy - 20)) <= radius + pr.r) pr.life = 0;
  }
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      for (const b of pz.bells) {
        if (Math.hypot(b.x - px, b.y - (fy - 20)) <= radius + 40) ringResonanceBell(pz, b, b.x >= px ? 1 : -1);
      }
    }
  }
}
