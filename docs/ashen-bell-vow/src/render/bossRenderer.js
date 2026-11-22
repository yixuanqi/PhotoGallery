// Four Main Bosses (Hui, Ji, Yuan, Zhu), Arena 4 Mirror Floor & Boss Banner Renderer (v32.0)
import { COLORS, FLOOR_Y } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle, drawCloakMesh, solve2BoneIK } from '../vfx.js';
import { t, isEn } from '../i18n.js';
import { drawSlowBladeRing, drawParryStarGlint, drawExecutionSigil } from './renderShared.js';
import { drawCachedText } from './glyphAtlas.js';
import { getBoss4MirrorGradientStrip } from './backdropCache.js';

/* ---------- BOSS 1: 残甲重骑士 · 晦 (Hunched Broken-Armor Veteran Knight + Tattered Back-Banner) ---------- */
export function drawBoss(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isRed = (b.moveKind === 'redLeap' || b.moveKind === 'inkTide') && (b.state === 'windup' || b.state === 'strike');

  G.ctx.save();
  drawCloakMesh(b.cloak, isP2 ? '#290d14' : '#131722', isP2 ? 'rgba(248, 113, 113, 0.52)' : 'rgba(216, 207, 184, 0.42)', 28, 800);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  const bCrouch = isStagger ? 17 : (b.state === 'windup' && (b.moveKind === 'redLeap' || b.moveKind === 'chargeThrust')) ? 10 : 4;

  // Heavy Wide-Stance 2-Bone IK Veteran Greaves
  const bHipY = -28 + bCrouch;
  const bWalk = b.walkCycle || 0;
  const bMoving = Math.abs(b.vx) > 20 && b.grounded;
  const drawBossLeg = (isFront) => {
    const hx = (isFront ? 1 : -1) * b.facing * 11;
    let tx, ty;
    if (isStagger) {
      tx = isFront ? b.facing * 20 : -b.facing * 24; ty = 0;
    } else if (!b.grounded) {
      tx = isFront ? b.facing * 17 : -b.facing * 15; ty = isFront ? -10 : -4;
    } else if (bMoving) {
      const ph = bWalk + (isFront ? 0 : Math.PI);
      tx = Math.sin(ph) * 21; ty = -Math.max(0, Math.cos(ph)) * 9;
    } else {
      const spread = bCrouch > 5 ? 20 : 15;
      tx = isFront ? b.facing * spread : -b.facing * spread; ty = 0;
    }
    const ik = solve2BoneIK(hx, bHipY, tx, ty, 17, 17, b.facing);
    G.ctx.strokeStyle = isFront ? (isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.85)') : 'rgba(122, 118, 110, 0.72)';
    G.ctx.lineWidth = 8.4;
    G.ctx.lineCap = 'round'; G.ctx.lineJoin = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(hx, bHipY); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
    G.ctx.strokeStyle = '#121620'; G.ctx.lineWidth = 4.6; G.ctx.stroke();
    G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.gold;
    G.ctx.beginPath(); G.ctx.arc(ik.kx, ik.ky, 3.2, 0, Math.PI * 2); G.ctx.fill();
  };
  drawBossLeg(false);
  drawBossLeg(true);

  G.ctx.save();
  G.ctx.translate(0, bCrouch);

  // Broken Oath-Banner Pole jutting diagonally from scarred backplate (distinct veteran silhouette!)
  G.ctx.save();
  G.ctx.translate(-b.facing * 14, -66);
  const poleLean = -b.facing * 0.42 + (b.bellSwing || 0) * 0.35;
  G.ctx.rotate(poleLean);
  G.ctx.strokeStyle = '#6b5742';
  G.ctx.lineWidth = 3.2;
  G.ctx.beginPath(); G.ctx.moveTo(0, 12); G.ctx.lineTo(0, -56); G.ctx.stroke();
  // Crossbar & rain-whipped tattered crimson-ash standard
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath(); G.ctx.moveTo(-11, -48); G.ctx.lineTo(11, -48); G.ctx.stroke();
  const fWave = Math.sin(G.globalTime * 5.2) * 6;
  G.ctx.fillStyle = isP2 ? '#6b1020' : '#31141c';
  G.ctx.strokeStyle = isP2 ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.45)';
  G.ctx.lineWidth = 1.3;
  G.ctx.beginPath();
  G.ctx.moveTo(-9, -48); G.ctx.lineTo(9, -48);
  G.ctx.quadraticCurveTo(10 + fWave * 0.6, -24, 6 + fWave, -6);
  G.ctx.lineTo(-1 + fWave * 0.7, -15);
  G.ctx.lineTo(-10 + fWave, -4);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  // Hunched Broad Cracked-Plate Cuirass (lower, wider veteran bulk)
  const hunchX = b.facing * 5;
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#181c26';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.80)';
  G.ctx.lineWidth = 2.3;
  G.ctx.beginPath();
  G.ctx.moveTo(-25, -24);
  G.ctx.lineTo(-27 + hunchX * 0.5, -68);
  G.ctx.lineTo(26 + hunchX, -68);
  G.ctx.lineTo(25, -24);
  G.ctx.lineTo(10, -29);
  G.ctx.lineTo(0, -20);
  G.ctx.lineTo(-11, -29);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Diagonal rusted bronze chest-strap & battle gouges
  G.ctx.strokeStyle = isP2 ? 'rgba(248, 113, 113, 0.55)' : 'rgba(245, 158, 11, 0.45)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-18, -64); G.ctx.lineTo(18 + hunchX * 0.5, -30);
  G.ctx.moveTo(8, -56); G.ctx.lineTo(-4, -44);
  G.ctx.stroke();

  // Asymmetric Pauldrons: Colossal Layered Shield-Pauldron on Lead Shoulder vs Shattered Exposed Rear Shoulder
  G.ctx.fillStyle = '#252a38';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.parchment;
  G.ctx.lineWidth = 2.0;
  G.ctx.save();
  G.ctx.translate(b.facing * 20 + hunchX, -64);
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -14); G.ctx.lineTo(16 * b.facing, -18); G.ctx.lineTo(22 * b.facing, 2);
  G.ctx.lineTo(10 * b.facing, 14); G.ctx.lineTo(-10, 6);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Rivets on heavy shoulder shield
  G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.arc(8 * b.facing, -6, 2.2, 0, Math.PI * 2); G.ctx.arc(10 * b.facing, 4, 2.2, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();
  // Rear broken shoulder rim
  G.ctx.fillStyle = '#1b1f2b';
  G.ctx.beginPath();
  G.ctx.arc(-b.facing * 22, -62, 10, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  // Flat-Topped Scarred Iron Barbute Greathelm (NO horned crown — distinct veteran silhouette!)
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#202533';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.85)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-13 + hunchX, -70);
  G.ctx.lineTo(-14 + hunchX, -95);
  G.ctx.lineTo(-6 + hunchX, -101);
  G.ctx.lineTo(9 + hunchX, -100);
  G.ctx.lineTo(15 + hunchX, -92);
  G.ctx.lineTo(13 + hunchX, -70);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Deep vertical helmet battle-dent + glowing horizontal visor slit
  G.ctx.strokeStyle = '#090c12'; G.ctx.lineWidth = 2.0;
  G.ctx.beginPath(); G.ctx.moveTo(2 + hunchX, -100); G.ctx.lineTo(-2 + hunchX, -87); G.ctx.stroke();
  drawGlowSprite(isP2 ? 'crimson' : 'gold', hunchX + b.facing * 6, -84, 15, 0.78);
  G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(hunchX + (b.facing > 0 ? 2 : -12), -85.5, 10, 3.2);

  // Heavy Notched Executioner Cleaver-Blade (dragged low along floor when stalking!)
  G.ctx.save();
  let handX = b.facing * 14 + hunchX;
  let handY = -48;
  let swAng = b.facing > 0 ? 0.62 : Math.PI - 0.62;
  if (b.state === 'windup') {
    if (b.moveKind === 'inkTide') {
      handX = b.facing * 8 + hunchX; handY = -46; swAng = Math.PI * 0.5 + Math.sin(G.globalTime * 36) * 0.04;
    } else if (b.moveKind === 'chargeThrust') {
      handX = -b.facing * 14 + hunchX; handY = -40; swAng = b.facing > 0 ? -0.02 : Math.PI + 0.02;
    } else if (b.moveKind === 'delaySlam') {
      handX = -b.facing * 4 + hunchX; handY = -68;
      swAng = (b.facing > 0 ? -2.55 : Math.PI + 2.55) + Math.sin(G.globalTime * 42) * 0.05;
    } else if (b.moveKind === 'redLeap') {
      handX = -b.facing * 8 + hunchX; handY = -42; swAng = b.facing > 0 ? -2.1 : Math.PI + 2.1;
    } else if (b.comboIdx % 2 === 1) {
      handX = -b.facing * 6 + hunchX; handY = -34; swAng = b.facing > 0 ? 2.35 : Math.PI - 2.35;
    } else {
      swAng = b.facing > 0 ? -1.95 : Math.PI + 1.95;
    }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'inkTide') { handX = b.facing * 8 + hunchX; handY = -44; swAng = Math.PI * 0.5; }
    else if (b.moveKind === 'chargeThrust') { handX = b.facing * 24 + hunchX; handY = -42; swAng = b.facing > 0 ? 0 : Math.PI; }
    else if (b.comboIdx % 2 === 1 && (b.moveKind === 'combo2' || b.moveKind === 'flurry4')) { swAng = b.facing > 0 ? -0.55 : Math.PI + 0.55; }
    else { swAng = b.facing > 0 ? 0.28 : Math.PI - 0.28; }
  } else if (isStagger) {
    swAng = Math.PI * 0.5;
  } else if (bMoving) {
    // Drag heavy cleaver low behind/beside stones!
    swAng = b.facing > 0 ? 2.52 : 0.62;
  }
  G.ctx.translate(handX, handY);
  G.ctx.rotate(swAng);
  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#2a303f';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.parchment;
  G.ctx.lineWidth = 2.1;
  // Wide notched broken-tip cleaver silhouette
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -5);
  G.ctx.lineTo(82, -11);
  G.ctx.lineTo(100, -4);
  G.ctx.lineTo(92, 2);
  G.ctx.lineTo(98, 9);
  G.ctx.lineTo(68, 10);
  G.ctx.lineTo(62, 6);
  G.ctx.lineTo(54, 10);
  G.ctx.lineTo(-10, 5);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.strokeStyle = isP2 || isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath(); G.ctx.moveTo(12, -1); G.ctx.lineTo(78, -2); G.ctx.stroke();
  G.ctx.restore();

  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -134, b.moveKind === 'inkTide' ? 48 : 30, 0.85);
      const pTxt = b.moveKind === 'inkTide' ? t('ren.dangerTide') : t('ren.dangerGlyph');
      drawCachedText(G.ctx, pTxt, 0, -124, { size: isEn() ? 19 : 30, bold: true, color: COLORS.crimsonBright, shadow: true, shadowOffX: 2, shadowOffY: 2 });
    } else {
      if (b.isDelayedHit) drawSlowBladeRing(b.facing * 26, -88, b.stateTimer, b.windupDuration, COLORS.goldBright);
      if (b.stateTimer < 0.24) drawParryStarGlint(b.facing * 26, -88, b.isDelayedHit ? 28 : 24, COLORS.goldBright);
    }
  }

  G.ctx.restore();
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 46);
}

/* ---------- BOSS 2: 四臂悬索铸炉傀儡 · 寂 (Non-Humanoid 4-Armed Chain-Suspended Furnace Golem) ---------- */
export function drawBoss2(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isRed = (b.moveKind === 'redSweepHook' || b.moveKind === 'resonanceNova') && (b.state === 'windup' || b.state === 'strike');
  const now = G.globalTime;

  G.ctx.save();
  drawGlowSprite(isP2 ? 'crimson' : 'gold', cx, cy, isP2 ? 96 : 68, isP2 ? 0.54 : 0.34);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 12);

  // 1. Twin Overhead Iron Ceiling Suspension Chains anchoring the Golem to Foundry Rafters
  const ceilOff = -(b.y - 780) - b.h;
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.34)';
  G.ctx.lineWidth = 3.2;
  G.ctx.setLineDash([7, 4]);
  G.ctx.beginPath();
  G.ctx.moveTo(-22, -88); G.ctx.lineTo(-34, Math.min(-180, ceilOff));
  G.ctx.moveTo(22, -88);  G.ctx.lineTo(34, Math.min(-180, ceilOff));
  G.ctx.stroke();
  G.ctx.setLineDash([]);
  // Overhead forged iron suspension yoke bar
  G.ctx.fillStyle = '#241b15';
  G.ctx.strokeStyle = isP2 ? COLORS.goldBright : 'rgba(216, 207, 184, 0.65)';
  G.ctx.lineWidth = 2.0;
  G.ctx.fillRect(-34, -96, 68, 10);
  G.ctx.strokeRect(-34, -96, 68, 10);

  // 2. Dangling Heavy Slag Chains & Crucible Tail beneath Furnace Chassis (NO legs!)
  for (let ci = -1; ci <= 1; ci++) {
    const sway = Math.sin(now * 4.5 + ci * 1.4) * 7 - b.vx * 0.03;
    G.ctx.strokeStyle = ci === 0 ? 'rgba(245, 158, 11, 0.55)' : 'rgba(148, 163, 184, 0.45)';
    G.ctx.lineWidth = ci === 0 ? 4.0 : 2.6;
    G.ctx.beginPath();
    G.ctx.moveTo(ci * 14, -22);
    G.ctx.quadraticCurveTo(ci * 16 + sway * 0.6, -8, ci * 12 + sway, 6);
    G.ctx.stroke();
  }

  // 3. Upper Pair of Articulated Mechanical Arms carrying Twin Glowing Casting-Bells
  [-1, 1].forEach((side, idx) => {
    const sx = side * 26;
    const sy = -76;
    const bob = Math.sin(b.orbitAngle * 1.2 + idx * Math.PI) * 10;
    const ex = side * 48;
    const ey = -90 + bob * 0.5;
    const hx = side * 56;
    const hy = -62 + bob;
    G.ctx.strokeStyle = '#3b2d22'; G.ctx.lineWidth = 5.5; G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(sx, sy); G.ctx.lineTo(ex, ey); G.ctx.lineTo(hx, hy); G.ctx.stroke();
    G.ctx.strokeStyle = COLORS.gold; G.ctx.lineWidth = 1.6; G.ctx.stroke();
    // Hanging heated miniature resonance bell at arm tip
    G.ctx.save();
    G.ctx.translate(hx, hy + 10);
    G.ctx.rotate(Math.sin(now * 6 + idx) * 0.16);
    G.ctx.fillStyle = '#2d1c10';
    G.ctx.strokeStyle = isP2 || isRed ? COLORS.goldBright : COLORS.gold;
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath(); G.ctx.moveTo(-6, -8); G.ctx.lineTo(6, -8); G.ctx.lineTo(10, 8); G.ctx.lineTo(-10, 8); G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
    G.ctx.fillStyle = isP2 ? COLORS.crimsonBright : '#fef08a';
    G.ctx.beginPath(); G.ctx.arc(0, 8, 2.8, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  });

  // 4. Cast-Iron Blast-Furnace Cauldron Chest + Glowing Barred Molten Heart Core
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#1b1412';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (isP2 ? COLORS.goldBright : 'rgba(216, 207, 184, 0.78)');
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath();
  G.ctx.moveTo(-26, -78);
  G.ctx.lineTo(26, -78);
  G.ctx.lineTo(31, -46);
  G.ctx.lineTo(22, -20);
  G.ctx.lineTo(-22, -20);
  G.ctx.lineTo(-31, -46);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Twin Shoulder Exhaust Stacks
  G.ctx.fillStyle = '#261c17';
  G.ctx.fillRect(-30, -90, 9, 14); G.ctx.strokeRect(-30, -90, 9, 14);
  G.ctx.fillRect(21, -90, 9, 14);  G.ctx.strokeRect(21, -90, 9, 14);
  // Barred Furnace Grate revealing throbbing molten core inside!
  const corePulse = 0.8 + Math.sin(now * (isP2 ? 12 : 6)) * 0.2;
  drawGlowSprite(isP2 ? 'crimson' : 'gold', 0, -48, 26, 0.82 * corePulse);
  G.ctx.fillStyle = isP2 ? '#fb923c' : COLORS.goldBright;
  G.ctx.fillRect(-13, -60, 26, 24);
  G.ctx.strokeStyle = '#18110e'; G.ctx.lineWidth = 3.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-6, -61); G.ctx.lineTo(-6, -35);
  G.ctx.moveTo(0, -61);  G.ctx.lineTo(0, -35);
  G.ctx.moveTo(6, -61);  G.ctx.lineTo(6, -35);
  G.ctx.moveTo(-14, -48); G.ctx.lineTo(14, -48);
  G.ctx.stroke();

  // 5. Recessed Riveted Iron Bell-Jaw Furnace Head with 3 Glowing Slit Eyes
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#251d1a';
  G.ctx.strokeStyle = isP2 ? COLORS.goldBright : 'rgba(216, 207, 184, 0.80)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -78); G.ctx.lineTo(-16, -98); G.ctx.lineTo(0, -108); G.ctx.lineTo(16, -98); G.ctx.lineTo(14, -78);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#fef08a';
  G.ctx.fillRect(b.facing * 2 - 7, -91, 4.5, 2.8);
  G.ctx.fillRect(b.facing * 2 + 2.5, -91, 4.5, 2.8);
  G.ctx.fillRect(b.facing * 2 - 2.2, -98, 4.5, 2.8);

  // 6. Lower Trailing Mechanical Arm wielding Heated Crucible Tongs
  G.ctx.save();
  G.ctx.translate(-b.facing * 24, -42);
  const tongAng = (b.facing > 0 ? 2.25 : 0.89) + Math.sin(now * 4) * 0.10;
  G.ctx.rotate(tongAng);
  G.ctx.strokeStyle = '#4a3525'; G.ctx.lineWidth = 4.5;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(34, 0); G.ctx.stroke();
  G.ctx.strokeStyle = '#fb923c'; G.ctx.lineWidth = 2.2;
  G.ctx.beginPath(); G.ctx.moveTo(32, -2); G.ctx.lineTo(48, -9); G.ctx.moveTo(32, 2); G.ctx.lineTo(48, 9); G.ctx.stroke();
  G.ctx.restore();

  // 7. Lower Leading Heavy Hydraulic Arm wielding Colossal Slag-Forging Maul
  G.ctx.save();
  const maulAng = b.state === 'strike' && b.moveKind === 'redSweepHook'
    ? (b.facing > 0 ? 0.08 : Math.PI - 0.08)
    : b.state === 'windup' && b.moveKind === 'chainDropSlam'
      ? Math.PI * 0.5
      : (b.facing > 0 ? -0.42 : Math.PI + 0.42) + Math.sin(now * 5) * 0.11;
  G.ctx.translate(b.facing * 24, -44);
  G.ctx.rotate(maulAng);
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.72)'; G.ctx.lineWidth = 4.2;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(52, 0); G.ctx.stroke();
  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#352214';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.lineWidth = 2.2;
  G.ctx.beginPath();
  G.ctx.moveTo(46, -16); G.ctx.lineTo(72, -20); G.ctx.lineTo(78, 0); G.ctx.lineTo(72, 20); G.ctx.lineTo(46, 16);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  // Molten Resonance Shield during bellShieldCharge
  if (b.shieldUp && !isStagger) {
    G.ctx.save();
    drawGlowSprite('gold', b.facing * 28, -48, 46, 0.74);
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    G.ctx.lineWidth = 3.2;
    G.ctx.beginPath();
    G.ctx.arc(b.facing * 12, -48, 52, b.facing > 0 ? -1.18 : Math.PI - 1.18, b.facing > 0 ? 1.18 : Math.PI + 1.18);
    G.ctx.stroke(); G.ctx.fill();
    G.ctx.restore();
  }

  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -138, b.moveKind === 'resonanceNova' ? 48 : 30, 0.85);
      const pTxt = b.moveKind === 'resonanceNova' ? t('ren.dangerNova') : t('ren.dangerGlyph');
      drawCachedText(G.ctx, pTxt, 0, -128, { size: isEn() ? 19 : 28, bold: true, color: COLORS.crimsonBright, shadow: true, shadowOffX: 2, shadowOffY: 2 });
    } else if (b.stateTimer < 0.25) {
      drawParryStarGlint(b.facing * 26, -88, 24, COLORS.goldBright);
    }
  }

  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 44);
}

/* ---------- BOSS 3: 千骸共鸣圣体 · 渊 (Non-Humanoid Floating Reliquary Seraph-Husk + Floating Sword Array) ---------- */
export function drawBoss3(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP2 = b.phase === 2;
  const isP3 = b.phase >= 3;
  const isRed = (b.moveKind === 'crimsonArc' || b.moveKind === 'skyShatter' || b.moveKind === 'eclipseTide') && (b.state === 'windup' || b.state === 'strike');
  const now = G.globalTime;
  const hoverY = isStagger ? 18 : (-10 + Math.sin(now * 2.4) * 6);
  const coreCol = isP3 ? '#fef08a' : isP2 ? COLORS.violetBright : COLORS.goldBright;

  G.ctx.save();
  G.ctx.globalAlpha = Math.max(0.15, b.blinkAlpha !== undefined ? b.blinkAlpha : 1);

  // Subtle Ground Astral Seal Ring beneath levitating Reliquary Husk (NO humanoid legs!)
  G.ctx.strokeStyle = isP3 ? 'rgba(254, 240, 138, 0.48)' : isP2 ? 'rgba(192, 132, 252, 0.42)' : 'rgba(245, 158, 11, 0.34)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath(); G.ctx.ellipse(cx, fy - 2, 42, 9, 0, 0, Math.PI * 2); G.ctx.stroke();

  drawGlowSprite(isP3 ? 'gold' : isP2 ? 'violet' : 'gold', cx, b.y + 52 + hoverY, isP3 ? 118 : 88, isP3 ? 0.58 : 0.38);

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 7 : 0;
  G.ctx.translate(cx + joltX, fy + hoverY);

  // 1. Six Detached Floating Broken Bronze Seraph Wing-Shards fanning outward by Phase!
  const wingSpread = (isP3 ? 1.24 : isP2 ? 1.08 : 0.92) + (b.state === 'windup' ? 0.16 : 0);
  [-1, 1].forEach(side => {
    for (let wi = 0; wi < 3; wi++) {
      const ang = side * (0.35 + wi * 0.42) * wingSpread + Math.sin(now * 2.6 + wi + side) * 0.06;
      const dist = 34 + wi * 14;
      const wx = Math.sin(ang) * dist;
      const wy = -74 - Math.cos(ang) * (24 - wi * 8);
      G.ctx.save();
      G.ctx.translate(wx, wy);
      G.ctx.rotate(ang);
      G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#1b1624';
      G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : coreCol;
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath();
      G.ctx.moveTo(0, -28 + wi * 4);
      G.ctx.lineTo(side * 12, -4);
      G.ctx.lineTo(side * 5, 22 - wi * 3);
      G.ctx.lineTo(-side * 6, 8);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      G.ctx.restore();
    }
  });

  // 2. Orbiting Broken Solar-Eclipse Halo Fragments behind Skull-Mask
  G.ctx.save();
  G.ctx.translate(0, -96);
  G.ctx.rotate(b.haloAngle || 0);
  G.ctx.strokeStyle = coreCol;
  G.ctx.lineWidth = isP3 ? 2.8 : 2.0;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    G.ctx.beginPath(); G.ctx.arc(0, 0, 44, a + 0.18, a + Math.PI * 0.5 - 0.18); G.ctx.stroke();
  }
  G.ctx.restore();

  // 3. Ethereal Trailing Relic Spine & Soulfire Chains tapering into air below ribcage
  G.ctx.strokeStyle = isP3 ? 'rgba(254, 240, 138, 0.72)' : 'rgba(216, 207, 184, 0.60)';
  G.ctx.lineWidth = 3.2;
  for (let sp = 0; sp < 4; sp++) {
    const sy = -28 + sp * 9;
    const sw = 12 - sp * 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(-sw, sy); G.ctx.lineTo(sw, sy); G.ctx.stroke();
  }

  // 4. Open Pale Bone Ribcage Arch housing the Expanding Split Soulfire Heart-Core!
  const coreGap = isP3 ? 13 : isP2 ? 9 : 6;
  drawGlowSprite(isP3 ? 'gold' : isP2 ? 'violet' : 'crimson', 0, -58, 34 + coreGap, 0.90);
  G.ctx.fillStyle = isP3 ? '#ffffff' : coreCol;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -76 - coreGap * 0.4);
  G.ctx.lineTo(10 + coreGap * 0.5, -58);
  G.ctx.lineTo(0, -40 + coreGap * 0.4);
  G.ctx.lineTo(-(10 + coreGap * 0.5), -58);
  G.ctx.closePath();
  G.ctx.fill();

  // Left & Right Curved Ivory Rib-Arches
  G.ctx.strokeStyle = b.hurtFlash > 0 ? '#ffffff' : '#e6dec8';
  G.ctx.lineWidth = 3.6;
  G.ctx.lineCap = 'round';
  [-1, 1].forEach(side => {
    for (let rib = 0; rib < 4; rib++) {
      const ry = -74 + rib * 11;
      const rw = 26 - rib * 2.5 + coreGap * 0.5;
      G.ctx.beginPath();
      G.ctx.moveTo(side * (5 + coreGap * 0.35), ry + 2);
      G.ctx.quadraticCurveTo(side * rw, ry - 4, side * (rw - 4), ry + 7);
      G.ctx.stroke();
    }
  });

  // 5. Weeping Blindfolded Ivory Relic Mask (NO horned knight helmet!)
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#ded6c2';
  G.ctx.strokeStyle = '#090c12';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -118);
  G.ctx.quadraticCurveTo(16, -112, 13, -84);
  G.ctx.lineTo(0, -76);
  G.ctx.lineTo(-13, -84);
  G.ctx.quadraticCurveTo(-16, -112, 0, -118);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Tattered Gold-Edged Blindfold & Vertical Glowing Soul-Tear Cracks
  G.ctx.fillStyle = isP2 ? '#2e1042' : '#2a1a12';
  G.ctx.fillRect(-13, -103, 26, 8);
  G.ctx.strokeStyle = coreCol; G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(-5, -95); G.ctx.lineTo(-6, -82);
  G.ctx.moveTo(5, -95);  G.ctx.lineTo(6, -82);
  G.ctx.stroke();

  // 6. Dual Detached Floating Bone-Gauntlet Hands + Array of 5 Levitating Oath-Swords!
  let swordAng = b.facing > 0 ? 0.18 : Math.PI - 0.18;
  let swordReach = 34;
  if (b.state === 'windup') {
    if (b.moveKind === 'eclipseTide') { swordAng = Math.PI * 0.5; swordReach = 22; }
    else if (b.moveKind === 'eclipseThrust') { swordAng = b.facing > 0 ? 0 : Math.PI; swordReach = -16; }
    else if (b.comboIdx % 2 === 1) { swordAng = b.facing > 0 ? 2.25 : Math.PI - 2.25; }
    else { swordAng = b.facing > 0 ? -2.18 : Math.PI + 2.18; }
  } else if (b.state === 'strike') {
    swordReach = 54;
    if (b.moveKind === 'eclipseTide') swordAng = Math.PI * 0.5;
    else if (b.moveKind === 'eclipseThrust') swordAng = b.facing > 0 ? 0 : Math.PI;
    else if (b.comboIdx % 2 === 1) swordAng = b.facing > 0 ? -0.45 : Math.PI + 0.45;
    else swordAng = b.facing > 0 ? 0.20 : Math.PI - 0.20;
  } else if (isStagger) {
    swordAng = Math.PI * 0.5;
  }

  // Detached gesturing bone hands flanking the ribcage
  [-1, 1].forEach(side => {
    const hdx = side * (32 + Math.sin(now * 3 + side) * 3) + (b.state === 'strike' ? b.facing * 12 : 0);
    const hdy = -56 + Math.cos(now * 3 + side) * 5;
    G.ctx.fillStyle = '#e6dec8';
    G.ctx.strokeStyle = coreCol;
    G.ctx.lineWidth = 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(hdx - 6, hdy - 7); G.ctx.lineTo(hdx + 6, hdy - 7);
    G.ctx.lineTo(hdx + 8, hdy + 5); G.ctx.lineTo(hdx, hdy + 11); G.ctx.lineTo(hdx - 8, hdy + 5);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  });

  // Primary Primeval Spirit Greatsword + 4 Companion Floating Oath-Blades
  const bladeCount = isP3 ? 5 : isP2 ? 3 : 2;
  for (let bi = 0; bi < bladeCount; bi++) {
    const isMain = bi === 0;
    const spreadA = isMain ? 0 : ((bi % 2 === 1 ? -1 : 1) * (0.20 + Math.floor((bi - 1) / 2) * 0.16));
    const bxOff = isMain ? b.facing * swordReach * 0.55 : (-b.facing * (12 + bi * 7));
    const byOff = isMain ? -58 : (-76 + bi * 12 + Math.sin(now * 4 + bi) * 4);
    G.ctx.save();
    G.ctx.translate(bxOff, byOff);
    G.ctx.rotate(swordAng + spreadA);
    const len = isMain ? 114 : 68;
    const bw = isMain ? 7.5 : 4.2;
    G.ctx.globalAlpha = isMain ? 1 : 0.72;
    G.ctx.fillStyle = isRed ? '#7f1d1d' : (isP3 ? '#452b11' : '#262133');
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : coreCol;
    G.ctx.lineWidth = isMain ? 2.2 : 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(-12, -bw * 0.6); G.ctx.lineTo(len - 20, -bw); G.ctx.lineTo(len, 0);
    G.ctx.lineTo(len - 20, bw); G.ctx.lineTo(-12, bw * 0.6);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    G.ctx.restore();
  }

  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -148, b.moveKind === 'eclipseTide' ? 52 : 34, 0.88);
      const pTxt = b.moveKind === 'eclipseTide' ? t('ren.dangerEclipse') : t('ren.dangerGlyph');
      drawCachedText(G.ctx, pTxt, 0, -140, { size: isEn() ? 19 : 30, bold: true, color: COLORS.crimsonBright, shadow: true, shadowOffX: 2, shadowOffY: 2 });
    } else {
      if (b.isDelayedHit) drawSlowBladeRing(b.facing * 28, -96, b.stateTimer, b.windupDuration, b.phase >= 2 ? COLORS.goldBright : COLORS.parchment);
      if (b.stateTimer < 0.25) drawParryStarGlint(b.facing * 28, -96, b.isDelayedHit ? 30 : 26, COLORS.goldBright);
    }
  }

  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 50);
}

/* ---------- ARENA 4 MIRROR FLOOR: 炉心镜渊实时墨镜水面与倒影 ---------- */
export function drawBoss4MirrorFloor() {
  if (!G.boss4 || !G.boss4.alive) return;
  const ctx = G.ctx;
  const now = G.globalTime;
  const x0 = 8360;
  const w = 1320;
  const st = G.boss4.stance || 'blade';
  const stCol = st === 'bell' ? COLORS.cyanBright : st === 'hammer' ? COLORS.gold : COLORS.goldBright;

  ctx.save();
  // Glossy black obsidian mirror water surface across Room 8 floor (pre-baked gradient strip, 0 per-frame allocations)
  ctx.drawImage(getBoss4MirrorGradientStrip(), x0, FLOOR_Y, w, 96);

  // Shimmering water-edge horizon highlight
  ctx.strokeStyle = stCol;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, FLOOR_Y + 0.5); ctx.lineTo(x0 + w, FLOOR_Y + 0.5); ctx.stroke();

  // Inverted mirrored ink silhouettes for Boss 4 and Player + concentric ripples
  const drawMirrorEntity = (ex, ew, eh, col, isWide) => {
    const cx = ex + ew * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - (isWide ? 18 : 11), FLOOR_Y + 3);
    ctx.lineTo(cx + (isWide ? 18 : 11), FLOOR_Y + 3);
    ctx.lineTo(cx + (isWide ? 12 : 7), FLOOR_Y + eh * 0.62);
    ctx.lineTo(cx - (isWide ? 12 : 7), FLOOR_Y + eh * 0.62);
    ctx.closePath();
    ctx.fill();
    // Concentric surface ripple under feet
    const rp = (now * 1.4) % 1;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.42 * (1 - rp);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(cx, FLOOR_Y + 2, 16 + rp * 34, 3 + rp * 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };
  drawMirrorEntity(G.boss4.x, G.boss4.w, G.boss4.h, stCol, true);
  if (G.player && G.player.hp > 0) drawMirrorEntity(G.player.x, G.player.w, G.player.h, '#bae6fd', false);
  ctx.restore();
}

/* ---------- BOSS 4: 墨烟流影双面剑豪 · 铸 (Ink-Wash Twin-Mask Grandmaster + 3 Materialized Spectral Weapons) ---------- */
export function drawBoss4(b) {
  if (!b.alive) return;
  const cx = b.x + b.w / 2;
  const fy = b.y + b.h;
  const isStagger = b.state === 'stagger';
  const isP3 = b.phase >= 3;
  const st = b.stance || 'blade';
  const isRed = b.moveKind === 'hammerQuakeLeap' && (b.state === 'windup' || b.state === 'strike');
  const stColor = st === 'bell' ? COLORS.cyanBright : st === 'hammer' ? COLORS.gold : COLORS.goldBright;
  const glowKey = st === 'bell' ? 'cyan' : (isP3 ? 'gold' : st === 'hammer' ? 'gold' : 'crimson');
  const now = G.globalTime;

  G.ctx.save();
  G.ctx.globalAlpha = Math.max(0.22, b.blinkAlpha !== undefined ? b.blinkAlpha : 1);
  drawGlowSprite(glowKey, cx, b.y + 48, isP3 ? 98 : 74, (isP3 ? 0.54 : 0.36) + (b.stanceFlash > 0 ? 0.28 : 0));

  // Calligraphic Dry-Brush Ink Trail Ribbon when dashing or striking rapidly
  if (Math.abs(b.vx) > 150) {
    const dir = Math.sign(b.vx);
    G.ctx.save();
    G.ctx.strokeStyle = isP3 ? 'rgba(254, 240, 138, 0.38)' : 'rgba(186, 230, 253, 0.28)';
    G.ctx.lineWidth = 10;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(cx, b.y + 44);
    G.ctx.quadraticCurveTo(cx - dir * 36, b.y + 38, cx - dir * 78, b.y + 52);
    G.ctx.stroke();
    G.ctx.restore();
  }

  drawCloakMesh(
    b.cloak,
    isP3 ? '#12101c' : '#0c0f18',
    isP3 ? 'rgba(254, 240, 138, 0.85)' : st === 'bell' ? 'rgba(125, 211, 252, 0.78)' : 'rgba(245, 158, 11, 0.72)',
    22,
    980
  );

  const joltX = b.hurtFlash > 0 ? (Math.random() - 0.5) * 7 : 0;
  G.ctx.translate(cx + joltX, fy);
  const crouch = isStagger ? 15 : (b.state === 'windup' && (b.moveKind === 'iaiDash' || b.moveKind === 'hammerQuakeLeap')) ? 12 : 0;

  // Lean Martial-Artist 2-Bone IK Stride
  const hipY = -34 + crouch;
  const wCyc = b.walkCycle || 0;
  const moving = Math.abs(b.vx) > 20 && b.grounded;
  [false, true].forEach(isFront => {
    const hx = (isFront ? 1 : -1) * b.facing * 8;
    let tx, ty;
    if (isStagger) { tx = isFront ? b.facing * 18 : -b.facing * 22; ty = 0; }
    else if (!b.grounded) { tx = isFront ? b.facing * 18 : -b.facing * 14; ty = isFront ? -14 : -5; }
    else if (moving) { const ph = wCyc + (isFront ? 0 : Math.PI); tx = Math.sin(ph) * 22; ty = -Math.max(0, Math.cos(ph)) * 12; }
    else { tx = (isFront ? 1 : -1) * b.facing * 15; ty = 0; }
    const ik = solve2BoneIK(hx, hipY, tx, ty, 18.5, 18.5, b.facing);
    G.ctx.strokeStyle = isFront ? '#e6dec8' : 'rgba(148, 138, 124, 0.68)';
    G.ctx.lineWidth = 5.8;
    G.ctx.lineCap = 'round'; G.ctx.lineJoin = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(hx, hipY); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
    G.ctx.strokeStyle = '#090b12'; G.ctx.lineWidth = 3.0; G.ctx.stroke();
  });

  G.ctx.save();
  G.ctx.translate(0, crouch);

  // Two Inactive Spectral Weapons Floating Crossed Behind Shoulders (distinct Tri-Weapon Grandmaster visual!)
  const inactiveWeapons = ['blade', 'hammer', 'bell'].filter(k => k !== st);
  inactiveWeapons.forEach((wk, idx) => {
    const side = idx === 0 ? -1 : 1;
    const floatY = -74 + Math.sin(now * 3.4 + idx * 2.2) * 5;
    G.ctx.save();
    G.ctx.translate(side * 24, floatY);
    G.ctx.rotate(side * 0.42);
    G.ctx.globalAlpha = 0.56;
    if (wk === 'hammer') {
      G.ctx.strokeStyle = COLORS.gold; G.ctx.lineWidth = 2.6;
      G.ctx.beginPath(); G.ctx.moveTo(0, 22); G.ctx.lineTo(0, -24); G.ctx.stroke();
      G.ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      G.ctx.fillRect(-10, -32, 20, 14); G.ctx.strokeRect(-10, -32, 20, 14);
    } else if (wk === 'bell') {
      G.ctx.strokeStyle = COLORS.cyanBright; G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.moveTo(0, 22); G.ctx.lineTo(0, -24); G.ctx.stroke();
      G.ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      G.ctx.beginPath(); G.ctx.moveTo(-6, -24); G.ctx.lineTo(6, -24); G.ctx.lineTo(9, -12); G.ctx.lineTo(-9, -12); G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
    } else {
      G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.moveTo(0, 24); G.ctx.lineTo(0, -34); G.ctx.stroke();
    }
    G.ctx.restore();
  });

  // Flowing White-Ink Calligraphic Scarf Tails fluttering behind neck
  G.ctx.save();
  G.ctx.strokeStyle = isP3 ? '#fef08a' : '#e6dec8';
  G.ctx.lineWidth = 4.2;
  G.ctx.lineCap = 'round';
  const sw1 = Math.sin(now * 7.5) * 9;
  const sw2 = Math.cos(now * 6.2) * 7;
  G.ctx.beginPath();
  G.ctx.moveTo(-b.facing * 8, -74);
  G.ctx.quadraticCurveTo(-b.facing * 28, -78 + sw1 * 0.5, -b.facing * 52, -68 + sw1);
  G.ctx.moveTo(-b.facing * 6, -72);
  G.ctx.quadraticCurveTo(-b.facing * 24, -64 + sw2 * 0.5, -b.facing * 44, -54 + sw2);
  G.ctx.stroke();
  G.ctx.restore();

  // Lean Ink-Wash Ronin Haori & Diagonal Gold-Cord Obi
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#0f121d';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : stColor;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-16, -26); G.ctx.lineTo(-18, -72); G.ctx.lineTo(18, -72); G.ctx.lineTo(16, -26);
  G.ctx.lineTo(7, -30); G.ctx.lineTo(0, -21); G.ctx.lineTo(-7, -30);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.strokeStyle = '#e6dec8'; G.ctx.lineWidth = 1.8;
  G.ctx.beginPath(); G.ctx.moveTo(-14, -70); G.ctx.lineTo(13, -36); G.ctx.moveTo(-15, -42); G.ctx.lineTo(15, -42); G.ctx.stroke();

  // Split Half-White / Half-Obsidian Twin-Face Grandmaster Mask (NO horned helmet!)
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#ede6d3';
  G.ctx.strokeStyle = '#090c12';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -104); G.ctx.lineTo(-11, -96); G.ctx.lineTo(-10, -76); G.ctx.lineTo(0, -72); G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = b.hurtFlash > 0 ? '#ffffff' : '#121521';
  G.ctx.beginPath();
  G.ctx.moveTo(0, -104); G.ctx.lineTo(11, -96); G.ctx.lineTo(10, -76); G.ctx.lineTo(0, -72); G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Glowing Asymmetric Eye on Active Face
  G.ctx.fillStyle = isP3 ? '#ffffff' : stColor;
  G.ctx.fillRect(b.facing > 0 ? 2 : -9, -90, 7, 2.8);

  // Active Stance Weapon in Hand with Crisp Ink-Brush Aura
  G.ctx.save();
  let handX = b.facing * 12, handY = -54;
  let swAng = b.facing > 0 ? 0.35 : Math.PI - 0.35;
  if (b.state === 'swapStance') {
    handY = -66; swAng = -Math.PI * 0.5;
  } else if (b.state === 'windup') {
    if (b.moveKind === 'iaiDash') { handX = -b.facing * 16; handY = -44; swAng = b.facing > 0 ? 0.04 : Math.PI - 0.04; }
    else if (st === 'bell') { handX = b.facing * 14; handY = -74; swAng = -Math.PI * 0.5; }
    else if (b.comboIdx % 2 === 1) { handX = -b.facing * 6; handY = -36; swAng = b.facing > 0 ? 2.2 : Math.PI - 2.2; }
    else { swAng = b.facing > 0 ? -2.25 : Math.PI + 2.25; }
  } else if (b.state === 'strike') {
    if (b.moveKind === 'iaiDash') { handX = b.facing * 26; swAng = b.facing > 0 ? 0 : Math.PI; }
    else if (b.comboIdx % 2 === 1) { swAng = b.facing > 0 ? -0.45 : Math.PI + 0.45; }
    else { swAng = b.facing > 0 ? 0.22 : Math.PI - 0.22; }
  } else if (isStagger) {
    swAng = Math.PI * 0.5;
  }
  G.ctx.translate(handX, handY);
  G.ctx.rotate(swAng);
  if (st === 'hammer') {
    G.ctx.strokeStyle = '#78350f'; G.ctx.lineWidth = 4.6;
    G.ctx.beginPath(); G.ctx.moveTo(-16, 0); G.ctx.lineTo(74, 0); G.ctx.stroke();
    G.ctx.fillStyle = isRed ? '#7f1d1d' : '#261a0e';
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
    G.ctx.lineWidth = 2.2;
    G.ctx.beginPath();
    G.ctx.moveTo(64, -18); G.ctx.lineTo(96, -24); G.ctx.lineTo(104, 0); G.ctx.lineTo(96, 24); G.ctx.lineTo(64, 18);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  } else if (st === 'bell') {
    G.ctx.strokeStyle = '#6b4c30'; G.ctx.lineWidth = 3.4;
    G.ctx.beginPath(); G.ctx.moveTo(-18, 0); G.ctx.lineTo(78, 0); G.ctx.stroke();
    G.ctx.fillStyle = '#182538';
    G.ctx.strokeStyle = COLORS.cyanBright;
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath();
    G.ctx.moveTo(74, -8); G.ctx.lineTo(94, -15); G.ctx.lineTo(94, 15); G.ctx.lineTo(74, 8);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    G.ctx.fillStyle = '#fef08a';
    G.ctx.beginPath(); G.ctx.arc(96, 0, 4, 0, Math.PI * 2); G.ctx.fill();
  } else {
    G.ctx.fillStyle = '#f1ebd8';
    G.ctx.strokeStyle = isP3 ? '#fef08a' : COLORS.goldBright;
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath();
    G.ctx.moveTo(-12, -3.2); G.ctx.lineTo(88, -5.5); G.ctx.lineTo(112, 0); G.ctx.lineTo(88, 5); G.ctx.lineTo(-12, 3.2);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  }
  G.ctx.restore();

  if (b.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -134, 36, 0.88);
      const pTxt = t('ren.dangerGlyph');
      drawCachedText(G.ctx, pTxt, 0, -128, { size: isEn() ? 19 : 30, bold: true, color: COLORS.crimsonBright, shadow: true, shadowOffX: 2, shadowOffY: 2 });
    } else {
      if (b.isDelayedHit) drawSlowBladeRing(b.facing * 26, -86, b.stateTimer, b.windupDuration, stColor);
      if (b.stateTimer < 0.25) drawParryStarGlint(b.facing * 26, -86, b.isDelayedHit ? 30 : 26, stColor);
    }
  }

  G.ctx.restore();
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, b.y + 48);
}

export function drawBossBanner() {
  if (!G.bossBanner || G.bossBanner.life <= 0) return;
  const b = G.bossBanner;
  const p = 1 - b.life / b.maxLife;
  const alpha = p < 0.14 ? (p / 0.14) : (b.life < 0.45 ? (b.life / 0.45) : 1);
  const cx = G.canvasW * 0.5;
  const cy = Math.min(132, G.canvasH * 0.20);
  G.ctx.save();
  G.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const en = isEn();
  const innerHalf = en ? Math.min(G.canvasW * 0.42, 265) : 195;
  const outerHalf = innerHalf + 75;
  const bh = b.quote ? 74 : 52;
  G.ctx.fillStyle = 'rgba(7, 10, 16, 0.34)';
  G.ctx.fillRect(cx - outerHalf, cy - 34, outerHalf * 2, bh);
  G.ctx.fillStyle = 'rgba(7, 10, 16, 0.72)';
  G.ctx.fillRect(cx - innerHalf, cy - 34, innerHalf * 2, bh);
  G.ctx.strokeStyle = b.color || COLORS.goldBright;
  G.ctx.lineWidth = 1.2;
  G.ctx.beginPath();
  G.ctx.moveTo(cx - innerHalf + 5, cy - 32); G.ctx.lineTo(cx + innerHalf - 5, cy - 32);
  G.ctx.moveTo(cx - innerHalf + 5, cy + (b.quote ? 38 : 18)); G.ctx.lineTo(cx + innerHalf - 5, cy + (b.quote ? 38 : 18));
  G.ctx.stroke();
  drawCachedText(G.ctx, b.title, cx, cy + 1, {
    size: en ? 21 : 24, bold: true, color: b.color || COLORS.goldBright, shadow: true, shadowColor: '#05070c', shadowOffX: 1.5, shadowOffY: 1.5
  });
  if (b.quote) {
    drawCachedText(G.ctx, b.quote, cx, cy + 25, {
      size: en ? 12.5 : 13.5, bold: false, color: COLORS.parchment
    });
  }
  G.ctx.restore();
}

