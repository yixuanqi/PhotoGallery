// World hazards, pendulums, Abyssal River, projectiles, talismans, tides & camera
import { COLORS, ROOM_THEMES, ROOMS, SOLIDS, VOID_BARRIERS, WORLD_MIN_X, WORLD_MIN_Y, WORLD_W, WORLD_H, FLOOR_Y, PENDULUMS, ABYSSAL_RIVERS, PUDDLES, WIND_ZONES, BOUNCE_PADS } from './config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, getRelicStats, hasActiveWeaponTrait, isSkyBridgeOpen, scheduleOutcome, addShake, punchZoom, triggerHitstop, damp
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
  dropPlayerEchoesOnDeath, reclaimLostEchoes
} from './combat.js';
import { recordBestiaryEvent, checkAchievements, updateAchievementBanner } from './codex.js';
import { t } from './i18n.js';

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
    for (const w of G.worldState.secretWalls) {
      if (w.shake > 0) w.shake = Math.max(0, w.shake - dt);
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
    const hitRiver = ABYSSAL_RIVERS.find(rv => rv.w > 0 && px >= rv.x + 8 && px <= rv.x + rv.w - 8 && py >= rv.y + 2 && py <= rv.y + 38);
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
    } else if (pr.kind === 'wraithOrb' || pr.kind === 'windBlade' || pr.kind === 'frostShard' || pr.kind === 'boss4EchoOrb') {
      if (Math.random() < 28 * dt) {
        const trailCol = pr.reflected ? COLORS.goldBright : (pr.kind === 'boss4EchoOrb' ? (pr.stance === 'bell' ? COLORS.cyanBright : COLORS.goldBright) : pr.kind === 'windBlade' ? '#7dd3fc' : pr.kind === 'frostShard' ? '#bae6fd' : COLORS.crimson);
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
              pr.vx = (rdx / rlen) * 620;
              pr.vy = (rdy / rlen) * 620;
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
            damageEnemyHP(foe, isEchoClash ? 62 : (foe.isBoss ? 32 : 48), true);
            addPostureToEnemy(foe, isEchoClash ? 56 : (foe.isBoss ? 28 : 55));
            if (isEchoClash) spawnFloatText(foe.x + foe.w * 0.5, foe.y - 34, t('combat.boss4ClashBreak'), COLORS.goldBright, 22, 1.0);
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

  if (G.bossBanner) {
    G.bossBanner.life -= dt;
    if (G.bossBanner.life <= 0) G.bossBanner = null;
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
  if (G.screenFlash.alpha > 0) G.screenFlash.alpha = Math.max(0, G.screenFlash.alpha - dt * 1.2);
}

function lerpRgb(cur, dst, alpha) {
  cur[0] += (dst[0] - cur[0]) * alpha;
  cur[1] += (dst[1] - cur[1]) * alpha;
  cur[2] += (dst[2] - cur[2]) * alpha;
}

export function updateThemeAndWeather(dt) {
  const focusX = G.player ? (G.player.x + G.player.w * 0.5) : (G.cam.x + G.canvasW * 0.5);
  const focusY = G.player ? (G.player.y + G.player.h * 0.5) : (G.cam.y + G.canvasH * 0.5);
  const room = getRoomAt(focusX, focusY);
  const themeKey = (room && room.theme && ROOM_THEMES[room.theme]) ? room.theme : 'sanctuary';
  const target = ROOM_THEMES[themeKey];
  const tb = G.themeBlend;
  tb.activeTheme = themeKey;
  tb.weather = target.weather;

  const activeBoss = getAwakeBoss();
  const isPhase2 = !!(activeBoss && activeBoss.phase >= 2);
  const blendT = Math.min(1, dt * 2.6);
  if (isPhase2 && activeBoss.id === 'boss_hui') {
    lerpRgb(tb.skyTop, [26, 9, 15], blendT);
    lerpRgb(tb.skyMid, [40, 14, 22], blendT);
    lerpRgb(tb.skyBot, [9, 4, 8], blendT);
    lerpRgb(tb.mist, [38, 10, 16], blendT);
    lerpRgb(tb.accent, [248, 113, 113], blendT);
  } else if (isPhase2 && activeBoss.id === 'boss_ji') {
    lerpRgb(tb.skyTop, [32, 14, 9], blendT);
    lerpRgb(tb.skyMid, [56, 24, 12], blendT);
    lerpRgb(tb.skyBot, [13, 6, 4], blendT);
    lerpRgb(tb.mist, [58, 26, 10], blendT);
    lerpRgb(tb.accent, [253, 224, 71], blendT);
  } else if (isPhase2 && activeBoss.id === 'boss_yuan') {
    const isP3 = activeBoss.phase >= 3;
    lerpRgb(tb.skyTop, isP3 ? [38, 12, 10] : [26, 10, 28], blendT);
    lerpRgb(tb.skyMid, isP3 ? [68, 24, 14] : [46, 16, 44], blendT);
    lerpRgb(tb.skyBot, isP3 ? [16, 6, 5] : [11, 5, 14], blendT);
    lerpRgb(tb.mist, isP3 ? [72, 28, 12] : [48, 14, 46], blendT);
    lerpRgb(tb.accent, isP3 ? [254, 240, 138] : [216, 180, 254], blendT);
  } else {
    lerpRgb(tb.skyTop, target.skyTop, blendT);
    lerpRgb(tb.skyMid, target.skyMid, blendT);
    lerpRgb(tb.skyBot, target.skyBot, blendT);
    lerpRgb(tb.mist, target.mist, blendT);
    lerpRgb(tb.accent, target.accent, blendT);
  }

  const wType = tb.weather;
  const cw = Math.max(640, G.canvasW);
  const ch = Math.max(360, G.canvasH);
  for (let i = 0; i < G.weatherParticles.length; i++) {
    const wp = G.weatherParticles[i];
    if (wType === 'rain') {
      wp.x -= (155 * wp.speed) * dt;
      wp.y += (560 * wp.speed) * dt;
      if (wp.y > ch + 20 || wp.x < -30) {
        wp.x = Math.random() * (cw + 220);
        wp.y = -15 - Math.random() * 80;
      }
    } else if (wType === 'embers') {
      wp.x += Math.sin(G.globalTime * 2.6 + wp.phase) * 32 * dt - 12 * dt;
      wp.y -= (72 * wp.speed) * dt;
      if (wp.y < -20) {
        wp.x = Math.random() * cw;
        wp.y = ch + 10 + Math.random() * 40;
      }
    } else if (wType === 'mist') {
      if (i % 3 === 0) {
        // Vertical cave shaft water drips
        wp.y += (340 * wp.speed) * dt;
        if (wp.y > ch + 20) {
          wp.x = Math.random() * cw;
          wp.y = -20 - Math.random() * 100;
        }
      } else {
        // Slow rising humid mist wisps
        wp.x += Math.sin(G.globalTime * 0.9 + wp.phase) * 20 * dt;
        wp.y -= (24 * wp.speed) * dt;
        if (wp.y < -30) {
          wp.x = Math.random() * cw;
          wp.y = ch + 20;
        }
      }
    } else {
      // snow / ash
      wp.x += (Math.sin(G.globalTime * 1.4 + wp.phase) * 26 - 18) * dt;
      wp.y += (32 * wp.speed) * dt;
      if (wp.y > ch + 15 || wp.x < -20) {
        wp.x = Math.random() * (cw + 80);
        wp.y = -12 - Math.random() * 40;
      }
    }
  }

  // Procedural Rain-on-Puddle & Drip-on-River Ripples (zero per-frame array allocation)
  if (wType === 'rain' && Math.random() < dt * 8 && PUDDLES.length > 0 && G.cam.y < FLOOR_Y + 80) {
    const p = PUDDLES[Math.floor(Math.random() * PUDDLES.length)];
    if (p.x + p.w > G.cam.x && p.x < G.cam.x + G.canvasW) {
      spawnWeatherRipple(p.x + 8 + Math.random() * Math.max(8, p.w - 16), FLOOR_Y + 1, 14 + Math.random() * 14, 'rgba(186, 230, 253, 0.52)');
    }
  } else if (wType === 'mist' && Math.random() < dt * 6 && ABYSSAL_RIVERS.length > 0) {
    const rv = ABYSSAL_RIVERS[Math.floor(Math.random() * ABYSSAL_RIVERS.length)];
    if (rv.w > 0 && rv.x + rv.w > G.cam.x && rv.x < G.cam.x + G.canvasW && rv.y > G.cam.y - 40 && rv.y < G.cam.y + G.canvasH + 40) {
      spawnWeatherRipple(rv.x + 12 + Math.random() * Math.max(12, rv.w - 24), rv.y + 3, 18 + Math.random() * 16, 'rgba(125, 211, 252, 0.56)');
    }
  }

  for (let i = G.weatherRipples.length - 1; i >= 0; i--) {
    const rp = G.weatherRipples[i];
    rp.life -= dt;
    rp.r = rp.maxR * (1 - Math.max(0, rp.life / rp.maxLife));
    if (rp.life <= 0) G.weatherRipples.splice(i, 1);
  }
}

function isSecretWallBroken(wallId) {
  if (!G.worldState || !Array.isArray(G.worldState.secretWalls)) return false;
  for (let i = 0; i < G.worldState.secretWalls.length; i++) {
    if (G.worldState.secretWalls[i].id === wallId) return !!G.worldState.secretWalls[i].broken;
  }
  return true;
}

function roomsOverlapVertically(a, b) {
  const ay0 = a.bounds.y, ay1 = a.bounds.y + a.bounds.h;
  const by0 = b.bounds.y, by1 = b.bounds.y + b.bounds.h;
  return Math.min(ay1, by1) - Math.max(ay0, by0) >= 80;
}

function roomsTouchHorizontally(a, b) {
  const ax0 = a.bounds.x, ax1 = a.bounds.x + a.bounds.w;
  const bx0 = b.bounds.x, bx1 = b.bounds.x + b.bounds.w;
  return Math.abs(ax1 - bx0) <= 12 || Math.abs(bx1 - ax0) <= 12;
}

function roomsOverlapHorizontally(a, b) {
  const ax0 = a.bounds.x, ax1 = a.bounds.x + a.bounds.w;
  const bx0 = b.bounds.x, bx1 = b.bounds.x + b.bounds.w;
  return Math.min(ax1, bx1) - Math.max(ax0, bx0) >= 60;
}

function roomsTouchVertically(a, b) {
  const ay0 = a.bounds.y, ay1 = a.bounds.y + a.bounds.h;
  const by0 = b.bounds.y, by1 = b.bounds.y + b.bounds.h;
  return Math.abs(ay1 - by0) <= 24 || Math.abs(by1 - ay0) <= 24;
}

function isVerticalLinkOpen(fromRm, toRm) {
  if (!fromRm || !toRm || fromRm.id === toRm.id) return false;
  if (!Array.isArray(fromRm.connections) || !fromRm.connections.includes(toRm.id)) return false;
  if (!roomsTouchVertically(fromRm, toRm) || !roomsOverlapHorizontally(fromRm, toRm)) return false;
  const pair = `${fromRm.id}>${toRm.id}`;
  if (pair === 'r01_sanctuary>r10_ink_woods' || pair === 'r10_ink_woods>r01_sanctuary') {
    return isSecretWallBroken('wall_forest_shaft');
  }
  return true;
}

function isHorizontalLinkOpen(fromRm, toRm) {
  if (!fromRm || !toRm || fromRm.id === toRm.id) return false;
  if (!Array.isArray(fromRm.connections) || !fromRm.connections.includes(toRm.id)) return false;
  if (!roomsTouchHorizontally(fromRm, toRm) || !roomsOverlapVertically(fromRm, toRm)) return false;

  const pair = `${fromRm.id}>${toRm.id}`;
  const ws = G.worldState;
  if (!ws) return true;
  if (pair === 'r04_bell_well>r09_wind_spire') return isSecretWallBroken('wall_wind_west');
  if (pair === 'r04_bell_well>r06_crypt') return isSecretWallBroken('wall_crypt_east');
  if (pair === 'r07_ascent>r11_frost_ridge') return isSecretWallBroken('wall_frost_entry');
  if (pair === 'r06_crypt>r10_ink_woods') return !!(ws.abilities && ws.abilities.shadeDash);
  if (pair === 'r04_bell_well>r05_foundry') return !!((ws.abilities && ws.abilities.doubleJump) || G.echoSession);
  if (pair === 'r03_chapel>r04_bell_well') return !!ws.bossDefeated;
  if (pair === 'r05_foundry>r07_ascent') return !!ws.boss2Defeated;
  if (pair === 'r13_wind_peak>r17_frost_summit' || pair === 'r17_frost_summit>r13_wind_peak') return isSkyBridgeOpen();
  return true;
}

export function isRoomOccluded(roomId) {
  if (!roomId || !G.roomOcclusion) return false;
  const a = G.roomOcclusion[roomId];
  return a !== undefined && a > 0.86;
}

export function updateRoomVisibility(dt, snap = false) {
  if (!ROOMS.length) return null;
  const fx = G.player ? (G.player.x + G.player.w * 0.5) : (G.cam.x + G.canvasW * 0.5);
  const fy = G.player ? (G.player.y + G.player.h * 0.5) : (G.cam.y + G.canvasH * 0.5);
  const curRoom = getRoomAt(fx, fy) || ROOMS[0];
  if (!curRoom) return null;
  G.currentRoomId = curRoom.id;

  const vis = G.visibleRoomIds || (G.visibleRoomIds = new Set());
  vis.clear();
  vis.add(curRoom.id);

  // Add horizontally & vertically connected unlocked rooms near the player's band
  for (let i = 0; i < ROOMS.length; i++) {
    const other = ROOMS[i];
    if (isHorizontalLinkOpen(curRoom, other)) {
      const ob = other.bounds;
      if (curRoom.bounds.h <= 900 || (fy >= ob.y - 120 && fy <= ob.y + ob.h + 120)) {
        vis.add(other.id);
      }
    } else if (isVerticalLinkOpen(curRoom, other)) {
      const ob = other.bounds;
      const nearSeamY = Math.abs(fy - ob.y) < 460 || Math.abs(fy - (ob.y + ob.h)) < 460;
      if (nearSeamY && fx >= ob.x - 180 && fx <= ob.x + ob.w + 180) {
        vis.add(other.id);
      }
    }
  }

  const occ = G.roomOcclusion || (G.roomOcclusion = {});
  const step = snap ? 1 : Math.min(1, dt * 11.5);
  for (let i = 0; i < ROOMS.length; i++) {
    const id = ROOMS[i].id;
    const target = vis.has(id) ? 0 : 1;
    if (snap || occ[id] === undefined) {
      occ[id] = target;
    } else {
      occ[id] += (target - occ[id]) * step;
      if (Math.abs(occ[id] - target) < 0.008) occ[id] = target;
    }
  }
  return curRoom;
}

function computeCameraTargets(curRoom) {
  const activeBoss = getAwakeBoss();
  if (activeBoss) {
    const bRoom = (activeBoss.roomId && ROOMS.find(r => r.id === activeBoss.roomId)) || curRoom;
    const arenaMin = activeBoss.arenaMinX - 24;
    const arenaMax = activeBoss.arenaMaxX + 24;
    const arenaW = arenaMax - arenaMin;
    let clampedX;
    if (arenaW <= G.canvasW) {
      clampedX = arenaMin - (G.canvasW - arenaW) * 0.5;
    } else {
      const wantX = (G.player.x + activeBoss.x) * 0.5 - G.canvasW * 0.5 + 24;
      clampedX = Math.max(arenaMin, Math.min(arenaMax - G.canvasW, wantX));
    }
    const minY = bRoom ? bRoom.bounds.y : activeBoss.arenaTopY;
    const maxY = bRoom
      ? Math.max(minY, bRoom.bounds.y + bRoom.bounds.h - G.canvasH)
      : Math.max(minY, WORLD_H - G.canvasH);
    const focusY = (G.player.y * 0.65 + activeBoss.y * 0.35) - G.canvasH * 0.52;
    return {
      x: Math.max(WORLD_MIN_X, Math.min(Math.max(WORLD_MIN_X, WORLD_W - G.canvasW), clampedX)),
      y: Math.min(maxY, Math.max(minY, focusY))
    };
  }

  const rm = curRoom || (ROOMS[0] || { bounds: { x: 0, y: 0, w: WORLD_W, h: WORLD_H } });
  const b = rm.bounds;
  const px = G.player ? (G.player.x + G.player.w * 0.5) : (b.x + b.w * 0.5);
  const py = G.player ? (G.player.y + G.player.h * 0.5) : (b.y + b.h * 0.5);

  // Horizontal camera span: current room + open same-tier horizontal neighbors (up to 2 hops)
  let spanMinX = b.x;
  let spanMaxX = b.x + b.w;
  const visited = new Set([rm.id]);
  let frontier = [rm];
  for (let hop = 0; hop < 2; hop++) {
    const next = [];
    for (let f = 0; f < frontier.length; f++) {
      const cur = frontier[f];
      for (let i = 0; i < ROOMS.length; i++) {
        const nb = ROOMS[i];
        if (visited.has(nb.id)) continue;
        if (!isHorizontalLinkOpen(cur, nb)) continue;
        // For tall shaft rooms, only expand horizontally on the side matching player's elevation
        if (cur.bounds.h > 900 && (py < nb.bounds.y - 60 || py > nb.bounds.y + nb.bounds.h + 60)) continue;
        visited.add(nb.id);
        if (nb.bounds.x < spanMinX) spanMinX = nb.bounds.x;
        if (nb.bounds.x + nb.bounds.w > spanMaxX) spanMaxX = nb.bounds.x + nb.bounds.w;
        next.push(nb);
      }
    }
    frontier = next;
  }

  const wantX = G.player ? (G.player.x + G.player.facing * 88 - G.canvasW * 0.5) : (px - G.canvasW * 0.5);
  let clampedX;
  if (spanMaxX - spanMinX <= G.canvasW) {
    clampedX = spanMinX - (G.canvasW - (spanMaxX - spanMinX)) * 0.5;
  } else {
    clampedX = Math.max(spanMinX, Math.min(spanMaxX - G.canvasW, wantX));
  }
  clampedX = Math.max(WORLD_MIN_X, Math.min(Math.max(WORLD_MIN_X, WORLD_W - G.canvasW), clampedX));

  // Vertical camera span: strictly clamped at solid floors/ceilings, but smoothly glides across open vertical shafts!
  let minCamY = b.y;
  let maxCamY = Math.max(minCamY, b.y + b.h - G.canvasH);
  for (let i = 0; i < ROOMS.length; i++) {
    const nb = ROOMS[i];
    if (!isVerticalLinkOpen(rm, nb)) continue;
    const ob = nb.bounds;
    if (px < ob.x - 140 || px > ob.x + ob.w + 140) continue;
    // Open room directly above current room (e.g., r09 -> r12, r15 -> r10, r14 -> r10, r10 -> r01)
    if (Math.abs((ob.y + ob.h) - b.y) <= 24 && (py - b.y) < 310) {
      minCamY = Math.min(minCamY, b.y - Math.min(220, ob.h * 0.36));
    }
    // Open room directly below current room (e.g., r10 -> r14, r12 -> r09)
    if (Math.abs(ob.y - (b.y + b.h)) <= 24 && ((b.y + b.h) - py) < 310) {
      maxCamY = Math.max(maxCamY, b.y + b.h + Math.min(220, ob.h * 0.36) - G.canvasH);
    }
  }
  const vLook = G.cam.vLookY || 0;
  const focusY = (G.player ? G.player.y : py) + vLook - G.canvasH * 0.56;
  const clampedY = Math.min(maxCamY, Math.max(minCamY, focusY));

  return { x: clampedX, y: clampedY };
}

export function snapCameraToPlayer(shake = 0) {
  const curRoom = updateRoomVisibility(0, true);
  G.cam.vLookY = 0;
  G.cam.roomTransTimer = 0;
  const tgt = computeCameraTargets(curRoom);
  G.cam.x = tgt.x;
  G.cam.y = tgt.y;
  G.cam.shake = shake;
  G.cam.kickX = 0;
  G.cam.kickY = 0;
  G.cam.zoom = 1;
}

export function updateCamera(dt) {
  const prevRoomId = G.currentRoomId;
  const curRoom = updateRoomVisibility(dt, false);

  // Smooth vertical velocity lookahead for updraft ascents, spore bounces & deep cavern drops
  let targetVLook = 0;
  if (G.player && !G.player.grounded && Math.abs(G.player.vy) > 260) {
    const sign = G.player.vy > 0 ? 1 : -1;
    targetVLook = sign * Math.min(82, (Math.abs(G.player.vy) - 240) * 0.14);
  }
  G.cam.vLookY = (G.cam.vLookY || 0) + (targetVLook - (G.cam.vLookY || 0)) * Math.min(1, dt * 4.5);

  const tgt = computeCameraTargets(curRoom);
  const roomChanged = prevRoomId && curRoom && prevRoomId !== curRoom.id;
  if (roomChanged) {
    G.cam.roomTransTimer = 0.36;
  } else if (G.cam.roomTransTimer > 0) {
    G.cam.roomTransTimer = Math.max(0, G.cam.roomTransTimer - dt);
  }
  const fastBlend = G.cam.roomTransTimer > 0;
  G.cam.x += (tgt.x - G.cam.x) * Math.min(1, dt * (fastBlend ? 8.8 : 6.8));
  G.cam.y += (tgt.y - G.cam.y) * Math.min(1, dt * (fastBlend ? 9.6 : 6.8));

  if (G.cam.shake > 0) G.cam.shake = Math.max(0, G.cam.shake - dt * 36);
  const kickDecay = Math.exp(-18 * dt);
  G.cam.kickX *= kickDecay;
  G.cam.kickY *= kickDecay;
  if (Math.abs(G.cam.kickX) < 0.08) G.cam.kickX = 0;
  if (Math.abs(G.cam.kickY) < 0.08) G.cam.kickY = 0;
  G.cam.zoom += (1 - G.cam.zoom) * Math.min(1, dt * 12);
  if (Math.abs(G.cam.zoom - 1) < 0.0006) G.cam.zoom = 1;
}

export function updateAmbientOnly(dt) {
  updateThemeAndWeather(dt);
  for (const mote of G.ambientMotes) {
    mote.x += mote.vx * dt;
    mote.y += (mote.vy + Math.sin(G.globalTime * 1.5 + mote.phase) * 10) * dt;
    if (mote.x < -10) mote.x = G.canvasW + 10;
    if (mote.y < -10) mote.y = G.canvasH + 10;
    if (mote.y > G.canvasH + 10) mote.y = -10;
  }
}
