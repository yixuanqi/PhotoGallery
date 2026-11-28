// Three-Biome Warden Mini-Boss AI: Shuo (Wind), Ku (Forest), Lin (Mountain) (v33.0 Anti-Air & 5-Move Expanded)
import { COLORS, FLOOR_Y, WELL_BOTTOM_Y, GRAVITY, DUMMY_MODES, WIND_ZONES, BOUNCE_PADS } from '../config.js';
import { G, addShake, triggerBossBanner, getCombatScaling, isPlayerInRoomId, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide, getGroundSurfaceY } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t, locBoss } from '../i18n.js';
import { spawnArenaHazard, clearArenaHazards, hasActiveArenaHazard } from '../arenaHazards.js';

function tickWardenOverheadPressure(e, dt) {
  if (e.antiAirCd > 0) e.antiAirCd = Math.max(0, e.antiAirCd - dt);
  if (e.canopyThornTimer > 0) e.canopyThornTimer = Math.max(0, e.canopyThornTimer - dt);
  if (!G.player || G.player.hp <= 0) return false;
  const px = G.player.x + G.player.w * 0.5;
  const pFootY = G.player.y + G.player.h;
  const cx = e.x + e.w * 0.5;
  const overhead = pFootY < e.y + 20 && Math.abs(px - cx) < 132;
  if (overhead) {
    e.overheadPressure = (e.overheadPressure || 0) + dt * 1.55;
  } else {
    e.overheadPressure = Math.max(0, (e.overheadPressure || 0) - dt * 0.72);
    if (G.player.grounded && e.pogoHitsTaken > 0) e.pogoHitsTaken = 0;
  }
  return e.antiAirCd <= 0 && (e.overheadPressure >= 0.68 || (e.pogoHitsTaken || 0) >= 2);
}

function consumeWardenAntiAirTrigger(e, cd = 3.2) {
  e.overheadPressure = 0;
  e.pogoHitsTaken = 0;
  e.antiAirCd = cd;
}

function tickWardenGreedPressure(e, dt, absDx) {
  if (e.greedPunishCd > 0) e.greedPunishCd = Math.max(0, e.greedPunishCd - dt);
  if (e.greedDecayTimer > 0) {
    e.greedDecayTimer = Math.max(0, e.greedDecayTimer - dt);
  } else if (e.greedHits > 0) {
    e.greedHits = Math.max(0, e.greedHits - dt * 1.4);
  }
  return e.greedPunishCd <= 0 && (e.greedHits || 0) >= 4 && absDx < 165;
}

function consumeWardenGreedTrigger(e, cd = 5.4) {
  e.greedHits = 0;
  e.greedDecayTimer = 0;
  e.greedPunishCd = cd;
}

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
  e.overheadPressure = 0;
  e.antiAirCd = 0;
  e.pogoHitsTaken = 0;
  e.canopyThornTimer = 0;
  e.greedHits = 0;
  e.greedDecayTimer = 0;
  e.greedPunishCd = 0;
  e.rootSpikeQueue = null;
  e.signatureOpened = false;
  clearArenaHazards(e);
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

  const wantsAntiAir = tickWardenOverheadPressure(e, dt);
  const wantsGreedPunish = tickWardenGreedPressure(e, dt, absDx);

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

    if (wantsAntiAir) {
      consumeWardenAntiAirTrigger(e, 3.0);
      e.moveKind = 'galeUppercut';
      e.comboIdx = 0;
      e.comboTotal = 1;
      e.windupDuration = 0.42;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = false;
      e.glintPlayed = false;
      e.didHit = false;
      e.vx = 0;
      audio.playWindBlade();
      spawnFloatText(cx, e.y - 36, t('combat.antiAirWind'), '#7dd3fc', 16, 0.85);
    } else if (e.stateTimer <= 0 && absDx < 560) {
      // v47.4 Wind Warden 'Shuo' Signature Kit: Opening Gale Tornado + Aerial Wind-Blade Fan + Repelling Back-Leap!
      const hasTornado = hasActiveArenaHazard('galeTornado', e);
      const r = Math.random();
      if (!e.signatureOpened) {
        e.signatureOpened = true;
        e.moveKind = 'galeTornado';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.54;
        e.vx = 0;
        audio.playWindBlade();
        spawnFloatText(cx, e.y - 46, t('combat.windTornadoWarn'), '#7dd3fc', 18, 1.15);
      } else if (wantsGreedPunish) {
        consumeWardenGreedTrigger(e, 5.2);
        if (G.player && G.player.hp > 0) {
          G.player.vx = (dx >= 0 ? 1 : -1) * 320;
          G.player.vy = Math.min(G.player.vy, -190);
        }
        audio.playWindBlade();
        spawnShockwave(cx, cy, 132, '#7dd3fc', 4.0, 0.28);
        e.moveKind = !hasTornado ? 'galeTornado' : 'windRetreatVolley';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = e.moveKind === 'galeTornado' ? 0.46 : 0.34;
        e.vx = -e.facing * 310;
        e.vy = -290;
        spawnFloatText(cx, e.y - 46, t('combat.windTornadoWarn'), '#7dd3fc', 18, 1.05);
      } else if (!hasTornado && e.lastMoveKind !== 'galeTornado' && r < 0.34) {
        e.moveKind = 'galeTornado';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.54;
        e.vx = 0;
        audio.playWindBlade();
        spawnFloatText(cx, e.y - 46, t('combat.windTornadoWarn'), '#7dd3fc', 18, 1.1);
      } else if (absDx < 115 && r < 0.50) {
        e.moveKind = 'windRetreatVolley';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.34;
        e.vx = -e.facing * 310;
        e.vy = -310;
      } else if (absDx > 185 || r < 0.68) {
        e.moveKind = 'updraftBarrage';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.50;
        e.vy = -380;
      } else if (r < 0.84) {
        e.moveKind = 'windDashCut';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.58;
        e.vx = -e.facing * 210;
        audio.playDangerAlert();
      } else {
        e.moveKind = 'galeCombo';
        e.comboIdx = 0;
        e.comboTotal = e.phase === 2 ? 3 : 2;
        e.windupDuration = 0.38;
      }
      e.lastMoveKind = e.moveKind;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = false;
      e.glintPlayed = false;
      e.didHit = false;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.16) e.facing = dx >= 0 ? 1 : -1;
    if (e.moveKind !== 'windRetreatVolley') e.vx *= damp(0.84, dt);
    if (e.moveKind === 'updraftBarrage' || e.moveKind === 'windRetreatVolley') e.vy *= damp(0.86, dt);
    if (e.moveKind !== 'windDashCut' && !e.glintPlayed && e.stateTimer <= 0.22) {
      e.glintPlayed = true;
      audio.playGlintCue(e.isDelayedHit);
    }
    if (e.moveKind === 'galeUppercut' && Math.random() < 26 * dt) {
      spawnParticles(cx, e.y - 6, 1, { color: '#7dd3fc', speed: 95, grav: -180, life: 0.24 });
    }
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      const windBias = (e.phase === 2 && G.wardenArenaFx && G.wardenArenaFx.windTimer > 0) ? (G.wardenArenaFx.windDir * 55) : 0;
      if (e.moveKind === 'galeUppercut') {
        e.stateTimer = 0.30;
        e.vy = -590;
        e.vx = e.facing * 185;
        audio.playSlash(1.12, true);
        audio.playWindBlade();
        spawnShockwave(cx, cy - 20, 96, '#7dd3fc', 3.6, 0.26);
        G.slashes.push({ x: cx + e.facing * 12, y: e.y - 16, facing: e.facing, type: 'bossAntiAir', life: 0.28, maxLife: 0.28 });
      } else if (e.moveKind === 'galeTornado') {
        e.stateTimer = 0.42;
        const fy = e.y + e.h;
        const dir = dx >= 0 ? 1 : -1;
        const tSpd = e.phase === 2 ? 205 : 170;
        audio.playWindBlade();
        addShake(7);
        spawnShockwave(cx, cy, 108, '#7dd3fc', 3.6, 0.28);
        spawnArenaHazard({
          kind: 'galeTornado', owner: e, x: Math.max(e.minX + 60, Math.min(e.maxX - 60, cx + dir * 72)), y: fy,
          vx: dir * tSpd, minX: e.minX + 42, maxX: e.maxX - 42, w: 68, h: 265,
          telegraph: 0.72, activeDur: 3.6, fadeDur: 0.36, dmg: 20
        });
        if (e.phase === 2) {
          spawnArenaHazard({
            kind: 'galeTornado', owner: e, x: Math.max(e.minX + 60, Math.min(e.maxX - 60, cx - dir * 82)), y: fy,
            vx: -dir * (tSpd * 0.92), minX: e.minX + 42, maxX: e.maxX - 42, w: 64, h: 250,
            telegraph: 0.84, activeDur: 3.4, fadeDur: 0.36, dmg: 18
          });
        }
      } else if (e.moveKind === 'updraftBarrage' || e.moveKind === 'windRetreatVolley') {
        e.stateTimer = 0.28;
        const count = e.moveKind === 'windRetreatVolley' ? 3 : (e.phase === 2 ? 5 : 3);
        audio.playWindBlade();
        for (let k = 0; k < count; k++) {
          const spread = (k - (count - 1) * 0.5) * 0.24;
          const baseAng = Math.atan2(dy, dx) + spread;
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'windBlade',
            x: cx + e.facing * 18, y: cy - 6,
            vx: Math.cos(baseAng) * 395 + windBias, vy: Math.sin(baseAng) * 395,
            r: 13, dmg: 20, posture: 26, life: 2.3, maxLife: 2.3, reflected: false, hitIds: new Set()
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
          x: cx + e.facing * 28, y: cy - 2, facing: e.facing,
          type: e.comboIdx === 1 ? 'bossUpSweep' : (isFin ? 'bossSlam' : 'enemyThrust'),
          life: 0.21, maxLife: 0.21
        });
      }
    }
  } else if (e.state === 'strike') {
    e.vx *= damp(0.9, dt);
    if (e.moveKind !== 'updraftBarrage' && e.moveKind !== 'windRetreatVolley' && e.moveKind !== 'galeTornado' && !e.didHit) {
      if (e.moveKind === 'galeUppercut') {
        const aaBox = { x: cx - 64, y: e.y - 68, w: 128, h: 126 };
        if (aabbOverlap(aaBox, G.player)) {
          e.didHit = true;
          applyIncomingAttackToPlayer(e, 26, false, 260);
        }
      } else {
        const isRed = e.moveKind === 'windDashCut';
        const reach = isRed ? 108 : 92;
        const hitBox = { x: cx + (e.facing > 0 ? -6 : -reach + 6), y: e.y + 6, w: reach, h: 62 };
        if (aabbOverlap(hitBox, G.player)) {
          e.didHit = true;
          const dmg = isRed ? 32 : (e.comboIdx >= e.comboTotal - 1 ? 26 : 22);
          applyIncomingAttackToPlayer(e, dmg, isRed, isRed ? 270 : 200);
        }
      }
    }
    if (e.stateTimer <= 0) {
      if (e.moveKind === 'galeCombo' && e.comboIdx < e.comboTotal - 1) {
        e.comboIdx++;
        e.state = 'windup';
        const isDel = e.comboIdx === e.comboTotal - 1 && e.phase === 2;
        e.isDelayedHit = isDel;
        e.glintPlayed = false;
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

  if (Array.isArray(e.rootSpikeQueue) && e.rootSpikeQueue.length > 0) {
    for (let i = e.rootSpikeQueue.length - 1; i >= 0; i--) {
      const sp = e.rootSpikeQueue[i];
      sp.timer -= dt;
      if (Math.random() < 24 * dt) {
        spawnParticles(sp.x, sp.y - 4, 1, { color: '#4ade80', speed: 60, grav: -110, life: 0.25 });
      }
      if (sp.timer <= 0) {
        audio.playBarkCrack();
        addShake(5.5);
        spawnShockwave(sp.x, sp.y - 12, 68, '#4ade80', 3.4, 0.26);
        spawnParticles(sp.x, sp.y - 26, 16, { color: '#6ee7b7', speed: 220, grav: 160, life: 0.42 });
        G.groundWaves.push({ x: sp.x, y: sp.y, minX: e.minX - 60, maxX: e.maxX + 60, vx: 0, w: 44, h: 74, life: 0.28, hit: false, theme: 'vine' });
        e.rootSpikeQueue.splice(i, 1);
      }
    }
  }

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

  const wantsAntiAir = tickWardenOverheadPressure(e, dt);
  const wantsGreedPunish = tickWardenGreedPressure(e, dt, absDx);

  if (e.phase === 1 && e.hp <= e.maxHp * 0.5) {
    e.phase = 2;
    e.state = 'recover';
    e.stateTimer = 0.72;
    e.stageEventTimer = 5.6;
    audio.playBellToll();
    addShake(12);
    spawnShockwave(cx, cy, 160, '#4ade80', 4.8, 0.38);
    G.sporeClouds.push({ x: cx - 105, y: e.y + e.h - 26, r: 78, life: 5.8, maxLife: 5.8, dmg: 13 });
    G.sporeClouds.push({ x: cx + 105, y: e.y + e.h - 26, r: 78, life: 5.8, maxLife: 5.8, dmg: 13 });
    triggerBossBanner(locBoss(e, 'phase2Title'), t('boss.wardenForest.p2Quote'), '#4ade80', 2.2);
  }
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
        G.sporeClouds.push({ x: leftX, y: e.y + e.h - 24, r: 66, life: 5.0, maxLife: 5.0, dmg: 12 });
        G.sporeClouds.push({ x: rightX, y: e.y + e.h - 24, r: 66, life: 5.0, maxLife: 5.0, dmg: 12 });
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

    if (e.phase === 2 && e.shieldBrokenTimer > 0 && G.sporeClouds && G.sporeClouds.length >= 2 && e.stateTimer <= 0) {
      const sc = G.sporeClouds.pop();
      e.shieldBrokenTimer = 0;
      e.hp = Math.min(e.maxHp, e.hp + 26);
      audio.playSporeBurst();
      spawnShockwave(cx, cy, 118, '#6ee7b7', 3.8, 0.34);
      spawnParticles(sc.x, sc.y, 14, { color: '#6ee7b7', speed: 180, grav: -40, life: 0.4 });
      spawnFloatText(cx, e.y - 44, t('combat.wardenForestAbsorb'), '#6ee7b7', 17, 1.1);
      e.stateTimer = 0.55;
    } else if (wantsAntiAir) {
      consumeWardenAntiAirTrigger(e, 3.4);
      e.moveKind = 'canopyThorns';
      e.windupDuration = 0.46;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.didHit = false;
      e.vx = 0;
      audio.playDangerAlert();
      spawnFloatText(cx, e.y - 48, t('combat.antiAirForest'), '#4ade80', 17, 0.9);
    } else if (e.stateTimer <= 0 && absDx < 520) {
      // v47.0 Forest Warden 'Ku' Signature Kit: Opening Thorn Carpet + Destructible Bramble Cage + Tracking Root Spikes!
      const hasCage = hasActiveArenaHazard('brambleCage', e);
      const hasCarpet = hasActiveArenaHazard('thornCarpet', e);
      const r = Math.random();
      if (wantsGreedPunish) {
        consumeWardenGreedTrigger(e, 5.2);
        if (G.player && G.player.hp > 0) {
          G.player.vx = (dx >= 0 ? 1 : -1) * 340;
          G.player.vy = Math.min(G.player.vy, -180);
        }
        audio.playBarkCrack();
        spawnShockwave(cx, cy, 132, '#4ade80', 4.2, 0.28);
        e.moveKind = !hasCage ? 'brambleCage' : (!hasCarpet ? 'thornCarpet' : 'canopyThorns');
        e.windupDuration = 0.44;
        audio.playDangerAlert();
        spawnFloatText(cx, e.y - 52, t('combat.forestCageWarn'), '#6ee7b7', 18, 1.05);
      } else if (!e.signatureOpened) {
        e.signatureOpened = true;
        e.moveKind = 'thornCarpet';
        e.windupDuration = 0.54;
        audio.playDangerAlert();
        spawnFloatText(cx, e.y - 52, t('combat.forestCarpetWarn'), '#4ade80', 18, 1.05);
      } else if (!hasCage && e.lastMoveKind !== 'brambleCage' && r < 0.34) {
        e.moveKind = 'brambleCage';
        e.windupDuration = 0.52;
        audio.playDangerAlert();
        spawnFloatText(cx, e.y - 52, t('combat.forestCageWarn'), '#6ee7b7', 18, 1.05);
      } else if (!hasCarpet && e.lastMoveKind !== 'thornCarpet' && r < 0.58) {
        e.moveKind = 'thornCarpet';
        e.windupDuration = 0.56;
        audio.playDangerAlert();
        spawnFloatText(cx, e.y - 52, t('combat.forestCarpetWarn'), '#4ade80', 18, 1.05);
      } else if (e.lastMoveKind !== 'rootEruption' && r < 0.78) {
        e.moveKind = 'rootEruption';
        e.windupDuration = 0.54;
        audio.playDangerAlert();
      } else if (r < 0.90) {
        e.moveKind = 'sporeEruption';
        e.windupDuration = 0.62;
      } else {
        e.moveKind = 'rootSlam';
        e.windupDuration = 0.54;
      }
      e.lastMoveKind = e.moveKind;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.didHit = false;
      e.vx = 0;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.22) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.8, dt);
    if (Math.random() < 22 * dt) {
      spawnParticles(cx, e.moveKind === 'canopyThorns' ? (e.y - 8) : cy, 1, {
        color: (e.moveKind === 'vineWave' || e.moveKind === 'canopyThorns') ? COLORS.crimsonBright : '#4ade80', speed: 85, grav: -60, life: 0.28
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      if (e.moveKind === 'canopyThorns') {
        e.stateTimer = 0.30;
        e.canopyThornTimer = 3.2;
        audio.playBarkCrack();
        audio.playSporeBurst();
        addShake(9);
        spawnShockwave(cx, e.y - 14, 138, '#4ade80', 4.4, 0.32);
        spawnParticles(cx, e.y - 16, 26, { color: '#6ee7b7', speed: 240, grav: -60, life: 0.45 });
        G.slashes.push({ x: cx, y: e.y - 24, facing: e.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
        if (G.sporeClouds.length < 4) {
          G.sporeClouds.push({ x: cx, y: e.y - 42, r: 66, life: 3.6, maxLife: 3.6, dmg: 12 });
        }
      } else if (e.moveKind === 'thornCarpet') {
        e.stateTimer = 0.34;
        const fy = e.y + e.h;
        const spanW = e.phase === 2 ? 430 : 350;
        const minC = e.minX + 18;
        const maxC = Math.max(minC, e.maxX - spanW - 18);
        const tx = Math.max(minC, Math.min(maxC, px - spanW * 0.5));
        audio.playBellQuake();
        addShake(8);
        spawnArenaHazard({
          kind: 'thornCarpet', owner: e, x: tx, y: fy, w: spanW, h: 30,
          telegraph: 0.72, activeDur: e.phase === 2 ? 6.0 : 5.2, fadeDur: 0.42, dmg: 14
        });
      } else if (e.moveKind === 'brambleCage') {
        e.stateTimer = 0.42;
        const fy = e.y + e.h;
        const hw = 96;
        const cageX = Math.max(e.minX + hw + 28, Math.min(e.maxX - hw - 28, px));
        audio.playBarkCrack();
        addShake(7);
        spawnArenaHazard({
          kind: 'brambleCage', owner: e, cx: cageX, y: fy, halfW: hw, h: 148, wallW: 18,
          hp: e.phase === 2 ? 64 : 52, telegraph: 0.78, activeDur: 4.8, fadeDur: 0.35
        });
        spawnArenaHazard({
          kind: 'rootSpike', owner: e, x: cageX, y: fy, w: 54, h: 122,
          telegraph: 1.55, activeDur: 0.46, fadeDur: 0.26, dmg: 28
        });
      } else if (e.moveKind === 'rootEruption') {
        e.stateTimer = 0.36;
        const fy = e.y + e.h;
        audio.playBellQuake();
        addShake(8);
        const cnt = e.phase === 2 ? 4 : 3;
        for (let k = 0; k < cnt; k++) {
          const sx = Math.max(e.minX + 36, Math.min(e.maxX - 36, px + (k - (cnt - 1) * 0.5) * 96));
          spawnArenaHazard({
            kind: 'rootSpike', owner: e, x: sx, y: fy, w: 46, h: 112,
            telegraph: 0.56 + k * 0.22, activeDur: 0.42, fadeDur: 0.25, dmg: 24
          });
        }
      } else if (e.moveKind === 'vineWave') {
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
          G.sporeClouds.push({ x: cx + ox, y: e.y + e.h - 24, r: 74, life: 5.5, maxLife: 5.5, dmg: 13 });
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
    if (e.moveKind === 'canopyThorns' && !e.didHit) {
      // Full thorny bramble burst hits both overhead pogo AND close-range facetankers!
      const aaBox = { x: cx - 96, y: e.y - 78, w: 192, h: 176 };
      if (aabbOverlap(aaBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 36, true, 295);
      }
    } else if (e.moveKind === 'rootSlam' && !e.didHit) {
      const reach = 114;
      const hitBox = { x: cx + (e.facing > 0 ? -8 : -reach + 8), y: e.y + 12, w: reach, h: 82 };
      if (aabbOverlap(hitBox, G.player)) {
        e.didHit = true;
        applyIncomingAttackToPlayer(e, 28, false, 260);
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

  const wantsAntiAir = tickWardenOverheadPressure(e, dt);
  const wantsGreedPunish = tickWardenGreedPressure(e, dt, absDx);

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
  if (e.phase === 2 && G.wardenArenaFx) {
    G.wardenArenaFx.blizzardAlpha = Math.min(1, (G.wardenArenaFx.blizzardAlpha || 0) + dt * 0.75);
    if (G.player && G.player.hp > 0 && absDx > 290 && e.state !== 'stagger') {
      G.player.frostMeter = Math.min(96, (G.player.frostMeter || 0) + 4.2 * dt);
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

    if (wantsAntiAir) {
      consumeWardenAntiAirTrigger(e, 3.0);
      e.moveKind = 'frostPillarRise';
      e.comboIdx = 0;
      e.comboTotal = 1;
      e.windupDuration = 0.44;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = false;
      e.glintPlayed = false;
      e.didHit = false;
      e.vx = 0;
      audio.playFrostBuild();
      spawnFloatText(cx, e.y - 38, t('combat.antiAirMountain'), '#bae6fd', 17, 0.9);
    } else if (e.stateTimer <= 0 && absDx < 560) {
      // v47.4 Mountain Warden 'Lin' Signature Kit: Opening Floating Frost-Sword Array + Persistent Frost Domain + Frost-Blink!
      const hasFrostField = hasActiveArenaHazard('frostPatch', e);
      const r = Math.random();
      if (!e.signatureOpened) {
        e.signatureOpened = true;
        e.moveKind = 'frostSwordArray';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.52;
        e.vx = 0;
        audio.playFrostBuild();
        spawnFloatText(cx, e.y - 46, t('combat.frostSwordArrayWarn'), '#bae6fd', 18, 1.15);
      } else if (wantsGreedPunish) {
        consumeWardenGreedTrigger(e, 5.2);
        // Glacial shatter blink: repels facetanker, flashes to opposite side & summons Floating Frost-Sword Array!
        if (G.player && G.player.hp > 0) {
          G.player.vx = (dx >= 0 ? 1 : -1) * 320;
        }
        audio.playFrostShatter();
        audio.playShadowBlink();
        spawnShockwave(cx, cy, 138, '#bae6fd', 4.2, 0.28);
        const midM = (e.minX + e.maxX) * 0.5;
        const destM = px < midM ? (e.maxX - 210) : (e.minX + 160);
        e.x = Math.max(e.minX + 24, Math.min(e.maxX - e.w - 24, destM));
        e.facing = px >= (e.x + e.w * 0.5) ? 1 : -1;
        e.moveKind = 'frostSwordArray';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.46;
        e.vx = 0;
        spawnFloatText(e.x + e.w * 0.5, e.y - 46, t('combat.frostSwordArrayWarn'), '#bae6fd', 18, 1.1);
      } else if (e.lastMoveKind !== 'frostSwordArray' && r < 0.34) {
        e.moveKind = 'frostSwordArray';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.52;
        e.vx = 0;
        audio.playFrostBuild();
        spawnFloatText(cx, e.y - 46, t('combat.frostSwordArrayWarn'), '#bae6fd', 18, 1.1);
      } else if (!hasFrostField && e.lastMoveKind !== 'frostDomain' && r < 0.56) {
        e.moveKind = 'frostDomain';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.54;
        e.vx = 0;
        audio.playFrostBuild();
        spawnFloatText(cx, e.y - 46, t('combat.frostDomainWarn'), '#7dd3fc', 18, 1.1);
      } else if (e.phase === 2 && r < 0.72) {
        e.moveKind = 'frostBlinkBackstab';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.48;
        audio.playShadowBlink();
        spawnParticles(cx, cy, 18, { color: '#bae6fd', speed: 220, spark: true, life: 0.35 });
        const behindCenter = px - G.player.facing * 102;
        const canBehind = behindCenter > e.minX + 55 && behindCenter < e.maxX - 55;
        const destCenter = canBehind ? behindCenter : (px + G.player.facing * 114);
        e.x = Math.max(e.minX + 20, Math.min(e.maxX - e.w - 20, destCenter - e.w * 0.5));
        e.facing = px >= (e.x + e.w * 0.5) ? 1 : -1;
        spawnShockwave(e.x + e.w * 0.5, cy, 72, '#bae6fd', 3.2, 0.24);
      } else if (absDx > 185 || r < 0.84) {
        e.moveKind = 'frostIai';
        e.comboIdx = 0;
        e.comboTotal = 1;
        e.windupDuration = 0.62;
        audio.playIaiReady();
      } else {
        e.moveKind = 'frostCombo';
        e.comboIdx = 0;
        e.comboTotal = e.phase === 2 ? 4 : 3;
        e.windupDuration = 0.40;
      }
      e.lastMoveKind = e.moveKind;
      e.state = 'windup';
      e.stateTimer = e.windupDuration;
      e.isDelayedHit = e.moveKind === 'frostBlinkBackstab';
      e.glintPlayed = false;
      e.didHit = false;
    }
  } else if (e.state === 'windup') {
    if (e.stateTimer > 0.18) e.facing = dx >= 0 ? 1 : -1;
    e.vx *= damp(0.82, dt);
    if (e.moveKind !== 'glacialThrust' && !e.glintPlayed && e.stateTimer <= 0.23) {
      e.glintPlayed = true;
      audio.playGlintCue(e.isDelayedHit);
    }
    if (Math.random() < 22 * dt) {
      spawnParticles(cx + e.facing * 14, e.moveKind === 'frostPillarRise' ? (e.y - 8) : (cy - 4), 1, {
        color: e.moveKind === 'glacialThrust' ? COLORS.crimsonBright : '#bae6fd', speed: 75, grav: -30, life: 0.24
      });
    }
    if (e.stateTimer <= 0) {
      e.state = 'strike';
      e.didHit = false;
      if (e.moveKind === 'frostPillarRise') {
        e.stateTimer = 0.28;
        audio.playFrostShatter();
        audio.playSlash(0.95, true);
        addShake(9);
        spawnShockwave(cx, e.y - 24, 128, '#bae6fd', 4.2, 0.30);
        G.slashes.push({ x: cx, y: e.y - 26, facing: e.facing, type: 'bossAntiAir', life: 0.28, maxLife: 0.28 });
        [-0.45, 0.45].forEach(sp => {
          const a = -Math.PI * 0.5 + sp;
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'frostShard',
            x: cx, y: e.y - 16, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
            r: 12, dmg: 22, posture: 24, inflictsFrost: 26, life: 1.6, maxLife: 1.6, reflected: false, hitIds: new Set()
          });
        });
      } else if (e.moveKind === 'frostSwordArray') {
        e.stateTimer = e.phase === 2 ? 1.15 : 0.92;
        const cnt = e.phase === 2 ? 6 : 4;
        audio.playFrostBuild();
        addShake(6);
        spawnShockwave(cx, cy - 30, 125, '#bae6fd', 3.8, 0.28);
        for (let k = 0; k < cnt; k++) {
          const arcA = -Math.PI * 0.88 + (Math.PI * 0.76 * k) / Math.max(1, cnt - 1);
          const ox = Math.max(e.minX + 36, Math.min(e.maxX - 36, cx + Math.cos(arcA) * 115));
          const oy = e.y - 32 + Math.sin(arcA) * 84;
          spawnArenaHazard({
            kind: 'iceLance', owner: e, ox, oy, angle: Math.atan2(py - oy, px - ox), len: 780, width: 22,
            telegraph: 0.74 + k * 0.16, activeDur: 0.34, fadeDur: 0.24, dmg: 26, inflictsFrost: 24
          });
        }
      } else if (e.moveKind === 'frostDomain') {
        e.stateTimer = 0.40;
        const fy = e.y + e.h;
        const spanW = e.phase === 2 ? 380 : 320;
        const minF = e.minX + 18;
        const maxF = Math.max(minF, e.maxX - spanW - 18);
        const fx = Math.max(minF, Math.min(maxF, px - spanW * 0.5));
        audio.playFrostShatter();
        addShake(8);
        spawnShockwave(cx, fy - 8, 125, '#7dd3fc', 4.0, 0.30);
        spawnArenaHazard({
          kind: 'frostPatch', owner: e, x: fx, y: fy, w: spanW, h: 28,
          telegraph: 0.68, activeDur: e.phase === 2 ? 5.4 : 4.8, fadeDur: 0.42, dmg: 12
        });
      } else if (e.moveKind === 'frostBlinkBackstab') {
        e.stateTimer = 0.24;
        e.vx = e.facing * 420;
        audio.playIaiSlash();
        G.slashes.push({ x: cx + e.facing * 36, y: cy - 2, facing: e.facing, type: 'bossSlam', life: 0.24, maxLife: 0.24 });
      } else if (e.moveKind === 'frostIai') {
        e.stateTimer = 0.24;
        e.vx = e.facing * 560;
        audio.playSlash(0.88, true);
        G.slashes.push({ x: cx + e.facing * 38, y: cy - 2, facing: e.facing, type: 'bossSlam', life: 0.24, maxLife: 0.24 });
        if (e.phase === 2) {
          G.projectiles.push({
            owner: 'enemy', source: e, kind: 'frostShard',
            x: cx + e.facing * 24, y: cy - 4, vx: e.facing * 430, vy: 0,
            r: 14, dmg: 24, posture: 28, inflictsFrost: 28, life: 2.0, maxLife: 2.0, reflected: false, hitIds: new Set()
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
          x: cx + e.facing * 30, y: cy - 2, facing: e.facing,
          type: e.comboIdx % 2 === 1 ? 'bossUpSweep' : (isFin ? 'bossSlam' : 'enemyThrust'),
          life: 0.22, maxLife: 0.22
        });
      }
    }
  } else if (e.state === 'strike') {
    e.vx *= damp(0.9, dt);
    if (!e.didHit && e.moveKind !== 'frostSwordArray' && e.moveKind !== 'frostDomain') {
      if (e.moveKind === 'frostPillarRise') {
        const aaBox = { x: cx - 72, y: e.y - 84, w: 144, h: 134 };
        if (aabbOverlap(aaBox, G.player)) {
          e.didHit = true;
          applyIncomingAttackToPlayer(e, 30, false, 265);
        }
      } else {
        const isRed = e.moveKind === 'glacialThrust';
        const reach = (e.moveKind === 'frostIai' || e.moveKind === 'frostBlinkBackstab') ? 124 : (isRed ? 114 : 98);
        const hitBox = { x: cx + (e.facing > 0 ? -6 : -reach + 6), y: e.y + 4, w: reach, h: 66 };
        if (aabbOverlap(hitBox, G.player)) {
          e.didHit = true;
          const dmg = isRed ? 38 : ((e.moveKind === 'frostIai' || e.moveKind === 'frostBlinkBackstab') ? 32 : (e.comboIdx >= e.comboTotal - 1 ? 30 : 24));
          applyIncomingAttackToPlayer(e, dmg, isRed, isRed ? 280 : 210);
        }
      }
    }
    if (e.stateTimer <= 0) {
      if (e.moveKind === 'frostCombo' && e.comboIdx < e.comboTotal - 1) {
        e.comboIdx++;
        e.state = 'windup';
        const isDel = e.comboIdx === e.comboTotal - 1;
        e.isDelayedHit = isDel;
        e.glintPlayed = false;
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
