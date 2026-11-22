// Standard Enemies, Training Dummy & Three-Biome Wardens Renderer (split from src/renderer.js in v32.0)
import { COLORS, DUMMY_MODES } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilLine, boilCircle, drawCloakMesh, solve2BoneIK } from '../vfx.js';
import { t, isEn, locDummyMode } from '../i18n.js';
import { drawSlowBladeRing, drawParryStarGlint, drawExecutionSigil } from './renderShared.js';
import { drawCachedText, drawCachedBadge } from './glyphAtlas.js';

function drawEnemyOverheadBars(e) {
  if (e.isBoss || (e.isMiniBoss && e.awake) || !e.alive) return;
  // Hide untouched dormant enemy HP bars so patrolling guards & ceiling leech ambushes stay atmospheric
  const alerted = e.hp < e.maxHp || e.posture > 0 || (e.state !== 'patrol' && e.state !== 'cling' && e.state !== 'idle' && e.state !== 'hover');
  if (!alerted) return;
  const bw = 48;
  const bx = e.x + e.w / 2 - bw / 2;
  const by = e.y - 18;
  G.ctx.fillStyle = 'rgba(6, 9, 14, 0.85)';
  G.ctx.fillRect(bx, by, bw, 5);
  G.ctx.fillStyle = '#c8323e';
  G.ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 5);
  G.ctx.fillStyle = 'rgba(6, 9, 14, 0.85)';
  G.ctx.fillRect(bx, by + 6, bw, 3.5);
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.fillRect(bx, by + 6, bw * (e.posture / e.maxPosture), 3.5);
}

/* ---------- ENEMIES: SENTINEL, WRAITH, GOLEM, PRIEST, DUELIST, LEECH ---------- */
export function drawEnemy(e) {
  if (!e.alive) return;
  if (e.kind === 'dummy') {
    drawDummy(e);
    return;
  }
  if (e.kind === 'wraith') drawWraith(e);
  else if (e.kind === 'golem') drawGolem(e);
  else if (e.kind === 'priest') drawPriest(e);
  else if (e.kind === 'duelist') drawDuelist(e);
  else if (e.kind === 'leech') drawLeech(e);
  else if (e.kind === 'falcon') drawFalcon(e);
  else if (e.kind === 'fungus') drawFungus(e);
  else if (e.kind === 'frostguard') drawFrostguard(e);
  else if (e.kind === 'warden_wind') drawWardenWind(e);
  else if (e.kind === 'warden_forest') drawWardenForest(e);
  else if (e.kind === 'warden_mountain') drawWardenMountain(e);
  else drawSentinel(e);
  if (e.wardShield > 0) drawWardShieldOverlay(e);
}

function drawDummy(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redThrust' && (e.state === 'windup' || e.state === 'attack');
  const isShield = !!e.shieldUp && !isStagger;
  const modeObj = DUMMY_MODES[e.modeIdx] || DUMMY_MODES[0];

  G.ctx.save();
  // Riveted bronze sparring rail on Sanctuary stone floor
  G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath();
  G.ctx.moveTo(e.minX + 10, fy - 1);
  G.ctx.lineTo(e.maxX + e.w - 10, fy - 1);
  G.ctx.stroke();
  G.ctx.fillStyle = '#2a2218';
  G.ctx.fillRect(e.homeX + e.w * 0.5 - 12, fy - 4, 24, 4);

  const shakeX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : (e.bellShake > 0 ? Math.sin(G.globalTime * 48) * 3.5 * e.bellShake : 0);
  G.ctx.translate(cx + shakeX, fy);
  if (isStagger) G.ctx.translate(0, 9);

  // Subtle ambient resonance glow when active
  drawGlowSprite(isRed ? 'crimson' : (e.active ? 'gold' : 'cyan'), 0, -40, e.active ? 44 : 26, e.active ? 0.34 : 0.16);

  // Mechanical Bronze Tripod / Striding Rail Legs
  const stride = Math.abs(e.vx) > 12 ? Math.sin(e.walkCycle || 0) * 9 : 0;
  G.ctx.strokeStyle = '#9b8359';
  G.ctx.lineWidth = 4.2;
  G.ctx.lineCap = 'round';
  G.ctx.beginPath();
  G.ctx.moveTo(-5, -18); G.ctx.lineTo(-9 - stride, 0);
  G.ctx.moveTo(5, -18); G.ctx.lineTo(9 + stride, 0);
  G.ctx.stroke();
  // Wheel/foot joints
  G.ctx.fillStyle = COLORS.gold;
  G.ctx.beginPath();
  G.ctx.arc(-9 - stride, -2, 3, 0, Math.PI * 2);
  G.ctx.arc(9 + stride, -2, 3, 0, Math.PI * 2);
  G.ctx.fill();

  // Bronze Bell-Resonator Torso
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#261e16';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (e.active ? COLORS.goldBright : 'rgba(216, 207, 184, 0.72)');
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -17);
  G.ctx.lineTo(-10, -48);
  G.ctx.lineTo(10, -48);
  G.ctx.lineTo(14, -17);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing resonance rune line on chest bell
  G.ctx.strokeStyle = e.active ? (isRed ? COLORS.crimsonBright : COLORS.goldBright) : COLORS.cyan;
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -44); G.ctx.lineTo(-3, -34); G.ctx.lineTo(3, -25);
  G.ctx.stroke();

  // Cracked Bronze Automaton Bell-Head
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#33271a';
  G.ctx.strokeStyle = e.active ? COLORS.goldBright : COLORS.parchment;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -49);
  G.ctx.quadraticCurveTo(-11, -67, 0, -70);
  G.ctx.quadraticCurveTo(11, -67, 10, -49);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  // Automaton Visor Eye
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : (e.active ? COLORS.goldBright : COLORS.cyanBright);
  G.ctx.fillRect(e.facing > 0 ? 1 : -8, -59, 7, 2.8);

  // Hinged Bronze Practice Blade
  G.ctx.save();
  G.ctx.translate(e.facing * 8, -36);
  let bladeAng = e.facing > 0 ? -0.35 : Math.PI + 0.35;
  if (e.state === 'windup') {
    bladeAng = isRed
      ? (e.facing > 0 ? 0.0 : Math.PI)
      : (e.comboIdx === 1 ? (e.facing > 0 ? -2.4 : Math.PI + 2.4) : (e.facing > 0 ? -1.9 : Math.PI + 1.9));
  } else if (e.state === 'attack') {
    bladeAng = e.facing > 0 ? 0.22 : Math.PI - 0.22;
  } else if (isStagger) {
    bladeAng = Math.PI * 0.5;
  }
  G.ctx.rotate(bladeAng);
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (e.active ? COLORS.goldBright : '#cfc5ae');
  G.ctx.lineWidth = 3.0;
  G.ctx.beginPath(); G.ctx.moveTo(-6, 0); G.ctx.lineTo(44, 0); G.ctx.stroke();
  G.ctx.restore();

  // Raised Bronze Practice Buckler during shieldGuard
  if (isShield) {
    G.ctx.save();
    G.ctx.translate(e.facing * 18, -34);
    drawGlowSprite('gold', 0, 0, 26, 0.52);
    G.ctx.fillStyle = '#3b2b18';
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 2.4;
    G.ctx.beginPath();
    G.ctx.moveTo(-6, -24); G.ctx.lineTo(6, -24); G.ctx.lineTo(9, 18); G.ctx.lineTo(0, 26); G.ctx.lineTo(-9, 18);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    G.ctx.restore();
  }

  // Crisp Practice Telegraphs (Parry Star Glint, Slow-Blade Ring, Crimson 危)
  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -86, 22, 0.8);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -78, { size: isEn() ? 15 : 23, bold: true, color: COLORS.crimsonBright });
    } else {
      if (e.isDelayedHit) drawSlowBladeRing(e.facing * 20, -56, e.stateTimer, e.windupDuration, COLORS.goldBright);
      if (e.stateTimer < 0.25) drawParryStarGlint(e.facing * 20, -56, e.isDelayedHit ? 24 : 20, COLORS.goldBright);
    }
  }

  // Mode Nameplate above Automaton (only when active or nearby & not colliding with [E] prompt badge)
  const dDummy = G.player ? Math.hypot((G.player.x + G.player.w * 0.5) - cx, (G.player.y + G.player.h) - fy) : 999;
  if ((e.active && dDummy >= 94) || (!e.active && dDummy >= 94 && dDummy < 220)) {
    drawCachedText(G.ctx, e.active ? t('ren.dummyActive', locDummyMode(modeObj, 'label')) : t('ren.dummyIdle'), 0, -90, {
      size: 11, bold: false, color: e.active ? 'rgba(253, 224, 71, 0.84)' : 'rgba(186, 230, 253, 0.66)'
    });
  }
  G.ctx.restore();

  if (e.active || e.hp < e.maxHp || e.posture > 0) {
    drawEnemyOverheadBars(e);
  }
  // v28.0 Live Diegetic DPS & Posture-Per-Second Plaque above Training Dummy
  if (e.meter && (G.globalTime - e.meter.lastHitTime) < 6.0 && (e.meter.totalDmg > 0 || e.meter.totalPosture > 0)) {
    const fade = Math.min(1, (6.0 - (G.globalTime - e.meter.lastHitTime)) * 1.4);
    const pyPlaque = e.y - 54;
    const txt = t('ren.dummyMeter', Math.round(e.meter.dps), Math.round(e.meter.pps), Math.round(e.meter.maxHit));
    G.ctx.save();
    G.ctx.globalAlpha = Math.max(0, Math.min(0.95, fade));
    drawCachedBadge(G.ctx, txt, cx, pyPlaque, {
      size: 11, bold: true, bg: 'rgba(8, 12, 20, 0.86)', border: 'rgba(245, 158, 11, 0.65)',
      color: COLORS.goldBright, minW: 150, padX: 9, h: 20, boxTopOff: -13, textOffY: 1
    });
    G.ctx.restore();
  }
  if (isStagger) drawExecutionSigil(cx, e.y + 32);
}

function drawWardShieldOverlay(e) {
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const rx = e.w * 0.85;
  const ry = e.h * 0.66;
  const pulse = 0.85 + Math.sin(G.globalTime * 9) * 0.15;
  G.ctx.save();
  drawGlowSprite('gold', cx, cy, Math.max(rx, ry) * 1.15, 0.36 * pulse);
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
  G.ctx.fill();
  G.ctx.stroke();
  G.ctx.restore();
}

function drawPriest(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isChant = e.state === 'chant';
  G.ctx.save();

  // Golden Bell-Chant Tether Beam to Blessed Ally
  if (isChant && e.chantTargetId) {
    const ally = G.enemies.find(a => a && a.alive && a.id === e.chantTargetId);
    if (ally) {
      G.ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
      G.ctx.lineWidth = 2.2;
      boilLine(G.ctx, cx, e.y + 8, ally.x + ally.w * 0.5, ally.y + ally.h * 0.45, 9200, 3.2, 6);
    }
  }

  drawCloakMesh(e.cloak, '#1d1626', 'rgba(253, 224, 71, 0.48)', 15, 610);
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 9);

  // Floating Golden Bell Halo behind Mitre
  drawGlowSprite('gold', 0, -56, isChant ? 38 : 22, isChant ? 0.78 : 0.42);
  G.ctx.strokeStyle = isChant ? COLORS.goldBright : 'rgba(245, 158, 11, 0.58)';
  G.ctx.lineWidth = isChant ? 2.2 : 1.4;
  boilCircle(G.ctx, 0, -56, isChant ? 19 : 14, 9240, 1.0, 14);
  G.ctx.stroke();

  // Tall Ceremonial Robe
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1f182c';
  G.ctx.strokeStyle = isChant ? COLORS.goldBright : 'rgba(216, 207, 184, 0.78)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-15, 0); G.ctx.lineTo(-10, -48); G.ctx.lineTo(10, -48); G.ctx.lineTo(15, 0);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  // Gold Stole Trim
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath(); G.ctx.moveTo(0, -46); G.ctx.lineTo(0, -4); G.ctx.stroke();

  // Tall Split Bell-Mitre Hat
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#2a2238';
  G.ctx.beginPath();
  G.ctx.moveTo(-9, -48); G.ctx.lineTo(-7, -72); G.ctx.lineTo(0, -64); G.ctx.lineTo(7, -72); G.ctx.lineTo(9, -48);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -6, -54, 5, 2.5);

  // Bronze Chime Staff
  const shake = isChant ? Math.sin(G.globalTime * 28) * 0.18 : 0;
  G.ctx.save();
  G.ctx.translate(e.facing * 14, -36);
  G.ctx.rotate(shake);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, 32); G.ctx.lineTo(0, -28); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.gold;
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.moveTo(-4, -28); G.ctx.lineTo(4, -28); G.ctx.lineTo(8, -16); G.ctx.lineTo(-8, -16); G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'pulse' && e.stateTimer < 0.28) {
    drawParryStarGlint(0, -42, 20, COLORS.goldBright);
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 32);
}

function drawDuelist(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redDash' && (e.state === 'windup' || e.state === 'attack');
  G.ctx.save();

  drawCloakMesh(e.cloak, '#3b111c', 'rgba(248, 113, 113, 0.55)', 12, 740);
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 10);

  // 2-Bone IK Agile Stride Legs
  const dWalk = e.walkCycle || 0;
  const dMoving = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = dWalk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 12 : (dMoving ? Math.sin(ph) * 13 : side * 7);
    const fyL = isStagger ? 0 : (dMoving ? -Math.max(0, Math.cos(ph)) * 7 : 0);
    const ik = solve2BoneIK(side * 3.5, -20, fx, fyL, 11, 11, e.facing);
    G.ctx.strokeStyle = side < 0 ? 'rgba(150, 142, 130, 0.82)' : COLORS.parchment;
    G.ctx.lineWidth = 3.1;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 3.5, -20); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // Lean Ronin Haori Torso
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#141824';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.82)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -15); G.ctx.lineTo(-9, -43); G.ctx.lineTo(9, -43); G.ctx.lineTo(11, -15);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  // Bamboo-Iron Conical Kasa Hat
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1e2434';
  G.ctx.beginPath();
  G.ctx.moveTo(-21, -48); G.ctx.lineTo(0, -64); G.ctx.lineTo(21, -48); G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Fierce Glowing Slit Eyes under Hat
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -8, -48, 7, 2.5);

  // Twin Curved Dark Blades
  const drawDuelBlade = (ox, oy, ang) => {
    G.ctx.save();
    G.ctx.translate(ox, oy);
    G.ctx.rotate(ang);
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (e.comboIdx === 2 && e.state === 'windup' ? COLORS.goldBright : '#e2dccb');
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.quadraticCurveTo(22, -4, 42, 0); G.ctx.stroke();
    G.ctx.restore();
  };
  let a1 = e.facing > 0 ? -0.45 : Math.PI + 0.45;
  let a2 = e.facing > 0 ? 0.55 : Math.PI - 0.55;
  if (e.state === 'windup') {
    a1 = e.facing > 0 ? -2.2 : Math.PI + 2.2;
    a2 = e.facing > 0 ? 2.1 : Math.PI - 2.1;
  } else if (e.state === 'attack') {
    a1 = e.facing > 0 ? 0.25 : Math.PI - 0.25;
    a2 = e.facing > 0 ? -0.35 : Math.PI + 0.35;
  }
  drawDuelBlade(-e.facing * 6, -32, a2);
  drawDuelBlade(e.facing * 8, -32, a1);

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -76, 20, 0.78);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -70, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.23) {
      drawParryStarGlint(e.facing * 18, -34, e.comboIdx === 2 ? 22 : 16, COLORS.goldBright);
    }
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 28);
}

function drawLeech(e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const isStagger = e.state === 'stagger';
  const isCeiling = e.state === 'cling' || e.state === 'telegraph';
  const pulse = 1 + Math.sin(e.pulsePhase) * 0.08;
  G.ctx.save();
  G.ctx.translate(cx, cy);
  if (isCeiling) G.ctx.scale(pulse, 1 / pulse);
  else G.ctx.scale(1 / pulse, pulse);

  // Hanging ink tendrils
  G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  G.ctx.lineWidth = 1.6;
  for (let k = -1; k <= 1; k++) {
    const sw = Math.sin(G.globalTime * 7 + k * 1.4) * 4;
    G.ctx.beginPath();
    G.ctx.moveTo(k * 7, isCeiling ? 10 : -10);
    G.ctx.quadraticCurveTo(k * 9 + sw, isCeiling ? 19 : -19, k * 6 - sw, isCeiling ? 26 : -24);
    G.ctx.stroke();
  }

  // Glossy Abyssal Ink Sac Body
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f1626';
  G.ctx.strokeStyle = e.state === 'telegraph' || e.state === 'drop' ? COLORS.crimsonBright : COLORS.cyan;
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.ellipse(0, 0, 16, 15, 0, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  // Cluster of Eerie Ambush Eyes
  drawGlowSprite(e.state === 'telegraph' ? 'gold' : 'crimson', 0, isCeiling ? 4 : -2, 14, 0.65);
  G.ctx.fillStyle = e.state === 'telegraph' ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath();
  G.ctx.arc(-5, isCeiling ? 4 : -2, 2.4, 0, Math.PI * 2);
  G.ctx.arc(5, isCeiling ? 4 : -2, 2.4, 0, Math.PI * 2);
  G.ctx.arc(0, isCeiling ? 8 : -6, 1.8, 0, Math.PI * 2);
  G.ctx.fill();

  if (e.state === 'telegraph') {
    drawParryStarGlint(0, 16, 17, COLORS.goldBright);
  }
  G.ctx.restore();
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, cy);
}

function drawGolem(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redBash' && (e.state === 'windup' || e.state === 'attack');
  const shieldUp = !isStagger && e.shieldBrokenTimer <= 0 && (e.state === 'patrol' || e.state === 'chase' || e.state === 'recover');

  G.ctx.save();
  drawCloakMesh(e.cloak, '#141925', 'rgba(216, 207, 184, 0.35)', 18, 520);

  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 10);

  // Broad Iron Bell-Guard Armor
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1a2232';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.78)';
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-19, 0);
  G.ctx.lineTo(-17, -56);
  G.ctx.lineTo(17, -56);
  G.ctx.lineTo(19, 0);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Bell-Dome Greathelm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#262d3d';
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -56);
  G.ctx.quadraticCurveTo(-15, -78, 0, -82);
  G.ctx.quadraticCurveTo(15, -78, 14, -56);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Eye Slit
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 2 : -10, -67, 8, 3);

  // Heavy Bronze Censer Mace (back hand)
  G.ctx.save();
  G.ctx.translate(-e.facing * 8, -46);
  let maceAng = e.facing > 0 ? -0.8 : Math.PI + 0.8;
  if (e.state === 'windup' && e.attackKind === 'smash') maceAng = e.facing > 0 ? -2.35 : Math.PI + 2.35;
  else if (e.state === 'attack' && e.attackKind === 'smash') maceAng = e.facing > 0 ? 0.35 : Math.PI - 0.35;
  G.ctx.rotate(maceAng);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 3.2;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(52, 0); G.ctx.stroke();
  G.ctx.fillStyle = '#3b2c1a';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath(); G.ctx.arc(56, 0, 10, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  // Towering Front Bronze Bell-Shield!
  G.ctx.save();
  const shX = shieldUp ? e.facing * 20 : e.facing * 12;
  const shY = shieldUp ? -36 : -28;
  G.ctx.translate(shX, shY);
  if (!shieldUp) G.ctx.rotate(e.facing * 0.45);
  G.ctx.fillStyle = isRed ? '#7f1d1d' : '#2e2419';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : shieldUp ? COLORS.goldBright : 'rgba(216, 207, 184, 0.5)';
  G.ctx.lineWidth = 2.4;
  G.ctx.beginPath();
  G.ctx.moveTo(-7, -28);
  G.ctx.lineTo(7, -28);
  G.ctx.lineTo(10, 22);
  G.ctx.lineTo(0, 32);
  G.ctx.lineTo(-10, 22);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();
  // Shield emblem crack
  G.ctx.strokeStyle = shieldUp ? COLORS.gold : 'rgba(148, 163, 184, 0.4)';
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, -18); G.ctx.lineTo(0, 18); G.ctx.stroke();
  G.ctx.restore();

  // Telegraph
  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -96, 22, 0.75);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -88, { size: isEn() ? 15 : 24, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 16, -72, 20, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 36);
}

function drawWraith(e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const isStagger = e.state === 'stagger';
  G.ctx.save();

  drawGlowSprite(e.state === 'windup' ? 'gold' : 'cyan', cx, cy, 50, e.state === 'windup' ? 0.34 : 0.22);

  drawCloakMesh(e.cloak, '#121826', 'rgba(125, 211, 252, 0.42)', 13, 680);

  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#161e2e';
  G.ctx.strokeStyle = e.state === 'windup' ? COLORS.goldBright : 'rgba(216, 207, 184, 0.65)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(cx, e.y - 4);
  G.ctx.quadraticCurveTo(cx + 18, e.y + 10, cx + 15, e.y + 40);
  G.ctx.lineTo(cx + 6, e.y + 34);
  G.ctx.lineTo(cx, e.y + 46);
  G.ctx.lineTo(cx - 7, e.y + 34);
  G.ctx.lineTo(cx - 15, e.y + 40);
  G.ctx.quadraticCurveTo(cx - 18, e.y + 10, cx, e.y - 4);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  G.ctx.fillStyle = '#090c12';
  G.ctx.beginPath(); G.ctx.ellipse(cx + e.facing * 3, e.y + 15, 7, 9, 0, 0, Math.PI * 2); G.ctx.fill();
  drawGlowSprite(e.state === 'windup' ? 'gold' : 'crimson', cx + e.facing * 3.5, e.y + 14, 12, 0.72);
  G.ctx.fillStyle = e.state === 'windup' ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath();
  G.ctx.arc(cx + e.facing * 1, e.y + 14, 2.2, 0, Math.PI * 2);
  G.ctx.arc(cx + e.facing * 6, e.y + 14, 2.2, 0, Math.PI * 2);
  G.ctx.fill();

  const lx = cx + e.facing * 19;
  const ly = e.y + 22 + Math.sin(G.globalTime * 6 + e.bobPhase) * 3;
  G.ctx.fillStyle = e.state === 'windup' ? COLORS.goldBright : '#f43f5e';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.arc(lx, ly, e.state === 'windup' ? 7 : 5, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();

  if (e.state === 'windup' && e.stateTimer < 0.25) drawParryStarGlint(lx, ly, 18, COLORS.goldBright);
  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, cy);
  G.ctx.restore();
}

function drawSentinel(e) {
  const cx = e.x + e.w / 2;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'redLunge' && (e.state === 'windup' || e.state === 'attack');
  G.ctx.save();

  drawCloakMesh(e.cloak, '#141926', 'rgba(216, 207, 184, 0.35)', 15, 420);

  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 8);

  // 2-Bone IK Striding Legs beneath Tattered Sentinel Robe
  const sWalk = e.walkCycle || 0;
  const sMoving = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = sWalk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 10 : (sMoving ? Math.sin(ph) * 11 : side * 6);
    const fyL = isStagger ? 0 : (sMoving ? -Math.max(0, Math.cos(ph)) * 6 : 0);
    const ik = solve2BoneIK(side * 3.5, -18, fx, fyL, 10.5, 10.5, e.facing);
    G.ctx.strokeStyle = side < 0 ? 'rgba(148, 140, 122, 0.8)' : 'rgba(216, 207, 184, 0.9)';
    G.ctx.lineWidth = 3.2;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(side * 3.5, -18); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey);
    G.ctx.stroke();
  });

  // Tattered Priest Robe & Armor
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#182030';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : 'rgba(216, 207, 184, 0.72)';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -12);
  G.ctx.lineTo(-10, -44);
  G.ctx.lineTo(10, -44);
  G.ctx.lineTo(14, -12);
  G.ctx.lineTo(6, -16);
  G.ctx.lineTo(0, -10);
  G.ctx.lineTo(-6, -16);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Pointed Iron Cage Helm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#242d3f';
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -44);
  G.ctx.lineTo(0, -68);
  G.ctx.lineTo(10, -44);
  G.ctx.closePath();
  G.ctx.fill();
  G.ctx.stroke();

  // Glowing Eye Slit
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : COLORS.goldBright;
  G.ctx.fillRect(e.facing > 0 ? 1 : -7, -51, 6, 2.5);

  // Long Spear with Swaying Pennon
  const spearPull = e.state === 'windup' ? -18 : e.state === 'attack' ? 36 : 0;
  const sx = e.facing * (-28 + spearPull);
  const ex = e.facing * (54 + spearPull);
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 2.6;
  G.ctx.beginPath(); G.ctx.moveTo(sx, -28); G.ctx.lineTo(ex, -28); G.ctx.stroke();

  // Spearhead
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#e2dccb';
  G.ctx.beginPath();
  G.ctx.moveTo(ex, -33);
  G.ctx.lineTo(ex + e.facing * 18, -28);
  G.ctx.lineTo(ex, -23);
  G.ctx.closePath();
  G.ctx.fill();

  // Telegraph Signal
  if (e.state === 'windup') {
    if (isRed) {
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -76, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(ex + e.facing * 10, -28, 19, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 28);
}


function drawFalcon(e) {
  const cx = e.x + e.w * 0.5;
  const cy = e.y + e.h * 0.5;
  const isStagger = e.state === 'stagger';
  const flap = Math.sin(e.wingPhase || 0);
  const diveAng = e.state === 'dive' ? Math.atan2(e.vy, e.vx) : (e.facing > 0 ? 0.12 : Math.PI - 0.12);

  G.ctx.save();
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), cy);
  if (e.state === 'dive') {
    G.ctx.rotate(diveAng);
    if (e.vx < 0) G.ctx.scale(1, -1);
  } else {
    G.ctx.scale(e.facing, 1);
  }

  // Sweeping Ink Feather Wings
  const wingLift = isStagger ? 10 : flap * 22;
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f1d2e';
  G.ctx.strokeStyle = e.state === 'dive' ? '#7dd3fc' : 'rgba(216, 207, 184, 0.85)';
  G.ctx.lineWidth = 1.9;
  // Back wing
  G.ctx.beginPath();
  G.ctx.moveTo(-4, -2);
  G.ctx.quadraticCurveTo(-16, -24 - wingLift * 0.7, -34, -8 - wingLift);
  G.ctx.quadraticCurveTo(-18, -2, -6, 4);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Streamlined Falcon Body
  G.ctx.beginPath();
  G.ctx.ellipse(0, 0, 17, 9, -0.1, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  // Tail Feathers
  G.ctx.beginPath();
  G.ctx.moveTo(-15, 0); G.ctx.lineTo(-30, -6); G.ctx.lineTo(-26, 2); G.ctx.lineTo(-31, 8); G.ctx.lineTo(-14, 5);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Front Sweeping Wing
  G.ctx.beginPath();
  G.ctx.moveTo(2, -1);
  G.ctx.quadraticCurveTo(-4, -26 - wingLift, -26, -14 - wingLift * 1.15);
  G.ctx.quadraticCurveTo(-10, -4, 4, 5);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Sharp Beak & Piercing Eye
  G.ctx.fillStyle = COLORS.parchment;
  G.ctx.beginPath();
  G.ctx.moveTo(15, -3); G.ctx.lineTo(25, 1); G.ctx.lineTo(15, 4); G.ctx.closePath();
  G.ctx.fill();
  G.ctx.fillStyle = e.state === 'windup' || e.state === 'dive' ? COLORS.goldBright : '#7dd3fc';
  G.ctx.beginPath(); G.ctx.arc(11, -2, 2.3, 0, Math.PI * 2); G.ctx.fill();

  // Hanging Bronze Bell under Talons
  const bellSw = Math.sin(G.globalTime * 11 + e.x * 0.05) * 3;
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.moveTo(4, 7); G.ctx.lineTo(4 + bellSw, 16); G.ctx.stroke();
  G.ctx.fillStyle = '#c89b3c';
  G.ctx.beginPath();
  G.ctx.moveTo(bellSw, 15); G.ctx.lineTo(8 + bellSw, 15); G.ctx.lineTo(10 + bellSw, 22); G.ctx.lineTo(-2 + bellSw, 22);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  if (e.state === 'windup' && e.stateTimer < 0.28) {
    drawParryStarGlint(16, 0, 18, COLORS.goldBright);
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, cy);
}

function drawFungus(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isSpore = e.attackKind === 'sporeBurst' && (e.state === 'windup' || e.state === 'attack');
  const bob = Math.sin((e.walkCycle || 0) * 2) * 2.5;
  const pulse = 1 + Math.sin(G.globalTime * 5 + e.x * 0.03) * 0.06;

  G.ctx.save();
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 9);

  // Stubby Rooted Legs
  const wlk = Math.sin(e.walkCycle || 0) * 6;
  G.ctx.strokeStyle = '#94a38f';
  G.ctx.lineWidth = 4.2;
  G.ctx.lineCap = 'round';
  G.ctx.beginPath(); G.ctx.moveTo(-7, -18); G.ctx.lineTo(-9 + wlk, 0); G.ctx.stroke();
  G.ctx.beginPath(); G.ctx.moveTo(7, -18); G.ctx.lineTo(9 - wlk, 0); G.ctx.stroke();

  // Hunched Stalk Body
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#13201b';
  G.ctx.strokeStyle = isSpore ? '#4ade80' : 'rgba(187, 247, 208, 0.72)';
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(-13, -14); G.ctx.quadraticCurveTo(-15, -36, -8, -44 + bob);
  G.ctx.lineTo(8, -44 + bob); G.ctx.quadraticCurveTo(15, -36, 13, -14);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Glowing Bioluminescent Mushroom Cap
  G.ctx.save();
  G.ctx.translate(0, -42 + bob);
  G.ctx.scale(pulse, 1 / pulse);
  drawGlowSprite('cyan', 0, -4, isSpore ? 34 : 22, isSpore ? 0.65 : 0.35);
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#112c22';
  G.ctx.strokeStyle = '#6ee7b7';
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-26, 2);
  G.ctx.quadraticCurveTo(-22, -22, 0, -24);
  G.ctx.quadraticCurveTo(22, -22, 26, 2);
  G.ctx.quadraticCurveTo(0, 8, -26, 2);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Luminous Spore Spots on Cap
  G.ctx.fillStyle = '#6ee7b7';
  [[-12, -9, 3], [0, -15, 3.6], [11, -8, 2.8], [-4, -4, 2.2]].forEach(([sx, sy, sr]) => {
    G.ctx.beginPath(); G.ctx.arc(sx, sy, sr, 0, Math.PI * 2); G.ctx.fill();
  });
  G.ctx.restore();

  // Eerie Slit Eyes beneath Gills
  G.ctx.fillStyle = '#4ade80';
  G.ctx.fillRect(e.facing > 0 ? 1 : -9, -35 + bob, 4, 2.8);
  G.ctx.fillRect(e.facing > 0 ? 7 : -3, -35 + bob, 3, 2.4);

  // Heavy Fungal Tendril Arm
  const armAng = e.state === 'windup' ? (e.facing > 0 ? -1.4 : Math.PI + 1.4)
    : e.state === 'attack' ? (e.facing > 0 ? 0.35 : Math.PI - 0.35)
    : (e.facing > 0 ? 0.85 : Math.PI - 0.85);
  G.ctx.save();
  G.ctx.translate(e.facing * 8, -28 + bob);
  G.ctx.rotate(armAng);
  G.ctx.strokeStyle = isSpore ? '#4ade80' : '#a7f3d0';
  G.ctx.lineWidth = 4.4;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.quadraticCurveTo(15, -5, 28, 2); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'windup' && e.attackKind === 'slam' && e.stateTimer < 0.25) {
    drawParryStarGlint(e.facing * 18, -32, 18, COLORS.goldBright);
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 28);
}

function drawFrostguard(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'frostLunge' && (e.state === 'windup' || e.state === 'attack');

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, '#14273e', 'rgba(125, 211, 252, 0.55)', 13, 810);
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 10);

  // 2-Bone IK Armored Legs
  const fWalk = e.walkCycle || 0;
  const fMoving = Math.abs(e.vx) > 12;
  [-1, 1].forEach(side => {
    const ph = fWalk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 12 : (fMoving ? Math.sin(ph) * 12 : side * 7);
    const fyL = isStagger ? 0 : (fMoving ? -Math.max(0, Math.cos(ph)) * 6 : 0);
    const ik = solve2BoneIK(side * 4, -22, fx, fyL, 12, 12, e.facing);
    G.ctx.strokeStyle = side < 0 ? '#64748b' : '#cbd5e1';
    G.ctx.lineWidth = 3.6;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 4, -22); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // Frost-Encrusted Plate Torso
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#131d2c';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#7dd3fc';
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-13, -18); G.ctx.lineTo(-15, -48); G.ctx.lineTo(0, -53); G.ctx.lineTo(15, -48); G.ctx.lineTo(13, -18);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Horned Frost Visor Helm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1e2c40';
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -49); G.ctx.lineTo(-14, -67); G.ctx.lineTo(-4, -59); G.ctx.lineTo(0, -69);
  G.ctx.lineTo(4, -59); G.ctx.lineTo(14, -67); G.ctx.lineTo(10, -49);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Glacial Eye Glow
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.fillRect(e.facing > 0 ? 1 : -8, -55, 7, 2.8);

  // Crystalline Ice Halberd
  let hAng = e.facing > 0 ? -0.35 : Math.PI + 0.35;
  if (e.state === 'windup') hAng = e.facing > 0 ? -1.85 : Math.PI + 1.85;
  else if (e.state === 'attack') hAng = e.facing > 0 ? 0.12 : Math.PI - 0.12;
  G.ctx.save();
  G.ctx.translate(e.facing * 8, -36);
  G.ctx.rotate(hAng);
  G.ctx.strokeStyle = '#94a3b8';
  G.ctx.lineWidth = 3.0;
  G.ctx.beginPath(); G.ctx.moveTo(-20, 0); G.ctx.lineTo(54, 0); G.ctx.stroke();
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.strokeStyle = '#e0f2fe';
  G.ctx.lineWidth = 1.6;
  G.ctx.beginPath();
  G.ctx.moveTo(40, -2); G.ctx.lineTo(66, 0); G.ctx.lineTo(44, 5); G.ctx.lineTo(36, 15); G.ctx.lineTo(31, 4);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -82, 20, 0.78);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -76, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 20, -38, 19, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 30);
}

function drawWardenWind(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.moveKind === 'windDashCut' && (e.state === 'windup' || e.state === 'strike');

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, e.phase === 2 ? '#123a52' : '#10293d', 'rgba(125, 211, 252, 0.65)', 16, 840);
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 11);

  if (e.phase === 2) {
    G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath();
    G.ctx.ellipse(0, -36, 30 + Math.sin(G.globalTime * 9) * 4, 10, -0.18, 0, Math.PI * 2);
    G.ctx.stroke();
  }

  // Agile Tall Legs
  const wlk = e.walkCycle || 0;
  const mov = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = wlk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 13 : (mov ? Math.sin(ph) * 14 : side * 8);
    const fyL = isStagger ? 0 : (mov ? -Math.max(0, Math.cos(ph)) * 8 : 0);
    const ik = solve2BoneIK(side * 4, -24, fx, fyL, 13, 13, e.facing);
    G.ctx.strokeStyle = side < 0 ? '#7dd3fc' : COLORS.parchment;
    G.ctx.lineWidth = 3.4;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 4, -24); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // Tall Wind-Sentinel Coat & Bronze Shoulder Pauldrons
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f1c2b';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#7dd3fc';
  G.ctx.lineWidth = 2.1;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -20); G.ctx.lineTo(-16, -54); G.ctx.lineTo(0, -59); G.ctx.lineTo(16, -54); G.ctx.lineTo(14, -20);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Wide Winged Bamboo-Iron Conical Hat + Wind Scarf Crest
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#17293c';
  G.ctx.beginPath();
  G.ctx.moveTo(-27, -57); G.ctx.lineTo(0, -76); G.ctx.lineTo(27, -57); G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#38bdf8';
  G.ctx.fillRect(e.facing > 0 ? 1 : -9, -56, 8, 2.8);

  // Twin Gale Curved Sabers
  const drawSaber = (ox, oy, ang) => {
    G.ctx.save();
    G.ctx.translate(ox, oy);
    G.ctx.rotate(ang);
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#e0f2fe';
    G.ctx.lineWidth = 3.0;
    G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.quadraticCurveTo(26, -7, 50, -1); G.ctx.stroke();
    G.ctx.restore();
  };
  let a1 = e.facing > 0 ? -0.45 : Math.PI + 0.45;
  let a2 = e.facing > 0 ? 0.55 : Math.PI - 0.55;
  if (e.state === 'windup') {
    a1 = e.facing > 0 ? -2.25 : Math.PI + 2.25;
    a2 = e.facing > 0 ? 2.15 : Math.PI - 2.15;
  } else if (e.state === 'strike') {
    a1 = e.facing > 0 ? 0.18 : Math.PI - 0.18;
    a2 = e.facing > 0 ? -0.32 : Math.PI + 0.32;
  }
  drawSaber(-e.facing * 8, -38, a2);
  drawSaber(e.facing * 10, -38, a1);

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -88, 22, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -82, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.24) {
      drawParryStarGlint(e.facing * 20, -40, 22, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 34);
}

function drawWardenForest(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.moveKind === 'vineWave' && (e.state === 'windup' || e.state === 'strike');
  const armored = e.barkArmor && (e.shieldBrokenTimer || 0) <= 0 && !isStagger;
  const pulse = Math.sin(e.pulsePhase || 0) * 3;

  G.ctx.save();
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 7 : 0), fy);
  if (isStagger) G.ctx.translate(0, 12);

  // Towering Gnarled Root-Treant Trunk
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

  // Antler-like Blighted Canopy Branches
  G.ctx.strokeStyle = '#365341';
  G.ctx.lineWidth = 4.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -84); G.ctx.lineTo(-34, -108); G.ctx.moveTo(-24, -96); G.ctx.lineTo(-18, -112);
  G.ctx.moveTo(14, -84); G.ctx.lineTo(36, -106); G.ctx.moveTo(24, -95); G.ctx.lineTo(18, -114);
  G.ctx.stroke();

  // Cracked Ancient Bronze Bell Embedded in Chest
  drawGlowSprite(e.phase === 2 ? 'gold' : 'cyan', 0, -54, 34, 0.55);
  G.ctx.fillStyle = '#5c4620';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -68); G.ctx.lineTo(14, -68); G.ctx.lineTo(19, -40); G.ctx.lineTo(-19, -40);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Bark Armor Carapace Shield Overlay when unbroken
  if (armored) {
    G.ctx.strokeStyle = 'rgba(110, 231, 183, 0.72)';
    G.ctx.lineWidth = 3.0;
    boilCircle(G.ctx, 0, -52, 38, 7200, 2.0, 14);
    G.ctx.stroke();
  }

  // Glowing Emerald Eyes
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#4ade80';
  G.ctx.beginPath();
  G.ctx.arc(-8, -79, 3.2, 0, Math.PI * 2);
  G.ctx.arc(8, -79, 3.2, 0, Math.PI * 2);
  G.ctx.fill();

  // Massive Root-Mace Arm
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

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 44);
}

function drawWardenMountain(e) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.moveKind === 'glacialThrust' && (e.state === 'windup' || e.state === 'strike');

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, e.phase === 2 ? '#1a3656' : '#13243b', 'rgba(186, 230, 253, 0.68)', 16, 870);
  G.ctx.translate(cx + (e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0), fy);
  if (isStagger) G.ctx.translate(0, 11);

  if (e.phase === 2) {
    drawGlowSprite('cyan', 0, -40, 44, 0.45);
  }

  // Tall Noble Frost Marquis Legs
  const wlk = e.walkCycle || 0;
  const mov = Math.abs(e.vx) > 15;
  [-1, 1].forEach(side => {
    const ph = wlk + (side > 0 ? 0 : Math.PI);
    const fx = isStagger ? side * 12 : (mov ? Math.sin(ph) * 13 : side * 8);
    const fyL = isStagger ? 0 : (mov ? -Math.max(0, Math.cos(ph)) * 7 : 0);
    const ik = solve2BoneIK(side * 4, -24, fx, fyL, 13, 13, e.facing);
    G.ctx.strokeStyle = side < 0 ? '#94a3b8' : '#e2e8f0';
    G.ctx.lineWidth = 3.5;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath(); G.ctx.moveTo(side * 4, -24); G.ctx.lineTo(ik.kx, ik.ky); G.ctx.lineTo(ik.ex, ik.ey); G.ctx.stroke();
  });

  // Frost Marquis Haori & Glacial Pauldrons
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#111b2c';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.lineWidth = 2.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-14, -20); G.ctx.lineTo(-17, -56); G.ctx.lineTo(0, -61); G.ctx.lineTo(17, -56); G.ctx.lineTo(14, -20);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Jagged Ice Crown Helm
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1e3048';
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -56); G.ctx.lineTo(-15, -75); G.ctx.lineTo(-5, -66); G.ctx.lineTo(0, -80);
  G.ctx.lineTo(5, -66); G.ctx.lineTo(15, -75); G.ctx.lineTo(11, -56);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

  // Piercing Frost Eyes
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#e0f2fe';
  G.ctx.fillRect(e.facing > 0 ? 2 : -9, -62, 7, 2.8);

  // Broken-Tipped Glacial Greatsword
  let sAng = e.facing > 0 ? -0.32 : Math.PI + 0.32;
  if (e.state === 'windup') {
    sAng = e.moveKind === 'frostIai'
      ? (e.facing > 0 ? 2.65 : Math.PI - 2.65)
      : (e.facing > 0 ? -2.05 : Math.PI + 2.05);
  } else if (e.state === 'strike') {
    sAng = e.facing > 0 ? 0.14 : Math.PI - 0.14;
  }
  G.ctx.save();
  G.ctx.translate(e.facing * 8, -40);
  G.ctx.rotate(sAng);
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#bae6fd';
  G.ctx.strokeStyle = '#ffffff';
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(0, -3.5); G.ctx.lineTo(56, -4.5); G.ctx.lineTo(64, -1); G.ctx.lineTo(52, 4.5); G.ctx.lineTo(0, 3.5);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -94, 22, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -88, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 20, -42, e.moveKind === 'frostIai' ? 26 : 20, COLORS.goldBright);
    }
  }
  G.ctx.restore();

  drawEnemyOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 36);
}

