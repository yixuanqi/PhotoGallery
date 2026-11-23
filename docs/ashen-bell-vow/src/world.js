// World hazards, pendulums, Abyssal River, projectiles, talismans, tides & camera
import { COLORS, ROOM_THEMES, ROOMS, SOLIDS, VOID_BARRIERS, SLICK_WALLS, NPCS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, FLOOR_Y, WELL_BOTTOM_Y, PENDULUMS, ABYSSAL_RIVERS, PUDDLES, WIND_ZONES, BOUNCE_PADS, WIND_VANES, SWITCH_GATES } from './config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, getRelicStats, hasActiveWeaponTrait, isSkyBridgeOpen, isWorldSwitchOn, isRiverDrained, isWindZoneActive, isBoss4Unlocked, triggerZoneBanner, scheduleOutcome, addShake, punchZoom, triggerHitstop, damp
} from './state.js';
import { getRoomAt } from './levelLoader.js';
import { audio } from './audio.js';
import { triggerHaptic } from './input.js';
import {
  spawnParticles, recycleParticle, spawnShockwave, spawnImpactBurst, spawnHitMark, spawnFloatText, spawnWeatherRipple
} from './vfx.js';
import { aabbOverlap, getGroundSurfaceY } from './physics.js';
import {
  applyIncomingAttackToPlayer, damageEnemyHP, addPostureToEnemy,
  rallyPlayerGrayHp, damageSecretWall, tryQuellChapelTideByLantern, ringResonanceBell,
  toggleWindVane, awakenDormantSporePad, triggerIcePillarDrop, severFoundryCrucible,
  dropPlayerEchoesOnDeath, reclaimLostEchoes
} from './combat.js';
import { recordBestiaryEvent, checkAchievements, updateAchievementBanner } from './codex.js';
import { t } from './i18n.js';
import { updateThemeAndWeather, isRoomOccluded } from './worldCamera.js';

export function updateWorldEffects(dt) {
  // Shortcut Gate & Boss Chapel Exit Gate Animations + Breakable Wall Shake
  if (G.worldState) {
    if (G.worldState.shortcutOpen && G.worldState.shortcutAnim < 1) {
      G.worldState.shortcutAnim = Math.min(1, G.worldState.shortcutAnim + dt * 2.1);
    }
    if (G.worldState.bossDefeated && G.worldState.chapelExitAnim < 1) {
      G.worldState.chapelExitAnim = Math.min(1, G.worldState.chapelExitAnim + dt * 1.6);
    }
    if ((G.worldState.abilities.doubleJump || G.echoSession) && G.worldState.foundryGateAnim < 1) {
      G.worldState.foundryGateAnim = Math.min(1, G.worldState.foundryGateAnim + dt * 1.6);
    }
    if (G.worldState.boss2Defeated && G.worldState.foundryExitAnim < 1) {
      G.worldState.foundryExitAnim = Math.min(1, G.worldState.foundryExitAnim + dt * 1.6);
    }
    if (isSkyBridgeOpen() && (G.worldState.skyBridgeGateAnim || 0) < 1) {
      G.worldState.skyBridgeGateAnim = Math.min(1, (G.worldState.skyBridgeGateAnim || 0) + dt * 1.4);
    }
    if (isRiverDrained() && (G.worldState.riverDrainAnim || 0) < 1) {
      G.worldState.riverDrainAnim = Math.min(1, (G.worldState.riverDrainAnim || 0) + dt * 0.85);
    }
    if (isWorldSwitchOn('foundryValveOpen') && (G.worldState.foundryVentAnim || 0) < 1) {
      G.worldState.foundryVentAnim = Math.min(1, (G.worldState.foundryVentAnim || 0) + dt * 1.6);
    }
    if (isBoss4Unlocked() && (G.worldState.mirrorAbyssAnim || 0) < 1) {
      G.worldState.mirrorAbyssAnim = Math.min(1, (G.worldState.mirrorAbyssAnim || 0) + dt * 1.4);
    }
    if (!G.worldState.switchGateAnims) G.worldState.switchGateAnims = {};
    for (let i = 0; i < SWITCH_GATES.length; i++) {
      const k = SWITCH_GATES[i].switchKey;
      if (isWorldSwitchOn(k) && (G.worldState.switchGateAnims[k] || 0) < 1) {
        G.worldState.switchGateAnims[k] = Math.min(1, (G.worldState.switchGateAnims[k] || 0) + dt * 1.8);
      }
    }
    for (const w of G.worldState.secretWalls) { if (w.shake > 0) w.shake = Math.max(0, w.shake - dt); }
    for (const f of (G.worldState.breakableFloors || [])) { if (f.shake > 0) f.shake = Math.max(0, f.shake - dt); }
    for (const ip of (G.worldState.icePillars || [])) {
      if (ip.flash > 0) ip.flash = Math.max(0, ip.flash - dt);
      if (ip.state !== 'falling') continue;
      ip.vy = Math.min(1080, (ip.vy || 180) + 1850 * dt);
      ip.fallY += ip.vy * dt;
      const icBox = { x: ip.x - 24, y: ip.fallY - 64, w: 48, h: 68 };
      for (const foe of getLivingFoes()) {
        if (ip.hitIds && ip.hitIds.has(foe.id)) continue;
        if (aabbOverlap(icBox, foe)) {
          if (ip.hitIds) ip.hitIds.add(foe.id);
          damageEnemyHP(foe, 65, true);
          addPostureToEnemy(foe, 55);
          spawnParticles(foe.x + foe.w * 0.5, foe.y + 20, 18, { color: '#bae6fd', speed: 250, spark: true, life: 0.42 });
          spawnFloatText(foe.x + foe.w * 0.5, foe.y - 26, t('combat.iceCrush'), '#bae6fd', 20, 1.0);
        }
      }
      if (ip.fallY >= ip.bridgeY) {
        ip.fallY = ip.bridgeY;
        ip.state = 'bridge';
        ip._bridgeBox = { x: ip.bridgeX, y: ip.bridgeY, w: ip.bridgeW, h: ip.bridgeH, type: 'platform' };
        audio.playFrostShatter();
        addShake(11);
        spawnShockwave(ip.bridgeX + ip.bridgeW * 0.5, ip.bridgeY, 125, '#bae6fd', 4.4, 0.36);
        spawnParticles(ip.bridgeX + ip.bridgeW * 0.5, ip.bridgeY, 26, { color: '#e0f2fe', speed: 240, spark: true, life: 0.5 });
        spawnFloatText(ip.bridgeX + ip.bridgeW * 0.5, ip.bridgeY - 34, t('combat.iceBridgeFormed'), '#bae6fd', 19, 1.45);
        G.minimapDirty = true;
        hooks.saveProgress(true);
      }
    }
  }

  // Resonance Bell Puzzles (swinging bells, harmony timer & bronze cage dissolve)
  if (G.resonancePuzzles) {
    for (const pz of G.resonancePuzzles) {
      if (pz.solved && pz.cageAnim < 1) {
        pz.cageAnim = Math.min(1, pz.cageAnim + dt * 1.9);
      }
      if (!pz.solved && pz.timer > 0) {
        pz.timer -= dt;
        if (pz.timer <= 0) {
          pz.timer = 0;
          for (const b of pz.bells) b.lit = false;
        }
      }
      for (const b of pz.bells) {
        if (b.hitCd > 0) b.hitCd = Math.max(0, b.hitCd - dt);
        if (b.flash > 0) b.flash = Math.max(0, b.flash - dt);
        const acc = -22 * Math.sin(b.swing);
        b.swingVel = (b.swingVel + acc * dt) * damp(0.94, dt);
        b.swing += b.swingVel * dt;
      }
    }
  }

  // Crumbling Stone Platforms (shake 0.65s -> shatter -> regenerate after 3.2s)
  if (G.crumblePlatforms) {
    for (const cp of G.crumblePlatforms) {
      if (cp.state === 'shaking') {
        cp.timer -= dt;
        if (Math.random() < 26 * dt) {
          spawnParticles(cp.x + Math.random() * cp.w, cp.y + cp.h, 1, { color: COLORS.parchment, speed: 60, grav: 320, life: 0.35 });
        }
        if (cp.timer <= 0) {
          cp.state = 'broken';
          cp.timer = 3.2;
          audio.playCrumble();
          spawnParticles(cp.x + cp.w / 2, cp.y + cp.h / 2, 18, { color: COLORS.parchment, speed: 170, grav: 420, life: 0.5 });
        }
      } else if (cp.state === 'broken') {
        cp.timer -= dt;
        if (cp.timer <= 0) {
          cp.state = 'solid';
          cp.timer = 0;
          spawnParticles(cp.x + cp.w / 2, cp.y + cp.h / 2, 10, { color: COLORS.cyanBright, speed: 90, grav: -60, life: 0.35 });
        }
      }
    }
  }

  for (let i = 0; i < WIND_VANES.length; i++) {
    const wv = WIND_VANES[i];
    if (wv.hitCd > 0) wv.hitCd = Math.max(0, wv.hitCd - dt);
    if (wv.flash > 0) wv.flash = Math.max(0, wv.flash - dt);
    if (Math.abs(wv.spinVel) > 0.01) wv.spinVel *= damp(0.88, dt);
  }
  // Decay Glowing Spore Bounce Pad squish & cooldown timers
  for (let i = 0; i < BOUNCE_PADS.length; i++) {
    const bp = BOUNCE_PADS[i];
    if (bp.cd > 0) bp.cd = Math.max(0, bp.cd - dt);
    if (bp.squish > 0) bp.squish = Math.max(0, bp.squish - dt * 3.8);
  }

  // Swinging Bronze Pendulum Blades (Dodgeable, Pogoable, & Parryable!)
  for (const pd of PENDULUMS) {
    if (pd.hitCd > 0) pd.hitCd -= dt;
    if (!G.player || G.player.hp <= 0 || pd.hitCd > 0) continue;
    const ang = Math.sin(G.globalTime * pd.speed + pd.phase) * pd.amp;
    const bx = pd.x + Math.sin(ang) * pd.len;
    const by = pd.anchorY + Math.cos(ang) * pd.len;
    const px = G.player.x + G.player.w / 2;
    const py = G.player.y + G.player.h / 2;
    if (Math.hypot(bx - px, by - py) < pd.r + 18) {
      pd.hitCd = 0.55;
      applyIncomingAttackToPlayer({ x: bx - 10, w: 20, isBoss: false }, 22, false, 230);
    }
  }

  // Corrosive Abyssal Ink River Hazards (data-driven across all rooms)
  if (G.player && G.player.hp > 0 && G.player.riverCd <= 0 && G.player.grappleState === 'none' && G.player.execTimer <= 0) {
    const px = G.player.x + G.player.w * 0.5;
    const py = G.player.y + G.player.h;
    const drained = isRiverDrained();
    const hitRiver = ABYSSAL_RIVERS.find(rv => rv.w > 0 && !(drained && rv.drainable) && px >= rv.x + 8 && px <= rv.x + rv.w - 8 && py >= rv.y + 2 && py <= rv.y + 38);
    if (hitRiver) {
      G.player.riverCd = 0.85;
      audio.playTideRoar();
      addShake(10);
      G.screenFlash = { alpha: 0.28, color: COLORS.cyan };
      spawnParticles(px, hitRiver.y, 26, { color: COLORS.ink, speed: 240, grav: 260, life: 0.55 });
      spawnParticles(px, hitRiver.y, 16, { color: COLORS.cyanBright, speed: 210, spark: true, life: 0.45 });
      const rMult = (G.settings && typeof G.settings.damageTakenMult === 'number') ? G.settings.damageTakenMult : 1.0;
      const dmg = Math.max(1, Math.round(18 * rMult));
      triggerHaptic('hurt', 0.85);
      G.player.hp = Math.max(0, G.player.hp - dmg);
      G.player.grayHp = 0;
      G.player.parryActive = false;
      G.player.activeAttack = null;
      G.player.isCharging = false;
      G.player.chargeTime = 0;
      G.stats.damageTaken += dmg;
      spawnFloatText(px, G.player.y - 22, t('combat.riverDmg', dmg), COLORS.cyanBright, 19, 0.95);
      if (G.player.hp <= 0) {
        G.player.hp = 0;
        G.player.deathTimer = 0.65;
        G.player.vx = 0;
        G.player.vy = -120;
        dropPlayerEchoesOnDeath(true);
        scheduleOutcome(hooks.showDeath, 650, false);
      } else {
        G.player.x = G.player.lastSafeX;
        G.player.y = G.player.lastSafeY - 6;
        G.player.vx = 0;
        G.player.vy = -120;
        G.player.iframeTimer = Math.max(G.player.iframeTimer, 0.75);
        G.player.airJumpsLeft = 1;
        spawnShockwave(G.player.x + G.player.w * 0.5, G.player.y + 26, 56, COLORS.cyanBright, 3, 0.26);
      }
    }
  }

  // Hanging Lantern Pendulums
  for (const l of G.lanterns) {
    if (l.hitCd > 0) l.hitCd -= dt;
    if (l.ringFlash > 0) l.ringFlash = Math.max(0, l.ringFlash - dt);
    const wind = Math.sin(G.globalTime * 1.4 + l.x * 0.01) * 0.35;
    const angAcc = -14.5 * Math.sin(l.angle) + wind;
    l.angVel = (l.angVel + angAcc * dt) * damp(0.986, dt);
    l.angle += l.angVel * dt;
  }

  // Projectiles (Soul Bell-Wave & Wraith Orbs)
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.life -= dt;
    if (WIND_ZONES.length > 0 && (pr.kind === 'wraithOrb' || pr.kind === 'windBlade' || pr.kind === 'frostShard' || pr.kind === 'soulWave' || pr.kind === 'bellWave' || pr.kind === 'crimsonWave')) {
      for (let wi = 0; wi < WIND_ZONES.length; wi++) {
        const wz = WIND_ZONES[wi];
        if (!isWindZoneActive(wz)) continue;
        if (pr.x >= wz.x && pr.x <= wz.x + wz.w && pr.y >= wz.y && pr.y <= wz.y + wz.h) {
          pr.vy += (wz.vy || 0) * 0.45 * dt;
          pr.vx += (wz.vx || 0) * 0.45 * dt;
          if (Math.random() < 14 * dt) {
            spawnParticles(pr.x, pr.y, 1, { color: '#e0f2fe', speed: 55, grav: -120, life: 0.22 });
          }
          break;
        }
      }
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (pr.kind === 'bellHoming') {
      // Smoothly steer toward nearest living enemy within 500px
      const foes = getLivingFoes();
      let bestFoe = null;
      let bestDist = 500;
      for (let fi = 0; fi < foes.length; fi++) {
        const f = foes[fi];
        const d = Math.hypot((f.x + f.w * 0.5) - pr.x, (f.y + f.h * 0.45) - pr.y);
        if (d < bestDist) { bestDist = d; bestFoe = f; }
      }
      if (bestFoe) {
        const wantA = Math.atan2((bestFoe.y + bestFoe.h * 0.45) - pr.y, (bestFoe.x + bestFoe.w * 0.5) - pr.x);
        const curA = Math.atan2(pr.vy, pr.vx);
        let diff = wantA - curA;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const nextA = curA + Math.max(-7.8 * dt, Math.min(7.8 * dt, diff));
        const spd = pr.speed || 480;
        pr.vx = Math.cos(nextA) * spd;
        pr.vy = Math.sin(nextA) * spd;
      }
      if (Math.random() < 34 * dt) {
        spawnParticles(pr.x, pr.y, 1, { color: COLORS.cyanBright, speed: 45, grav: 0, life: 0.20 });
      }
      const hBox = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
      for (const foe of foes) {
        if (aabbOverlap(hBox, foe)) {
          audio.playHit(false, 2);
          audio.playBellChimeCast(3);
          triggerHaptic('lightHit', 0.7);
          if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0 && pr.breaksShield) {
            foe.shieldBrokenTimer = 2.4;
            if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
            audio.playShieldBreak();
            spawnFloatText(foe.x + foe.w / 2, foe.y - 26, t('combat.bladeBreak'), COLORS.cyanBright, 19, 0.9);
          }
          damageEnemyHP(foe, pr.dmg, true);
          addPostureToEnemy(foe, pr.posture);
          if (G.player) {
            G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round((pr.soulOnHit || 10) * getRelicStats().soulGainMult));
            G.player.switchStrikeWindow = 0.44;
            if (hasActiveWeaponTrait('soul_gather') && G.player.bellSealCd <= 0) {
              G.player.bellSealHits = (G.player.bellSealHits || 0) + 1;
              if (G.player.bellSealHits >= 3) {
                G.player.bellSealHits = 0;
                G.player.bellSealCd = 1.8;
                if (G.player.seals < G.player.maxSeals) {
                  G.player.seals++;
                  spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 38, t('combat.traitSoulGather'), COLORS.cyanBright, 17, 0.85);
                }
              }
            }
          }
          rallyPlayerGrayHp(8);
          spawnShockwave(pr.x, pr.y, 48, COLORS.cyanBright, 2.8, 0.20);
          spawnParticles(pr.x, pr.y, 12, { color: COLORS.cyanBright, speed: 210, spark: true, life: 0.28 });
          pr.life = 0;
          break;
        }
      }
      if (pr.life > 0 && G.resonancePuzzles) {
        for (const pz of G.resonancePuzzles) {
          for (const b of pz.bells) {
            if (Math.hypot(pr.x - b.x, pr.y - b.y) < pr.r + 22) {
              ringResonanceBell(pz, b, pr.facing);
              pr.life = 0;
              break;
            }
          }
          if (pr.life <= 0) break;
        }
      }
    } else if (pr.kind === 'hammerWave') {
      // Ground-hugging seismic shockwave from Charged Abyssal Bell-Maul
      const surfY = getGroundSurfaceY(pr.x, pr.y - 24);
      if (surfY < pr.y + 42 && surfY > pr.y - 36) pr.y = surfY - 12;
      if (Math.random() < 48 * dt) {
        spawnParticles(pr.x, pr.y + 6, 1, { color: COLORS.goldBright, speed: 120, grav: 260, spark: true, life: 0.24 });
        spawnParticles(pr.x, pr.y + 10, 1, { color: COLORS.parchment, speed: 95, grav: 340, life: 0.28 });
      }
      const hBox = { x: pr.x - pr.r, y: pr.y - pr.r * 1.1, w: pr.r * 2, h: pr.r * 1.8 };
      const targets = getLivingFoes();
      for (const foe of targets) {
        if (pr.hitIds.has(foe.id)) continue;
        if (aabbOverlap(hBox, foe)) {
          pr.hitIds.add(foe.id);
          audio.playShieldBash(false);
          triggerHaptic('heavyHit', 1.0);
          triggerHitstop(0.036, true);
          addShake(8);
          const shielded = (foe.kind === 'golem' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0;
          if (shielded) {
            foe.shieldBrokenTimer = 2.6;
            if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
            audio.playShieldBreak();
            spawnFloatText(foe.x + foe.w / 2, foe.y - 26, t('combat.shieldBreak'), COLORS.goldBright, 20, 0.95);
          }
          damageEnemyHP(foe, pr.dmg, true);
          addPostureToEnemy(foe, pr.posture);
          if (!foe.isBoss && foe.state !== 'stagger') {
            foe.vx = pr.facing * 260;
            if (foe.kind !== 'wraith') foe.vy = Math.min(foe.vy, -210);
          }
          if (G.player) {
            G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round((pr.soulOnHit || 12) * getRelicStats().soulGainMult));
            G.player.switchStrikeWindow = 0.44;
          }
          rallyPlayerGrayHp(16);
          spawnShockwave(foe.x + foe.w / 2, foe.y + foe.h * 0.55, 86, COLORS.goldBright, 3.8, 0.26);
          spawnParticles(foe.x + foe.w / 2, foe.y + foe.h * 0.55, 18, { color: COLORS.goldBright, speed: 250, spark: true, life: 0.36 });
        }
      }
      if (G.worldState) {
        for (const w of G.worldState.secretWalls) {
          if (w.broken || pr.hitIds.has(w.id)) continue;
          if (aabbOverlap(hBox, w)) {
            pr.hitIds.add(w.id);
            damageSecretWall(w, 3);
          }
        }
      }
      for (let j = G.projectiles.length - 1; j >= 0; j--) {
        const other = G.projectiles[j];
        if (other.owner === 'enemy' && Math.hypot(pr.x - other.x, pr.y - other.y) < pr.r + other.r + 12) {
          spawnParticles(other.x, other.y, 12, { color: COLORS.goldBright, speed: 190, spark: true });
          other.life = 0;
        }
      }
    } else if (pr.kind === 'bellWave' || pr.kind === 'soulWave' || pr.kind === 'crimsonWave') {
      const isCrimson = pr.kind === 'crimsonWave';
      const pCol = isCrimson ? COLORS.crimsonBright : COLORS.cyanBright;
      if (Math.random() < 38 * dt) {
        spawnParticles(pr.x - pr.facing * 10, pr.y + (Math.random() - 0.5) * 26, 1, { color: pCol, speed: 60, grav: 0, life: 0.24 });
      }
      const pBox = { x: pr.x - pr.r, y: pr.y - pr.r * 1.15, w: pr.r * 2, h: pr.r * 2.3 };
      const targets = getLivingFoes();
      for (const foe of targets) {
        if (pr.hitIds.has(foe.id)) continue;
        if (aabbOverlap(pBox, foe)) {
          pr.hitIds.add(foe.id);
          audio.playHit(true);
          triggerHaptic(isCrimson ? 'heavyHit' : 'lightHit');
          triggerHitstop(0.032, true);
          addShake(isCrimson ? 7 : 5);
          const canWaveBreak = pr.kind !== 'bellWave' || !!pr.breaksShield;
          const shielded = (foe.kind === 'golem' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0;
          if (shielded && canWaveBreak) {
            foe.shieldBrokenTimer = 2.4;
            if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
            audio.playShieldBreak();
            triggerHaptic('shieldBreak');
            spawnFloatText(foe.x + foe.w / 2, foe.y - 26, isCrimson ? t('combat.crimsonBreak') : t('combat.bladeBreak'), pCol, 19, 0.95);
          }
          const hitDmg = (shielded && !canWaveBreak) ? Math.max(3, Math.round(pr.dmg * 0.35)) : pr.dmg;
          damageEnemyHP(foe, hitDmg, true);
          addPostureToEnemy(foe, (shielded && !canWaveBreak) ? 4 : pr.posture);
          if (pr.soulOnHit && G.player) {
            G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(pr.soulOnHit * getRelicStats().soulGainMult));
            G.player.switchStrikeWindow = 0.44;
            if (pr.kind === 'bellWave' && hasActiveWeaponTrait('soul_gather') && G.player.bellSealCd <= 0) {
              G.player.bellSealHits = (G.player.bellSealHits || 0) + 1;
              if (G.player.bellSealHits >= 3) {
                G.player.bellSealHits = 0;
                G.player.bellSealCd = 1.8;
                if (G.player.seals < G.player.maxSeals) {
                  G.player.seals++;
                  spawnFloatText(G.player.x + G.player.w * 0.5, G.player.y - 38, t('combat.traitSoulGather'), COLORS.cyanBright, 17, 0.85);
                }
              }
            }
          }
          if (pr.kind === 'bellWave' && pr.splitDart) {
            pr.splitDart = false;
            const ang = (pr.facing > 0 ? -0.45 : Math.PI + 0.45);
            G.projectiles.push({
              owner: 'player',
              kind: 'bellHoming',
              x: pr.x,
              y: pr.y - 8,
              vx: Math.cos(ang) * 490,
              vy: Math.sin(ang) * 490,
              speed: 490,
              r: 10,
              dmg: Math.max(10, Math.round(pr.dmg * 0.65)),
              posture: 10,
              breaksShield: true,
              soulOnHit: 7,
              life: 0.9,
              maxLife: 0.9,
              facing: pr.facing,
              hitIds: new Set()
            });
          }
          rallyPlayerGrayHp(isCrimson ? 18 : pr.kind === 'bellWave' ? 7 : 10);
          spawnParticles(foe.x + foe.w / 2, foe.y + foe.h * 0.45, 16, { color: pCol, speed: 240, spark: true, life: 0.34 });
          spawnShockwave(foe.x + foe.w / 2, foe.y + foe.h * 0.45, isCrimson ? 70 : 58, pCol, 2.8, 0.22);
        }
      }

      // Reclaim Lost Echo Lantern Shade with Soul Wave!
      if (G.worldState && G.worldState.lostEchoes && !G.echoSession) {
        const le = G.worldState.lostEchoes;
        if (aabbOverlap(pBox, { x: le.x - 24, y: le.y - 28, w: 48, h: 56 })) reclaimLostEchoes();
      }

      // Void Barriers absorb Soul Waves
      for (let vi = 0; vi < VOID_BARRIERS.length; vi++) {
        if (aabbOverlap(pBox, VOID_BARRIERS[vi])) {
          pr.life = 0;
          spawnParticles(pr.x, pr.y, 12, { color: COLORS.violetBright, speed: 180, spark: true, life: 0.3 });
          break;
        }
      }

      // Hit Breakable Ink Walls with Soul Wave!
      if (G.worldState) {
        for (const w of G.worldState.secretWalls) {
          if (w.broken || pr.hitIds.has(w.id)) continue;
          if (aabbOverlap(pBox, w)) {
            pr.hitIds.add(w.id);
            damageSecretWall(w, 2);
          }
        }
      }

      for (let vi = 0; vi < WIND_VANES.length; vi++) {
        const wv = WIND_VANES[vi];
        if (!pr.hitIds.has(wv.id) && Math.hypot(pr.x - wv.x, pr.y - (wv.y - 36)) < pr.r + 28) { pr.hitIds.add(wv.id); toggleWindVane(wv); }
      }
      if (G.worldState && G.worldState.icePillars) {
        for (let ii = 0; ii < G.worldState.icePillars.length; ii++) {
          const ip = G.worldState.icePillars[ii];
          if (ip.state === 'hanging' && !pr.hitIds.has(ip.id) && Math.abs(pr.x - ip.x) < pr.r + 28 && pr.y >= ip.topY && pr.y <= ip.topY + ip.len + 24) {
            pr.hitIds.add(ip.id); triggerIcePillarDrop(ip);
          }
        }
      }
      if (pr.kind === 'bellWave') {
        for (let bi = 0; bi < BOUNCE_PADS.length; bi++) {
          const bp = BOUNCE_PADS[bi];
          if (bp.dormant && !pr.hitIds.has(bp.id) && Math.hypot(pr.x - bp.x, pr.y - (bp.y - bp.h * 0.5)) < pr.r + bp.w * 0.6) {
            pr.hitIds.add(bp.id); awakenDormantSporePad(bp);
          }
        }
      }
      for (const cr of (G.foundryCrucibles || [])) {
        if (cr.state === 'hanging' && !pr.hitIds.has(cr.id) && Math.abs(pr.x - cr.x) < pr.r + 32 && pr.y >= cr.anchorY && pr.y <= cr.y + 24) { pr.hitIds.add(cr.id); severFoundryCrucible(cr); }
      }
      // Hit Resonance Puzzle Bells with Soul Wave!
      if (G.resonancePuzzles) {
        for (const pz of G.resonancePuzzles) {
          for (const b of pz.bells) {
            if (pr.hitIds.has(b.id)) continue;
            if (Math.hypot(pr.x - b.x, pr.y - b.y) < pr.r + 24) {
              pr.hitIds.add(b.id);
              ringResonanceBell(pz, b, pr.facing);
            }
          }
        }
      }

      // Hit Lanterns -> Resonant Golden AoE Explosion!
      for (const l of G.lanterns) {
        if (pr.hitIds.has(l.id)) continue;
        const lx = l.x + Math.sin(l.angle) * l.len;
        const ly = l.anchorY + Math.cos(l.angle) * l.len;
        if (Math.hypot(pr.x - lx, pr.y - ly) < pr.r + 22) {
          pr.hitIds.add(l.id);
          l.angVel += pr.facing * 7.5;
          l.ringFlash = 0.55;
          audio.playPogoLantern();
          addShake(6);
          spawnShockwave(lx, ly, 165, COLORS.goldBright, 4.2, 0.34);
          spawnParticles(lx, ly, 24, { color: COLORS.goldBright, speed: 280, spark: true, life: 0.4 });
          spawnFloatText(lx, ly - 24, t('combat.lanternBurst'), COLORS.goldBright, 18, 0.72);
          tryQuellChapelTideByLantern(l, lx, ly);
          for (const foe of targets) {
            if (Math.hypot((foe.x + foe.w / 2) - lx, (foe.y + foe.h / 2) - ly) < 175) {
              damageEnemyHP(foe, 28, true);
              addPostureToEnemy(foe, 34);
            }
          }
        }
      }

      for (let j = G.projectiles.length - 1; j >= 0; j--) {
        const other = G.projectiles[j];
        if (other.owner === 'enemy' && Math.hypot(pr.x - other.x, pr.y - other.y) < pr.r + other.r + 8) {
          spawnParticles(other.x, other.y, 12, { color: COLORS.cyanBright, speed: 190, spark: true });
          other.life = 0;
        }
      }
      if (G.sporeClouds && G.sporeClouds.length > 0 && getRelicStats().synSporeClapper) {
        for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
          const sc = G.sporeClouds[si];
          if (Math.hypot(pr.x - sc.x, pr.y - sc.y) < pr.r + sc.r) {
            audio.playSporePurify();
            spawnShockwave(sc.x, sc.y, sc.r * 1.45, '#4ade80', 4.0, 0.28);
            spawnParticles(sc.x, sc.y, 20, { color: '#6ee7b7', speed: 210, spark: true, life: 0.4 });
            for (const foe of targets) {
              if (Math.hypot((foe.x + foe.w * 0.5) - sc.x, (foe.y + foe.h * 0.5) - sc.y) <= sc.r + 115) {
                damageEnemyHP(foe, 38, true);
                addPostureToEnemy(foe, 26);
              }
            }
            if (G.player) {
              G.player.hp = Math.min(G.player.maxHp, G.player.hp + 10);
              G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 18);
            }
            spawnFloatText(sc.x, sc.y - 26, t('combat.synSporeClapper'), '#6ee7b7', 17, 0.85);
            G.sporeClouds.splice(si, 1);
          }
        }
      }
    } else if (pr.kind === 'wraithOrb' || pr.kind === 'windBlade' || pr.kind === 'frostShard' || pr.kind === 'boss4EchoOrb' || pr.kind === 'yuanResonanceWave') {
      if (Math.random() < 28 * dt) {
        const trailCol = (pr.reflected || pr.kind === 'yuanResonanceWave') ? COLORS.goldBright : (pr.kind === 'boss4EchoOrb' ? (pr.stance === 'bell' ? COLORS.cyanBright : COLORS.goldBright) : pr.kind === 'windBlade' ? '#7dd3fc' : pr.kind === 'frostShard' ? '#bae6fd' : COLORS.crimson);
        spawnParticles(pr.x, pr.y, 1, { color: trailCol, speed: 45, grav: 0, life: 0.22 });
      }
      const oBox = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
      if (!pr.reflected) {
        if (G.player.hp > 0 && aabbOverlap(oBox, G.player)) {
          if (G.player.iframeTimer > 0) {
            // Phase cleanly
          } else if (G.player.parryActive && G.player.parryElapsedMs <= getRelicStats().parryWindowMs) {
            const rsOrb = getRelicStats();
            G.stats.parries++;
            G.player.parryStreak = G.player.parryStreakTimer > 0 ? Math.min(9, G.player.parryStreak + 1) : 1;
            G.player.parryStreakTimer = 2.6;
            if (pr.source && pr.source.kind) recordBestiaryEvent(pr.source.kind, 'parry');
            checkAchievements({ parryStreak: G.player.parryStreak });
            audio.playParry(true, G.player.parryStreak);
            triggerHaptic('parry', 0.95 + Math.min(0.4, (G.player.parryStreak - 1) * 0.12));
            if (rsOrb.synMirrorEmber && G.player.parryStreak >= 3 && !G.player.freeSealProc) {
              G.player.freeSealProc = true;
              spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 46, t('combat.synMirrorEmber'), COLORS.crimsonBright, 17, 1.1);
            }
            triggerHitstop(0.058);
            addShake(9);
            punchZoom(1.04);
            G.screenFlash = { alpha: 0.2, color: COLORS.goldBright };
            G.player.parryActive = false;
            G.player.parryCooldown = 0.03;
            G.player.riposteWindow = 0.52;
            if (G.player.seals < G.player.maxSeals) G.player.seals++;
            G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(28 * rsOrb.soulGainMult));

            pr.reflected = true;
            pr.owner = 'player';
            pr.life = 1.6;
            if (pr.source && pr.source.alive) {
              const rdx = (pr.source.x + pr.source.w / 2) - pr.x;
              const rdy = (pr.source.y + pr.source.h / 2) - pr.y;
              const rlen = Math.max(1, Math.hypot(rdx, rdy));
              const refSpd = pr.kind === 'yuanResonanceWave' ? 760 : 620;
              pr.vx = (rdx / rlen) * refSpd;
              pr.vy = (rdy / rlen) * refSpd;
            } else {
              pr.vx = -pr.vx * 1.8;
              pr.vy = -pr.vy * 1.8;
            }
            spawnImpactBurst(pr.x, pr.y, 'parry', 1.05);
            spawnShockwave(pr.x, pr.y, 76, COLORS.goldBright, 4.2, 0.26);
            spawnParticles(pr.x, pr.y, 22, { color: COLORS.goldBright, speed: 320, spark: true, bounce: true, grav: 560 });
            spawnFloatText(pr.x, pr.y - 22, t('combat.orbReflect'), COLORS.goldBright, 21, 0.85);
          } else {
            const hitSrc = pr.inflictsFrost
              ? { x: pr.x, w: 0, isBoss: false, inflictsFrost: pr.inflictsFrost }
              : (pr.source || { x: pr.x, w: 0, isBoss: false });
            applyIncomingAttackToPlayer(hitSrc, pr.dmg, false, 180);
            pr.life = 0;
          }
        }
      } else {
        const targets = getLivingFoes();
        for (const foe of targets) {
          if (aabbOverlap(oBox, foe)) {
            audio.playDetonate();
            triggerHitstop(0.05);
            addShake(9);
            const isEchoClash = pr.kind === 'boss4EchoOrb' && foe.kind === 'boss4';
            const isYuanWave = pr.kind === 'yuanResonanceWave' && foe.kind === 'boss3';
            damageEnemyHP(foe, isYuanWave ? 58 : isEchoClash ? 62 : (foe.isBoss ? 32 : 48), true);
            addPostureToEnemy(foe, isYuanWave ? 68 : isEchoClash ? 56 : (foe.isBoss ? 28 : 55));
            if (isYuanWave) {
              foe.symphonyReflects = (foe.symphonyReflects || 0) + 1;
              if (foe.symphonyReflects >= 3 && foe.alive) {
                foe.symphonyReflects = 0; damageEnemyHP(foe, 45, true); addPostureToEnemy(foe, foe.maxPosture);
                spawnShockwave(foe.x + foe.w * 0.5, foe.y + 44, 240, COLORS.goldBright, 5.4, 0.45);
                spawnFloatText(foe.x + foe.w * 0.5, foe.y - 44, t('combat.yuanSymphonyBreak'), COLORS.goldBright, 23, 1.35);
              } else {
                spawnFloatText(foe.x + foe.w * 0.5, foe.y - 34, t('combat.yuanWaveReflect', foe.symphonyReflects), COLORS.goldBright, 20, 0.95);
              }
            } else if (isEchoClash) {
              spawnFloatText(foe.x + foe.w * 0.5, foe.y - 34, t('combat.boss4ClashBreak'), COLORS.goldBright, 22, 1.0);
            }
            spawnShockwave(pr.x, pr.y, 75, COLORS.goldBright, 4, 0.25);
            spawnParticles(pr.x, pr.y, 22, { color: COLORS.goldBright, speed: 300, spark: true });
            pr.life = 0;
            break;
          }
        }
      }
    }

    let hitSolid = false;
    if (pr.kind === 'wraithOrb' || pr.kind === 'windBlade' || pr.kind === 'frostShard' || pr.kind === 'boss4EchoOrb') {
      const pb = { x: pr.x - 5, y: pr.y - 5, w: 10, h: 10 };
      for (const s of SOLIDS) {
        if (s.type !== 'platform' && aabbOverlap(pb, s)) { hitSolid = true; break; }
      }
    }
    if (hitSolid || pr.life <= 0 || pr.x < WORLD_MIN_X - 40 || pr.x > WORLD_W + 40 || pr.y > WORLD_H + 40 || pr.y < WORLD_MIN_Y - 40) {
      if (hitSolid) spawnParticles(pr.x, pr.y, 7, { color: COLORS.crimsonBright, speed: 120, life: 0.22 });
      G.projectiles.splice(i, 1);
    }
  }

  // Ink Seal Talismans
  for (let i = G.talismans.length - 1; i >= 0; i--) {
    const tm = G.talismans[i];
    tm.timer -= dt;
    if (tm.target && tm.target.alive) {
      tm.x = tm.target.x + tm.target.w / 2;
      tm.y = tm.target.y + tm.target.h * 0.42;
    }
    if (tm.timer <= 0) {
      audio.playDetonate();
      triggerHaptic('heavyHit', 1.1);
      triggerHitstop(0.055);
      addShake(12);
      G.screenFlash = { alpha: 0.2, color: COLORS.goldBright };
      const radius = 115 + tm.seals * 25;
      spawnShockwave(tm.x, tm.y, radius, COLORS.goldBright, 5, 0.34);
      spawnParticles(tm.x, tm.y, 32, { color: COLORS.goldBright, speed: 320, spark: true, life: 0.48 });
      spawnFloatText(tm.x, tm.y - 30, t('combat.sealDetonate'), COLORS.goldBright, 22, 0.9);
      const foes = getLivingFoes();
      for (const f of foes) {
        if (Math.hypot((f.x + f.w / 2) - tm.x, (f.y + f.h / 2) - tm.y) < radius) {
          damageEnemyHP(f, 34 * tm.seals, true);
          addPostureToEnemy(f, 38 * tm.seals);
        }
      }
      G.talismans.splice(i, 1);
    }
  }

  // Boss Phase 2 Full-Arena Tide / Resonance Nova (Aerial Grapple/Lantern Check)
  if (G.chapelTide) {
    G.chapelTide.timer -= dt;
    if (G.chapelTide.hitCd > 0) G.chapelTide.hitCd -= dt;
    const owner = G.chapelTide.owner || G.boss;
    const x0 = G.chapelTide.x0 !== undefined ? G.chapelTide.x0 : 2648;
    const aw = G.chapelTide.w !== undefined ? G.chapelTide.w : 1090;
    const fy = G.chapelTide.floorY !== undefined ? G.chapelTide.floorY : FLOOR_Y;
    const pCol = G.chapelTide.theme === 'gold' ? COLORS.goldBright : COLORS.crimsonBright;
    if (!owner || !owner.alive) {
      G.chapelTide = null;
    } else if (G.chapelTide.phase === 'surge') {
      if (Math.random() < 42 * dt) {
        const rx = x0 + 12 + Math.random() * (aw - 24);
        spawnParticles(rx, fy - 20 - Math.random() * 55, 1, { color: pCol, speed: 120, grav: -180, life: 0.34 });
      }
      if (G.player && G.player.hp > 0 && G.chapelTide.hitCd <= 0 && G.player.x + G.player.w > x0 && G.player.x < x0 + aw) {
        if (G.player.y + G.player.h > fy - 86 && G.player.y < fy + 20) {
          G.chapelTide.hitCd = 0.48;
          applyIncomingAttackToPlayer({ x: G.player.x + G.player.w / 2 - G.player.facing * 20, w: 0, isBoss: true }, 24, true, 160);
        }
      }
      if (G.chapelTide.timer <= 0) {
        G.chapelTide = null;
      }
    } else if (G.chapelTide.timer <= -0.3) {
      G.chapelTide = null;
    }
  }

  // Boss Ground Shadow / Molten Waves
  for (let i = G.groundWaves.length - 1; i >= 0; i--) {
    const gw = G.groundWaves[i];
    const fy = gw.y !== undefined ? gw.y : FLOOR_Y;
    const minX = gw.minX !== undefined ? gw.minX : 2620;
    const maxX = gw.maxX !== undefined ? gw.maxX : 3760;
    gw.x += gw.vx * dt;
    gw.life -= dt;
    if (Math.random() < 32 * dt) {
      const gwCol = gw.theme === 'vine' ? '#4ade80' : (gw.theme === 'frost' ? '#7dd3fc' : (gw.gold ? COLORS.goldBright : COLORS.crimsonBright));
      spawnParticles(gw.x, fy - 8, 1, { color: gwCol, speed: 90, grav: -160, life: 0.3 });
    }
    if (!gw.hit && aabbOverlap({ x: gw.x - gw.w / 2, y: fy - gw.h, w: gw.w, h: gw.h }, G.player)) {
      gw.hit = true;
      const gwSrc = gw.theme === 'frost' ? { x: gw.x, w: 0, isBoss: false, inflictsFrost: 28 } : { x: gw.x, w: 0, isBoss: true };
      applyIncomingAttackToPlayer(gwSrc, 24, true, 240);
    }
    if (gw.life <= 0 || gw.x < minX || gw.x > maxX) G.groundWaves.splice(i, 1);
  }

  // Toxic Fungal Spore Clouds (枯墨古林毒孢云 — 可用 W+L 镇魂钟鸣驱散)
  if (G.sporeClouds && G.sporeClouds.length > 0) {
    for (let i = G.sporeClouds.length - 1; i >= 0; i--) {
      const sc = G.sporeClouds[i];
      sc.life -= dt;
      if (Math.random() < 12 * dt) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * sc.r * 0.85;
        spawnParticles(sc.x + Math.cos(ang) * dist, sc.y + Math.sin(ang) * dist * 0.65, 1, {
          color: '#4ade80', speed: 32, grav: -35, life: 0.45
        });
      }
      if (G.player && G.player.hp > 0 && G.player.sporeDmgCd <= 0 && G.player.iframeTimer <= 0 && G.player.execTimer <= 0 && G.player.grappleState === 'none') {
        const px = G.player.x + G.player.w * 0.5;
        const py = G.player.y + G.player.h * 0.5;
        if (Math.hypot(px - sc.x, py - sc.y) < sc.r + 12) {
          if (getRelicStats().sporeImmune) {
            G.player.sporeDmgCd = 0.9;
            spawnParticles(px, py, 5, { color: '#6ee7b7', speed: 80, grav: -60, life: 0.3 });
            continue;
          }
          G.player.sporeDmgCd = 0.72;
          const assistMult = (G.settings && typeof G.settings.damageTakenMult === 'number') ? G.settings.damageTakenMult : 1.0;
          const dmg = Math.max(1, Math.round((sc.dmg || 9) * assistMult));
          G.player.hp = Math.max(0, G.player.hp - dmg);
          G.stats.damageTaken += dmg;
          if (G.echoSession) G.echoSession.damageTaken += dmg;
          audio.playHit(false);
          G.screenFlash = { alpha: 0.16, color: '#22c55e' };
          spawnParticles(px, py, 10, { color: '#4ade80', speed: 140, grav: -40, life: 0.4 });
          spawnFloatText(px, G.player.y - 20, t('combat.sporeDmg', dmg), '#4ade80', 17, 0.8);
          if (G.player.hp <= 0) {
            G.player.hp = 0;
            G.player.deathTimer = 0.65;
            G.player.vx = -G.player.facing * 80;
            G.player.vy = -120;
            dropPlayerEchoesOnDeath(false);
            scheduleOutcome(hooks.showDeath, 650, false);
          }
        }
      }
      if (sc.life <= 0) G.sporeClouds.splice(i, 1);
    }
  }

  // Slashes, Shockwaves, ImpactBursts, HitMarks, Afterimages, Particles, Float Texts
  for (let i = G.slashes.length - 1; i >= 0; i--) {
    const s = G.slashes[i];
    s.life -= dt;
    if (s.followPlayer && G.player && G.player.hp > 0) {
      s.x = G.player.x + G.player.w / 2 + s.offX;
      s.y = G.player.y + 26 + s.offY;
    } else if (s.isIaiTrack && G.player && G.player.iaiLungeTimer > 0) {
      s.x1 = G.player.x + G.player.w / 2 + s.facing * 42;
    }
    if (s.life <= 0) G.slashes.splice(i, 1);
  }
  if (G.bellQuakes) {
    for (let i = G.bellQuakes.length - 1; i >= 0; i--) {
      G.bellQuakes[i].life -= dt;
      if (G.bellQuakes[i].life <= 0) G.bellQuakes.splice(i, 1);
    }
  }

  // v25.0 Blade Forge Trait `shadow_twin` Delayed Phantom Follow-Up Cuts
  if (G.delayedStrikes && G.delayedStrikes.length > 0) {
    for (let i = G.delayedStrikes.length - 1; i >= 0; i--) {
      const ds = G.delayedStrikes[i];
      ds.timer -= dt;
      if (ds.timer <= 0) {
        audio.playIaiSlash();
        addShake(6);
        G.slashes.push({
          x: ds.x, y: ds.y, x0: ds.x - ds.facing * 52, x1: ds.x + ds.facing * 88,
          facing: ds.facing, type: 'iai', life: 0.24, maxLife: 0.24
        });
        spawnShockwave(ds.x, ds.y, 66, COLORS.cyanBright, 3.0, 0.22);
        const dsBox = { x: ds.x - 74, y: ds.y - 36, w: 148, h: 72 };
        let hitAny = false;
        for (const foe of getLivingFoes()) {
          if (aabbOverlap(dsBox, foe)) {
            hitAny = true;
            damageEnemyHP(foe, ds.dmg, true);
            addPostureToEnemy(foe, ds.posture);
            spawnHitMark(foe.x + foe.w * 0.5, foe.y + foe.h * 0.45, -0.35 * ds.facing, COLORS.cyanBright, 90, 7);
          }
        }
        if (hitAny && G.player) {
          G.player.soul = Math.min(G.player.maxSoul, G.player.soul + Math.round(10 * getRelicStats().soulGainMult));
          spawnFloatText(ds.x, ds.y - 26, t('combat.traitShadowTwin'), COLORS.cyanBright, 16, 0.72);
        }
        G.delayedStrikes.splice(i, 1);
      }
    }
  }

  // v25.0 Full-Seal Weapon Resonance Ultimates Runtime
  if (G.weaponUltimates && G.weaponUltimates.length > 0) {
    for (let i = G.weaponUltimates.length - 1; i >= 0; i--) {
      const u = G.weaponUltimates[i];
      u.life -= dt;
      if (u.kind === 'blade_dimension') {
        u.cutTimer -= dt;
        if (u.cutsDone < u.cutsTotal && u.cutTimer <= 0) {
          const cutIdx = u.cutsDone++;
          const isFinal = cutIdx === u.cutsTotal - 1;
          u.cutTimer = u.cutStep || 0.085;
          const liveTargets = (u.targets || []).filter(f => f && f.alive);
          const pick = liveTargets.length > 0 ? liveTargets[cutIdx % liveTargets.length] : null;
          const cx = pick ? (pick.x + pick.w * 0.5) : (u.x + (cutIdx - 2) * 34 * u.facing);
          const cy = pick ? (pick.y + pick.h * 0.45) : (u.y + Math.sin(cutIdx * 1.9) * 28);
          const ang = (cutIdx % 2 === 0 ? -0.62 : 0.62) + (cutIdx - 2) * 0.14;
          u.ribbons.push({ x: cx, y: cy, ang, len: isFinal ? 175 : 132, life: 0.34, maxLife: 0.34, gold: isFinal });
          audio.playHit(isFinal, isFinal ? 3 : 2);
          addShake(isFinal ? 13 : 6);
          spawnHitMark(cx, cy, ang, isFinal ? COLORS.goldBright : '#ffffff', isFinal ? 135 : 96, isFinal ? 9 : 7);
          spawnParticles(cx, cy, isFinal ? 26 : 12, { color: COLORS.goldBright, speed: 320, spark: true, life: 0.38 });
          if (isFinal) {
            spawnShockwave(cx, cy, 160, u.augFrost ? '#bae6fd' : COLORS.goldBright, 5.2, 0.36);
            spawnShockwave(cx, cy, 105, u.augGale ? '#7dd3fc' : COLORS.crimsonBright, 3.4, 0.28);
            if (u.augFrost) {
              audio.playFrostShatter();
              [-1, 1].forEach(dir => {
                G.projectiles.push({
                  owner: 'player', kind: 'bellHoming',
                  x: cx + dir * 20, y: cy, vx: dir * 520, vy: -90, speed: 520, r: 12,
                  dmg: Math.round(u.cutDmg * 1.15), posture: 24, breaksShield: true, soulOnHit: 6,
                  life: 0.95, maxLife: 0.95, facing: dir, hitIds: new Set()
                });
              });
            }
          }
          if (u.augSpore && G.sporeClouds && G.sporeClouds.length > 0) {
            for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
              if (Math.hypot(G.sporeClouds[si].x - cx, G.sporeClouds[si].y - cy) <= 165) {
                G.sporeClouds.splice(si, 1);
                audio.playSporePurify();
              }
            }
          }
          const cutR = isFinal ? 150 : 108;
          for (const foe of getLivingFoes()) {
            const fx = foe.x + foe.w * 0.5;
            const fy = foe.y + foe.h * 0.45;
            if (Math.hypot(fx - cx, fy - cy) <= cutR + Math.max(foe.w, foe.h) * 0.3) {
              if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
                foe.shieldBrokenTimer = 3.2;
                if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
                audio.playShieldBreak();
              }
              damageEnemyHP(foe, isFinal ? Math.round(u.cutDmg * 1.55) : u.cutDmg, true);
              addPostureToEnemy(foe, isFinal ? Math.round(u.cutPosture * 1.45) : u.cutPosture);
              if (u.augSpore && G.player) {
                G.player.hp = Math.min(G.player.maxHp, G.player.hp + 4);
                G.player.soul = Math.min(G.player.maxSoul, G.player.soul + 5);
              }
            }
          }
          for (const pr of G.projectiles) {
            if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - cx, pr.y - cy) <= cutR + pr.r) pr.life = 0;
          }
        }
        for (let r = u.ribbons.length - 1; r >= 0; r--) {
          u.ribbons[r].life -= dt;
          if (u.ribbons[r].life <= 0) u.ribbons.splice(r, 1);
        }
      } else if (u.kind === 'hammer_bell') {
        u.elapsed += dt;
        const p = Math.min(1, u.elapsed / u.dropDur);
        const eased = p * p * p;
        u.y = u.startY + (u.groundY - u.startY) * eased;
        if (!u.impacted && p >= 1) {
          u.impacted = true;
          audio.playBellQuake();
          triggerHaptic('execution', 1.25);
          triggerHitstop(0.065, true);
          addShake(18);
          punchZoom(1.06);
          G.screenFlash = { alpha: 0.30, color: COLORS.goldBright };
          const ix = u.x;
          const iy = u.groundY - 12;
          spawnShockwave(ix, iy, 260, COLORS.goldBright, 6.2, 0.45);
          spawnShockwave(ix, iy, 170, '#fef9c3', 3.8, 0.32);
          spawnParticles(ix, iy, 36, { color: COLORS.goldBright, speed: 360, spark: true, bounce: true, grav: 600, life: 0.55 });
          spawnParticles(ix, iy, 18, { color: COLORS.parchment, speed: 260, grav: 440, life: 0.48 });
          if (G.player) {
            const healAmt = Math.round(G.player.maxHp * (u.augSpore ? 0.20 : 0.12));
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + healAmt);
            G.player.grayHp = 0;
          }
          if (u.augFrost) {
            audio.playFrostShatter();
            spawnShockwave(ix, iy, 290, '#bae6fd', 4.6, 0.42);
          }
          if (u.augSpore && G.sporeClouds && G.sporeClouds.length > 0) {
            for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
              if (Math.hypot(G.sporeClouds[si].x - ix, G.sporeClouds[si].y - iy) <= 320) {
                spawnShockwave(G.sporeClouds[si].x, G.sporeClouds[si].y, 90, '#6ee7b7', 3.4, 0.28);
                G.sporeClouds.splice(si, 1);
                audio.playSporePurify();
              }
            }
          }
          if (u.augGale) {
            audio.playWindBlade();
            [-1, 1].forEach(dir => {
              G.projectiles.push({
                owner: 'player', kind: 'bellWave',
                x: ix + dir * 28, y: iy - 28, vx: dir * 560, vy: -110, r: 22,
                dmg: Math.round(u.waveDmg * 0.85), posture: 22, heavy: true, breaksShield: true, soulOnHit: 8,
                life: 0.62, maxLife: 0.62, facing: dir, hitIds: new Set()
              });
            });
          }
          for (const foe of getLivingFoes()) {
            const fx = foe.x + foe.w * 0.5;
            const fy = foe.y + foe.h * 0.5;
            if (Math.hypot(fx - ix, fy - iy) <= 260) {
              if ((foe.kind === 'golem' || foe.kind === 'warden_forest' || ((foe.kind === 'boss2' || foe.kind === 'dummy') && foe.shieldUp)) && foe.shieldBrokenTimer <= 0) {
                foe.shieldBrokenTimer = 4.2;
                if (foe.kind === 'boss2' || foe.kind === 'dummy') foe.shieldUp = false;
                audio.playShieldBreak();
              }
              damageEnemyHP(foe, u.dmg, true);
              addPostureToEnemy(foe, u.posture);
              if (!foe.isBoss && foe.state !== 'stagger') {
                foe.vx = (fx >= ix ? 1 : -1) * 320;
                if (foe.kind !== 'wraith' && foe.kind !== 'falcon') foe.vy = -260;
              }
            }
          }
          // Twin colossal seismic hammerWaves
          [-1, 1].forEach(dir => {
            G.projectiles.push({
              owner: 'player', kind: 'hammerWave',
              x: ix + dir * 40, y: iy, vx: dir * 560, vy: 0, r: 32,
              dmg: u.waveDmg, posture: 36, heavy: true, breaksShield: true, soulOnHit: 10,
              life: 0.72, maxLife: 0.72, facing: dir, hitIds: new Set()
            });
          });
          // Shatter secret walls, clear enemy projectiles, ring lanterns & puzzle bells
          if (G.worldState) {
            for (const w of G.worldState.secretWalls) {
              if (!w.broken && Math.hypot((w.x + w.w * 0.5) - ix, (w.y + w.h * 0.5) - iy) <= 265) damageSecretWall(w, 3);
            }
          }
          for (const pr of G.projectiles) {
            if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - ix, pr.y - iy) <= 260) pr.life = 0;
          }
          for (const l of G.lanterns) {
            const lx = l.x + Math.sin(l.angle) * l.len;
            const ly = l.anchorY + Math.cos(l.angle) * l.len;
            if (Math.hypot(lx - ix, ly - iy) <= 290) {
              l.angVel += (lx >= ix ? 1 : -1) * 8.0;
              l.ringFlash = 0.6;
              tryQuellChapelTideByLantern(l, lx, ly);
            }
          }
          if (G.resonancePuzzles) {
            for (const pz of G.resonancePuzzles) {
              for (const b of pz.bells) {
                if (Math.hypot(b.x - ix, b.y - iy) <= 290) ringResonanceBell(pz, b, b.x >= ix ? 1 : -1);
              }
            }
          }
        }
      } else if (u.kind === 'bell_sanctum') {
        u.pulseTimer -= dt;
        if (u.pulsesLeft > 0 && u.pulseTimer <= 0) {
          u.pulsesLeft--;
          u.pulseTimer = u.pulseInterval;
          audio.playBellChimeCast(3);
          addShake(4.5);
          spawnShockwave(u.x, u.y, u.radius, COLORS.cyanBright, 3.6, 0.34);
          spawnShockwave(u.x, u.y, u.radius * 0.62, COLORS.goldBright, 2.2, 0.26);
          if (G.player && G.player.hp > 0) {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + (u.augSpore ? 12 : 6));
            G.player.soul = Math.min(G.player.maxSoul, G.player.soul + (u.augSpore ? 18 : 12));
          }
          if (u.augFrost) {
            G.projectiles.push({
              owner: 'player', kind: 'bellHoming',
              x: u.x, y: u.y - 26, vx: 0, vy: -480, speed: 540, r: 12,
              dmg: Math.round(u.dartDmg * 1.15), posture: 26, breaksShield: true, soulOnHit: 6,
              life: 1.15, maxLife: 1.15, facing: 1, hitIds: new Set()
            });
          }
          // Damage & stagger foes inside sanctum
          for (const foe of getLivingFoes()) {
            const fx = foe.x + foe.w * 0.5;
            const fy = foe.y + foe.h * 0.45;
            if (Math.hypot(fx - u.x, fy - u.y) <= u.radius + Math.max(foe.w, foe.h) * 0.35) {
              damageEnemyHP(foe, u.pulseDmg, true);
              addPostureToEnemy(foe, u.pulsePosture);
              spawnParticles(fx, fy, 8, { color: COLORS.cyanBright, speed: 180, spark: true, life: 0.28 });
            }
          }
          // Launch 2 homing Spirit Darts per pulse
          for (let d = 0; d < 2; d++) {
            const a = (d === 0 ? -0.65 : -Math.PI + 0.65) + (u.pulsesLeft * 0.35);
            G.projectiles.push({
              owner: 'player', kind: 'bellHoming',
              x: u.x + Math.cos(a) * 32, y: u.y + Math.sin(a) * 32,
              vx: Math.cos(a) * 510, vy: Math.sin(a) * 510, speed: 510, r: 11,
              dmg: u.dartDmg, posture: 14, breaksShield: true, soulOnHit: 6,
              life: 1.15, maxLife: 1.15, facing: Math.cos(a) >= 0 ? 1 : -1, hitIds: new Set()
            });
          }
          // Disperse enemy orbs, purify toxic spore clouds & ring nearby lanterns/bells
          for (const pr of G.projectiles) {
            if (pr.owner === 'enemy' && pr.life > 0 && Math.hypot(pr.x - u.x, pr.y - u.y) <= u.radius + pr.r) {
              pr.life = 0;
              spawnParticles(pr.x, pr.y, 8, { color: COLORS.cyanBright, speed: 160, spark: true });
            }
          }
          if (G.sporeClouds && G.sporeClouds.length > 0) {
            for (let si = G.sporeClouds.length - 1; si >= 0; si--) {
              const sc = G.sporeClouds[si];
              if (Math.hypot(sc.x - u.x, sc.y - u.y) <= u.radius + sc.r) {
                audio.playSporePurify();
                spawnShockwave(sc.x, sc.y, sc.r * (u.augSpore ? 1.5 : 1.0), '#6ee7b7', 3.4, 0.28);
                if (u.augSpore) {
                  for (const foe of getLivingFoes()) {
                    if (Math.hypot((foe.x + foe.w * 0.5) - sc.x, (foe.y + foe.h * 0.5) - sc.y) <= sc.r + 125) {
                      damageEnemyHP(foe, 42, true);
                      addPostureToEnemy(foe, 28);
                    }
                  }
                }
                G.sporeClouds.splice(si, 1);
              }
            }
          }
          for (const l of G.lanterns) {
            const lx = l.x + Math.sin(l.angle) * l.len;
            const ly = l.anchorY + Math.cos(l.angle) * l.len;
            if (Math.hypot(lx - u.x, ly - u.y) <= u.radius + 40) {
              l.angVel += (lx >= u.x ? 1 : -1) * 6.0;
              l.ringFlash = 0.45;
              tryQuellChapelTideByLantern(l, lx, ly);
            }
          }
          if (G.resonancePuzzles) {
            for (const pz of G.resonancePuzzles) {
              for (const b of pz.bells) {
                if (Math.hypot(b.x - u.x, b.y - u.y) <= u.radius + 45) ringResonanceBell(pz, b, b.x >= u.x ? 1 : -1);
              }
            }
          }
        }
      }
      if (u.life <= 0) G.weaponUltimates.splice(i, 1);
    }
  }
  for (let i = G.shockwaves.length - 1; i >= 0; i--) {
    const s = G.shockwaves[i];
    s.life -= dt;
    s.r = s.maxR * (1 - Math.pow(Math.max(0, s.life / s.maxLife), 2));
    if (s.life <= 0) G.shockwaves.splice(i, 1);
  }
  for (let i = G.impactBursts.length - 1; i >= 0; i--) {
    G.impactBursts[i].life -= dt;
    if (G.impactBursts[i].life <= 0) G.impactBursts.splice(i, 1);
  }
  for (let i = G.hitMarks.length - 1; i >= 0; i--) {
    G.hitMarks[i].life -= dt;
    if (G.hitMarks[i].life <= 0) G.hitMarks.splice(i, 1);
  }
  for (let i = G.afterimages.length - 1; i >= 0; i--) {
    G.afterimages[i].life -= dt;
    if (G.afterimages[i].life <= 0) G.afterimages.splice(i, 1);
  }
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.bounce && p.vy > 0) {
      const surfY = getGroundSurfaceY(p.x, p.y - 4);
      if (p.y >= surfY - 2) {
        p.y = surfY - 2;
        p.vy = -p.vy * 0.42;
        p.vx *= 0.72;
        p.bounce = false;
      }
    }

    if (p.life <= 0) {
      recycleParticle(p);
      const last = G.particles.pop();
      if (i < G.particles.length) G.particles[i] = last;
    }
  }
  for (let i = G.floatTexts.length - 1; i >= 0; i--) {
    const ft = G.floatTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ft.vy *= damp(0.94, dt);
    if (ft.life <= 0) G.floatTexts.splice(i, 1);
  }
  for (const m of G.ambientMotes) {
    m.x += m.vx * dt;
    m.y += (m.vy + Math.sin(G.globalTime * 1.5 + m.phase) * 10) * dt;
    if (m.x < -10) m.x = G.canvasW + 10;
    if (m.y < -10) m.y = G.canvasH + 10;
    if (m.y > G.canvasH + 10) m.y = -10;
  }

  if (G.bossBanner) { G.bossBanner.life -= dt; if (G.bossBanner.life <= 0) G.bossBanner = null; }
  if (G.zoneBanner) { G.zoneBanner.life -= dt; if (G.zoneBanner.life <= 0) G.zoneBanner = null; }
  if (G.bestiaryToast) { G.bestiaryToast.life -= dt; if (G.bestiaryToast.life <= 0) G.bestiaryToast = null; }

  // v40.0 Auto-record any living enemy/boss entering camera viewport into Bestiary!
  G._bestiaryScanCd = (G._bestiaryScanCd || 0) - dt;
  if (G._bestiaryScanCd <= 0 && G.gameState === 'playing' && !G.benchActive && G.worldState) {
    G._bestiaryScanCd = 0.25;
    const vx0 = G.cam.x + 24, vx1 = G.cam.x + G.canvasW - 24;
    const vy0 = G.cam.y + 24, vy1 = G.cam.y + G.canvasH - 24;
    const foes = getLivingFoes();
    for (let i = 0; i < foes.length; i++) {
      const f = foes[i];
      if (!f || !f.kind || isRoomOccluded(f.roomId)) continue;
      const fx = f.x + f.w * 0.5, fy = f.y + f.h * 0.5;
      if (fx >= vx0 && fx <= vx1 && fy >= vy0 && fy <= vy1) recordBestiaryEvent(f.kind, 'seen', true);
    }
  }

  // v41.5 Lethal Thorn-Spike Walls: jumping onto/touching spikes deals contact damage + knockback away from wall!
  if (SLICK_WALLS.length > 0 && G.player && G.player.hp > 0 && G.player.execTimer <= 0) {
    for (let i = 0; i < SLICK_WALLS.length; i++) {
      const sw = SLICK_WALLS[i];
      if (isRoomOccluded(sw.roomId)) continue;
      let hx = sw.x, hw = sw.w;
      if (sw.side === 'left') { hx = sw.x - 10; hw = 14; }
      else if (sw.side === 'right') { hx = sw.x + sw.w - 4; hw = 14; }
      else { hx = sw.x - 10; hw = sw.w + 20; }
      const spikeBox = { x: hx, y: sw.y + 3, w: hw, h: Math.max(8, sw.h - 6) };
      if (sw.clangFlash > 0) sw.clangFlash = Math.max(0, sw.clangFlash - dt);
      if (aabbOverlap(G.player, spikeBox)) {
        if (G.player.iframeTimer <= 0 && (G.player.thornGraceTimer || 0) <= 0) {
          const pCx = G.player.x + G.player.w * 0.5;
          const pushRight = sw.side === 'right' ? true : sw.side === 'left' ? false : (pCx >= sw.x + sw.w * 0.5);
          const fakeSrc = { x: pushRight ? (G.player.x - 30) : (G.player.x + G.player.w + 10), w: 20, isBoss: false };
          if (G.player.grappleState !== 'none') G.player.grappleState = 'none';
          applyIncomingAttackToPlayer(fakeSrc, 16, true, 300);
          G.player.vy = Math.min(G.player.vy, -245);
          const spX = pushRight ? (sw.x + sw.w + 4) : (sw.x - 4);
          const spY = G.player.y + G.player.h * 0.5;
          spawnParticles(spX, spY, 16, { color: COLORS.crimsonBright, speed: 240, spark: true, life: 0.36 });
          spawnFloatText(pCx, G.player.y - 26, t('combat.thornWallHit'), COLORS.crimsonBright, 17, 0.95);
        }
        break;
      }
    }
  }

  // v40.0 Sweeping Void Curtains (only phaseable unscathed via Shadow Dash!)
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    if (!vb.sweeping) continue;
    vb.x = vb.sweepMinX + (0.5 + 0.5 * Math.sin(G.globalTime * vb.sweepSpeed + (vb.sweepPhase || 0))) * (vb.sweepMaxX - vb.sweepMinX);
    if (G.player && G.player.hp > 0 && aabbOverlap(G.player, vb)) {
      const phasing = !!(G.worldState && G.worldState.abilities.shadeDash && (G.player.dashTimer > 0 || G.player.shadePassTimer > 0));
      if (phasing) {
        if ((vb._phaseFxCd || 0) <= 0) {
          vb._phaseFxCd = 0.35;
          spawnParticles(vb.x + vb.w * 0.5, G.player.y + 26, 14, { color: COLORS.violetBright, speed: 220, spark: true, life: 0.32 });
        }
      } else if (G.player.iframeTimer <= 0) {
        applyIncomingAttackToPlayer({ x: vb.x, w: vb.w, isBoss: false }, 18, true, 240);
        if ((G.player.barrierHintCd || 0) <= 0) {
          G.player.barrierHintCd = 1.6;
          spawnFloatText(vb.x + vb.w * 0.5, vb.y - 14, t('combat.sweepCurtainHint'), COLORS.violetBright, 16, 1.25);
        }
      }
    }
    if (vb._phaseFxCd > 0) vb._phaseFxCd -= dt;
  }
  if (G.foundryCrucibles && G.foundryCrucibles.length > 0) {
    for (const cr of G.foundryCrucibles) {
      if (cr.state === 'spent') {
        cr.respawnTimer -= dt;
        if (cr.respawnTimer <= 0) { cr.state = 'hanging'; cr.y = cr.baseY; cr.vy = 0; }
      } else if (cr.state === 'falling') {
        cr.vy = Math.min(1150, cr.vy + 1950 * dt); cr.y += cr.vy * dt;
        const b2 = G.boss2;
        const hitBoss2 = !!(b2 && b2.alive && Math.abs((b2.x + b2.w * 0.5) - cr.x) < 92 && Math.abs((b2.y + b2.h * 0.5) - cr.y) < 76);
        if (hitBoss2 || cr.y >= WELL_BOTTOM_Y - 16) {
          const ix = cr.x, iy = hitBoss2 ? (b2.y + b2.h * 0.45) : (WELL_BOTTOM_Y - 12);
          cr.state = 'spent'; cr.respawnTimer = 14.0;
          audio.playAirSlam(); addShake(15); punchZoom(1.045);
          G.screenFlash = { alpha: 0.24, color: COLORS.goldBright };
          spawnShockwave(ix, iy, 195, COLORS.goldBright, 5.4, 0.42);
          spawnParticles(ix, iy, 36, { color: COLORS.goldBright, speed: 340, spark: true, bounce: true, grav: 540, life: 0.52 });
          if (b2 && b2.alive && Math.hypot((b2.x + b2.w * 0.5) - ix, (b2.y + b2.h * 0.5) - iy) <= 215) {
            if (G.chapelTide && G.chapelTide.owner === b2) G.chapelTide = null;
            b2.shieldUp = false; b2.shieldBrokenTimer = 4.8; audio.playShieldBreak();
            damageEnemyHP(b2, 110, true); addPostureToEnemy(b2, 95);
            if (b2.alive && b2.state !== 'stagger') { b2.state = 'stagger'; b2.stateTimer = 2.4; b2.vx = 0; b2.vy = 0; }
            spawnFloatText(b2.x + b2.w * 0.5, b2.y - 44, t('combat.crucibleDouse'), COLORS.goldBright, 22, 1.55);
          }
        }
      }
    }
  }
  updateAchievementBanner(dt);
  updateThemeAndWeather(dt);
  if (G.wardenArenaFx) {
    if (G.wardenArenaFx.bellPulseTimer > 0) G.wardenArenaFx.bellPulseTimer = Math.max(0, G.wardenArenaFx.bellPulseTimer - dt);
    const hasBlizzWarden = G.enemies && G.enemies.some(e => e && e.alive && e.kind === 'warden_mountain' && e.awake && e.phase >= 2);
    if (!hasBlizzWarden && G.wardenArenaFx.blizzardAlpha > 0) {
      G.wardenArenaFx.blizzardAlpha = Math.max(0, G.wardenArenaFx.blizzardAlpha - dt * 1.4);
    }
    const hasWindWarden = G.enemies && G.enemies.some(e => e && e.alive && e.kind === 'warden_wind' && e.awake && e.phase >= 2);
    if (!hasWindWarden && G.wardenArenaFx.windTimer > 0) {
      G.wardenArenaFx.windTimer = 0;
      G.wardenArenaFx.windDir = 0;
    }
  }
  // v44.3 Bell-Smith Li Frame-Synchronized Anvil Strike (Visual Hammer Impact == Spark Burst == Metal Clang!)
  if (G.smithForge) {
    if (G.smithForge.flash > 0) G.smithForge.flash = Math.max(0, G.smithForge.flash - dt * 3.6);
    if (G.gameState === 'playing' && G.player && NPCS && NPCS.length > 0) {
      const SMITH_PERIOD = 2.2;
      const STRIKE_PHASE = 0.62;
      const rawCycles = G.globalTime / SMITH_PERIOD;
      const curCycle = Math.floor(rawCycles);
      const phase = rawCycles - curCycle;
      if (phase >= STRIKE_PHASE && G.smithForge.cycleIdx !== curCycle) {
        G.smithForge.cycleIdx = curCycle;
        const smith = NPCS.find(n => !n.kind || n.kind === 'smith');
        if (smith) {
          const dist = Math.hypot((G.player.x + G.player.w * 0.5) - smith.x, (G.player.y + G.player.h * 0.5) - smith.y);
          if (dist < 640) {
            G.smithForge.flash = 1.0;
            const ax = smith.x + 28;
            const ay = smith.y - 26;
            spawnParticles(ax, ay, 7, { color: COLORS.goldBright, speed: 155, angle: -Math.PI * 0.55, spread: 1.5, spark: true, bounce: true, grav: 440, life: 0.34 });
            const atten = Math.max(0.12, 1 - dist / 660);
            audio.playAnvilTap(atten * atten);
          }
        }
      }
    }
  }
  if (G.screenFlash.alpha > 0) G.screenFlash.alpha = Math.max(0, G.screenFlash.alpha - dt * 1.2);
}


export {
  updateThemeAndWeather, isRoomOccluded, updateRoomVisibility, snapCameraToPlayer, updateCamera, updateAmbientOnly
} from './worldCamera.js';
