// Three-Biome Warden Mini-Bosses Renderer (split from enemyRenderer.js in v45.1 for high-craft distinct silhouettes)
// Shuo: Levitating Crane-Winged Gale Envoy | Ku: Towering Bell-Treant | Lin: Slender Sword-Tomb Frost Sovereign
import { COLORS } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle, drawCloakMesh, solve2BoneIK } from '../vfx.js';
import { t, isEn } from '../i18n.js';
import { drawParryStarGlint, drawExecutionSigil } from './renderShared.js';
import { drawCachedText } from './glyphAtlas.js';

export function drawWardenWind(e) {
  // v45.1 Complete Silhouette Overhaul: Levitating Crane-Winged Gale Envoy (NO kasa hat — 100% distinct from Duelist!)
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.moveKind === 'windDashCut' && (e.state === 'windup' || e.state === 'strike');
  const now = G.globalTime || 0;
  const hoverBob = isStagger ? 0 : (-7 + Math.sin(now * 4.4) * 3.5);
  const wingFlap = isStagger ? -0.35 : Math.sin(now * (e.phase === 2 ? 9.5 : 5.2)) * 0.14;

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, e.phase === 2 ? '#0e354d' : '#0b2234', 'rgba(125, 211, 252, 0.62)', 14, 840);
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 12);

  // Swirling Gale Vortex Ring beneath hovering feet
  G.ctx.save();
  G.ctx.strokeStyle = e.phase === 2 ? 'rgba(56, 189, 248, 0.58)' : 'rgba(125, 211, 252, 0.34)';
  G.ctx.lineWidth = e.phase === 2 ? 2.1 : 1.4;
  G.ctx.beginPath();
  G.ctx.ellipse(0, -3, 24 + Math.sin(now * 8) * 3.5, 5.5, 0, 0, Math.PI * 2);
  G.ctx.stroke();
  G.ctx.restore();

  G.ctx.translate(0, hoverBob);

  // 1. Orbiting Bronze Chime-Bell Halo behind spine
  G.ctx.save();
  G.ctx.translate(-e.facing * 4, -52);
  G.ctx.strokeStyle = isRed ? 'rgba(248, 113, 113, 0.62)' : 'rgba(125, 211, 252, 0.48)';
  G.ctx.lineWidth = 1.6;
  boilCircle(G.ctx, 0, 0, 26, 8420, 1.0, 16);
  G.ctx.stroke();
  for (let bi = 0; bi < 3; bi++) {
    const ba = now * (e.phase === 2 ? 2.6 : 1.4) + (bi * Math.PI * 2) / 3;
    const bx = Math.cos(ba) * 26;
    const by = Math.sin(ba) * 26;
    G.ctx.fillStyle = '#3b2c1a';
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(bx - 3.5, by - 4); G.ctx.lineTo(bx + 3.5, by - 4);
    G.ctx.lineTo(bx + 5, by + 4); G.ctx.lineTo(bx - 5, by + 4);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  }
  G.ctx.restore();

  // 2. Asymmetric Mechanical Bronze Wind-Sail Wings
  const drawSailWing = (dirX, scaleY, angOff) => {
    G.ctx.save();
    G.ctx.translate(-e.facing * 4 + dirX * 4, -50);
    G.ctx.rotate(dirX * (-0.32 + wingFlap + angOff));
    G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : 'rgba(14, 34, 52, 0.92)';
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#7dd3fc';
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(0, 0);
    G.ctx.quadraticCurveTo(dirX * 26, -26 * scaleY, dirX * 48, -14 * scaleY);
    G.ctx.lineTo(dirX * 34, -2 * scaleY);
    G.ctx.lineTo(dirX * 42, 7 * scaleY);
    G.ctx.lineTo(dirX * 22, 9 * scaleY);
    G.ctx.lineTo(dirX * 27, 17 * scaleY);
    G.ctx.quadraticCurveTo(dirX * 10, 14 * scaleY, 0, 8 * scaleY);
    G.ctx.closePath();
    G.ctx.fill(); G.ctx.stroke();
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(0, 1); G.ctx.lineTo(dirX * 42, -12 * scaleY);
    G.ctx.moveTo(0, 4); G.ctx.lineTo(dirX * 32, 5 * scaleY);
    G.ctx.stroke();
    G.ctx.restore();
  };
  drawSailWing(-e.facing, 1.08, 0.08);
  drawSailWing(e.facing, 0.84, -0.14);

  // 3. Suspended Pointed Crane-Greaves
  const stride = Math.sin(now * 5.5) * 4;
  [-1, 1].forEach(side => {
    const fx = side * 6 - e.facing * 4 + (side > 0 ? stride : -stride);
    const fyL = isStagger ? 0 : (-3 - (side > 0 ? 4 : 0));
    const ik = solve2BoneIK(side * 3.5, -24, fx, fyL, 12, 12, e.facing);
    G.ctx.strokeStyle = side < 0 ? '#7dd3fc' : COLORS.parchment;
    G.ctx.lineWidth = 3.0;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 3.5, -24); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // 4. Tapered Feather-Haori Torso
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0d1b2a';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -21);
  G.ctx.lineTo(-14, -52);
  G.ctx.lineTo(0, -58);
  G.ctx.lineTo(14, -52);
  G.ctx.lineTo(9, -21);
  G.ctx.lineTo(0, -15);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.5;
  G.ctx.beginPath(); G.ctx.moveTo(-5, -46); G.ctx.lineTo(5, -46); G.ctx.lineTo(0, -34); G.ctx.closePath(); G.ctx.stroke();

  // 5. Bronze Beaked Crane-Mask & Swept Feather Plumes
  G.ctx.save();
  G.ctx.translate(e.facing * 2, -62);
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1b2c3f';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(-e.facing * 4, -8);
  G.ctx.quadraticCurveTo(-e.facing * 22, -20, -e.facing * 34, -12);
  G.ctx.quadraticCurveTo(-e.facing * 20, -6, -e.facing * 6, -2);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#253344';
  G.ctx.beginPath();
  G.ctx.moveTo(-e.facing * 9, -6);
  G.ctx.quadraticCurveTo(0, -14, e.facing * 9, -5);
  G.ctx.lineTo(e.facing * 21, 1);
  G.ctx.lineTo(e.facing * 7, 6);
  G.ctx.lineTo(-e.facing * 9, 5);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  drawGlowSprite(isRed ? 'crimson' : 'cyan', e.facing * 5, -2, 11, 0.72);
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#e0f2fe';
  G.ctx.beginPath(); G.ctx.arc(e.facing * 5, -2, 2.3, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();

  // 6. Twin Crescent Wind-Chakram Blades
  const drawWindCrescent = (ox, oy, ang) => {
    G.ctx.save();
    G.ctx.translate(ox, oy);
    G.ctx.rotate(ang);
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#e0f2fe';
    G.ctx.lineWidth = 3.2;
    G.ctx.beginPath(); G.ctx.arc(16, 0, 17, -1.05, 1.05); G.ctx.stroke();
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath(); G.ctx.moveTo(-2, 0); G.ctx.lineTo(14, 0); G.ctx.stroke();
    G.ctx.restore();
  };
  let a1 = e.facing > 0 ? -0.38 : Math.PI + 0.38;
  let a2 = e.facing > 0 ? 0.65 : Math.PI - 0.65;
  if (e.state === 'windup') {
    a1 = e.facing > 0 ? -2.1 : Math.PI + 2.1;
    a2 = e.facing > 0 ? 2.0 : Math.PI - 2.0;
  } else if (e.state === 'strike') {
    a1 = e.facing > 0 ? 0.22 : Math.PI - 0.22;
    a2 = e.facing > 0 ? -0.35 : Math.PI + 0.35;
  }
  drawWindCrescent(-e.facing * 12, -38, a2);
  drawWindCrescent(e.facing * 14, -40, a1);

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -90, 22, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -84, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.24) {
      drawParryStarGlint(e.facing * 20, -40, 22, COLORS.goldBright);
    }
  }
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, e.y + 34);
}

export function drawWardenForest(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = (e.moveKind === 'vineWave' || e.moveKind === 'canopyThorns' || e.moveKind === 'rootEruption') && (e.state === 'windup' || e.state === 'strike');
  const armored = e.barkArmor && (e.shieldBrokenTimer || 0) <= 0 && !isStagger;
  const pulse = Math.sin(e.pulsePhase || 0) * 3;

  G.ctx.save();
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 7 : 0), fy);
  if (isStagger) G.ctx.translate(0, 12);

  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#131d17';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (armored ? '#6ee7b7' : '#a7f3d0');
  G.ctx.lineWidth = 2.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-30, 0);
  G.ctx.quadraticCurveTo(-24, -26, -26, -64);
  G.ctx.quadraticCurveTo(-18, -94, 0, -98 + pulse * 0.5);
  G.ctx.quadraticCurveTo(20, -92, 26, -62);
  G.ctx.quadraticCurveTo(24, -26, 30, 0);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  if (e.canopyThornTimer > 0) {
    drawGlowSprite('cyan', 0, -102, 46, 0.55);
    G.ctx.fillStyle = '#15803d';
    G.ctx.strokeStyle = '#86efac';
    G.ctx.lineWidth = 1.8;
    for (let ti = -3; ti <= 3; ti++) {
      const tx = ti * 13;
      const th = 22 - Math.abs(ti) * 3;
      G.ctx.beginPath();
      G.ctx.moveTo(tx - 5, -88); G.ctx.lineTo(tx + ti * 2, -88 - th); G.ctx.lineTo(tx + 5, -88);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    }
  }

  G.ctx.strokeStyle = '#365341';
  G.ctx.lineWidth = 4.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -84); G.ctx.lineTo(-34, -108); G.ctx.moveTo(-24, -96); G.ctx.lineTo(-18, -112);
  G.ctx.moveTo(14, -84); G.ctx.lineTo(36, -106); G.ctx.moveTo(24, -95); G.ctx.lineTo(18, -114);
  G.ctx.stroke();

  drawGlowSprite(e.phase === 2 ? 'gold' : 'cyan', 0, -54, 34, 0.55);
  G.ctx.fillStyle = '#5c4620';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -68); G.ctx.lineTo(14, -68); G.ctx.lineTo(19, -40); G.ctx.lineTo(-19, -40);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  if (armored) {
    G.ctx.strokeStyle = 'rgba(110, 231, 183, 0.72)';
    G.ctx.lineWidth = 3.0;
    boilCircle(G.ctx, 0, -52, 38, 7200, 2.0, 14);
    G.ctx.stroke();
  }

  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#4ade80';
  G.ctx.beginPath();
  G.ctx.arc(-8, -79, 3.2, 0, Math.PI * 2);
  G.ctx.arc(8, -79, 3.2, 0, Math.PI * 2);
  G.ctx.fill();

  const armAng = e.state === 'windup' ? (e.facing > 0 ? -1.8 : Math.PI + 1.8)
    : e.state === 'strike' ? (e.facing > 0 ? 0.3 : Math.PI - 0.3)
    : (e.facing > 0 ? 0.85 : Math.PI - 0.85);
  G.ctx.save();
  G.ctx.translate(e.facing * 20, -58);
  G.ctx.rotate(armAng);
  G.ctx.strokeStyle = '#6ee7b7';
  G.ctx.lineWidth = 7.5;
  G.ctx.lineCap = 'round';
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(44, 0); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -118, 22, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -112, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.moveKind === 'rootSlam' && e.stateTimer < 0.26) {
      drawParryStarGlint(e.facing * 26, -54, 22, COLORS.goldBright);
    }
  }
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, e.y + 44);
}

export function drawWardenMountain(e) {
  // v45.1 Complete Silhouette Overhaul: Tall Slender Sword-Tomb Frost Sovereign (asymmetric horn + impaled shoulder swords + dragging odachi!)
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.moveKind === 'glacialThrust' && (e.state === 'windup' || e.state === 'strike');

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, e.phase === 2 ? '#153456' : '#0f2036', 'rgba(186, 230, 253, 0.68)', 18, 870);
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 11);

  if (e.phase === 2) {
    drawGlowSprite('cyan', 0, -44, 48, 0.48);
  }

  // 1. Two Broken Frozen Swords Impaled Diagonally Through Back/Shoulder
  G.ctx.save();
  G.ctx.translate(-e.facing * 8, -56);
  [[-0.72, 34], [-1.12, 26]].forEach(([ang, len]) => {
    G.ctx.save();
    G.ctx.rotate(e.facing * ang);
    G.ctx.strokeStyle = '#94a3b8';
    G.ctx.lineWidth = 2.8;
    G.ctx.beginPath(); G.ctx.moveTo(0, 10); G.ctx.lineTo(0, -len); G.ctx.stroke();
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath(); G.ctx.moveTo(-7, -len + 7); G.ctx.lineTo(7, -len + 7); G.ctx.stroke();
    G.ctx.restore();
  });
  G.ctx.restore();

  // 2. Tall Slender Noble Legs
  const wlk = e.walkCycle || 0;
  const mov = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = wlk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 12 : (mov ? Math.sin(ph) * 14 * e.facing : side * 8);
    const fyL = isStagger ? 0 : (mov ? -Math.max(0, Math.cos(ph)) * 7 : 0);
    const ik = solve2BoneIK(side * 3.5, -26, fx, fyL, 14, 14, e.facing);
    G.ctx.strokeStyle = side < 0 ? '#94a3b8' : '#e2e8f0';
    G.ctx.lineWidth = 3.2;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 3.5, -26); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // 3. Elongated High-Collar Glacial Sovereign Mantle
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f1929';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-9, -16);
  G.ctx.lineTo(-12, -46);
  G.ctx.lineTo(-20, -64);
  G.ctx.lineTo(-6, -58);
  G.ctx.lineTo(6, -58);
  G.ctx.lineTo(18, -62);
  G.ctx.lineTo(11, -46);
  G.ctx.lineTo(10, -14);
  G.ctx.lineTo(0, -8);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.moveTo(-9, -44); G.ctx.lineTo(8, -28); G.ctx.stroke();

  // 4. Slender Masked Head + Asymmetric Shattered Single-Horn Ice Antler
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1b2d44';
  G.ctx.strokeStyle = '#e0f2fe';
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.ellipse(0, -65, 8.5, 10.5, 0, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  G.ctx.fillStyle = '#bae6fd';
  G.ctx.beginPath();
  G.ctx.moveTo(-e.facing * 4, -73);
  G.ctx.quadraticCurveTo(-e.facing * 18, -88, -e.facing * 10, -98);
  G.ctx.quadraticCurveTo(-e.facing * 5, -84, -e.facing * 1, -74);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.beginPath();
  G.ctx.moveTo(e.facing * 4, -73);
  G.ctx.lineTo(e.facing * 10, -80);
  G.ctx.lineTo(e.facing * 7, -71);
  G.ctx.closePath();
  G.ctx.fill();

  drawGlowSprite(isRed ? 'crimson' : 'cyan', e.facing * 4, -65, 10, 0.72);
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#ffffff';
  G.ctx.fillRect(e.facing > 0 ? 1 : -7, -66.5, 6, 2.6);

  // 5. Extra-Long Dragging Glacial Odachi
  let sAng = e.facing > 0 ? 0.38 : Math.PI - 0.38;
  if (e.state === 'windup') {
    sAng = e.moveKind === 'frostIai'
      ? (e.facing > 0 ? 2.75 : Math.PI - 2.75)
      : (e.facing > 0 ? -2.05 : Math.PI + 2.05);
  } else if (e.state === 'strike') {
    sAng = e.facing > 0 ? 0.08 : Math.PI - 0.08;
  }
  G.ctx.save();
  G.ctx.translate(e.facing * 7, -38);
  G.ctx.rotate(sAng);
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.strokeStyle = '#ffffff';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(-12, -2.5); G.ctx.lineTo(66, -4.0); G.ctx.lineTo(74, -0.5); G.ctx.lineTo(62, 3.2); G.ctx.lineTo(-12, 2.5);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath(); G.ctx.moveTo(2, -7); G.ctx.lineTo(2, 7); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -104, 22, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -98, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 20, -40, e.moveKind === 'frostIai' ? 26 : 20, COLORS.goldBright);
    }
  }
  G.ctx.restore();
  if (isStagger) drawExecutionSigil(cx, e.y + 36);
}
