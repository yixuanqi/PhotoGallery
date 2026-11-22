// World Combat Interactions: Lantern Tide Quell, Secret Walls, Puzzles, Bell-Quake, Pickups & Ultimates (v32.0)
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
  const isWetConduct = !!(G.player && G.player.wetTimer > 0);
  const radius = Math.round(168 * rs.spellRadiusMult * (isWetConduct ? 1.18 : 1.0));
  const dmg = Math.round(38 * rs.spellDmgMult * (isWetConduct ? 1.15 : 1.0));
  const posDmg = Math.round((32 + rs.spellPostureBonus) * (isWetConduct ? 1.15 : 1.0));

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
  spawnFloatText(px, G.player.y - 36, isWetConduct ? t('combat.bellQuakeWet') : t('combat.bellQuake'), COLORS.cyanBright, 20, isWetConduct ? 0.98 : 0.78);

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
      if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
        foe.shieldBrokenTimer = foe.kind === 'warden_forest' ? 4.5 : 2.6;
        if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
        if (foe.kind === 'warden_forest') audio.playBarkCrack();
        else audio.playShieldBreak();
        spawnFloatText(tx, foe.y - 26, foe.kind === 'warden_forest' ? t('combat.barkBreak') : t('combat.quakeShieldBreak'), foe.kind === 'warden_forest' ? '#6ee7b7' : COLORS.cyanBright, 19, 0.95);
      }
      damageEnemyHP(foe, dmg, true);
      addPostureToEnemy(foe, posDmg);
      rallyPlayerGrayHp(14);
      spawnHitMark(tx, ty, -Math.PI * 0.5, COLORS.cyanBright, 96, 8);
      if (!foe.isBoss && foe.state !== 'stagger') {
        foe.vx = (tx >= px ? 1 : -1) * (foe.isMiniBoss ? 95 : 210);
        if (foe.kind !== 'wraith' && foe.kind !== 'falcon' && !foe.isMiniBoss) foe.vy = Math.min(foe.vy, -180);
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

  // Purify & disperse toxic spore clouds inside Bell-Quake radius!
  if (G.sporeClouds && G.sporeClouds.length > 0) {
    let cleared = 0;
    for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
      const sc = G.sporeClouds[si];
      if (Math.hypot(sc.x - px, sc.y - py) <= radius + sc.r) {
        spawnShockwave(sc.x, sc.y, sc.r * (rs.synSporeClapper ? 1.55 : 0.9), rs.synSporeClapper ? '#4ade80' : COLORS.cyanBright, rs.synSporeClapper ? 4.2 : 2.8, 0.30);
        spawnParticles(sc.x, sc.y, rs.synSporeClapper ? 24 : 14, { color: '#6ee7b7', speed: 220, spark: true, life: 0.42 });
        if (rs.synSporeClapper) {
          for (const foe of getLivingFoes()) {
            if (Math.hypot((foe.x + foe.w * 0.5) - sc.x, (foe.y + foe.h * 0.5) - sc.y) <= sc.r + 115) {
              damageEnemyHP(foe, 38, true);
              addPostureToEnemy(foe, 26);
            }
          }
          G.player.hp = Math.min(G.player.maxHp, G.player.hp + 10);
        }
        G.sporeClouds.splice(si, 1);
        cleared++;
      }
    }
    if (cleared > 0) {
      audio.playSporePurify();
      if (rs.sporePurifySoul > 0) {
        G.player.soul = Math.min(G.player.maxSoul, G.player.soul + cleared * rs.sporePurifySoul);
      }
      if (rs.sporePurifyHeal > 0) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + cleared * rs.sporePurifyHeal);
      }
      spawnFloatText(px, G.player.y - 54, rs.synSporeClapper ? t('combat.synSporeClapper') : t('combat.sporeCleared'), '#6ee7b7', 18, 0.95);
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
      if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || (foe.kind === 'boss2' && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
        foe.shieldBrokenTimer = foe.kind === 'warden_forest' ? 4.2 : 2.4;
        if (foe.kind === 'boss2') foe.shieldUp = false;
        if (foe.kind === 'warden_forest') audio.playBarkCrack();
        else audio.playShieldBreak();
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
  if (G.sporeClouds) {
    let miniCleared = 0;
    for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
      const sc = G.sporeClouds[si];
      if (Math.hypot(sc.x - cx, sc.y - cy) <= radius + sc.r) {
        spawnParticles(sc.x, sc.y, 12, { color: '#6ee7b7', speed: 170, spark: true, life: 0.32 });
        G.sporeClouds.splice(si, 1);
        miniCleared++;
      }
    }
    if (miniCleared > 0) {
      audio.playSporePurify();
      if (rs.sporePurifySoul > 0 && G.player) G.player.soul = Math.min(G.player.maxSoul, G.player.soul + miniCleared * rs.sporePurifySoul);
      if (rs.sporePurifyHeal > 0 && G.player) G.player.hp = Math.min(G.player.maxHp, G.player.hp + miniCleared * rs.sporePurifyHeal);
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


// ==================== v25.0 FULL-SEAL WEAPON RESONANCE ULTIMATES ====================
export function triggerWeaponResonanceUltimate() {
  if (!G.player || G.player.hp <= 0 || G.player.seals < G.player.maxSeals) return false;
  const weaponId = getActiveWeaponId();
  const ult = getWeaponUltimateDef(weaponId);
  const usedSeals = G.player.seals;
  const sealScale = usedSeals >= 4 ? 1.25 : 1.0;

  G.player.seals = 0;
  G.player.parryActive = false;
  G.player.activeAttack = null;
  G.player.isCharging = false;
  G.player.chargeTime = 0;
  G.player.chargeReadyPlayed = false;
  G.player.sealLunge = null;
  G.player.detonateLungeTimer = 0;

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + 26;
  const bladeMult = getBladeDamageMult();
  const rs = getRelicStats();
  if (!Array.isArray(G.weaponUltimates)) G.weaponUltimates = [];

  if (weaponId === 'hammer') {
    // ② 镇渊 · 巨钟镇岳: Colossal descending cracked bronze Great Bell slam!
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.56);
    G.player.attackTimer = 0.36;
    G.player.attackDuration = 0.36;
    G.player.attackCd = 0.36;
    G.player.squashX = 1.28;
    G.player.squashY = 0.76;
    const dropX = Math.max(48, px + G.player.facing * 124);
    const groundY = getGroundSurfaceY(dropX, G.player.y + G.player.h - 24);
    audio.playUltimateHammer();
    triggerHaptic('execution', 1.15);
    triggerHitstop(0.055, true);
    addShake(15);
    punchZoom(1.052);
    G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
    const augGale = !!rs.hasGalefather;
    const augSpore = !!rs.hasSporeseal;
    const augFrost = !!rs.hasFrostcore;
    if (augGale) { G.player.dashCd = 0; G.player.airJumpsLeft = 1; G.player.grappleCd = 0; }
    G.weaponUltimates.push({
      kind: 'hammer_bell',
      x: dropX,
      y: groundY - 340,
      groundY,
      startY: groundY - 340,
      life: 1.05,
      maxLife: 1.05,
      dropDur: 0.24,
      elapsed: 0,
      impacted: false,
      dmg: Math.round(105 * bladeMult * sealScale),
      posture: Math.round(92 * sealScale * (augFrost ? 1.30 : 1.0)),
      waveDmg: Math.round(42 * bladeMult * sealScale),
      augGale, augSpore, augFrost
    });
    const hTag = augFrost ? t('combat.ultAugFrost') : augSpore ? t('combat.ultAugSpore') : augGale ? t('combat.ultAugGale') : '';
    spawnFloatText(px, G.player.y - 42, hTag ? `${t('combat.ultHammer')} · ${hTag}` : t('combat.ultHammer'), augFrost ? '#bae6fd' : augSpore ? '#6ee7b7' : COLORS.goldBright, 24, 1.3);
  } else if (weaponId === 'bell') {
    // ③ 引魂 · 万铃镇魂域: 4.2s Harmonic Sanctum pulsing 5 times!
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.45);
    G.player.castTimer = 0.30;
    G.player.squashX = 0.82;
    G.player.squashY = 1.24;
    audio.playUltimateBell();
    triggerHaptic('shieldBreak', 1.0);
    triggerHitstop(0.04, true);
    addShake(10);
    punchZoom(1.042);
    G.screenFlash = { alpha: 0.20, color: COLORS.cyanBright };
    const augGale = !!rs.hasGalefather;
    const augSpore = !!rs.hasSporeseal;
    const augFrost = !!rs.hasFrostcore;
    const sancR = Math.round(215 * rs.spellRadiusMult * (augSpore ? 1.24 : 1.0));
    G.weaponUltimates.push({
      kind: 'bell_sanctum',
      x: px,
      y: py,
      radius: sancR,
      life: augGale ? 4.4 : 4.2,
      maxLife: augGale ? 4.4 : 4.2,
      pulseTimer: 0.04,
      pulseInterval: augGale ? 0.62 : 0.78,
      pulsesLeft: augGale ? 6 : 5,
      pulseDmg: Math.round(28 * rs.spellDmgMult * bladeMult * sealScale),
      pulsePosture: Math.round(24 * sealScale * (augFrost ? 1.30 : 1.0)),
      dartDmg: Math.round(22 * rs.spellDmgMult * bladeMult * sealScale),
      augGale, augSpore, augFrost
    });
    spawnShockwave(px, py, sancR, augSpore ? '#6ee7b7' : augFrost ? '#bae6fd' : COLORS.cyanBright, 4.8, 0.40);
    const bTag = augSpore ? t('combat.ultAugSpore') : augFrost ? t('combat.ultAugFrost') : augGale ? t('combat.ultAugGale') : '';
    spawnFloatText(px, G.player.y - 42, bTag ? `${t('combat.ultBell')} · ${bTag}` : t('combat.ultBell'), augSpore ? '#6ee7b7' : augFrost ? '#bae6fd' : COLORS.cyanBright, 24, 1.3);
  } else {
    // ① 灰钟 · 次元十闪: 5 rapid staggered dimensional cross-cuts locking nearby foes!
    G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.58);
    G.player.attackTimer = 0.38;
    G.player.attackDuration = 0.38;
    G.player.attackCd = 0.34;
    G.player.vx = G.player.facing * 240;
    G.player.vy = Math.min(0, G.player.vy);
    G.player.squashX = 1.32;
    G.player.squashY = 0.76;
    rallyPlayerGrayHp(999);
    audio.playUltimateBlade();
    triggerHaptic('execution', 1.1);
    triggerHitstop(0.058, true);
    addShake(14);
    punchZoom(1.055);
    G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };

    const foes = getLivingFoes()
      .filter(f => Math.hypot((f.x + f.w * 0.5) - px, (f.y + f.h * 0.5) - py) <= 360)
      .sort((a, b) => Math.hypot((a.x + a.w * 0.5) - px, (a.y + a.h * 0.5) - py) - Math.hypot((b.x + b.w * 0.5) - px, (b.y + b.h * 0.5) - py));

    const anchorX = px + G.player.facing * 120;
    const anchorY = py - 8;
    const augGale = !!rs.hasGalefather;
    const augSpore = !!rs.hasSporeseal;
    const augFrost = !!rs.hasFrostcore;
    if (augGale) { G.player.dashCd = 0; G.player.airJumpsLeft = 1; }
    G.weaponUltimates.push({
      kind: 'blade_dimension',
      x: anchorX,
      y: anchorY,
      facing: G.player.facing,
      life: augGale ? 0.78 : 0.68,
      maxLife: augGale ? 0.78 : 0.68,
      cutTimer: 0.01,
      cutsDone: 0,
      cutsTotal: augGale ? 7 : 5,
      cutStep: augGale ? 0.068 : 0.085,
      targets: foes.slice(0, augGale ? 7 : 5),
      cutDmg: Math.round(26 * bladeMult * rs.heavySkillMult * sealScale),
      cutPosture: Math.round(22 * sealScale * (augFrost ? 1.35 : 1.0)),
      ribbons: [],
      augGale, augSpore, augFrost
    });
    const dTag = augGale ? t('combat.ultAugGale') : augFrost ? t('combat.ultAugFrost') : augSpore ? t('combat.ultAugSpore') : '';
    spawnFloatText(px, G.player.y - 42, dTag ? `${t('combat.ultBlade')} · ${dTag}` : t('combat.ultBlade'), augFrost ? '#bae6fd' : augGale ? '#7dd3fc' : ult.color, 24, 1.3);
  }

  if (G.boss4 && G.boss4.alive && G.boss4.awake && hooks.triggerBoss4UltimateReaction) {
    hooks.triggerBoss4UltimateReaction(weaponId);
  }
  checkAchievements({ ultimateCast: true });
  hooks.syncHUD(true);
  return true;
}
