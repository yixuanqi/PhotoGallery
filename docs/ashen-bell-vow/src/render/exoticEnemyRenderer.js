// Three Non-Humanoid Biome-Exclusive Enemies Renderer (v45.2):
// weaver (墨丝织蛛: 6-Legged Bell-Abdomen Spider)
// crawler (熔铜炉奴: Quadrupedal Molten Bronze Furnace-Beast)
// cantor (金钟执灯侍: Tall Legless Levitating Sacred Bell-Cantor with 3 Orbiting Fly-Bells)
import { COLORS } from '../config.js';
import { G } from '../state.js';
import { drawGlowSprite, boilCircle, drawCloakMesh } from '../vfx.js';
import { t, isEn } from '../i18n.js';
import { drawParryStarGlint, drawExecutionSigil } from './renderShared.js';
import { drawCachedText } from './glyphAtlas.js';

export function drawWeaver(e, drawOverheadBars) {
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isRed = e.attackKind === 'silkDrop' && (e.state === 'windup' || e.state === 'attack');
  const isWeb = e.attackKind === 'webShot' && (e.state === 'windup' || e.state === 'attack');
  const now = G.globalTime || 0;
  const legPh = e.walkCycle || 0;
  const moving = Math.abs(e.vx) > 12;

  G.ctx.save();
  // Vertical silk thread rising to canopy whenever airborne / silkDrop hanging!
  if (!e._isPortrait && (!e.grounded || isRed)) {
    G.ctx.strokeStyle = isRed ? 'rgba(248, 113, 113, 0.72)' : 'rgba(187, 247, 208, 0.55)';
    G.ctx.lineWidth = 1.4;
    G.ctx.beginPath();
    G.ctx.moveTo(cx, e.y + 4);
    G.ctx.lineTo(cx, Math.max(e.y - 240, (e.silkTopY !== undefined ? e.silkTopY : e.y - 180)));
    G.ctx.stroke();
  }

  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);
  if (isStagger) G.ctx.translate(0, 7);

  // 1. Six Articulated Chitinous Spider Legs (3 per side, completely non-humanoid arachnid silhouette!)
  const drawLegs = (backLayer) => {
    const offsets = backLayer ? [-12, -3, 7] : [-9, 1, 11];
    const dir = backLayer ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      const ox = offsets[i] * e.facing;
      const ph = legPh * 1.6 + i * 2.1 + (backLayer ? Math.PI : 0);
      const lift = isStagger ? 0 : (moving ? Math.max(0, Math.sin(ph)) * 8 : Math.sin(now * 3.5 + i) * 1.5);
      const reachX = ox + (i - 1) * 12 * e.facing + (moving ? Math.cos(ph) * 6 : 0);
      const kneeX = (ox + reachX) * 0.5 + dir * 4;
      const kneeY = -26 - (i === 1 ? 8 : 4) - lift * 0.7;
      G.ctx.strokeStyle = backLayer ? '#1f362d' : (isRed ? '#fca5a5' : '#86efac');
      G.ctx.lineWidth = backLayer ? 2.4 : 2.8;
      G.ctx.lineCap = 'round';
      G.ctx.lineJoin = 'round';
      G.ctx.beginPath();
      G.ctx.moveTo(ox * 0.6, -15);
      G.ctx.lineTo(kneeX, kneeY);
      G.ctx.lineTo(reachX + dir * 5, -lift);
      G.ctx.stroke();
    }
  };
  drawLegs(true);

  // 2. Inverted Glowing Cracked-Bell Silk Abdomen (rear bulb!)
  G.ctx.save();
  G.ctx.translate(-e.facing * 12, -22 + Math.sin(now * 5.2) * 1.4);
  G.ctx.rotate(-e.facing * 0.32);
  drawGlowSprite(isRed ? 'crimson' : 'cyan', 0, -2, isWeb ? 30 : 22, isWeb ? 0.72 : 0.44);
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#10221c';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : (isWeb ? COLORS.goldBright : '#6ee7b7');
  G.ctx.lineWidth = 2.0;
  G.ctx.beginPath();
  G.ctx.moveTo(-10, -14);
  G.ctx.quadraticCurveTo(0, -20, 10, -14);
  G.ctx.lineTo(14, 7);
  G.ctx.quadraticCurveTo(0, 14, -14, 7);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Bronze bell crack rune on abdomen
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.4;
  G.ctx.beginPath(); G.ctx.moveTo(-6, -6); G.ctx.lineTo(0, 0); G.ctx.lineTo(4, 7); G.ctx.stroke();
  G.ctx.restore();

  // 3. Low Cephalothorax & 4-Eye Arachnid Cluster + Twin Curved Ink Mandibles
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#0f181f';
  G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : '#a7f3d0';
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.ellipse(e.facing * 7, -15, 11, 8, 0, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();

  // Four glowing emerald/crimson spider eyes
  G.ctx.fillStyle = isRed ? COLORS.crimsonBright : '#4ade80';
  [[10, -18, 2.3], [14, -16, 1.8], [8, -14, 1.7], [13, -13, 1.6]].forEach(([ex, ey, er]) => {
    G.ctx.beginPath(); G.ctx.arc(e.facing * ex, ey, er, 0, Math.PI * 2); G.ctx.fill();
  });

  // Articulated Twin Mandibles / Fangs
  const fangOpen = e.state === 'windup' ? 0.55 : e.state === 'attack' ? -0.35 : 0.10;
  [-1, 1].forEach(s => {
    G.ctx.save();
    G.ctx.translate(e.facing * 15, -13 + s * 3.5);
    G.ctx.rotate(e.facing * s * (0.28 + fangOpen));
    G.ctx.strokeStyle = isRed ? COLORS.crimsonBright : COLORS.parchment;
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath();
    G.ctx.moveTo(0, 0);
    G.ctx.quadraticCurveTo(e.facing * 11, s * 4, e.facing * 16, -s * 2);
    G.ctx.stroke();
    G.ctx.restore();
  });

  drawLegs(false);

  if (e.state === 'windup') {
    if (isRed) {
      drawGlowSprite('crimson', 0, -48, 20, 0.82);
      drawCachedText(G.ctx, t('ren.dangerGlyph'), 0, -42, { size: isEn() ? 14 : 22, bold: true, color: COLORS.crimsonBright });
    } else if (e.stateTimer < 0.25) {
      drawParryStarGlint(e.facing * 20, -16, 18, isWeb ? '#6ee7b7' : COLORS.goldBright);
    }
  }
  G.ctx.restore();
  drawOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 18);
}

export function drawCrawler(e, drawOverheadBars) {
  // Quadrupedal Molten-Bronze Furnace Beast (curls into blazing wheel during emberRoll, flips upside-down when parried!)
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isFlipped = (e.flippedTimer || 0) > 0 && isStagger;
  const isRolling = e.attackKind === 'emberRoll' && e.state === 'attack';
  const isSpit = e.attackKind === 'moltenSpit' && (e.state === 'windup' || e.state === 'attack');
  const now = G.globalTime || 0;

  G.ctx.save();
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy);

  if (isRolling) {
    // Blazing Spinning Bronze Furnace-Wheel Silhouette!
    G.ctx.translate(0, -21);
    drawGlowSprite('gold', 0, 0, 44, 0.72);
    G.ctx.rotate(now * 18 * e.facing);
    G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#2c1910';
    G.ctx.strokeStyle = COLORS.goldBright;
    G.ctx.lineWidth = 2.6;
    G.ctx.beginPath(); G.ctx.arc(0, 0, 20, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
    // Molten iron spokes & outer flame studs
    G.ctx.strokeStyle = '#fb923c';
    G.ctx.lineWidth = 2.2;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); G.ctx.stroke();
    }
    G.ctx.fillStyle = '#fef08a';
    G.ctx.beginPath(); G.ctx.arc(0, 0, 7, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
    drawOverheadBars(e);
    return;
  }

  if (isFlipped) {
    // Flipped helplessly onto its molten bell-shell after a Perfect Parry!
    G.ctx.translate(0, -18);
    G.ctx.scale(1, -1);
    G.ctx.translate(0, 18);
  } else if (isStagger) {
    G.ctx.translate(0, 6);
  }

  // 1. Four Squat Iron-Clawed Quadruped Legs
  const wlk = e.walkCycle || 0;
  const mov = Math.abs(e.vx) > 10;
  [-17, -7, 7, 17].forEach((lx, idx) => {
    const ph = wlk * 1.4 + idx * 1.5;
    const stepX = isFlipped ? Math.sin(now * 16 + idx) * 6 : (mov ? Math.sin(ph) * 8 : 0);
    const stepY = isFlipped ? Math.cos(now * 16 + idx) * 4 : (mov ? -Math.max(0, Math.cos(ph)) * 5 : 0);
    G.ctx.strokeStyle = idx % 2 === 0 ? '#574336' : '#cbd5e1';
    G.ctx.lineWidth = 4.2;
    G.ctx.lineCap = 'round';
    G.ctx.beginPath();
    G.ctx.moveTo(lx, -14);
    G.ctx.lineTo(lx + stepX * 0.6, -7 + stepY);
    G.ctx.lineTo(lx + stepX + (lx >= 0 ? 3 : -3), stepY);
    G.ctx.stroke();
  });

  // 2. Half-Melted Glowing Bronze Bell-Furnace Shell Fused to Back!
  drawGlowSprite('gold', -e.facing * 2, -26, isSpit ? 40 : 30, isSpit ? 0.72 : 0.44);
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#2a1810';
  G.ctx.strokeStyle = '#f59e0b';
  G.ctx.lineWidth = 2.2;
  G.ctx.beginPath();
  G.ctx.moveTo(-21, -12);
  G.ctx.quadraticCurveTo(-22, -39, -2, -41);
  G.ctx.quadraticCurveTo(18, -39, 19, -12);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Glowing Slitted Furnace Grate Window in Bell-Shell
  G.ctx.fillStyle = '#fb923c';
  G.ctx.fillRect(-10, -29, 18, 10);
  G.ctx.fillStyle = '#fef08a';
  G.ctx.fillRect(-7, -27, 12, 6);
  G.ctx.strokeStyle = '#24140d';
  G.ctx.lineWidth = 2.0;
  for (let gx = -6; gx <= 4; gx += 5) {
    G.ctx.beginPath(); G.ctx.moveTo(gx, -30); G.ctx.lineTo(gx, -18); G.ctx.stroke();
  }
  // Chimney smoke-vent atop shell
  G.ctx.fillStyle = '#3b2216';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.6;
  G.ctx.fillRect(-6, -45, 10, 6); G.ctx.strokeRect(-6, -45, 10, 6);

  // 3. Low Horned Smelter Snout (rears up during moltenSpit!)
  G.ctx.save();
  G.ctx.translate(e.facing * 18, -17);
  if (isSpit) G.ctx.rotate(-e.facing * 0.55);
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#1b1412';
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.moveTo(-e.facing * 4, -8);
  G.ctx.lineTo(e.facing * 11, -5);
  G.ctx.lineTo(e.facing * 13, 4);
  G.ctx.lineTo(-e.facing * 4, 6);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  // Glowing ember eye
  G.ctx.fillStyle = '#fef08a';
  G.ctx.beginPath(); G.ctx.arc(e.facing * 5, -2, 2.5, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();

  if (e.state === 'windup' && e.stateTimer < 0.28) {
    drawParryStarGlint(e.facing * 20, -24, 20, COLORS.goldBright);
  }
  G.ctx.restore();
  drawOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 20);
}

export function drawCantor(e, drawOverheadBars) {
  // Tall Legless Levitating Faceless Sacred Bell-Cantor with 3 Orbiting Fly-Bells & Golden Lantern!
  const cx = e.x + e.w * 0.5;
  const fy = e.y + e.h;
  const isStagger = e.state === 'stagger';
  const isSlash = e.attackKind === 'blinkSlash' && (e.state === 'windup' || e.state === 'attack');
  const isVolley = e.attackKind === 'triChimeVolley' && (e.state === 'windup' || e.state === 'attack');
  const now = G.globalTime || 0;
  const floatY = isStagger ? 8 : (-6 + Math.sin(now * 3.4 + (e.bobPhase || 0)) * 4.5);

  G.ctx.save();
  if (e.cloak) drawCloakMesh(e.cloak, '#1d1c24', 'rgba(253, 224, 71, 0.58)', 14, 920);
  const joltX = e.hurtFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  G.ctx.translate(cx + joltX, fy + floatY);

  // 1. Sacred Concentric Bell-Halo Behind Crown
  drawGlowSprite('gold', 0, -56, isVolley ? 44 : 28, isVolley ? 0.75 : 0.42);
  G.ctx.strokeStyle = isSlash ? '#fef08a' : 'rgba(253, 224, 71, 0.72)';
  G.ctx.lineWidth = isVolley ? 2.2 : 1.5;
  boilCircle(G.ctx, 0, -56, 17, 9450, 1.0, 16);
  G.ctx.stroke();

  // 2. Tall Flowing Legless White-Ink Ceremonial Vestments (tapered floating tattered hem!)
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#23222b';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.9;
  const hemSway = Math.sin(now * 4.5) * 4;
  G.ctx.beginPath();
  G.ctx.moveTo(-11, -50);
  G.ctx.lineTo(11, -50);
  G.ctx.quadraticCurveTo(16, -24, 13 + hemSway * 0.4, -2);
  G.ctx.lineTo(5 + hemSway * 0.6, -11);
  G.ctx.lineTo(hemSway * 0.8, 3);
  G.ctx.lineTo(-6 + hemSway * 0.5, -10);
  G.ctx.lineTo(-13 + hemSway * 0.3, -2);
  G.ctx.quadraticCurveTo(-16, -24, -11, -50);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();

  // Ivory-gold ceremonial stole & bell filigree down center
  G.ctx.fillStyle = '#e5ddc7';
  G.ctx.beginPath();
  G.ctx.moveTo(-4, -50); G.ctx.lineTo(4, -50); G.ctx.lineTo(2.5, -10); G.ctx.lineTo(0, -4); G.ctx.lineTo(-2.5, -10);
  G.ctx.closePath(); G.ctx.fill();

  // 3. Faceless Porcelain Bell-Hood Head (smooth blank ivory mask with single vertical golden slit!)
  G.ctx.fillStyle = e.hurtFlash > 0 ? '#ffffff' : '#ebe4d1';
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 1.8;
  G.ctx.beginPath();
  G.ctx.ellipse(0, -58, 8.5, 11.5, 0, 0, Math.PI * 2);
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = isSlash ? COLORS.crimsonBright : '#b45309';
  G.ctx.fillRect(e.facing * 2 - 1.2, -64, 2.4, 12);

  // 4. Held Golden Chime-Lantern (or Radiant Bell-Blade during blinkSlash!)
  const lx = e.facing * 18;
  const ly = -34 + Math.sin(now * 5.8) * 2.5;
  if (isSlash) {
    G.ctx.save();
    G.ctx.translate(e.facing * 10, -36);
    G.ctx.rotate(e.state === 'windup' ? (e.facing > 0 ? -2.0 : Math.PI + 2.0) : (e.facing > 0 ? 0.14 : Math.PI - 0.14));
    G.ctx.strokeStyle = '#fef08a';
    G.ctx.lineWidth = 3.4;
    G.ctx.beginPath(); G.ctx.moveTo(-4, 0); G.ctx.lineTo(48, 0); G.ctx.stroke();
    G.ctx.restore();
  } else {
    drawGlowSprite('gold', lx, ly, 18, 0.70);
    G.ctx.fillStyle = '#fef08a';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.5;
    G.ctx.beginPath();
    G.ctx.moveTo(lx, ly - 8); G.ctx.lineTo(lx + 6, ly); G.ctx.lineTo(lx, ly + 8); G.ctx.lineTo(lx - 6, ly);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  }

  // 5. Three Orbiting Miniature Bronze Fly-Bells!
  for (let i = 0; i < 3; i++) {
    const ba = now * (isVolley ? 4.8 : 2.1) + (i * Math.PI * 2) / 3;
    const bx = Math.cos(ba) * 24;
    const by = -38 + Math.sin(ba) * 14;
    G.ctx.fillStyle = '#3b2c1a';
    G.ctx.strokeStyle = isVolley ? '#fef08a' : COLORS.goldBright;
    G.ctx.lineWidth = 1.4;
    G.ctx.beginPath();
    G.ctx.moveTo(bx - 3.5, by - 5); G.ctx.lineTo(bx + 3.5, by - 5);
    G.ctx.lineTo(bx + 5.5, by + 4); G.ctx.lineTo(bx - 5.5, by + 4);
    G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
    G.ctx.fillStyle = '#fef9c3';
    G.ctx.beginPath(); G.ctx.arc(bx, by + 5.5, 1.8, 0, Math.PI * 2); G.ctx.fill();
  }

  if (e.state === 'windup' && e.stateTimer < 0.25) {
    drawParryStarGlint(e.facing * 18, -38, 20, COLORS.goldBright);
  }
  G.ctx.restore();
  drawOverheadBars(e);
  if (isStagger) drawExecutionSigil(cx, e.y + 34);
}
