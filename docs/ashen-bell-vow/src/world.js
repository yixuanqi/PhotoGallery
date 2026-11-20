// World hazards, pendulums, Abyssal River, projectiles, talismans, tides & camera
import { COLORS, ROOM_THEMES, SOLIDS, VOID_BARRIERS, WORLD_W, WORLD_H, FLOOR_Y, PENDULUMS, ABYSSAL_RIVERS, PUDDLES } from './config.js';
import {
  G, hooks, getLivingFoes, getAwakeBoss, getRelicStats, scheduleOutcome, addShake, punchZoom
} from './state.js';
import { getRoomAt } from './levelLoader.js';
import { audio } from './audio.js';
import { triggerHaptic } from './input.js';
import {
  spawnParticles, spawnShockwave, spawnImpactBurst, spawnFloatText, spawnWeatherRipple
} from './vfx.js';
import { aabbOverlap, getGroundSurfaceY } from './physics.js';
import {
  applyIncomingAttackToPlayer, damageEnemyHP, addPostureToEnemy,
  rallyPlayerGrayHp, damageSecretWall, tryQuellChapelTideByLantern, ringResonanceBell,
  dropPlayerEchoesOnDeath, reclaimLostEchoes
} from './combat.js';

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
        b.swingVel = (b.swingVel + acc * dt) * 0.94;
        b.swing += b.swingVel * dt;
      }
    }
  }

  // Crumbling Stone Platforms (shake 0.65s -> shatter -> regenerate after 3.2s)
  if (G.crumblePlatforms) {
    for (const cp of G.crumblePlatforms) {
      if (cp.state === 'shaking') {
        cp.timer -= dt;
        if (Math.random() < 0.45) {
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
      spawnFloatText(px, G.player.y - 22, `墨河侵蚀 -${dmg}`, COLORS.cyanBright, 19, 0.95);
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
    l.angVel = (l.angVel + angAcc * dt) * 0.986;
    l.angle += l.angVel * dt;
  }

  // Projectiles (Soul Bell-Wave & Wraith Orbs)
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (pr.kind === 'soulWave' || pr.kind === 'crimsonWave') {
      const isCrimson = pr.kind === 'crimsonWave';
      const pCol = isCrimson ? COLORS.crimsonBright : COLORS.cyanBright;
      if (Math.random() < 0.7) {
        spawnParticles(pr.x - pr.facing * 10, pr.y + (Math.random() - 0.5) * 26, 1, { color: pCol, speed: 60, grav: 0, life: 0.24 });
      }
      const pBox = { x: pr.x - pr.r, y: pr.y - pr.r * 1.15, w: pr.r * 2, h: pr.r * 2.3 };
      const targets = getLivingFoes();
      for (const t of targets) {
        if (pr.hitIds.has(t.id)) continue;
        if (aabbOverlap(pBox, t)) {
          pr.hitIds.add(t.id);
          audio.playHit(true);
          triggerHaptic(isCrimson ? 'heavyHit' : 'lightHit');
          G.hitstopTimer = Math.max(G.hitstopTimer, 0.032);
          addShake(isCrimson ? 7 : 5);
          if ((t.kind === 'golem' || (t.kind === 'boss2' && t.shieldUp)) && t.shieldBrokenTimer <= 0) {
            t.shieldBrokenTimer = 2.4;
            if (t.kind === 'boss2') t.shieldUp = false;
            audio.playShieldBreak();
            triggerHaptic('shieldBreak');
            spawnFloatText(t.x + t.w / 2, t.y - 26, isCrimson ? '血刃破盾！' : '灵刃破盾！', pCol, 19, 0.95);
          }
          damageEnemyHP(t, pr.dmg, true);
          addPostureToEnemy(t, pr.posture);
          rallyPlayerGrayHp(isCrimson ? 18 : 10);
          spawnParticles(t.x + t.w / 2, t.y + t.h * 0.45, 16, { color: pCol, speed: 240, spark: true, life: 0.34 });
          spawnShockwave(t.x + t.w / 2, t.y + t.h * 0.45, isCrimson ? 70 : 58, pCol, 2.8, 0.22);
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
          spawnFloatText(lx, ly - 24, '灯鸣震荡!', COLORS.goldBright, 18, 0.72);
          tryQuellChapelTideByLantern(l, lx, ly);
          for (const t of targets) {
            if (Math.hypot((t.x + t.w / 2) - lx, (t.y + t.h / 2) - ly) < 175) {
              damageEnemyHP(t, 28, true);
              addPostureToEnemy(t, 34);
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
    } else if (pr.kind === 'wraithOrb') {
      if (Math.random() < 0.5) {
        spawnParticles(pr.x, pr.y, 1, { color: pr.reflected ? COLORS.goldBright : COLORS.crimson, speed: 45, grav: 0, life: 0.22 });
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
            audio.playParry(true, G.player.parryStreak);
            triggerHaptic('parry', 0.95 + Math.min(0.4, (G.player.parryStreak - 1) * 0.12));
            if (rsOrb.synMirrorEmber && G.player.parryStreak >= 3 && !G.player.freeSealProc) {
              G.player.freeSealProc = true;
              spawnFloatText(G.player.x + G.player.w / 2, G.player.y - 46, '羁绊 · 镜烬蓄印！下击附符', COLORS.crimsonBright, 17, 1.1);
            }
            G.hitstopTimer = 0.058;
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
            spawnFloatText(pr.x, pr.y - 22, '弹反归元!', COLORS.goldBright, 21, 0.85);
          } else {
            applyIncomingAttackToPlayer(pr.source || { x: pr.x, w: 0, isBoss: false }, pr.dmg, false, 180);
            pr.life = 0;
          }
        }
      } else {
        const targets = getLivingFoes();
        for (const t of targets) {
          if (aabbOverlap(oBox, t)) {
            audio.playDetonate();
            G.hitstopTimer = 0.05;
            addShake(9);
            damageEnemyHP(t, 48, true);
            addPostureToEnemy(t, 55);
            spawnShockwave(pr.x, pr.y, 75, COLORS.goldBright, 4, 0.25);
            spawnParticles(pr.x, pr.y, 22, { color: COLORS.goldBright, speed: 300, spark: true });
            pr.life = 0;
            break;
          }
        }
      }
    }

    let hitSolid = false;
    if (pr.kind === 'wraithOrb') {
      const pb = { x: pr.x - 5, y: pr.y - 5, w: 10, h: 10 };
      for (const s of SOLIDS) {
        if (s.type !== 'platform' && aabbOverlap(pb, s)) { hitSolid = true; break; }
      }
    }
    if (hitSolid || pr.life <= 0 || pr.x < 0 || pr.x > WORLD_W || pr.y > WORLD_H + 40 || pr.y < -40) {
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
      G.hitstopTimer = 0.055;
      addShake(12);
      G.screenFlash = { alpha: 0.2, color: COLORS.goldBright };
      const radius = 115 + tm.seals * 25;
      spawnShockwave(tm.x, tm.y, radius, COLORS.goldBright, 5, 0.34);
      spawnParticles(tm.x, tm.y, 32, { color: COLORS.goldBright, speed: 320, spark: true, life: 0.48 });
      spawnFloatText(tm.x, tm.y - 30, '墨印爆破!', COLORS.goldBright, 22, 0.9);
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
      if (Math.random() < 0.85) {
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
    if (Math.random() < 0.6) {
      spawnParticles(gw.x, fy - 8, 1, { color: gw.gold ? COLORS.goldBright : COLORS.crimsonBright, speed: 90, grav: -160, life: 0.3 });
    }
    if (!gw.hit && aabbOverlap({ x: gw.x - gw.w / 2, y: fy - gw.h, w: gw.w, h: gw.h }, G.player)) {
      gw.hit = true;
      applyIncomingAttackToPlayer({ x: gw.x, w: 0, isBoss: true }, 24, true, 240);
    }
    if (gw.life <= 0 || gw.x < minX || gw.x > maxX) G.groundWaves.splice(i, 1);
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

    if (p.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.floatTexts.length - 1; i >= 0; i--) {
    const ft = G.floatTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ft.vy *= 0.94;
    if (ft.life <= 0) G.floatTexts.splice(i, 1);
  }
  for (const m of G.ambientMotes) {
    m.x += m.vx * dt;
    m.y += (m.vy + Math.sin(G.globalTime * 1.5 + m.phase) * 10) * dt;
    if (m.x < -10) m.x = G.canvasW + 10;
    if (m.y < -10) m.y = G.canvasH + 10;
    if (m.y > G.canvasH + 10) m.y = -10;
  }

  updateThemeAndWeather(dt);
  if (G.screenFlash.alpha > 0) G.screenFlash.alpha = Math.max(0, G.screenFlash.alpha - dt * 1.2);
}

function lerpRgb(cur, dst, t) {
  cur[0] += (dst[0] - cur[0]) * t;
  cur[1] += (dst[1] - cur[1]) * t;
  cur[2] += (dst[2] - cur[2]) * t;
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
  const isPhase2 = !!(activeBoss && activeBoss.phase === 2);
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

  // Procedural Rain-on-Puddle & Drip-on-River Ripples
  if (wType === 'rain' && Math.random() < dt * 11) {
    const visPuddles = PUDDLES.filter(p => p.x + p.w > G.cam.x && p.x < G.cam.x + G.canvasW);
    if (visPuddles.length > 0) {
      const p = visPuddles[Math.floor(Math.random() * visPuddles.length)];
      spawnWeatherRipple(p.x + 8 + Math.random() * Math.max(8, p.w - 16), FLOOR_Y + 1, 14 + Math.random() * 14, 'rgba(186, 230, 253, 0.52)');
    }
  } else if (wType === 'mist' && Math.random() < dt * 7) {
    const visRivers = ABYSSAL_RIVERS.filter(rv => rv.w > 0 && rv.x + rv.w > G.cam.x && rv.x < G.cam.x + G.canvasW);
    if (visRivers.length > 0) {
      const rv = visRivers[Math.floor(Math.random() * visRivers.length)];
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

export function updateCamera(dt) {
  const activeBoss = getAwakeBoss();
  const targetX = activeBoss
    ? Math.max(activeBoss.arenaMinX - 28, Math.min(activeBoss.arenaMaxX + 42 - G.canvasW, (G.player.x + activeBoss.x) * 0.5 - G.canvasW * 0.5 + 30))
    : G.player.x + G.player.facing * 95 - G.canvasW * 0.5;
  const clampedX = Math.max(0, Math.min(Math.max(0, WORLD_W - G.canvasW), targetX));
  G.cam.x += (clampedX - G.cam.x) * Math.min(1, dt * 6.5);

  let minCamY = -40;
  let maxCamY = Math.max(0, WORLD_H - G.canvasH);
  let focusY = G.player.y - G.canvasH * 0.54;
  if (activeBoss) {
    if (activeBoss.id === 'boss_hui') {
      maxCamY = Math.max(0, 720 - G.canvasH);
    } else {
      minCamY = Math.max(0, activeBoss.arenaTopY - 40);
      maxCamY = Math.max(minCamY, WORLD_H - G.canvasH);
      focusY = (G.player.y * 0.65 + activeBoss.y * 0.35) - G.canvasH * 0.5;
    }
  }
  const targetY = Math.min(maxCamY, Math.max(minCamY, focusY));
  G.cam.y += (targetY - G.cam.y) * Math.min(1, dt * 5.8);

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
