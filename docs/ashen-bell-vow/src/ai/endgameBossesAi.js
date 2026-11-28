// Endgame & Hidden Boss AI: Yuan (Radiant Light Judgment) & Zhu (3-Stance Mirror Duel) (split from bossesAi.js in v47.0)
import { COLORS, FLOOR_Y, GRAVITY } from '../config.js';
import { G, addShake, triggerBossBanner, triggerBossIntro, getCombatScaling, isBoss4Unlocked, damp } from '../state.js';
import { audio } from '../audio.js';
import { triggerHaptic } from '../input.js';
import { updateCloak, spawnParticles, spawnShockwave, spawnFloatText } from '../vfx.js';
import { aabbOverlap, moveAndCollide } from '../physics.js';
import { applyIncomingAttackToPlayer } from '../combat.js';
import { t } from '../i18n.js';
import { spawnArenaHazard } from '../arenaHazards.js';
import {
  pickWeightedBossMove, applyClashSpacingWindup, applyClashSpacingStrike,
  tickBossOverheadPressure, consumeBossAntiAirTrigger, tickBossGreedPressure, consumeBossGreedTrigger
} from './bossesAi.js';

/* ---------- FINAL BOSS: 初钟圣骸 · 渊 (Tuned 3-Phase Parry Symphony) ---------- */
export function updateBoss3(b, dt) {
  if (!b || !b.alive) return;
  const arenaFloorY = b.arenaFloorY !== undefined ? b.arenaFloorY : FLOOR_Y;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 6.2 * dt);
  b.haloAngle += dt * (b.phase === 3 ? 3.8 : b.phase === 2 ? 2.4 : 1.3);
  if (b.blinkAlpha < 1) b.blinkAlpha = Math.min(1, b.blinkAlpha + dt * 7.5);

  if (!b.awake) {
    b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, false);
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, 0, dt);
    return;
  }

  const bxCenter = b.x + b.w / 2;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const dx = px - bxCenter;
  const absDx = Math.abs(dx);

  // Phase 2 at <= 66% HP
  if (b.phase === 1 && b.hp <= b.maxHp * 0.66 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.tideCd = 3.6;
    b.vx = 0;
    audio.playBellToll();
    triggerHaptic('bossPhase', 1.1);
    addShake(15);
    G.screenFlash = { alpha: 0.30, color: COLORS.violetBright };
    spawnShockwave(bxCenter, b.y + 46, 280, COLORS.violetBright, 5.2, 0.52);
    triggerBossBanner(t('boss.yuan.p2Title'), t('boss.yuan.p2Quote'), COLORS.violetBright, 2.6);
    G.groundWaves.push({ x: bxCenter - 42, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -420, w: 36, h: 48, life: 2.3, hit: false });
    G.groundWaves.push({ x: bxCenter + 42, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 420, w: 36, h: 48, life: 2.3, hit: false });
  }
  // Phase 3 at <= 33% HP
  if (b.phase === 2 && b.hp <= b.maxHp * 0.33 && b.state !== 'stagger') {
    b.phase = 3;
    b.state = 'phaseShift';
    b.stateTimer = 1.35;
    b.tideCd = 4.2;
    b.vx = 0;
    audio.playBellToll();
    audio.playBellQuake();
    triggerHaptic('bossPhase', 1.25);
    addShake(18);
    G.screenFlash = { alpha: 0.36, color: COLORS.goldBright };
    spawnShockwave(bxCenter, b.y + 46, 320, COLORS.goldBright, 5.8, 0.58);
    triggerBossBanner(t('boss.yuan.p3Title'), t('boss.yuan.p3Quote'), COLORS.goldBright, 2.8);
    G.groundWaves.push({ x: bxCenter - 46, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -450, w: 40, h: 52, life: 2.4, hit: false, gold: true });
    G.groundWaves.push({ x: bxCenter + 46, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 450, w: 40, h: 52, life: 2.4, hit: false, gold: true });
  }

  const b3Aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * b3Aggro;
  const b3WantsAntiAir = tickBossOverheadPressure(b, dt);
  const b3WantsGreedPunish = tickBossGreedPressure(b, dt, absDx);
  if (b.phase >= 2 && b.tideCd > 0) b.tideCd -= dt * b3Aggro;

  if (b.state === 'phaseShift') {
    b.vx *= damp(0.8, dt);
    if (Math.random() < 36.0 * dt) {
      spawnParticles(bxCenter, b.y + 38, 2, { color: b.phase === 3 ? COLORS.goldBright : COLORS.violetBright, speed: 210, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.42;
    }
  } else if (b.state === 'stagger') {
    b.vx *= damp(0.85, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.24;
      b.stateTimer = 0.42;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const moveSpd = b.phase === 3 ? 205 : b.phase === 2 ? 178 : 148;
    b.vx = absDx > 114 ? b.facing * moveSpd : b.vx * 0.84;

    if (b3WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 3.0);
      b.moveKind = 'antiAirSwords';
      b.lastMoveKind = 'antiAirSwords';
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
      spawnFloatText(bxCenter, b.y - 50, t('combat.antiAirYuan'), COLORS.goldBright, 18, 0.9);
    } else if (b.stateTimer <= 0 && b.phase >= 2 && b.tideCd <= 0) {
      b.moveKind = 'eclipseTide'; b.lastMoveKind = 'eclipseTide';
      b.comboIdx = 0; b.comboTotal = 3;
      b.symphonyBeatsLeft = 3; b.symphonyBeatTimer = 0.05; b.symphonyReflects = 0;
      b.isDelayedHit = false; b.glintPlayed = false; b.finisherParried = false;
      b.state = 'windup'; b.stateTimer = 0.78; b.windupDuration = 0.78;
      b.tideCd = b.phase === 3 ? 11.5 : 14.0; b.didHit = false; b.vx = 0;
      audio.playBellToll(); audio.playGlintCue(false); addShake(10);
      spawnShockwave(bxCenter, b.y + 42, 165, COLORS.goldBright, 4.2, 0.35);
      spawnFloatText(bxCenter, b.y - 56, t('boss.yuan.symphonyWarn'), COLORS.goldBright, 21, 1.65);
    } else if (b.stateTimer <= 0 && absDx < 660) {
      // v47.0 Boss 3 'Yuan' Complete Radiant Light Judgment Overhaul: Solar Pillars, Prism Beam Sweep, Radiant Cross & Halo Orbs!
      let pool;
      if (b.phase === 3) {
        pool = [
          { kind: 'solarPillars', w: 30 },
          { kind: 'prismSweep', w: 28 },
          { kind: 'radiantCross', w: 28 },
          { kind: 'haloOrbs', w: 24 },
          { kind: 'judgementFlurry', w: absDx < 220 ? 16 : 8 },
          { kind: 'eclipseThrust', w: absDx > 220 ? 12 : 6 }
        ];
      } else if (b.phase === 2) {
        pool = [
          { kind: 'solarPillars', w: 32 },
          { kind: 'prismSweep', w: 28 },
          { kind: 'radiantCross', w: 28 },
          { kind: 'haloOrbs', w: 24 },
          { kind: 'tripleChime', w: absDx < 220 ? 15 : 8 },
          { kind: 'eclipseThrust', w: absDx > 210 ? 12 : 6 }
        ];
      } else {
        pool = [
          { kind: 'solarPillars', w: 34 },
          { kind: 'prismSweep', w: 28 },
          { kind: 'radiantCross', w: 26 },
          { kind: 'haloOrbs', w: 26 },
          { kind: 'tripleChime', w: absDx < 190 ? 14 : 6 },
          { kind: 'eclipseThrust', w: absDx > 220 ? 12 : 6 }
        ];
      }
      let chosen;
      if (!b.signatureOpened) {
        b.signatureOpened = true;
        chosen = 'solarPillars';
      } else if (b3WantsGreedPunish) {
        consumeBossGreedTrigger(b, 5.0);
        audio.playShadowBlink();
        audio.playBellChimeCast(3);
        spawnShockwave(bxCenter, b.y + 46, 150, '#fef08a', 4.4, 0.30);
        if (G.player && G.player.hp > 0) {
          G.player.vx = (dx >= 0 ? 1 : -1) * 320;
        }
        const midA = (b.arenaMinX + b.arenaMaxX) * 0.5;
        const destX = px < midA ? (b.arenaMaxX - 240) : (b.arenaMinX + 200);
        b.x = Math.max(b.arenaMinX + 36, Math.min(b.arenaMaxX - b.w - 36, destX));
        b.facing = px >= (b.x + b.w * 0.5) ? 1 : -1;
        b.blinkAlpha = 0.28;
        chosen = Math.random() < 0.55 ? 'solarPillars' : 'radiantCross';
        spawnFloatText(b.x + b.w * 0.5, b.y - 54, t('combat.yuanRadiantRepel'), '#fef08a', 19, 1.15);
      } else {
        chosen = pickWeightedBossMove(b.lastMoveKind, pool);
      }
      b.moveKind = chosen;
      b.lastMoveKind = chosen;
      b.comboIdx = 0;
      b.comboTotal = chosen === 'judgementFlurry' ? 5 : chosen === 'tripleChime' ? 3 : chosen === 'echoTwinCut' ? 2 : 1;
      b.isDelayedHit = chosen === 'shadowCloneStrike';
      b.glintPlayed = false;
      b.finisherParried = false;
      b.apexHangTimer = 0;
      b.state = 'windup';

      if (chosen === 'solarPillars') {
        b.stateTimer = 0.52;
        audio.playBellChimeCast(3);
        spawnFloatText(b.x + b.w * 0.5, b.y - 54, t('combat.yuanSolarPillars'), '#fef08a', 19, 1.15);
      } else if (chosen === 'prismSweep') {
        b.stateTimer = 0.56;
        audio.playBellChimeCast(3);
        spawnFloatText(b.x + b.w * 0.5, b.y - 54, t('combat.yuanPrismSweep'), '#fef08a', 19, 1.15);
      } else if (chosen === 'radiantCross') {
        b.stateTimer = 0.52;
        audio.playBellChimeCast(3);
        spawnFloatText(b.x + b.w * 0.5, b.y - 54, t('combat.yuanRadiantCross'), '#fef08a', 19, 1.15);
      } else if (chosen === 'haloOrbs') {
        b.stateTimer = 0.48;
        audio.playBellChimeCast(2);
        spawnFloatText(b.x + b.w * 0.5, b.y - 54, t('combat.yuanHaloOrbs'), '#fef08a', 19, 1.15);
      } else if (chosen === 'judgementFlurry') {
        b.stateTimer = 0.44;
      } else if (chosen === 'skyShatter') {
        b.stateTimer = 0.64;
        audio.playDangerAlert();
      } else if (chosen === 'shadowCloneStrike') {
        b.stateTimer = b.phase === 3 ? 0.50 : 0.56;
        audio.playShadowBlink();
        spawnParticles(bxCenter, b.y + 52, 18, { color: COLORS.violetBright, speed: 240, spark: true, life: 0.36 });
        // Wall-safe blink: prefer behind player, fall back to front-mid-range if player's back is pinned to a wall!
        const behindCenter = px - G.player.facing * 116;
        const canBehind = (behindCenter > b.arenaMinX + 68 && behindCenter < b.arenaMaxX - 68);
        const destCenter = canBehind ? behindCenter : (px + G.player.facing * 124);
        b.x = Math.max(b.arenaMinX + 24, Math.min(b.arenaMaxX - b.w - 24, destCenter - b.w * 0.5));
        b.facing = px >= (b.x + b.w * 0.5) ? 1 : -1;
        b.blinkAlpha = 0.30;
        spawnShockwave(b.x + b.w * 0.5, b.y + 52, 76, COLORS.violetBright, 3.2, 0.26);
      } else if (chosen === 'bellRain') {
        b.stateTimer = 0.62;
        audio.playWraithShot();
      } else if (chosen === 'eclipseThrust') {
        b.stateTimer = 0.54;
      } else if (chosen === 'tripleChime' || chosen === 'echoTwinCut') {
        b.stateTimer = chosen === 'echoTwinCut' ? 0.36 : 0.44;
      } else {
        b.stateTimer = 0.68;
        audio.playDangerAlert();
      }
      b.windupDuration = b.stateTimer;
      b.didHit = false;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    const isRadiantMove = b.moveKind === 'solarPillars' || b.moveKind === 'prismSweep' || b.moveKind === 'radiantCross' || b.moveKind === 'haloOrbs';
    const isRedMove = b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter' || b.moveKind === 'eclipseTide' || isRadiantMove;
    if (b.moveKind === 'prismSweep') { const targetY = arenaFloorY - 215; b.y += (targetY - b.y) * Math.min(1, dt * 6.5); b.vy = 0; }
    if (b.moveKind !== 'eclipseTide' && b.stateTimer > 0.19) {
      b.facing = dx >= 0 ? 1 : -1;
    }
    if (b.moveKind === 'tripleChime' || b.moveKind === 'judgementFlurry' || b.moveKind === 'echoTwinCut') {
      applyClashSpacingWindup(b, px, dt);
    } else {
      b.vx *= damp(0.82, dt);
    }
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.23) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.isDelayedHit && Math.random() < 0.45) {
      spawnParticles(bxCenter + b.facing * 16, b.y + 24, 1, { color: COLORS.goldBright, speed: 70, grav: -50, life: 0.22 });
    }
    if (b.moveKind === 'eclipseTide' && Math.random() < 0.7) {
      spawnParticles(bxCenter + (Math.random() - 0.5) * 90, arenaFloorY - 6, 1, { color: COLORS.goldBright, speed: 110, grav: -200, life: 0.35 });
    }
    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      const by = b.y + 52;
      if (b.moveKind === 'solarPillars') {
        b.stateTimer = 1.05;
        const cnt = b.phase >= 3 ? 5 : b.phase === 2 ? 4 : 3;
        const minP = b.arenaMinX + 75;
        const maxP = b.arenaMaxX - 75;
        const span = Math.max(300, maxP - minP);
        const xs = [Math.max(minP, Math.min(maxP, px))];
        const step = span / cnt;
        for (let k = 0; k < cnt; k++) {
          const cand = minP + step * (k + 0.5);
          if (xs.every(ox => Math.abs(ox - cand) >= 145) && xs.length < cnt) xs.push(cand);
        }
        audio.playBellToll();
        addShake(7);
        spawnShockwave(bxCenter, b.y + 30, 145, '#fef08a', 4.0, 0.30);
        for (let k = 0; k < xs.length; k++) {
          spawnArenaHazard({
            kind: 'solarPillar', owner: b, x: xs[k], y: arenaFloorY, topY: b.arenaTopY, w: b.phase >= 3 ? 72 : 66,
            telegraph: 0.85, activeDur: 0.50, fadeDur: 0.30, dmg: 30
          });
        }
      } else if (b.moveKind === 'prismSweep') {
        b.stateTimer = 1.62;
        const ox = bxCenter;
        const oy = b.y + 38;
        audio.playBellToll();
        spawnShockwave(ox, oy, 130, '#fef08a', 3.8, 0.28);
        if (b.phase >= 2) {
          spawnArenaHazard({
            kind: 'prismBeam', owner: b, followOwner: true, ownerOffY: 38, ox, oy,
            startAngle: Math.PI * 0.42, endAngle: 0.08, len: 920, width: 26,
            telegraph: 0.76, activeDur: 0.94, fadeDur: 0.26, dmg: 28
          });
          spawnArenaHazard({
            kind: 'prismBeam', owner: b, followOwner: true, ownerOffY: 38, ox, oy,
            startAngle: Math.PI * 0.58, endAngle: Math.PI - 0.08, len: 920, width: 26,
            telegraph: 0.76, activeDur: 0.94, fadeDur: 0.26, dmg: 28
          });
        } else {
          const sA = b.facing > 0 ? Math.PI * 0.44 : Math.PI * 0.56;
          const eA = b.facing > 0 ? 0.06 : (Math.PI - 0.06);
          spawnArenaHazard({
            kind: 'prismBeam', owner: b, followOwner: true, ownerOffY: 38, ox, oy,
            startAngle: sA, endAngle: eA, len: 920, width: 28,
            telegraph: 0.78, activeDur: 0.96, fadeDur: 0.26, dmg: 28
          });
        }
      } else if (b.moveKind === 'radiantCross') {
        b.stateTimer = b.phase >= 2 ? 1.55 : 1.05;
        const cxC = Math.max(b.arenaMinX + 120, Math.min(b.arenaMaxX - 120, px));
        const cyC = Math.min(arenaFloorY - 76, Math.max(b.arenaTopY + 180, py - 18));
        audio.playBellChimeCast(3);
        spawnArenaHazard({
          kind: 'radiantCross', owner: b, cx: cxC, cy: cyC, baseAngle: 0, len: 820, width: 28,
          telegraph: 0.80, activeDur: 0.38, fadeDur: 0.26, dmg: 30
        });
        if (b.phase >= 2) {
          spawnArenaHazard({
            kind: 'radiantCross', owner: b, cx: cxC, cy: cyC, baseAngle: Math.PI * 0.25, len: 820, width: 28,
            telegraph: 1.48, activeDur: 0.38, fadeDur: 0.26, dmg: 30
          });
        }
      } else if (b.moveKind === 'haloOrbs') {
        b.stateTimer = 1.15;
        const cnt = b.phase >= 3 ? 6 : b.phase === 2 ? 5 : 4;
        audio.playBellChimeCast(3);
        spawnShockwave(bxCenter, b.y + 42, 118, '#fef08a', 3.6, 0.28);
        for (let k = 0; k < cnt; k++) {
          const oa = -Math.PI * 0.85 + (Math.PI * 0.7 * k) / Math.max(1, cnt - 1);
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'radiantOrb',
            x: bxCenter + Math.cos(oa) * 68, y: b.y + 42 + Math.sin(oa) * 68,
            vx: 0, vy: 0, r: 14, dmg: 24, posture: 28,
            launchDelay: 0.32 + k * 0.22, launchSpeed: b.phase >= 3 ? 470 : 420,
            orbitAngle: oa, orbitR: 68, orbitOffY: 42,
            life: 4.0, maxLife: 4.0, reflected: false, hitIds: new Set()
          });
        }
      } else if (b.moveKind === 'eclipseTide') {
        b.stateTimer = 2.45; b.symphonyBeatsLeft = 3; b.symphonyBeatTimer = 0.02; b.symphonyReflects = 0;
        audio.playBellToll(); addShake(10); G.screenFlash = { alpha: 0.18, color: COLORS.goldBright };
      } else if (b.moveKind === 'skyShatter') {
        b.stateTimer = 1.35;
        b.leapAirborne = false;
        b.apexHangTimer = 0.15;
        b.grounded = false;
        b.vx = Math.max(-480, Math.min(480, dx * 1.32));
        b.vy = -530;
        audio.playSlash(0.6, true);
        G.slashes.push({ x: bxCenter + b.facing * 40, y: by - 10, facing: b.facing, type: 'bossRedSlam', life: 0.34, maxLife: 0.34 });
      } else if (b.moveKind === 'eclipseThrust') {
        b.stateTimer = 0.28;
        b.vx = b.facing * (b.phase === 3 ? 700 : 650);
        audio.playSlash(0.76, true);
        G.slashes.push({ x: bxCenter + b.facing * 52, y: by + 4, facing: b.facing, type: 'bossThrust', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'crimsonArc') {
        b.stateTimer = 0.25;
        b.vx = b.facing * 310;
        audio.playSlash(0.66, true);
        G.slashes.push({ x: bxCenter + b.facing * 56, y: by + 4, facing: b.facing, type: 'bossRedSweep', life: 0.28, maxLife: 0.28 });
      } else if (b.moveKind === 'antiAirSwords') {
        b.stateTimer = 0.28;
        audio.playIaiSlash();
        audio.playBellChimeCast(3);
        addShake(10);
        spawnShockwave(bxCenter, b.y - 16, 138, b.phase === 2 ? COLORS.violetBright : COLORS.goldBright, 4.2, 0.28);
        G.slashes.push({ x: bxCenter, y: b.y - 22, facing: b.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
        [-0.55, 0, 0.55].forEach(sp => {
          const a = -Math.PI * 0.5 + sp;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'wraithOrb',
            x: bxCenter, y: b.y - 12, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
            r: 12, dmg: 24, posture: 26, life: 1.7, maxLife: 1.7, reflected: false, hitIds: new Set()
          });
        });
      } else if (b.moveKind === 'shadowCloneStrike') {
        b.stateTimer = 0.22;
        b.vx = b.facing * (absDx > 95 ? 360 : 165);
        audio.playIaiSlash();
        G.slashes.push({ x: bxCenter + b.facing * 48, y: by, facing: b.facing, type: 'bossSlam', life: 0.26, maxLife: 0.26 });
      } else if (b.moveKind === 'bellRain') {
        b.stateTimer = 0.24;
        const cnt = b.phase === 3 ? 4 : 3;
        const baseAng = Math.atan2(py - by, px - bxCenter);
        audio.playWraithShot();
        for (let i = 0; i < cnt; i++) {
          const a = baseAng + (i - (cnt - 1) / 2) * 0.24;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'wraithOrb',
            x: bxCenter + Math.cos(a) * 32, y: by + Math.sin(a) * 32,
            vx: Math.cos(a) * (b.phase === 3 ? 395 : 355),
            vy: Math.sin(a) * (b.phase === 3 ? 395 : 355),
            r: 13, dmg: 26, posture: 30, life: 2.8, maxLife: 2.8, reflected: false, hitIds: new Set()
          });
        }
        spawnShockwave(bxCenter, by, 82, COLORS.goldBright, 3.4, 0.25);
      } else {
        // tripleChime (3 hits) or judgementFlurry (5 hits) with adaptive clash step
        const isFinisher = b.comboIdx === b.comboTotal - 1;
        b.stateTimer = isFinisher ? 0.22 : 0.17;
        const gapNow = (px - bxCenter) * b.facing;
        b.vx = b.facing * (gapNow > 96 ? (isFinisher ? 310 : 265) : (isFinisher ? 135 : 112));
        audio.playSlash(0.84 + b.comboIdx * 0.08, isFinisher);
        G.slashes.push({
          x: bxCenter + b.facing * 46,
          y: by + (b.comboIdx % 2 === 0 ? -4 : 10),
          facing: b.facing,
          type: isFinisher ? 'bossSlam' : (b.comboIdx % 2 === 1 ? 'bossUpSweep' : 'bossSweep'),
          life: 0.24,
          maxLife: 0.24
        });
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= damp(0.90, dt);
    if (b.moveKind === 'tripleChime' || b.moveKind === 'judgementFlurry' || b.moveKind === 'echoTwinCut') {
      applyClashSpacingStrike(b, px);
    }
    // Brief apex hang-glint on skyShatter / hovering prismSweep
    let skipGravity = b.moveKind === 'prismSweep';
    if (b.moveKind === 'prismSweep') { b.vy = 0; b.vx *= damp(0.75, dt); }
    if (b.moveKind === 'skyShatter' && b.leapAirborne && b.vy >= -40 && b.apexHangTimer > 0) {
      b.apexHangTimer -= dt;
      b.vx *= damp(0.65, dt);
      b.vy = 0;
      skipGravity = true;
      if (b.apexHangTimer <= 0) {
        b.vy = 780;
        audio.playSlash(0.56, true);
        spawnShockwave(bxCenter, b.y + 42, 74, COLORS.goldBright, 3.2, 0.22);
      }
    }
    if (b.moveKind === 'eclipseTide' && b.symphonyBeatsLeft > 0) {
      b.symphonyBeatTimer -= dt;
      if (b.symphonyBeatTimer <= 0) {
        const beatNum = 4 - b.symphonyBeatsLeft;
        b.symphonyBeatsLeft--;
        b.symphonyBeatTimer = b.phase >= 3 ? 0.68 : 0.76;
        b.facing = dx >= 0 ? 1 : -1;
        const aimAng = Math.atan2((py - 6) - (b.y + 46), px - bxCenter);
        const wSpd = b.phase >= 3 ? 520 : 465;
        audio.playGlintCue(beatNum === 3);
        audio.playResonanceBell(beatNum === 3 ? 659.25 : beatNum === 2 ? 523.25 : 440.0, false);
        addShake(6.5);
        spawnShockwave(bxCenter, b.y + 46, 118, COLORS.goldBright, 3.8, 0.26);
        G.projectiles.push({
          owner: 'enemy', source: b, kind: 'yuanResonanceWave', beatNum,
          x: bxCenter + b.facing * 24, y: b.y + 46,
          vx: Math.cos(aimAng) * wSpd, vy: Math.sin(aimAng) * wSpd,
          r: 22, dmg: 28, posture: 28, life: 2.4, maxLife: 2.4, reflected: false, hitIds: new Set()
        });
      }
    }
    if (b.moveKind !== 'eclipseTide' && b.moveKind !== 'bellRain' && b.moveKind !== 'solarPillars' && b.moveKind !== 'prismSweep' && b.moveKind !== 'radiantCross' && b.moveKind !== 'haloOrbs') {
      const isRed = b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter';
      const isAA3 = b.moveKind === 'antiAirSwords';
      const reach = b.moveKind === 'eclipseThrust' ? 142 : b.moveKind === 'crimsonArc' ? 148 : 122;
      if (!b.didHit && !(b.moveKind === 'skyShatter' && skipGravity)) {
        const hitBox = isAA3
          ? { x: bxCenter - 96, y: b.y - 86, w: 192, h: 138 }
          : {
              x: bxCenter + (b.facing > 0 ? -12 : -reach + 12),
              y: b.y + 8,
              w: reach,
              h: 102
            };
        if (aabbOverlap(hitBox, G.player)) {
          b.didHit = true;
          const dmg = isRed ? 44 : b.moveKind === 'shadowCloneStrike' ? 34 : (b.comboIdx === b.comboTotal - 1 ? 33 : 28);
          applyIncomingAttackToPlayer(b, dmg, isRed, 280);
        }
      }
    }
    if (b.moveKind === 'skyShatter' && !b.grounded) b.leapAirborne = true;
    const done = b.moveKind === 'skyShatter'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);
    if (done) {
      if (b.moveKind === 'skyShatter') {
        b.leapAirborne = false;
        b.apexHangTimer = 0;
        b.vx = 0;
        addShake(14);
        audio.playHit(true, 3);
        spawnShockwave(bxCenter, b.y + b.h - 6, 165, COLORS.goldBright, 4.8, 0.36);
        // Offset wave spawn (±48px) & clean speed (390) prevent unavoidable frame-1 clips after dodging the slam
        G.groundWaves.push({ x: bxCenter - 48, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -390, w: 38, h: 46, life: 2.2, hit: false, gold: true });
        G.groundWaves.push({ x: bxCenter + 48, y: arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 390, w: 38, h: 46, life: 2.2, hit: false, gold: true });
      }
      b.comboIdx++;
      if (b.comboIdx < b.comboTotal) {
        b.state = 'windup';
        // Crisp Musical Cadence:
        // tripleChime: 1(0.44) - 2(0.26) -- [pause] -- 3(0.54)
        // judgementFlurry: 1(0.44) - 2(0.25) -- [pause] -- 3(0.54) - 4(0.25) -- [pause] -- 5(0.56)
        const delayed = (b.moveKind === 'tripleChime' && b.comboIdx === 2) ||
          (b.moveKind === 'echoTwinCut' && b.comboIdx === 1) ||
          (b.moveKind === 'judgementFlurry' && (b.comboIdx === 2 || b.comboIdx === 4));
        b.isDelayedHit = delayed;
        b.glintPlayed = false;
        b.stateTimer = delayed ? (b.comboIdx === 4 ? 0.56 : 0.54) : (b.moveKind === 'tripleChime' ? 0.26 : 0.25);
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        const baseRec = b.moveKind === 'eclipseTide' ? 0.95 : (b.phase === 3 ? 0.58 : b.phase === 2 ? 0.68 : 0.80);
        b.stateTimer = baseRec + (b.finisherParried ? 0.38 : 0);
        b.finisherParried = false;
      }
    }
    if (!skipGravity) b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, true);
    if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, -b.vx * 0.45, dt);
    return;
  } else if (b.state === 'recover') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.30 : b.phase === 2 ? 0.38 : 0.50;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 12, b.y + 30, b.facing, -b.vx * 0.45, dt);
}


/* ---------- HIDDEN FINAL BOSS: 初铸残影 · 铸 (3-Stance Dynamic Weapon-Switching Parry Symphony) ---------- */
export function triggerBoss4UltimateReaction(weaponId) {
  const b = G.boss4;
  if (!b || !b.alive || !b.awake || b.state === 'stagger' || b.state === 'phaseShift' || b.ultimateReactCd > 0) return false;
  b.ultimateReactCd = 6.5;
  b.stance = weaponId === 'hammer' ? 'hammer' : weaponId === 'bell' ? 'bell' : 'blade';
  b.stanceFlash = 0.55;
  const bx = b.x + b.w * 0.5;
  const by = b.y + b.h * 0.44;
  const px = G.player ? (G.player.x + G.player.w * 0.5) : (bx - 220);
  const py = G.player ? (G.player.y + G.player.h * 0.45) : by;
  b.facing = px >= bx ? 1 : -1;

  audio.playBoss4Counter();
  addShake(11);
  const col = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
  spawnShockwave(bx, by, 155, col, 4.6, 0.36);
  spawnParticles(bx, by, 24, { color: col, speed: 280, spark: true, life: 0.42 });
  spawnFloatText(bx, b.y - 44, t('boss.zhu.ultCounter'), col, 21, 1.35);

  const baseAng = Math.atan2(py - by, px - bx);
  [-0.14, 0.14].forEach((off, idx) => {
    const a = baseAng + off;
    const spd = 410 + idx * 45;
    G.projectiles.push({
      owner: 'enemy',
      source: b,
      kind: 'boss4EchoOrb',
      stance: b.stance,
      x: bx + b.facing * 26,
      y: by - 6 + (idx === 0 ? -10 : 10),
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      r: 14,
      dmg: 22,
      posture: 26,
      life: 2.3,
      maxLife: 2.3,
      reflected: false,
      hitIds: new Set()
    });
  });
  return true;
}

export function updateBoss4(b, dt) {
  if (!b || !b.alive) return;
  if (b.hurtFlash > 0) b.hurtFlash -= dt;
  if (b.stanceFlash > 0) b.stanceFlash -= dt;
  if (b.ultimateReactCd > 0) b.ultimateReactCd -= dt;
  if (b.postureDecayDelay > 0) b.postureDecayDelay -= dt;
  else if (b.state !== 'stagger' && b.posture > 0) b.posture = Math.max(0, b.posture - 6.8 * dt);
  b.haloAngle += dt * (b.phase === 3 ? 4.4 : b.phase === 2 ? 2.8 : 1.6);
  if (b.blinkAlpha < 1) b.blinkAlpha = Math.min(1, b.blinkAlpha + dt * 8.0);

  if (!b.awake) {
    b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, false);
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, 0, dt);
    const pMid4 = G.player ? (G.player.x + G.player.w * 0.5) : -99999;
    if (!G.echoSession && G.player && G.player.hp > 0 && isBoss4Unlocked() &&
        pMid4 > b.arenaMinX + 85 && pMid4 < b.arenaMaxX - 85 &&
        Math.abs((G.player.y + G.player.h) - b.arenaFloorY) < 220) {
      b.awake = true; b.state = 'stalk'; b.stateTimer = 0.55;
      audio.playBellToll(); audio.playBoss4Swap(); addShake(12);
      G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
      spawnShockwave(b.x + b.w * 0.5, b.y + b.h * 0.45, 220, COLORS.goldBright, 4.6, 0.48);
      triggerBossIntro(b, t('boss.echoZhuTitle'), t('boss.echoZhuQuote'), COLORS.goldBright, 1.65);
    }
    return;
  }

  const bxCenter = b.x + b.w / 2;
  const byMid = b.y + b.h * 0.45;
  const px = G.player.x + G.player.w / 2;
  const py = G.player.y + G.player.h / 2;
  const dx = px - bxCenter;
  const absDx = Math.abs(dx);

  if (b.phase === 1 && b.hp <= b.maxHp * 0.66 && b.state !== 'stagger') {
    b.phase = 2;
    b.state = 'phaseShift';
    b.stateTimer = 1.15;
    b.stance = 'bell';
    b.stanceFlash = 0.7;
    b.movesInStance = 0;
    b.vx = 0;
    audio.playBellToll();
    audio.playBoss4Swap();
    triggerHaptic('bossPhase', 1.15);
    addShake(15);
    G.screenFlash = { alpha: 0.28, color: COLORS.cyanBright };
    spawnShockwave(bxCenter, byMid, 270, COLORS.cyanBright, 5.2, 0.50);
    triggerBossBanner(t('boss.zhu.p2Title'), t('boss.zhu.p2Quote'), COLORS.cyanBright, 2.6);
    for (let k = -1; k <= 1; k++) {
      const a = Math.atan2(py - byMid, px - bxCenter) + k * 0.30;
      G.projectiles.push({
        owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
        x: bxCenter, y: byMid - 10, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350,
        r: 13, dmg: 24, posture: 26, life: 2.2, maxLife: 2.2, reflected: false, hitIds: new Set()
      });
    }
  }
  if (b.phase === 2 && b.hp <= b.maxHp * 0.33 && b.state !== 'stagger') {
    b.phase = 3;
    b.state = 'phaseShift';
    b.stateTimer = 1.25;
    b.stance = 'blade';
    b.stanceFlash = 0.85;
    b.movesInStance = 0;
    b.vx = 0;
    audio.playBellToll();
    audio.playBellQuake();
    audio.playBoss4Counter();
    triggerHaptic('bossPhase', 1.3);
    addShake(18);
    G.screenFlash = { alpha: 0.36, color: COLORS.goldBright };
    spawnShockwave(bxCenter, byMid, 330, COLORS.goldBright, 6.0, 0.58);
    spawnShockwave(bxCenter, byMid, 210, COLORS.cyanBright, 4.0, 0.45);
    triggerBossBanner(t('boss.zhu.p3Title'), t('boss.zhu.p3Quote'), COLORS.goldBright, 2.9);
    G.groundWaves.push({ x: bxCenter - 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -440, w: 38, h: 48, life: 2.3, hit: false, gold: true });
    G.groundWaves.push({ x: bxCenter + 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 440, w: 38, h: 48, life: 2.3, hit: false, gold: true });
  }

  const aggro = (b.state === 'recover' || b.state === 'stalk' || b.state === 'idle') ? getCombatScaling().aggroMult : 1;
  b.stateTimer -= dt * aggro;
  const b4WantsAntiAir = tickBossOverheadPressure(b, dt);
  const b4WantsGreedPunish = tickBossGreedPressure(b, dt, absDx);

  if (b.state === 'phaseShift') {
    b.vx *= damp(0.8, dt);
    if (Math.random() < 40 * dt) {
      spawnParticles(bxCenter, byMid, 2, { color: b.phase === 3 ? COLORS.goldBright : COLORS.cyanBright, speed: 230, spark: true });
    }
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = 0.36;
    }
  } else if (b.state === 'stagger') {
    b.vx *= damp(0.85, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.posture = b.maxPosture * 0.24;
      b.stateTimer = 0.38;
    }
  } else if (b.state === 'swapStance') {
    b.vx *= damp(0.82, dt);
    b.facing = dx >= 0 ? 1 : -1;
    if (b.stateTimer <= 0) {
      b.stance = b.nextStance || 'blade';
      b.stanceFlash = 0.55;
      b.movesInStance = 0;
      const sc = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
      audio.playBoss4Swap();
      spawnShockwave(bxCenter, byMid, 96, sc, 3.6, 0.26);
      spawnFloatText(bxCenter, b.y - 34, t(b.stance === 'hammer' ? 'boss.zhu.stanceHammer' : b.stance === 'bell' ? 'boss.zhu.stanceBell' : 'boss.zhu.stanceBlade'), sc, 18, 0.95);
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.16 : 0.24;
    }
  } else if (b.state === 'idle' || b.state === 'stalk') {
    b.facing = dx >= 0 ? 1 : -1;
    const baseSpd = b.stance === 'blade' ? 215 : b.stance === 'bell' ? 165 : 148;
    const moveSpd = baseSpd * (b.phase === 3 ? 1.12 : 1.0);
    const desiredDist = b.stance === 'bell' ? 230 : 108;
    if (absDx > desiredDist + 24) b.vx = b.facing * moveSpd;
    else if (b.stance === 'bell' && absDx < 140) b.vx = -b.facing * 135;
    else b.vx *= 0.84;

    if (b4WantsAntiAir) {
      consumeBossAntiAirTrigger(b, 2.8);
      b.moveKind = 'antiAirStance';
      b.lastMoveKind = 'antiAirStance';
      b.comboIdx = 0;
      b.comboTotal = 1;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.didHit = false;
      b.state = 'windup';
      b.stateTimer = 0.40;
      b.windupDuration = 0.40;
      b.vx = 0;
      spawnFloatText(bxCenter, b.y - 46, t('combat.antiAirZhu'), b.stance === 'bell' ? COLORS.cyanBright : COLORS.goldBright, 18, 0.9);
    } else if (b.stateTimer <= 0 && b.movesInStance >= 2) {
      const order = b.phase >= 2 ? ['blade', 'hammer', 'bell'] : ['blade', 'hammer'];
      const curIdx = order.indexOf(b.stance);
      b.nextStance = order[(curIdx + 1) % order.length];
      b.state = 'swapStance';
      b.stateTimer = b.phase === 3 ? 0.28 : 0.36;
      b.vx = 0;
    } else if (b.stateTimer <= 0 && absDx < 580) {
      b.movesInStance++;
      let pool = [];
      if (b.phase === 3 && b.lastMoveKind !== 'triResonanceFinale' && Math.random() < 0.34) {
        pool = [{ kind: 'triResonanceFinale', w: 100 }];
      } else if (b.stance === 'blade') {
        pool = [
          { kind: 'bladeFlurry', w: absDx < 250 ? 55 : 28 },
          { kind: 'iaiDash', w: absDx > 120 ? 45 : 22 }
        ];
      } else if (b.stance === 'hammer') {
        pool = [
          { kind: 'hammerTwinSlam', w: absDx < 240 ? 52 : 24 },
          { kind: 'hammerQuakeLeap', w: absDx > 110 ? 48 : 26 }
        ];
      } else {
        pool = [
          { kind: 'bellBarrage', w: 54 },
          { kind: 'bellRingSweep', w: absDx < 270 ? 46 : 26 }
        ];
      }
      let chosen;
      if (b4WantsGreedPunish) {
        consumeBossGreedTrigger(b, 5.0);
        b.stance = 'hammer';
        b.stanceFlash = 0.45;
        chosen = 'hammerQuakeLeap';
        spawnFloatText(bxCenter, b.y - 48, t('combat.greedPunish'), COLORS.crimsonBright, 18, 0.9);
      } else {
        chosen = pickWeightedBossMove(b.lastMoveKind, pool);
      }
      b.moveKind = chosen;
      b.lastMoveKind = chosen;
      b.comboIdx = 0;
      b.isDelayedHit = false;
      b.glintPlayed = false;
      b.finisherParried = false;
      b.didHit = false;
      b.leapAirborne = false;
      b.apexHangTimer = 0;
      b.state = 'windup';

      if (chosen === 'bladeFlurry') {
        b.comboTotal = b.phase >= 2 ? 4 : 3;
        b.stateTimer = 0.42;
      } else if (chosen === 'iaiDash') {
        b.comboTotal = 1;
        b.stateTimer = 0.56;
        b.isDelayedHit = true;
        audio.playDangerAlert();
      } else if (chosen === 'hammerTwinSlam') {
        b.comboTotal = 2;
        b.stateTimer = 0.54;
        b.isDelayedHit = true;
      } else if (chosen === 'hammerQuakeLeap') {
        b.comboTotal = 1;
        b.stateTimer = 0.62;
        audio.playDangerAlert();
      } else if (chosen === 'bellBarrage') {
        b.comboTotal = b.phase >= 3 ? 3 : 2;
        b.stateTimer = 0.48;
      } else if (chosen === 'bellRingSweep') {
        b.comboTotal = 1;
        b.stateTimer = 0.44;
      } else if (chosen === 'triResonanceFinale') {
        b.stance = 'blade';
        b.stanceFlash = 0.4;
        b.comboTotal = 3;
        b.stateTimer = 0.46;
        spawnFloatText(bxCenter, b.y - 44, t('boss.zhu.triFinale'), COLORS.goldBright, 20, 1.35);
      }
      b.windupDuration = b.stateTimer;
      b.vx = 0;
    }
  } else if (b.state === 'windup') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer > 0.14) b.facing = dx >= 0 ? 1 : -1;
    const isRedMove = b.moveKind === 'hammerQuakeLeap';
    if (!isRedMove && !b.glintPlayed && b.stateTimer <= 0.22) {
      b.glintPlayed = true;
      audio.playGlintCue(b.isDelayedHit);
    }
    if (b.stateTimer <= 0) {
      b.state = 'strike';
      b.didHit = false;
      if (b.moveKind === 'antiAirStance') {
        b.stateTimer = 0.28;
        const stCol = b.stance === 'bell' ? COLORS.cyanBright : b.stance === 'hammer' ? COLORS.gold : COLORS.goldBright;
        if (b.stance === 'blade') {
          b.vy = -510;
          b.vx = b.facing * 140;
          audio.playBoss4Iai();
        } else if (b.stance === 'hammer') {
          audio.playBellQuake();
          addShake(12);
        } else {
          audio.playBoss4Counter();
          [-0.48, 0, 0.48].forEach(sp => {
            const a = -Math.PI * 0.5 + sp;
            G.projectiles.push({
              owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
              x: bxCenter, y: b.y - 12, vx: Math.cos(a) * 410, vy: Math.sin(a) * 410,
              r: 13, dmg: 24, posture: 26, life: 1.8, maxLife: 1.8, reflected: false, hitIds: new Set()
            });
          });
        }
        spawnShockwave(bxCenter, b.y - 16, 134, stCol, 4.2, 0.28);
        G.slashes.push({ x: bxCenter, y: b.y - 22, facing: b.facing, type: 'bossAntiAir', life: 0.30, maxLife: 0.30 });
      } else if (b.moveKind === 'bladeFlurry') {
        const isFin = b.comboIdx === b.comboTotal - 1;
        b.stateTimer = isFin ? 0.26 : 0.17;
        b.vx = b.facing * (isFin ? 340 : 230);
        audio.playSlash(0.92 + b.comboIdx * 0.08, isFin);
        G.slashes.push({ x: bxCenter + b.facing * 48, y: byMid, facing: b.facing, type: isFin ? 'bossSlam' : (b.comboIdx % 2 === 1 ? 'bossUpSweep' : 'bossSweep'), life: 0.22, maxLife: 0.22 });
      } else if (b.moveKind === 'iaiDash') {
        b.stateTimer = 0.24;
        b.vx = b.facing * 680;
        b.blinkAlpha = 0.52;
        audio.playBoss4Iai();
        addShake(8);
        G.slashes.push({ x: bxCenter + b.facing * 64, y: byMid, facing: b.facing, type: 'iai', life: 0.28, maxLife: 0.28 });
        spawnShockwave(bxCenter, byMid, 78, COLORS.goldBright, 3.2, 0.22);
      } else if (b.moveKind === 'hammerTwinSlam') {
        const isSecond = b.comboIdx === 1;
        b.stateTimer = 0.28;
        b.vx = b.facing * (isSecond ? 240 : 170);
        audio.playShieldBash(isSecond);
        addShake(isSecond ? 11 : 7);
        G.slashes.push({ x: bxCenter + b.facing * 44, y: byMid + 8, facing: b.facing, type: 'hammerQuake', life: 0.26, maxLife: 0.26 });
        if (isSecond) {
          G.groundWaves.push({ x: bxCenter + b.facing * 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: b.facing * 400, w: 38, h: 46, life: 2.0, hit: false, gold: true });
        }
      } else if (b.moveKind === 'hammerQuakeLeap') {
        b.stateTimer = 1.02;
        b.leapAirborne = false;
        b.apexHangTimer = 0.16;
        const clampedDx = Math.max(-340, Math.min(340, dx));
        b.vx = clampedDx * 1.48;
        b.vy = -660;
        audio.playSlash(0.62, true);
      } else if (b.moveKind === 'bellBarrage') {
        b.stateTimer = 0.24;
        b.vx = -b.facing * 120;
        audio.playBellChimeCast(3);
        const a0 = Math.atan2(py - byMid, px - bxCenter);
        const spreads = b.comboIdx === b.comboTotal - 1 ? [-0.22, 0, 0.22] : [-0.14, 0.14];
        for (const sp of spreads) {
          const a = a0 + sp;
          G.projectiles.push({
            owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
            x: bxCenter + b.facing * 24, y: byMid - 10,
            vx: Math.cos(a) * 375, vy: Math.sin(a) * 375,
            r: 13, dmg: 24, posture: 24, life: 2.2, maxLife: 2.2, reflected: false, hitIds: new Set()
          });
        }
        spawnShockwave(bxCenter + b.facing * 20, byMid - 8, 66, COLORS.cyanBright, 3.0, 0.22);
      } else if (b.moveKind === 'bellRingSweep') {
        b.stateTimer = 0.25;
        b.vx = b.facing * 260;
        audio.playBellChimeCast(2);
        G.slashes.push({ x: bxCenter + b.facing * 42, y: byMid, facing: b.facing, type: 'bellCounter', life: 0.24, maxLife: 0.24 });
        G.projectiles.push({
          owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
          x: bxCenter + b.facing * 30, y: byMid,
          vx: b.facing * 420, vy: 0,
          r: 14, dmg: 25, posture: 26, life: 1.9, maxLife: 1.9, reflected: false, hitIds: new Set()
        });
      } else if (b.moveKind === 'triResonanceFinale') {
        if (b.comboIdx === 0) {
          b.stance = 'blade'; b.stanceFlash = 0.45;
          b.stateTimer = 0.22;
          b.vx = b.facing * 520;
          audio.playBoss4Iai();
          G.slashes.push({ x: bxCenter + b.facing * 58, y: byMid, facing: b.facing, type: 'iai', life: 0.26, maxLife: 0.26 });
        } else if (b.comboIdx === 1) {
          b.stance = 'hammer'; b.stanceFlash = 0.45;
          b.stateTimer = 0.28;
          b.vx = b.facing * 240;
          audio.playBoss4Swap();
          audio.playShieldBash(true);
          addShake(12);
          G.slashes.push({ x: bxCenter + b.facing * 46, y: byMid + 6, facing: b.facing, type: 'hammerQuake', life: 0.28, maxLife: 0.28 });
          G.groundWaves.push({ x: bxCenter - 44, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -395, w: 38, h: 46, life: 2.0, hit: false, gold: true });
          G.groundWaves.push({ x: bxCenter + 44, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 395, w: 38, h: 46, life: 2.0, hit: false, gold: true });
        } else {
          b.stance = 'bell'; b.stanceFlash = 0.55;
          b.stateTimer = 0.28;
          b.vx = -b.facing * 160;
          audio.playBoss4Counter();
          const a0 = Math.atan2(py - byMid, px - bxCenter);
          [-0.28, 0, 0.28].forEach(sp => {
            const a = a0 + sp;
            G.projectiles.push({
              owner: 'enemy', source: b, kind: 'boss4EchoOrb', stance: 'bell',
              x: bxCenter + b.facing * 24, y: byMid - 8,
              vx: Math.cos(a) * 410, vy: Math.sin(a) * 410,
              r: 14, dmg: 26, posture: 28, life: 2.3, maxLife: 2.3, reflected: false, hitIds: new Set()
            });
          });
          spawnShockwave(bxCenter, byMid, 128, COLORS.cyanBright, 4.2, 0.30);
        }
      }
    }
  } else if (b.state === 'strike') {
    b.vx *= damp(0.90, dt);
    if (b.moveKind === 'bladeFlurry' || b.moveKind === 'hammerTwinSlam') {
      applyClashSpacingStrike(b, px);
    }
    let skipGravity = false;
    if (b.moveKind === 'hammerQuakeLeap' && b.leapAirborne && b.vy >= -40 && b.apexHangTimer > 0) {
      b.apexHangTimer -= dt;
      b.vx *= damp(0.65, dt);
      b.vy = 0;
      skipGravity = true;
      if (b.apexHangTimer <= 0) {
        b.vy = 820;
        audio.playSlash(0.54, true);
        spawnShockwave(bxCenter, byMid, 76, COLORS.goldBright, 3.4, 0.22);
      }
    }
    const meleeHit = b.moveKind !== 'bellBarrage' && !(b.moveKind === 'triResonanceFinale' && b.comboIdx === 2);
    if (meleeHit && !b.didHit && !(b.moveKind === 'hammerQuakeLeap' && skipGravity)) {
      const isRed = b.moveKind === 'hammerQuakeLeap';
      const isAA4 = b.moveKind === 'antiAirStance';
      const reach = b.moveKind === 'iaiDash' ? 148 : b.stance === 'hammer' ? 132 : 118;
      const hitBox = isAA4
        ? { x: bxCenter - 86, y: b.y - 82, w: 172, h: 136 }
        : {
            x: bxCenter + (b.facing > 0 ? -12 : -reach + 12),
            y: b.y + 8,
            w: reach,
            h: 98
          };
      if (aabbOverlap(hitBox, G.player)) {
        b.didHit = true;
        const dmg = isRed ? 48 : b.moveKind === 'iaiDash' ? 36 : b.stance === 'hammer' ? 35 : 30;
        applyIncomingAttackToPlayer(b, dmg, isRed, 275);
      }
    }

    if (b.moveKind === 'hammerQuakeLeap' && !b.grounded) b.leapAirborne = true;
    const done = b.moveKind === 'hammerQuakeLeap'
      ? ((b.leapAirborne && b.grounded) || b.stateTimer <= 0)
      : (b.stateTimer <= 0);
    if (done) {
      if (b.moveKind === 'hammerQuakeLeap') {
        b.leapAirborne = false;
        b.apexHangTimer = 0;
        b.vx = 0;
        addShake(15);
        audio.playBellQuake();
        spawnShockwave(bxCenter, b.y + b.h - 6, 175, COLORS.goldBright, 5.0, 0.36);
        G.groundWaves.push({ x: bxCenter - 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: -405, w: 38, h: 46, life: 2.2, hit: false, gold: true });
        G.groundWaves.push({ x: bxCenter + 46, y: b.arenaFloorY, minX: b.arenaMinX, maxX: b.arenaMaxX, vx: 405, w: 38, h: 46, life: 2.2, hit: false, gold: true });
      }
      b.comboIdx++;
      if (b.comboIdx < b.comboTotal) {
        b.state = 'windup';
        const delayed = (b.moveKind === 'bladeFlurry' && b.comboIdx === 2) ||
          (b.moveKind === 'hammerTwinSlam' && b.comboIdx === 1) ||
          (b.moveKind === 'triResonanceFinale' && b.comboIdx === 1);
        b.isDelayedHit = delayed;
        b.glintPlayed = false;
        b.stateTimer = delayed ? 0.50 : (b.moveKind === 'triResonanceFinale' ? 0.36 : 0.26);
        b.windupDuration = b.stateTimer;
        b.didHit = false;
      } else {
        b.state = 'recover';
        const baseRec = b.moveKind === 'triResonanceFinale' ? 0.78 : (b.phase === 3 ? 0.52 : b.phase === 2 ? 0.62 : 0.72);
        b.stateTimer = baseRec + (b.finisherParried ? 0.40 : 0);
        b.finisherParried = false;
      }
    }
    if (!skipGravity) b.vy += GRAVITY * dt;
    moveAndCollide(b, dt, true);
    if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
    updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.45, dt);
    return;
  } else if (b.state === 'recover') {
    b.vx *= damp(0.84, dt);
    if (b.stateTimer <= 0) {
      b.state = 'stalk';
      b.stateTimer = b.phase === 3 ? 0.26 : b.phase === 2 ? 0.34 : 0.44;
    }
  }

  b.vy += GRAVITY * dt;
  moveAndCollide(b, dt, true);
  if (Math.abs(b.vx) > 18 && b.grounded) b.walkCycle = (b.walkCycle || 0) + dt * Math.abs(b.vx) * 0.032;
  updateCloak(b.cloak, b.x + b.w / 2 - b.facing * 10, b.y + 26, b.facing, -b.vx * 0.45, dt);
}
