// Protagonist (暗黑提灯剑客) Full-Body IK, Crescent Bone-Mask, Split Hunter Coat & Three-Weapon Renderer (v45.3)
import { COLORS } from '../config.js';
import { G, getRelicStats, hasKeeperBlessing, getActiveWeaponId } from '../state.js';
import { drawGlowSprite, boilCircle, drawCloakMesh, solve2BoneIK } from '../vfx.js';
import { getGroundSurfaceY } from '../physics.js';
import { drawParryStarGlint } from './renderShared.js';

function getAttackPose(weaponId, attackType, p, facing) {
  const dir = facing;
  const flipAng = a => (dir > 0 ? a : (Math.PI - a));
  const easeOut = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 2.2);

  if (attackType === 'pogo') {
    const sw = Math.sin(p * Math.PI);
    return { handX: dir * (4 + sw * 4), handY: -18 + sw * 8, ang: Math.PI * 0.5 + dir * (0.25 - p * 0.5), offHand: weaponId === 'hammer', lungeSpread: 0 };
  }
  if (attackType === 'up') {
    const sw = easeOut(p);
    return { handX: dir * (6 - sw * 2), handY: -36 - Math.sin(p * Math.PI) * 14, ang: flipAng(-0.6 - sw * 1.4), offHand: weaponId === 'hammer', lungeSpread: 4 };
  }
  if (attackType === 'dashAttack') {
    const sw = easeOut(p);
    if (weaponId === 'hammer') {
      return { handX: dir * (10 + sw * 12), handY: -26, ang: flipAng(-0.25 + sw * 0.42), offHand: true, lungeSpread: 16 };
    }
    if (weaponId === 'bell') {
      return { handX: dir * (12 + sw * 10), handY: -31, ang: flipAng(-0.55 + sw * 0.75), offHand: false, lungeSpread: 14 };
    }
    return { handX: dir * (6 + sw * 18), handY: -28, ang: flipAng(0.02), offHand: false, lungeSpread: 17 };
  }
  if (attackType === 'air2') {
    const spin = p * Math.PI * 2;
    const rad = weaponId === 'hammer' ? 14 : 16;
    return { handX: dir * Math.cos(spin) * rad, handY: -28 + Math.sin(spin) * 11, ang: flipAng(spin - 0.35), offHand: weaponId === 'hammer', lungeSpread: 0 };
  }
  if (attackType === 'iai' || attackType === 'switch' || attackType === 'grappleStrike') {
    const sw = easeOut(p);
    if (weaponId === 'hammer') {
      const slamP = Math.min(1, p * 1.9);
      return { handX: dir * (4 + slamP * 14), handY: -44 + slamP * 24, ang: flipAng(-2.55 + slamP * 3.0), offHand: true, lungeSpread: 16 };
    }
    if (weaponId === 'bell') {
      return { handX: dir * (14 - sw * 6), handY: -34 - Math.sin(p * Math.PI) * 6, ang: flipAng(-0.85 + sw * 1.15), offHand: false, lungeSpread: 10 };
    }
    return { handX: dir * (-10 + sw * 28), handY: -29, ang: flipAng(-0.18 + sw * 0.28), offHand: false, lungeSpread: 18 };
  }
  if (attackType === 'counter') {
    const sw = easeOut(p);
    if (weaponId === 'hammer') {
      return { handX: dir * (6 + sw * 14), handY: -42 + sw * 22, ang: flipAng(-2.3 + sw * 2.85), offHand: true, lungeSpread: 16 };
    }
    return { handX: dir * (14 - sw * 20), handY: -36 + sw * 14, ang: flipAng(-1.45 + sw * 2.65), offHand: false, lungeSpread: 15 };
  }

  if (weaponId === 'hammer') {
    if (attackType === 'slash1' || attackType === 'air1') {
      const sw = easeOut(p);
      return { handX: dir * (-6 + sw * 22), handY: -24 - Math.sin(p * Math.PI) * 10, ang: flipAng(1.35 - sw * 2.65), offHand: true, lungeSpread: 12 };
    }
    const slamP = Math.min(1, p * 1.85);
    return { handX: dir * (2 + slamP * 16), handY: -46 + slamP * 26, ang: flipAng(-2.5 + slamP * 2.95), offHand: true, lungeSpread: 16 };
  }
  if (weaponId === 'bell') {
    const sw = Math.sin(p * Math.PI);
    const rev = attackType === 'slash2' ? -1 : 1;
    return { handX: dir * (10 + sw * 8), handY: -32 - sw * 6 * rev, ang: flipAng(-0.95 + sw * 1.25 * rev), offHand: false, lungeSpread: 8 };
  }

  if (attackType === 'slash1' || attackType === 'air1') {
    const sw = easeOut(p);
    return { handX: dir * (6 + Math.sin(p * Math.PI) * 10), handY: -20 - sw * 18, ang: flipAng(1.15 - sw * 2.45), offHand: false, lungeSpread: 11 };
  }
  if (attackType === 'slash2') {
    const sw = easeOut(p);
    return { handX: dir * (-6 + sw * 24), handY: -30 + Math.sin(p * Math.PI) * 3, ang: flipAng(-0.52 + sw * 0.92), offHand: false, lungeSpread: 15 };
  }
  const cleaveP = Math.min(1, p * 1.65);
  return { handX: dir * (4 + cleaveP * 14), handY: -44 + cleaveP * 24, ang: flipAng(-2.35 + cleaveP * 3.15), offHand: true, lungeSpread: 17 };
}

/* ---------- UPGRADED PROTAGONIST: 暗黑提灯剑客 (v45.3) ---------- */
export function drawPuppet(x, y, facing, isGhost = false, ghostColor = null) {
  const cx = x + G.player.w / 2;
  const footY = y + G.player.h;

  if (isGhost) {
    G.ctx.save();
    G.ctx.translate(cx, footY);
    G.ctx.fillStyle = ghostColor || COLORS.cyanBright;
    G.ctx.beginPath();
    G.ctx.moveTo(-facing * 15, -6);
    G.ctx.lineTo(-facing * 10, -45);
    G.ctx.lineTo(-facing * 13, -57);
    G.ctx.quadraticCurveTo(facing * 2, -55, facing * 9, -43);
    G.ctx.lineTo(facing * 11, -14);
    G.ctx.lineTo(facing * 6, 0);
    G.ctx.lineTo(-facing * 8, -4);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.restore();
    return;
  }

  const now = G.globalTime || 0;
  const weaponId = getActiveWeaponId();
  const isAttacking = G.player.attackTimer > 0;
  const atkP = isAttacking ? Math.max(0, Math.min(1, 1 - G.player.attackTimer / Math.max(0.01, G.player.attackDuration || 0.2))) : 0;
  const isAirSpin = isAttacking && G.player.attackType === 'air2';
  const atkPose = isAttacking ? getAttackPose(weaponId, G.player.attackType, atkP, facing) : null;

  G.ctx.save();
  drawGlowSprite(G.player.chargeReadyPlayed ? 'gold' : 'cyan', cx - facing * 4, y + 28, 92, G.player.chargeReadyPlayed ? 0.24 : 0.16);

  if (hasKeeperBlessing()) {
    drawGlowSprite('gold', cx, y + 26, 44, 0.24 + Math.sin(now * 5) * 0.06);
    G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    G.ctx.lineWidth = 1.3;
    boilCircle(G.ctx, cx, y + 26, 27 + Math.sin(now * 4) * 2, 9120, 1.0, 14);
    G.ctx.stroke();
  }

  const shadeReady = !!(G.worldState && G.worldState.abilities.shadeDash && G.player.shadeDashCd <= 0);
  if (shadeReady) {
    drawGlowSprite('violet', cx, y + 26, 36, 0.34 + Math.sin(now * 6) * 0.08);
  }
  drawCloakMesh(G.player.cloak, shadeReady ? '#191228' : '#101521', shadeReady ? 'rgba(216, 180, 254, 0.72)' : 'rgba(216, 207, 184, 0.52)', 17, 100);
  drawCloakMesh(G.player.scarf, '#581523', 'rgba(248, 113, 113, 0.46)', 8.5, 200);

  const isDying = G.player.hp <= 0;
  if (isDying) {
    const fade = Math.max(0, G.player.deathTimer / 0.65);
    G.ctx.globalAlpha = fade;
    G.ctx.translate(cx, footY + (1 - fade) * 14);
    G.ctx.rotate(-facing * (1 - fade) * 0.55);
    G.ctx.scale(1 + (1 - fade) * 0.15, Math.max(0.55, fade));
  } else {
    G.ctx.translate(cx, footY);
    G.ctx.scale(G.player.squashX, G.player.squashY);
    if (isAirSpin) {
      G.ctx.translate(0, -28);
      G.ctx.rotate(facing * atkP * Math.PI * 2);
      G.ctx.translate(0, 28);
    }
  }

  const isHurt = G.player.hurtTimer > 0 && Math.floor(now * 30) % 2 === 0;
  const bodyCol = isHurt ? '#ffffff' : '#121824';
  const lineCol = COLORS.parchment;
  const backLegCol = '#8a8272';

  const atkCrouch = (atkPose && G.player.grounded && atkPose.lungeSpread >= 12) ? 4.2 : 0;
  const crouchDrop = (G.player.landCrouch || 0) * 6.5 + (G.player.isCharging && G.player.chargeTime > 0.14 ? 5.5 : 0) + atkCrouch;
  const hipY = -19 + crouchDrop;
  const isRunning = G.player.grounded && Math.abs(G.player.vx) > 25;
  const isDashing = G.player.dashTimer > 0 || G.player.iaiLungeTimer > 0 || G.player.detonateLungeTimer > 0;

  // 2-Bone IK Articulated Legs (FIXED v45.3: multiplied by `facing` so left-walk is 100% anatomically symmetrical!)
  for (let legIdx = 0; legIdx < 2; legIdx++) {
    const isFront = legIdx === 1;
    let tx, ty;
    if (isDashing) {
      tx = isFront ? facing * 13 : -facing * 13;
      ty = isFront ? -3 : -5;
    } else if (isAirSpin) {
      tx = isFront ? facing * 8 : -facing * 7;
      ty = isFront ? -11 : -7;
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
    } else if (atkPose && atkPose.lungeSpread >= 8) {
      tx = isFront ? facing * atkPose.lungeSpread : -facing * (atkPose.lungeSpread * 0.72);
      const sy = getGroundSurfaceY(cx + tx, footY - 12);
      ty = Math.max(-5, Math.min(9, sy - footY));
    } else if (isRunning) {
      const ph = G.player.runCycle + (isFront ? 0 : Math.PI);
      tx = Math.sin(ph) * 11.5 * facing;
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
    const ik = solve2BoneIK(hipX, hipY, tx, ty, 10.8, 10.8, facing);
    G.ctx.strokeStyle = isFront ? lineCol : backLegCol;
    G.ctx.lineWidth = 3.1;
    G.ctx.lineCap = 'round';
    G.ctx.lineJoin = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(hipX, hipY);
    G.ctx.lineTo(ik.kx, ik.ky);
    G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.lineTo(ik.ex + facing * 3.8, ik.ey);
    G.ctx.stroke();
  }

  // Pivot Upper Body around Pelvis with Dynamic Sprint / Brake / Combat Lunge Lean
  G.ctx.save();
  G.ctx.translate(0, hipY);
  if (!isDying) G.ctx.rotate(G.player.bodyLean || 0);
  G.ctx.translate(0, 19);

  // Split Hunter Coattails (flutter dynamically with velocity!)
  const coatTrail = Math.max(-14, Math.min(14, -(G.player.vx || 0) * 0.032)) - facing * 3;
  const coatLift = !G.player.grounded ? Math.max(-5, Math.min(7, (G.player.vy || 0) * 0.015)) : 0;
  G.ctx.fillStyle = isHurt ? '#ffffff' : '#0f1420';
  G.ctx.strokeStyle = 'rgba(232, 224, 202, 0.78)';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 6, -16);
  G.ctx.quadraticCurveTo(-facing * 11 + coatTrail * 0.6, -9, -facing * 12 + coatTrail, -1 - coatLift);
  G.ctx.lineTo(-facing * 3 + coatTrail * 0.6, -4 - coatLift * 0.5);
  G.ctx.lineTo(-facing * 1, -15);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.beginPath();
  G.ctx.moveTo(facing * 1, -15);
  G.ctx.lineTo(facing * 9, -15);
  G.ctx.quadraticCurveTo(facing * 10 + coatTrail * 0.35, -8, facing * 7 + coatTrail * 0.45, -2 - coatLift * 0.6);
  G.ctx.lineTo(facing * 2 + coatTrail * 0.25, -5 - coatLift * 0.3);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Tailored Layered Dark-Hunter Coat Torso + High Jagged Collar
  G.ctx.fillStyle = bodyCol;
  G.ctx.strokeStyle = '#f0e7cf';
  G.ctx.lineWidth = 2.05;
  G.ctx.beginPath();
  G.ctx.moveTo(-9, -15);
  G.ctx.lineTo(-8, -36);
  G.ctx.lineTo(-facing * 11, -41);
  G.ctx.lineTo(0, -37);
  G.ctx.lineTo(facing * 9, -39);
  G.ctx.lineTo(8, -35);
  G.ctx.lineTo(9, -15);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Crimson Diagonal Baldrick Sash + Ornate Bronze Shoulder Clasp
  G.ctx.strokeStyle = '#9f1239';
  G.ctx.lineWidth = 2.6;
  G.ctx.beginPath(); G.ctx.moveTo(-facing * 7, -35); G.ctx.lineTo(facing * 8, -21); G.ctx.stroke();
  G.ctx.fillStyle = '#3b2b18';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.arc(facing * 5, -34, 3.6, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();

  // Waist-Mounted Swinging Soul Lantern & Orbiting Ink Seals
  if (!isDying) {
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
      drawGlowSprite('cyan', 0, 6.5, 13 + Math.sin(now * 8) * 2.5, 0.8);
    }
    G.ctx.fillStyle = soulReady ? '#e0f2fe' : 'rgba(56, 189, 248, 0.42)';
    G.ctx.beginPath(); G.ctx.arc(0, 6.5, soulReady ? 2.7 : 1.9, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();

    if (G.player.seals >= G.player.maxSeals && G.player.maxSeals > 0) {
      const glowK = weaponId === 'bell' ? 'cyan' : 'gold';
      const pulse = 0.72 + Math.sin(now * 7.5) * 0.22;
      drawGlowSprite(glowK, -facing * 18, -38, 22, 0.55 * pulse);
      G.ctx.save();
      G.ctx.strokeStyle = weaponId === 'bell' ? COLORS.cyanBright : COLORS.goldBright;
      G.ctx.globalAlpha = 0.65 * pulse;
      G.ctx.lineWidth = 1.4;
      boilCircle(G.ctx, -facing * 18, -38, 13 + Math.sin(now * 6) * 1.5, 8110, 0.9, 12);
      G.ctx.stroke();
      G.ctx.restore();
    }
    for (let s = 0; s < G.player.seals; s++) {
      const ang = now * 2.8 + s * ((Math.PI * 2) / Math.max(1, G.player.seals));
      const ox = -facing * 18 + Math.cos(ang) * 9;
      const oy = -36 + Math.sin(ang) * 7 - s * 3;
      G.ctx.save();
      G.ctx.translate(ox, oy);
      G.ctx.rotate(Math.sin(now * 4 + s) * 0.25);
      G.ctx.fillStyle = '#b91c1c';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1;
      G.ctx.fillRect(-2.5, -5, 5, 10);
      G.ctx.strokeRect(-2.5, -5, 5, 10);
      G.ctx.restore();
    }
  }

  // Sharp Soulslike Crescent-Horned Cracked Bone Mask & Tapered Shadow Cowl
  const headBob = Math.sin(G.player.runCycle * 2) * 1.1;
  G.ctx.save();
  G.ctx.translate(facing * 1, -45 + headBob);

  G.ctx.fillStyle = '#0a0e17';
  G.ctx.strokeStyle = lineCol;
  G.ctx.lineWidth = 1.55;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 14, 6);
  G.ctx.quadraticCurveTo(-facing * 17, -11, -facing * 5, -14);
  G.ctx.quadraticCurveTo(facing * 10, -13, facing * 9, 6);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  G.ctx.fillStyle = isHurt ? '#ffffff' : '#ede6d3';
  G.ctx.strokeStyle = '#090c12';
  G.ctx.lineWidth = 1.45;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 4, -9);
  G.ctx.quadraticCurveTo(-facing * 14, -17, -facing * 12, -23);
  G.ctx.quadraticCurveTo(-facing * 7, -15, 0, -10);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.beginPath();
  G.ctx.moveTo(facing * 3, -9);
  G.ctx.quadraticCurveTo(facing * 9, -16, facing * 6, -21);
  G.ctx.quadraticCurveTo(facing * 4, -14, 0, -10);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 7, 3);
  G.ctx.lineTo(-facing * 8, -9);
  G.ctx.quadraticCurveTo(facing * 1, -12, facing * 8, -8);
  G.ctx.lineTo(facing * 9, 2);
  G.ctx.lineTo(facing * 2, 9);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  G.ctx.strokeStyle = 'rgba(180, 83, 9, 0.72)';
  G.ctx.lineWidth = 1.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-facing * 4, -9); G.ctx.lineTo(-facing * 1, -4); G.ctx.lineTo(-facing * 2.5, 1);
  G.ctx.stroke();

  const eyeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
  const eyeCol = eyeGold ? COLORS.goldBright : COLORS.cyanBright;
  drawGlowSprite(eyeGold ? 'gold' : 'cyan', facing * 3.5, -2, 11, 0.74);
  G.ctx.fillStyle = eyeCol;
  G.ctx.beginPath();
  G.ctx.moveTo(facing * 0.5, -3.6); G.ctx.lineTo(facing * 4.2, -2.2); G.ctx.lineTo(facing * 0.8, -0.6); G.ctx.closePath();
  G.ctx.moveTo(facing * 5.2, -3.0); G.ctx.lineTo(facing * 8.2, -2.0); G.ctx.lineTo(facing * 5.4, -0.8); G.ctx.closePath();
  G.ctx.fill();
  G.ctx.restore();

  // ==================== ARTICULATED 2-BONE IK ARMS + THREE-WEAPON RENDERER ====================
  const bladeGold = G.player.chargeReadyPlayed || G.player.riposteWindow > 0;
  const bladeSealProc = !!G.player.freeSealProc;

  if (G.player.diveState !== 'none') {
    drawGlowSprite('gold', 0, -26, 62, 0.88);
    drawGlowSprite('cyan', 0, -26, 38, 0.65);
    G.ctx.save();
    G.ctx.fillStyle = 'rgba(245, 158, 11, 0.24)'; G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.6;
    G.ctx.beginPath(); G.ctx.moveTo(-14, -56); G.ctx.lineTo(14, -56); G.ctx.quadraticCurveTo(24, -22, 28, 4);
    G.ctx.lineTo(-28, 4); G.ctx.quadraticCurveTo(-24, -22, -14, -56); G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    G.ctx.restore();
  }
  if (G.player.airSlamState !== 'none') {
    drawGlowSprite('gold', 0, -24, 52, 0.84);
    G.ctx.save();
    G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 3.0;
    G.ctx.beginPath(); G.ctx.moveTo(-18, -6); G.ctx.lineTo(0, 12); G.ctx.lineTo(18, -6); G.ctx.stroke();
    G.ctx.restore();
  }
  if (G.player.shieldArmorTimer > 0) {
    drawGlowSprite('gold', 0, -28, 38, 0.62);
    G.ctx.save();
    G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.4;
    boilCircle(G.ctx, 0, -28, 28, 7180, 1.4, 14);
    G.ctx.stroke();
    G.ctx.restore();
  }

  let handX = facing * 9;
  let handY = -28 + Math.sin(now * 3.5) * 1.0;
  let bladeAng = weaponId === 'hammer'
    ? (facing > 0 ? -2.28 : Math.PI + 2.28)
    : (facing > 0 ? -0.35 : Math.PI + 0.35);
  let useTwoHands = weaponId === 'hammer';

  if (G.player.airSlamState !== 'none' && weaponId === 'hammer') {
    handX = facing * 6;
    handY = G.player.airSlamState === 'hang' ? -44 : -22;
    bladeAng = G.player.airSlamState === 'hang' ? (facing > 0 ? -2.65 : Math.PI + 2.65) : Math.PI * 0.5;
    useTwoHands = true;
  } else if (G.player.parryActive) {
    handX = facing * 13;
    handY = -31;
    bladeAng = facing > 0 ? -1.18 : Math.PI + 1.18;
    useTwoHands = true;
  } else if (G.player.isCharging && G.player.chargeTime > 0.14) {
    if (weaponId === 'bell') {
      handX = facing * 11; handY = -34;
      bladeAng = facing > 0 ? -1.05 : Math.PI + 1.05;
    } else if (weaponId === 'hammer') {
      handX = facing * 2; handY = -44;
      bladeAng = facing > 0 ? -2.68 : Math.PI + 2.68;
      useTwoHands = true;
    } else {
      handX = -facing * 7; handY = -23;
      bladeAng = facing > 0 ? 2.75 : (Math.PI - 2.75);
      useTwoHands = true;
    }
  } else if (atkPose) {
    handX = atkPose.handX;
    handY = atkPose.handY;
    bladeAng = atkPose.ang;
    useTwoHands = atkPose.offHand;
  } else if (isRunning) {
    const armSw = Math.sin(G.player.runCycle) * 3.2;
    handX = facing * (weaponId === 'hammer' ? 5 : 8) - armSw * facing;
    handY = (weaponId === 'hammer' ? -33 : -27) + Math.abs(armSw) * 0.4;
  }

  const drawArticulatedArm = (shX, shY, gx, gy, isBack) => {
    const ik = solve2BoneIK(shX, shY, gx, gy, 9.2, 9.2, -facing);
    G.ctx.strokeStyle = isBack ? '#7c7465' : '#dfd6be';
    G.ctx.lineWidth = isBack ? 2.7 : 3.2;
    G.ctx.lineCap = 'round';
    G.ctx.lineJoin = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(shX, shY);
    G.ctx.lineTo(ik.kx, ik.ky);
    G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.stroke();
    G.ctx.fillStyle = isBack ? '#4c111e' : '#9f1239';
    G.ctx.beginPath(); G.ctx.arc(ik.ex, ik.ey, isBack ? 2.2 : 2.6, 0, Math.PI * 2); G.ctx.fill();
  };

  if (useTwoHands) {
    const offX = handX - Math.cos(bladeAng) * 7;
    const offY = handY - Math.sin(bladeAng) * 7;
    drawArticulatedArm(-facing * 4, -33, offX, offY, true);
  }

  G.ctx.save();
  G.ctx.translate(handX, handY);
  G.ctx.rotate(bladeAng);

  if (weaponId === 'bell') {
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
    const rib = Math.sin(now * 10) * 4;
    G.ctx.strokeStyle = COLORS.cyanBright;
    G.ctx.lineWidth = 1.4;
    G.ctx.beginPath(); G.ctx.moveTo(-6, 7); G.ctx.quadraticCurveTo(-9, 14 + rib * 0.4, -5 + rib, 21); G.ctx.stroke();
    G.ctx.restore();
  } else if (weaponId === 'hammer') {
    G.ctx.strokeStyle = '#3b2b1e'; G.ctx.lineWidth = 4.6;
    G.ctx.beginPath(); G.ctx.moveTo(-16, 0); G.ctx.lineTo(36, 0); G.ctx.stroke();
    G.ctx.strokeStyle = '#9f1239'; G.ctx.lineWidth = 4.2;
    G.ctx.beginPath(); G.ctx.moveTo(-12, 0); G.ctx.lineTo(6, 0); G.ctx.stroke();
    G.ctx.fillStyle = COLORS.gold;
    G.ctx.beginPath(); G.ctx.arc(-17, 0, 3.4, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.2;
    G.ctx.beginPath(); G.ctx.moveTo(26, -5.5); G.ctx.lineTo(26, 5.5); G.ctx.stroke();
    const chargingH = G.player.isCharging && G.player.chargeTime > 0.14;
    if (bladeSealProc) drawGlowSprite('crimson', 38, 0, 30, 0.85);
    else if (bladeGold || chargingH || G.player.shieldArmorTimer > 0) drawGlowSprite('gold', 38, 0, 32, 0.82);
    G.ctx.fillStyle = bladeSealProc ? '#7f1d1d' : '#2b1e12';
    G.ctx.strokeStyle = (bladeGold || chargingH || G.player.shieldArmorTimer > 0) ? COLORS.goldBright : COLORS.gold;
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath();
    G.ctx.moveTo(29, -11); G.ctx.lineTo(44, -14.5); G.ctx.lineTo(49, -7);
    G.ctx.lineTo(49, 7); G.ctx.lineTo(44, 14.5); G.ctx.lineTo(29, 11);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    G.ctx.strokeStyle = (bladeGold || chargingH) ? '#fef9c3' : COLORS.goldBright; G.ctx.lineWidth = 1.7;
    G.ctx.beginPath(); G.ctx.moveTo(35, -9); G.ctx.lineTo(40, -2); G.ctx.lineTo(36, 3); G.ctx.lineTo(42, 10); G.ctx.stroke();
    G.ctx.fillStyle = '#fef08a';
    G.ctx.beginPath(); G.ctx.arc(46, -6, 1.7, 0, Math.PI * 2); G.ctx.arc(46, 6, 1.7, 0, Math.PI * 2); G.ctx.fill();
  } else {
    const tasselSway = Math.sin(now * 9) * 3.5;
    G.ctx.strokeStyle = '#be123c'; G.ctx.lineWidth = 1.6;
    G.ctx.beginPath(); G.ctx.moveTo(-10, 0); G.ctx.quadraticCurveTo(-16, 4 + tasselSway * 0.4, -20, 7 + tasselSway); G.ctx.stroke();
    G.ctx.strokeStyle = '#9f1239'; G.ctx.lineWidth = 3.2;
    G.ctx.beginPath(); G.ctx.moveTo(-10, 0); G.ctx.lineTo(4, 0); G.ctx.stroke();
    G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(4, -5.8); G.ctx.lineTo(4, 5.8); G.ctx.stroke();
    if (bladeSealProc) drawGlowSprite('crimson', 24, 0, 22, 0.82);
    else if (bladeGold) drawGlowSprite('gold', 24, 0, 20, 0.72);
    G.ctx.fillStyle = bladeSealProc ? COLORS.crimsonBright : (bladeGold ? COLORS.goldBright : '#e4dfd1');
    G.ctx.strokeStyle = '#090c12'; G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(5, -2.7);
    G.ctx.quadraticCurveTo(27, -4.8, 44, -1.0);
    G.ctx.lineTo(38, 2.6);
    G.ctx.quadraticCurveTo(22, 1.8, 5, 2.2);
    G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
  }
  G.ctx.restore();

  drawArticulatedArm(facing * 4, -33, handX, handY, false);

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
      G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)'; G.ctx.lineWidth = 7.5;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 3.2;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 24, a0, a1); G.ctx.stroke();
      G.ctx.strokeStyle = '#ffffff'; G.ctx.lineWidth = 1.6;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 28 - p * 8, a0 + 0.18, a1 - 0.18); G.ctx.stroke();
      drawParryStarGlint(gx + facing * 8, gy - 6, 9 * (1 - p * 0.3), COLORS.goldBright);
    } else if (isBlockZone) {
      drawGlowSprite('cyan', gx + facing * 4, gy, 20, 0.48);
      G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)'; G.ctx.lineWidth = 5.5;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.cyanBright; G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 22, a0 + 0.1, a1 - 0.1); G.ctx.stroke();
    } else {
      G.ctx.setLineDash([4, 4]);
      G.ctx.strokeStyle = 'rgba(248, 113, 113, 0.52)'; G.ctx.lineWidth = 2;
      G.ctx.beginPath(); G.ctx.arc(gx, gy, 20, a0 + 0.25, a1 - 0.25); G.ctx.stroke();
      G.ctx.setLineDash([]);
    }
    G.ctx.restore();
  }

  if (G.player.isCharging && G.player.chargeTime > 0.15) {
    const pct = Math.min(1, G.player.chargeTime / rsDraw.iaiChargeTime);
    drawParryStarGlint(-facing * 10, -24, 8 + pct * 14, pct >= 1 ? COLORS.goldBright : COLORS.cyanBright);
  }

  G.ctx.restore();
  G.ctx.restore();
}
