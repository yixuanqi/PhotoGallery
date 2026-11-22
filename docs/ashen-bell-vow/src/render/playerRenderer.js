// Protagonist (暗黑提灯剑客) Articulated IK & Three-Weapon Renderer (v32.0)
import { COLORS } from '../config.js';
import { G, getRelicStats, hasKeeperBlessing, getActiveWeaponId } from '../state.js';
import { drawGlowSprite, boilCircle, drawCloakMesh, solve2BoneIK } from '../vfx.js';
import { getGroundSurfaceY } from '../physics.js';
import { drawParryStarGlint } from './renderShared.js';

/* ---------- UPGRADED PROTAGONIST: 暗黑提灯剑客 ---------- */
export function drawPuppet(x, y, facing, isGhost = false, ghostColor = null) {
  const cx = x + G.player.w / 2;
  const footY = y + G.player.h;

  // Ultra-fast lightweight ghost silhouette for dash/grapple/iai afterimages (skips IK legs & detail strokes)
  if (isGhost) {
    G.ctx.save();
    G.ctx.translate(cx, footY);
    G.ctx.fillStyle = ghostColor || COLORS.cyanBright;
    G.ctx.beginPath();
    G.ctx.moveTo(-facing * 13, -10);
    G.ctx.lineTo(-facing * 9, -46);
    G.ctx.quadraticCurveTo(facing * 2, -57, facing * 9, -44);
    G.ctx.lineTo(facing * 11, -14);
    G.ctx.lineTo(facing * 5, 0);
    G.ctx.lineTo(-facing * 6, -4);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.restore();
    return;
  }

  G.ctx.save();
  if (!isGhost) {
    // Soft ambient soul lantern glow around protagonist
    drawGlowSprite(G.player.chargeReadyPlayed ? 'gold' : 'cyan', cx - facing * 4, y + 28, 92, G.player.chargeReadyPlayed ? 0.24 : 0.16);

    if (hasKeeperBlessing()) {
      drawGlowSprite('gold', cx, y + 26, 44, 0.24 + Math.sin(G.globalTime * 5) * 0.06);
      G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      G.ctx.lineWidth = 1.3;
      boilCircle(G.ctx, cx, y + 26, 27 + Math.sin(G.globalTime * 4) * 2, 9120, 1.0, 14);
      G.ctx.stroke();
    }
    // Dual Spring-Physics Cloak + Torn Crimson-Ash Scarf (violet-lit rim when Shade Cloak burst is ready!)
    const shadeReady = !!(G.worldState && G.worldState.abilities.shadeDash && G.player.shadeDashCd <= 0);
    if (shadeReady) {
      drawGlowSprite('violet', cx, y + 26, 36, 0.34 + Math.sin(G.globalTime * 6) * 0.08);
    }
    drawCloakMesh(G.player.cloak, shadeReady ? '#191228' : '#101521', shadeReady ? 'rgba(216, 180, 254, 0.72)' : 'rgba(216, 207, 184, 0.52)', 17, 100);
    drawCloakMesh(G.player.scarf, '#4f1b24', 'rgba(248, 113, 113, 0.42)', 8.5, 200);
  }

  const isDying = !isGhost && G.player.hp <= 0;
  if (isDying) {
    const fade = Math.max(0, G.player.deathTimer / 0.65);
    G.ctx.globalAlpha = fade;
    G.ctx.translate(cx, footY + (1 - fade) * 14);
    G.ctx.rotate(-facing * (1 - fade) * 0.55);
    G.ctx.scale(1 + (1 - fade) * 0.15, Math.max(0.55, fade));
  } else {
    G.ctx.translate(cx, footY);
    G.ctx.scale(G.player.squashX, G.player.squashY);
  }

  const isHurt = !isGhost && G.player.hurtTimer > 0 && Math.floor(G.globalTime * 30) % 2 === 0;
  const bodyCol = isGhost ? (ghostColor || '#0b0f18') : (isHurt ? '#ffffff' : '#121824');
  const lineCol = isGhost ? (ghostColor || COLORS.cyanBright) : COLORS.parchment;
  const backLegCol = isGhost ? lineCol : '#8f8776';

  // Dynamic Landing Crouch & 2-Bone IK Articulated Legs (Terrain-Snapped!)
  const crouchDrop = isGhost ? 0 : ((G.player.landCrouch || 0) * 6.5 + (G.player.isCharging && G.player.chargeTime > 0.14 ? 5.5 : 0));
  const hipY = -19 + crouchDrop;
  const isRunning = G.player.grounded && Math.abs(G.player.vx) > 25;
  const isDashing = G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.detonateLungeTimer > 0;
  // Zero-allocation inline 2-bone IK leg solver (eliminates 3 per-frame closures & 2 objects at 144Hz)
  for (let legIdx = 0; legIdx < 2; legIdx++) {
    const isFront = legIdx === 1;
    let tx, ty;
    if (isDashing) {
      tx = isFront ? facing * 12 : -facing * 12;
      ty = isFront ? -3 : -5;
    } else if (!G.player.grounded) {
      if (G.player.wallDir !== 0) {
        tx = isFront ? G.player.wallDir * 9 : G.player.wallDir * 5;
        ty = isFront ? -8 : -1;
      } else if (G.player.vy < 0) {
        tx = isFront ? facing * 7.5 : -facing * 7;
        ty = isFront ? -9 : -1;
      } else {
        tx = isFront ? facing * 6.5 : -facing * 8;
        ty = isFront ? -2 : -7;
      }
    } else if (isRunning) {
      const ph = G.player.runCycle + (isFront ? 0 : Math.PI);
      tx = Math.sin(ph) * 11.5;
      const lift = Math.max(0, Math.cos(ph)) * 7.5;
      if (lift > 0.5) {
        ty = -lift;
      } else {
        const sy = getGroundSurfaceY(cx + tx, footY - 12);
        ty = Math.max(-5, Math.min(9, sy - footY));
      }
    } else {
      tx = isFront ? facing * 6.5 : -facing * 5.5;
      const sy = getGroundSurfaceY(cx + tx, footY - 12);
      ty = Math.max(-5, Math.min(9, sy - footY));
    }
    const hipX = isFront ? facing * 2.5 : -facing * 2.5;
    const ik = solve2BoneIK(hipX, hipY, tx, ty, 10.6, 10.6, facing);
    G.ctx.strokeStyle = isFront ? lineCol : backLegCol;
    G.ctx.lineWidth = 3.1;
    G.ctx.lineCap = 'round';
    G.ctx.lineJoin = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(hipX, hipY);
    G.ctx.lineTo(ik.kx, ik.ky);
    G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.lineTo(ik.ex + facing * 3.5, ik.ey);
    G.ctx.stroke();
  }

  // Pivot Upper Body around Pelvis with Dynamic Sprint / Brake / Parry Lean
  G.ctx.save();
  G.ctx.translate(0, hipY);
  if (!isGhost && !isDying) G.ctx.rotate(G.player.bodyLean || 0);
  G.ctx.translate(0, 19);

  // Hooded Hunter Coat Torso (crisp dark halo + bright rim for strong foreground figure-ground pop)
  G.ctx.fillStyle = bodyCol;
  G.ctx.strokeStyle = isGhost ? lineCol : '#f0e7cf';
  G.ctx.lineWidth = isGhost ? 1.8 : 2.15;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -15);
  G.ctx.lineTo(-8, -36);
  G.ctx.lineTo(8, -36);
  G.ctx.lineTo(10, -15);
  G.ctx.lineTo(4, -12);
  G.ctx.lineTo(-4, -12);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Crimson Chest Sash
  if (!isGhost) {
    G.ctx.strokeStyle = '#9f1239';
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(-8, -34); G.ctx.lineTo(8, -22); G.ctx.stroke();
  }

  // Waist-Mounted Swinging Soul Lantern (Diegetic Soul Ready Glow)
  if (!isGhost && !isDying) {
    const rsHud = getRelicStats();
    const soulReady = G.player.soul >= rsHud.spellCost;
    G.ctx.save();
    G.ctx.translate(-facing * 9, -20);
    G.ctx.rotate(G.player.lanternSwing);
    G.ctx.fillStyle = '#181e2b';
    G.ctx.strokeStyle = soulReady ? COLORS.cyanBright : COLORS.gold;
    G.ctx.lineWidth = 1.2;
    G.ctx.fillRect(-3.5, 2, 7, 9);
    G.ctx.strokeRect(-3.5, 2, 7, 9);
    if (soulReady) {
      drawGlowSprite('cyan', 0, 6.5, 13 + Math.sin(G.globalTime * 8) * 2.5, 0.8);
    }
    G.ctx.fillStyle = soulReady ? '#e0f2fe' : 'rgba(56, 189, 248, 0.42)';
    G.ctx.beginPath(); G.ctx.arc(0, 6.5, soulReady ? 2.7 : 1.9, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();

    // Diegetic Floating Ink Seals Orbiting Behind Shoulder (1-4 Seals; Full-Seal Ultimate Halo!)
    if (G.player.seals >= G.player.maxSeals && G.player.maxSeals > 0) {
      const wId = getActiveWeaponId();
      const glowK = wId === 'bell' ? 'cyan' : 'gold';
      const pulse = 0.72 + Math.sin(G.globalTime * 7.5) * 0.22;
      drawGlowSprite(glowK, -facing * 18, -38, 22, 0.55 * pulse);
      G.ctx.save();
      G.ctx.strokeStyle = wId === 'bell' ? COLORS.cyanBright : COLORS.goldBright;
      G.ctx.globalAlpha = 0.65 * pulse;
      G.ctx.lineWidth = 1.4;
      boilCircle(G.ctx, -facing * 18, -38, 13 + Math.sin(G.globalTime * 6) * 1.5, 8110, 0.9, 12);
      G.ctx.stroke();
      G.ctx.restore();
    }
    for (let s = 0; s < G.player.seals; s++) {
      const ang = G.globalTime * 2.8 + s * ((Math.PI * 2) / Math.max(1, G.player.seals));
      const ox = -facing * 18 + Math.cos(ang) * 9;
      const oy = -36 + Math.sin(ang) * 7 - s * 3;
      G.ctx.save();
      G.ctx.translate(ox, oy);
      G.ctx.rotate(Math.sin(G.globalTime * 4 + s) * 0.25);
      G.ctx.fillStyle = '#b91c1c';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1;
      G.ctx.fillRect(-2.5, -5, 5, 10);
      G.ctx.strokeRect(-2.5, -5, 5, 10);
      G.ctx.restore();
    }
  }

  // Horned Cracked Bone-Porcelain Mask & Dark Hood
  const headBob = Math.sin(G.player.runCycle * 2) * 1.2;
  G.ctx.save();
  G.ctx.translate(0, -44 + headBob);

  // Dark pointed cowl behind mask
  G.ctx.fillStyle = isGhost ? bodyCol : '#0c1019';
  G.ctx.strokeStyle = lineCol;
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 13, 6);
  G.ctx.quadraticCurveTo(-facing * 15, -14, facing * 2, -13);
  G.ctx.quadraticCurveTo(facing * 12, -10, facing * 9, 8);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Bone Mask with Twin Short Curved Horns
  G.ctx.fillStyle = isGhost ? bodyCol : (isHurt ? '#ffffff' : '#e6dec8');
  G.ctx.strokeStyle = '#090c12';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-8, 6);
  G.ctx.quadraticCurveTo(-11, -6, -6, -12);
  G.ctx.lineTo(-9, -18); // Left horn
  G.ctx.lineTo(-2, -11);
  G.ctx.lineTo(3, -11);
  G.ctx.lineTo(9, -18); // Right horn
  G.ctx.lineTo(6, -11);
  G.ctx.quadraticCurveTo(11, -5, 8, 6);
  G.ctx.quadraticCurveTo(0, 10, -8, 6);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  if (!isGhost) {
    // Mask hairline crack
    G.ctx.strokeStyle = 'rgba(20, 24, 34, 0.55)';
    G.ctx.lineWidth = 1;
    G.ctx.beginPath();
    G.ctx.moveTo(-4, -10); G.ctx.lineTo(-1, -4); G.ctx.lineTo(-3, 0);
    G.ctx.stroke();

    // Glowing Cyan Eyes (Turn Gold when Iai Charged or Riposte Ready!)
    const eyeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const eyeCol = eyeGold ? COLORS.goldBright : COLORS.cyanBright;
    drawGlowSprite(eyeGold ? 'gold' : 'cyan', facing * 3, -1, 11, 0.7);
    G.ctx.fillStyle = eyeCol;
    G.ctx.beginPath();
    G.ctx.ellipse(facing * 3 - 2.5, -1, 2.2, 3.1, 0, 0, Math.PI * 2);
    G.ctx.ellipse(facing * 3 + 3.2, -1, 2.2, 3.1, 0, 0, Math.PI * 2);
    G.ctx.fill();
  }
  G.ctx.restore();

  // Articulated Weapon Renderer (3 Distinct Hand-Drawn Silhouettes: Blade / Two-Handed Bell-Maul / Soul-Calling Bell Staff)
  if (!isGhost) {
    const weaponId = getActiveWeaponId();
    const bladeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
    const bladeSealProc = !!G.player.freeSealProc;

    // Hyper-Armor Golden Bell-Aura during heavy Hammer swings
    if (G.player.shieldArmorTimer > 0) {
      drawGlowSprite('gold', 0, -28, 38, 0.62);
      G.ctx.save();
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 2.4;
      boilCircle(G.ctx, 0, -28, 28, 7180, 1.4, 14);
      G.ctx.stroke();
      G.ctx.restore();
    }

    G.ctx.save();
    G.ctx.translate(facing * 4, -30);
    let bladeAng = weaponId === 'hammer'
      ? (facing > 0 ? -2.28 : Math.PI + 2.28) // Two-handed shoulder rest for the heavy Bell-Maul!
      : (facing > 0 ? -0.35 : Math.PI + 0.35);

    if (G.player.parryActive) {
      bladeAng = facing > 0 ? -1.15 : Math.PI + 1.15;
    } else if (G.player.isCharging && G.player.chargeTime > 0.14) {
      if (weaponId === 'bell') bladeAng = facing > 0 ? -1.05 : Math.PI + 1.05;
      else if (weaponId === 'hammer') bladeAng = facing > 0 ? -2.65 : Math.PI + 2.65; // Hoisted high overhead!
      else bladeAng = facing > 0 ? 2.65 : 0.49;
    } else if (G.player.attackTimer > 0) {
      const p = 1 - G.player.attackTimer / G.player.attackDuration;
      if (G.player.attackType === 'pogo') bladeAng = Math.PI * 0.5;
      else if (G.player.attackType === 'up') bladeAng = facing > 0 ? -1.6 : -1.5;
      else if (weaponId === 'bell') {
        const sw = Math.sin(p * Math.PI) * 1.15;
        bladeAng = facing > 0 ? (-0.95 + sw) : (Math.PI + 0.95 - sw);
      } else if (weaponId === 'hammer') {
        if (G.player.attackType === 'slash1') {
          bladeAng = facing > 0 ? (1.35 - p * 2.55) : (Math.PI - 1.35 + p * 2.55);
        } else {
          // Towering overhead crush down onto the ground!
          const slamP = Math.min(1, p * 1.85);
          bladeAng = facing > 0 ? (-2.45 + slamP * 2.95) : (Math.PI + 2.45 - slamP * 2.95);
        }
      } else if (G.player.attackType === 'slash1') {
        bladeAng = facing > 0 ? (1.2 - p * 2.6) : (Math.PI - 1.2 + p * 2.6);
      } else {
        bladeAng = facing > 0 ? (-1.4 + p * 2.8) : (Math.PI + 1.4 - p * 2.8);
      }
    }

    if (weaponId === 'bell') {
      // === WEAPON 3: 引魂摇铃 (Soul-Calling Bronze Bell Staff) ===
      G.ctx.rotate(bladeAng);
      G.ctx.strokeStyle = '#3b2b1e';
      G.ctx.lineWidth = 3.2;
      G.ctx.beginPath(); G.ctx.moveTo(-14, 0); G.ctx.lineTo(30, 0); G.ctx.stroke();
      G.ctx.strokeStyle = bladeGold ? COLORS.goldBright : COLORS.gold;
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(8, -3.5); G.ctx.lineTo(8, 3.5);
      G.ctx.moveTo(22, -4); G.ctx.lineTo(22, 4);
      G.ctx.arc(33, 0, 7.5, -1.35, 1.35);
      G.ctx.stroke();
      const bellWob = (G.player.bellSwing || 0) * 0.6;
      G.ctx.save();
      G.ctx.translate(35, 0);
      G.ctx.rotate(bellWob);
      drawGlowSprite(bladeSealProc ? 'crimson' : (bladeGold ? 'gold' : 'cyan'), 4, 0, bladeGold ? 24 : 18, bladeGold ? 0.85 : 0.62);
      G.ctx.fillStyle = '#2a2016';
      G.ctx.strokeStyle = bladeGold ? COLORS.goldBright : COLORS.cyanBright;
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(-4, -5); G.ctx.lineTo(4, -5);
      G.ctx.quadraticCurveTo(9, 2, 10, 7);
      G.ctx.lineTo(-10, 7);
      G.ctx.quadraticCurveTo(-9, 2, -4, -5);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = bladeGold ? '#fef08a' : '#e0f2fe';
      G.ctx.beginPath(); G.ctx.arc(0, 8, 2.8, 0, Math.PI * 2); G.ctx.fill();
      const rib = Math.sin(G.globalTime * 10) * 4;
      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.lineWidth = 1.4;
      G.ctx.beginPath(); G.ctx.moveTo(-6, 7); G.ctx.quadraticCurveTo(-9, 14 + rib * 0.4, -5 + rib, 21); G.ctx.stroke();
      G.ctx.restore();
    } else if (weaponId === 'hammer') {
      // === WEAPON 2: 镇渊钟锤 (Massive Two-Handed Cracked Bronze Bell-Maul) ===
      G.ctx.rotate(bladeAng);
      // Heavy iron-core long haft with crimson cloth binding
      G.ctx.strokeStyle = '#3b2b1e';
      G.ctx.lineWidth = 4.6;
      G.ctx.beginPath(); G.ctx.moveTo(-16, 0); G.ctx.lineTo(36, 0); G.ctx.stroke();
      G.ctx.strokeStyle = '#9f1239';
      G.ctx.lineWidth = 4.2;
      G.ctx.beginPath(); G.ctx.moveTo(-12, 0); G.ctx.lineTo(6, 0); G.ctx.stroke();
      // Bronze pommel cap & neck collar
      G.ctx.fillStyle = COLORS.gold;
      G.ctx.beginPath(); G.ctx.arc(-17, 0, 3.4, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.moveTo(26, -5.5); G.ctx.lineTo(26, 5.5); G.ctx.stroke();

      // Massive Cracked Bronze Bell-Head Hammer
      const chargingH = G.player.isCharging && G.player.chargeTime > 0.14;
      if (bladeSealProc) drawGlowSprite('crimson', 38, 0, 30, 0.85);
      else if (bladeGold || chargingH || G.player.shieldArmorTimer > 0) drawGlowSprite('gold', 38, 0, 32, 0.82);

      G.ctx.fillStyle = bladeSealProc ? '#7f1d1d' : '#2b1e12';
      G.ctx.strokeStyle = (bladeGold || chargingH || G.player.shieldArmorTimer > 0) ? COLORS.goldBright : COLORS.gold;
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(29, -11);
      G.ctx.lineTo(44, -14.5);
      G.ctx.lineTo(49, -7);
      G.ctx.lineTo(49, 7);
      G.ctx.lineTo(44, 14.5);
      G.ctx.lineTo(29, 11);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();

      // Molten golden resonance crack across bell-maul face
      G.ctx.strokeStyle = (bladeGold || chargingH) ? '#fef9c3' : COLORS.goldBright;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(35, -9); G.ctx.lineTo(40, -2); G.ctx.lineTo(36, 3); G.ctx.lineTo(42, 10);
      G.ctx.stroke();
      // Heavy bronze rivet studs
      G.ctx.fillStyle = '#fef08a';
      G.ctx.beginPath();
      G.ctx.arc(46, -6, 1.7, 0, Math.PI * 2);
      G.ctx.arc(46, 6, 1.7, 0, Math.PI * 2);
      G.ctx.fill();
    } else {
      // === WEAPON 1: 灰钟断刃 (Ashen Broken Odachi Blade) ===
      G.ctx.rotate(bladeAng);
      G.ctx.strokeStyle = '#9f1239';
      G.ctx.lineWidth = 3.2;
      G.ctx.beginPath(); G.ctx.moveTo(-9, 0); G.ctx.lineTo(4, 0); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.gold;
      G.ctx.lineWidth = 2.4;
      G.ctx.beginPath(); G.ctx.moveTo(4, -5.5); G.ctx.lineTo(4, 5.5); G.ctx.stroke();
      if (bladeSealProc) drawGlowSprite('crimson', 24, 0, 22, 0.82);
      else if (bladeGold) drawGlowSprite('gold', 24, 0, 20, 0.72);
      G.ctx.fillStyle = bladeSealProc ? COLORS.crimsonBright : (bladeGold ? COLORS.goldBright : '#d8d2c3');
      G.ctx.strokeStyle = '#090c12';
      G.ctx.lineWidth = 1.2;
      G.ctx.beginPath();
      G.ctx.moveTo(5, -2.6);
      G.ctx.quadraticCurveTo(26, -4.5, 42, -1);
      G.ctx.lineTo(36, 2.5);
      G.ctx.quadraticCurveTo(22, 1.8, 5, 2.2);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    }
    G.ctx.restore();

    // Calligraphic 3-Tier Parry Guard Stance Feedback
    const rsDraw = getRelicStats();
    if (G.player.parryActive) {
      const isPerfectZone = G.player.parryElapsedMs <= rsDraw.parryWindowMs;
      const isBlockZone = G.player.parryElapsedMs <= rsDraw.blockWindowMs;
      const gx = facing * 14;
      const gy = -28;
      const a0 = facing > 0 ? -1.2 : Math.PI - 1.2;
      const a1 = facing > 0 ? 1.2 : Math.PI + 1.2;

      G.ctx.save();
      if (isPerfectZone) {
        const p = Math.min(1, G.player.parryElapsedMs / Math.max(1, rsDraw.parryWindowMs));
        drawGlowSprite('gold', gx + facing * 6, gy, 28, 0.72 * (1 - p * 0.35));
        // Outer ink-gold calligraphic crescent shield
        G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        G.ctx.lineWidth = 7.5;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.goldBright;
        G.ctx.lineWidth = 3.2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
        // Shrinking timing pulse arc
        G.ctx.strokeStyle = '#ffffff';
        G.ctx.lineWidth = 1.6;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 28 - p * 8, a0 + 0.18, a1 - 0.18); G.ctx.stroke();
        // Crisp star glint on blade guard
        drawParryStarGlint(gx + facing * 8, gy - 6, 9 * (1 - p * 0.3), COLORS.goldBright);
      } else if (isBlockZone) {
        drawGlowSprite('cyan', gx + facing * 4, gy, 20, 0.48);
        G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
        G.ctx.lineWidth = 5.5;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.cyanBright;
        G.ctx.lineWidth = 2.2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
      } else {
        // Vulnerable guard recovery — fractured crimson dashed arc
        G.ctx.setLineDash([4, 4]);
        G.ctx.strokeStyle = 'rgba(248, 113, 113, 0.52)';
        G.ctx.lineWidth = 2;
        G.ctx.beginPath(); G.ctx.arc(gx, gy, 20, a0 + 0.25, a1 - 0.25); G.ctx.stroke();
        G.ctx.setLineDash([]);
      }
      G.ctx.restore();
    }

    // Iai Charge Glint at Waist
    if (G.player.isCharging && G.player.chargeTime > 0.15) {
      const pct = Math.min(1, G.player.chargeTime / rsDraw.iaiChargeTime);
      drawParryStarGlint(-facing * 10, -24, 8 + pct * 14, pct >= 1 ? COLORS.goldBright : COLORS.cyanBright);
    }
  }

  G.ctx.restore(); // End upper body lean pivot
  G.ctx.restore();
}

