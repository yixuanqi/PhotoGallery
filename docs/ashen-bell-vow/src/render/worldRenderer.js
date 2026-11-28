// World Backdrop, Props, Altars, NPCs, Gates, Puzzles & Grapple Reticle Renderer (v32.0)
import {
  COLORS, ROOMS, ALTARS, NPCS, ALTAR_POS, LORE_TABLETS,
  SHORTCUT_GATE_DEF, CHAPEL_EXIT_GATE_DEF, FOUNDRY_ENTRY_GATE_DEF, FOUNDRY_EXIT_GATE_DEF, SKY_BRIDGE_GATE_DEF, FOUNDRY_VENT_GATE_DEF, FIRST_BELL_CORE_POS,
  PENDULUMS, VOID_BARRIERS, WALL_INSCRIPTIONS, GRAPPLE_ANCHORS, WIND_ZONES, BOUNCE_PADS, WORLD_SWITCHES_DEF, WIND_VANES,
  BANNERS, CANDLE_CLUSTERS, BONE_CAIRNS, FLOOR_Y, WELL_BOTTOM_Y, DUMMY_MODES
} from '../config.js';
import { G, getRoomById, getAwakeBoss, getRelicStats, hasKeeperBlessing, getExplorationPercent, getActiveWeaponId, isWeaponUnlocked, isSkyBridgeOpen, isWorldSwitchOn, isSwitchUnlocked, isWindZoneActive, isBouncePadAwake, getEffectiveNpcPos } from '../state.js';
import { prof } from '../profiler.js';
import { getControlLabels, getActionKeyLabel } from '../input.js';
import {
  drawGlowSprite, boilLine, boilCircle, boilRectOutline, drawTaperedCrescent, drawCloakMesh, solve2BoneIK
} from '../vfx.js';

import { drawLanternCastShadows, drawVolumetricLanternLights } from '../renderLighting.js';
import { rgbStr, drawParallaxBackground, drawForegroundSilhouettes } from '../renderParallax.js';
import { drawStampsLayer } from '../stampAtlas.js';
import { drawWorldArchitecture } from '../renderTerrain.js';
import { getGroundSurfaceY } from '../physics.js';
import { isPickupUnlocked, findNearestInteractable } from '../combat.js';
import { isRoomOccluded } from '../world.js';
import { drawAchievementBanner } from '../codex.js';
import {
  t, isEn, getCanvasFont, locInscription, locNpcName, locAltar, locTablet, locPickup, locDummyMode
} from '../i18n.js';

import { isInView } from './renderShared.js';
import { drawCachedText, drawCachedBadge } from './glyphAtlas.js';

export { drawWorldBackdrop, drawWeatherRipples } from './worldBackdropRenderer.js';

function hasNearbyWorldPrompt(px, py) {
  return !!findNearestInteractable(px, py);
}

export function drawRoomOcclusionMasks() {
  if (!ROOMS.length || !G.roomOcclusion) return;
  const ctx = G.ctx;
  const pad = 28;
  for (let i = 0; i < ROOMS.length; i++) {
    const rm = ROOMS[i];
    const alpha = G.roomOcclusion[rm.id];
    if (!alpha || alpha <= 0.01) continue;
    const b = rm.bounds;
    if (!isInView(b.x, b.y, b.w, b.h, pad)) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    ctx.restore();
  }
}

export function drawWallInscriptions() {
  if (!G.player || G.gameState !== 'playing') return;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + G.player.h * 0.5;
  const promptActive = hasNearbyWorldPrompt(px, G.player.y + G.player.h);

  // Pick only the SINGLE closest visible inscription within 205px (2D Euclidean) to eliminate text clutter
  let bestIns = null;
  let bestDist = 205;
  for (let i = 0; i < WALL_INSCRIPTIONS.length; i++) {
    const ins = WALL_INSCRIPTIONS[i];
    if (isRoomOccluded(ins.roomId)) continue;
    if (ins.dynamicKey === 'grapple' && (!G.worldState || !G.worldState.abilities || !G.worldState.abilities.grappleHook)) continue;
    if (ins.hideWhenShortcutOpen && G.worldState && G.worldState.shortcutOpen) continue;
    if (ins.hideInNgPlus && G.worldState && (G.worldState.ngPlusCycle || 1) >= 2) continue;
    if (ins.hideWhenGrappleHook && G.worldState && G.worldState.abilities && G.worldState.abilities.grappleHook) continue;
    if (ins.hideWhenDoubleJump && G.worldState && G.worldState.abilities && G.worldState.abilities.doubleJump) continue;
    if (ins.hideWhenShadeDash && G.worldState && G.worldState.abilities && G.worldState.abilities.shadeDash) continue;
    if (ins.hideWhenFlaskMax && G.worldState && (3 + (G.worldState.bonusFlasks || 0)) >= 6) continue;
    if (ins.hideWhenDawnSigil && G.worldState && G.worldState.keyItems && G.worldState.keyItems.dawnSigil) continue;
    if (ins.hideWhenPickup && G.worldState && Array.isArray(G.worldState.pickups) && G.worldState.pickups.some(p => p.id === ins.hideWhenPickup && p.collected)) continue;
    if (ins.hideWhenBoss2Defeated && G.worldState && G.worldState.boss2Defeated) continue;
    if (ins.hideWhenBossDefeated && G.worldState && G.worldState.bossDefeated) continue;
    if (ins.hideWhenPuzzleSolved && G.worldState && G.worldState.solvedPuzzles && G.worldState.solvedPuzzles.has(ins.hideWhenPuzzleSolved)) continue;
    if (ins.hideWhenSwitch && isWorldSwitchOn(ins.hideWhenSwitch)) continue;
    if (ins.hideWhenFloorBroken && G.worldState && G.worldState.breakableFloors && G.worldState.breakableFloors.some(f => f.id === ins.hideWhenFloorBroken && f.broken)) continue;
    if (!isInView(ins.x - 160, ins.y - 24, 320, 48, 80)) continue;
    const d = Math.hypot(px - ins.x, py - ins.y);
    if (d < bestDist) {
      bestDist = d;
      bestIns = ins;
    }
  }
  if (!bestIns) return;
  // Suppress inscription if an [E] interact badge is displayed right next to it so two texts never overlap
  if (promptActive && Math.abs(bestIns.y - (G.player.y - 40)) < 110 && Math.abs(bestIns.x - px) < 165) return;

  const proximity = Math.max(0, Math.min(1, (205 - bestDist) / 105));
  const alpha = proximity * 0.82;
  if (alpha < 0.04) return;

  let label = locInscription(bestIns.text);
  if (bestIns.dynamicKey) {
    const k = getControlLabels();
    if (bestIns.dynamicKey === 'grapple') label = t('ins.grapple', k.grapple);
    else if (bestIns.dynamicKey === 'pogoSpell') label = t('ins.pogoSpell', k.spell);
    else if (bestIns.dynamicKey === 'parry') label = t('ins.parry', k.parry);
    else if (bestIns.dynamicKey === 'bellPuzzle') label = t('ins.bellPuzzle', k.spell);
  }

  G.ctx.save();
  G.ctx.globalAlpha = alpha;
  const boxW = drawCachedBadge(G.ctx, label, bestIns.x, bestIns.y, {
    size: 12.5, bold: false, bg: 'rgba(6, 9, 15, 0.62)', border: '',
    color: '#e5ddc7', minW: 124, maxW: 388, padX: 14, h: 22, boxTopOff: -14, textOffY: 0
  });
  const halfW = boxW * 0.5;
  G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.36)';
  G.ctx.lineWidth = 1;
  boilLine(G.ctx, bestIns.x - halfW + 8, bestIns.y + 7, bestIns.x + halfW - 8, bestIns.y + 7, 4100 + bestIns.x, 0.6, 3);
  G.ctx.restore();
}

export function drawAltars() {
  const now = G.globalTime || 0;
  for (const altar of ALTARS) {
    const { x, y } = altar;
    if (isRoomOccluded(altar.roomId) || !isInView(x - 76, y - 240, 152, 250, 100)) continue;
    const isLit = !G.worldState || G.worldState.litAltars.has(altar.id);
    const isActive = G.worldState && G.worldState.activeAltarId === altar.id;
    const pulse = 0.78 + Math.sin(now * (isLit ? 2.6 : 3.8) + x * 0.03) * 0.22;

    G.ctx.save();
    // 1. Tall vertical sanctuary light pillar (makes save points readable from half a screen away!)
    const beamH = isLit ? 225 : 195;
    const beamW = isLit ? (isActive ? 56 : 46) : 40;
    const beamGrad = G.ctx.createLinearGradient(x, y - 10, x, y - beamH);
    if (isLit) {
      beamGrad.addColorStop(0, `rgba(56, 189, 248, ${(0.24 * pulse).toFixed(3)})`);
      beamGrad.addColorStop(0.35, `rgba(245, 158, 11, ${(0.12 * pulse).toFixed(3)})`);
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else {
      // Unlit altar: unmistakable beckoning pale-gold & silver sanctuary beacon so players never walk past it!
      beamGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.20 * pulse).toFixed(3)})`);
      beamGrad.addColorStop(0.45, `rgba(186, 230, 253, ${(0.10 * pulse).toFixed(3)})`);
      beamGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    }
    G.ctx.fillStyle = beamGrad;
    G.ctx.fillRect(x - beamW * 0.5, y - beamH, beamW, beamH - 8);

    // Thin bright vertical filament core
    const coreGrad = G.ctx.createLinearGradient(x, y - 34, x, y - beamH * 0.78);
    coreGrad.addColorStop(0, isLit ? `rgba(186, 230, 253, ${(0.45 * pulse).toFixed(3)})` : `rgba(254, 240, 138, ${(0.34 * pulse).toFixed(3)})`);
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    G.ctx.fillStyle = coreGrad;
    G.ctx.fillRect(x - 2, y - beamH * 0.78, 4, beamH * 0.78 - 34);

    // Grounded sanctuary aura ring
    G.ctx.strokeStyle = isLit ? `rgba(125, 211, 252, ${(0.48 * pulse).toFixed(3)})` : `rgba(253, 224, 71, ${(0.44 * pulse).toFixed(3)})`;
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath();
    G.ctx.ellipse(x, y - 1, 38, 6.5, 0, 0, Math.PI * 2);
    G.ctx.stroke();

    if (isLit) {
      drawGlowSprite('cyan', x, y - 48, isActive ? 138 : 108, (isActive ? 0.44 : 0.30) * pulse);
      drawGlowSprite('gold', x, y - 24, 62, 0.22 * pulse);
    } else {
      drawGlowSprite('gold', x, y - 44, 68, 0.34 * pulse);
    }

    // Stone Pedestal & Brazier (higher rim contrast)
    G.ctx.fillStyle = isLit ? '#1c273b' : '#161c2a';
    G.ctx.strokeStyle = isLit ? COLORS.cyanBright : COLORS.goldBright;
    G.ctx.lineWidth = 2.0;
    G.ctx.beginPath();
    G.ctx.moveTo(x - 26, y);
    G.ctx.lineTo(x - 16, y - 34);
    G.ctx.lineTo(x + 16, y - 34);
    G.ctx.lineTo(x + 26, y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    // Secondary Altar Cracked Bell Arch Ornament
    if (altar.id === 'altar_chapel') {
      G.ctx.strokeStyle = isLit ? 'rgba(245, 158, 11, 0.55)' : 'rgba(253, 224, 71, 0.34)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.arc(x, y - 46, 36, Math.PI, 0);
      G.ctx.stroke();
    }

    if (isLit) {
      const fl = Math.sin(now * 9 + x) * 3;
      drawGlowSprite('cyan', x, y - 52 + fl * 0.5, 38, 0.78);
      G.ctx.fillStyle = COLORS.cyanBright;
      G.ctx.beginPath();
      G.ctx.moveTo(x, y - 74 + fl);
      G.ctx.quadraticCurveTo(x + 14, y - 50, x, y - 38);
      G.ctx.quadraticCurveTo(x - 14, y - 50, x, y - 74 + fl);
      G.ctx.fill();
      G.ctx.fillStyle = '#ffffff';
      G.ctx.beginPath();
      G.ctx.moveTo(x, y - 62 + fl * 0.7);
      G.ctx.quadraticCurveTo(x + 6, y - 49, x, y - 41);
      G.ctx.quadraticCurveTo(x - 6, y - 49, x, y - 62 + fl * 0.7);
      G.ctx.fill();
    } else {
      // Unlit beckoning ember seed + rising golden spirit wisps
      G.ctx.fillStyle = 'rgba(253, 224, 71, 0.72)';
      G.ctx.beginPath();
      G.ctx.ellipse(x, y - 35, 12, 4, 0, 0, Math.PI * 2);
      G.ctx.fill();
      const drift = Math.sin(now * 2.8 + x) * 5;
      G.ctx.strokeStyle = 'rgba(254, 240, 138, 0.62)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(x, y - 38);
      G.ctx.quadraticCurveTo(x + drift, y - 56, x - drift * 0.6, y - 74);
      G.ctx.stroke();
    }

    // Rising ambient sanctuary motes (4 deterministic wisps)
    G.ctx.fillStyle = isLit ? '#bae6fd' : '#fde047';
    for (let mi = 0; mi < 4; mi++) {
      const prog = ((now * 0.34 + mi * 0.25 + (x % 17) * 0.05) % 1);
      const mx = x + Math.sin(now * 2.2 + mi * 2.1 + x) * (8 + prog * 10);
      const my = y - 40 - prog * 125;
      G.ctx.globalAlpha = Math.sin(prog * Math.PI) * 0.78;
      G.ctx.beginPath();
      G.ctx.arc(mx, my, 1.8 + (1 - prog) * 1.1, 0, Math.PI * 2);
      G.ctx.fill();
    }
    G.ctx.restore();
  }
}

function hasNpcClaimableReward(npc) {
  if (!G.worldState) return false;
  const nq = G.worldState.npcQuests || {};
  const codex = G.worldState.codex || {};
  if (npc.kind === 'chronicler') {
    const claims = Array.isArray(nq.chroniclerClaims) ? nq.chroniclerClaims : [];
    const readCnt = Array.isArray(codex.readTablets) ? codex.readTablets.length : 0;
    const seenCnt = codex.bestiary ? Object.keys(codex.bestiary).filter(k => codex.bestiary[k] && codex.bestiary[k].seen).length : 0;
    const expPct = getExplorationPercent();
    if (!claims.includes('vol1') && (readCnt >= 2 || expPct >= 35)) return true;
    if (!claims.includes('vol2') && (seenCnt >= 7 || G.worldState.boss2Defeated)) return true;
    if (!claims.includes('vol3') && readCnt >= LORE_TABLETS.length && expPct >= 80) return true;
  } else if (npc.kind === 'keeper') {
    if (!nq.keeperWickGifted && G.worldState.keyItems && G.worldState.keyItems.dawnSigil) return true;
  } else {
    if (G.worldState.bossDefeated && !isWeaponUnlocked('hammer')) return true;
  }
  return false;
}

export function drawNpcs() {
  for (const npc of NPCS) {
    const pos = getEffectiveNpcPos(npc);
    const { x, y } = pos;
    if (isRoomOccluded(pos.roomId) || !isInView(x - 80, y - 110, 160, 120, 100)) continue;
    const pDistNpc = G.player ? Math.hypot((G.player.x + G.player.w * 0.5) - x, (G.player.y + G.player.h) - y) : 999;
    const showNpcName = pDistNpc >= 88 && pDistNpc < 300;
    G.ctx.save();
    const pulse = 0.88 + Math.sin(G.globalTime * 6.0 + x) * 0.12;
    const hasQuestPin = hasNpcClaimableReward(npc);

    if (npc.kind === 'chronicler') {
      // Wandering Ink-Scholar · 墨尘 (Wide bamboo rain hat, scroll quiver, amber lantern staff)
      drawGlowSprite('gold', x + 16, y - 42, 92 * pulse, 0.30);
      drawGlowSprite('cyan', x - 8, y - 34, 48 * pulse, 0.18);

      // Lantern Staff planted in stone beside him
      const stX = x + 19;
      G.ctx.strokeStyle = '#9b8359';
      G.ctx.lineWidth = 2.6;
      G.ctx.beginPath(); G.ctx.moveTo(stX, y); G.ctx.lineTo(stX, y - 64); G.ctx.stroke();
      const lanSway = Math.sin(G.globalTime * 2.4) * 3.5;
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.4;
      G.ctx.beginPath(); G.ctx.moveTo(stX, y - 64); G.ctx.lineTo(stX + 10 + lanSway, y - 50); G.ctx.stroke();
      drawGlowSprite('gold', stX + 10 + lanSway, y - 46, 26 * pulse, 0.72);
      G.ctx.fillStyle = '#241c14';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.fillRect(stX + 6 + lanSway, y - 51, 8, 10);
      G.ctx.strokeRect(stX + 6 + lanSway, y - 51, 8, 10);
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.beginPath(); G.ctx.arc(stX + 10 + lanSway, y - 46, 2.5, 0, Math.PI * 2); G.ctx.fill();

      // Scroll Quiver strapped across back
      G.ctx.save();
      G.ctx.translate(x - 10, y - 38);
      G.ctx.rotate(-0.34);
      G.ctx.fillStyle = '#2c2218';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.4;
      G.ctx.fillRect(-5, -14, 10, 28);
      G.ctx.strokeRect(-5, -14, 10, 28);
      G.ctx.fillStyle = '#e7dec8';
      G.ctx.fillRect(-4, -17, 8, 4);
      G.ctx.restore();

      // Scholar Robe & Wide Bamboo Rain-Hat (蓑笠)
      G.ctx.translate(x, y);
      G.ctx.fillStyle = '#131b29';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-14, 0); G.ctx.lineTo(-10, -48); G.ctx.lineTo(10, -48); G.ctx.lineTo(14, 0);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      // Teal scholar sash
      G.ctx.strokeStyle = COLORS.cyan;
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath(); G.ctx.moveTo(-9, -36); G.ctx.lineTo(9, -28); G.ctx.stroke();
      // Wide conical hat
      G.ctx.fillStyle = '#252019';
      G.ctx.strokeStyle = COLORS.gold;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-24, -52); G.ctx.quadraticCurveTo(0, -70, 24, -52); G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      // Open parchment scroll in hands
      G.ctx.fillStyle = '#e8dfc9';
      G.ctx.fillRect(3, -34, 11, 8);
      G.ctx.fillStyle = COLORS.cyanBright;
      G.ctx.beginPath(); G.ctx.arc(8 + Math.sin(G.globalTime * 5) * 3, -31, 1.8, 0, Math.PI * 2); G.ctx.fill();

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'chronicler'), 2, -76, { size: 11.5, bold: false, color: 'rgba(186, 230, 253, 0.78)' });
      }
    } else if (npc.kind === 'keeper') {
      // Former Bell-Keeper · 汐 (Seated silver-veiled guardian with twin-wick cyan-gold sanctuary lantern)
      const gifted = !!(G.worldState && G.worldState.npcQuests && G.worldState.npcQuests.keeperWickGifted);
      drawGlowSprite(gifted ? 'gold' : 'cyan', x, y - 34, (gifted ? 112 : 92) * pulse, gifted ? 0.40 : 0.30);

      // Cracked miniature bronze bell resting on stone beside her
      G.ctx.fillStyle = '#241d17';
      G.ctx.strokeStyle = gifted ? COLORS.goldBright : 'rgba(216, 207, 184, 0.55)';
      G.ctx.lineWidth = 1.5;
      G.ctx.beginPath();
      G.ctx.moveTo(x - 26, y); G.ctx.lineTo(x - 22, y - 16); G.ctx.quadraticCurveTo(x - 16, y - 22, x - 11, y - 16); G.ctx.lineTo(x - 7, y);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();

      G.ctx.translate(x, y);
      // Flowing kneeling silver-ink cloak
      const veilSway = Math.sin(G.globalTime * 2.6) * 4;
      G.ctx.fillStyle = '#151c2c';
      G.ctx.strokeStyle = gifted ? COLORS.goldBright : COLORS.cyanBright;
      G.ctx.lineWidth = 1.7;
      G.ctx.beginPath();
      G.ctx.moveTo(-18, 0); G.ctx.quadraticCurveTo(-16, -34, -8, -44);
      G.ctx.lineTo(8, -44); G.ctx.quadraticCurveTo(16, -32, 19 + veilSway * 0.4, 0);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      // Hooded head & fluttering silver veil
      G.ctx.fillStyle = '#1f283b';
      G.ctx.beginPath(); G.ctx.arc(0, -50, 9.5, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
      G.ctx.lineWidth = 2;
      G.ctx.beginPath();
      G.ctx.moveTo(6, -54); G.ctx.quadraticCurveTo(16 + veilSway, -42, 20 + veilSway * 1.4, -22);
      G.ctx.stroke();
      // Twin-wick lantern cradled in front
      drawGlowSprite('cyan', 13, -22, 24 * pulse, 0.75);
      drawGlowSprite('gold', 13, -22, 15 * pulse, 0.68);
      G.ctx.fillStyle = '#121826';
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1.4;
      G.ctx.fillRect(8, -28, 10, 12);
      G.ctx.strokeRect(8, -28, 10, 12);
      G.ctx.fillStyle = '#fef9c3';
      G.ctx.beginPath(); G.ctx.arc(13, -22, 3.2, 0, Math.PI * 2); G.ctx.fill();

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'keeper'), 2, -70, { size: 11.5, bold: false, color: gifted ? 'rgba(253, 224, 71, 0.82)' : 'rgba(186, 230, 253, 0.78)' });
      }
    } else if (npc.kind === 'scavenger') {
      drawGlowSprite('gold', x, y - 26, 86 * pulse, 0.34);
      G.ctx.translate(x, y);
      G.ctx.fillStyle = '#251e16'; G.ctx.strokeStyle = COLORS.gold; G.ctx.lineWidth = 1.6;
      G.ctx.beginPath(); G.ctx.ellipse(-11, -24, 12, 15, -0.18, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#182130'; G.ctx.strokeStyle = COLORS.parchment; G.ctx.lineWidth = 1.6;
      G.ctx.beginPath(); G.ctx.moveTo(-13, 0); G.ctx.quadraticCurveTo(-11, -26, -5, -34);
      G.ctx.lineTo(7, -34); G.ctx.quadraticCurveTo(13, -24, 14, 0); G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#222b3d'; G.ctx.beginPath(); G.ctx.arc(1, -39, 8.5, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#e5ddc7'; G.ctx.fillRect(-6, -42, 14, 3.5);
      drawGlowSprite('gold', 15, -20, 20 * pulse, 0.72);
      G.ctx.fillStyle = COLORS.goldBright; G.ctx.beginPath(); G.ctx.arc(15, -20, 4.2, 0, Math.PI * 2); G.ctx.fill();
      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'scavenger'), 0, -58, { size: 11.5, bold: false, color: 'rgba(253, 224, 71, 0.85)' });
      }
    } else {
      // Blind Old Bellsmith · 砺 (Default smith)
      drawGlowSprite('gold', x + 16, y - 24, 115 * pulse, 0.34);

      const ax = x + 28;
      G.ctx.fillStyle = '#191d28';
      G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.65)';
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(ax - 18, y); G.ctx.lineTo(ax - 12, y - 18);
      G.ctx.lineTo(ax - 22, y - 24); G.ctx.lineTo(ax + 24, y - 24);
      G.ctx.lineTo(ax + 15, y - 16); G.ctx.lineTo(ax + 18, y);
      G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      const forgeFlash = (G.smithForge && G.smithForge.flash > 0) ? G.smithForge.flash : 0;
      drawGlowSprite('gold', ax, y - 27, (22 + forgeFlash * 26) * pulse, Math.min(1, 0.72 + forgeFlash * 0.28));
      G.ctx.fillStyle = forgeFlash > 0.25 ? '#fef9c3' : COLORS.goldBright;
      G.ctx.fillRect(ax - 7, y - 28, 14, 4);

      // Synchronized 2.2s forge curve: smooth lift (0..0.48), crisp strike onto anvil at 0.62, subtle bounce (0.62..0.76)
      const fPhase = (G.globalTime / 2.2) % 1;
      let hammerLift = 0;
      if (fPhase < 0.48) {
        const u = fPhase / 0.48;
        hammerLift = (u * u * (3 - 2 * u)) * 1.18;
      } else if (fPhase < 0.62) {
        const u = (fPhase - 0.48) / 0.14;
        hammerLift = (1 - u * u * u) * 1.18;
      } else if (fPhase < 0.76) {
        const u = (fPhase - 0.62) / 0.14;
        hammerLift = Math.sin(u * Math.PI) * 0.18;
      }
      G.ctx.translate(x - 6, y);
      G.ctx.fillStyle = '#151924';
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath();
      G.ctx.moveTo(-16, 0); G.ctx.lineTo(-14, -44); G.ctx.quadraticCurveTo(0, -54, 14, -42);
      G.ctx.lineTo(17, 0); G.ctx.closePath();
      G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#1e2433';
      G.ctx.beginPath(); G.ctx.arc(2, -52, 11, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = '#d8cfb8';
      G.ctx.lineWidth = 3;
      G.ctx.beginPath(); G.ctx.moveTo(-5, -53); G.ctx.lineTo(12, -51); G.ctx.stroke();
      G.ctx.fillStyle = '#b7afa0';
      G.ctx.beginPath(); G.ctx.moveTo(2, -45); G.ctx.lineTo(11, -44); G.ctx.lineTo(6, -31); G.ctx.closePath(); G.ctx.fill();

      G.ctx.save();
      G.ctx.translate(10, -34);
      G.ctx.rotate(-0.45 - hammerLift);
      G.ctx.strokeStyle = COLORS.parchment;
      G.ctx.lineWidth = 2.6;
      G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(24, 6); G.ctx.stroke();
      G.ctx.fillStyle = '#3b2c1a';
      G.ctx.strokeStyle = COLORS.gold;
      G.ctx.lineWidth = 1.5;
      G.ctx.fillRect(20, 0, 9, 13); G.ctx.strokeRect(20, 0, 9, 13);
      G.ctx.restore();

      if (showNpcName) {
        drawCachedText(G.ctx, locNpcName(npc, 'smith'), 10, -72, { size: 11.5, bold: false, color: 'rgba(253, 224, 71, 0.72)' });
      }
    }

    if (hasQuestPin) {
      const bob = Math.sin(G.globalTime * 5.2) * 3.5;
      drawGlowSprite('gold', 2, -92 + bob, 16, 0.78);
      drawCachedText(G.ctx, '✦', 2, -88 + bob, { size: 14, bold: true, color: COLORS.goldBright });
    }
    G.ctx.restore();
  }
}

export function drawShortcutGate() {
  if (!G.worldState || SHORTCUT_GATE_DEF.w <= 0) return;
  const g = SHORTCUT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;

  // 1. Retractable Bronze Chain Portcullis
  const lift = G.worldState.shortcutAnim * (g.h - 24);
  const barH = g.h - lift;
  G.ctx.save();
  if (barH > 12) {
    G.ctx.fillStyle = '#14171f';
    G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
    G.ctx.strokeStyle = G.worldState.shortcutOpen ? 'rgba(245, 158, 11, 0.55)' : 'rgba(216, 207, 184, 0.62)';
    G.ctx.lineWidth = 2.2;
    // Vertical iron bars
    for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
      boilLine(G.ctx, bx, g.y, bx, g.y + barH, 6800 + bx, 0.9, 4);
    }
    // Cross braces
    for (let by = g.y + 42; by < g.y + barH - 12; by += 56) {
      boilLine(G.ctx, g.x + 2, by, g.x + g.w - 2, by, 6900 + by, 0.8, 2);
    }
    // Bottom spiked beam
    G.ctx.fillStyle = '#2a2219';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
    G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  }

  // 2. East-Side Bronze Chain Lever on Lore Balcony
  const lx = g.leverX;
  const ly = g.leverY;
  G.ctx.fillStyle = '#1b2231';
  G.ctx.strokeStyle = COLORS.parchment;
  G.ctx.lineWidth = 1.6;
  G.ctx.fillRect(lx - 10, ly - 14, 20, 14);
  G.ctx.strokeRect(lx - 10, ly - 14, 20, 14);

  const leverAng = G.worldState.shortcutOpen ? 0.62 : -0.58;
  G.ctx.save();
  G.ctx.translate(lx, ly - 12);
  G.ctx.rotate(leverAng);
  G.ctx.strokeStyle = G.worldState.shortcutOpen ? COLORS.goldBright : COLORS.parchment;
  G.ctx.lineWidth = 3;
  G.ctx.beginPath(); G.ctx.moveTo(0, 0); G.ctx.lineTo(0, -34); G.ctx.stroke();
  G.ctx.fillStyle = G.worldState.shortcutOpen ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.beginPath(); G.ctx.arc(0, -36, 5.5, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();
  G.ctx.restore();
}

export function drawChapelExitGate() {
  if (!G.worldState) return;
  const g = CHAPEL_EXIT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = G.worldState.chapelExitAnim * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  G.ctx.save();
  G.ctx.fillStyle = '#151218';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = G.worldState.bossDefeated ? COLORS.cyanBright : COLORS.crimsonBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7100 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#2a181b';
  G.ctx.strokeStyle = G.worldState.bossDefeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

export function drawFoundryEntryGate() {
  if (!G.worldState) return;
  const g = FOUNDRY_ENTRY_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = G.worldState.foundryGateAnim * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  const unlocked = G.worldState.abilities.doubleJump || !!G.echoSession;
  G.ctx.save();
  G.ctx.fillStyle = '#121822';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = unlocked ? COLORS.goldBright : COLORS.cyanBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7250 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#1a2332';
  G.ctx.strokeStyle = unlocked ? COLORS.goldBright : COLORS.cyanBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

export function drawFoundryExitGate() {
  if (!G.worldState || FOUNDRY_EXIT_GATE_DEF.w <= 0) return;
  const g = FOUNDRY_EXIT_GATE_DEF;
  if (g.x < G.cam.x - 160 || g.x > G.cam.x + G.canvasW + 160) return;
  const lift = (G.worldState.foundryExitAnim || 0) * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  G.ctx.save();
  G.ctx.fillStyle = '#171210';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = G.worldState.boss2Defeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 11) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7360 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#2d1c12';
  G.ctx.strokeStyle = G.worldState.boss2Defeated ? COLORS.goldBright : COLORS.crimsonBright;
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

export function drawSkyBridgeGate() {
  if (!G.worldState || SKY_BRIDGE_GATE_DEF.w <= 0) return;
  const g = SKY_BRIDGE_GATE_DEF;
  if (!isInView(g.x - 20, g.y - 20, g.w + 40, g.h + 40, 120)) return;
  const lift = (G.worldState.skyBridgeGateAnim || 0) * (g.h - 14);
  const barH = g.h - lift;
  if (barH <= 14) return;
  const open = isSkyBridgeOpen();
  G.ctx.save();
  G.ctx.fillStyle = '#101c2d';
  G.ctx.fillRect(g.x + 2, g.y, g.w - 4, barH);
  G.ctx.strokeStyle = open ? COLORS.goldBright : '#7dd3fc';
  G.ctx.lineWidth = 2.2;
  for (let bx = g.x + 8; bx <= g.x + g.w - 8; bx += 10) {
    boilLine(G.ctx, bx, g.y, bx, g.y + barH, 7480 + bx, 0.9, 3);
  }
  G.ctx.fillStyle = '#1b2c44';
  G.ctx.strokeStyle = open ? COLORS.goldBright : '#bae6fd';
  G.ctx.fillRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.strokeRect(g.x - 3, g.y + barH - 10, g.w + 6, 10);
  G.ctx.restore();
}

export function drawFirstBellCore() {
  if (!G.worldState || !G.worldState.boss3Defeated || G.echoSession) return;
  const { x, y } = FIRST_BELL_CORE_POS;
  if (x < G.cam.x - 160 || x > G.cam.x + G.canvasW + 160) return;
  const bob = Math.sin(G.globalTime * 2.8) * 7;
  const cy = y - 64 + bob;
  const hasDawn = !!(G.worldState.keyItems && G.worldState.keyItems.dawnSigil);
  G.ctx.save();
  drawGlowSprite('gold', x, cy, 86, 0.78);
  if (hasDawn) drawGlowSprite('cyan', x, cy, 52, 0.56);
  // Radiant Astral Pillar descending onto First Bell Core (zero per-frame gradient)
  G.ctx.fillStyle = hasDawn ? 'rgba(254, 240, 138, 0.10)' : 'rgba(245, 158, 11, 0.07)';
  G.ctx.fillRect(x - 38, y * 0.12, 76, y * 0.84);
  G.ctx.fillStyle = hasDawn ? 'rgba(254, 240, 138, 0.12)' : 'rgba(245, 158, 11, 0.08)';
  G.ctx.fillRect(x - 18, y * 0.25, 36, y * 0.68);
  // Rotating golden halo
  G.ctx.strokeStyle = COLORS.goldBright;
  G.ctx.lineWidth = 2;
  boilCircle(G.ctx, x, cy, 30 + Math.sin(G.globalTime * 4) * 3, 9870, 1.4, 16);
  G.ctx.stroke();
  // Core Bell Heart Crystal
  G.ctx.fillStyle = '#fef9c3';
  G.ctx.strokeStyle = COLORS.gold;
  G.ctx.lineWidth = 2;
  G.ctx.beginPath();
  G.ctx.moveTo(x, cy - 22); G.ctx.lineTo(x + 15, cy); G.ctx.lineTo(x, cy + 22); G.ctx.lineTo(x - 15, cy);
  G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
  G.ctx.restore();
}

export function drawPendulums() {
  for (let idx = 0; idx < PENDULUMS.length; idx++) {
    const pd = PENDULUMS[idx];
    if (!isInView(pd.x - pd.len, pd.anchorY, pd.len * 2, pd.len + 40, 80)) continue;
    const ang = Math.sin(G.globalTime * pd.speed + pd.phase) * pd.amp;
    const bx = pd.x + Math.sin(ang) * pd.len;
    const by = pd.anchorY + Math.cos(ang) * pd.len;
    G.ctx.save();
    // Heavy iron chain
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.45)';
    G.ctx.lineWidth = 2.6;
    boilLine(G.ctx, pd.x, pd.anchorY, bx, by, 7900 + idx * 31, 1.2, 5);
    // Ceiling gear mount
    G.ctx.fillStyle = '#1d2230';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.6;
    G.ctx.beginPath(); G.ctx.arc(pd.x, pd.anchorY, 8, 0, Math.PI * 2); G.ctx.fill(); G.ctx.stroke();

    // Crescent Bronze Pendulum Blade
    drawGlowSprite('crimson', bx, by, pd.r * 1.45, 0.42);
    G.ctx.translate(bx, by);
    G.ctx.rotate(-ang);
    G.ctx.fillStyle = '#261d19';
    G.ctx.strokeStyle = COLORS.crimsonBright;
    G.ctx.lineWidth = 2.2;
    G.ctx.beginPath();
    G.ctx.arc(0, -6, pd.r, 0.18, Math.PI - 0.18);
    G.ctx.quadraticCurveTo(0, 6, Math.cos(0.18) * pd.r, -6 + Math.sin(0.18) * pd.r);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();
    // Central bronze bell rivet
    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.beginPath(); G.ctx.arc(0, 2, 5.5, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  }
}

export function drawSecretWalls() {
  if (!G.worldState) return;
  const curRm = G.currentRoomId ? ROOMS.find(r => r.id === G.currentRoomId) : null;
  for (const w of G.worldState.secretWalls) {
    if (w.broken) continue;
    if (isRoomOccluded(w.roomId)) {
      // Allow a border secret wall (like wall_crypt_east) to remain visible from its horizontally adjacent room
      if (!curRm) continue;
      const b = curRm.bounds;
      const touchesCur = (Math.abs((w.x + w.w) - b.x) <= 8 || Math.abs(w.x - (b.x + b.w)) <= 8) &&
                         (w.y + w.h > b.y && w.y < b.y + b.h);
      if (!touchesCur) continue;
    }
    if (!isInView(w.x, w.y, w.w, w.h, 80)) continue;
    const sx = w.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    G.ctx.save();
    G.ctx.translate(sx, 0);
    G.ctx.fillStyle = '#151c2b';
    G.ctx.fillRect(w.x, w.y, w.w, w.h);

    // Subtle glowing ink fissures hinting it's breakable!
    const dmgRatio = 1 - w.hp / w.maxHp;
    const pulse = 0.55 + Math.sin(G.globalTime * 4.5) * 0.25 + dmgRatio * 0.35;
    G.ctx.strokeStyle = `rgba(125, 211, 252, ${Math.min(1, pulse).toFixed(2)})`;
    G.ctx.lineWidth = 1.6 + dmgRatio * 1.2;
    G.ctx.beginPath();
    G.ctx.moveTo(w.x + w.w * 0.72, w.y + w.h * 0.08);
    G.ctx.lineTo(w.x + w.w * 0.34, w.y + w.h * 0.30);
    G.ctx.lineTo(w.x + w.w * 0.68, w.y + w.h * 0.54);
    G.ctx.lineTo(w.x + w.w * 0.30, w.y + w.h * 0.76);
    G.ctx.lineTo(w.x + w.w * 0.58, w.y + w.h * 0.92);
    G.ctx.stroke();

    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.52)';
    G.ctx.lineWidth = 1.9;
    boilRectOutline(G.ctx, w.x, w.y, w.w, w.h, 7400, 1.3);
    G.ctx.restore();
  }
}

export function drawVoidBarriers() {
  if (!VOID_BARRIERS.length) return;
  const unlocked = !!(G.worldState && G.worldState.abilities.shadeDash);
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    const vb = VOID_BARRIERS[i];
    if (!isInView(vb.x, vb.y, vb.w, vb.h, 80)) continue;
    const cx = vb.x + vb.w * 0.5;
    const cy = vb.y + vb.h * 0.5;
    G.ctx.save();
    drawGlowSprite(vb.sweeping ? 'crimson' : 'violet', cx, cy, Math.max(44, vb.h * 0.52), vb.sweeping ? 0.66 : (unlocked ? 0.44 : 0.62));
    // Obsidian-violet ink curtain body (zero per-frame gradient)
    G.ctx.fillStyle = 'rgba(16, 8, 28, 0.86)';
    G.ctx.fillRect(vb.x, vb.y, vb.w, vb.h);
    // Shimmering vertical void-ink streams
    G.ctx.strokeStyle = unlocked ? 'rgba(216, 180, 254, 0.72)' : 'rgba(168, 85, 247, 0.88)';
    G.ctx.lineWidth = 1.8;
    boilLine(G.ctx, vb.x + 3, vb.y, vb.x + 3, vb.y + vb.h, 9600 + i * 31, 1.8, 5);
    boilLine(G.ctx, vb.x + vb.w - 3, vb.y, vb.x + vb.w - 3, vb.y + vb.h, 9650 + i * 31, 1.8, 5);
    // Rising spectral void particles inside the curtain
    G.ctx.fillStyle = COLORS.violetBright;
    for (let k = 0; k < 5; k++) {
      const p = ((G.globalTime * 0.65 + k * 0.21 + i * 0.13) % 1);
      const px = cx + Math.sin(G.globalTime * 5 + k * 2.1) * (vb.w * 0.28);
      const py = vb.y + vb.h - p * vb.h;
      G.ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
      G.ctx.beginPath(); G.ctx.arc(px, py, 2.2, 0, Math.PI * 2); G.ctx.fill();
    }
    // Top & bottom anchor seal plates
    G.ctx.globalAlpha = 1;
    G.ctx.fillStyle = '#1b1426';
    G.ctx.strokeStyle = COLORS.violetBright;
    G.ctx.lineWidth = 1.4;
    G.ctx.fillRect(vb.x - 4, vb.y - 3, vb.w + 8, 7);
    G.ctx.strokeRect(vb.x - 4, vb.y - 3, vb.w + 8, 7);
    G.ctx.fillRect(vb.x - 4, vb.y + vb.h - 4, vb.w + 8, 7);
    G.ctx.strokeRect(vb.x - 4, vb.y + vb.h - 4, vb.w + 8, 7);
    G.ctx.restore();
  }
}

export function drawLostEchoes() {
  if (!G.worldState || !G.worldState.lostEchoes || G.echoSession) return;
  const le = G.worldState.lostEchoes;
  if (le.x < G.cam.x - 140 || le.x > G.cam.x + G.canvasW + 140) return;
  const bob = Math.sin(G.globalTime * 3.8) * 6;
  const x = le.x;
  const y = le.y + bob;
  G.ctx.save();
  drawGlowSprite('cyan', x, y, 56, 0.72);
  drawGlowSprite('gold', x, y, 28, 0.58);
  // Orbiting spectral ink-soul rings
  G.ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
  G.ctx.lineWidth = 1.6;
  boilCircle(G.ctx, x, y, 20 + Math.sin(G.globalTime * 6) * 2, 9820, 1.6, 14);
  G.ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const a = G.globalTime * 2.9 + (k * Math.PI * 2) / 3;
    const ox = x + Math.cos(a) * 22;
    const oy = y + Math.sin(a) * 12;
    G.ctx.fillStyle = k === 0 ? COLORS.goldBright : COLORS.cyanBright;
    G.ctx.beginPath(); G.ctx.arc(ox, oy, 2.8, 0, Math.PI * 2); G.ctx.fill();
  }
  // Spectral Lantern Shade silhouette
  G.ctx.fillStyle = '#0d1828';
  G.ctx.strokeStyle = COLORS.cyanBright;
  G.ctx.lineWidth = 1.9;
  G.ctx.beginPath();
  G.ctx.moveTo(x - 9, y - 14); G.ctx.lineTo(x + 9, y - 14);
  G.ctx.lineTo(x + 12, y + 8); G.ctx.lineTo(x, y + 18); G.ctx.lineTo(x - 12, y + 8);
  G.ctx.closePath();
  G.ctx.fill(); G.ctx.stroke();
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.arc(x, y - 2, 4.8, 0, Math.PI * 2); G.ctx.fill();
  // Amount Label (cached glyph blit)
  drawCachedText(G.ctx, t('ren.lostEcho', le.amount), x, y - 29, {
    size: 12, bold: true, color: COLORS.cyanBright, shadow: true, shadowOffX: 1, shadowOffY: 1
  });
  G.ctx.restore();
}

export function drawPickups() {
  if (!G.worldState) return;
  for (const p of G.worldState.pickups) {
    if (p.collected || isRoomOccluded(p.roomId)) continue;
    if (p.requiresSwitch && !isWorldSwitchOn(p.requiresSwitch)) continue;
    if (!isInView(p.x - 46, p.y - 140, 92, 150, 80)) continue;
    const bob = Math.sin(G.globalTime * 3.6 + p.x) * 5;
    const py = p.y - 28 + bob;
    const isFlask = p.kind === 'flaskCore';
    const isAbility = p.kind === 'ability';
    const isWeapon = p.kind === 'weapon';
    const isKey = p.kind === 'keyItem';
    const isRealmSeal = p.kind === 'realmSeal';
    const bossLocked = !!(p.requiresBoss && !isPickupUnlocked(p));
    const isShade = (isAbility && p.abilityId === 'shadeDash') || p.kind === 'statCore';
    const sealCol = p.sealId === 'forest' ? '#6ee7b7' : p.sealId === 'mountain' ? '#bae6fd' : '#7dd3fc';
    const col = isRealmSeal ? sealCol : (isKey ? '#fef9c3' : (isShade ? COLORS.violetBright : (isFlask || isAbility || isWeapon ? COLORS.cyanBright : COLORS.goldBright)));

    G.ctx.save();
    if (bossLocked) G.ctx.globalAlpha = 0.55;
    if (isRealmSeal && !bossLocked) {
      G.ctx.fillStyle = p.sealId === 'forest' ? 'rgba(110, 231, 183, 0.11)' : 'rgba(186, 230, 253, 0.11)';
      G.ctx.fillRect(p.x - 24, p.y - 160, 48, 152);
      drawGlowSprite('gold', p.x, py, 74, 0.65);
    }
    if (!bossLocked) {
      const pPulse = 0.76 + Math.sin(G.globalTime * 3.4 + p.x) * 0.24;
      const bRgb = isShade ? '192, 132, 252' : (isFlask || isAbility || isWeapon || isRealmSeal ? '56, 189, 248' : '253, 224, 71');
      const pBeamH = (isAbility || isWeapon || isRealmSeal) ? 148 : 112;
      const pg = G.ctx.createLinearGradient(p.x, p.y - 6, p.x, p.y - pBeamH);
      pg.addColorStop(0, `rgba(${bRgb}, ${(0.22 * pPulse).toFixed(3)})`);
      pg.addColorStop(1, `rgba(${bRgb}, 0)`);
      G.ctx.fillStyle = pg;
      G.ctx.fillRect(p.x - 14, p.y - pBeamH, 28, pBeamH - 6);
      G.ctx.strokeStyle = `rgba(${bRgb}, ${(0.52 * pPulse).toFixed(3)})`;
      G.ctx.lineWidth = 1.4;
      G.ctx.beginPath();
      G.ctx.ellipse(p.x, p.y - 1, 22, 4.5, 0, 0, Math.PI * 2);
      G.ctx.stroke();
      G.ctx.fillStyle = col;
      for (let ki = 0; ki < 3; ki++) {
        const kp = ((G.globalTime * 0.46 + ki * 0.33 + (p.x % 13) * 0.07) % 1);
        const kx = p.x + Math.sin(G.globalTime * 2.8 + ki * 2.2) * 11;
        const ky = p.y - 16 - kp * 84;
        G.ctx.globalAlpha = Math.sin(kp * Math.PI) * 0.85;
        G.ctx.beginPath(); G.ctx.arc(kx, ky, 1.8, 0, Math.PI * 2); G.ctx.fill();
      }
      G.ctx.globalAlpha = 1;
    }
    drawGlowSprite(isShade ? 'violet' : (isFlask || isAbility || isWeapon || isRealmSeal ? 'cyan' : 'gold'), p.x, py, (isAbility || isWeapon || isRealmSeal) ? 74 : 56, (isAbility || isWeapon || isRealmSeal) ? 0.66 : 0.50);
    if (isWeapon) drawGlowSprite('gold', p.x, py, 40, 0.48);

    // Stone miniature shrine plinth
    G.ctx.fillStyle = '#182132';
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.5)';
    G.ctx.lineWidth = 1.4;
    G.ctx.fillRect(p.x - 14, p.y - 10, 28, 10);
    G.ctx.strokeRect(p.x - 14, p.y - 10, 28, 10);

    // Floating glowing artifact icon
    G.ctx.translate(p.x, py);
    G.ctx.fillStyle = col;
    G.ctx.strokeStyle = '#ffffff';
    G.ctx.lineWidth = 1.4;
    if (isWeapon) {
      // Floating Hand-Drawn Soul-Calling Bell Staff Relic Shrine
      G.ctx.rotate(-0.35 + Math.sin(G.globalTime * 2.8) * 0.14);
      G.ctx.strokeStyle = '#6b4c30';
      G.ctx.lineWidth = 3.0;
      G.ctx.beginPath(); G.ctx.moveTo(-14, 14); G.ctx.lineTo(10, -10); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.goldBright;
      G.ctx.lineWidth = 1.8;
      G.ctx.beginPath(); G.ctx.arc(11, -11, 6, -1.6, 1.4); G.ctx.stroke();
      G.ctx.fillStyle = '#2a2016';
      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.lineWidth = 1.6;
      G.ctx.beginPath();
      G.ctx.moveTo(8, -11); G.ctx.lineTo(15, -11); G.ctx.lineTo(18, -1); G.ctx.lineTo(5, -1);
      G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      G.ctx.fillStyle = '#e0f2fe';
      G.ctx.beginPath(); G.ctx.arc(11.5, 1, 2.8, 0, Math.PI * 2); G.ctx.fill();
    } else if (isAbility && p.abilityId === 'grappleHook') {
      G.ctx.strokeStyle = COLORS.cyanBright; G.ctx.lineWidth = 2.2;
      G.ctx.beginPath(); G.ctx.arc(0, -2, 9, 0, Math.PI * 2); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 1.8;
      G.ctx.beginPath(); G.ctx.moveTo(-11, 10); G.ctx.lineTo(0, 3); G.ctx.lineTo(11, 10); G.ctx.stroke();
      G.ctx.fillStyle = '#fef9c3'; G.ctx.beginPath(); G.ctx.arc(0, -2, 3.2, 0, Math.PI * 2); G.ctx.fill();
    } else if (isAbility && p.abilityId === 'bellDive') {
      G.ctx.fillStyle = '#2d2010'; G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 1.9;
      G.ctx.beginPath(); G.ctx.moveTo(-7, -12); G.ctx.lineTo(7, -12); G.ctx.quadraticCurveTo(13, 0, 15, 9);
      G.ctx.lineTo(-15, 9); G.ctx.quadraticCurveTo(-13, 0, -7, -12); G.ctx.closePath(); G.ctx.fill(); G.ctx.stroke();
      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.beginPath(); G.ctx.moveTo(0, -16); G.ctx.lineTo(0, 16); G.ctx.moveTo(-5, 11); G.ctx.lineTo(0, 17); G.ctx.lineTo(5, 11); G.ctx.stroke();
    } else if (isAbility) {
      // Twin Ink-Wing Emblem
      const flap = Math.sin(G.globalTime * 5) * 0.16;
      [-1, 1].forEach(side => {
        G.ctx.save();
        G.ctx.scale(side, 1);
        G.ctx.rotate(flap);
        G.ctx.beginPath();
        G.ctx.moveTo(2, 4);
        G.ctx.quadraticCurveTo(15, -14, 22, -6);
        G.ctx.quadraticCurveTo(16, 4, 4, 8);
        G.ctx.closePath();
        G.ctx.fill();
        G.ctx.stroke();
        G.ctx.restore();
      });
    } else if (isFlask) {
      G.ctx.beginPath();
      G.ctx.moveTo(0, -11);
      G.ctx.quadraticCurveTo(9, 0, 7, 8);
      G.ctx.quadraticCurveTo(0, 12, -7, 8);
      G.ctx.quadraticCurveTo(-9, 0, 0, -11);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    } else {
      G.ctx.rotate(Math.sin(G.globalTime * 2.5) * 0.14);
      G.ctx.beginPath();
      G.ctx.moveTo(-6, -10);
      G.ctx.lineTo(6, -10);
      G.ctx.quadraticCurveTo(11, 2, 13, 9);
      G.ctx.lineTo(-13, 9);
      G.ctx.quadraticCurveTo(-11, 2, -6, -10);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
    }
    G.ctx.restore();
    if (bossLocked) {
      G.ctx.save();
      G.ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
      G.ctx.fillStyle = 'rgba(10, 14, 22, 0.46)';
      G.ctx.lineWidth = 1.9;
      G.ctx.beginPath();
      G.ctx.moveTo(p.x - 22, p.y);
      G.ctx.lineTo(p.x - 22, p.y - 44);
      G.ctx.quadraticCurveTo(p.x, p.y - 66, p.x + 22, p.y - 44);
      G.ctx.lineTo(p.x + 22, p.y);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
      G.ctx.strokeStyle = 'rgba(248, 113, 113, 0.68)';
      G.ctx.lineWidth = 1.5;
      G.ctx.beginPath();
      G.ctx.moveTo(p.x - 16, p.y - 42); G.ctx.lineTo(p.x + 16, p.y - 10);
      G.ctx.moveTo(p.x + 16, p.y - 42); G.ctx.lineTo(p.x - 16, p.y - 10);
      G.ctx.stroke();
      G.ctx.restore();
    }
  }
}

export function drawWindZones() {
  if (!WIND_ZONES.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < WIND_ZONES.length; i++) {
    const wz = WIND_ZONES[i];
    if (!isWindZoneActive(wz)) continue;
    if (isRoomOccluded(wz.roomId) || !isInView(wz.x, wz.y, wz.w, wz.h, 80)) continue;
    ctx.save();
    // Soft translucent azure-white ink draft column
    ctx.fillStyle = 'rgba(186, 230, 253, 0.055)';
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 12]);
    ctx.strokeRect(wz.x + 2, wz.y + 2, wz.w - 4, wz.h - 4);
    ctx.setLineDash([]);

    // Rising hand-drawn calligraphic wind ribbons
    const cols = Math.max(3, Math.floor(wz.w / 34));
    for (let c = 0; c < cols; c++) {
      const phase = ((G.globalTime * 1.35 + c * 0.31 + i * 0.17) % 1);
      const rx = wz.x + ((c + 0.5) / cols) * wz.w + Math.sin(G.globalTime * 4 + c * 1.9) * 8;
      const ry = wz.y + wz.h - phase * wz.h;
      const ribLen = Math.min(72, wz.h * 0.28);
      const alpha = Math.sin(phase * Math.PI) * 0.58;
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.8;
      const slant = Math.max(-36, Math.min(36, (wz.vx || 0) * 0.22));
      ctx.beginPath(); ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + slant * 0.45 + Math.sin(G.globalTime * 7 + c) * 8, ry - ribLen * 0.5, rx + slant, ry - ribLen);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawBouncePads() {
  if (!BOUNCE_PADS.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < BOUNCE_PADS.length; i++) {
    const bp = BOUNCE_PADS[i];
    if (isRoomOccluded(bp.roomId) || !isInView(bp.x - bp.w, bp.y - bp.h - 24, bp.w * 2, bp.h + 40, 80)) continue;
    const awake = isBouncePadAwake(bp);
    const sq = bp.squish || 0;
    const scaleX = awake ? (1 + Math.sin(sq * Math.PI) * 0.24) : 0.78;
    const scaleY = awake ? (1 - Math.sin(sq * Math.PI) * 0.34) : 0.62;
    const pulse = 0.78 + Math.sin(G.globalTime * 4.5 + i * 1.7) * 0.22;
    ctx.save();
    drawGlowSprite(awake ? 'cyan' : 'violet', bp.x, bp.y - bp.h * 0.65, bp.w * (awake ? 0.85 : 0.52), (awake ? (0.34 + sq * 0.42) : 0.24) * pulse);
    ctx.translate(bp.x, bp.y);
    ctx.scale(scaleX, scaleY);

    // Gnarled root-stem stalk
    ctx.fillStyle = '#142622';
    ctx.strokeStyle = 'rgba(110, 231, 183, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-7, -bp.h * 0.55, -13, -bp.h * 0.65);
    ctx.lineTo(13, -bp.h * 0.65); ctx.quadraticCurveTo(7, -bp.h * 0.55, 10, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const hw = bp.w * 0.5;
    ctx.fillStyle = awake ? '#11332c' : '#1b1429';
    ctx.strokeStyle = awake ? '#6ee7b7' : '#a855f7';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-hw, -bp.h * 0.42);
    ctx.quadraticCurveTo(-hw * 0.82, -bp.h * 1.25, 0, -bp.h * 1.22);
    ctx.quadraticCurveTo(hw * 0.82, -bp.h * 1.25, hw, -bp.h * 0.42);
    ctx.quadraticCurveTo(0, -bp.h * 0.22, -hw, -bp.h * 0.42);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Bioluminescent spore spots on cap
    ctx.fillStyle = '#a7f3d0';
    ctx.beginPath();
    ctx.arc(-hw * 0.44, -bp.h * 0.74, 3.0, 0, Math.PI * 2);
    ctx.arc(0, -bp.h * 0.92, 3.8, 0, Math.PI * 2);
    ctx.arc(hw * 0.44, -bp.h * 0.74, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawCrumblePlatforms() {
  if (!G.crumblePlatforms) return;
  for (let idx = 0; idx < G.crumblePlatforms.length; idx++) {
    const cp = G.crumblePlatforms[idx];
    if (!isInView(cp.x, cp.y, cp.w, cp.h, 80)) continue;
    G.ctx.save();
    if (cp.state === 'broken') {
      const regenP = 1 - Math.max(0, cp.timer / 3.2);
      G.ctx.setLineDash([5, 5]);
      G.ctx.strokeStyle = '#7dd3fc';
      G.ctx.globalAlpha = 0.18 + regenP * 0.38;
      G.ctx.lineWidth = 1.4;
      G.ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
      G.ctx.setLineDash([]);
      G.ctx.restore();
      continue;
    }
    const jx = cp.state === 'shaking' ? (Math.random() - 0.5) * 6 : 0;
    const jy = cp.state === 'shaking' ? (Math.random() - 0.5) * 3 : 0;
    G.ctx.translate(jx, jy);
    G.ctx.fillStyle = cp.state === 'shaking' ? '#2c2220' : '#242b3b';
    G.ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
    // Glowing amber fracture seams signaling fragility
    G.ctx.strokeStyle = cp.state === 'shaking' ? COLORS.crimsonBright : 'rgba(245, 158, 11, 0.72)';
    G.ctx.lineWidth = cp.state === 'shaking' ? 2.0 : 1.4;
    G.ctx.beginPath();
    G.ctx.moveTo(cp.x + cp.w * 0.28, cp.y);
    G.ctx.lineTo(cp.x + cp.w * 0.36, cp.y + cp.h * 0.55);
    G.ctx.lineTo(cp.x + cp.w * 0.24, cp.y + cp.h);
    G.ctx.moveTo(cp.x + cp.w * 0.68, cp.y);
    G.ctx.lineTo(cp.x + cp.w * 0.60, cp.y + cp.h * 0.62);
    G.ctx.lineTo(cp.x + cp.w * 0.74, cp.y + cp.h);
    G.ctx.stroke();
    G.ctx.strokeStyle = cp.state === 'shaking' ? COLORS.goldBright : 'rgba(216, 207, 184, 0.65)';
    G.ctx.lineWidth = 1.8;
    boilRectOutline(G.ctx, cp.x, cp.y, cp.w, cp.h, 8400 + idx * 31, 1.2);
    G.ctx.restore();
  }
}

export function drawResonancePuzzles() {
  if (!G.resonancePuzzles) return;
  for (const pz of G.resonancePuzzles) {
    const cx = pz.cageX;
    const cy = pz.cageY;
    // 1. Harmonic Golden Tether Lines from each Bell to Reliquary Cage
    if (!pz.solved || pz.cageAnim < 1) {
      G.ctx.save();
      const lineFade = pz.solved ? (1 - pz.cageAnim) : 1;
      for (const b of pz.bells) {
        if (Math.max(b.x, cx) < G.cam.x - 120 || Math.min(b.x, cx) > G.cam.x + G.canvasW + 120) continue;
        G.ctx.strokeStyle = b.lit
          ? `rgba(253, 224, 71, ${(0.55 * lineFade).toFixed(2)})`
          : `rgba(216, 207, 184, ${(0.14 * lineFade).toFixed(2)})`;
        G.ctx.lineWidth = b.lit ? 2.0 : 1.1;
        G.ctx.setLineDash(b.lit ? [] : [5, 7]);
        G.ctx.beginPath();
        G.ctx.moveTo(b.x, b.y + 12);
        G.ctx.quadraticCurveTo((b.x + cx) * 0.5, (b.y + cy - 35) * 0.5 + 32, cx, cy - 34);
        G.ctx.stroke();
      }
      G.ctx.setLineDash([]);
      G.ctx.restore();
    }

    // 2. Hanging Bronze Resonance Bells
    pz.bells.forEach((b, idx) => {
      if (b.x < G.cam.x - 100 || b.x > G.cam.x + G.canvasW + 100) return;
      G.ctx.save();
      G.ctx.strokeStyle = b.lit ? 'rgba(253, 224, 71, 0.55)' : 'rgba(216, 207, 184, 0.32)';
      G.ctx.lineWidth = 1.6;
      boilLine(G.ctx, b.x, b.topY, b.x, b.y - 16, 8600 + idx * 19, 0.9, 3);

      if (b.lit || b.flash > 0) {
        drawGlowSprite('gold', b.x, b.y, b.flash > 0 ? 52 : 34, b.flash > 0 ? 0.85 : 0.55);
      } else {
        drawGlowSprite('cyan', b.x, b.y, 24, 0.22);
      }

      G.ctx.translate(b.x, b.y);
      G.ctx.rotate(b.swing);
      G.ctx.fillStyle = b.lit ? '#422c12' : '#1b202c';
      G.ctx.strokeStyle = b.lit ? COLORS.goldBright : 'rgba(216, 207, 184, 0.72)';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath();
      G.ctx.moveTo(-8, -14);
      G.ctx.lineTo(8, -14);
      G.ctx.quadraticCurveTo(15, 2, 18, 13);
      G.ctx.lineTo(-18, 13);
      G.ctx.quadraticCurveTo(-15, 2, -8, -14);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();

      // Bell clapper & glowing rune dot
      G.ctx.fillStyle = b.lit ? COLORS.goldBright : COLORS.cyan;
      G.ctx.beginPath(); G.ctx.arc(0, 14, 3.8, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.beginPath(); G.ctx.arc(0, -2, 3.2, 0, Math.PI * 2); G.ctx.fill();
      G.ctx.restore();
    });

    // 3. Sealed Bronze Reliquary Cage over Reward Pickup
    if (cx >= G.cam.x - 100 && cx <= G.cam.x + G.canvasW + 100 && pz.cageAnim < 1) {
      const lift = pz.cageAnim * 58;
      const alpha = 1 - pz.cageAnim;
      G.ctx.save();
      G.ctx.globalAlpha = alpha;
      G.ctx.strokeStyle = pz.timer > 0 ? COLORS.goldBright : 'rgba(245, 158, 11, 0.72)';
      G.ctx.fillStyle = 'rgba(12, 16, 24, 0.42)';
      G.ctx.lineWidth = 2.0;
      const topY = cy - 64 - lift;
      const h = 64;
      G.ctx.beginPath();
      G.ctx.moveTo(cx - 24, topY + h);
      G.ctx.lineTo(cx - 24, topY + 18);
      G.ctx.quadraticCurveTo(cx, topY - 8, cx + 24, topY + 18);
      G.ctx.lineTo(cx + 24, topY + h);
      G.ctx.closePath();
      G.ctx.fill();
      G.ctx.stroke();
      for (let bx = cx - 12; bx <= cx + 12; bx += 12) {
        G.ctx.beginPath(); G.ctx.moveTo(bx, topY + 8); G.ctx.lineTo(bx, topY + h); G.ctx.stroke();
      }
      // Active harmony countdown ring above the sealed cage
      if (!pz.solved && pz.timer > 0 && pz.maxTimer > 0) {
        const pct = Math.max(0, Math.min(1, pz.timer / pz.maxTimer));
        G.ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
        G.ctx.lineWidth = 4;
        G.ctx.beginPath(); G.ctx.arc(cx, topY - 16, 12, 0, Math.PI * 2); G.ctx.stroke();
        G.ctx.strokeStyle = COLORS.goldBright;
        G.ctx.lineWidth = 3;
        G.ctx.beginPath(); G.ctx.arc(cx, topY - 16, 12, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct); G.ctx.stroke();
      }
      G.ctx.restore();
    }
  }
}

export function drawLoreTablets() {
  const now = G.globalTime || 0;
  const readList = G.worldState && G.worldState.codex && Array.isArray(G.worldState.codex.readTablets) ? G.worldState.codex.readTablets : [];
  for (const lt of LORE_TABLETS) {
    const { x, y } = lt;
    if (isRoomOccluded(lt.roomId) || !isInView(x - 42, y - 125, 84, 130, 100)) continue;
    const isRead = readList.includes(lt.id);
    const pulse = 0.75 + Math.sin(now * 3.0 + x * 0.05) * 0.25;
    G.ctx.save();
    if (!isRead) {
      const tg = G.ctx.createLinearGradient(x, y - 8, x, y - 110);
      tg.addColorStop(0, `rgba(253, 224, 71, ${(0.18 * pulse).toFixed(3)})`);
      tg.addColorStop(1, 'rgba(253, 224, 71, 0)');
      G.ctx.fillStyle = tg;
      G.ctx.fillRect(x - 15, y - 110, 30, 102);
      drawGlowSprite('gold', x, y - 34, 56, 0.32 * pulse);
      G.ctx.strokeStyle = `rgba(253, 224, 71, ${(0.42 * pulse).toFixed(3)})`;
      G.ctx.lineWidth = 1.3;
      G.ctx.beginPath(); G.ctx.ellipse(x, y - 1, 22, 4.2, 0, 0, Math.PI * 2); G.ctx.stroke();
    } else {
      drawGlowSprite('gold', x, y - 32, 34, 0.14);
    }

    G.ctx.fillStyle = isRead ? '#161d2c' : '#202a3e';
    G.ctx.strokeStyle = isRead ? 'rgba(216, 207, 184, 0.65)' : COLORS.goldBright;
    G.ctx.lineWidth = isRead ? 1.6 : 2.0;
    G.ctx.beginPath();
    G.ctx.moveTo(x - 18, y);
    G.ctx.lineTo(x - 15, y - 54);
    G.ctx.quadraticCurveTo(x, y - 66, x + 15, y - 54);
    G.ctx.lineTo(x + 18, y);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.strokeStyle = isRead ? 'rgba(253, 224, 71, 0.35)' : 'rgba(254, 240, 138, 0.85)';
    G.ctx.lineWidth = isRead ? 1.2 : 1.5;
    for (let r = 0; r < 3; r++) {
      boilLine(G.ctx, x - 9, y - 42 + r * 11, x + 9, y - 42 + r * 11, 3100 + x + r * 7, 0.7, 2);
    }
    if (!isRead) {
      G.ctx.fillStyle = COLORS.goldBright;
      for (let ki = 0; ki < 2; ki++) {
        const kp = ((now * 0.38 + ki * 0.5 + (x % 11) * 0.08) % 1);
        G.ctx.globalAlpha = Math.sin(kp * Math.PI) * 0.75;
        G.ctx.beginPath(); G.ctx.arc(x + Math.sin(now * 2.4 + ki * 3) * 9, y - 48 - kp * 48, 1.6, 0, Math.PI * 2); G.ctx.fill();
      }
    }
    G.ctx.restore();
  }
}

export function drawLanterns() {
  for (let idx = 0; idx < G.lanterns.length; idx++) {
    const l = G.lanterns[idx];
    if (isRoomOccluded(l.roomId)) continue;
    const topY0 = l.topY !== undefined ? l.topY : l.anchorY;
    const minY = Math.min(topY0, l.anchorY - 20);
    const maxY = Math.max(topY0, l.anchorY + l.len + 40);
    if (!isInView(l.x - 60, minY, 120, maxY - minY, 100)) continue;
    const lx = l.x + Math.sin(l.angle) * l.len;
    const ly = l.anchorY + Math.cos(l.angle) * l.len;
    G.ctx.save();
    G.ctx.strokeStyle = 'rgba(216, 207, 184, 0.36)';
    G.ctx.lineWidth = 1.6;
    const topY = topY0;
    if (l.anchorY > topY) boilLine(G.ctx, l.x, topY, l.x, l.anchorY, 1900 + idx * 11, 0.8, 3);
    boilLine(G.ctx, l.x, l.anchorY, lx, ly - 10, 1950 + idx * 13, 1.0, 3);

    drawGlowSprite('gold', lx, ly, l.ringFlash > 0 ? 82 : 46, l.ringFlash > 0 ? 0.72 : 0.38);

    G.ctx.translate(lx, ly);
    G.ctx.rotate(-l.angle);
    G.ctx.fillStyle = '#181c24';
    G.ctx.strokeStyle = COLORS.gold;
    G.ctx.lineWidth = 1.8;
    G.ctx.beginPath();
    G.ctx.moveTo(-9, -11); G.ctx.lineTo(9, -11); G.ctx.lineTo(12, 8); G.ctx.lineTo(-12, 8);
    G.ctx.closePath();
    G.ctx.fill();
    G.ctx.stroke();

    G.ctx.fillStyle = COLORS.goldBright;
    G.ctx.beginPath(); G.ctx.arc(0, -1, 4.5, 0, Math.PI * 2); G.ctx.fill();
    G.ctx.restore();
  }
}

export function drawGrappleAnchors() {
  for (let idx = 0; idx < GRAPPLE_ANCHORS.length; idx++) {
    const a = GRAPPLE_ANCHORS[idx];
    if (isRoomOccluded(a.roomId)) continue;
    const topY0 = a.topY !== undefined ? a.topY : (a.y - 180);
    const minY = Math.min(topY0, a.y - 24);
    const maxY = Math.max(topY0, a.y + 24);
    if (!isInView(a.x - 40, minY, 80, maxY - minY, 100)) continue;
    const hasGrapple = !!(G.worldState && G.worldState.abilities && G.worldState.abilities.grappleHook);
    G.ctx.save();
    G.ctx.strokeStyle = hasGrapple ? 'rgba(216, 207, 184, 0.30)' : 'rgba(130, 138, 152, 0.22)';
    G.ctx.lineWidth = 1.5;
    const topY = topY0;
    if (a.y - 12 > topY) boilLine(G.ctx, a.x, topY, a.x, a.y - 12, 2300 + idx * 17, 1.1, 4);

    if (hasGrapple) {
      const aid = a.id || '';
      const isTideBeacon = G.chapelTide && (aid.startsWith('anc_boss') || aid.startsWith('anc_ji') || aid.startsWith('anc_heart'));
      const pulse = 0.65 + Math.sin(G.globalTime * (isTideBeacon ? 12 : 3.8) + idx) * 0.35;
      drawGlowSprite(isTideBeacon ? 'gold' : 'cyan', a.x, a.y, isTideBeacon ? 52 : 32, (isTideBeacon ? 0.56 : 0.30) * pulse);

      G.ctx.strokeStyle = COLORS.cyanBright;
      G.ctx.lineWidth = 2.2;
      boilCircle(G.ctx, a.x, a.y, 10, 2350 + idx * 13, 0.8, 12);
      G.ctx.stroke();
      G.ctx.fillStyle = COLORS.goldBright;
      G.ctx.beginPath(); G.ctx.arc(a.x, a.y, 3.2, 0, Math.PI * 2); G.ctx.fill();
    } else {
      // v45.8 Before Grapple Hook is picked up: render ALL anchors as quiet, unlit weathered iron rings (no glow/pulse!)
      G.ctx.strokeStyle = 'rgba(128, 136, 148, 0.42)';
      G.ctx.lineWidth = 2.0;
      G.ctx.beginPath(); G.ctx.arc(a.x, a.y, 9.5, 0, Math.PI * 2); G.ctx.stroke();
      G.ctx.fillStyle = 'rgba(28, 34, 44, 0.82)';
      G.ctx.beginPath(); G.ctx.arc(a.x, a.y, 3.0, 0, Math.PI * 2); G.ctx.fill();
    }
    G.ctx.restore();
  }
}

export function drawGrappleReticle() {
  if (!G.player || G.player.hp <= 0 || G.player.grappleState !== 'none' || G.gameState !== 'playing') return;
  const tgt = G.grapplePreviewTarget;
  const cands = Array.isArray(G.grappleCandidates) ? G.grappleCandidates : [];
  if (!tgt && cands.length === 0) return;

  const ready = G.player.grappleCd <= 0;
  const px = G.player.x + G.player.w * 0.5;
  const py = G.player.y + 22;
  const now = G.globalTime || 0;
  const ctx = G.ctx;

  ctx.save();

  // 1. Secondary Grapple Candidates (v46.5: subtle dashed standby ring + distinct hookable-enemy crest so players know they can steer targets!)
  for (let ci = 0; ci < cands.length; ci++) {
    const c = cands[ci];
    if (!c || (tgt && c.ref === tgt.ref)) continue;
    const isEnemyCand = c.type === 'enemy';
    ctx.save();
    ctx.translate(c.x, c.y);
    if (isEnemyCand) {
      // Hookable Enemy Crest: quiet brass-cyan diamond ring + twin inward chevrons
      const ep = 0.76 + Math.sin(now * 5.2 + ci) * 0.24;
      ctx.strokeStyle = ready ? `rgba(233, 201, 123, ${(0.58 * ep).toFixed(3)})` : 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = ready ? `rgba(125, 211, 252, ${(0.72 * ep).toFixed(3)})` : 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-19, -4); ctx.lineTo(-14, 0); ctx.lineTo(-19, 4);
      ctx.moveTo(19, -4);  ctx.lineTo(14, 0);  ctx.lineTo(19, 4);
      ctx.stroke();
    } else {
      // Static Hook/Lantern Candidate Standby Ring
      ctx.strokeStyle = ready ? 'rgba(223, 213, 190, 0.42)' : 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ready ? 'rgba(125, 211, 252, 0.55)' : 'rgba(148, 163, 184, 0.25)';
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (!tgt) {
    ctx.restore();
    return;
  }

  const isEnemyLock = tgt.type === 'enemy';
  const multiAvail = cands.length >= 2;
  const snapP = Math.max(0, Math.min(1, (G.grappleLockSnapTimer || 0) / 0.14));

  // 2. Subtle sightline tether from protagonist to currently locked grapple target
  ctx.strokeStyle = ready
    ? (isEnemyLock ? 'rgba(233, 201, 123, 0.30)' : 'rgba(125, 211, 252, 0.24)')
    : 'rgba(148, 163, 184, 0.10)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(tgt.x, tgt.y);
  ctx.stroke();

  const pulse = (1 + Math.sin(now * 11) * 0.08) * (1 + snapP * 0.28);
  const rot = now * (isEnemyLock ? 2.4 : 1.9);
  ctx.translate(tgt.x, tgt.y);

  // Kinetic lock-switch contraction ring on target change
  if (snapP > 0.02 && ready) {
    ctx.save();
    ctx.strokeStyle = isEnemyLock ? `rgba(233, 201, 123, ${(snapP * 0.85).toFixed(3)})` : `rgba(125, 211, 252, ${(snapP * 0.82).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 20 + snapP * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.rotate(rot);
  ctx.strokeStyle = ready ? (isEnemyLock ? '#e9c97b' : COLORS.cyanBright) : 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = isEnemyLock ? 2.1 : 1.9;
  const rad = isEnemyLock ? 21 : 22;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath(); ctx.arc(0, 0, rad, a - 0.32, a + 0.32); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (rad - 6), Math.sin(a) * (rad - 6));
    ctx.lineTo(Math.cos(a) * (rad + 4), Math.sin(a) * (rad + 4));
    ctx.stroke();
  }
  ctx.restore();

  // Enemy-lock inner combat diamond crest (visually separates combat grapple from platforming anchors)
  if (isEnemyLock && ready) {
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.88)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.stroke();
  }

  // Subtle side-chevrons when multiple grapple targets are available (silently signals directional steering!)
  if (multiAvail && ready) {
    const chA = 0.55 + Math.sin(now * 6.5) * 0.25;
    ctx.strokeStyle = `rgba(223, 213, 190, ${chA.toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-31, -4); ctx.lineTo(-35, 0); ctx.lineTo(-31, 4);
    ctx.moveTo(31, -4);  ctx.lineTo(35, 0);  ctx.lineTo(31, 4);
    ctx.stroke();
  }

  if (ready) {
    const lbl = isEnemyLock ? t('grapple.enemyTag', getControlLabels().shortGrapple) : getControlLabels().shortGrapple;
    drawCachedBadge(ctx, lbl, 0, 37, {
      font: '11px ui-monospace, "Noto Serif SC", monospace',
      bg: 'rgba(11, 13, 17, 0.86)',
      border: isEnemyLock ? 'rgba(233, 201, 123, 0.72)' : 'rgba(125, 211, 252, 0.58)',
      borderW: 1,
      color: isEnemyLock ? '#e9c97b' : COLORS.cyanBright,
      minW: isEnemyLock ? 56 : 38, padX: 6, h: 16, boxTopOff: -12, textOffY: 0
    });
  }
  ctx.restore();
}

export function drawGrappleThread() {
  if (G.player.grappleState === 'none') return;
  const sx = G.player.x + G.player.w / 2 + G.player.facing * 8;
  const sy = G.player.y + 22;
  let ex = G.player.grappleTx;
  let ey = G.player.grappleTy;
  if (G.player.grappleState === 'extending') {
    const p = 1 - Math.max(0, G.player.grappleTimer / 0.032);
    ex = sx + (G.player.grappleTx - sx) * p;
    ey = sy + (G.player.grappleTy - sy) * p;
  }
  G.ctx.save();
  G.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  G.ctx.lineWidth = 6.5;
  boilLine(G.ctx, sx, sy, ex, ey, 7700, 1.6, 6);
  G.ctx.strokeStyle = COLORS.cyanBright;
  G.ctx.lineWidth = 2.4;
  boilLine(G.ctx, sx, sy, ex, ey, 7700, 1.6, 6);
  G.ctx.strokeStyle = '#ffffff';
  G.ctx.lineWidth = 1;
  G.ctx.beginPath(); G.ctx.moveTo(sx, sy); G.ctx.lineTo(ex, ey); G.ctx.stroke();
  drawGlowSprite('gold', ex, ey, 14, 0.85);
  G.ctx.fillStyle = COLORS.goldBright;
  G.ctx.beginPath(); G.ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); G.ctx.fill();
  G.ctx.restore();
}

export function drawMistBarrier(activeBoss) {
  if (!activeBoss) return;
  const bossRm = getRoomById(activeBoss.roomId);
  const x = (bossRm && bossRm.mirrored) ? (activeBoss.arenaMaxX + 2) : (activeBoss.arenaMinX - 2);
  const y0 = activeBoss ? activeBoss.arenaTopY : 0;
  const h = activeBoss ? (activeBoss.arenaFloorY - y0) : FLOOR_Y;
  G.ctx.save();
  G.ctx.fillStyle = activeBoss && activeBoss.id === 'boss_ji' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(180, 200, 230, 0.18)';
  G.ctx.fillRect(x - 12, y0, 24, h);
  G.ctx.fillStyle = activeBoss && activeBoss.id === 'boss_ji' ? 'rgba(245, 158, 11, 0.32)' : 'rgba(180, 200, 230, 0.32)';
  G.ctx.fillRect(x - 4, y0, 8, h);
  G.ctx.restore();
}

