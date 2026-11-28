// v37.0 Macro Gates, Breakable Floors, World Switches, Wind Vanes & Ice Pillars Renderer
import { COLORS, FOUNDRY_VENT_GATE_DEF, MIRROR_ABYSS_GATE_DEF, WORLD_SWITCHES_DEF, WIND_VANES, SLICK_WALLS, SWITCH_GATES } from '../config.js';
import { G, isWorldSwitchOn, isSwitchUnlocked } from '../state.js';
import { drawGlowSprite } from '../vfx.js';
import { isInView } from './renderShared.js';

const isRoomOccluded = (roomId) => !!(roomId && G.roomOcclusion && G.roomOcclusion[roomId] > 0.96);

export function drawFoundryVentGate() {
  if (!G.worldState || FOUNDRY_VENT_GATE_DEF.w <= 0) return;
  const g = FOUNDRY_VENT_GATE_DEF;
  if (!isInView(g.x - 20, g.y - 20, g.w + 40, g.h + 40, 120)) return;
  const openAnim = G.worldState.foundryVentAnim || 0;
  if (openAnim >= 0.96) return;
  const halfW = (g.w * 0.5) * (1 - openAnim);
  G.ctx.save();
  G.ctx.fillStyle = '#1e140e'; G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.0;
  G.ctx.fillRect(g.x, g.y, halfW, g.h); G.ctx.strokeRect(g.x, g.y, halfW, g.h);
  G.ctx.fillRect(g.x + g.w - halfW, g.y, halfW, g.h); G.ctx.strokeRect(g.x + g.w - halfW, g.y, halfW, g.h);
  G.ctx.restore();
}

export function drawBreakableFloors() {
  if (!G.worldState || !G.worldState.breakableFloors) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.worldState.breakableFloors.length; i++) {
    const bf = G.worldState.breakableFloors[i];
    if (bf.broken || isRoomOccluded(bf.roomId) || !isInView(bf.x, bf.y, bf.w, bf.h, 80)) continue;
    const isIce = bf.style === 'ice';
    const jx = bf.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    const pulse = 0.65 + Math.sin(G.globalTime * 4.2 + i) * 0.25;
    ctx.save(); ctx.translate(jx, 0);
    ctx.fillStyle = isIce ? '#152c44' : '#1b1d28';
    ctx.fillRect(bf.x, bf.y, bf.w, bf.h);
    ctx.strokeStyle = isIce ? `rgba(186, 230, 253, ${pulse.toFixed(2)})` : `rgba(253, 224, 71, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bf.x + bf.w * 0.14, bf.y + 4); ctx.lineTo(bf.x + bf.w * 0.36, bf.y + bf.h * 0.42);
    ctx.lineTo(bf.x + bf.w * 0.52, bf.y + 12); ctx.lineTo(bf.x + bf.w * 0.72, bf.y + bf.h * 0.62);
    ctx.lineTo(bf.x + bf.w * 0.88, bf.y + 6); ctx.stroke();
    ctx.strokeStyle = isIce ? '#e0f2fe' : COLORS.goldBright; ctx.lineWidth = 2.4;
    ctx.strokeRect(bf.x + 1, bf.y + 1, bf.w - 2, Math.min(26, bf.h - 2));
    const cx = bf.x + bf.w * 0.5;
    ctx.beginPath(); ctx.moveTo(cx - 10, bf.y + 8); ctx.lineTo(cx, bf.y + 18); ctx.lineTo(cx + 10, bf.y + 8); ctx.stroke();
    ctx.restore();
  }
}

export function drawWorldSwitches() {
  if (!WORLD_SWITCHES_DEF.length || !G.worldState) return;
  const ctx = G.ctx;
  for (let i = 0; i < WORLD_SWITCHES_DEF.length; i++) {
    const sw = WORLD_SWITCHES_DEF[i];
    if (isRoomOccluded(sw.roomId) || !isInView(sw.x - 50, sw.y - 80, 100, 90, 90)) continue;
    const on = isWorldSwitchOn(sw.switchKey), unlocked = isSwitchUnlocked(sw), isSluice = sw.kind === 'sluice';
    const col = on ? COLORS.goldBright : (isSluice ? COLORS.cyanBright : COLORS.gold);
    ctx.save();
    if (!unlocked) ctx.globalAlpha = 0.45;
    if (unlocked && !on) {
      const sPulse = 0.72 + Math.sin((G.globalTime || 0) * 3.8 + sw.x) * 0.28;
      const sg = ctx.createLinearGradient(sw.x, sw.y - 8, sw.x, sw.y - 115);
      sg.addColorStop(0, isSluice ? `rgba(56, 189, 248, ${(0.20 * sPulse).toFixed(3)})` : `rgba(253, 224, 71, ${(0.20 * sPulse).toFixed(3)})`);
      sg.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sw.x - 14, sw.y - 115, 28, 107);
      ctx.strokeStyle = isSluice ? `rgba(125, 211, 252, ${(0.45 * sPulse).toFixed(3)})` : `rgba(253, 224, 71, ${(0.45 * sPulse).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(sw.x, sw.y - 1, 24, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawGlowSprite(isSluice ? 'cyan' : 'gold', sw.x, sw.y - 32, on ? 56 : 52, on ? 0.55 : 0.46);
    ctx.fillStyle = '#181e2c'; ctx.strokeStyle = col; ctx.lineWidth = 1.8;
    ctx.fillRect(sw.x - 16, sw.y - 16, 32, 16); ctx.strokeRect(sw.x - 16, sw.y - 16, 32, 16);
    ctx.fillRect(sw.x - 5, sw.y - 44, 10, 28); ctx.strokeRect(sw.x - 5, sw.y - 44, 10, 28);
    ctx.save(); ctx.translate(sw.x, sw.y - 42); ctx.rotate(on ? (G.globalTime * 1.1) : 0.25);
    ctx.strokeStyle = col; ctx.lineWidth = 3.0;
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI * 0.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * -19, Math.sin(a) * -19); ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); ctx.stroke();
    }
    ctx.fillStyle = on ? '#fef9c3' : '#121826';
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore(); ctx.restore();
  }
}

export function drawWindVanes() {
  if (!WIND_VANES.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < WIND_VANES.length; i++) {
    const wv = WIND_VANES[i];
    if (isRoomOccluded(wv.roomId) || !isInView(wv.x - 60, wv.y - 90, 120, 100, 90)) continue;
    const vx = wv.x, vy = wv.y - 38, dir = wv.dir || 1;
    ctx.save();
    drawGlowSprite(wv.flash > 0 ? 'gold' : 'cyan', vx, vy, wv.flash > 0 ? 52 : 34, wv.flash > 0 ? 0.72 : 0.34);
    ctx.strokeStyle = 'rgba(216, 207, 184, 0.72)'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(vx, wv.y); ctx.lineTo(vx, vy - 14); ctx.stroke();
    ctx.strokeStyle = wv.flash > 0 ? COLORS.goldBright : '#bae6fd';
    ctx.fillStyle = wv.flash > 0 ? COLORS.goldBright : '#38bdf8'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(vx - dir * 20, vy); ctx.lineTo(vx + dir * 24, vy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vx + dir * 28, vy); ctx.lineTo(vx + dir * 16, vy - 8); ctx.lineTo(vx + dir * 16, vy + 8); ctx.closePath(); ctx.fill();
    const wave = Math.sin(G.globalTime * 9 + i) * 5;
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)'; ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.moveTo(vx + dir * 10, vy + 3); ctx.quadraticCurveTo(vx + dir * 26, vy + 8 + wave, vx + dir * 42, vy + 2 - wave); ctx.stroke();
    ctx.restore();
  }
}

export function drawIcePillars() {
  if (!G.worldState || !G.worldState.icePillars) return;
  const ctx = G.ctx;
  for (let i = 0; i < G.worldState.icePillars.length; i++) {
    const ip = G.worldState.icePillars[i];
    if (isRoomOccluded(ip.roomId)) continue;
    if (ip.state === 'bridge') {
      if (!isInView(ip.bridgeX, ip.bridgeY, ip.bridgeW, ip.bridgeH, 80)) continue;
      ctx.save();
      drawGlowSprite('cyan', ip.bridgeX + ip.bridgeW * 0.5, ip.bridgeY + 8, ip.bridgeW * 0.55, 0.25);
      ctx.fillStyle = 'rgba(56, 130, 185, 0.72)'; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.moveTo(ip.bridgeX, ip.bridgeY); ctx.lineTo(ip.bridgeX + ip.bridgeW, ip.bridgeY);
      ctx.lineTo(ip.bridgeX + ip.bridgeW - 8, ip.bridgeY + ip.bridgeH); ctx.lineTo(ip.bridgeX + 8, ip.bridgeY + ip.bridgeH);
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else {
      const tipY = ip.state === 'falling' ? ip.fallY : (ip.topY + ip.len), baseY = tipY - ip.len;
      if (!isInView(ip.x - 36, baseY, 72, ip.len + 40, 100)) continue;
      ctx.save();
      drawGlowSprite('cyan', ip.x, tipY - ip.len * 0.4, 46, 0.36);
      ctx.fillStyle = 'rgba(125, 211, 252, 0.52)'; ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.moveTo(ip.x - 22, baseY); ctx.lineTo(ip.x + 22, baseY);
      ctx.lineTo(ip.x + 12, tipY - ip.len * 0.32); ctx.lineTo(ip.x, tipY); ctx.lineTo(ip.x - 12, tipY - ip.len * 0.32);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (ip.state === 'hanging') {
        ctx.strokeStyle = COLORS.goldBright; ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.moveTo(ip.x - 16, baseY + 18); ctx.lineTo(ip.x - 2, baseY + 26); ctx.lineTo(ip.x + 16, baseY + 16); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function drawMirrorAbyssGate() {
  if (!G.worldState || MIRROR_ABYSS_GATE_DEF.w <= 0) return;
  const g = MIRROR_ABYSS_GATE_DEF;
  if (!isInView(g.x - 20, g.y - 20, g.w + 40, g.h + 40, 120)) return;
  const openAnim = G.worldState.mirrorAbyssAnim || 0;
  if (openAnim >= 0.96) return;
  const halfW = (g.w * 0.5) * (1 - openAnim);
  G.ctx.save();
  G.ctx.fillStyle = '#1b1426'; G.ctx.strokeStyle = COLORS.goldBright; G.ctx.lineWidth = 2.2;
  G.ctx.fillRect(g.x, g.y, halfW, g.h); G.ctx.strokeRect(g.x, g.y, halfW, g.h);
  G.ctx.fillRect(g.x + g.w - halfW, g.y, halfW, g.h); G.ctx.strokeRect(g.x + g.w - halfW, g.y, halfW, g.h);
  G.ctx.restore();
}

export function drawSlickWalls() {
  if (!SLICK_WALLS.length) return;
  const ctx = G.ctx;
  for (let i = 0; i < SLICK_WALLS.length; i++) {
    const sw = SLICK_WALLS[i];
    if (isRoomOccluded(sw.roomId) || !isInView(sw.x - 18, sw.y - 16, sw.w + 36, sw.h + 32, 80)) continue;
    ctx.save();
    // Dark forged iron mounting plate riveted onto the stone pillar edge
    const drawThornRail = (edgeX, dir) => {
      const railX = dir < 0 ? edgeX - 1 : edgeX - 5;
      ctx.fillStyle = '#1b1116';
      ctx.fillRect(railX, sw.y + 2, 6, Math.max(4, sw.h - 4));
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(railX, sw.y + 2, 6, Math.max(4, sw.h - 4));

      // Hand-drawn jagged iron-thorn barbs with crimson-stained razor tips
      for (let y = sw.y + 9; y < sw.y + sw.h - 7; y += 14) {
        const len = 11 + ((Math.floor(y) % 28 === 0) ? 2.5 : 0);
        // Dark metallic base barb
        ctx.fillStyle = '#26141c';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(edgeX, y - 5.2);
        ctx.lineTo(edgeX + dir * len, y);
        ctx.lineTo(edgeX, y + 5.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sharp crimson-steel highlight tip
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(edgeX + dir * (len * 0.48), y - 2.3);
        ctx.lineTo(edgeX + dir * len, y);
        ctx.lineTo(edgeX + dir * (len * 0.48), y + 2.3);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(edgeX + dir * (len * 0.55), y - 1.2);
        ctx.lineTo(edgeX + dir * len, y);
        ctx.stroke();
      }
    };
    if (sw.side === 'left' || sw.side === 'both') drawThornRail(sw.x, -1);
    if (sw.side === 'right' || sw.side === 'both') drawThornRail(sw.x + sw.w, 1);
    if (sw.clangFlash > 0) {
      const a = Math.min(1, sw.clangFlash / 0.24);
      const gx = sw.side === 'right' ? (sw.x + sw.w + 4) : (sw.x - 4);
      const gy = sw.clangY !== undefined ? sw.clangY : (sw.y + sw.h * 0.5);
      drawGlowSprite('gold', gx, gy, 34 * a + 10, 0.72 * a);
      ctx.strokeStyle = `rgba(248, 250, 252, ${a.toFixed(2)})`;
      ctx.lineWidth = 2.0;
      const r = 14 * a;
      ctx.beginPath();
      ctx.moveTo(gx - r, gy); ctx.lineTo(gx + r, gy);
      ctx.moveTo(gx, gy - r); ctx.lineTo(gx, gy + r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawSwitchGates() {
  if (!SWITCH_GATES.length || !G.worldState) return;
  const ctx = G.ctx;
  const anims = G.worldState.switchGateAnims || {};
  for (let i = 0; i < SWITCH_GATES.length; i++) {
    const sg = SWITCH_GATES[i];
    if (!isInView(sg.x - 24, sg.y - 24, sg.w + 48, sg.h + 48, 120)) continue;
    const anim = isWorldSwitchOn(sg.switchKey) ? (anims[sg.switchKey] !== undefined ? anims[sg.switchKey] : 1) : 0;
    if (anim >= 0.96) continue;
    ctx.save();
    ctx.fillStyle = '#221a14';
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2.0;
    if (sg.orientation === 'horizontal') {
      const halfW = (sg.w * 0.5) * (1 - anim);
      ctx.fillRect(sg.x, sg.y, halfW, sg.h); ctx.strokeRect(sg.x, sg.y, halfW, sg.h);
      ctx.fillRect(sg.x + sg.w - halfW, sg.y, halfW, sg.h); ctx.strokeRect(sg.x + sg.w - halfW, sg.y, halfW, sg.h);
      if (halfW > 18) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.beginPath();
        ctx.moveTo(sg.x + 6, sg.y + sg.h * 0.5); ctx.lineTo(sg.x + halfW - 6, sg.y + sg.h * 0.5);
        ctx.moveTo(sg.x + sg.w - halfW + 6, sg.y + sg.h * 0.5); ctx.lineTo(sg.x + sg.w - 6, sg.y + sg.h * 0.5);
        ctx.stroke();
      }
    } else {
      const curH = sg.h * (1 - anim);
      ctx.fillRect(sg.x, sg.y, sg.w, curH); ctx.strokeRect(sg.x, sg.y, sg.w, curH);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1.4;
      for (let yy = sg.y + 18; yy < sg.y + curH - 10; yy += 22) {
        ctx.beginPath(); ctx.moveTo(sg.x + 4, yy); ctx.lineTo(sg.x + sg.w - 4, yy); ctx.stroke();
      }
      if (curH > 36) {
        ctx.fillStyle = COLORS.goldBright;
        ctx.beginPath(); ctx.arc(sg.x + sg.w * 0.5, sg.y + curH * 0.5, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}
