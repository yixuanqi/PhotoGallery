// Three-Biome Warden Mini-Boss AI: Shuo (Wind), Ku (Forest), Lin (Mountain) (split from src/ai.js in v32.0)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY, DUMMY_MODES, WIND_ZONES, BOUNCE_PADS } from '../config.js';
import { G, addShake, triggerBossBanner, getCombatScaling, isPlayerInRoomId, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t, locBoss } from '../i18n.js';

/* ---------- BIOME WARDEN MINI-BOSSES (风 · 林 · 山) ---------- */
export function resetWardenState(e) {
  if (!e || !e.isMiniBoss) return;
  e.awake = false;
  e.state = 'idle';
  e.stateTimer = 0.65;
  e.phase = 1;
  e.hp = e.maxHp;
  e.posture = 0;
  e.postureDecayDelay = 0;
  e.vx = 0;
  e.vy = 0;
  if (typeof e.homeX === 'number') e.x = e.homeX;
  if (typeof e.homeY === 'number') e.y = e.homeY;
  e.facing = -1;
  e.didHit = false;
  e.shieldBrokenTimer = 0;
  e.stageEventTimer = 0;
  if (e.kind === 'warden_forest') e.barkArmor = true;
  if (G.wardenArenaFx) {
    G.wardenArenaFx.windDir = 0;
    G.wardenArenaFx.windTimer = 0;
    G.wardenArenaFx.blizzardAlpha = 0;
    G.wardenArenaFx.bellPulseTimer = 0;
  }
}

function shouldDisengageWarden(e, absDx, dy) {
  if (G.echoSession || !e || !e.awake) return false;
  if (e.roomId && !isPlayerInRoomId(e.roomId, 16)) return true;
  if (absDx > 760 || Math.abs(dy) > 360) return true;
  return false;
}

export function updateWardenWind(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7.5 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const dx = px - cx;
  const dy = py - cy;
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (!e.awake) {
    if (absDx < 420 && Math.abs(dy) < 220) {
      e.awake = true;
      e.state = 'stalk';
      e.stateTimer = 0.45;
      audio.playBellToll();
      triggerBossBanner(locBoss(e, 'name'), t('boss.wardenWind.awakeQuote'), '#7dd3fc', 2.4);
    }
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    if (e.cloak) updateCloak(e.cloak, cx - e.facing * 6, e.y + 18, e.facing, 0, dt);
    return;
  }
  if (shouldDisengageWarden(e, absDx, dy)) {
    resetWardenState(e);
    return;
  }

  if (e.phase === 1 && e.hp <= e.maxHp * 0.5) {
    e.phase = 2;
    e.state = 'recover';
    e.stateTimer = 0.65;
    e.stageEventTimer = 1.6;
    audio.playBellToll();
    addShake(11);
    spawnShockwave(cx, cy, 145, '#38bdf8', 4.5, 0.36);
    spawnParticles(cx, cy, 26, { color: '#bae6fd', speed: 260, spark: true, life: 0.48 });
    triggerBossBanner(locBoss(e, 'phase2Title'), t('boss.wardenWind.p2Quote'), '#38bdf8', 2.2);
  }
  // Phase 2 Exclusive Arena Mechanic: Reversing Gale Crosswind Surge (逆风狂澜)
  if (e.phase === 2 && G.wardenArenaFx) {
    if (G.wardenArenaFx.windTimer > 0) {
      G.wardenArenaFx.windTimer = Math.max(0, G.wardenArenaFx.windTimer - dt);
      const wDir = G.wardenArenaFx.windDir || 1;
      if (G.player && G.player.hp > 0 && G.player.grappleState === 'none' && G.player.dashTimer <= 0 && G.player.execTimer <= 0) {
        G.player.vx += wDir * (G.player.grounded ? 145 : 195) * dt;
      }
      if (G.wardenArenaFx.windTimer <= 0) G.wardenArenaFx.windDir = 0;
    } else {
      e.stageEventTimer = (e.stageEventTimer || 3.8) - dt;
      if (e.stageEventTimer <= 0) {
        e.stageEventTimer = 6.2;
        const nextDir = (e._lastWindDir || 1) * -1;
        e._lastWindDir = nextDir;
        G.wardenArenaFx.windDir = nextDir;
        G.wardenArenaFx.windTimer = 3.5;
        audio.playWindBlade();
        spawnFloatText(cx, e.y - 44, t(nextDir > 0 ? 'combat.wardenWindGaleE' : 'combat.wardenWindGaleW'), '#7dd3fc', 17, 1.25);
      }
    }
  }

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.3;
      e.posture = e.maxPosture * 0.26;
    }
  } else if (e.state === 'stalk' || e.state === 'idle') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 105) e.vx = e.facing * (e.phase === 2 ? 235 : 195);
    else e.vx *= damp(0.82, dt);

    if (e.stateTimer <= 0 && absDx < 460) {
      const r = Math.random();
      if (absDx > 195 || r < 0.30) {
        e.moveKind = 'updraftBarrage';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.52;
        e.vy = -340;
      } else if (r < 0.56) {
        e.moveKind = 'windDashCut';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.62;
        e.vx = -e.facing * 210;
        audio.playDangerAlert();
      } else {
        e.moveKind = 'galeCombo';
        e.comboIdx = 0;
        e.comboTotal = e.phase === 2 ? 3 : 2;
        e.windupDuration = 0.38;
      }
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = false;
      e.didHit = false;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.16) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.84, dt);
    if (e.moveKind === 'updraftBarrage') e.vy *= damp(0.86, dt);
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      if (e.moveKind === 'updraftBarrage') {
        e.stateTimer = 0.28;
        const count = e.phase === 2 ? 3 : 2;
        audio.playWindBlade();
        for (let k = 0; k < count; k++) {
          const spread = (k - (count - 1) * 0.5) * 0.22;
          const baseAng = Math.atan2(dy, dx) + spread;
          G.projectiles.push({
            owner: 'enemy',
            source: e,
            kind: 'windBlade',
            x: cx + e.facing * 18,
            y: cy - 6,
            vx: Math.cos(baseAng) * 385,
            vy: Math.sin(baseAng) * 385,
            r: 13,
            dmg: 18,
            posture: 26,
            life: 2.3,
            maxLife: 2.3,
            reflected: false,
            hitIds: new Set()
          });
        }
        spawnShockwave(cx, cy, 76, '#7dd3fc', 3.0, 0.24);
      } else if (e.moveKind === 'windDashCut') {
        e.stateTimer = 0.24;
        e.vx = e.facing * 620;
        audio.playSlash(0.84, true);
        G.slashes.push({ x: cx + e.facing * 32, y: cy, facing: e.facing, type: 'enemyRedThrust', life: 0.24, maxLife: 0.24 });
      } else {
        const isFin = e.comboIdx >= e.comboTotal - 1;
        e.stateTimer = isFin ? 0.22 : 0.16;
        e.vx = e.facing * (isFin ? 380 : 280);
        audio.playSlash(0.95 + e.comboIdx * 0.14, isFin);
        G.slashes.push({
          x: cx + e.facing * 28,
          y: cy - 2,
          facing: e.facing,
          type: e.comboIdx === 1 ? 'bossUpSweep' : (isFin ? 'bossSlam' : 'enemyThrust'),
          life: 0.21,
          maxLife: 0.21
        });
      }
    }
  } else if (e.state === 'strike') {
    e.vx *= damp(0.9, dt);
    if (e.moveKind !== 'updraftBarrage' && !e.didHit) {
      const isRed = e.moveKind === 'windDashCut';
      const reach = isRed ? 108 : 92;
      const hitBox = {
        x: cx + (e.facing > 0 ? -6 : -reach + 6),
        y: e.y + 6,
        w: reach,
        h: 62
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        const dmg = isRed ? 28 : (e.comboIdx >= e.comboTotal - 1 ? 24 : 18);
        applyIncomingAttackToPlayer(e, dmg, isRed, isRed ? 270 : 200);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.moveKind === 'galeCombo' && e.comboIdx < e.comboTotal - 1) {
        e.comboIdx++;
        e.state = 'windup';
        const isDel = e.comboIdx === e.comboTotal - 1 && e.phase === 2;
        e.isDelayedHit = isDel;
        e.windupDuration = isDel ? 0.58 : 0.26;
        e.stateTimer = e.windupDuration;
        e.didHit = false;
      } else {
        e.state = 'recover';
        e.stateTimer = e.phase === 2 ? 0.62 : 0.78;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.28;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (e.x < e.minX) { e.x = e.minX; if (e.vx < 0) e.vx = 0; }
  if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; if (e.vx > 0) e.vx = 0; }
  if (Math.abs(e.vx) > 15 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.05;
  if (e.cloak) updateCloak(e.cloak, cx - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.5, dt);
}

export function updateWardenForest(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.shieldBrokenTimer > 0) e.shieldBrokenTimer = Math.max(0, e.shieldBrokenTimer - dt);
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 6 * dt);

  e.pulsePhase = (e.pulsePhase || 0) + dt * 3.2;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const dx = px - cx;
  const dy = py - cy;
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (!e.awake) {
    if (absDx < 430 && Math.abs(dy) < 220) {
      e.awake = true;
      e.state = 'stalk';
      e.stateTimer = 0.55;
      audio.playBellToll();
      triggerBossBanner(locBoss(e, 'name'), t('boss.wardenForest.awakeQuote'), '#6ee7b7', 2.4);
    }
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    return;
  }
  if (shouldDisengageWarden(e, absDx, dy)) {
    resetWardenState(e);
    return;
  }

  if (e.phase === 1 && e.hp <= e.maxHp * 0.5) {
    e.phase = 2;
    e.state = 'recover';
    e.stateTimer = 0.72;
    e.stageEventTimer = 5.6;
    audio.playBellToll();
    addShake(12);
    spawnShockwave(cx, cy, 160, '#4ade80', 4.8, 0.38);
    G.sporeClouds.push({ x: cx - 105, y: e.y + e.h - 26, r: 78, life: 5.8, maxLife: 5.8, dmg: 11 });
    G.sporeClouds.push({ x: cx + 105, y: e.y + e.h - 26, r: 78, life: 5.8, maxLife: 5.8, dmg: 11 });
    triggerBossBanner(locBoss(e, 'phase2Title'), t('boss.wardenForest.p2Quote'), '#4ade80', 2.2);
  }
  // Phase 2 Exclusive Arena Mechanic: Hollow Bell-Tree Resonance Pulse summoning flank spores
  if (e.phase === 2 && e.state !== 'stagger') {
    e.stageEventTimer = (e.stageEventTimer || 6.8) - dt;
    if (e.stageEventTimer <= 0) {
      e.stageEventTimer = 7.4;
      audio.playBellToll();
      audio.playSporeBurst();
      addShake(8);
      if (G.wardenArenaFx) G.wardenArenaFx.bellPulseTimer = 0.75;
      spawnShockwave(cx, cy - 6, 185, '#6ee7b7', 4.2, 0.42);
      if (G.sporeClouds.length < 4) {
        const leftX = Math.max(e.minX + 40, cx - 145);
        const rightX = Math.min(e.maxX - 40, cx + 145);
        G.sporeClouds.push({ x: leftX, y: e.y + e.h - 24, r: 66, life: 5.0, maxLife: 5.0, dmg: 10 });
        G.sporeClouds.push({ x: rightX, y: e.y + e.h - 24, r: 66, life: 5.0, maxLife: 5.0, dmg: 10 });
      }
      spawnFloatText(cx, e.y - 46, t('combat.wardenForestBell'), '#6ee7b7', 18, 1.25);
    }
  }

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.4;
      e.posture = e.maxPosture * 0.28;
    }
  } else if (e.state === 'stalk' || e.state === 'idle') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 110) e.vx = e.facing * (e.phase === 2 ? 112 : 88);
    else e.vx *= damp(0.8, dt);

    if (e.stateTimer <= 0 && absDx < 450) {
      const r = Math.random();
      if (absDx > 175 || r < 0.34) {
        e.moveKind = 'vineWave';
        e.windupDuration = 0.66;
        audio.playDangerAlert();
      } else if (r < 0.64) {
        e.moveKind = 'sporeEruption';
        e.windupDuration = 0.68;
      } else {
        e.moveKind = 'rootSlam';
        e.windupDuration = 0.58;
      }
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.didHit = false;
      e.vx = 0;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.22) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.8, dt);
    if (Math.random() < 20 * dt) {
      spawnParticles(cx, cy, 1, {
        color: e.moveKind === 'vineWave' ? COLORS.crimsonBright : '#4ade80', speed: 85, grav: -50, life: 0.28
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      if (e.moveKind === 'vineWave') {
        e.stateTimer = 0.28;
        const fy = e.y + e.h;
        audio.playBellQuake();
        addShake(9);
        G.groundWaves.push({ x: cx + e.facing * 42, y: fy, minX: e.minX - 240, maxX: e.maxX + 240, vx: e.facing * 390, w: 40, h: 52, life: 2.0, hit: false, theme: 'vine' });
        if (e.phase === 2) {
          G.groundWaves.push({ x: cx - e.facing * 42, y: fy, minX: e.minX - 240, maxX: e.maxX + 240, vx: -e.facing * 360, w: 38, h: 48, life: 2.0, hit: false, theme: 'vine' });
        }
      } else if (e.moveKind === 'sporeEruption') {
        e.stateTimer = 0.28;
        audio.playSporeBurst();
        addShake(7);
        spawnShockwave(cx, cy + 12, 135, '#4ade80', 4.0, 0.34);
        const offsets = e.phase === 2 ? [-115, 0, 115] : [-82, 82];
        for (const ox of offsets) {
          G.sporeClouds.push({ x: cx + ox, y: e.y + e.h - 24, r: 74, life: 5.5, maxLife: 5.5, dmg: 11 });
        }
        spawnParticles(cx, cy, 28, { color: '#4ade80', speed: 200, grav: -30, life: 0.55 });
      } else {
        e.stateTimer = 0.24;
        e.vx = e.facing * 190;
        audio.playSlash(0.68, true);
        G.slashes.push({ x: cx + e.facing * 42, y: cy + 8, facing: e.facing, type: 'bossSlam', life: 0.26, maxLife: 0.26 });
      }
    }
  } else if (e.state === 'strike') {
    e.vx *= damp(0.88, dt);
    if (e.moveKind === 'rootSlam' && !e.didHit) {
      const reach = 114;
      const hitBox = {
        x: cx + (e.facing > 0 ? -8 : -reach + 8),
        y: e.y + 12,
        w: reach,
        h: 82
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 26, false, 260);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.moveKind === 'rootSlam') {
        addShake(8);
        spawnShockwave(cx + e.facing * 48, e.y + e.h - 4, 88, '#6ee7b7', 3.4, 0.26);
      }
      e.state = 'recover';
      e.stateTimer = e.phase === 2 ? 0.78 : 0.96;
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.38;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (e.x < e.minX) { e.x = e.minX; if (e.vx < 0) e.vx = 0; }
  if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; if (e.vx > 0) e.vx = 0; }
}

export function updateWardenMountain(e, dt) {
  if (e.hurtFlash > 0) e.hurtFlash -= dt;
  if (e.postureDecayDelay > 0) e.postureDecayDelay -= dt;
  else if (e.state !== 'stagger' && e.posture > 0) e.posture = Math.max(0, e.posture - 7.5 * dt);

  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const dx = px - cx;
  const dy = py - cy;
  const absDx = Math.abs(dx);
  e.stateTimer -= dt;

  if (!e.awake) {
    if (absDx < 430 && Math.abs(dy) < 220) {
      e.awake = true;
      e.state = 'stalk';
      e.stateTimer = 0.45;
      audio.playBellToll();
      triggerBossBanner(locBoss(e, 'name'), t('boss.wardenMountain.awakeQuote'), '#bae6fd', 2.4);
    }
    e.vy += GRAVITY * dt;
    moveAndCollide(e, dt, false);
    if (e.cloak) updateCloak(e.cloak, cx - e.facing * 6, e.y + 18, e.facing, 0, dt);
    return;
  }
  if (shouldDisengageWarden(e, absDx, dy)) {
    resetWardenState(e);
    return;
  }

  if (e.phase === 1 && e.hp <= e.maxHp * 0.5) {
    e.phase = 2;
    e.state = 'recover';
    e.stateTimer = 0.65;
    audio.playFrostShatter();
    addShake(12);
    spawnShockwave(cx, cy, 155, '#7dd3fc', 4.8, 0.38);
    spawnParticles(cx, cy, 30, { color: '#e0f2fe', speed: 270, spark: true, life: 0.5 });
    triggerBossBanner(locBoss(e, 'phase2Title'), t('boss.wardenMountain.p2Quote'), '#7dd3fc', 2.2);
  }
  // Phase 2 Exclusive Arena Mechanic: Summit Blizzard Visual & Long-Range Rime Chill
  if (e.phase === 2 && G.wardenArenaFx) {
    G.wardenArenaFx.blizzardAlpha = Math.min(1, (G.wardenArenaFx.blizzardAlpha || 0) + dt * 0.75);
    if (G.player && G.player.hp > 0 && absDx > 290 && e.state !== 'stagger') {
      // Gentle blizzard frost buildup if camping far away — rewards close-range parry duels
      const rsM = (G.worldState && G.player) ? 1 : 1;
      G.player.frostMeter = Math.min(96, (G.player.frostMeter || 0) + 4.2 * rsM * dt);
    }
  }

  if (e.state === 'stagger') {
    e.vx *= damp(0.85, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.32;
      e.posture = e.maxPosture * 0.26;
    }
  } else if (e.state === 'stalk' || e.state === 'idle') {
    e.facing = dx >= 0 ? 1 : -1;
    if (absDx > 108) e.vx = e.facing * (e.phase === 2 ? 215 : 175);
    else e.vx *= damp(0.82, dt);

    if (e.stateTimer <= 0 && absDx < 460) {
      const r = Math.random();
      if (absDx > 185 || r < 0.32) {
        e.moveKind = 'frostIai';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.66;
        audio.playIaiReady();
      } else if (r < 0.58) {
        e.moveKind = 'glacialThrust';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.64;
        e.vx = -e.facing * 170;
        audio.playDangerAlert();
      } else {
        e.moveKind = 'frostCombo';
        e.comboIdx = 0;
        e.comboTotal = e.phase === 2 ? 4 : 3;
        e.windupDuration = 0.40;
      }
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = false;
      e.didHit = false;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.18) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.82, dt);
    if (Math.random() < 22 * dt) {
      spawnParticles(cx + e.facing * 14, cy - 4, 1, {
        color: e.moveKind === 'glacialThrust' ? COLORS.crimsonBright : '#bae6fd', speed: 75, grav: -30, life: 0.24
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      if (e.moveKind === 'frostIai') {
        e.stateTimer = 0.24;
        e.vx = e.facing * 560;
        audio.playSlash(0.88, true);
        G.slashes.push({ x: cx + e.facing * 38, y: cy - 2, facing: e.facing, type: 'bossSlam', life: 0.24, maxLife: 0.24 });
        if (e.phase === 2) {
          G.projectiles.push({
            owner: 'enemy',
            source: e,
            kind: 'frostShard',
            x: cx + e.facing * 24,
            y: cy - 4,
            vx: e.facing * 430,
            vy: 0,
            r: 14,
            dmg: 20,
            posture: 28,
            inflictsFrost: 28,
            life: 2.0,
            maxLife: 2.0,
            reflected: false,
            hitIds: new Set()
          });
        }
      } else if (e.moveKind === 'glacialThrust') {
        e.stateTimer = 0.26;
        e.vx = e.facing * 580;
        audio.playSlash(0.72, true);
        G.slashes.push({ x: cx + e.facing * 36, y: cy, facing: e.facing, type: 'enemyRedThrust', life: 0.26, maxLife: 0.26 });
        if (e.phase === 2) {
          G.groundWaves.push({ x: cx + e.facing * 34, y: e.y + e.h, minX: e.minX - 180, maxX: e.maxX + 180, vx: e.facing * 410, w: 38, h: 48, life: 1.8, hit: false, theme: 'frost' });
        }
      } else {
        const isFin = e.comboIdx >= e.comboTotal - 1;
        e.stateTimer = isFin ? 0.22 : 0.16;
        e.vx = e.facing * (isFin ? 350 : 240);
        audio.playSlash(0.9 + e.comboIdx * 0.12, isFin);
        G.slashes.push({
          x: cx + e.facing * 30,
          y: cy - 2,
          facing: e.facing,
          type: e.comboIdx % 2 === 1 ? 'bossUpSweep' : (isFin ? 'bossSlam' : 'enemyThrust'),
          life: 0.22,
          maxLife: 0.22
        });
      }
    }
  } else if (e.state === 'strike') {
    e.vx *= damp(0.9, dt);
    if (!e.didHit) {
      const isRed = e.moveKind === 'glacialThrust';
      const reach = e.moveKind === 'frostIai' ? 124 : (isRed ? 114 : 98);
      const hitBox = {
        x: cx + (e.facing > 0 ? -6 : -reach + 6),
        y: e.y + 4,
        w: reach,
        h: 66
      };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        const dmg = isRed ? 30 : (e.moveKind === 'frostIai' ? 26 : (e.comboIdx >= e.comboTotal - 1 ? 25 : 20));
        applyIncomingAttackToPlayer(e, dmg, isRed, isRed ? 280 : 210);
      }
    }
    if (e.stateTimer <= 0) {
      if (e.moveKind === 'frostCombo' && e.comboIdx < e.comboTotal - 1) {
        e.comboIdx++;
        e.state = 'windup';
        const isDel = e.comboIdx === e.comboTotal - 1;
        e.isDelayedHit = isDel;
        e.windupDuration = isDel ? 0.60 : 0.28;
        e.stateTimer = e.windupDuration;
        e.didHit = false;
      } else {
        e.state = 'recover';
        e.stateTimer = e.phase === 2 ? 0.66 : 0.84;
      }
    }
  } else if (e.state === 'recover') {
    e.vx *= damp(0.84, dt);
    if (e.stateTimer <= 0) {
      e.state = 'stalk';
      e.stateTimer = 0.3;
    }
  }

  e.vy += GRAVITY * dt;
  moveAndCollide(e, dt, false);
  if (e.x < e.minX) { e.x = e.minX; if (e.vx < 0) e.vx = 0; }
  if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; if (e.vx > 0) e.vx = 0; }
  if (Math.abs(e.vx) > 15 && e.grounded) e.walkCycle = (e.walkCycle || 0) + dt * Math.abs(e.vx) * 0.05;
  if (e.cloak) updateCloak(e.cloak, cx - e.facing * 6, e.y + 18, e.facing, -e.vx * 0.5, dt);
}

